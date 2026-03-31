/**
 * Session Management Utilities
 * Handles session persistence, validation, and refresh logic
 */

import { supabase } from '../../config/supabase';

/**
 * Session storage keys
 */
const SESSION_KEYS = {
  REMEMBER_ME: 'specweave_remember_me',
  SESSION_EXPIRY: 'specweave_session_expiry',
  LAST_ACTIVITY: 'specweave_last_activity'
};

/**
 * Session configuration
 */
const SESSION_CONFIG = {
  REMEMBER_ME_DURATION: 30 * 24 * 60 * 60 * 1000, // 30 days in milliseconds
  DEFAULT_DURATION: 24 * 60 * 60 * 1000, // 24 hours in milliseconds
  ACTIVITY_CHECK_INTERVAL: 5 * 60 * 1000, // 5 minutes
  REFRESH_THRESHOLD: 60 * 60 * 1000, // 1 hour before expiry
  MAX_IDLE_TIME: 2 * 60 * 60 * 1000 // 2 hours of inactivity
};

/**
 * Session Manager Class
 */
class SessionManager {
  constructor() {
    this.activityTimer = null;
    this.refreshTimer = null;
    this.isInitialized = false;
  }

  /**
   * Initialize session management
   */
  initialize() {
    if (this.isInitialized) return;

    this.setupActivityTracking();
    this.setupPeriodicRefresh();
    this.isInitialized = true;
  }

  /**
   * Set remember me preference and configure session duration
   * @param {boolean} rememberMe - Whether to remember the user
   */
  setRememberMe(rememberMe) {
    try {
      if (rememberMe) {
        localStorage.setItem(SESSION_KEYS.REMEMBER_ME, 'true');
        const expiryTime = Date.now() + SESSION_CONFIG.REMEMBER_ME_DURATION;
        localStorage.setItem(SESSION_KEYS.SESSION_EXPIRY, expiryTime.toString());
      } else {
        localStorage.setItem(SESSION_KEYS.REMEMBER_ME, 'false');
        const expiryTime = Date.now() + SESSION_CONFIG.DEFAULT_DURATION;
        localStorage.setItem(SESSION_KEYS.SESSION_EXPIRY, expiryTime.toString());
      }
      
      this.updateLastActivity();
    } catch (error) {
      console.warn('Failed to set remember me preference:', error);
    }
  }

  /**
   * Get remember me preference
   * @returns {boolean} - Remember me preference
   */
  getRememberMe() {
    try {
      return localStorage.getItem(SESSION_KEYS.REMEMBER_ME) === 'true';
    } catch (error) {
      return false;
    }
  }

  /**
   * Update last activity timestamp
   */
  updateLastActivity() {
    try {
      localStorage.setItem(SESSION_KEYS.LAST_ACTIVITY, Date.now().toString());
    } catch (error) {
      console.warn('Failed to update last activity:', error);
    }
  }

  /**
   * Check if session is expired
   * @returns {boolean} - True if session is expired
   */
  isSessionExpired() {
    try {
      const expiryTime = localStorage.getItem(SESSION_KEYS.SESSION_EXPIRY);
      const lastActivity = localStorage.getItem(SESSION_KEYS.LAST_ACTIVITY);
      
      if (!expiryTime || !lastActivity) {
        return true;
      }

      const now = Date.now();
      const expiry = parseInt(expiryTime);
      const lastActivityTime = parseInt(lastActivity);

      // Check if session has expired by time
      if (now > expiry) {
        return true;
      }

      // Check if user has been idle too long
      if (now - lastActivityTime > SESSION_CONFIG.MAX_IDLE_TIME) {
        return true;
      }

      return false;
    } catch (error) {
      console.warn('Failed to check session expiry:', error);
      return true;
    }
  }

  /**
   * Check if session needs refresh
   * @returns {boolean} - True if session needs refresh
   */
  needsRefresh() {
    try {
      const expiryTime = localStorage.getItem(SESSION_KEYS.SESSION_EXPIRY);
      if (!expiryTime) return false;

      const now = Date.now();
      const expiry = parseInt(expiryTime);

      // Refresh if within threshold of expiry
      return (expiry - now) < SESSION_CONFIG.REFRESH_THRESHOLD;
    } catch (error) {
      console.warn('Failed to check refresh need:', error);
      return false;
    }
  }

  /**
   * Refresh session token
   * @returns {Promise<boolean>} - True if refresh successful
   */
  async refreshSession() {
    try {
      const { data, error } = await supabase.auth.refreshSession();
      
      if (error) {
        console.warn('Session refresh failed:', error);
        return false;
      }

      if (data.session) {
        // Extend session expiry
        const rememberMe = this.getRememberMe();
        const duration = rememberMe ? 
          SESSION_CONFIG.REMEMBER_ME_DURATION : 
          SESSION_CONFIG.DEFAULT_DURATION;
        
        const newExpiry = Date.now() + duration;
        localStorage.setItem(SESSION_KEYS.SESSION_EXPIRY, newExpiry.toString());
        this.updateLastActivity();
        
        console.log('Session refreshed successfully');
        return true;
      }

      return false;
    } catch (error) {
      console.warn('Session refresh error:', error);
      return false;
    }
  }

