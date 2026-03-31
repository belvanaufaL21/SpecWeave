/**
 * Validation Utility Functions
 * Reusable validation functions for forms and data
 */

/**
 * Email validation
 */
export const isValidEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * Password strength validation
 */
export const isStrongPassword = (password) => {
  // At least 8 characters, one uppercase, one lowercase, one number
  const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
  return passwordRegex.test(password);
};

/**
 * UUID validation
 */
export const isValidUUID = (uuid) => {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
};

/**
 * URL validation
 */
export const isValidUrl = (url) => {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
};

/**
 * Phone number validation (basic)
 */
export const isValidPhone = (phone) => {
  const phoneRegex = /^\+?[\d\s\-\(\)]{10,}$/;
  return phoneRegex.test(phone);
};

/**
 * Required field validation
 */
export const isRequired = (value) => {
  if (value == null) return false;
  if (typeof value === 'string') return value.trim().length > 0;
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value === 'object') return Object.keys(value).length > 0;
  return true;
};

/**
 * Minimum length validation
 */
export const hasMinLength = (value, minLength) => {
  if (value == null) return false;
  if (typeof value === 'string') return value.length >= minLength;
  if (Array.isArray(value)) return value.length >= minLength;
  return false;
};

/**
 * Maximum length validation
 */
export const hasMaxLength = (value, maxLength) => {
  if (value == null) return true;
  if (typeof value === 'string') return value.length <= maxLength;
  if (Array.isArray(value)) return value.length <= maxLength;
  return false;
};

/**
 * Number range validation
 */
export const isInRange = (value, min, max) => {
  const num = Number(value);
  return !isNaN(num) && num >= min && num <= max;
};

/**
 * Integer validation
 */
export const isInteger = (value) => {
  return Number.isInteger(Number(value));
};

/**
 * Positive number validation
 */
export const isPositive = (value) => {
  const num = Number(value);
  return !isNaN(num) && num > 0;
};

/**
 * Date validation
 */
export const isValidDate = (date) => {
  if (date instanceof Date) {
    return !isNaN(date.getTime());
  }
  if (typeof date === 'string') {
    const parsed = new Date(date);
    return !isNaN(parsed.getTime());
  }
  return false;
};

/**
 * Future date validation
 */
export const isFutureDate = (date) => {
  if (!isValidDate(date)) return false;
  const dateObj = date instanceof Date ? date : new Date(date);
  return dateObj > new Date();
};

/**
 * Past date validation
 */
export const isPastDate = (date) => {
  if (!isValidDate(date)) return false;
  const dateObj = date instanceof Date ? date : new Date(date);
  return dateObj < new Date();
};

/**
 * JSON validation
 */
export const isValidJson = (str) => {
  try {
    JSON.parse(str);
    return true;
  } catch {
    return false;
  }
};

/**
 * File type validation
 */
export const isValidFileType = (file, allowedTypes) => {
  if (!file || !file.type) return false;
  return allowedTypes.includes(file.type);
};

/**
 * File size validation
 */
export const isValidFileSize = (file, maxSizeInBytes) => {
  if (!file || !file.size) return false;
  return file.size <= maxSizeInBytes;
};

/**
 * Credit card validation (Luhn algorithm)
 */
export const isValidCreditCard = (cardNumber) => {
  const num = cardNumber.replace(/\D/g, '');
  if (num.length < 13 || num.length > 19) return false;
  
  let sum = 0;
  let isEven = false;
  
  for (let i = num.length - 1; i >= 0; i--) {
    let digit = parseInt(num[i]);
    
    if (isEven) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }
    
    sum += digit;
    isEven = !isEven;
  }
  
  return sum % 10 === 0;
};

/**
 * Gherkin scenario validation
 */
export const isValidGherkinScenario = (scenario) => {
  if (!scenario || typeof scenario !== 'object') return false;
  
  const requiredFields = ['given', 'when', 'then'];
  return requiredFields.every(field => 
    scenario.hasOwnProperty(field) && 
    typeof scenario[field] === 'string' && 
    scenario[field].trim().length > 0
  );
};

