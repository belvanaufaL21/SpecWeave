import { supabase } from '../../config/supabase.js';
import { 
  AUTH_TIMEOUTS, 
  AUTH_ERRORS
} from '../../utils/constants/authConstants';
import {
  createDefaultProfile,
  withTimeout,
  clearAuthStorage,
  extractNameFromEmail
} from '../../utils/helpers/authHelpers';

/**
 * Authentication service class
 */
class AuthService {
  // Add static cache for profile fetches
  static profileCache = new Map();
  static fetchingProfiles = new Set();
  
  /**
   * Get initial session dengan timeout
   * @returns {Promise<Object>} - Session data atau null
   */
  static async getInitialSession() {
    try {
      const { data: { session }, error } = await withTimeout(
        supabase.auth.getSession(),
        AUTH_TIMEOUTS.SESSION_FETCH,
        AUTH_ERRORS.SESSION_TIMEOUT
      );
      
      if (error) {
        console.warn('Session fetch error:', error);
        return null;
      }
      
      return session;
    } catch (error) {
      console.warn('Failed to get initial session:', error);
      return null;
    }
  }

  /**
   * Fetch user profile dengan error handling, retry logic, dan caching
   * @param {string} userId - User ID
   * @param {number} retryCount - Current retry attempt (default: 0)
   * @returns {Promise<Object>} - Profile data
   */
  static async fetchUserProfile(userId, retryCount = 0) {
    if (!userId) {
      console.warn('No userId provided to fetchUserProfile');
      return createDefaultProfile(userId);
    }

    // Check cache first (5 minute cache)
    const cached = this.profileCache.get(userId);
    if (cached && Date.now() - cached.timestamp < 300000) {
      
      return cached.profile;
    }

    // Prevent duplicate fetches
    if (this.fetchingProfiles.has(userId)) {
      console.log(`⏳ [AUTH] Profile fetch already in progress for user: ${userId}`);
      // Wait for the existing fetch to complete
      return new Promise((resolve) => {
        const checkInterval = setInterval(() => {
          const cached = this.profileCache.get(userId);
          if (cached || !this.fetchingProfiles.has(userId)) {
            clearInterval(checkInterval);
            resolve(cached ? cached.profile : createDefaultProfile(userId));
          }
        }, 100);
        
        // Timeout after 30 seconds
        setTimeout(() => {
          clearInterval(checkInterval);
          resolve(createDefaultProfile(userId));
        }, 30000);
      });
    }

    const maxRetries = 2; // Maximum 2 retries (3 total attempts)
    
    try {
      this.fetchingProfiles.add(userId);
      
      const { data, error } = await withTimeout(
        supabase.from('profiles').select('*').eq('id', userId).maybeSingle(),
        AUTH_TIMEOUTS.PROFILE_FETCH,
        AUTH_ERRORS.PROFILE_TIMEOUT
      );

      if (error) {
        console.warn(`⚠️ [AUTH] Profile fetch error:`, error);
        
        // If it's a 409 conflict or user deleted error, throw immediately
        if (error.code === '409' || error.code === 'PGRST116' || error.message?.includes('conflict')) {
          console.error('🚨 [AUTH] User deleted or conflict - throwing error');
          throw new Error('USER_DELETED');
        }
        
        // If it's a timeout or network error and we haven't exceeded max retries
        if (retryCount < maxRetries && (error.message.includes('timeout') || error.message.includes('network'))) {
          
          await new Promise(resolve => setTimeout(resolve, 1000 * (retryCount + 1))); // Progressive delay
          return await this.fetchUserProfile(userId, retryCount + 1);
        }

        // Try to get user metadata for better profile creation
        let userMetadata = {};
        try {
          const { data: { user } } = await supabase.auth.getUser();
          if (user) {
            userMetadata = {
              name: user.user_metadata?.name || user.user_metadata?.full_name,
              avatar_url: user.user_metadata?.avatar_url || user.user_metadata?.picture,
              ...user.user_metadata
            };
          }
        } catch (metaError) {
          console.warn('Failed to get user metadata:', metaError);
        }
        
        const defaultProfile = createDefaultProfile(userId, userMetadata);
        
        // Cache the default profile
        this.profileCache.set(userId, {
          profile: defaultProfile,
          timestamp: Date.now()
        });
        
        return defaultProfile;
      }

      // Check if profile exists
      if (!data) {
        
        // Try to get user metadata for better profile creation
        let userMetadata = {};
        try {
          const { data: { user } } = await supabase.auth.getUser();
          if (user) {
            userMetadata = {
              name: user.user_metadata?.name || user.user_metadata?.full_name,
              avatar_url: user.user_metadata?.avatar_url || user.user_metadata?.picture,
              ...user.user_metadata
            };
          }
        } catch (metaError) {
          console.warn('Failed to get user metadata:', metaError);
        }
        
        const newProfile = await this.createDefaultProfile(userId, userMetadata);
        
        // Cache the new profile
        this.profileCache.set(userId, {
          profile: newProfile,
          timestamp: Date.now()
        });
        
        return newProfile;
      }

      // Cache the successful result
      this.profileCache.set(userId, {
        profile: data,
        timestamp: Date.now()
      });
      
      return data;
    } catch (error) {
      console.warn('❌ [AUTH] Profile fetch failed:', error.message);
      
      // Retry logic for timeout errors
      if (retryCount < maxRetries && error.message.includes('timeout')) {
        
        await new Promise(resolve => setTimeout(resolve, 2000 * (retryCount + 1))); // Progressive delay: 2s, 4s
        return await this.fetchUserProfile(userId, retryCount + 1);
      }
      
      // Return default profile instead of throwing
      let userMetadata = {};
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          userMetadata = {
            name: user.user_metadata?.name || user.user_metadata?.full_name,
            avatar_url: user.user_metadata?.avatar_url || user.user_metadata?.picture,
            ...user.user_metadata
          };
        }
      } catch (metaError) {
        console.warn('Failed to get user metadata:', metaError);
      }
      
