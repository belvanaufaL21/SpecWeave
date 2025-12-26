/**
 * Global initialization manager to prevent duplicate initializations
 * Especially useful in React Strict Mode which causes double execution
 */
class InitializationManager {
  constructor() {
    this.authInitialized = false;
    this.jiraInitialized = false;
    this.authPromise = null;
    this.jiraPromise = null;
    this.profileCache = new Map();
    this.initializationLocks = new Set();
  }

  /**
   * Check if auth is already initialized
   */
  isAuthInitialized() {
    return this.authInitialized;
  }

  /**
   * Check if JIRA is already initialized
   */
  isJiraInitialized() {
    return this.jiraInitialized;
  }

  /**
   * Set auth as initialized
   */
  setAuthInitialized(promise = null) {
    this.authInitialized = true;
    if (promise) {
      this.authPromise = promise;
    }
  }

  /**
   * Set JIRA as initialized
   */
  setJiraInitialized(promise = null) {
    this.jiraInitialized = true;
    if (promise) {
      this.jiraPromise = promise;
    }
  }

  /**
   * Get auth initialization promise
   */
  getAuthPromise() {
    return this.authPromise;
  }

  /**
   * Get JIRA initialization promise
   */
  getJiraPromise() {
    return this.jiraPromise;
  }

  /**
   * Reset initialization state (for testing or manual reset)
   */
  reset() {
    this.authInitialized = false;
    this.jiraInitialized = false;
    this.authPromise = null;
    this.jiraPromise = null;
    this.profileCache.clear();
    this.initializationLocks.clear();
  }

  /**
   * Check if a specific initialization is locked
   */
  isLocked(key) {
    return this.initializationLocks.has(key);
  }

  /**
   * Lock a specific initialization
   */
  lock(key) {
    this.initializationLocks.add(key);
  }

  /**
   * Unlock a specific initialization
   */
  unlock(key) {
    this.initializationLocks.delete(key);
  }

  /**
   * Get or set profile cache
   */
  getProfileCache() {
    return this.profileCache;
  }

  /**
   * Cache a profile
   */
  cacheProfile(userId, profile) {
    this.profileCache.set(userId, {
      profile,
      timestamp: Date.now()
    });
  }

  /**
   * Get cached profile
   */
  getCachedProfile(userId, maxAge = 300000) { // 5 minutes default
    const cached = this.profileCache.get(userId);
    if (cached && Date.now() - cached.timestamp < maxAge) {
      return cached.profile;
    }
    return null;
  }
}

// Create singleton instance
const initializationManager = new InitializationManager();

export default initializationManager;