import axios from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5000';

const api = axios.create({
  baseURL:         API_BASE_URL,
  withCredentials: true,         // Send httpOnly cookies automatically
  headers: {
    'Content-Type': 'application/json',
  },
});

// ---- Auth API ----
export const authAPI = {
  register: (data: {
    full_name: string;
    email: string;
    password: string;
    phone?: string;
  }) => api.post('/api/auth/register', data),

  login: (data: { email: string; password: string }) =>
    api.post('/api/auth/login', data),

  logout: () => api.post('/api/auth/logout'),

  me: () => api.get('/api/auth/me'),
};
