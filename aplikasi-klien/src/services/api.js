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
      // Get current session
      let { data: { session }, error } = await supabase.auth.getSession();
      
      if (error) {
        console.warn('Error getting session:', error);
        return config;
      }
      
      if (session?.access_token) {
        // Check if token is about to expire (within 5 minutes)
        const expiresAt = session.expires_at * 1000; // Convert to milliseconds
        const now = Date.now();
        const fiveMinutes = 5 * 60 * 1000;
        
        if (expiresAt - now < fiveMinutes) {
          console.log('🔄 [API] Token expiring soon, refreshing...');
          
          try {
            const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
            
            if (refreshError) {
              console.warn('⚠️ [API] Token refresh failed:', refreshError.message);
            } else if (refreshData?.session?.access_token) {
              console.log('✅ [API] Token refreshed successfully');
              session = refreshData.session;
            }
          } catch (refreshError) {
            console.warn('⚠️ [API] Token refresh exception:', refreshError.message);
          }
        }
        
        config.headers.Authorization = `Bearer ${session.access_token}`;
        console.log('🔑 [API] Auth token added to request');
      } else {
        console.warn('⚠️ [API] No auth session found for request');
      }
    } catch (error) {
      console.error('❌ [API] Error getting auth token:', error);
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
    
    // Handle 401 Unauthorized - but be more careful about when to logout
    if (error.response?.status === 401 && !originalRequest._tokenRefreshed) {
      console.warn('401 Unauthorized received:', error.response?.data?.message || 'No message');
      
      // Check if this is actually an auth issue or just a service connection issue
      const errorMessage = error.response?.data?.message || '';
      const isJiraConnectionError = errorMessage.toLowerCase().includes('jira') || 
                                   errorMessage.toLowerCase().includes('connection') ||
                                   errorMessage.toLowerCase().includes('network');
      
      if (isJiraConnectionError) {
        console.log('🔗 [API] 401 seems to be a service connection issue, not auth expiry');
        // Don't logout for service connection issues
        return Promise.reject(new Error(errorMessage || 'Service connection error'));
      }
      
      // Check if we actually have a valid session
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session && session.access_token) {
          console.log('🔍 [API] User has valid session, 401 might be service-specific');
          
          // Try to refresh token in case it's expired
          console.log('🔄 [API] Attempting token refresh for 401 error...');
          const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
          
          if (refreshError) {
            console.warn('⚠️ [API] Token refresh failed:', refreshError.message);
            // Don't logout immediately, might be service issue
            return Promise.reject(new Error(errorMessage || 'Service authorization error'));
          } else if (refreshData?.session?.access_token) {
            console.log('✅ [API] Token refreshed, retrying original request...');
            
            // Update the authorization header with new token
            originalRequest.headers.Authorization = `Bearer ${refreshData.session.access_token}`;
            originalRequest._tokenRefreshed = true; // Prevent infinite retry
            
            // Retry the original request with new token
            return api(originalRequest);
          } else {
            console.warn('⚠️ [API] Token refresh returned no session');
            return Promise.reject(new Error(errorMessage || 'Service authorization error'));
          }
        }
      } catch (sessionError) {
        console.warn('Error checking session:', sessionError);
      }
      
      // Only logout if we're sure it's an auth expiry issue
      console.error('🚪 [API] Confirmed auth expiry - redirecting to login');
      supabase.auth.signOut();
      window.location.href = '/';
      return Promise.reject(new Error('Session expired. Please login again.'));
    }
    
    // Handle timeout errors and network issues with retry
    if ((error.code === 'ECONNABORTED' || error.code === 'NETWORK_ERROR' || !error.response) && !originalRequest._retry) {
      originalRequest._retry = true;
      console.warn('🔄 [API] Network/timeout error, retrying...', originalRequest.url);
      
      // Progressive delay: 2s for first retry
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      return api(originalRequest);
    }
    
    // Handle 5xx server errors with retry (but not 401/403)
    if (error.response?.status >= 500 && error.response?.status < 600 && !originalRequest._retry) {
      originalRequest._retry = true;
      console.warn('🔄 [API] Server error, retrying...', originalRequest.url, error.response.status);
      
      // Wait 3 seconds for server errors
      await new Promise(resolve => setTimeout(resolve, 3000));
      
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