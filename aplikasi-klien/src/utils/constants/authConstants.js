// Authentication constants
export const AUTH_TIMEOUTS = {
  SESSION_FETCH: 45000,  // Increased from 20s to 45s
  PROFILE_FETCH: 45000,  // Increased from 20s to 45s
  PROFILE_INSERT: 30000, // Increased from 15s to 30s
  SIGN_OUT: 20000        // Increased from 15s to 20s
};

export const USER_ROLES = {
  USER: 'user',
  ADMIN: 'admin'
};

export const ROLE_HIERARCHY = {
  [USER_ROLES.USER]: 0,
  [USER_ROLES.ADMIN]: 1
};

export const AUTH_STORAGE_KEYS = {
  SUPABASE_TOKEN: 'supabase.auth.token'
};

export const AUTH_ERRORS = {
  NO_PROFILE: 'PGRST116',
  SESSION_TIMEOUT: 'Session timeout',
  PROFILE_TIMEOUT: 'Profile fetch timeout',
  SIGN_OUT_TIMEOUT: 'SignOut timeout',
  NO_USER: 'No user logged in'
};

export const NEW_USER_THRESHOLD = 5 * 60 * 1000; // 5 minutes in milliseconds