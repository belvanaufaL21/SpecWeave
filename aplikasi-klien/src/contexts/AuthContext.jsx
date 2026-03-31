import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../config/supabase.js';
import AuthService from '../services/auth/AuthService';
import { ROLE_HIERARCHY } from '../utils/constants/authConstants';
import { isNewUser } from '../utils/helpers/authHelpers';
import initializationManager from '../utils/singletons/InitializationManager.js';
import LocalStorageMigration from '../utils/migrations/localStorageMigration.js';
import sessionManager from '../utils/session/sessionManager.js';

const AuthContext = createContext({});

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState(null);
  const [isNewUserState, setIsNewUserState] = useState(false);
  
  // Add cache to prevent duplicate profile fetches
  const [profileCache, setProfileCache] = useState(new Map());
  const [fetchingProfiles, setFetchingProfiles] = useState(new Set());

  useEffect(() => {
    // Prevent duplicate initialization in React Strict Mode
    if (initializationManager.isAuthInitialized()) {
      
      const existingPromise = initializationManager.getAuthPromise();
      if (existingPromise) {
        existingPromise.then(() => {
          // Sync with existing state if available
          setLoading(false);
        });
      }
      return;
    }

    const authPromise = initializeAuth();
    initializationManager.setAuthInitialized(authPromise);
    
    const subscription = setupAuthListener();
    
    // Setup periodic session validation (every 5 seconds for faster detection)
    const validationInterval = setInterval(async () => {
      if (session?.user) {
        try {
          // Try to fetch profile from database - if user deleted, this will fail
          const { data: profileData, error: profileError } = await supabase
            .from('profiles')
            .select('id')
            .eq('id', session.user.id)
            .single();
          
          // Check for 409 conflict or user not found
          if (profileError && (profileError.code === '409' || profileError.code === 'PGRST116')) {
            console.log('🚨 [AUTH-CONTEXT] User deleted from database (409/PGRST116) - forcing logout');
            
            // Clear all auth data
            localStorage.clear();
            sessionStorage.clear();
            
            // Force reload to clear any cached data
            window.location.href = '/login';
            return;
          }
          
          if (profileError || !profileData) {
            console.log('🚨 [AUTH-CONTEXT] User deleted from database - forcing logout');
            
            // Clear all auth data
            localStorage.clear();
            sessionStorage.clear();
            
            // Force reload to clear any cached data
            window.location.href = '/login';
          }
        } catch (err) {
          console.warn('⚠️ [AUTH-CONTEXT] Session validation error:', err);
          // On any error during validation, force logout to be safe
          localStorage.clear();
          sessionStorage.clear();
          window.location.href = '/login';
        }
      }
    }, 5000); // Check every 5 seconds
    
    return () => {
      subscription?.unsubscribe();
      clearInterval(validationInterval);
    };
  }, [session]);

  /**
   * Initialize authentication state
   */
  const initializeAuth = async () => {
    try {
      const session = await AuthService.getInitialSession();
      
      if (session) {
        setSession(session);
        setUser(session.user);
        
        // CRITICAL: Save access token to localStorage for API calls
        // Try multiple sources for token
        let accessToken = session.access_token;
        
        // Fallback: Try to get from old Supabase storage format
        if (!accessToken) {
          try {
            const oldSession = JSON.parse(localStorage.getItem('supabase.auth.token'));
            accessToken = oldSession?.access_token;
          } catch (e) {
            console.warn('Failed to parse old session format');
          }
        }
        
        if (accessToken) {
          localStorage.setItem('token', accessToken);
          console.log('✅ [AUTH-CONTEXT] Token saved to localStorage on init');
        } else {
          console.warn('⚠️ [AUTH-CONTEXT] No access token found');
        }
        
        await loadUserProfile(session.user.id);
      }
    } catch (error) {
      console.warn('Auth initialization failed:', error);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Setup auth state change listener
   */
  const setupAuthListener = () => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        try {
          // Handle user deletion or token expiration
          if (event === 'SIGNED_OUT' || event === 'TOKEN_REFRESHED' && !session) {
            console.log('🔒 [AUTH-CONTEXT] User signed out or session invalidated');
            localStorage.clear();
            sessionStorage.clear();
            setUser(null);
            setSession(null);
            setProfile(null);
            setIsNewUserState(false);
            sessionManager.cleanup();
            setLoading(false);
            return;
          }

          // CRITICAL: Skip validation if in callback page - let AuthCallback handle it
          if (event === 'SIGNED_IN' && session?.user) {
            // Check if we're in a callback page - if so, let AuthCallback handle validation
            if (window.location.pathname.includes('/auth/callback')) {
              setSession(session);
              setUser(session.user);
              return;
            }
          }

          setSession(session);
          setUser(session?.user ?? null);
          
          // CRITICAL: Save access token to localStorage for API calls
          let accessToken = session?.access_token;
          
          // Fallback: Try to get from old Supabase storage format
          if (!accessToken && session?.user) {
            try {
              const oldSession = JSON.parse(localStorage.getItem('supabase.auth.token'));
              accessToken = oldSession?.access_token;
            } catch (e) {
              console.warn('Failed to parse old session format');
            }
          }
          
          if (accessToken) {
            localStorage.setItem('token', accessToken);
            console.log('✅ [AUTH-CONTEXT] Token saved to localStorage');
          } else {
            localStorage.removeItem('token');
            console.log('🗑️ [AUTH-CONTEXT] Token removed from localStorage');
          }
          
          if (session?.user) {
            // Verify user still exists in database by checking profile
            try {
              const { data: profileCheck, error: profileError } = await supabase
                .from('profiles')
                .select('id')
                .eq('id', session.user.id)
                .single();
              
              if (profileError || !profileCheck) {
                console.log('🚨 [AUTH-CONTEXT] User profile not found - forcing logout');
                await supabase.auth.signOut();
                localStorage.clear();
                sessionStorage.clear();
                setUser(null);
                setSession(null);
                setProfile(null);
                setIsNewUserState(false);
                sessionManager.cleanup();
                window.location.href = '/login';
                return;
              }
            } catch (verifyError) {
              console.warn('⚠️ [AUTH-CONTEXT] Profile verification failed:', verifyError);
              await supabase.auth.signOut();
              localStorage.clear();
              sessionStorage.clear();
              setUser(null);
              setSession(null);
              setProfile(null);
              setIsNewUserState(false);
              sessionManager.cleanup();
              window.location.href = '/login';
              return;
            }

            // Only load profile, no validation here - AuthCallback handles validation
            await loadUserProfile(session.user.id);
            setIsNewUserState(isNewUser(session.user.created_at));
            
            // Initialize session management for authenticated users
            sessionManager.initialize();
            
            // Run migration if needed
            await runMigrationIfNeeded(session.user);
          } else {
            // No session - clear all state and cleanup session manager
            setProfile(null);
            setIsNewUserState(false);
            sessionManager.cleanup();
          }
        } catch (error) {
          console.warn('❌ [AUTH-CONTEXT] Auth state change error:', error);
          
          // Don't clear state for minor errors - only for critical auth failures
          const isCriticalError = error.message?.includes('unauthorized') || 
                                 error.message?.includes('forbidden') ||
                                 error.message?.includes('invalid_grant') ||
                                 error.status === 401 || 
                                 error.status === 403;
          
          if (isCriticalError) {
            console.error('🚨 [AUTH-CONTEXT] Critical auth error - clearing state');
            // On critical error, clear state and redirect to safe page
            await supabase.auth.signOut();
            localStorage.clear();
            sessionStorage.clear();
            setUser(null);
            setSession(null);
            setProfile(null);
            setIsNewUserState(false);
            
            // Clear auth mode on critical error
            AuthService.clearAuthMode();
            
            window.location.href = '/login';
          } else {
            console.warn('⚠️ [AUTH-CONTEXT] Non-critical error - keeping session intact');
            // For non-critical errors (network, timeout, etc.), keep the session
            // Just log the error but don't clear user state
          }
          
        } finally {
          setLoading(false);
        }
      }
    );
    
    return subscription;
  };

  /**
   * Load user profile with global caching and duplicate prevention
   */
  const loadUserProfile = async (userId) => {
    if (!userId) return;
    
    // Check global cache first
    const globalCached = initializationManager.getCachedProfile(userId);
    if (globalCached) {
      setProfile(globalCached);
      return;
    }
    
    // Check local cache
    const cached = profileCache.get(userId);
    if (cached && Date.now() - cached.timestamp < 60000) { // 1 minute cache
      setProfile(cached.profile);
      return;
    }
    
    // Prevent duplicate fetches using global lock
    const lockKey = `profile-${userId}`;
    if (initializationManager.isLocked(lockKey)) {
      return;
    }
    
    // Prevent local duplicate fetches
    if (fetchingProfiles.has(userId)) {
      return;
    }
    
    try {
      initializationManager.lock(lockKey);
      setFetchingProfiles(prev => new Set(prev).add(userId));
      
      const profileData = await AuthService.fetchUserProfile(userId);
      
      // If profile not found, user was deleted - force logout
      if (!profileData) {
        console.log('🚨 [AUTH-CONTEXT] Profile not found - user deleted, forcing logout');
        await supabase.auth.signOut();
        localStorage.clear();
        sessionStorage.clear();
        setUser(null);
        setSession(null);
        setProfile(null);
        setIsNewUserState(false);
        sessionManager.cleanup();
        window.location.href = '/login';
        return;
      }
      
      // Cache in both local and global cache
      const cacheData = {
        profile: profileData,
        timestamp: Date.now()
      };
      
      setProfileCache(prev => new Map(prev).set(userId, cacheData));
      initializationManager.cacheProfile(userId, profileData);
      
      setProfile(profileData);
      
    } catch (error) {
      console.warn('Failed to load user profile:', error);
      
      // If user was deleted, force logout
      if (error.message === 'USER_DELETED' || 
          error.code === 'PGRST116' || 
          error.code === '409' ||
          error.message?.includes('not found') ||
          error.message?.includes('conflict')) {
        console.log('🚨 [AUTH-CONTEXT] User deleted - forcing logout');
        await supabase.auth.signOut();
        localStorage.clear();
        sessionStorage.clear();
        setUser(null);
        setSession(null);
        setProfile(null);
        setIsNewUserState(false);
        sessionManager.cleanup();
        window.location.href = '/login';
      }
    } finally {
      initializationManager.unlock(lockKey);
      setFetchingProfiles(prev => {
        const newSet = new Set(prev);
        newSet.delete(userId);
        return newSet;
      });
    }
  };

  /**
   * Run migration if needed when user logs in
   */
  const runMigrationIfNeeded = async (user) => {
    try {
      // Check if migration is needed
      const status = LocalStorageMigration.getMigrationStatus();
      
      if (status.canMigrate) {
        const result = await LocalStorageMigration.runMigration();
        
        if (result.success) {
          // Show success notification if data was migrated
          if (result.totalMigrated > 0) {
            showMigrationNotification(result.totalMigrated);
          }
        } else {
          console.error('❌ [AUTH-CONTEXT] Migration failed:', result.error);
        }
      }
    } catch (error) {
      console.error('❌ [AUTH-CONTEXT] Migration error:', error);
    }
  };

  /**
   * Show migration success notification
   */
  const showMigrationNotification = (totalMigrated) => {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = 'fixed top-4 right-4 bg-green-600 text-white px-6 py-3 rounded-lg shadow-lg z-50 transition-all duration-300 max-w-sm';
    notification.innerHTML = `
      <div class="flex items-start gap-3">
        <svg class="w-6 h-6 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
        </svg>
        <div>
          <div class="font-semibold">Data Migration Completed!</div>
          <div class="text-sm opacity-90 mt-1">${totalMigrated} items migrated to database. Your data will now sync across all browsers and devices.</div>
        </div>
        <button onclick="this.parentElement.parentElement.remove()" class="ml-2 text-white hover:text-gray-200">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
          </svg>
        </button>
      </div>
    `;

    document.body.appendChild(notification);

    // Auto remove after 8 seconds
    setTimeout(() => {
      if (notification.parentNode) {
        notification.style.opacity = '0';
        notification.style.transform = 'translateX(100%)';
        
        setTimeout(() => {
          if (notification.parentNode) {
            notification.parentNode.removeChild(notification);
          }
        }, 300);
      }
    }, 8000);
  };

  /**
   * Sign in with email and password
   */
  const signInWithEmail = async (email, password) => {
    setLoading(true);
    try {
      return await AuthService.signInWithEmail(email, password);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Sign in with Google
   * @param {string} mode - 'signup' atau 'signin'
   */
  const signInWithGoogle = async (mode = 'signup') => {
    return await AuthService.signInWithGoogle(mode);
  };

  /**
   * Sign up with email and password
   */
  const signUp = async (email, password, userData = {}) => {
    return await AuthService.signUp(email, password, userData);
  };

  /**
   * Sign out with enhanced session cleanup
   */
  const signOut = async () => {
    setLoading(true);
    try {
      // Use session manager for proper logout
      const result = await sessionManager.logout();
      
      // Clear state
      setUser(null);
      setSession(null);
      setProfile(null);
      setIsNewUserState(false);
      
      return { error: null };
    } catch (error) {
      console.warn('Sign out error:', error);
      
      // Force cleanup even if logout fails
      sessionManager.cleanup();
      setUser(null);
      setSession(null);
      setProfile(null);
      setIsNewUserState(false);
      
      return { error: null }; // Return success to prevent UI issues
    } finally {
      setLoading(false);
    }
  };

  /**
   * Update profile
   */
  const updateProfile = async (updates) => {
    setLoading(true);
    try {
      const result = await AuthService.updateProfile(user, updates);
      
      if (result.data) {
        setProfile(result.data);
      }
      
      return result;
    } finally {
      setLoading(false);
    }
  };

  /**
   * Reset password
   */
  const resetPassword = async (email) => {
    return await AuthService.resetPassword(email);
  };

  /**
   * Update password
   */
  const updatePassword = async (newPassword) => {
    return await AuthService.updatePassword(newPassword);
  };

  /**
   * Get access token
   */
  const getAccessToken = async () => {
    return await AuthService.getAccessToken();
  };

  /**
   * Check if user has specific role
   */
  const hasRole = (requiredRole) => {
    const userRole = profile?.role || user?.user_metadata?.role || 'user';
    return ROLE_HIERARCHY[userRole] >= ROLE_HIERARCHY[requiredRole];
  };

  /**
   * Get session information
   */
  const getSessionInfo = () => {
    return sessionManager.getSessionInfo();
  };

  /**
   * Validate current session
   */
  const validateSession = async () => {
    return await sessionManager.validateSession();
  };

  /**
   * Fetch user profile (exposed for external use)
   */
  const fetchUserProfile = async (userId) => {
    return await AuthService.fetchUserProfile(userId);
  };

  const value = {
    user,
    session,
    profile,
    loading,
    isNewUser: isNewUserState,
    signInWithEmail,
    signInWithGoogle,
    signUp,
    signOut,
    updateProfile,
    resetPassword,
    updatePassword,
    getAccessToken,
    hasRole,
    fetchUserProfile,
    getSessionInfo,
    validateSession
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};