/**
 * Error Recovery Utility
 * Provides user-friendly error handling and recovery strategies
 * 
 * Validates: Requirements 11.1, 11.3, 11.4, 11.5
 */

import cleanLogger from '../../config/cleanLogging.js';
import { ErrorType } from './errorTypes.js';

/**
 * ErrorRecovery class for handling and recovering from errors
 * with user-friendly messages in Indonesian
 */
class ErrorRecovery {
  /**
   * Handle network errors with user-friendly message
   * @param {Error} error - The error object
   * @param {string} context - Context where error occurred
   * @returns {Object} Recovery result with user-friendly message
   */
  static handleNetworkError(error, context = 'NETWORK') {
    // Log technical details for debugging
    cleanLogger.error(context, 'Network error occurred', {
      message: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString()
    });

    // Return user-friendly message
    const userMessage = 'Error jaringan - silakan periksa koneksi Anda';
    cleanLogger.error(context, userMessage);

    return {
      success: false,
      type: ErrorType.NETWORK,
      userMessage,
      technicalDetails: error.message,
      canRetry: true,
      retryDelay: 3000, // 3 seconds
      recoveryAction: 'retry',
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Handle authentication errors with user-friendly message
   * @param {Error} error - The error object
   * @param {string} context - Context where error occurred
   * @returns {Object} Recovery result with user-friendly message
   */
  static handleAuthError(error, context = 'AUTH') {
    // Log technical details for debugging
    cleanLogger.error(context, 'Authentication error occurred', {
      message: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString()
    });

    // Return user-friendly message
    const userMessage = 'Autentikasi gagal - silakan login kembali';
    cleanLogger.error(context, userMessage);

    return {
      success: false,
      type: ErrorType.AUTHENTICATION,
      userMessage,
      technicalDetails: error.message,
      canRetry: false,
      shouldRedirect: true,
      redirectTo: '/login',
      recoveryAction: 'redirect_to_login',
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Handle service unavailable errors with user-friendly message
   * @param {Error} error - The error object
   * @param {string} context - Context where error occurred
   * @returns {Object} Recovery result with user-friendly message
   */
  static handleServiceError(error, context = 'SERVICE') {
    // Log technical details for debugging
    cleanLogger.error(context, 'Service error occurred', {
      message: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString()
    });

    // Return user-friendly message
    const userMessage = 'Layanan sementara tidak tersedia - silakan coba lagi';
    cleanLogger.error(context, userMessage);

    return {
      success: false,
      type: ErrorType.SERVER,
      userMessage,
      technicalDetails: error.message,
      canRetry: true,
      retryDelay: 5000, // 5 seconds
      recoveryAction: 'retry_later',
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Handle unexpected errors with logging and generic message
   * @param {Error} error - The error object
   * @param {string} context - Context where error occurred
   * @returns {Object} Recovery result with user-friendly message
   */
  static handleUnexpectedError(error, context = 'SYSTEM') {
    // Log full technical details for debugging
    cleanLogger.error(context, 'Unexpected error occurred', {
      message: error.message,
      name: error.name,
      stack: error.stack,
      timestamp: new Date().toISOString(),
      errorObject: error
    });

    // Return generic user-friendly message
    const userMessage = 'Terjadi kesalahan - silakan coba lagi';
    cleanLogger.error(context, userMessage);

    return {
      success: false,
      type: ErrorType.UNKNOWN,
      userMessage,
      technicalDetails: error.message,
      canRetry: true,
      retryDelay: 2000, // 2 seconds
      recoveryAction: 'retry',
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Main error handler that routes to appropriate handler
   * @param {Error} error - The error object
   * @param {string} context - Context where error occurred
   * @returns {Object} Recovery result
   */
  static async handleError(error, context = 'UNKNOWN') {
    try {
      // Determine error type and route to appropriate handler
      const errorType = this.categorizeError(error);

      switch (errorType) {
        case ErrorType.NETWORK:
          return this.handleNetworkError(error, context);

        case ErrorType.AUTHENTICATION:
          return this.handleAuthError(error, context);

        case ErrorType.SERVER:
          return this.handleServiceError(error, context);

        default:
          return this.handleUnexpectedError(error, context);
      }
    } catch (handlerError) {
      // If error handler itself fails, log and return minimal response
      console.error('Error in error handler:', handlerError);
      return {
        success: false,
        type: ErrorType.UNKNOWN,
        userMessage: 'Terjadi kesalahan - silakan coba lagi',
        technicalDetails: 'Error handler failure',
        canRetry: false,
        recoveryAction: 'manual_intervention',
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Categorize error based on error characteristics
   * @param {Error} error - The error object
   * @returns {string} Error type
   */
  static categorizeError(error) {
    if (!error) {
      return ErrorType.UNKNOWN;
    }

    const message = (error.message || '').toLowerCase();
    const name = (error.name || '').toLowerCase();
    const statusCode = error.status || error.statusCode;

    // JIRA integration errors (check first to avoid false matches)
    if (
      message.includes('jira') ||
      name.includes('jiraerror')
    ) {
      return ErrorType.JIRA_INTEGRATION;
    }

    // Network-related errors
    if (
      message.includes('network') ||
      message.includes('fetch') ||
      message.includes('connection') ||
      message.includes('timeout') ||
      message.includes('offline') ||
      name.includes('networkerror') ||
      name.includes('typeerror') && message.includes('failed to fetch')
    ) {
      return ErrorType.NETWORK;
    }

    // Authentication errors
    if (
      statusCode === 401 ||
      statusCode === 403 ||
      message.includes('unauthorized') ||
      message.includes('authentication') ||
      message.includes('auth') ||
      message.includes('token') ||
      message.includes('session') ||
      name.includes('autherror')
    ) {
      return ErrorType.AUTHENTICATION;
    }

    // Server errors
    if (
      statusCode >= 500 ||
      statusCode === 503 ||
      message.includes('server') ||
      message.includes('service unavailable') ||
      message.includes('internal error') ||
      name.includes('servererror')
    ) {
      return ErrorType.SERVER;
    }

    // Validation errors
    if (
      statusCode === 400 ||
      message.includes('validation') ||
      message.includes('invalid') ||
      message.includes('required') ||
      name.includes('validationerror')
    ) {
      return ErrorType.VALIDATION;
    }

    return ErrorType.UNKNOWN;
  }

  /**
   * Handle JIRA-specific errors
   * @param {Error} error - The error object
   * @param {string} operation - The JIRA operation being performed
   * @returns {Object} Recovery result
   */
  static handleJiraError(error, operation = 'JIRA operation') {
    cleanLogger.error('JIRA', `${operation} failed`, {
      message: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString()
    });

    const userMessage = `${operation} gagal - silakan periksa koneksi JIRA Anda`;
    cleanLogger.jiraConnectionFailed(error.message);

    return {
      success: false,
      type: ErrorType.JIRA_INTEGRATION,
      userMessage,
      technicalDetails: error.message,
      canRetry: true,
      retryDelay: 3000,
      recoveryAction: 'check_jira_connection',
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Handle validation errors
   * @param {Error} error - The error object
   * @param {string} context - Context where error occurred
   * @returns {Object} Recovery result
   */
  static handleValidationError(error, context = 'VALIDATION') {
    cleanLogger.warn(context, 'Validation error occurred', {
      message: error.message,
      timestamp: new Date().toISOString()
    });

    const userMessage = error.message || 'Data tidak valid - silakan periksa input Anda';
    cleanLogger.warn(context, userMessage);

    return {
      success: false,
      type: ErrorType.VALIDATION,
      userMessage,
      technicalDetails: error.message,
      canRetry: false,
      recoveryAction: 'fix_input',
      validationErrors: error.details || null,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Wrap an async function with error handling
   * @param {Function} fn - Async function to wrap
   * @param {string} context - Context for error logging
   * @returns {Function} Wrapped function with error handling
   */
  static wrapWithErrorHandling(fn, context = 'OPERATION') {
    return async (...args) => {
      try {
        return await fn(...args);
      } catch (error) {
        const recovery = await this.handleError(error, context);
        throw new Error(recovery.userMessage);
      }
    };
  }

  /**
   * Retry an operation with exponential backoff
   * @param {Function} operation - Operation to retry
   * @param {number} maxRetries - Maximum number of retries
   * @param {number} initialDelay - Initial delay in milliseconds
   * @param {string} context - Context for error logging
   * @returns {Promise} Result of the operation
   */
  static async retryWithBackoff(
    operation,
    maxRetries = 3,
    initialDelay = 1000,
    context = 'RETRY'
  ) {
    let lastError;
    let delay = initialDelay;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        cleanLogger.debug(context, `Attempt ${attempt} of ${maxRetries}`);
        return await operation();
      } catch (error) {
        lastError = error;
        
        if (attempt < maxRetries) {
          cleanLogger.warn(context, `Attempt ${attempt} failed, retrying in ${delay}ms`, {
            error: error.message
          });
          
          await new Promise(resolve => setTimeout(resolve, delay));
          delay *= 2; // Exponential backoff
        }
      }
    }

    // All retries failed
    cleanLogger.error(context, `All ${maxRetries} attempts failed`);
    return this.handleError(lastError, context);
  }
}

export default ErrorRecovery;
