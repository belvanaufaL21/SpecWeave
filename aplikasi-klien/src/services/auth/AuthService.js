import { supabase } from '../../config/supabase.js';
import { 
  AUTH_TIMEOUTS, 
  AUTH_ERRORS, 
  AUTH_STORAGE_KEYS 
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
      console.log(`🎯 [AUTH] Using cached profile for user: ${userId}`);
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
      console.log(`🔍 [AUTH] Fetching profile for user: ${userId}${retryCount > 0 ? ` (attempt ${retryCount + 1})` : ''}`);
      
      const { data, error } = await withTimeout(
        supabase.from('profiles').select('*').eq('id', userId).single(),
        AUTH_TIMEOUTS.PROFILE_FETCH,
        AUTH_ERRORS.PROFILE_TIMEOUT
      );

      if (error) {
        console.warn(`⚠️ [AUTH] Profile fetch error:`, error);
        
        if (error.code === AUTH_ERRORS.NO_PROFILE) {
          console.log(`🔧 [AUTH] No profile found, creating default profile`);
          
          // Try to get user metadata for better profile creation
          let userMetadata = {};
          try {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
              userMetadata = {
                name: user.user_metadata?.name || user.user_metadata?.full_name,
                email: user.email,
                avatar_url: user.user_metadata?.avatar_url || user.user_metadata?.picture,
                email_verified: user.email_confirmed_at ? true : false,
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
        
        // If it's a timeout or network error and we haven't exceeded max retries
        if (retryCount < maxRetries && (error.message.includes('timeout') || error.message.includes('network'))) {
          console.log(`🔄 [AUTH] Retrying profile fetch (${retryCount + 1}/${maxRetries})...`);
          await new Promise(resolve => setTimeout(resolve, 1000 * (retryCount + 1))); // Progressive delay
          return await this.fetchUserProfile(userId, retryCount + 1);
        }
        
        console.log(`🔧 [AUTH] Using fallback default profile`);
        
        // Try to get user metadata for better profile creation
        let userMetadata = {};
        try {
          const { data: { user } } = await supabase.auth.getUser();
          if (user) {
            userMetadata = {
              name: user.user_metadata?.name || user.user_metadata?.full_name,
              email: user.email,
              avatar_url: user.user_metadata?.avatar_url || user.user_metadata?.picture,
              email_verified: user.email_confirmed_at ? true : false,
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

      console.log(`✅ [AUTH] Profile fetched successfully`);
      
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
        console.log(`🔄 [AUTH] Retrying profile fetch due to timeout (${retryCount + 1}/${maxRetries})...`);
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
            email: user.email,
            avatar_url: user.user_metadata?.avatar_url || user.user_metadata?.picture,
            email_verified: user.email_confirmed_at ? true : false,
            ...user.user_metadata
          };
        }
      } catch (metaError) {
        console.warn('Failed to get user metadata:', metaError);
      }
      
      const defaultProfile = createDefaultProfile(userId, userMetadata);
      console.log(`🔧 [AUTH] Using default profile as fallback after ${retryCount + 1} attempts`);
      
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
      if (!userData.email || !userData.name) {
        const { data: { user } } = await supabase.auth.getUser();
        if (user && user.id === userId) {
          userData = {
            email: user.email,
            name: user.user_metadata?.name || user.user_metadata?.full_name || user.email,
            avatar_url: user.user_metadata?.avatar_url || user.user_metadata?.picture,
            email_verified: user.email_confirmed_at ? true : false,
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
      const { data: insertedProfile, error } = await withTimeout(
        supabase.from('profiles').insert([defaultProfile]).select().single(),
        AUTH_TIMEOUTS.PROFILE_INSERT,
        'Insert timeout'
      );
      
      if (error || !insertedProfile) {
        console.warn('Failed to insert profile, returning default:', error);
        return defaultProfile;
      }
      
      console.log('✅ [AUTH] Profile created successfully:', insertedProfile.email);
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
      console.error('Sign in error:', error);
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
      console.log('🔗 [AUTH] Setting auth mode:', mode);
      
      // CRITICAL: For signin mode, show warning about pre-validation
      if (mode === 'signin') {
        console.log('🔍 [AUTH] Signin mode - user will be validated after OAuth');
        console.log('⚠️ [AUTH] Note: Unregistered users will be removed from authentication table after validation fails');
      }
      
      // Pastikan redirect URL sesuai dengan port yang benar
      const currentPort = window.location.port || '3000';
      const redirectUrl = window.location.hostname === 'localhost' 
        ? `http://localhost:${currentPort}/auth/callback`
        : `${window.location.origin}/auth/callback`;
      
      console.log('🔗 [AUTH] Google OAuth redirect URL:', redirectUrl);
      console.log('🔗 [AUTH] Current location:', window.location.href);
      console.log('🔗 [AUTH] Auth mode:', mode);
      
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
        console.error('❌ [AUTH] Google OAuth error:', error);
        // Clear mode jika error
        sessionStorage.removeItem('auth_mode');
        throw error;
      }
      
      console.log('✅ [AUTH] Google OAuth initiated successfully');
      return { data, error: null };
    } catch (error) {
      console.error('Google sign in error:', error);
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
      console.error('Error checking user existence:', error);
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
      console.log('🔍 [AUTH] Validating user existence for ID:', userId);
      
      const { data: profile, error } = await withTimeout(
        supabase.from('profiles').select('id, email, created_at').eq('id', userId).single(),
        AUTH_TIMEOUTS.PROFILE_FETCH,
        'User validation timeout'
      );
      
      if (error) {
        console.log('❌ [AUTH] User validation failed:', error.message, 'Code:', error.code);
        
        // CRITICAL: For signin mode, user MUST exist in profiles
        // Don't create profile automatically for signin attempts
        return { 
          exists: false, 
          error: error.code === 'PGRST116' ? 'User not found in database' : error.message,
          profile: null 
        };
      }
      
      console.log('✅ [AUTH] User validation successful:', profile.email);
      return { 
        exists: true, 
        error: null, 
        profile 
      };
    } catch (error) {
      console.error('❌ [AUTH] User validation error:', error);
      return { 
        exists: false, 
        error: error.message || 'Validation failed',
        profile: null 
      };
    }
  }

  /**
   * Validate user exists by email (for additional verification)
   * @param {string} email - User email
   * @returns {Promise<Object>} - Validation result with user data or error
   */
  static async validateUserExistsByEmail(email) {
    try {
      console.log('🔍 [AUTH] Validating user existence for email:', email);
      
      // For signin mode, STRICT validation - user must exist in profiles
      const { data: profile, error: profileError } = await withTimeout(
        supabase.from('profiles').select('id, email, created_at').eq('email', email).maybeSingle(),
        AUTH_TIMEOUTS.PROFILE_FETCH,
        'User validation timeout'
      );
      
      if (profile && !profileError) {
        console.log('✅ [AUTH] User validation by email successful (profiles):', profile.email);
        return { 
          exists: true, 
          error: null, 
          profile 
        };
      }
      
      // CRITICAL: For signin mode, do NOT create profile automatically
      // User must exist in profiles table to sign in
      console.log('❌ [AUTH] User not found in profiles table for signin:', email);
      return { 
        exists: false, 
        error: 'User not found in database - please sign up first',
        profile: null 
      };
      
    } catch (error) {
      console.error('❌ [AUTH] User validation by email error:', error);
      return { 
        exists: false, 
        error: error.message || 'Validation failed',
        profile: null 
      };
    }
  }

  /**
   * Force logout and redirect to signup with error message
   * PLUS: Remove user from authentication table to keep it clean
   * @param {string} errorType - Type of error (not_registered, validation_failed, etc.)
   * @param {string} customMessage - Custom error message
   * @returns {Promise<void>}
   */
  static async forceLogoutAndRedirect(errorType = 'not_registered', customMessage = null) {
    try {
      console.log('🚪 [AUTH] Force logout initiated for error:', errorType);
      
      // Get current user before logout to potentially delete them
      const { data: { user } } = await supabase.auth.getUser();
      
      // Force logout from Supabase
      await supabase.auth.signOut();
      
      // CRITICAL: For signin failures, try to delete the user from auth.users table
      // This keeps the authentication table clean
      if (errorType === 'signin_blocked' || errorType === 'not_registered') {
        if (user && user.id) {
          console.log('🗑️ [AUTH] Attempting to remove unregistered user from authentication table:', user.email);
          
          try {
            // Note: This requires admin privileges, so it might not work
            // But we'll try anyway to keep the auth table clean
            const { error: deleteError } = await supabase.auth.admin.deleteUser(user.id);
            
            if (deleteError) {
              console.warn('⚠️ [AUTH] Could not delete user from auth table (requires admin privileges):', deleteError.message);
              console.log('ℹ️ [AUTH] User will remain in auth.users table but without profile');
            } else {
              console.log('✅ [AUTH] Successfully removed unregistered user from authentication table');
            }
          } catch (deleteError) {
            console.warn('⚠️ [AUTH] Exception while trying to delete user:', deleteError.message);
            console.log('ℹ️ [AUTH] This is expected - client cannot delete auth users directly');
          }
        }
      }
      
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
      
      console.log('🔄 [AUTH] Redirecting to:', redirectUrl);
      window.location.href = redirectUrl;
      
    } catch (error) {
      console.error('❌ [AUTH] Force logout error:', error);
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
          }
        }
      });

      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      console.error('Sign up error:', error);
      return { data: null, error };
    }
  }

  /**
   * Sign out dengan timeout dan cleanup
   * @returns {Promise<Object>} - Sign out result
   */
  static async signOut() {
    try {
      console.log('Starting sign out process...');
      
      const { error } = await withTimeout(
        supabase.auth.signOut(),
        AUTH_TIMEOUTS.SIGN_OUT,
        AUTH_ERRORS.SIGN_OUT_TIMEOUT
      );
      
      if (error) {
        console.warn('Supabase signOut error:', error);
      }

      // Clear storage regardless of signOut success/failure
      clearAuthStorage();
      
      console.log('Sign out completed successfully');
      return { error: null };
    } catch (error) {
      console.warn('Sign out error:', error);
      
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
      console.error('Update profile error:', error);
      return { data: null, error };
    }
  }

  /**
   * Reset password
   * @param {string} email - Email address
   * @returns {Promise<Object>} - Reset result
   */
  static async resetPassword(email) {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`
      });

      if (error) throw error;
      return { error: null };
    } catch (error) {
      console.error('Reset password error:', error);
      return { error };
    }
  }

  /**
   * Update password
   * @param {string} newPassword - New password
   * @returns {Promise<Object>} - Update result
   */
  static async updatePassword(newPassword) {
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (error) throw error;
      return { error: null };
    } catch (error) {
      console.error('Update password error:', error);
      return { error };
    }
  }

  /**
   * Clear auth mode from session storage
   * @returns {void}
   */
  static clearAuthMode() {
    sessionStorage.removeItem('auth_mode');
    console.log('🧹 [AUTH] Auth mode cleared from session storage');
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
      console.error('Error getting access token:', error);
      return null;
    }
  }
}

export default AuthService;