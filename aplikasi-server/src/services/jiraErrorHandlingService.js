import supabaseService from './supabaseService.js';
import cleanLogger from '../config/cleanLogging.js';

/**
 * JIRA Error Handling Service
 * Handles JIRA integration errors, fallbacks, and recovery mechanisms
 */
class JiraErrorHandlingService {
  constructor() {
    // Error categories for different handling strategies
    this.errorCategories = {
      AUTHENTICATION: 'authentication',
      AUTHORIZATION: 'authorization',
      NETWORK: 'network',
      RATE_LIMIT: 'rate_limit',
      NOT_FOUND: 'not_found',
      SERVER_ERROR: 'server_error',
      VALIDATION: 'validation',
      UNKNOWN: 'unknown'
    };

    // Retry configuration
    this.retryConfig = {
      maxRetries: 3,
      baseDelay: 1000, // 1 second
      maxDelay: 10000, // 10 seconds
      backoffMultiplier: 2
    };

    // Error tracking
    this.errorStats = new Map();
  }

  /**
   * Categorize JIRA API error
   * @param {Error} error - The error to categorize
   * @returns {string} Error category
   */
  categorizeError(error) {
    if (!error) return this.errorCategories.UNKNOWN;

    const status = error.status || error.statusCode;
    const message = error.message?.toLowerCase() || '';

    // Authentication errors
    if (status === 401 || message.includes('unauthorized') || message.includes('authentication')) {
      return this.errorCategories.AUTHENTICATION;
    }

    // Authorization errors
    if (status === 403 || message.includes('forbidden') || message.includes('permission')) {
      return this.errorCategories.AUTHORIZATION;
    }

    // Rate limiting
    if (status === 429 || message.includes('rate limit') || message.includes('too many requests')) {
      return this.errorCategories.RATE_LIMIT;
    }

    // Not found errors (including 410 Gone for deprecated APIs)
    if (status === 404 || status === 410 || message.includes('not found') || message.includes('gone')) {
      return this.errorCategories.NOT_FOUND;
    }

    // Server errors
    if (status >= 500 || message.includes('server error') || message.includes('internal error')) {
      return this.errorCategories.SERVER_ERROR;
    }

    // Validation errors
    if (status === 400 || message.includes('bad request') || message.includes('validation')) {
      return this.errorCategories.VALIDATION;
    }

    // Network errors
    if (message.includes('network') || message.includes('timeout') || message.includes('connection')) {
      return this.errorCategories.NETWORK;
    }

    return this.errorCategories.UNKNOWN;
  }

  /**
   * Determine if error is retryable
   * @param {string} category - Error category
   * @param {number} attemptCount - Current attempt count
   * @returns {boolean} Whether to retry
   */
  shouldRetry(category, attemptCount = 0) {
    if (attemptCount >= this.retryConfig.maxRetries) {
      return false;
    }

    // Retryable error categories
    const retryableCategories = [
      this.errorCategories.NETWORK,
      this.errorCategories.RATE_LIMIT,
      this.errorCategories.SERVER_ERROR
    ];

    // Don't retry 410 (Gone) errors - API endpoints have been removed
    return retryableCategories.includes(category);
  }

  /**
   * Calculate retry delay with exponential backoff
   * @param {number} attemptCount - Current attempt count
   * @returns {number} Delay in milliseconds
   */
  calculateRetryDelay(attemptCount) {
    const delay = this.retryConfig.baseDelay * Math.pow(this.retryConfig.backoffMultiplier, attemptCount);
    return Math.min(delay, this.retryConfig.maxDelay);
  }

