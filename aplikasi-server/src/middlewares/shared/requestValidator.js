/**
 * Request Validator Middleware
 * Reusable validation middleware with common validation rules
 */

import { body, param, query, validationResult } from 'express-validator';
import { AppError } from '../errorHandler.js';

/**
 * Handle validation results
 */
export const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    const formattedErrors = errors.array().map(error => ({
      field: error.path || error.param,
      message: error.msg,
      value: error.value,
      location: error.location
    }));

    return res.validationError(formattedErrors, 'Validation failed');
  }
  
  next();
};

/**
 * Common validation rules
 */
export const validationRules = {
  // ID validations
  uuid: (field = 'id') => 
    param(field).isUUID().withMessage(`${field} must be a valid UUID`),
  
  objectId: (field = 'id') => 
    param(field).isMongoId().withMessage(`${field} must be a valid ObjectId`),
  
  // String validations
  required: (field, message = null) => 
    body(field).notEmpty().withMessage(message || `${field} is required`),
  
  string: (field, options = {}) => {
    const { min = 1, max = 255, message = null } = options;
    return body(field)
      .isString()
      .withMessage(message || `${field} must be a string`)
      .isLength({ min, max })
      .withMessage(`${field} must be between ${min} and ${max} characters`);
  },
  
  email: (field = 'email') => 
    body(field).isEmail().normalizeEmail().withMessage('Please provide a valid email address'),
  
  password: (field = 'password') => 
    body(field)
      .isLength({ min: 8 })
      .withMessage('Password must be at least 8 characters long')
      .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
      .withMessage('Password must contain at least one uppercase letter, one lowercase letter, and one number'),
  
  url: (field) => 
    body(field).isURL().withMessage(`${field} must be a valid URL`),
  
  // Number validations
  integer: (field, options = {}) => {
    const { min = null, max = null } = options;
    let validator = body(field).isInt();
    
    if (min !== null && max !== null) {
      validator = validator.isInt({ min, max }).withMessage(`${field} must be between ${min} and ${max}`);
    } else if (min !== null) {
      validator = validator.isInt({ min }).withMessage(`${field} must be at least ${min}`);
    } else if (max !== null) {
      validator = validator.isInt({ max }).withMessage(`${field} must be at most ${max}`);
    }
    
    return validator;
  },
  
  float: (field, options = {}) => {
    const { min = null, max = null } = options;
    let validator = body(field).isFloat();
    
    if (min !== null && max !== null) {
      validator = validator.isFloat({ min, max }).withMessage(`${field} must be between ${min} and ${max}`);
    } else if (min !== null) {
      validator = validator.isFloat({ min }).withMessage(`${field} must be at least ${min}`);
    } else if (max !== null) {
      validator = validator.isFloat({ max }).withMessage(`${field} must be at most ${max}`);
    }
    
    return validator;
  },
  
  // Date validations
  date: (field) => 
    body(field).isISO8601().toDate().withMessage(`${field} must be a valid date`),
  
  futureDate: (field) => 
    body(field).custom(value => {
      if (new Date(value) <= new Date()) {
        throw new Error(`${field} must be a future date`);
      }
      return true;
    }),
  
  pastDate: (field) => 
    body(field).custom(value => {
      if (new Date(value) >= new Date()) {
        throw new Error(`${field} must be a past date`);
      }
      return true;
    }),
  
  // Array validations
  array: (field, options = {}) => {
    const { min = 0, max = 100, itemType = null } = options;
    let validator = body(field).isArray({ min, max });
    
    if (itemType === 'string') {
      validator = validator.custom(arr => {
        if (!arr.every(item => typeof item === 'string')) {
          throw new Error(`All items in ${field} must be strings`);
        }
        return true;
      });
    } else if (itemType === 'number') {
      validator = validator.custom(arr => {
        if (!arr.every(item => typeof item === 'number')) {
          throw new Error(`All items in ${field} must be numbers`);
        }
        return true;
      });
    }
    
    return validator;
  },
  
  // Boolean validation
  boolean: (field) => 
    body(field).isBoolean().withMessage(`${field} must be a boolean`),
  
  // JSON validation
  json: (field) => 
    body(field).custom(value => {
      try {
        JSON.parse(value);
        return true;
      } catch (error) {
        throw new Error(`${field} must be valid JSON`);
      }
    }),
  
  // Enum validation
  enum: (field, values) => 
    body(field).isIn(values).withMessage(`${field} must be one of: ${values.join(', ')}`),
  
  // File validation
  file: (field, options = {}) => {
    const { 
      required = true, 
      maxSize = 5 * 1024 * 1024, // 5MB
      allowedTypes = ['image/jpeg', 'image/png', 'image/gif']
    } = options;
    
    return body(field).custom((value, { req }) => {
      const file = req.files && req.files[field];
      
      if (required && !file) {
        throw new Error(`${field} is required`);
      }
      
      if (file) {
        if (file.size > maxSize) {
          throw new Error(`${field} size must be less than ${maxSize / (1024 * 1024)}MB`);
        }
        
        if (!allowedTypes.includes(file.mimetype)) {
          throw new Error(`${field} must be one of: ${allowedTypes.join(', ')}`);
        }
      }
      
      return true;
    });
  }
};

