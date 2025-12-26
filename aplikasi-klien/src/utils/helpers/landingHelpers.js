/**
 * Landing Page Helper Functions
 * Utility functions for landing page functionality
 */

import { LANDING_CONSTANTS, FORM_CONSTANTS } from '../constants/landingConstants.js';

/**
 * Validate email format
 * @param {string} email - Email to validate
 * @returns {boolean} Is valid email
 */
export const validateEmail = (email) => {
  return LANDING_CONSTANTS.VALIDATION.EMAIL_PATTERN.test(email);
};

/**
 * Validate password strength
 * @param {string} password - Password to validate
 * @returns {Object} Validation result
 */
export const validatePassword = (password) => {
  const minLength = LANDING_CONSTANTS.VALIDATION.MIN_PASSWORD_LENGTH;
  
  return {
    isValid: password.length >= minLength,
    message: password.length < minLength 
      ? FORM_CONSTANTS.VALIDATION_MESSAGES.PASSWORD_TOO_SHORT 
      : null
  };
};

/**
 * Validate signup form data
 * @param {Object} formData - Form data to validate
 * @returns {Object} Validation result
 */
export const validateSignupForm = (formData) => {
  const { name, email, password, confirmPassword } = formData;
  const errors = [];

  // Name validation
  if (!name || !name.trim()) {
    errors.push(FORM_CONSTANTS.VALIDATION_MESSAGES.NAME_REQUIRED);
  }

  // Email validation
  if (!validateEmail(email)) {
    errors.push(FORM_CONSTANTS.VALIDATION_MESSAGES.INVALID_EMAIL);
  }

  // Password validation
  const passwordValidation = validatePassword(password);
  if (!passwordValidation.isValid) {
    errors.push(passwordValidation.message);
  }

  // Confirm password validation
  if (password !== confirmPassword) {
    errors.push(FORM_CONSTANTS.VALIDATION_MESSAGES.PASSWORDS_DONT_MATCH);
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

/**
 * Validate login form data
 * @param {Object} formData - Form data to validate
 * @returns {Object} Validation result
 */
export const validateLoginForm = (formData) => {
  const { email, password } = formData;
  const errors = [];

  // Email validation
  if (!validateEmail(email)) {
    errors.push(FORM_CONSTANTS.VALIDATION_MESSAGES.INVALID_EMAIL);
  }

  // Password validation (basic check for login)
  if (!password || password.length === 0) {
    errors.push('Password is required');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

/**
 * Get animation delay for staggered animations
 * @param {number} index - Element index
 * @param {number} baseDelay - Base delay in ms
 * @param {number} increment - Increment per index in ms
 * @returns {string} CSS delay value
 */
export const getAnimationDelay = (index, baseDelay = 200, increment = 100) => {
  return `${baseDelay + (index * increment)}ms`;
};

/**
 * Generate smooth scroll to element
 * @param {string} elementId - Target element ID
 * @param {number} offset - Scroll offset
 */
export const smoothScrollTo = (elementId, offset = 80) => {
  const element = document.getElementById(elementId.replace('#', ''));
  if (element) {
    const elementPosition = element.getBoundingClientRect().top;
    const offsetPosition = elementPosition + window.pageYOffset - offset;

    window.scrollTo({
      top: offsetPosition,
      behavior: 'smooth'
    });
  }
};

/**
 * Handle form submission with loading state
 * @param {Function} submitFunction - Function to execute
 * @param {Function} setLoading - Loading state setter
 * @param {Function} setError - Error state setter
 * @returns {Promise} Submission result
 */
export const handleFormSubmission = async (submitFunction, setLoading, setError) => {
  setLoading(true);
  setError('');

  try {
    const result = await Promise.race([
      submitFunction(),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Request timeout')), LANDING_CONSTANTS.TIMEOUTS.FORM_SUBMISSION)
      )
    ]);

    return result;
  } catch (error) {
    const errorMessage = error.message || FORM_CONSTANTS.VALIDATION_MESSAGES.GENERIC_ERROR;
    setError(errorMessage);
    throw error;
  } finally {
    setLoading(false);
  }
};

/**
 * Format counter animation value
 * @param {number} value - Current counter value
 * @param {number} target - Target value
 * @param {string} suffix - Value suffix
 * @returns {string} Formatted value
 */
export const formatCounterValue = (value, target, suffix = '') => {
  if (suffix === '%') {
    return `${Math.floor(value)}%`;
  }
  if (suffix === '+') {
    return `${Math.floor(value)}+`;
  }
  if (typeof target === 'string') {
    return target; // For non-numeric values like "<10s"
  }
  return `${Math.floor(value)}${suffix}`;
};

/**
 * Get icon path by name
 * @param {string} iconName - Icon name
 * @returns {string} SVG path
 */
export const getIconPath = (iconName) => {
  const icons = {
    edit: 'M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z',
    filter: 'M19.428 15.428a2 2 0 00-1.022-.547l-2.384-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z',
    check: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z',
    clock: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z',
    'check-circle': 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z',
    layout: 'M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z',
    download: 'M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z',
    arrow: 'M17 8l4 4m0 0l-4 4m4-4H3'
  };

  return icons[iconName] || icons.check;
};

/**
 * Create intersection observer for scroll animations
 * @param {Function} callback - Callback function
 * @param {Object} options - Observer options
 * @returns {IntersectionObserver} Observer instance
 */
export const createScrollObserver = (callback, options = {}) => {
  const defaultOptions = {
    threshold: LANDING_CONSTANTS.ANIMATION.SCROLL_THRESHOLD,
    rootMargin: LANDING_CONSTANTS.ANIMATION.SCROLL_ROOT_MARGIN
  };

  return new IntersectionObserver(callback, { ...defaultOptions, ...options });
};

/**
 * Generate gradient classes for benefits
 * @param {string} color - Color theme
 * @returns {Object} Gradient classes
 */
export const getBenefitGradients = (color) => {
  const gradients = {
    purple: {
      colorFrom: 'from-purple-500/20',
      colorTo: 'to-purple-900/5',
      border: 'group-hover:border-purple-500/30',
      shadow: 'group-hover:shadow-purple-500/10'
    },
    pink: {
      colorFrom: 'from-pink-500/20',
      colorTo: 'to-pink-900/5',
      border: 'group-hover:border-pink-500/30',
      shadow: 'group-hover:shadow-pink-500/10'
    }
  };

  return gradients[color] || gradients.purple;
};

/**
 * Handle navigation link clicks
 * @param {string} href - Target href
 * @param {Event} event - Click event
 */
export const handleNavClick = (href, event) => {
  if (href.startsWith('#')) {
    event.preventDefault();
    smoothScrollTo(href);
  }
};

/**
 * Generate form field props
 * @param {string} fieldName - Field name
 * @param {Object} formState - Current form state
 * @param {Function} onChange - Change handler
 * @param {boolean} disabled - Is disabled
 * @returns {Object} Field props
 */
export const getFormFieldProps = (fieldName, formState, onChange, disabled = false) => {
  const fieldConfig = FORM_CONSTANTS.FIELDS[fieldName.toUpperCase()];
  
  return {
    type: fieldName.includes('password') ? 'password' : fieldName === 'email' ? 'email' : 'text',
    value: formState[fieldName] || '',
    onChange: (e) => onChange(fieldName, e.target.value),
    placeholder: fieldConfig?.PLACEHOLDER || '',
    required: fieldConfig?.REQUIRED || false,
    disabled
  };
};