      const defaultProfile = createDefaultProfile(userId, userMetadata);
      
      // Cache the default profile
      this.profileCache.set(userId, {
        profile: defaultProfile,
        timestamp: Date.now()
      });
      
      return defaultProfile;
    } finally {
      this.fetchingProfiles.delete(userId);
    }
  }

  /**
   * Create default profile untuk user baru
   * @param {string} userId - User ID
   * @param {Object} userMetadata - Optional user metadata from OAuth providers
   * @returns {Promise<Object>} - Created profile
   */
  static async createDefaultProfile(userId, userMetadata = {}) {
    // Get user data from auth.users if metadata is incomplete
    let userData = { ...userMetadata };
    
    try {
      if (!userData.name) {
        const { data: { user } } = await supabase.auth.getUser();
        if (user && user.id === userId) {
          userData = {
            name: user.user_metadata?.name || user.user_metadata?.full_name || user.email,
            avatar_url: user.user_metadata?.avatar_url || user.user_metadata?.picture,
            ...userData,
            ...user.user_metadata
          };
        }
      }
    } catch (error) {
      console.warn('Failed to get user data for profile creation:', error);
    }
    
    const defaultProfile = createDefaultProfile(userId, userData);
    
    try {
      // First try to check if profile already exists
      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();
      
      if (existingProfile) {
        
        return existingProfile;
      }
      
      // If no existing profile, try to insert
      const { data: insertedProfile, error } = await withTimeout(
        supabase.from('profiles').insert([defaultProfile]).select().single(),
        AUTH_TIMEOUTS.PROFILE_INSERT,
        'Insert timeout'
      );
      
      if (error) {
        // If duplicate key error, try to fetch the existing profile
        if (error.code === '23505') {
          
          const { data: existingProfile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', userId)
            .single();
          
          if (existingProfile) {
            return existingProfile;
          }
        }
        
        console.warn('Failed to insert profile, returning default:', error);
        return defaultProfile;
      }
      
      if (!insertedProfile) {
        console.warn('No profile returned from insert, returning default');
        return defaultProfile;
      }

      return insertedProfile;
    } catch (error) {
      console.warn('Failed to create default profile:', error);
      return defaultProfile;
    }
  }

  /**
   * Sign in dengan email dan password
   * @param {string} email - Email address
   * @param {string} password - Password
   * @returns {Promise<Object>} - Sign in result
   */
  static async signInWithEmail(email, password) {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      return { data: null, error };
    }
  }

  /**
   * Sign in dengan Google OAuth dengan pre-validation yang lebih baik
   * @param {string} mode - 'signup' atau 'signin'
   * @returns {Promise<Object>} - Sign in result
   */
  static async signInWithGoogle(mode = 'signup') {
    try {
      // Simpan mode ke sessionStorage untuk validasi nanti
      sessionStorage.setItem('auth_mode', mode);
      
      // Pastikan redirect URL sesuai dengan port yang benar
      const currentPort = window.location.port || '3000';
      const redirectUrl = window.location.hostname === 'localhost' 
        ? `http://localhost:${currentPort}/auth/callback`
        : `${window.location.origin}/auth/callback`;
      
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectUrl,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          }
        }
      });

      if (error) {
        // Clear mode jika error
        sessionStorage.removeItem('auth_mode');
        throw error;
      }
      
      return { data, error: null };
    } catch (error) {
      // Clear mode jika error
      sessionStorage.removeItem('auth_mode');
      return { data: null, error };
    }
  }

  /**
   * Check if user exists in database
   * @param {string} email - User email
   * @returns {Promise<boolean>} - True if user exists
   */
  static async checkUserExists(email) {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', email)
        .single();
      
      return !error && data;
    } catch (error) {
      return false;
    }
  }

  /**
   * Validate user exists by ID (for Google OAuth validation)
   * @param {string} userId - User ID
   * @returns {Promise<Object>} - Validation result with user data or error
   */
  static async validateUserExistsById(userId) {
    try {
      const { data: profile, error } = await withTimeout(
        supabase.from('profiles').select('id, name, created_at').eq('id', userId).single(),
        AUTH_TIMEOUTS.PROFILE_FETCH,
        'User validation timeout'
      );
      
      if (error) {
        // CRITICAL: For signin mode, user MUST exist in profiles
        // Don't create profile automatically for signin attempts
        return { 
          exists: false, 
          error: error.code === 'PGRST116' ? 'User not found in database' : error.message,
          profile: null 
        };
      }
      
      return { 
        exists: true, 
        error: null, 
        profile 
      };
    } catch (error) {
      return { 
        exists: false, 
        error: error.message || 'Validation failed',
        profile: null 
      };
    }
  }

  /**
   * Force logout and redirect to signup with error message
   * @param {string} errorType - Type of error (not_registered, validation_failed, etc.)
   * @param {string} customMessage - Custom error message
   * @returns {Promise<void>}
   */
  static async forceLogoutAndRedirect(errorType = 'not_registered', customMessage = null) {
    try {
      // Force logout from Supabase
      await supabase.auth.signOut();
      
      // Clear auth mode and any cached data
      this.clearAuthMode();
      this.profileCache.clear();
      
      // Prepare error message
      let errorMessage;
      switch (errorType) {
        case 'not_registered':
          errorMessage = customMessage || 'Account not found! You need to sign up first before you can sign in.';
          break;
        case 'validation_failed':
          errorMessage = customMessage || 'Authentication validation failed. Please try again.';
          break;
        case 'signin_blocked':
          errorMessage = customMessage || 'Access denied. Please sign up first to create your account.';
          break;
        default:
          errorMessage = customMessage || 'Authentication error. Please try again.';
      }
      
      // Redirect to signup with error
      const encodedMessage = encodeURIComponent(errorMessage);
      const redirectUrl = `/?mode=signup&error=${errorType}&message=${encodedMessage}`;
      
      window.location.href = redirectUrl;
      
    } catch (error) {
      // Fallback redirect even if logout fails
      window.location.href = '/?mode=signup&error=logout_failed';
    }
  }

  /**
   * Sign up dengan email dan password
   * @param {string} email - Email address
   * @param {string} password - Password
   * @param {Object} userData - Additional user data
   * @returns {Promise<Object>} - Sign up result
   */
  static async signUp(email, password, userData = {}) {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            name: userData.name || extractNameFromEmail(email),
            ...userData
          },
          emailRedirectTo: `${window.location.origin}/auth/callback`
        }
      });

      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      return { data: null, error };
    }
  }

  /**
   * Send OTP to email for verification
   * @param {string} email - Email address
   * @returns {Promise<Object>} - Result with error if any
   */
  static async sendOTP(email) {
    try {
      const { data, error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          shouldCreateUser: false, // Don't create user, just send OTP
        }
      });

      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      return { data: null, error };
    }
  }

  /**
   * Verify OTP code
   * @param {string} email - Email address
   * @param {string} token - OTP token
   * @returns {Promise<Object>} - Verification result
   */
  static async verifyOTP(email, token) {
    try {
      const { data, error } = await supabase.auth.verifyOtp({
        email,
        token,
        type: 'email'
      });

      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      return { data: null, error };
    }
  }

  /**
   * Sign up with email OTP (passwordless)
   * @param {string} email - Email address
   * @param {string} token - OTP token
   * @param {string} password - Password to set
   * @param {Object} userData - Additional user data
   * @returns {Promise<Object>} - Sign up result
   */
  static async signUpWithOTP(email, token, password, userData = {}) {
    try {
      // First verify the OTP
      const { data: verifyData, error: verifyError } = await this.verifyOTP(email, token);
      
      if (verifyError) throw verifyError;

      // Then update the user with password and metadata
      const { data, error } = await supabase.auth.updateUser({
        password,
        data: {
          name: userData.name || extractNameFromEmail(email),
          ...userData
        }
      });

      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      return { data: null, error };
    }
  }

  /**
   * Sign out dengan timeout dan cleanup
   * @returns {Promise<Object>} - Sign out result
   */
  static async signOut() {
    try {
      const { error } = await withTimeout(
        supabase.auth.signOut(),
        AUTH_TIMEOUTS.SIGN_OUT,
        AUTH_ERRORS.SIGN_OUT_TIMEOUT
      );
      
      if (error) {
        console.warn('⚠️ [AUTH-SERVICE] Supabase signOut error:', error);
        
        // Check if it's a 403 Forbidden error (common when session expired)
        if (error.message?.includes('403') || 
            error.message?.includes('Forbidden') ||
            error.status === 403) {
          console.log('📝 [AUTH-SERVICE] Session already expired (403) - proceeding with local cleanup');
        } else {
          console.warn('🔄 [AUTH-SERVICE] Other signOut error - proceeding with local cleanup anyway');
        }
      } else {
        console.log('✅ [AUTH-SERVICE] Supabase signOut successful');
      }

      // Clear storage regardless of signOut success/failure
      clearAuthStorage();
      
      return { error: null };
    } catch (error) {
      console.warn('❌ [AUTH-SERVICE] Sign out error:', error);
      
      // Handle specific error types
      if (error.message?.includes('403') || 
          error.message?.includes('Forbidden') ||
          error.message?.includes('timeout')) {
        console.log('📝 [AUTH-SERVICE] Expected error during signOut - session likely expired');
      } else {
        console.warn('🔄 [AUTH-SERVICE] Unexpected signOut error - continuing with cleanup');
      }
      
      // Force clear storage even if signOut fails
      clearAuthStorage();
      
      return { error: null }; // Return success to prevent UI issues
    }
  }

  /**
   * Update user profile
   * @param {Object} user - Current user
   * @param {Object} updates - Profile updates
   * @returns {Promise<Object>} - Update result
   */
  static async updateProfile(user, updates) {
    try {
      if (!user) throw new Error(AUTH_ERRORS.NO_USER);

      // Update auth metadata if name is being updated
      if (updates.name) {
        const { error: authError } = await supabase.auth.updateUser({
          data: { name: updates.name }
        });
        if (authError) throw authError;
      }

      // Update profile table
      const { data, error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', user.id)
        .select()
        .single();

      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      return { data: null, error };
    }
  }

  /**
   * Clear auth mode from session storage
   * @returns {void}
   */
  static clearAuthMode() {
    sessionStorage.removeItem('auth_mode');
  }

  /**
   * Get current auth mode from session storage
   * @returns {string|null} - Current auth mode or null
   */
  static getAuthMode() {
    return sessionStorage.getItem('auth_mode');
  }

  /**
   * Get access token untuk API calls
   * @returns {Promise<string|null>} - Access token
   */
  static async getAccessToken() {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      return session?.access_token || null;
    } catch (error) {
      return null;
    }
  }
}

export default AuthService;