/**
 * Database Error Handler
 * Provides comprehensive error handling and recovery for database operations
 * Requirements: 6.5, 6.6
 */

class DatabaseErrorHandler {
  constructor() {
    // Error classification patterns
    this.errorPatterns = {
      connection: [
        /connection.*refused/i,
        /connection.*timeout/i,
        /connection.*lost/i,
        /network.*error/i,
        /server.*unavailable/i
      ],
      authentication: [
        /authentication.*failed/i,
        /invalid.*credentials/i,
        /access.*denied/i,
        /permission.*denied/i
      ],
      constraint: [
        /constraint.*violation/i,
        /foreign.*key.*constraint/i,
        /unique.*constraint/i,
        /check.*constraint/i,
        /not.*null.*constraint/i
      ],
      syntax: [
        /syntax.*error/i,
        /invalid.*sql/i,
        /malformed.*query/i
      ],
      data: [
        /data.*too.*long/i,
        /invalid.*input/i,
        /type.*mismatch/i,
        /conversion.*error/i
      ],
      resource: [
        /out.*of.*memory/i,
        /disk.*full/i,
        /too.*many.*connections/i,
        /resource.*exhausted/i
      ],
      timeout: [
        /timeout/i,
        /query.*cancelled/i,
        /operation.*timed.*out/i
      ]
    };

    // Recovery strategies for different error types
    this.recoveryStrategies = {
      connection: {
        retryable: true,
        maxRetries: 3,
        backoffMultiplier: 2,
        initialDelay: 1000,
        actions: ['reconnect', 'fallback']
      },
      authentication: {
        retryable: false,
        maxRetries: 0,
        actions: ['refresh_credentials', 'notify_admin']
      },
      constraint: {
        retryable: false,
        maxRetries: 0,
        actions: ['validate_data', 'sanitize_input']
      },
      syntax: {
        retryable: false,
        maxRetries: 0,
        actions: ['log_query', 'notify_developer']
      },
      data: {
        retryable: true,
        maxRetries: 1,
        actions: ['sanitize_data', 'truncate_values']
      },
      resource: {
        retryable: true,
        maxRetries: 2,
        backoffMultiplier: 3,
        initialDelay: 5000,
        actions: ['wait', 'reduce_load']
      },
      timeout: {
        retryable: true,
        maxRetries: 2,
        backoffMultiplier: 1.5,
        initialDelay: 2000,
        actions: ['optimize_query', 'increase_timeout']
      }
    };

    // Error statistics
    this.statistics = {
      totalErrors: 0,
      errorsByType: {},
      errorsByTable: {},
      recoveryAttempts: 0,
      successfulRecoveries: 0,
      lastError: null,
      lastErrorTime: null
    };
  }

  /**
   * Handle database error with classification and recovery
   * @param {Error} error - Database error
   * @param {Object} context - Error context
   * @returns {Object} Error handling result
   */
  handleError(error, context = {}) {
    const startTime = Date.now();
    
    try {
      // Update statistics
      this.updateStatistics(error, context);

      // Classify error
      const classification = this.classifyError(error);
      
      // Create standardized error response
      const errorResponse = this.createErrorResponse(error, classification, context);
      
      // Determine recovery strategy
      const recoveryStrategy = this.getRecoveryStrategy(classification);
      
      // Log error with context
      this.logError(error, classification, context, errorResponse);
      
      const result = {
        success: false,
        error: errorResponse,
        classification,
        recoveryStrategy,
        context,
        handledAt: new Date().toISOString(),
        processingTime: Date.now() - startTime
      };

      return result;

    } catch (handlingError) {
      console.error('Error in error handler:', handlingError);
      
      return {
        success: false,
        error: {
          type: 'handler_error',
          message: 'Error occurred while handling database error',
          originalError: error.message,
          handlingError: handlingError.message
        },
        classification: { type: 'unknown', confidence: 0 },
        recoveryStrategy: { retryable: false },
        context,
        handledAt: new Date().toISOString(),
        processingTime: Date.now() - startTime
      };
    }
  }

