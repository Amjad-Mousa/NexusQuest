import AsyncStorage from '@react-native-async-storage/async-storage';
import api from './api';

export interface User {
  id: string;
  name: string;
  email: string;
  role: 'user' | 'teacher';
}

export type UserRole = 'user' | 'teacher';

export interface AuthResponse {
  success: boolean;
  token?: string;
  user?: User;
  error?: string;
}

export const login = async (email: string, password: string): Promise<AuthResponse> => {
  try {
    const response = await api.post('/api/auth/login', { email, password });
    if (response.data.success && response.data.token) {
      await AsyncStorage.setItem('nexusquest-token', response.data.token);
      await AsyncStorage.setItem('nexusquest-user', JSON.stringify(response.data.user));
    }
    return response.data;
  } catch (error: any) {
    return {
      success: false,
      error: error.response?.data?.error || 'Login failed',
    };
  }
};

export const signup = async (name: string, email: string, password: string, role: UserRole = 'user'): Promise<AuthResponse> => {
  try {
    const response = await api.post('/api/auth/signup', { name, email, password, role });
    if (response.data.success && response.data.token) {
      await AsyncStorage.setItem('nexusquest-token', response.data.token);
      await AsyncStorage.setItem('nexusquest-user', JSON.stringify(response.data.user));
    }
    return response.data;
  } catch (error: any) {
    return {
      success: false,
      error: error.response?.data?.error || 'Signup failed',
    };
  }
};

export const logout = async () => {
  await AsyncStorage.removeItem('nexusquest-token');
  await AsyncStorage.removeItem('nexusquest-user');
};

export const getStoredUser = async (): Promise<User | null> => {
  try {
    const userStr = await AsyncStorage.getItem('nexusquest-user');
    return userStr ? JSON.parse(userStr) : null;
  } catch {
    return null;
  }
};
