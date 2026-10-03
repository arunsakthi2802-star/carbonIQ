import axios from 'axios';

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

// Global response interceptor: auto-logout on 401
api.interceptors.response.use(
  (response) => response,
  (error) => {
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
