import axios from 'axios';
import { AuthResponse, LoginCredentials, RegisterData, MedicalRecord } from '../types';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add a request interceptor to include the token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

export const login = async (email: string, password: string) => {
  const response = await api.post('/auth/login', { email, password });
  localStorage.setItem('token', response.data.token);
  return response.data;
};

export const register = async (name: string, email: string, password: string) => {
  const response = await api.post('/auth/register', { name, email, password });
  return response.data;
};

export const getMedicalRecords = async (): Promise<MedicalRecord[]> => {
  const response = await api.get('/records');
  return response.data;
};

export const searchMedicalRecords = async (query: string): Promise<MedicalRecord[]> => {
  const response = await api.get(`/records/search?query=${encodeURIComponent(query)}`);
  return response.data;
};

export const createMedicalRecord = async (data: FormData): Promise<MedicalRecord> => {
  const response = await api.post('/records', data, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return response.data;
};

export const updateMedicalRecord = async (id: string, data: FormData): Promise<MedicalRecord> => {
  const response = await api.put(`/records/${id}`, data, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return response.data;
};

export const deleteMedicalRecord = async (id: string): Promise<void> => {
  await api.delete(`/records/${id}`);
}; 