/**
 * Query parameter validations
 */
export const queryValidations = {
  pagination: [
    query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
    query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
    query('offset').optional().isInt({ min: 0 }).withMessage('Offset must be a non-negative integer')
  ],
  
  search: [
    query('search').optional().isString().isLength({ max: 100 }).withMessage('Search query must be less than 100 characters'),
    query('sort').optional().isString().matches(/^[a-zA-Z_]+:(asc|desc)$/).withMessage('Sort must be in format "field:asc" or "field:desc"')
  ],
  
  dateRange: [
    query('startDate').optional().isISO8601().toDate().withMessage('Start date must be a valid date'),
    query('endDate').optional().isISO8601().toDate().withMessage('End date must be a valid date'),
    query('startDate').optional().custom((value, { req }) => {
      if (value && req.query.endDate && new Date(value) > new Date(req.query.endDate)) {
        throw new Error('Start date must be before end date');
      }
      return true;
    })
  ]
};

/**
 * Application-specific validations
 */
export const appValidations = {
  gherkinScenario: [
    validationRules.required('given'),
    validationRules.required('when'),
    validationRules.required('then'),
    validationRules.string('given', { min: 5, max: 500 }),
    validationRules.string('when', { min: 5, max: 500 }),
    validationRules.string('then', { min: 5, max: 500 })
  ],
  
  testResult: [
    validationRules.required('scenario_id'),
    validationRules.uuid('scenario_id'),
    validationRules.float('meteor_score', { min: 0, max: 1 }),
    validationRules.float('sentence_bert_score', { min: -1, max: 1 }),
    body('test_data').optional().isObject().withMessage('Test data must be an object')
  ],
  
  template: [
    validationRules.required('name'),
    validationRules.required('category'),
    validationRules.required('template_content'),
    validationRules.string('name', { min: 3, max: 255 }),
    validationRules.string('category', { min: 3, max: 100 }),
    validationRules.string('template_content', { min: 10, max: 10000 }),
    body('variables').optional().isArray().withMessage('Variables must be an array'),
    body('tags').optional().isArray().withMessage('Tags must be an array')
  ],
  
  userProfile: [
    validationRules.string('name', { min: 2, max: 100 }),
    validationRules.email('email'),
    body('preferences').optional().isObject().withMessage('Preferences must be an object')
  ],
  
  jiraConfig: [
    validationRules.required('jira_url'),
    validationRules.required('project_key'),
    validationRules.url('jira_url'),
    validationRules.string('project_key', { min: 2, max: 20 }),
    validationRules.string('username', { min: 3, max: 100 }),
    body('auth_type').isIn(['basic', 'oauth', 'token']).withMessage('Auth type must be basic, oauth, or token')
  ]
};

/**
 * Create validation middleware chain
 */
export const createValidation = (...validations) => {
  return [...validations.flat(), handleValidationErrors];
};

/**
 * Sanitization middleware
 */
export const sanitizeInput = (req, res, next) => {
  // Sanitize string inputs
  const sanitizeString = (str) => {
    if (typeof str !== 'string') return str;
    return str.trim().replace(/[<>]/g, '');
  };
  
  // Recursively sanitize object
  const sanitizeObject = (obj) => {
    if (obj === null || typeof obj !== 'object') return obj;
    
    if (Array.isArray(obj)) {
      return obj.map(sanitizeObject);
    }
    
    const sanitized = {};
    for (const [key, value] of Object.entries(obj)) {
      if (typeof value === 'string') {
        sanitized[key] = sanitizeString(value);
      } else if (typeof value === 'object') {
        sanitized[key] = sanitizeObject(value);
      } else {
        sanitized[key] = value;
      }
    }
    return sanitized;
  };
  
  // Sanitize request body
  if (req.body) {
    req.body = sanitizeObject(req.body);
  }
  
  // Sanitize query parameters
  if (req.query) {
    req.query = sanitizeObject(req.query);
  }
  
  next();
};

export default {
  validationRules,
  queryValidations,
  appValidations,
  createValidation,
  handleValidationErrors,
  sanitizeInput
};