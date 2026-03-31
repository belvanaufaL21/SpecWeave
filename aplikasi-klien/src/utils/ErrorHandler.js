/**
 * Centralized Error Handler for Dual-Mode METEOR Evaluation System
 * 
 * Provides robust error handling, recovery mechanisms, and state reset
 * to prevent infinite loops and ensure graceful degradation.
 * 
 * Memvalidasi: Kebutuhan 5.3, 14.1, 14.3
 */

/**
 * Error types for categorization and handling
 */
export const ErrorTypes = {
  VALIDATION: 'validation',
  NETWORK: 'network',
  TIMEOUT: 'timeout',
  EVALUATION: 'evaluation',
  LOOP_PREVENTION: 'loop_prevention',
  STATE_CORRUPTION: 'state_corruption',
  RESOURCE: 'resource',
  UNKNOWN: 'unknown'
};

/**
 * Error severity levels
 */
export const ErrorSeverity = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  CRITICAL: 'critical'
};

/**
 * Recovery strategies for different error types
 */
export const RecoveryStrategies = {
  RETRY: 'retry',
  RESET_STATE: 'reset_state',
  FALLBACK: 'fallback',
  ABORT: 'abort',
  RELOAD: 'reload'
};

/**
 * Centralized error handler class
 */
class ErrorHandler {
  constructor() {
    this.errorHistory = [];
    this.maxHistorySize = 100;
    this.retryAttempts = new Map();
    this.maxRetryAttempts = 3;
    this.errorCallbacks = new Map();
    this.isRecovering = false;
    this.lastRecoveryTime = null;
    this.recoveryTimeout = 5000; // 5 seconds between recovery attempts
    
    // Bind methods
    this.handleError = this.handleError.bind(this);
    this.registerErrorCallback = this.registerErrorCallback.bind(this);
    this.clearErrorHistory = this.clearErrorHistory.bind(this);
  }

  /**
   * Main error handling method
   * @param {Error|string} error - Error object or message
   * @param {Object} context - Additional context information
   * @param {string} component - Component where error occurred
   * @returns {Object} Error handling result with recovery actions
   */
  handleError(error, context = {}, component = 'unknown') {
    try {
      // Normalize error to consistent format
      const normalizedError = this._normalizeError(error, context, component);
      
      // Add to error history
      this._addToHistory(normalizedError);
      
      // Categorize error type and severity
      const errorType = this._categorizeError(normalizedError);
      const severity = this._determineSeverity(normalizedError, errorType);
      
      // Check for error patterns that might indicate infinite loops
      const loopRisk = this._detectLoopRisk(normalizedError);
      
      // Determine recovery strategy
      const recoveryStrategy = this._determineRecoveryStrategy(errorType, severity, loopRisk);
      
      // Execute recovery if needed
      const recoveryResult = this._executeRecovery(recoveryStrategy, normalizedError);
      
      // Log error appropriately
      this._logError(normalizedError, errorType, severity, recoveryStrategy);
      
      // Notify registered callbacks
      this._notifyCallbacks(normalizedError, errorType, severity, recoveryResult);
      
      return {
        success: true,
        error: normalizedError,
        errorType,
        severity,
        recoveryStrategy,
        recoveryResult,
        loopRisk,
        canRetry: this._canRetry(normalizedError),
        recommendedAction: this._getRecommendedAction(errorType, severity, loopRisk)
      };
      
    } catch (handlerError) {
      // Error in error handler - log and return minimal response
      console.error('❌ [ERROR-HANDLER] Error in error handler itself:', handlerError);
      return {
        success: false,
        error: { message: 'Error handler failure', originalError: error },
        errorType: ErrorTypes.UNKNOWN,
        severity: ErrorSeverity.CRITICAL,
        recoveryStrategy: RecoveryStrategies.ABORT,
        recoveryResult: { success: false },
        loopRisk: false,
        canRetry: false,
        recommendedAction: 'Manual intervention required'
      };
    }
  }

  /**
   * Register callback for error notifications
   * @param {string} component - Component name
   * @param {Function} callback - Callback function
   */
  registerErrorCallback(component, callback) {
    if (typeof callback !== 'function') {
      console.warn('⚠️ [ERROR-HANDLER] Invalid callback for component:', component);
      return;
    }
    
    if (!this.errorCallbacks.has(component)) {
      this.errorCallbacks.set(component, []);
    }
    
    this.errorCallbacks.get(component).push(callback);
    console.log(`✅ [ERROR-HANDLER] Registered error callback for component: ${component}`);
  }

