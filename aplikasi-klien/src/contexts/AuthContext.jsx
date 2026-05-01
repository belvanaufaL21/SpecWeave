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
    // Simple initialization - no complex checks
    let mounted = true;
    
    const init = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!mounted) return;
        
        if (session?.user) {
          setSession(session);
          setUser(session.user);
          
          // Save token
          if (session.access_token) {
            localStorage.setItem('token', session.access_token);
          }
          
          // Load profile in background
          loadUserProfile(session.user.id).catch(console.error);
        }
      } catch (error) {
        console.error('[AUTH] Init error:', error);
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };
    
    init();
    
    // Setup auth listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!mounted) return;
        
        console.log('[AUTH] Event:', event);
        
        if (event === 'SIGNED_OUT') {
          setUser(null);
          setSession(null);
          setProfile(null);
          localStorage.clear();
          sessionStorage.clear();
          return;
        }
        
        if (session?.user) {
          setSession(session);
          setUser(session.user);
          
          if (session.access_token) {
            localStorage.setItem('token', session.access_token);
          }
          
          loadUserProfile(session.user.id).catch(console.error);
        }
        
        setLoading(false);
      }
    );
    
    return () => {
      mounted = false;
      subscription?.unsubscribe();
    };
  }, []);

  /**
   * Load user profile with caching
   */
  const loadUserProfile = async (userId) => {
    if (!userId) return;
    
    // Check cache
    const cached = profileCache.get(userId);
    if (cached && Date.now() - cached.timestamp < 60000) {
      setProfile(cached.profile);
      return;
    }
    
    // Prevent duplicate fetches
    if (fetchingProfiles.has(userId)) return;
    
    try {
      setFetchingProfiles(prev => new Set(prev).add(userId));
      
      const profileData = await AuthService.fetchUserProfile(userId);
      
      if (profileData) {
        setProfileCache(prev => new Map(prev).set(userId, {
          profile: profileData,
          timestamp: Date.now()
        }));
        setProfile(profileData);
      }
    } catch (error) {
      console.error('[AUTH] Load profile error:', error);
    } finally {
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