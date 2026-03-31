/**
 * Indonesian Localization System
 * Main entry point for all Indonesian localization utilities
 */

// Import all localization modules
import * as IndonesianText from './indonesianText';
import * as IndonesianErrors from './indonesianErrors';
import IndonesianFormatting from './indonesianFormatting';

// Re-export everything for easy access
export {
  IndonesianText,
  IndonesianErrors,
  IndonesianFormatting
};

// Export specific commonly used items for convenience
export const {
  BUTTON_LABELS,
  PAGE_TITLES,
  FORM_LABELS,
  STATUS_MESSAGES,
  NAVIGATION,
  GREETINGS,
  DESCRIPTIONS,
  CONFIRMATIONS,
  PLACEHOLDERS,
  TOOLTIPS,
  TIME_LABELS,
  STATS_LABELS,
  EMPTY_STATES,
  CATEGORIES,
  FILE_LABELS,
  EPIC_LABELS,
  getTimeBasedGreeting,
  formatRelativeTime
} = IndonesianText;

export const {
  AUTH_ERRORS,
  NETWORK_ERRORS,
  VALIDATION_ERRORS,
  JIRA_ERRORS,
  CHAT_ERRORS,
  FILE_ERRORS,
  STORAGE_ERRORS,
  PERMISSION_ERRORS,
  GENERIC_ERRORS,
  SUCCESS_MESSAGES,
  WARNING_MESSAGES,
  formatError,
  getUserFriendlyError
} = IndonesianErrors;

export const {
  formatDate,
  formatTime,
  formatDateTime,
  formatLongDate,
  formatRelativeTime: formatRelativeTimeFormatting,
  formatNumber,
  formatCurrency,
  formatPercentage,
  formatFileSize,
  formatDuration,
  formatPhoneNumber,
  parseIndonesianDate,
  getCurrentDate,
  getCurrentTime,
  getCurrentDateTime,
  isValidIndonesianDate,
  formatAge
} = IndonesianFormatting;

// Utility function to get localized text with fallback
export const getText = (key, fallback = '') => {
  // Split key by dots to access nested properties
  const keys = key.split('.');
  let value = IndonesianText;
  
  for (const k of keys) {
    if (value && typeof value === 'object' && k in value) {
      value = value[k];
    } else {
      return fallback || key;
    }
  }
  
  return typeof value === 'string' ? value : fallback || key;
};

// Utility function to get localized error message
export const getErrorMessage = (error, fallback = null) => {
  const userFriendlyError = getUserFriendlyError(error);
  return userFriendlyError || fallback || GENERIC_ERRORS.SOMETHING_WRONG;
};

// Utility function to format validation error with field name
export const getValidationError = (fieldName, errorType, params = {}) => {
  const fieldLabel = getText(`FORM_LABELS.${fieldName.toUpperCase()}`, fieldName);
  
  switch (errorType) {
    case 'required':
      return `${fieldLabel} wajib diisi.`;
    case 'invalid':
      return `Format ${fieldLabel.toLowerCase()} tidak valid.`;
    case 'tooShort':
      return formatError(VALIDATION_ERRORS.TOO_SHORT, { min: params.min || 1 });
    case 'tooLong':
      return formatError(VALIDATION_ERRORS.TOO_LONG, { max: params.max || 255 });
    case 'email':
      return VALIDATION_ERRORS.INVALID_EMAIL;
    case 'password':
      return VALIDATION_ERRORS.PASSWORD_REQUIREMENTS;
    default:
      return `${fieldLabel} tidak valid.`;
  }
};

// Utility function to get status message with loading state
export const getStatusMessage = (status, action = '') => {
  const actionKey = action.toUpperCase();
  
  switch (status) {
    case 'loading':
      return STATUS_MESSAGES[`${actionKey}_LOADING`] || STATUS_MESSAGES.LOADING;
    case 'success':
      return STATUS_MESSAGES[`${actionKey}_SUCCESS`] || STATUS_MESSAGES.SUCCESS;
    case 'error':
      return GENERIC_ERRORS.SOMETHING_WRONG;
    default:
      return '';
  }
};

