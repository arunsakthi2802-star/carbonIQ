import axios from 'axios';

const ML_SERVICE_URL = process.env.ML_SERVICE_URL || 'http://127.0.0.1:8001';

export const mlClient = axios.create({
  baseURL: ML_SERVICE_URL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json'
  }
});

export const checkMlHealth = async () => {
  try {
    const res = await mlClient.get('/health');
    return res.data;
  } catch (err: any) {
    return {
      status: 'Degraded',
      modelLoaded: false,
      error: err.message
    };
  }
};