/**
 * Template variables validation
 */
export const isValidTemplateVariables = (variables) => {
  if (!Array.isArray(variables)) return false;
  
  return variables.every(variable => {
    if (!variable || typeof variable !== 'object') return false;
    
    // Required fields
    if (!variable.name || typeof variable.name !== 'string') return false;
    if (!variable.type || typeof variable.type !== 'string') return false;
    
    // Valid types
    const validTypes = ['text', 'select', 'number', 'boolean'];
    if (!validTypes.includes(variable.type)) return false;
    
    // If type is select, options must be provided
    if (variable.type === 'select') {
      if (!Array.isArray(variable.options) || variable.options.length === 0) {
        return false;
      }
    }
    
    return true;
  });
};

/**
 * Create validation schema
 */
export const createValidationSchema = (rules) => {
  return {
    validate: (data) => {
      const errors = {};
      
      for (const [field, fieldRules] of Object.entries(rules)) {
        const value = data[field];
        const fieldErrors = [];
        
        for (const rule of fieldRules) {
          const { validator, message, ...params } = rule;
          
          if (!validator(value, ...Object.values(params))) {
            fieldErrors.push(message);
          }
        }
        
        if (fieldErrors.length > 0) {
          errors[field] = fieldErrors;
        }
      }
      
      return {
        isValid: Object.keys(errors).length === 0,
        errors
      };
    }
  };
};

/**
 * Common validation rules
 */
export const validationRules = {
  required: (message = 'This field is required') => ({
    validator: isRequired,
    message
  }),
  
  email: (message = 'Please enter a valid email address') => ({
    validator: isValidEmail,
    message
  }),
  
  minLength: (length, message = `Minimum length is ${length} characters`) => ({
    validator: hasMinLength,
    length,
    message
  }),
  
  maxLength: (length, message = `Maximum length is ${length} characters`) => ({
    validator: hasMaxLength,
    length,
    message
  }),
  
  strongPassword: (message = 'Password must be at least 8 characters with uppercase, lowercase, and number') => ({
    validator: isStrongPassword,
    message
  }),
  
  range: (min, max, message = `Value must be between ${min} and ${max}`) => ({
    validator: isInRange,
    min,
    max,
    message
  }),
  
  integer: (message = 'Please enter a valid integer') => ({
    validator: isInteger,
    message
  }),
  
  positive: (message = 'Value must be positive') => ({
    validator: isPositive,
    message
  }),
  
  url: (message = 'Please enter a valid URL') => ({
    validator: isValidUrl,
    message
  }),
  
  phone: (message = 'Please enter a valid phone number') => ({
    validator: isValidPhone,
    message
  }),
  
  date: (message = 'Please enter a valid date') => ({
    validator: isValidDate,
    message
  }),
  
  futureDate: (message = 'Date must be in the future') => ({
    validator: isFutureDate,
    message
  }),
  
  pastDate: (message = 'Date must be in the past') => ({
    validator: isPastDate,
    message
  })
};

/**
 * Sanitize input
 */
export const sanitizeInput = (input, type = 'text') => {
  if (input == null) return '';
  
  let sanitized = String(input);
  
  switch (type) {
    case 'html':
      // Basic HTML sanitization
      sanitized = sanitized
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
        .replace(/on\w+="[^"]*"/gi, '')
        .replace(/javascript:/gi, '');
      break;
      
    case 'sql':
      // Basic SQL injection prevention
      sanitized = sanitized.replace(/['";\\]/g, '');
      break;
      
    case 'number':
      sanitized = sanitized.replace(/[^\d.-]/g, '');
      break;
      
    case 'alphanumeric':
      sanitized = sanitized.replace(/[^a-zA-Z0-9]/g, '');
      break;
      
    case 'text':
    default:
      // Remove potentially dangerous characters
      sanitized = sanitized.replace(/[<>]/g, '');
      break;
  }
  
  return sanitized.trim();
};