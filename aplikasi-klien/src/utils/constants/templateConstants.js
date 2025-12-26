/**
 * Konstanta untuk Template Service
 */

export const TEMPLATE_CONSTANTS = {
  // Default base URL
  DEFAULT_BASE_URL: 'http://localhost:5000/api',

  // Sort options
  SORT_OPTIONS: {
    USAGE_COUNT: 'usage_count',
    CREATED_AT: 'created_at',
    UPDATED_AT: 'updated_at',
    NAME: 'name',
    CATEGORY: 'category'
  },

  // Sort order
  SORT_ORDER: {
    ASC: 'asc',
    DESC: 'desc'
  },

  // Default limits
  DEFAULT_LIMITS: {
    SEARCH: 50,
    CATEGORIES: 20,
    RECENT: 10
  },

  // Variable types
  VARIABLE_TYPES: {
    TEXT: 'text',
    SELECT: 'select',
    NUMBER: 'number',
    BOOLEAN: 'boolean'
  },

  // Content validation
  VALIDATION: {
    MAX_CONTENT_LENGTH: 10000,
    MIN_CONTENT_LENGTH: 1,
    VARIABLE_NAME_PATTERN: /^[a-zA-Z_][a-zA-Z0-9_]*$/,
    VARIABLE_PLACEHOLDER_PATTERN: /\{([^}]+)\}/g
  },

  // Error messages
  ERROR_MESSAGES: {
    CONTENT_REQUIRED: 'Template content is required',
    CONTENT_EMPTY: 'Template content cannot be empty',
    CONTENT_TOO_LONG: 'Template content must be less than 10,000 characters',
    EMPTY_VARIABLE_PLACEHOLDER: 'Empty variable placeholder found: {}',
    INVALID_VARIABLE_NAME: 'Invalid variable name. Use only letters, numbers, and underscores.',
    VARIABLES_MUST_BE_ARRAY: 'Variables must be an array',
    VARIABLE_MUST_BE_OBJECT: 'Variable must be an object',
    VARIABLE_NAME_REQUIRED: 'Variable must have a valid name',
    DUPLICATE_VARIABLE_NAME: 'Duplicate variable name',
    VARIABLE_TYPE_REQUIRED: 'Variable must have a valid type',
    INVALID_VARIABLE_TYPE: 'Invalid variable type',
    SELECT_OPTIONS_REQUIRED: 'Variable of type "select" must have options array',
    VARIABLE_LABEL_INVALID: 'Variable label must be a string',
    VARIABLE_DESCRIPTION_INVALID: 'Variable description must be a string',
    VARIABLE_REQUIRED_INVALID: 'Variable required field must be a boolean'
  },

  // Success messages
  SUCCESS_MESSAGES: {
    TEMPLATE_CREATED: 'Template created successfully',
    TEMPLATE_UPDATED: 'Template updated successfully',
    TEMPLATE_DELETED: 'Template deleted successfully',
    TEMPLATE_APPLIED: 'Template applied successfully'
  },

  // Default headers
  DEFAULT_HEADERS: {
    'Content-Type': 'application/json'
  },

  // Template categories
  CATEGORIES: {
    LOGIN: 'login',
    REGISTRATION: 'registration',
    PAYMENT: 'payment',
    PROFILE: 'profile',
    SEARCH: 'search',
    NAVIGATION: 'navigation',
    FORM: 'form',
    API: 'api',
    SECURITY: 'security',
    GENERAL: 'general'
  },

  // Variable validation rules
  VARIABLE_VALIDATION: {
    NAME_MIN_LENGTH: 1,
    NAME_MAX_LENGTH: 50,
    LABEL_MAX_LENGTH: 100,
    DESCRIPTION_MAX_LENGTH: 500,
    OPTIONS_MIN_COUNT: 1,
    OPTIONS_MAX_COUNT: 20
  }
};