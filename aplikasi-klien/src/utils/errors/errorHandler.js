import { ErrorType, ErrorSeverity, SpecWeaveError } from './errorTypes.js'
import { getErrorMessage, getTroubleshootingTips } from './errorMessages.js'

/**
 * Global error handler for SpecWeave application
 */
class GlobalErrorHandler {
  constructor() {
    this.listeners = []
    this.errorLog = []
    this.maxLogSize = 100
    this.userId = null
    this.context = {}
    
    // Setup global error listeners
    this.setupGlobalListeners()
  }

  /**
   * Setup global error listeners
   */
  setupGlobalListeners() {
    // Only setup listeners in browser environment
    if (typeof window !== 'undefined') {
      // Handle unhandled promise rejections
      window.addEventListener('unhandledrejection', (event) => {
        this.handleError(event.reason, {
          type: 'unhandledrejection',
          promise: event.promise
        })
      })

      // Handle global JavaScript errors
      window.addEventListener('error', (event) => {
        this.handleError(event.error, {
          type: 'javascript',
          filename: event.filename,
          lineno: event.lineno,
          colno: event.colno
        })
      })
    }
  }

  /**
   * Set current user ID for error logging
   */
  setUserId(userId) {
    this.userId = userId
  }

  /**
   * Set application context for error logging
   */
  setContext(context) {
    this.context = { ...this.context, ...context }
  }

  /**
   * Add error listener
   */
  addListener(listener) {
    this.listeners.push(listener)
  }

  /**
   * Remove error listener
   */
  removeListener(listener) {
    this.listeners = this.listeners.filter(l => l !== listener)
  }

  /**
   * Handle error with classification and logging
   */
  handleError(error, additionalContext = {}) {
    try {
      // Classify error if it's not already a SpecWeaveError
      const classifiedError = this.classifyError(error)
      
      // Add context information
      classifiedError.userId = this.userId
      classifiedError.context = {
        ...this.context,
        ...additionalContext,
        url: typeof window !== 'undefined' ? window.location.href : 'unknown',
        userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown',
        timestamp: new Date().toISOString()
      }

      // Log error
      this.logError(classifiedError)

      // Notify listeners
      this.notifyListeners(classifiedError)

      // Send to monitoring service (if configured)
      this.sendToMonitoring(classifiedError)

      return classifiedError
    } catch (handlerError) {
      console.error('Error in error handler:', handlerError)
      return error
    }
  }

  /**
   * Classify error into SpecWeave error types
   */
  classifyError(error) {
    // If already a SpecWeaveError, return as is
    if (error instanceof SpecWeaveError) {
      return error
    }

    // Preserve original message for details
    const originalMessage = error.message || ''

    // Network errors
    if (error.name === 'NetworkError' || 
        error.message?.includes('fetch') ||
        error.message?.includes('network') ||
        error.code === 'NETWORK_ERROR') {
      return new SpecWeaveError(
        ErrorType.NETWORK,
        'CONNECTION_FAILED',
        'Koneksi internet bermasalah. Silakan coba lagi.',
        { originalError: originalMessage, stack: error.stack }
      )
    }

    // Server errors (HTTP 5xx)
    if (error.status >= 500 && error.status < 600) {
      return new SpecWeaveError(
        ErrorType.SERVER,
        'INTERNAL_ERROR',
        'Server sedang bermasalah. Tim kami sedang menangani.',
        { status: error.status, originalError: originalMessage }
      )
    }

    // Authentication errors (HTTP 401, 403)
    if (error.status === 401) {
      return new SpecWeaveError(
        ErrorType.AUTHENTICATION,
        'SESSION_EXPIRED',
        'Sesi Anda telah berakhir. Silakan login kembali.',
        { status: error.status, originalError: originalMessage }
      )
    }

    if (error.status === 403) {
      return new SpecWeaveError(
        ErrorType.PERMISSION,
        'ACCESS_DENIED',
        'Anda tidak memiliki akses untuk melakukan aksi ini',
        { status: error.status, originalError: originalMessage }
      )
    }

    // Validation errors (HTTP 400)
    if (error.status === 400) {
      return new SpecWeaveError(
        ErrorType.VALIDATION,
        'INVALID_FORMAT',
        'Format input tidak valid',
        { status: error.status, originalError: originalMessage }
      )
    }

    // JIRA-related errors
    if (error.message?.includes('jira') || error.message?.includes('JIRA')) {
      return new SpecWeaveError(
        ErrorType.JIRA_INTEGRATION,
        'CONNECTION_FAILED',
        'Koneksi ke JIRA gagal. Periksa URL dan kredensial Anda.',
        { originalError: originalMessage }
      )
    }

    // Export-related errors
    if (error.message?.includes('export') || error.message?.includes('download')) {
      return new SpecWeaveError(
        ErrorType.EXPORT,
        'GENERATION_FAILED',
        'Gagal membuat file export. Silakan coba lagi.',
        { originalError: originalMessage }
      )
    }

    // Default to unknown error with Indonesian message
    return new SpecWeaveError(
      ErrorType.UNKNOWN,
      'UNEXPECTED',
      'Terjadi kesalahan tak terduga. Tim kami telah diberitahu.',
      { originalError: originalMessage, stack: error.stack }
    )
  }

