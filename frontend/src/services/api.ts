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

// Global response interceptor: fallback to client-side autonomous engine on 404 / network drop
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const config = error.config;
    const isNotFound = error.response?.status === 404 || 
      (typeof error.response?.data === 'string' && error.response.data.includes('The page could not be found'));
    const isNetworkError = !error.response || error.code === 'ERR_NETWORK' || error.code === 'ECONNREFUSED';

    // If endpoint is not found on static host (like Vercel SPA) or network is offline, activate Autonomous Mock Engine
    if ((isNotFound || isNetworkError) && config && !(config as any)._isMockRetry) {
      (config as any)._isMockRetry = true;
      try {
        const payload = config.data ? (typeof config.data === 'string' ? JSON.parse(config.data) : config.data) : undefined;
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
