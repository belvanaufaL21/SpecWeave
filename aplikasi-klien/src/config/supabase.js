import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl) {
  throw new Error('Missing VITE_SUPABASE_URL environment variable. Please add it to your .env file.');
}

if (!supabaseAnonKey) {
  throw new Error('Missing VITE_SUPABASE_ANON_KEY environment variable. Please add it to your .env file.');
}

// Global flag to prevent multiple logout attempts
let isLoggingOut = false;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    storage: window.localStorage,
    storageKey: 'supabase.auth.token',
    flowType: 'pkce'
  },
  global: {
    headers: {
      'X-Client-Info': 'specweave-client'
    },
    fetch: async (url, options = {}) => {
      // Add timeout to all requests
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 60000); // Increased to 60 seconds
      
      try {
        const response = await fetch(url, {
          ...options,
          signal: controller.signal
        });
        
        // Check for 409 Conflict or 403 Forbidden (user deleted)
        if ((response.status === 409 || response.status === 403) && !isLoggingOut) {
          console.error('🚨 [SUPABASE] User deleted or forbidden (409/403) - forcing logout');
          isLoggingOut = true;
          
          // Force logout immediately without waiting
          setTimeout(() => {
            console.log('🔒 [SUPABASE] Clearing all auth data and redirecting...');
            
            // Clear all storage
            localStorage.clear();
            sessionStorage.clear();
            
            // Redirect to login
            window.location.href = '/login';
          }, 0);
        }
        
        return response;
      } finally {
        clearTimeout(timeoutId);
      }
    }
  },
  db: {
    schema: 'public'
  },
  realtime: {
    params: {
      eventsPerSecond: 10
    }
  }
});

export default supabase;