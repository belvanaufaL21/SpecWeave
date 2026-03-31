import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl) {
  throw new Error('Missing SUPABASE_URL environment variable');
}

if (!supabaseServiceKey) {
  throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY environment variable');
}

// Performance: Connection pooling configuration for production
const connectionPoolConfig = {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  },
  db: {
    // Enable connection pooling for better performance
    // Supabase client uses fetch under the hood, which reuses connections
    schema: 'public'
  },
  global: {
    // Performance: Configure fetch options for connection reuse
    fetch: (url, options = {}) => {
      return fetch(url, {
        ...options,
        // Enable HTTP keep-alive for connection pooling
        keepalive: true
      });
    }
  }
};

// Service role client for server-side operations (bypasses RLS)
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, connectionPoolConfig);

// Anonymous client for user operations (respects RLS)
export const supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

export default supabaseClient;