  /**
   * Classify error type based on error message and patterns
   * @param {Error} error - Database error
   * @returns {Object} Error classification
   */
  classifyError(error) {
    const message = error.message || '';
    const code = error.code || '';
    
    let bestMatch = { type: 'unknown', confidence: 0 };

    // Check each error pattern
    for (const [errorType, patterns] of Object.entries(this.errorPatterns)) {
      for (const pattern of patterns) {
        if (pattern.test(message) || pattern.test(code)) {
          const confidence = this.calculateConfidence(message, pattern);
          
          if (confidence > bestMatch.confidence) {
            bestMatch = { type: errorType, confidence };
          }
        }
      }
    }

    // Additional classification based on error properties
    if (error.code) {
      const codeClassification = this.classifyByErrorCode(error.code);
      if (codeClassification.confidence > bestMatch.confidence) {
        bestMatch = codeClassification;
      }
    }

    return {
      ...bestMatch,
      originalMessage: message,
      errorCode: code,
      classifiedAt: new Date().toISOString()
    };
  }

  /**
   * Classify error by error code
   * @param {string} code - Error code
   * @returns {Object} Classification result
   */
  classifyByErrorCode(code) {
    const codeMap = {
      // PostgreSQL error codes
      '08000': { type: 'connection', confidence: 0.9 }, // connection_exception
      '08003': { type: 'connection', confidence: 0.9 }, // connection_does_not_exist
      '08006': { type: 'connection', confidence: 0.9 }, // connection_failure
      '28000': { type: 'authentication', confidence: 0.9 }, // invalid_authorization_specification
      '23000': { type: 'constraint', confidence: 0.9 }, // integrity_constraint_violation
      '23001': { type: 'constraint', confidence: 0.9 }, // restrict_violation
      '23502': { type: 'constraint', confidence: 0.9 }, // not_null_violation
      '23503': { type: 'constraint', confidence: 0.9 }, // foreign_key_violation
      '23505': { type: 'constraint', confidence: 0.9 }, // unique_violation
      '23514': { type: 'constraint', confidence: 0.9 }, // check_violation
      '42601': { type: 'syntax', confidence: 0.9 }, // syntax_error
      '42000': { type: 'syntax', confidence: 0.8 }, // syntax_error_or_access_rule_violation
      '22001': { type: 'data', confidence: 0.9 }, // string_data_right_truncation
      '22003': { type: 'data', confidence: 0.9 }, // numeric_value_out_of_range
      '22P02': { type: 'data', confidence: 0.9 }, // invalid_text_representation
      '53000': { type: 'resource', confidence: 0.9 }, // insufficient_resources
      '53100': { type: 'resource', confidence: 0.9 }, // disk_full
      '53200': { type: 'resource', confidence: 0.9 }, // out_of_memory
      '53300': { type: 'resource', confidence: 0.9 }, // too_many_connections
      '57014': { type: 'timeout', confidence: 0.9 }, // query_canceled
      
      // Supabase specific codes
      'PGRST116': { type: 'data', confidence: 0.8 }, // no rows returned
      'PGRST301': { type: 'authentication', confidence: 0.9 } // JWT expired
    };

    return codeMap[code] || { type: 'unknown', confidence: 0 };
  }

  /**
   * Calculate confidence score for pattern match
   * @param {string} message - Error message
   * @param {RegExp} pattern - Pattern to match
   * @returns {number} Confidence score (0-1)
   */
  calculateConfidence(message, pattern) {
    const match = message.match(pattern);
    if (!match) return 0;

    // Base confidence
    let confidence = 0.7;

    // Increase confidence based on match length
    const matchLength = match[0].length;
    const messageLength = message.length;
    const matchRatio = matchLength / messageLength;
    confidence += matchRatio * 0.2;

    // Cap at 0.95 to leave room for code-based classification
    return Math.min(confidence, 0.95);
  }

  /**
   * Create standardized error response
   * @param {Error} error - Original error
   * @param {Object} classification - Error classification
   * @param {Object} context - Error context
   * @returns {Object} Standardized error response
   */
  createErrorResponse(error, classification, context) {
    const response = {
      type: classification.type,
      message: this.sanitizeErrorMessage(error.message),
      code: error.code || null,
      severity: this.determineSeverity(classification, context),
      retryable: this.isRetryable(classification),
      userMessage: this.generateUserMessage(classification, context),
      technicalDetails: {
        originalMessage: error.message,
        stack: error.stack,
        classification,
        context
      },
      timestamp: new Date().toISOString(),
      errorId: this.generateErrorId()
    };

    // Add specific handling based on error type
    switch (classification.type) {
      case 'constraint':
        response.constraintDetails = this.extractConstraintDetails(error);
        break;
      case 'data':
        response.dataIssues = this.extractDataIssues(error, context);
        break;
      case 'connection':
        response.connectionInfo = this.extractConnectionInfo(error, context);
        break;
    }

    return response;
  }