  /**
   * Unregister error callback
   * @param {string} component - Component name
   * @param {Function} callback - Callback function to remove
   */
  unregisterErrorCallback(component, callback) {
    if (!this.errorCallbacks.has(component)) {
      return;
    }
    
    const callbacks = this.errorCallbacks.get(component);
    const index = callbacks.indexOf(callback);
    if (index > -1) {
      callbacks.splice(index, 1);
      console.log(`✅ [ERROR-HANDLER] Unregistered error callback for component: ${component}`);
    }
  }

  /**
   * Get error statistics
   * @returns {Object} Error statistics
   */
  getErrorStatistics() {
    const now = Date.now();
    const last24Hours = this.errorHistory.filter(error => 
      now - new Date(error.timestamp).getTime() < 24 * 60 * 60 * 1000
    );
    
    const errorsByType = {};
    const errorsBySeverity = {};
    
    last24Hours.forEach(error => {
      errorsByType[error.type] = (errorsByType[error.type] || 0) + 1;
      errorsBySeverity[error.severity] = (errorsBySeverity[error.severity] || 0) + 1;
    });
    
    return {
      totalErrors: this.errorHistory.length,
      errorsLast24Hours: last24Hours.length,
      errorsByType,
      errorsBySeverity,
      isRecovering: this.isRecovering,
      lastRecoveryTime: this.lastRecoveryTime,
      retryAttemptsActive: this.retryAttempts.size
    };
  }

  /**
   * Clear error history
   */
  clearErrorHistory() {
    this.errorHistory = [];
    this.retryAttempts.clear();
    console.log('✅ [ERROR-HANDLER] Error history cleared');
  }

  /**
   * Reset error handler state
   */
  resetState() {
    this.clearErrorHistory();
    this.isRecovering = false;
    this.lastRecoveryTime = null;
    console.log('✅ [ERROR-HANDLER] State reset complete');
  }

  // Private methods

