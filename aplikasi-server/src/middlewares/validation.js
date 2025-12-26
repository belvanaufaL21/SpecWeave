import { validationResult } from 'express-validator';
import { AppError } from './errorHandler.js';

/**
 * Validation middleware to handle express-validator results
 */
export const validateRequest = (req, res, next) => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    const errorMessages = errors.array().map(error => ({
      field: error.path || error.param,
      message: error.msg,
      value: error.value
    }));

    throw new AppError('Validation failed', 400, errorMessages);
  }
  
  next();
};

/**
 * Custom validation functions
 */

/**
 * Validate UUID format
 */
export const isValidUUID = (value) => {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(value);
};

/**
 * Validate email format
 */
export const isValidEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * Validate password strength
 */
export const isStrongPassword = (password) => {
  // At least 8 characters, one uppercase, one lowercase, one number
  const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
  return passwordRegex.test(password);
};

/**
 * Validate JSON structure
 */
export const isValidJSON = (str) => {
  try {
    JSON.parse(str);
    return true;
  } catch (e) {
    return false;
  }
};

/**
 * Validate Gherkin scenario structure
 */
export const isValidGherkinScenario = (scenario) => {
  if (!scenario || typeof scenario !== 'object') {
    return false;
  }

  const requiredFields = ['given', 'when', 'then'];
  return requiredFields.every(field => 
    scenario.hasOwnProperty(field) && 
    typeof scenario[field] === 'string' && 
    scenario[field].trim().length > 0
  );
};

/**
 * Validate template variables structure
 */
