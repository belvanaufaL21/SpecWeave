/**
 * Auto Save Settings Utility
 * Initializes and manages auto-save settings for the application
 */

import { 
  isAutoReferenceEnabled, 
  setAutoReferenceEnabled 
} from '../services/EnhancedSpecWeaveService.js';

/**
 * Initialize auto-save settings on application startup
 * This function sets up default auto-save behaviors and loads user preferences
 */
export const initializeAutoSaveSettings = () => {
  try {
    // Load auto-reference setting from localStorage or set default
    const savedAutoReferenceEnabled = localStorage.getItem('autoReferenceEnabled');
    
    if (savedAutoReferenceEnabled !== null) {
      const isEnabled = JSON.parse(savedAutoReferenceEnabled);
      setAutoReferenceEnabled(isEnabled);
    } else {
      // Default to enabled for new users
      setAutoReferenceEnabled(true);
      localStorage.setItem('autoReferenceEnabled', JSON.stringify(true));
    }
    
    // Initialize other auto-save settings here as needed
    initializeOtherAutoSaveSettings();
    
  } catch (error) {
    console.error('Error initializing auto-save settings:', error);
    
    // Fallback to safe defaults
    setAutoReferenceEnabled(true);
  }
};

/**
 * Initialize other auto-save settings
 * Placeholder for additional auto-save functionality
 */
const initializeOtherAutoSaveSettings = () => {
  // Auto-save chat history setting
  const autoSaveChatHistory = localStorage.getItem('autoSaveChatHistory');
  if (autoSaveChatHistory === null) {
    localStorage.setItem('autoSaveChatHistory', JSON.stringify(true));
  }
  
  // Auto-save user preferences
  const autoSaveUserPreferences = localStorage.getItem('autoSaveUserPreferences');
  if (autoSaveUserPreferences === null) {
    localStorage.setItem('autoSaveUserPreferences', JSON.stringify(true));
  }
};

/**
 * Save auto-reference setting to localStorage
 * @param {boolean} enabled - Whether auto-reference is enabled
 */
export const saveAutoReferenceEnabled = (enabled) => {
  try {
    localStorage.setItem('autoReferenceEnabled', JSON.stringify(enabled));
    setAutoReferenceEnabled(enabled);
    
  } catch (error) {
    console.error('❌ [AUTO-SAVE-SETTINGS] Error saving auto-reference setting:', error);
  }
};

/**
 * Get current auto-reference setting
 * @returns {boolean} Current auto-reference enabled state
 */
export const getAutoReferenceEnabled = () => {
  return isAutoReferenceEnabled();
};

/**
 * Reset all auto-save settings to defaults
 */
export const resetAutoSaveSettings = () => {
  try {
    
    // Reset auto-reference
    setAutoReferenceEnabled(true);
    localStorage.setItem('autoReferenceEnabled', JSON.stringify(true));
    
    // Reset other settings
    localStorage.setItem('autoSaveChatHistory', JSON.stringify(true));
    localStorage.setItem('autoSaveUserPreferences', JSON.stringify(true));

  } catch (error) {
    console.error('❌ [AUTO-SAVE-SETTINGS] Error resetting auto-save settings:', error);
  }
};