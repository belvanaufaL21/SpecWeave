/**
 * Confirmation Dialog Helpers
 */

import { DEFAULT_CONFIRMATION, CONFIRMATION_VARIANTS } from '../constants/confirmationConstants.js';

/**
 * Create confirmation options with defaults
 * @param {Object} options - Custom confirmation options
 * @returns {Object} Complete confirmation options
 */
export const createConfirmationOptions = (options = {}) => {
  return {
    ...DEFAULT_CONFIRMATION,
    ...options,
    variant: options.variant && Object.values(CONFIRMATION_VARIANTS).includes(options.variant)
      ? options.variant
      : DEFAULT_CONFIRMATION.variant
  };
};

/**
 * Validate confirmation options
 * @param {Object} options - Confirmation options to validate
 * @returns {Object} Validation result with isValid flag and errors array
 */
export const validateConfirmationOptions = (options = {}) => {
  const errors = [];

  if (options.title && typeof options.title !== 'string') {
    errors.push('title must be a string');
  }

  if (options.message && typeof options.message !== 'string') {
    errors.push('message must be a string');
  }

  if (options.confirmText && typeof options.confirmText !== 'string') {
    errors.push('confirmText must be a string');
  }

  if (options.cancelText && typeof options.cancelText !== 'string') {
    errors.push('cancelText must be a string');
  }

  if (options.variant && !Object.values(CONFIRMATION_VARIANTS).includes(options.variant)) {
    errors.push(`variant must be one of: ${Object.values(CONFIRMATION_VARIANTS).join(', ')}`);
  }

  if (options.showCancel !== undefined && typeof options.showCancel !== 'boolean') {
    errors.push('showCancel must be a boolean');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};
