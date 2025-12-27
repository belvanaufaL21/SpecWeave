/**
 * User validation utilities for Sign Up vs Sign In
 */

// Simulate user database (in real app, this would be in Supabase)
let registeredUsers = new Set();

/**
 * Register a new user email
 * @param {string} email - User email
 */
export const registerUser = (email) => {
  registeredUsers.add(email.toLowerCase());
  // Also store in localStorage for persistence during development
  const stored = JSON.parse(localStorage.getItem('specweave_registered_users') || '[]');
  if (!stored.includes(email.toLowerCase())) {
    stored.push(email.toLowerCase());
    localStorage.setItem('specweave_registered_users', JSON.stringify(stored));
  }
};

/**
 * Check if user is already registered
 * @param {string} email - User email
 * @returns {boolean} - True if user is registered
 */
export const isUserRegistered = (email) => {
  // Check in-memory set
  if (registeredUsers.has(email.toLowerCase())) {
    return true;
  }
  
  // Check localStorage
  const stored = JSON.parse(localStorage.getItem('specweave_registered_users') || '[]');
  const isStored = stored.includes(email.toLowerCase());
  
  if (isStored) {
    registeredUsers.add(email.toLowerCase());
  }
  
  return isStored;
};

/**
 * Get all registered users (for development/testing)
 * @returns {Array} - Array of registered emails
 */
export const getRegisteredUsers = () => {
  const stored = JSON.parse(localStorage.getItem('specweave_registered_users') || '[]');
  return stored;
};

/**
 * Clear all registered users (for development/testing)
 */
export const clearRegisteredUsers = () => {
  registeredUsers.clear();
  localStorage.removeItem('specweave_registered_users');
};

/**
 * Initialize registered users from localStorage
 */
export const initializeRegisteredUsers = () => {
  const stored = JSON.parse(localStorage.getItem('specweave_registered_users') || '[]');
  stored.forEach(email => registeredUsers.add(email));
};

// Initialize on module load
initializeRegisteredUsers();