  /**
   * Sanitize error message for safe display
   * @param {string} message - Original error message
   * @returns {string} Sanitized message
   */
  sanitizeErrorMessage(message) {
    if (!message) return 'Unknown database error';

    // Remove sensitive information
    let sanitized = message
      .replace(/password[=:]\s*[^\s]+/gi, 'password=***')
      .replace(/token[=:]\s*[^\s]+/gi, 'token=***')
      .replace(/key[=:]\s*[^\s]+/gi, 'key=***')
      .replace(/secret[=:]\s*[^\s]+/gi, 'secret=***');

    // Limit message length
    if (sanitized.length > 500) {
      sanitized = sanitized.substring(0, 497) + '...';
    }

    return sanitized;
  }

  /**
   * Determine error severity
   * @param {Object} classification - Error classification
   * @param {Object} context - Error context
   * @returns {string} Severity level
   */
  determineSeverity(classification, context) {
    const severityMap = {
      connection: 'high',
      authentication: 'high',
      resource: 'high',
      constraint: 'medium',
      data: 'medium',
      syntax: 'low',
      timeout: 'medium',
      unknown: 'medium'
    };

    let baseSeverity = severityMap[classification.type] || 'medium';

    // Adjust based on context
    if (context.operation === 'backup' || context.operation === 'migration') {
      baseSeverity = 'high';
    }

    if (context.retryCount > 2) {
      baseSeverity = 'high';
    }

    return baseSeverity;
  }

  /**
   * Check if error is retryable
   * @param {Object} classification - Error classification
   * @returns {boolean} Whether error is retryable
   */
  isRetryable(classification) {
    const strategy = this.recoveryStrategies[classification.type];
    return strategy ? strategy.retryable : false;
  }

  /**
   * Generate user-friendly error message
   * @param {Object} classification - Error classification
   * @param {Object} context - Error context
   * @returns {string} User-friendly message
   */
  generateUserMessage(classification, context) {
    const messageMap = {
      connection: 'Unable to connect to the database. Please try again in a moment.',
      authentication: 'Authentication failed. Please check your credentials.',
      constraint: 'The data violates database constraints. Please check your input.',
      syntax: 'There was an error processing your request. Please try again.',
      data: 'Invalid data format. Please check your input and try again.',
      resource: 'The system is currently under heavy load. Please try again later.',
      timeout: 'The operation took too long to complete. Please try again.',
      unknown: 'An unexpected error occurred. Please try again or contact support.'
    };

    let message = messageMap[classification.type] || messageMap.unknown;

    // Add context-specific information
    if (context.table) {
      message += ` (Table: ${context.table})`;
    }

    return message;
  }

  /**
   * Get recovery strategy for error type
   * @param {Object} classification - Error classification
   * @returns {Object} Recovery strategy
   */
  getRecoveryStrategy(classification) {
    const strategy = this.recoveryStrategies[classification.type];
    
    if (!strategy) {
      return {
        retryable: false,
        maxRetries: 0,
        actions: ['log_error']
      };
    }

    return { ...strategy };
  }

  /**
   * Extract constraint violation details
   * @param {Error} error - Database error
   * @returns {Object} Constraint details
   */
  extractConstraintDetails(error) {
    const message = error.message || '';
    const details = {
      constraintType: null,
      constraintName: null,
      table: null,
      column: null
    };

    // Extract constraint name
    const constraintMatch = message.match(/constraint "([^"]+)"/i);
    if (constraintMatch) {
      details.constraintName = constraintMatch[1];
    }