// Utility function to get confirmation message
export const getConfirmationMessage = (action, itemName = '') => {
  const actionKey = action.toUpperCase();
  const confirmationKey = `${actionKey}_${itemName.toUpperCase()}`;
  
  return CONFIRMATIONS[confirmationKey] || 
         CONFIRMATIONS[actionKey] || 
         'Apakah Anda yakin ingin melanjutkan?';
};

// Utility function to pluralize Indonesian words (basic implementation)
export const pluralize = (count, singular, plural = null) => {
  // Indonesian doesn't have complex pluralization rules like English
  // Usually just add context or use the same word
  if (count === 1) {
    return `${count} ${singular}`;
  } else {
    return `${count} ${plural || singular}`;
  }
};

// Utility function to get time-based greeting with user name
export const getPersonalizedGreeting = (userName = '') => {
  const greeting = getTimeBasedGreeting();
  return userName ? `${greeting}, ${userName}` : greeting;
};

// Utility function to format list in Indonesian
export const formatList = (items, conjunction = 'dan') => {
  if (!items || items.length === 0) return '';
  if (items.length === 1) return items[0];
  if (items.length === 2) return `${items[0]} ${conjunction} ${items[1]}`;
  
  const lastItem = items[items.length - 1];
  const otherItems = items.slice(0, -1);
  return `${otherItems.join(', ')}, ${conjunction} ${lastItem}`;
};

// Utility function to truncate text with Indonesian ellipsis
export const truncateText = (text, maxLength = 100, suffix = '...') => {
  if (!text || text.length <= maxLength) return text;
  return text.substring(0, maxLength - suffix.length) + suffix;
};

// Utility function to capitalize first letter (Indonesian-aware)
export const capitalizeFirst = (text) => {
  if (!text) return '';
  return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();
};

// Utility function to format Indonesian title case
export const toTitleCase = (text) => {
  if (!text) return '';
  
  // Words that should not be capitalized in Indonesian titles
  const lowercaseWords = ['dan', 'atau', 'di', 'ke', 'dari', 'untuk', 'dengan', 'pada', 'dalam'];
  
  return text
    .toLowerCase()
    .split(' ')
    .map((word, index) => {
      // Always capitalize first word
      if (index === 0) return capitalizeFirst(word);
      
      // Don't capitalize common lowercase words unless they're the first word
      if (lowercaseWords.includes(word)) return word;
      
      return capitalizeFirst(word);
    })
    .join(' ');
};

// Default export with all utilities
export default {
  // Text constants
  BUTTON_LABELS,
  PAGE_TITLES,
  FORM_LABELS,
  STATUS_MESSAGES,
  NAVIGATION,
  GREETINGS,
  DESCRIPTIONS,
  CONFIRMATIONS,
  PLACEHOLDERS,
  TOOLTIPS,
  TIME_LABELS,
  STATS_LABELS,
  EMPTY_STATES,
  CATEGORIES,
  FILE_LABELS,
  EPIC_LABELS,
  
  // Error constants
  AUTH_ERRORS,
  NETWORK_ERRORS,
  VALIDATION_ERRORS,
  JIRA_ERRORS,
  CHAT_ERRORS,
  FILE_ERRORS,
  STORAGE_ERRORS,
  PERMISSION_ERRORS,
  GENERIC_ERRORS,
  SUCCESS_MESSAGES,
  WARNING_MESSAGES,
  
  // Formatting functions
  formatDate,
  formatTime,
  formatDateTime,
  formatLongDate,
  formatRelativeTime: formatRelativeTimeFormatting,
  formatNumber,
  formatCurrency,
  formatPercentage,
  formatFileSize,
  formatDuration,
  formatPhoneNumber,
  parseIndonesianDate,
  getCurrentDate,
  getCurrentTime,
  getCurrentDateTime,
  isValidIndonesianDate,
  formatAge,
  
  // Utility functions
  getText,
  getErrorMessage,
  getValidationError,
  getStatusMessage,
  getConfirmationMessage,
  getTimeBasedGreeting,
  getPersonalizedGreeting,
  pluralize,
  formatList,
  truncateText,
  capitalizeFirst,
  toTitleCase,
  formatError,
  getUserFriendlyError
};