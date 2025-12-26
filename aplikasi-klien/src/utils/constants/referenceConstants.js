/**
 * Konstanta untuk Reference Service
 */

export const REFERENCE_CONSTANTS = {
  // API Endpoints
  API_ENDPOINTS: {
    BASE: '/api/references',
    STATISTICS: '/api/references/statistics',
    USAGE: '/usage'
  },

  // Default headers untuk API calls
  DEFAULT_HEADERS: {
    'Content-Type': 'application/json'
  },

  // Kategori references
  CATEGORIES: {
    ALL: 'all',
    LOGIN: 'login',
    REGISTRATION: 'registration',
    PAYMENT: 'payment',
    PROFILE: 'profile',
    SEARCH: 'search',
    NAVIGATION: 'navigation',
    FORM: 'form',
    API: 'api',
    SECURITY: 'security'
  },

  // Default limits
  DEFAULT_LIMITS: {
    BEST_REFERENCES: 5,
    FORMATTED_REFERENCES: 3,
    SEARCH_RESULTS: 50
  },

  // Purposes
  PURPOSES: {
    FEW_SHOT_PROMPTING: 'few-shot-prompting',
    TEMPLATE: 'template',
    REFERENCE: 'reference'
  },

  // Quality scoring weights
  QUALITY_WEIGHTS: {
    USAGE_COUNT: 0.7,
    AVERAGE_SCORE: 0.3
  },

  // Default statistics structure
  DEFAULT_STATISTICS: {
    totalReferences: 0,
    publicReferences: 0,
    privateReferences: 0,
    totalUsage: 0,
    averageScore: 0,
    categoryBreakdown: {},
    mostUsedReferences: []
  },

  // Error messages
  ERROR_MESSAGES: {
    FETCH_FAILED: 'Failed to fetch references',
    CREATE_FAILED: 'Failed to create reference',
    UPDATE_FAILED: 'Failed to update reference',
    DELETE_FAILED: 'Failed to delete reference',
    TRACK_USAGE_FAILED: 'Failed to track usage',
    STATISTICS_FAILED: 'Failed to fetch statistics'
  },

  // Success messages
  SUCCESS_MESSAGES: {
    CREATED: 'Reference created successfully',
    UPDATED: 'Reference updated successfully',
    DELETED: 'Reference deleted successfully',
    USAGE_TRACKED: 'Usage tracked successfully'
  }
};