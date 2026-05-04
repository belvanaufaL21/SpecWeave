import axios from 'axios';
import { supabase } from '../config/supabase.js';
import ErrorRecovery from '../utils/errors/ErrorRecovery.js';
import cleanLogger from '../config/cleanLogging.js';

// Pastikan port 5000 sesuai dengan server Anda
const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5003/api';

// Only log in development mode
if (import.meta.env.DEV) {
  cleanLogger.info('API', `Base URL: ${API_BASE}`);
}

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
        if (import.meta.env.DEV) {
          cleanLogger.warn('API', 'Error getting session');
        }
        return config;
      }
      
      if (session?.access_token) {
        // Check if token is about to expire (within 5 minutes)
        const expiresAt = session.expires_at * 1000; // Convert to milliseconds
        const now = Date.now();
        const fiveMinutes = 5 * 60 * 1000;
        
        if (expiresAt - now < fiveMinutes) {
          try {
            const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
            
            if (refreshError && import.meta.env.DEV) {
              cleanLogger.warn('API', 'Token refresh failed');
            } else if (refreshData?.session?.access_token) {
              session = refreshData.session;
            }
          } catch (refreshError) {
            if (import.meta.env.DEV) {
              cleanLogger.warn('API', 'Token refresh exception');
            }
          }
        }
        
        config.headers.Authorization = `Bearer ${session.access_token}`;
      }
    } catch (error) {
      const recovery = ErrorRecovery.handleUnexpectedError(error, 'API_AUTH');
      cleanLogger.error('API', recovery.userMessage);
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
      const recovery = ErrorRecovery.handleAuthError(error, 'API_AUTH');
      
      // Check if this is actually an auth issue or just a service connection issue
      const errorMessage = error.response?.data?.message || '';
      const isJiraConnectionError = errorMessage.toLowerCase().includes('jira') || 
                                   errorMessage.toLowerCase().includes('connection') ||
                                   errorMessage.toLowerCase().includes('network');
      
      if (isJiraConnectionError) {
        // Don't logout for service connection issues
        return Promise.reject(new Error(errorMessage || 'Service connection error'));
      }
      
      // Check if we actually have a valid session
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session && session.access_token) {
          // Try to refresh token in case it's expired
          const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
          
          if (refreshError) {
            cleanLogger.warn('API', 'Token refresh failed');
            return Promise.reject(new Error(errorMessage || 'Service authorization error'));
          } else if (refreshData?.session?.access_token) {
            // Update the authorization header with new token
            originalRequest.headers.Authorization = `Bearer ${refreshData.session.access_token}`;
            originalRequest._tokenRefreshed = true; // Prevent infinite retry
            
            // Retry the original request with new token
            return api(originalRequest);
          } else {
            cleanLogger.warn('API', 'Token refresh returned no session');
            return Promise.reject(new Error(errorMessage || 'Service authorization error'));
          }
        }
      } catch (sessionError) {
        cleanLogger.warn('API', 'Error checking session');
      }
      
      // Only logout if we're sure it's an auth expiry issue
      cleanLogger.error('API', recovery.userMessage);
      supabase.auth.signOut();
      window.location.href = '/';
      return Promise.reject(new Error(recovery.userMessage));
    }
    
    // Handle timeout errors and network issues with retry
    if ((error.code === 'ECONNABORTED' || error.code === 'NETWORK_ERROR' || !error.response) && !originalRequest._retry) {
      originalRequest._retry = true;
      const recovery = ErrorRecovery.handleNetworkError(error, 'API_NETWORK');
      cleanLogger.warn('API', `Network/timeout error, retrying... ${originalRequest.url}`);
      
      // Progressive delay: 1s for first retry (reduced from 2s)
      await new Promise(resolve => setTimeout(resolve, recovery.retryDelay || 1000));
      
      return api(originalRequest);
    }
    
    // Handle 5xx server errors with retry (but not 401/403)
    if (error.response?.status >= 500 && error.response?.status < 600 && !originalRequest._retry) {
      originalRequest._retry = true;
      const recovery = ErrorRecovery.handleServiceError(error, 'API_SERVER');
      cleanLogger.warn('API', `Server error, retrying... ${originalRequest.url} ${error.response.status}`);
      
      // Wait for server errors
      await new Promise(resolve => setTimeout(resolve, recovery.retryDelay || 3000));
      
      return api(originalRequest);
    }
    
    // CRITICAL: Handle 409 Conflict (duplicate) - pass through without modification
    if (error.response?.status === 409) {
      cleanLogger.warn('API', `Conflict error (409): ${originalRequest.url}`);
      return Promise.reject(error); // Pass through original error with response data
    }
    
    // CRITICAL: Handle 400 Bad Request - pass through original error to preserve server message
    if (error.response?.status === 400) {
      cleanLogger.warn('API', `Validation error (400): ${originalRequest.url}`);
      return Promise.reject(error); // Pass through original error with response data
    }
    
    // Handle all other errors with ErrorRecovery
    const recovery = await ErrorRecovery.handleError(error, 'API');
    cleanLogger.error('API', recovery.userMessage);
    return Promise.reject(new Error(recovery.userMessage));
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

  const config = {};
  if (options.signal) {
    config.signal = options.signal;
  }

  const response = await api.post('/gherkin/generate', payload, config);
  return response.data; // Mengembalikan { success: true, data: { ... } }
};

/**
 * Health check (Opsional)
 */
export const checkHealth = async () => {
  return await api.get('/');
};

export default api;