    // Extract table name
    const tableMatch = message.match(/table "([^"]+)"/i);
    if (tableMatch) {
      details.table = tableMatch[1];
    }

    // Extract column name
    const columnMatch = message.match(/column "([^"]+)"/i);
    if (columnMatch) {
      details.column = columnMatch[1];
    }

    // Determine constraint type
    if (message.includes('unique')) {
      details.constraintType = 'unique';
    } else if (message.includes('foreign key')) {
      details.constraintType = 'foreign_key';
    } else if (message.includes('not null')) {
      details.constraintType = 'not_null';
    } else if (message.includes('check')) {
      details.constraintType = 'check';
    }

    return details;
  }

  /**
   * Extract data-related issues
   * @param {Error} error - Database error
   * @param {Object} context - Error context
   * @returns {Object} Data issues
   */
  extractDataIssues(error, context) {
    const message = error.message || '';
    const issues = {
      type: null,
      field: null,
      value: null,
      expectedType: null
    };

    // Extract field name
    const fieldMatch = message.match(/column "([^"]+)"/i);
    if (fieldMatch) {
      issues.field = fieldMatch[1];
    }

    // Determine issue type
    if (message.includes('too long')) {
      issues.type = 'length_exceeded';
    } else if (message.includes('invalid input')) {
      issues.type = 'invalid_format';
    } else if (message.includes('out of range')) {
      issues.type = 'value_out_of_range';
    } else if (message.includes('type mismatch')) {
      issues.type = 'type_mismatch';
    }

    return issues;
  }

  /**
   * Extract connection information
   * @param {Error} error - Database error
   * @param {Object} context - Error context
   * @returns {Object} Connection info
   */
  extractConnectionInfo(error, context) {
    const message = error.message || '';
    const info = {
      host: null,
      port: null,
      database: null,
      timeout: null
    };

    // Extract host and port
    const hostMatch = message.match(/host "([^"]+)"/i) || message.match(/server ([^\s:]+)/i);
    if (hostMatch) {
      info.host = hostMatch[1];
    }

    const portMatch = message.match(/port (\d+)/i);
    if (portMatch) {
      info.port = parseInt(portMatch[1]);
    }

    // Extract timeout information
    const timeoutMatch = message.match(/timeout.*?(\d+)/i);
    if (timeoutMatch) {
      info.timeout = parseInt(timeoutMatch[1]);
    }

    return info;
  }

  /**
   * Log error with appropriate level and context
   * @param {Error} error - Original error
   * @param {Object} classification - Error classification
   * @param {Object} context - Error context
   * @param {Object} errorResponse - Standardized error response
   */
  logError(error, classification, context, errorResponse) {
    const logData = {
      errorId: errorResponse.errorId,
      type: classification.type,
      severity: errorResponse.severity,
      message: error.message,
      context,
      timestamp: new Date().toISOString()
    };

    switch (errorResponse.severity) {
      case 'high':
        console.error('🚨 HIGH SEVERITY DATABASE ERROR:', logData);
        break;
      case 'medium':
        console.warn('⚠️ MEDIUM SEVERITY DATABASE ERROR:', logData);
        break;
      case 'low':
        console.log('ℹ️ LOW SEVERITY DATABASE ERROR:', logData);
        break;
      default:
        console.error('❌ DATABASE ERROR:', logData);
    }
  }

  /**
   * Update error statistics
   * @param {Error} error - Database error
   * @param {Object} context - Error context
   */
  updateStatistics(error, context) {
    this.statistics.totalErrors++;
    this.statistics.lastError = error.message;
    this.statistics.lastErrorTime = new Date().toISOString();

    // Update error type statistics
    const classification = this.classifyError(error);
    if (!this.statistics.errorsByType[classification.type]) {
      this.statistics.errorsByType[classification.type] = 0;
    }
    this.statistics.errorsByType[classification.type]++;

    // Update table statistics
    if (context.table) {
      if (!this.statistics.errorsByTable[context.table]) {
        this.statistics.errorsByTable[context.table] = 0;
      }
      this.statistics.errorsByTable[context.table]++;
    }
  }

  /**
   * Generate unique error ID
   * @returns {string} Error ID
   */
  generateErrorId() {
    return `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get error statistics
   * @returns {Object} Error statistics
   */
  getStatistics() {
    return {
      ...this.statistics,
      recoveryRate: this.statistics.recoveryAttempts > 0 
        ? (this.statistics.successfulRecoveries / this.statistics.recoveryAttempts) * 100 
        : 0
    };
  }

  /**
   * Reset error statistics
   */
  resetStatistics() {
    this.statistics = {
      totalErrors: 0,
      errorsByType: {},
      errorsByTable: {},
      recoveryAttempts: 0,
      successfulRecoveries: 0,
      lastError: null,
      lastErrorTime: null
    };
  }

  /**
   * Record recovery attempt
   * @param {boolean} successful - Whether recovery was successful
   */
  recordRecoveryAttempt(successful) {
    this.statistics.recoveryAttempts++;
    if (successful) {
      this.statistics.successfulRecoveries++;
    }
  }
}

// Create singleton instance
const databaseErrorHandler = new DatabaseErrorHandler();

export default databaseErrorHandler;