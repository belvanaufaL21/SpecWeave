import { AUTH_TIMEOUTS, NEW_USER_THRESHOLD } from '../constants/authConstants';

/**
 * Create timeout promise untuk prevent hanging operations
 * @param {number} timeout - Timeout dalam milliseconds
 * @param {string} errorMessage - Error message untuk timeout
 * @returns {Promise} - Promise yang reject setelah timeout
 */
export const createTimeoutPromise = (timeout, errorMessage) => {
  return new Promise((_, reject) => 
    setTimeout(() => reject(new Error(errorMessage)), timeout)
  );
};

/**
 * Create default profile object
 * @param {string} userId - User ID
 * @param {Object} userMetadata - Optional user metadata from OAuth providers
 * @returns {Object} - Default profile object
 */
export const createDefaultProfile = (userId, userMetadata = {}) => {
  // Extract name from various sources
  let name = null;
  
  if (userMetadata.name) {
    name = userMetadata.name;
  } else if (userMetadata.full_name) {
    name = userMetadata.full_name;
  } else if (userMetadata.first_name && userMetadata.last_name) {
    name = `${userMetadata.first_name} ${userMetadata.last_name}`;
  } else if (userMetadata.email) {
    name = extractNameFromEmail(userMetadata.email);
  }

  return {
    id: userId,
    name: name,
    avatar_url: userMetadata.avatar_url || userMetadata.picture || null,
    role: 'user',
    preferences: {},
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };
};

/**
 * Check if user is new (created within threshold)
 * @param {string} createdAt - User creation timestamp
 * @returns {boolean} - True if user is new
 */
export const isNewUser = (createdAt) => {
  if (!createdAt) return false;
  const accountAge = new Date() - new Date(createdAt);
  return accountAge < NEW_USER_THRESHOLD;
};

/**
 * Extract name from email
 * @param {string} email - Email address
 * @returns {string} - Name extracted from email
 */
export const extractNameFromEmail = (email) => {
  return email.split('@')[0];
};

/**
 * Clear authentication storage
 */
export const clearAuthStorage = () => {
  try {
    localStorage.removeItem('supabase.auth.token');
  } catch (error) {
    console.warn('Failed to clear auth storage:', error);
  }
};

/**
 * Safe async operation dengan timeout
 * @param {Promise} operation - Operation to execute
 * @param {number} timeout - Timeout in milliseconds
 * @param {string} timeoutMessage - Error message for timeout
 * @returns {Promise} - Promise with timeout
 */
export const withTimeout = async (operation, timeout, timeoutMessage) => {
  const timeoutPromise = createTimeoutPromise(timeout, timeoutMessage);
  return Promise.race([operation, timeoutPromise]);
};