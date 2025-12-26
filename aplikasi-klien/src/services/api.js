import axios from 'axios';
import { supabase } from '../config/supabase.js';

// Pastikan port 5000 sesuai dengan server Anda
const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5003/api';

const api = axios.create({
  baseURL: API_BASE,
  headers: {
    'Content-Type': 'application/json'
  },
  timeout: 60000 // 60 detik timeout untuk development
});

// Request interceptor untuk menambahkan auth token
api.interceptors.request.use(
  async (config) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.access_token) {
        config.headers.Authorization = `Bearer ${session.access_token}`;
      } else {
        console.warn('No auth session found');
      }
    } catch (error) {
      console.error('Error getting auth token:', error);
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor untuk handling error global
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    
    // Handle 401 Unauthorized
    if (error.response?.status === 401) {
      console.error('Unauthorized access - redirecting to login');
      // Clear session and redirect to login
      supabase.auth.signOut();
      window.location.href = '/';
      return Promise.reject(new Error('Session expired. Please login again.'));
    }
    
    // Handle timeout errors with retry
    if (error.code === 'ECONNABORTED' && !originalRequest._retry) {
      originalRequest._retry = true;
      console.warn('Request timeout, retrying...', originalRequest.url);
      
      // Wait 2 seconds before retry
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      return api(originalRequest);
    }
    
    // Menangkap pesan error dari backend
    const message = error.response?.data?.message || error.message || 'Something went wrong';
    console.error('API Error:', message);
    return Promise.reject(new Error(message));
  }
);

/**
 * Memanggil Endpoint AI di Backend
 */
export const generateGherkinAPI = async (userStory, options = {}) => {
  // POST /api/gherkin/generate
  const payload = { 
    userStory,
    evaluateQuality: options.enableMeteor || false
  };
  
  console.log("📤 API Payload:", payload);
  
  const response = await api.post('/gherkin/generate', payload);
  return response.data; // Mengembalikan { success: true, data: { ... } }
};

/**
 * Health check (Opsional)
 */
export const checkHealth = async () => {
  return await api.get('/');
};

export default api;