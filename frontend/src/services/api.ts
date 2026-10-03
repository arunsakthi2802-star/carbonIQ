import axios from 'axios';
import { handleMockRequest } from './mockService';

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  timeout: 30000,
});

// Attach Authorization Bearer token to all outgoing requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('carboniq_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Global response interceptor: fallback to client-side autonomous engine on 404 / 405 / network drop / SPA HTML rewrite
api.interceptors.response.use(
  async (response) => {
    // Intercept when static host SPA rewrite returned index.html as a 200 OK string for /api/*
    let isHtmlOrStaticRewrite = false;
    const contentType = String(response.headers?.['content-type'] || '').toLowerCase();

    if (typeof response.data === 'string') {
      const trimmed = response.data.trim().toLowerCase();
      if (
        trimmed.startsWith('<!doctype') ||
        trimmed.startsWith('<html') ||
        trimmed.startsWith('<!doctype html') ||
        response.data.includes('<div id="root">') ||
        response.data.includes('Vite + React') ||
        contentType.includes('text/html')
      ) {
        isHtmlOrStaticRewrite = true;
      }
    }

    if (isHtmlOrStaticRewrite && response.config && !(response.config as any)._isMockRetry) {
      (response.config as any)._isMockRetry = true;
      try {
        let payload: any = undefined;
        if (response.config.data) {
          payload = typeof response.config.data === 'string' ? JSON.parse(response.config.data) : response.config.data;
        }
        const mockData = await handleMockRequest(response.config.method || 'get', response.config.url || '', payload);
        response.data = mockData;
        return response;
      } catch (err) {
        console.error('Failed to resolve HTML response via autonomous store:', err);
      }
    }
    return response;
  },
  async (error) => {
    const config = error.config;
    const status = error.response?.status;
    const dataStr = typeof error.response?.data === 'string' ? error.response.data : '';

    const isStaticHostFailure = 
      status === 404 || 
      status === 405 || // Vercel static returns 405 Method Not Allowed on POST / PUT / DELETE
      status === 502 || 
      status === 503 || 
      status === 504 || 
      dataStr.includes('The page could not be found') ||
      dataStr.includes('Method Not Allowed');
    const isNetworkError = !error.response || error.code === 'ERR_NETWORK' || error.code === 'ECONNREFUSED';

    // If endpoint is not found or method not allowed on static host (like Vercel SPA) or network is offline, activate Autonomous Mock Engine
    if ((isStaticHostFailure || isNetworkError) && config && !(config as any)._isMockRetry) {
      (config as any)._isMockRetry = true;
      try {
        let payload: any = undefined;
        if (config.data) {
          payload = typeof config.data === 'string' ? JSON.parse(config.data) : config.data;
        }
        const mockData = await handleMockRequest(config.method || 'get', config.url || '', payload);
        return {
          data: mockData,
          status: 200,
          statusText: 'OK',
          headers: {},
          config
        };
      } catch (mockErr) {
        console.error('Autonomous engine fallback error:', mockErr);
      }
    }

    if (error.response?.status === 401) {
      localStorage.removeItem('carboniq_token');
      localStorage.removeItem('carboniq_user');
      localStorage.removeItem('carboniq_company');
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

// Formatted utility helper for converting kg to tonnes or kg string
export const formatEmissions = (kg: number | undefined | null, unitPreference: 'kg' | 't' = 't'): string => {
  if (kg === undefined || kg === null || isNaN(kg)) return '0.00 t CO2e';
  if (unitPreference === 'kg') {
    return `${Math.round(kg).toLocaleString()} kg CO2e`;
  }
  const tonnes = kg / 1000;
  return `${tonnes.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} t CO2e`;
};