  /**
   * Log error to internal log
   */
  logError(error) {
    // Add to internal log
    this.errorLog.unshift({
      ...error.toJSON(),
      id: this.generateErrorId()
    })

    // Keep log size manageable
    if (this.errorLog.length > this.maxLogSize) {
      this.errorLog = this.errorLog.slice(0, this.maxLogSize)
    }

    // Console log for development
    if (process.env.NODE_ENV === 'development') {
      console.group(`🚨 SpecWeave Error [${error.type}]`)
      console.error('Message:', error.message)
      console.error('Code:', error.code)
      console.error('Details:', error.details)
      console.error('Context:', error.context)
      if (error.stack) {
        console.error('Stack:', error.stack)
      }
      console.groupEnd()
    }
  }

  /**
   * Notify all error listeners
   */
  notifyListeners(error) {
    this.listeners.forEach(listener => {
      try {
        listener(error)
      } catch (listenerError) {
        console.error('Error in error listener:', listenerError)
      }
    })
  }

  /**
   * Send error to monitoring service
   */
  sendToMonitoring(error) {
    // Only send critical and high severity errors to avoid spam
    if (error.severity === ErrorSeverity.CRITICAL || error.severity === ErrorSeverity.HIGH) {
      // TODO: Implement monitoring service integration
      // This could be Sentry, LogRocket, or custom monitoring
      console.log('Would send to monitoring:', error.toJSON())
    }
  }

  /**
   * Generate unique error ID
   */
  generateErrorId() {
    return `err_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`
  }

  /**
   * Get error log
   */
  getErrorLog() {
    return [...this.errorLog]
  }

  /**
   * Clear error log
   */
  clearErrorLog() {
    this.errorLog = []
  }

  /**
   * Get user-friendly error message
   */
  getDisplayMessage(error) {
    return getErrorMessage(error)
  }

  /**
   * Get troubleshooting tips
   */
  getTroubleshootingTips(error) {
    return getTroubleshootingTips(error.type)
  }

  /**
   * Create error report for support
   */
  createErrorReport(error) {
    return {
      errorId: error.id || this.generateErrorId(),
      type: error.type,
      code: error.code,
      message: error.message,
      timestamp: error.timestamp,
      userId: error.userId,
      context: error.context,
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown',
      url: typeof window !== 'undefined' ? window.location.href : 'unknown',
      troubleshootingTips: this.getTroubleshootingTips(error)
    }
  }
}

// Create singleton instance
export const globalErrorHandler = new GlobalErrorHandler()

// Export convenience functions
export const handleError = (error, context) => globalErrorHandler.handleError(error, context)
export const setUserId = (userId) => globalErrorHandler.setUserId(userId)
export const setContext = (context) => globalErrorHandler.setContext(context)
export const addErrorListener = (listener) => globalErrorHandler.addListener(listener)
export const removeErrorListener = (listener) => globalErrorHandler.removeListener(listener)
export const getErrorLog = () => globalErrorHandler.getErrorLog()
export const clearErrorLog = () => globalErrorHandler.clearErrorLog()

export default globalErrorHandler