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
          setSession(session);
          setUser(session?.user ?? null);
          
          if (session?.user) {
            await loadUserProfile(session.user.id);
            setIsNewUserState(isNewUser(session.user.created_at));
          } else {
            setProfile(null);
            setIsNewUserState(false);
          }
        } catch (error) {
          console.warn('Auth state change error:', error);
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
   */
  const signInWithGoogle = async () => {
    return await AuthService.signInWithGoogle();
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