/**
 * Application Constants
 * Centralized constants used across the application
 */

// API Configuration
export const API_CONFIG = {
  BASE_URL: process.env.REACT_APP_API_URL || 'http://localhost:3001',
  TIMEOUT: 30000,
  RETRY_ATTEMPTS: 3,
  RETRY_DELAY: 1000
};

// UI Constants
export const UI_CONSTANTS = {
  BREAKPOINTS: {
    xs: 0,
    sm: 576,
    md: 768,
    lg: 992,
    xl: 1200,
    xxl: 1400
  },
  
  Z_INDEX: {
    dropdown: 1000,
    sticky: 1020,
    fixed: 1030,
    modal_backdrop: 1040,
    modal: 1050,
    popover: 1060,
    tooltip: 1070,
    toast: 1080
  },
  
  ANIMATION_DURATION: {
    fast: 150,
    normal: 300,
    slow: 500
  },
  
  DEBOUNCE_DELAY: {
    search: 300,
    input: 500,
    resize: 250
  }
};

// Form Constants
export const FORM_CONSTANTS = {
  VALIDATION_DELAY: 300,
  
  INPUT_TYPES: {
    TEXT: 'text',
    EMAIL: 'email',
    PASSWORD: 'password',
    NUMBER: 'number',
    TEL: 'tel',
    URL: 'url',
    SEARCH: 'search',
    DATE: 'date',
    TIME: 'time',
    DATETIME_LOCAL: 'datetime-local'
  },
  
  FILE_UPLOAD: {
    MAX_SIZE: 5 * 1024 * 1024, // 5MB
    ALLOWED_TYPES: {
      IMAGES: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
      DOCUMENTS: ['application/pdf', 'text/plain', 'application/msword'],
      SPREADSHEETS: ['application/vnd.ms-excel', 'text/csv']
    }
  }
};

// Testing Constants
export const TESTING_CONSTANTS = {
  METEOR_SCORE_RANGE: {
    MIN: 0,
    MAX: 1
  },
  
  SENTENCE_BERT_SCORE_RANGE: {
    MIN: -1,
    MAX: 1
  },
  
  TEST_STATUSES: {
    PENDING: 'pending',
    RUNNING: 'running',
    COMPLETED: 'completed',
    FAILED: 'failed',
    CANCELLED: 'cancelled'
  },
  
  COMPARISON_TYPES: {
    METEOR: 'meteor',
    SENTENCE_BERT: 'sentence_bert',
    COMBINED: 'combined'
  }
};

// Error Constants
export const ERROR_CONSTANTS = {
  TYPES: {
    VALIDATION: 'validation',
    NETWORK: 'network',
    SERVER: 'server',
    CLIENT: 'client',
    AUTHENTICATION: 'authentication',
    AUTHORIZATION: 'authorization'
  },
  
  CODES: {
    REQUIRED_FIELD: 'REQUIRED_FIELD',
    INVALID_FORMAT: 'INVALID_FORMAT',
    NETWORK_ERROR: 'NETWORK_ERROR',
    SERVER_ERROR: 'SERVER_ERROR',
    UNAUTHORIZED: 'UNAUTHORIZED',
    FORBIDDEN: 'FORBIDDEN',
    NOT_FOUND: 'NOT_FOUND',
    CONFLICT: 'CONFLICT',
    RATE_LIMITED: 'RATE_LIMITED'
  },
  
  MESSAGES: {
    GENERIC: 'An unexpected error occurred',
    NETWORK: 'Network connection error',
    SERVER: 'Server error occurred',
    VALIDATION: 'Please check your input',
    UNAUTHORIZED: 'Please log in to continue',
    FORBIDDEN: 'You do not have permission to perform this action',
    NOT_FOUND: 'The requested resource was not found',
    RATE_LIMITED: 'Too many requests. Please try again later.'
  }
};

// Storage Constants
export const STORAGE_CONSTANTS = {
  KEYS: {
    AUTH_TOKEN: 'auth_token',
    USER_PREFERENCES: 'user_preferences',
    THEME: 'theme',
    LANGUAGE: 'language',
    RECENT_SEARCHES: 'recent_searches',
    DRAFT_DATA: 'draft_data',
    CACHE_PREFIX: 'cache_',
    SESSION_PREFIX: 'session_'
  },
  
  EXPIRY: {
    SHORT: 5 * 60 * 1000, // 5 minutes
    MEDIUM: 30 * 60 * 1000, // 30 minutes
    LONG: 24 * 60 * 60 * 1000, // 24 hours
    WEEK: 7 * 24 * 60 * 60 * 1000 // 1 week
  }
};

