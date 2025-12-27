import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../config/supabase.js';
import AuthService from '../services/auth/AuthService';
import { ROLE_HIERARCHY } from '../utils/constants/authConstants';
import { isNewUser } from '../utils/helpers/authHelpers';
import initializationManager from '../utils/singletons/InitializationManager.js';

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
      console.log('🎯 [AUTH] Using existing auth initialization');
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
    
    return () => {
      subscription?.unsubscribe();
    };
  }, []);

  /**
   * Initialize authentication state
   */
  const initializeAuth = async () => {
    try {
      const session = await AuthService.getInitialSession();
      
      if (session) {
        setSession(session);
        setUser(session.user);
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
          console.log('🔄 [AUTH-CONTEXT] Auth state change:', event, session?.user?.email);
          
          // CRITICAL: Skip validation if in callback page - let AuthCallback handle it
          if (event === 'SIGNED_IN' && session?.user) {
            console.log('🔄 [AUTH-CONTEXT] SIGNED_IN event detected');
            
            // Check if we're in a callback page - if so, let AuthCallback handle validation
            if (window.location.pathname.includes('/auth/callback')) {
              console.log('🔄 [AUTH-CONTEXT] In callback page, skipping validation - AuthCallback will handle it');
              setSession(session);
              setUser(session.user);
              return;
            }
            
            // For non-callback pages, do minimal processing
            console.log('🔄 [AUTH-CONTEXT] Not in callback, processing normally');
          }
          
          console.log('🔄 [AUTH-CONTEXT] Processing auth state change normally');
          setSession(session);
          setUser(session?.user ?? null);
          
          if (session?.user) {
            // Only load profile, no validation here - AuthCallback handles validation
            await loadUserProfile(session.user.id);
            setIsNewUserState(isNewUser(session.user.created_at));
          } else {
            // No session - clear all state
            setProfile(null);
            setIsNewUserState(false);
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
            setUser(null);
            setSession(null);
            setProfile(null);
            setIsNewUserState(false);
            
            // Clear auth mode on critical error
            AuthService.clearAuthMode();
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
      console.log(`🎯 [AUTH] Using global cached profile for user: ${userId}`);
      setProfile(globalCached);
      return;
    }
    
    // Check local cache
    const cached = profileCache.get(userId);
    if (cached && Date.now() - cached.timestamp < 60000) { // 1 minute cache
      console.log(`🎯 [AUTH] Using local cached profile for user: ${userId}`);
      setProfile(cached.profile);
      return;
    }
    
    // Prevent duplicate fetches using global lock
    const lockKey = `profile-${userId}`;
    if (initializationManager.isLocked(lockKey)) {
      console.log(`⏳ [AUTH] Profile fetch already in progress globally for user: ${userId}`);
      return;
    }
    
    // Prevent local duplicate fetches
    if (fetchingProfiles.has(userId)) {
      console.log(`⏳ [AUTH] Profile fetch already in progress locally for user: ${userId}`);
      return;
    }
    
    try {
      initializationManager.lock(lockKey);
      setFetchingProfiles(prev => new Set(prev).add(userId));
      console.log(`🔍 [AUTH] Loading profile for user: ${userId}`);
      
      const profileData = await AuthService.fetchUserProfile(userId);
      
      // Cache in both local and global cache
      const cacheData = {
        profile: profileData,
        timestamp: Date.now()
      };
      
      setProfileCache(prev => new Map(prev).set(userId, cacheData));
      initializationManager.cacheProfile(userId, profileData);
      
      setProfile(profileData);
      console.log(`✅ [AUTH] Profile loaded and cached for user: ${userId}`);
    } catch (error) {
      console.warn('Failed to load user profile:', error);
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
   * Sign out
   */
  const signOut = async () => {
    setLoading(true);
    try {
      const result = await AuthService.signOut();
      
      // Clear state
      setUser(null);
      setSession(null);
      setProfile(null);
      setIsNewUserState(false);
      
      return result;
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
    fetchUserProfile
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};