export const isValidTemplateVariables = (variables) => {
  if (!Array.isArray(variables)) {
    return false;
  }

  return variables.every(variable => {
    if (!variable || typeof variable !== 'object') {
      return false;
    }

    // Required fields
    if (!variable.name || typeof variable.name !== 'string') {
      return false;
    }

    if (!variable.type || typeof variable.type !== 'string') {
      return false;
    }

    // Valid types
    const validTypes = ['text', 'select', 'number', 'boolean'];
    if (!validTypes.includes(variable.type)) {
      return false;
    }

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
 * Sanitize HTML content
 */
export const sanitizeHtml = (html) => {
  if (!html || typeof html !== 'string') {
    return '';
  }

  // Basic HTML sanitization - remove script tags and dangerous attributes
  return html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/on\w+="[^"]*"/gi, '')
    .replace(/javascript:/gi, '')
    .trim();
};

/**
 * Validate file upload
 */
export const validateFileUpload = (file, options = {}) => {
  const {
    maxSize = 5 * 1024 * 1024, // 5MB default
    allowedTypes = ['image/jpeg', 'image/png', 'image/gif'],
    allowedExtensions = ['.jpg', '.jpeg', '.png', '.gif']
  } = options;

  if (!file) {
    return { valid: false, error: 'No file provided' };
  }

  // Check file size
  if (file.size > maxSize) {
    return { 
      valid: false, 
      error: `File size exceeds maximum allowed size of ${maxSize / (1024 * 1024)}MB` 
    };
  }

  // Check MIME type
  if (!allowedTypes.includes(file.mimetype)) {
    return { 
      valid: false, 
      error: `File type ${file.mimetype} is not allowed. Allowed types: ${allowedTypes.join(', ')}` 
    };
  }

  // Check file extension
  const fileExtension = file.originalname.toLowerCase().substring(file.originalname.lastIndexOf('.'));
  if (!allowedExtensions.includes(fileExtension)) {
    return { 
      valid: false, 
      error: `File extension ${fileExtension} is not allowed. Allowed extensions: ${allowedExtensions.join(', ')}` 
    };
  }

  return { valid: true };
};

/**
 * Validate pagination parameters
 */
export const validatePagination = (req, res, next) => {
  const { limit = 50, offset = 0 } = req.query;

  const parsedLimit = parseInt(limit);
  const parsedOffset = parseInt(offset);

  if (isNaN(parsedLimit) || parsedLimit < 1 || parsedLimit > 100) {
    throw new AppError('Limit must be a number between 1 and 100', 400);
  }

  if (isNaN(parsedOffset) || parsedOffset < 0) {
    throw new AppError('Offset must be a non-negative number', 400);
  }

  req.pagination = {
    limit: parsedLimit,
    offset: parsedOffset
  };

  next();
};

/**
 * Validate search parameters
 */
export const validateSearch = (req, res, next) => {
  const { search, tags, category } = req.query;

  if (search && typeof search !== 'string') {
    throw new AppError('Search query must be a string', 400);
  }

  if (search && search.length > 100) {
    throw new AppError('Search query must be less than 100 characters', 400);
  }

  if (tags) {
    let parsedTags;
    try {
      parsedTags = Array.isArray(tags) ? tags : tags.split(',');
      parsedTags = parsedTags.map(tag => tag.trim()).filter(tag => tag.length > 0);
    } catch (error) {
      throw new AppError('Invalid tags format', 400);
    }
    req.query.tags = parsedTags;
  }

  if (category && typeof category !== 'string') {
    throw new AppError('Category must be a string', 400);
  }

  next();
};

/**
 * Validate time range parameter
 */
export const validateTimeRange = (req, res, next) => {
  const { timeRange } = req.query;

  if (timeRange) {
    const timeRangeRegex = /^\d+\s+(hours?|days?|weeks?|months?)$/;
    if (!timeRangeRegex.test(timeRange)) {
      throw new AppError('Time range must be in format "N days/hours/weeks/months"', 400);
    }

    // Parse and validate the number
    const match = timeRange.match(/^(\d+)\s+(\w+)$/);
    const number = parseInt(match[1]);
    const unit = match[2];

    if (number < 1) {
      throw new AppError('Time range number must be at least 1', 400);
    }

    // Set reasonable limits
    const limits = {
      'hour': 168, // 1 week
      'hours': 168,
      'day': 365, // 1 year
      'days': 365,
      'week': 52, // 1 year
      'weeks': 52,
      'month': 12, // 1 year
      'months': 12
    };

    if (number > limits[unit]) {
      throw new AppError(`Time range too large. Maximum ${limits[unit]} ${unit}`, 400);
    }
  }

  next();
};

/**
 * Template validation middleware
 */
export const validateTemplate = (req, res, next) => {
  const { name, category, template_content, variables, tags } = req.body;

  // Required fields
  if (!name || typeof name !== 'string' || name.trim().length === 0) {
    throw new AppError('Template name is required and must be a non-empty string', 400);
  }

  if (name.length > 255) {
    throw new AppError('Template name must be less than 255 characters', 400);
  }

  if (!category || typeof category !== 'string' || category.trim().length === 0) {
    throw new AppError('Template category is required and must be a non-empty string', 400);
  }

  if (category.length > 100) {
    throw new AppError('Template category must be less than 100 characters', 400);
  }

  if (!template_content || typeof template_content !== 'string' || template_content.trim().length === 0) {
    throw new AppError('Template content is required and must be a non-empty string', 400);
  }

  if (template_content.length > 10000) {
    throw new AppError('Template content must be less than 10,000 characters', 400);
  }

  // Optional fields validation
  if (variables !== undefined && !isValidTemplateVariables(variables)) {
    throw new AppError('Template variables must be a valid array of variable objects', 400);
  }

  if (tags !== undefined) {
    if (!Array.isArray(tags)) {
      throw new AppError('Tags must be an array', 400);
    }

    if (tags.some(tag => typeof tag !== 'string' || tag.trim().length === 0)) {
      throw new AppError('All tags must be non-empty strings', 400);
    }

    if (tags.length > 10) {
      throw new AppError('Maximum 10 tags allowed', 400);
    }
  }

  next();
};

/**
 * Template update validation middleware
 */
export const validateTemplateUpdate = (req, res, next) => {
  const { name, category, template_content, variables, tags } = req.body;

  // All fields are optional for updates, but if provided must be valid
  if (name !== undefined) {
    if (typeof name !== 'string' || name.trim().length === 0) {
      throw new AppError('Template name must be a non-empty string', 400);
    }
    if (name.length > 255) {
      throw new AppError('Template name must be less than 255 characters', 400);
    }
  }

  if (category !== undefined) {
    if (typeof category !== 'string' || category.trim().length === 0) {
      throw new AppError('Template category must be a non-empty string', 400);
    }
    if (category.length > 100) {
      throw new AppError('Template category must be less than 100 characters', 400);
    }
  }

  if (template_content !== undefined) {
    if (typeof template_content !== 'string' || template_content.trim().length === 0) {
      throw new AppError('Template content must be a non-empty string', 400);
    }
    if (template_content.length > 10000) {
      throw new AppError('Template content must be less than 10,000 characters', 400);
    }
  }

  if (variables !== undefined && !isValidTemplateVariables(variables)) {
    throw new AppError('Template variables must be a valid array of variable objects', 400);
  }

  if (tags !== undefined) {
    if (!Array.isArray(tags)) {
      throw new AppError('Tags must be an array', 400);
    }

    if (tags.some(tag => typeof tag !== 'string' || tag.trim().length === 0)) {
      throw new AppError('All tags must be non-empty strings', 400);
    }

    if (tags.length > 10) {
      throw new AppError('Maximum 10 tags allowed', 400);
    }
  }

  next();
};