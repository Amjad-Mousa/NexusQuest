import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Production server URL
const API_URL = 'https://muhjah.com/nexusquest';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// إضافة token تلقائياً لكل request
api.interceptors.request.use(
  async (config) => {
    const token = await AsyncStorage.getItem('nexusquest-token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

export default api;