// Theme Constants
export const THEME_CONSTANTS = {
  MODES: {
    LIGHT: 'light',
    DARK: 'dark',
    AUTO: 'auto'
  },
  
  COLORS: {
    PRIMARY: {
      50: '#f0f9ff',
      100: '#e0f2fe',
      200: '#bae6fd',
      300: '#7dd3fc',
      400: '#38bdf8',
      500: '#0ea5e9',
      600: '#0284c7',
      700: '#0369a1',
      800: '#075985',
      900: '#0c4a6e'
    },
    
    GRAY: {
      50: '#f9fafb',
      100: '#f3f4f6',
      200: '#e5e7eb',
      300: '#d1d5db',
      400: '#9ca3af',
      500: '#6b7280',
      600: '#4b5563',
      700: '#374151',
      800: '#1f2937',
      900: '#111827'
    },
    
    SUCCESS: '#10b981',
    WARNING: '#f59e0b',
    ERROR: '#ef4444',
    INFO: '#3b82f6'
  }
};

// Performance Constants
export const PERFORMANCE_CONSTANTS = {
  THRESHOLDS: {
    FCP: 1500, // First Contentful Paint
    LCP: 2500, // Largest Contentful Paint
    FID: 100,  // First Input Delay
    CLS: 0.1,  // Cumulative Layout Shift
    TTFB: 600  // Time to First Byte
  },
  
  MONITORING: {
    SAMPLE_RATE: 0.1, // 10% sampling
    BATCH_SIZE: 10,
    FLUSH_INTERVAL: 30000 // 30 seconds
  }
};

// Pagination Constants
export const PAGINATION_CONSTANTS = {
  DEFAULT_PAGE_SIZE: 20,
  MAX_PAGE_SIZE: 100,
  PAGE_SIZE_OPTIONS: [10, 20, 50, 100]
};

// Date/Time Constants
export const DATE_CONSTANTS = {
  FORMATS: {
    DATE: 'YYYY-MM-DD',
    TIME: 'HH:mm:ss',
    DATETIME: 'YYYY-MM-DD HH:mm:ss',
    DISPLAY_DATE: 'MMM DD, YYYY',
    DISPLAY_DATETIME: 'MMM DD, YYYY HH:mm'
  },
  
  RELATIVE_TIME_THRESHOLDS: {
    MINUTE: 60,
    HOUR: 3600,
    DAY: 86400,
    WEEK: 604800,
    MONTH: 2592000,
    YEAR: 31536000
  }
};

// Feature Flags
export const FEATURE_FLAGS = {
  ENABLE_ANALYTICS: process.env.REACT_APP_ENABLE_ANALYTICS === 'true',
  ENABLE_ERROR_REPORTING: process.env.REACT_APP_ENABLE_ERROR_REPORTING === 'true',
  ENABLE_PERFORMANCE_MONITORING: process.env.REACT_APP_ENABLE_PERFORMANCE_MONITORING === 'true',
  ENABLE_DEBUG_MODE: process.env.NODE_ENV === 'development',
  ENABLE_EXPERIMENTAL_FEATURES: process.env.REACT_APP_ENABLE_EXPERIMENTAL === 'true'
};

// Regular Expressions
export const REGEX_PATTERNS = {
  EMAIL: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  PHONE: /^\+?[\d\s\-\(\)]{10,}$/,
  UUID: /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
  URL: /^https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)$/,
  STRONG_PASSWORD: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/,
  ALPHANUMERIC: /^[a-zA-Z0-9]+$/,
  SLUG: /^[a-z0-9]+(?:-[a-z0-9]+)*$/
};

// HTTP Status Codes
export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_SERVER_ERROR: 500,
  BAD_GATEWAY: 502,
  SERVICE_UNAVAILABLE: 503
};

// Environment Constants
export const ENV_CONSTANTS = {
  DEVELOPMENT: 'development',
  PRODUCTION: 'production',
  TEST: 'test',
  STAGING: 'staging'
};

// Export all constants as a single object for convenience
export const CONSTANTS = {
  API_CONFIG,
  UI_CONSTANTS,
  FORM_CONSTANTS,
  TESTING_CONSTANTS,
  ERROR_CONSTANTS,
  STORAGE_CONSTANTS,
  THEME_CONSTANTS,
  PERFORMANCE_CONSTANTS,
  PAGINATION_CONSTANTS,
  DATE_CONSTANTS,
  FEATURE_FLAGS,
  REGEX_PATTERNS,
  HTTP_STATUS,
  ENV_CONSTANTS
};