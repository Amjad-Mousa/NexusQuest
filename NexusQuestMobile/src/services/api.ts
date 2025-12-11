import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

// تغيير الـ IP حسب جهازك - استخدم IP الكمبيوتر مش localhost
const API_URL = 'http://192.168.1.7:9876'; // Backend running on port 9876

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