  /**
   * Handle JIRA API error with appropriate strategy
   * @param {Error} error - The error to handle
   * @param {Object} context - Additional context (operation, params, etc.)
   * @returns {Object} Error handling result
   */
  async handleError(error, context = {}) {
    const category = this.categorizeError(error);
    const attemptCount = context.attemptCount || 0;

    // Track error statistics
    this.trackError(category, context);

    const result = {
      category,
      shouldRetry: this.shouldRetry(category, attemptCount),
      retryDelay: this.calculateRetryDelay(attemptCount),
      fallbackData: null,
      userMessage: this.getUserMessage(category, error),
      technicalMessage: error.message,
      suggestions: this.getSuggestions(category)
    };

    // Apply category-specific handling
    switch (category) {
      case this.errorCategories.AUTHENTICATION:
        result.fallbackData = await this.handleAuthenticationError(error, context);
        break;

      case this.errorCategories.AUTHORIZATION:
        result.fallbackData = await this.handleAuthorizationError(error, context);
        break;

      case this.errorCategories.RATE_LIMIT:
        result.retryDelay = this.handleRateLimitError(error, context);
        break;

      case this.errorCategories.NOT_FOUND:
        result.fallbackData = await this.handleNotFoundError(error, context);
        break;

      case this.errorCategories.NETWORK:
        result.fallbackData = await this.handleNetworkError(error, context);
        break;

      default:
        result.fallbackData = await this.handleGenericError(error, context);
    }

    return result;
  }

  /**
   * Handle authentication errors
   * @param {Error} error - Authentication error
   * @param {Object} context - Error context
   * @returns {Object|null} Fallback data
   */
  async handleAuthenticationError(error, context) {
    cleanLogger.warn('JIRA', 'Authentication Error', error.message);
    
    // Log authentication failure for monitoring
    await this.logError('authentication_failure', {
      operation: context.operation,
      timestamp: new Date().toISOString(),
      error: error.message
    });

    // Return null - authentication errors require user intervention
    return null;
  }

  /**
   * Handle authorization errors
   * @param {Error} error - Authorization error
   * @param {Object} context - Error context
   * @returns {Object|null} Fallback data
   */
  async handleAuthorizationError(error, context) {
    cleanLogger.warn('JIRA', 'Authorization Error', error.message);
    
    // Log authorization failure
    await this.logError('authorization_failure', {
      operation: context.operation,
      resource: context.resource,
      timestamp: new Date().toISOString(),
      error: error.message
    });

    // Return limited fallback data based on operation
    if (context.operation === 'getEpics') {
      return { epics: [], message: 'Limited access - some epics may not be visible' };
    }

    if (context.operation === 'getIssues') {
      return { issues: [], message: 'Limited access - some issues may not be visible' };
    }

    return null;
  }

  /**
   * Handle rate limit errors
   * @param {Error} error - Rate limit error
   * @param {Object} context - Error context
   * @returns {number} Retry delay
   */
  handleRateLimitError(error, context) {
    cleanLogger.warn('JIRA', 'Rate Limit Error', error.message);
    
    // Extract retry-after header if available
    const retryAfter = error.headers?.['retry-after'] || error.retryAfter;
    if (retryAfter) {
      return parseInt(retryAfter) * 1000; // Convert to milliseconds
    }

    // Use exponential backoff with longer delays for rate limits
    return this.calculateRetryDelay(context.attemptCount || 0) * 2;
  }

  /**
   * Handle not found errors
   * @param {Error} error - Not found error
   * @param {Object} context - Error context
   * @returns {Object|null} Fallback data
   */
  async handleNotFoundError(error, context) {
    cleanLogger.warn('JIRA', 'Resource Not Found', error.message);
    
    // Return appropriate empty data based on operation
    if (context.operation === 'getEpics') {
      return [];
    }

    if (context.operation === 'getIssues') {
      return [];
    }

    if (context.operation === 'getProject') {
      return null;
    }

    return null;
  }

  /**
   * Handle network errors
   * @param {Error} error - Network error
   * @param {Object} context - Error context
   * @returns {Object|null} Fallback data
   */
  async handleNetworkError(error, context) {
    cleanLogger.warn('JIRA', 'Network Error', error.message);
    
    // Try to provide cached data if available
    const cachedData = await this.getCachedData(context.operation, context.params);
    if (cachedData) {
      return {
        ...cachedData,
        message: 'Using cached data due to network issues',
        isStale: true
      };
    }

    return null;
  }

  /**
   * Handle generic errors
   * @param {Error} error - Generic error
   * @param {Object} context - Error context
   * @returns {Object|null} Fallback data
   */
  async handleGenericError(error, context) {
    // Only log if it's a new type of error (throttled)
    const errorKey = `${context.operation}-${error.message}`;
    cleanLogger.error('JIRA', 'Generic JIRA error', { error: error.message, context });
    
    await this.logError('generic_error', {
      operation: context.operation,
      error: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString()
    });

    // Provide empty arrays for list operations to prevent UI crashes
    if (context.operation === 'getEpics') {
      return [];
    }

    if (context.operation === 'getIssues') {
      return [];
    }

    return null;
  }