  /**
   * Normalize error to consistent format
   * @param {Error|string} error - Error to normalize
   * @param {Object} context - Error context
   * @param {string} component - Component name
   * @returns {Object} Normalized error
   */
  _normalizeError(error, context, component) {
    const timestamp = new Date().toISOString();
    const errorId = `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    let normalizedError = {
      id: errorId,
      timestamp,
      component,
      context: { ...context }
    };
    
    if (error instanceof Error) {
      normalizedError.message = error.message;
      normalizedError.name = error.name;
      normalizedError.stack = error.stack;
      normalizedError.isErrorObject = true;
    } else if (typeof error === 'string') {
      normalizedError.message = error;
      normalizedError.name = 'StringError';
      normalizedError.isErrorObject = false;
    } else if (typeof error === 'object' && error !== null) {
      normalizedError = { ...normalizedError, ...error };
      normalizedError.isErrorObject = false;
    } else {
      normalizedError.message = String(error);
      normalizedError.name = 'UnknownError';
      normalizedError.isErrorObject = false;
    }
    
    return normalizedError;
  }

  /**
   * Add error to history with size management
   * @param {Object} error - Normalized error
   */
  _addToHistory(error) {
    this.errorHistory.unshift(error);
    
    // Maintain history size limit
    if (this.errorHistory.length > this.maxHistorySize) {
      this.errorHistory = this.errorHistory.slice(0, this.maxHistorySize);
    }
  }

  /**
   * Categorize error type based on error characteristics
   * @param {Object} error - Normalized error
   * @returns {string} Error type
   */
  _categorizeError(error) {
    const message = (error.message || '').toLowerCase();
    const name = (error.name || '').toLowerCase();
    
    // Network-related errors
    if (message.includes('network') || message.includes('fetch') || 
        message.includes('connection') || name.includes('networkerror')) {
      return ErrorTypes.NETWORK;
    }
    
    // Timeout errors
    if (message.includes('timeout') || message.includes('aborted') || 
        name.includes('timeouterror') || name.includes('aborterror')) {
      return ErrorTypes.TIMEOUT;
    }
    
    // Validation errors
    if (message.includes('validation') || message.includes('invalid') || 
        message.includes('required') || name.includes('validationerror')) {
      return ErrorTypes.VALIDATION;
    }
    
    // Loop prevention errors
    if (message.includes('loop') || message.includes('concurrent') || 
        message.includes('already running') || error.component === 'LoopPreventionController') {
      return ErrorTypes.LOOP_PREVENTION;
    }
    
    // Evaluation errors
    if (message.includes('evaluation') || message.includes('meteor') || 
        error.component?.includes('Evaluator') || error.component?.includes('Meteor')) {
      return ErrorTypes.EVALUATION;
    }
    
    // State corruption errors
    if (message.includes('state') || message.includes('corrupt') || 
        message.includes('inconsistent')) {
      return ErrorTypes.STATE_CORRUPTION;
    }
    
    // Resource errors
    if (message.includes('memory') || message.includes('resource') || 
        message.includes('quota') || name.includes('resourceerror')) {
      return ErrorTypes.RESOURCE;
    }
    
    return ErrorTypes.UNKNOWN;
  }

  /**
   * Determine error severity
   * @param {Object} error - Normalized error
   * @param {string} errorType - Error type
   * @returns {string} Error severity
   */
  _determineSeverity(error, errorType) {
    // Critical errors that require immediate attention
    if (errorType === ErrorTypes.STATE_CORRUPTION || 
        errorType === ErrorTypes.RESOURCE ||
        (error.message && error.message.includes('critical'))) {
      return ErrorSeverity.CRITICAL;
    }
    
    // High severity errors that significantly impact functionality
    if (errorType === ErrorTypes.LOOP_PREVENTION ||
        errorType === ErrorTypes.EVALUATION ||
        (error.message && error.message.includes('failed'))) {
      return ErrorSeverity.HIGH;
    }
    
    // Medium severity errors that impact user experience
    if (errorType === ErrorTypes.NETWORK ||
        errorType === ErrorTypes.TIMEOUT) {
      return ErrorSeverity.MEDIUM;
    }
    
    // Low severity errors that are recoverable
    if (errorType === ErrorTypes.VALIDATION) {
      return ErrorSeverity.LOW;
    }
    
    return ErrorSeverity.MEDIUM; // Default
  }

  /**
   * Detect potential infinite loop risk
   * @param {Object} error - Normalized error
   * @returns {boolean} True if loop risk detected
   */
  _detectLoopRisk(error) {
    const recentErrors = this.errorHistory.slice(0, 10);
    const now = Date.now();
    const fiveMinutesAgo = now - (5 * 60 * 1000);
    
    // Check for repeated similar errors in short time frame
    const recentSimilarErrors = recentErrors.filter(histError => {
      const errorTime = new Date(histError.timestamp).getTime();
      return errorTime > fiveMinutesAgo &&
             histError.component === error.component &&
             histError.message === error.message;
    });
    
    // Risk if more than 5 similar errors in 5 minutes
    if (recentSimilarErrors.length > 5) {
      return true;
    }
    
    // Check for rapid succession of errors (more than 10 errors in 1 minute)
    const oneMinuteAgo = now - (60 * 1000);
    const veryRecentErrors = recentErrors.filter(histError => {
      const errorTime = new Date(histError.timestamp).getTime();
      return errorTime > oneMinuteAgo;
    });
    
    return veryRecentErrors.length > 10;
  }

  /**
   * Determine recovery strategy based on error characteristics
   * @param {string} errorType - Error type
   * @param {string} severity - Error severity
   * @param {boolean} loopRisk - Whether loop risk is detected
   * @returns {string} Recovery strategy
   */
  _determineRecoveryStrategy(errorType, severity, loopRisk) {
    // If loop risk detected, prioritize state reset or abort
    if (loopRisk) {
      if (severity === ErrorSeverity.CRITICAL) {
        return RecoveryStrategies.ABORT;
      }
      return RecoveryStrategies.RESET_STATE;
    }
    
    // Strategy based on error type and severity
    switch (errorType) {
      case ErrorTypes.VALIDATION:
        return RecoveryStrategies.FALLBACK;
      
      case ErrorTypes.NETWORK:
      case ErrorTypes.TIMEOUT:
        return severity === ErrorSeverity.HIGH ? 
               RecoveryStrategies.RESET_STATE : RecoveryStrategies.RETRY;
      
      case ErrorTypes.LOOP_PREVENTION:
        return RecoveryStrategies.RESET_STATE;
      
      case ErrorTypes.EVALUATION:
        return severity === ErrorSeverity.CRITICAL ? 
               RecoveryStrategies.ABORT : RecoveryStrategies.FALLBACK;
      
      case ErrorTypes.STATE_CORRUPTION:
        return RecoveryStrategies.RESET_STATE;
      
      case ErrorTypes.RESOURCE:
        return RecoveryStrategies.ABORT;
      
      default:
        return severity === ErrorSeverity.CRITICAL ? 
               RecoveryStrategies.ABORT : RecoveryStrategies.RETRY;
    }
  }

  /**
   * Execute recovery strategy
   * @param {string} strategy - Recovery strategy
   * @param {Object} error - Normalized error
   * @returns {Object} Recovery result
   */
  _executeRecovery(strategy, error) {
    // Prevent concurrent recovery attempts
    if (this.isRecovering) {
      return { success: false, reason: 'Recovery already in progress' };
    }
    
    // Check recovery timeout
    if (this.lastRecoveryTime && 
        Date.now() - this.lastRecoveryTime < this.recoveryTimeout) {
      return { success: false, reason: 'Recovery timeout not elapsed' };
    }
    
    this.isRecovering = true;
    this.lastRecoveryTime = Date.now();
    
    try {
      switch (strategy) {
        case RecoveryStrategies.RETRY:
          return this._executeRetryRecovery(error);
        
        case RecoveryStrategies.RESET_STATE:
          return this._executeStateResetRecovery(error);
        
        case RecoveryStrategies.FALLBACK:
          return this._executeFallbackRecovery(error);
        
        case RecoveryStrategies.ABORT:
          return this._executeAbortRecovery(error);
        
        case RecoveryStrategies.RELOAD:
          return this._executeReloadRecovery(error);
        
        default:
          return { success: false, reason: 'Unknown recovery strategy' };
      }
    } finally {
      this.isRecovering = false;
    }
  }

  /**
   * Execute retry recovery
   * @param {Object} error - Normalized error
   * @returns {Object} Recovery result
   */
  _executeRetryRecovery(error) {
    const retryKey = `${error.component}_${error.message}`;
    const currentAttempts = this.retryAttempts.get(retryKey) || 0;
    
    if (currentAttempts >= this.maxRetryAttempts) {
      return { 
        success: false, 
        reason: `Max retry attempts (${this.maxRetryAttempts}) exceeded`,
        nextStrategy: RecoveryStrategies.RESET_STATE
      };
    }
    
    this.retryAttempts.set(retryKey, currentAttempts + 1);
    
    return { 
      success: true, 
      action: 'retry_scheduled',
      attempt: currentAttempts + 1,
      maxAttempts: this.maxRetryAttempts
    };
  }

  /**
   * Execute state reset recovery
   * @param {Object} error - Normalized error
   * @returns {Object} Recovery result
   */
  _executeStateResetRecovery(error) {
    try {
      // Clear retry attempts for this component
      const keysToDelete = [];
      for (const [key] of this.retryAttempts) {
        if (key.startsWith(error.component)) {
          keysToDelete.push(key);
        }
      }
      keysToDelete.forEach(key => this.retryAttempts.delete(key));
      
      // Notify callbacks about state reset
      this._notifyStateReset(error.component);
      
      return { 
        success: true, 
        action: 'state_reset',
        component: error.component,
        clearedRetries: keysToDelete.length
      };
    } catch (resetError) {
      return { 
        success: false, 
        reason: `State reset failed: ${resetError.message}` 
      };
    }
  }

  /**
   * Execute fallback recovery
   * @param {Object} error - Normalized error
   * @returns {Object} Recovery result
   */
  _executeFallbackRecovery(error) {
    return { 
      success: true, 
      action: 'fallback_mode',
      message: 'Switched to fallback behavior',
      component: error.component
    };
  }

  /**
   * Execute abort recovery
   * @param {Object} error - Normalized error
   * @returns {Object} Recovery result
   */
  _executeAbortRecovery(error) {
    // Clear all retry attempts
    this.retryAttempts.clear();
    
    return { 
      success: true, 
      action: 'operation_aborted',
      message: 'Operation aborted due to critical error',
      component: error.component
    };
  }

  /**
   * Execute reload recovery
   * @param {Object} error - Normalized error
   * @returns {Object} Recovery result
   */
  _executeReloadRecovery(error) {
    return { 
      success: true, 
      action: 'reload_recommended',
      message: 'Page reload recommended',
      component: error.component
    };
  }

  /**
   * Check if error can be retried
   * @param {Object} error - Normalized error
   * @returns {boolean} True if can retry
   */
  _canRetry(error) {
    const retryKey = `${error.component}_${error.message}`;
    const currentAttempts = this.retryAttempts.get(retryKey) || 0;
    return currentAttempts < this.maxRetryAttempts;
  }

  /**
   * Get recommended action for user
   * @param {string} errorType - Error type
   * @param {string} severity - Error severity
   * @param {boolean} loopRisk - Loop risk detected
   * @returns {string} Recommended action
   */
  _getRecommendedAction(errorType, severity, loopRisk) {
    if (loopRisk) {
      return 'System detected potential infinite loop. Please refresh the page.';
    }
    
    if (severity === ErrorSeverity.CRITICAL) {
      return 'Critical error occurred. Please refresh the page or contact support.';
    }
    
    switch (errorType) {
      case ErrorTypes.NETWORK:
        return 'Network error. Please check your connection and try again.';
      case ErrorTypes.TIMEOUT:
        return 'Operation timed out. Please try again.';
      case ErrorTypes.VALIDATION:
        return 'Please check your input and try again.';
      case ErrorTypes.EVALUATION:
        return 'Evaluation failed. Please try with different input.';
      default:
        return 'An error occurred. Please try again.';
    }
  }

  /**
   * Log error with appropriate level
   * @param {Object} error - Normalized error
   * @param {string} errorType - Error type
   * @param {string} severity - Error severity
   * @param {string} recoveryStrategy - Recovery strategy
   */
  _logError(error, errorType, severity, recoveryStrategy) {
    const logMessage = `[${error.component}] ${error.message}`;
    const logContext = {
      errorId: error.id,
      type: errorType,
      severity,
      recovery: recoveryStrategy,
      timestamp: error.timestamp
    };
    
    switch (severity) {
      case ErrorSeverity.CRITICAL:
        console.error('🚨 [ERROR-HANDLER] CRITICAL:', logMessage, logContext);
        break;
      case ErrorSeverity.HIGH:
        console.error('❌ [ERROR-HANDLER] HIGH:', logMessage, logContext);
        break;
      case ErrorSeverity.MEDIUM:
        console.warn('⚠️ [ERROR-HANDLER] MEDIUM:', logMessage, logContext);
        break;
      case ErrorSeverity.LOW:
        console.info('ℹ️ [ERROR-HANDLER] LOW:', logMessage, logContext);
        break;
      default:
        console.log('📝 [ERROR-HANDLER]:', logMessage, logContext);
    }
  }

  /**
   * Notify registered callbacks about error
   * @param {Object} error - Normalized error
   * @param {string} errorType - Error type
   * @param {string} severity - Error severity
   * @param {Object} recoveryResult - Recovery result
   */
  _notifyCallbacks(error, errorType, severity, recoveryResult) {
    const callbacks = this.errorCallbacks.get(error.component) || [];
    
    callbacks.forEach(callback => {
      try {
        callback({
          error,
          errorType,
          severity,
          recoveryResult,
          timestamp: new Date().toISOString()
        });
      } catch (callbackError) {
        console.error('❌ [ERROR-HANDLER] Callback error:', callbackError);
      }
    });
  }

  /**
   * Notify callbacks about state reset
   * @param {string} component - Component name
   */
  _notifyStateReset(component) {
    const callbacks = this.errorCallbacks.get(component) || [];
    
    callbacks.forEach(callback => {
      try {
        callback({
          type: 'state_reset',
          component,
          timestamp: new Date().toISOString()
        });
      } catch (callbackError) {
        console.error('❌ [ERROR-HANDLER] State reset callback error:', callbackError);
      }
    });
  }
}

// Create and export singleton instance
const errorHandler = new ErrorHandler();

export default errorHandler;