  /**
   * Validate current session
   * @returns {Promise<boolean>} - True if session is valid
   */
  async validateSession() {
    try {
      // Check local session expiry first
      if (this.isSessionExpired()) {
        console.log('Local session expired');
        return false;
      }

      // Check with Supabase
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (error) {
        console.warn('Session validation error:', error);
        return false;
      }

      if (!session) {
        console.log('No active session found');
        return false;
      }

      // Check if token is expired
      const now = Math.floor(Date.now() / 1000);
      if (session.expires_at && session.expires_at < now) {
        console.log('Session token expired');
        
        // Try to refresh
        const refreshed = await this.refreshSession();
        return refreshed;
      }

      this.updateLastActivity();
      return true;
    } catch (error) {
      console.warn('Session validation failed:', error);
      return false;
    }
  }

  /**
   * Setup activity tracking
   */
  setupActivityTracking() {
    // Track user activity
    const activityEvents = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];
    
    const handleActivity = () => {
      this.updateLastActivity();
    };

    activityEvents.forEach(event => {
      document.addEventListener(event, handleActivity, { passive: true });
    });

    // Periodic activity check
    this.activityTimer = setInterval(() => {
      if (this.isSessionExpired()) {
        this.handleSessionExpiry();
      }
    }, SESSION_CONFIG.ACTIVITY_CHECK_INTERVAL);
  }

  /**
   * Setup periodic session refresh
   */
  setupPeriodicRefresh() {
    this.refreshTimer = setInterval(async () => {
      if (this.needsRefresh()) {
        await this.refreshSession();
      }
    }, SESSION_CONFIG.REFRESH_THRESHOLD);
  }

  /**
   * Handle session expiry
   */
  async handleSessionExpiry() {
    console.log('Session expired, logging out user');
    
    try {
      await supabase.auth.signOut();
      this.clearSession();
      
      // Redirect to login with message
      const message = encodeURIComponent('Sesi Anda telah berakhir. Silakan masuk kembali.');
      window.location.href = `/?message=${message}`;
    } catch (error) {
      console.warn('Error during session expiry handling:', error);
      // Force redirect even if logout fails
      window.location.href = '/';
    }
  }

  /**
   * Clear session data
   */
  clearSession() {
    try {
      localStorage.removeItem(SESSION_KEYS.REMEMBER_ME);
      localStorage.removeItem(SESSION_KEYS.SESSION_EXPIRY);
      localStorage.removeItem(SESSION_KEYS.LAST_ACTIVITY);
    } catch (error) {
      console.warn('Failed to clear session data:', error);
    }
  }

  /**
   * Logout user and clear session
   */
  async logout() {
    try {
      // Clear timers
      if (this.activityTimer) {
        clearInterval(this.activityTimer);
        this.activityTimer = null;
      }
      
      if (this.refreshTimer) {
        clearInterval(this.refreshTimer);
        this.refreshTimer = null;
      }

      // Sign out from Supabase with timeout and error handling
      try {
        await Promise.race([
          supabase.auth.signOut(),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Logout timeout')), 5000)
          )
        ]);
        console.log('✅ [SESSION-MANAGER] Supabase logout successful');
      } catch (logoutError) {
        console.warn('⚠️ [SESSION-MANAGER] Supabase logout failed:', logoutError.message);
        
        // Check if it's a 403 Forbidden error (session already expired)
        if (logoutError.message?.includes('403') || 
            logoutError.message?.includes('Forbidden') ||
            logoutError.message?.includes('unauthorized')) {
          console.log('📝 [SESSION-MANAGER] Session already expired - proceeding with local cleanup');
        } else {
          console.warn('🔄 [SESSION-MANAGER] Other logout error - proceeding with local cleanup anyway');
        }
        
        // Continue with local cleanup regardless of Supabase logout result
      }
      
      // Clear session data
      this.clearSession();
      
      this.isInitialized = false;
      
      return { success: true };
    } catch (error) {
      console.warn('Logout error:', error);
      
      // Force clear session data even if logout fails
      this.clearSession();
      this.isInitialized = false;
      
      return { success: false, error };
    }
  }

  /**
   * Get session info
   * @returns {Object} - Session information
   */
  getSessionInfo() {
    try {
      const rememberMe = this.getRememberMe();
      const expiryTime = localStorage.getItem(SESSION_KEYS.SESSION_EXPIRY);
      const lastActivity = localStorage.getItem(SESSION_KEYS.LAST_ACTIVITY);
      
      return {
        rememberMe,
        expiryTime: expiryTime ? new Date(parseInt(expiryTime)) : null,
        lastActivity: lastActivity ? new Date(parseInt(lastActivity)) : null,
        isExpired: this.isSessionExpired(),
        needsRefresh: this.needsRefresh()
      };
    } catch (error) {
      console.warn('Failed to get session info:', error);
      return {
        rememberMe: false,
        expiryTime: null,
        lastActivity: null,
        isExpired: true,
        needsRefresh: false
      };
    }
  }

  /**
   * Cleanup - call when component unmounts
   */
  cleanup() {
    if (this.activityTimer) {
      clearInterval(this.activityTimer);
      this.activityTimer = null;
    }
    
    if (this.refreshTimer) {
      clearInterval(this.refreshTimer);
      this.refreshTimer = null;
    }
    
    this.isInitialized = false;
  }
}

// Create singleton instance
const sessionManager = new SessionManager();

export default sessionManager;