  /**
   * Get user-friendly error message
   * @param {string} category - Error category
   * @param {Error} error - Original error
   * @returns {string} User message
   */
  getUserMessage(category, error) {
    const messages = {
      [this.errorCategories.AUTHENTICATION]: 'Please check your JIRA credentials and try again.',
      [this.errorCategories.AUTHORIZATION]: 'You don\'t have permission to access this JIRA resource.',
      [this.errorCategories.NETWORK]: 'Unable to connect to JIRA. Please check your internet connection.',
      [this.errorCategories.RATE_LIMIT]: 'JIRA rate limit exceeded. Please wait a moment and try again.',
      [this.errorCategories.NOT_FOUND]: 'The requested JIRA resource was not found.',
      [this.errorCategories.SERVER_ERROR]: 'JIRA server is experiencing issues. Please try again later.',
      [this.errorCategories.VALIDATION]: 'Invalid request data. Please check your input and try again.',
      [this.errorCategories.UNKNOWN]: 'An unexpected error occurred with JIRA integration.'
    };

    return messages[category] || messages[this.errorCategories.UNKNOWN];
  }

  /**
   * Get suggestions for error resolution
   * @param {string} category - Error category
   * @returns {Array<string>} Suggestions
   */
  getSuggestions(category) {
    const suggestions = {
      [this.errorCategories.AUTHENTICATION]: [
        'Verify your JIRA API token is correct',
        'Check if your JIRA account is active',
        'Ensure the API token has not expired'
      ],
      [this.errorCategories.AUTHORIZATION]: [
        'Contact your JIRA administrator for access',
        'Verify project permissions',
        'Check if the resource exists and is accessible'
      ],
      [this.errorCategories.NETWORK]: [
        'Check your internet connection',
        'Verify JIRA server URL is correct',
        'Try again in a few moments'
      ],
      [this.errorCategories.RATE_LIMIT]: [
        'Wait before making more requests',
        'Consider reducing request frequency',
        'Contact JIRA administrator about rate limits'
      ],
      [this.errorCategories.NOT_FOUND]: [
        'Verify the resource ID or key is correct',
        'Check if the resource has been deleted',
        'Ensure you have access to the project'
      ]
    };

    return suggestions[category] || ['Contact support if the issue persists'];
  }

  /**
   * Track error statistics
   * @param {string} category - Error category
   * @param {Object} context - Error context
   */
  trackError(category, context) {
    const key = `${category}_${context.operation || 'unknown'}`;
    const stats = this.errorStats.get(key) || { count: 0, lastOccurrence: null };
    
    stats.count++;
    stats.lastOccurrence = new Date();
    
    this.errorStats.set(key, stats);
  }

  /**
   * Get cached data for fallback
   * @param {string} operation - Operation name
   * @param {Object} params - Operation parameters
   * @returns {Object|null} Cached data
   */
  async getCachedData(operation, params) {
    try {
      // This would integrate with a caching service
      // For now, return null (no cache implementation)
      return null;
    } catch (error) {
      cleanLogger.debug('CACHE', 'Error retrieving cached data', error);
      return null;
    }
  }

  /**
   * Log error for monitoring and analysis
   * @param {string} type - Error type
   * @param {Object} details - Error details
   */
  async logError(type, details) {
    try {
      await supabaseService.logError({
        error_type: type,
        service: 'jira',
        details: JSON.stringify(details),
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      cleanLogger.debug('ERROR_LOG', 'Failed to log JIRA error', error);
    }
  }

  /**
   * Get error statistics
   * @returns {Object} Error statistics
   */
  getErrorStats() {
    const stats = {};
    for (const [key, value] of this.errorStats.entries()) {
      stats[key] = {
        count: value.count,
        lastOccurrence: value.lastOccurrence?.toISOString()
      };
    }
    return stats;
  }

  /**
   * Reset error statistics
   */
  resetErrorStats() {
    this.errorStats.clear();
  }
}

export default new JiraErrorHandlingService();