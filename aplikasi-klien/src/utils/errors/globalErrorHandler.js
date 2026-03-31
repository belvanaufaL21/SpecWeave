/**
 * Global Error Handler
 * Centralized error handling system for the application
 */

import performanceMonitor from '../performance/performanceMonitor.js';

class GlobalErrorHandler {
  constructor() {
    this.errorListeners = new Set();
    this.errorQueue = [];
    this.isProcessing = false;
    this.maxQueueSize = 100;
    this.retryAttempts = 3;
    
    // Initialize error tracking
    this.initializeErrorTracking();
  }

  /**
   * Initialize global error tracking
   */
  initializeErrorTracking() {
    // Handle unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      this.handleError(event.reason, {
        type: 'unhandled-promise-rejection',
        promise: event.promise
      });
    });

    // Handle global JavaScript errors
    window.addEventListener('error', (event) => {
      this.handleError(event.error || new Error(event.message), {
        type: 'javascript-error',
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno
      });
    });

    // Handle resource loading errors
    window.addEventListener('error', (event) => {
      if (event.target !== window) {
        this.handleError(new Error(`Resource failed to load: ${event.target.src || event.target.href}`), {
          type: 'resource-error',
          element: event.target.tagName,
          source: event.target.src || event.target.href
        });
      }
    }, true);
  }

  /**
   * Handle an error with context
   */
  handleError(error, context = {}) {
    const errorInfo = this.createErrorInfo(error, context);
    
    // Add to queue for processing
    this.addToQueue(errorInfo);
    
    // Notify listeners
    this.notifyListeners(errorInfo);
    
    // Log performance impact
    performanceMonitor.recordMetric('error-occurred', {
      type: errorInfo.type,
      severity: errorInfo.severity,
      timestamp: errorInfo.timestamp
    });

    return errorInfo;
  }

  /**
   * Create standardized error information
   */
  createErrorInfo(error, context = {}) {
    const timestamp = Date.now();
    const errorId = `err_${timestamp}_${Math.random().toString(36).substr(2, 9)}`;
    
    return {
      id: errorId,
      timestamp,
      message: error?.message || 'Unknown error',
      stack: error?.stack,
      name: error?.name || 'Error',
      type: context.type || 'unknown',
      severity: this.determineSeverity(error, context),
      context: {
        ...context,
        userAgent: navigator.userAgent,
        url: window.location.href,
        userId: this.getCurrentUserId(),
        sessionId: this.getSessionId()
      },
      handled: false,
      retryCount: 0
    };
  }

  /**
   * Determine error severity
   */
  determineSeverity(error, context) {
    // Critical errors that break core functionality
    if (error?.name === 'ChunkLoadError' || 
        error?.message?.includes('Loading chunk') ||
        context.type === 'unhandled-promise-rejection') {
      return 'critical';
    }
    
    // High severity errors
    if (error?.name === 'TypeError' ||
        error?.name === 'ReferenceError' ||
        context.type === 'javascript-error') {
      return 'high';
    }
    
    // Medium severity errors
    if (error?.name === 'NetworkError' ||
        context.type === 'resource-error' ||
        error?.message?.includes('fetch')) {
      return 'medium';
    }
    
    // Low severity errors
    return 'low';
  }

  /**
   * Add error to processing queue
   */
  addToQueue(errorInfo) {
    if (this.errorQueue.length >= this.maxQueueSize) {
      // Remove oldest error to make space
      this.errorQueue.shift();
    }
    
    this.errorQueue.push(errorInfo);
    
    if (!this.isProcessing) {
      this.processQueue();
    }
  }

  /**
   * Process error queue
   */
  async processQueue() {
    if (this.isProcessing || this.errorQueue.length === 0) return;
    
    this.isProcessing = true;
    
    while (this.errorQueue.length > 0) {
      const errorInfo = this.errorQueue.shift();
      
      try {
        await this.processError(errorInfo);
      } catch (processingError) {
        console.error('Error processing error:', processingError);
      }
    }
    
    this.isProcessing = false;
  }

  /**
   * Process individual error
   */
  async processError(errorInfo) {
    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.group(`🚨 Error [${errorInfo.severity.toUpperCase()}]`);
      console.error('Message:', errorInfo.message);
      console.error('Type:', errorInfo.type);
      console.error('Context:', errorInfo.context);
      if (errorInfo.stack) {
        console.error('Stack:', errorInfo.stack);
      }
      console.groupEnd();
    }

    // Send to error reporting service (if configured)
    if (this.shouldReportError(errorInfo)) {
      await this.reportError(errorInfo);
    }

    // Store locally for debugging
    this.storeErrorLocally(errorInfo);
  }

  /**
   * Determine if error should be reported
   */
  shouldReportError(errorInfo) {
    // Don't report in development
    if (process.env.NODE_ENV === 'development') return false;
    
    // Don't report low severity errors
    if (errorInfo.severity === 'low') return false;
    
    // Don't report if already reported recently
    const recentErrors = this.getRecentErrors(5 * 60 * 1000); // 5 minutes
    const similarError = recentErrors.find(e => 
      e.message === errorInfo.message && 
      e.type === errorInfo.type
    );
    
    return !similarError;
  }

  /**
   * Report error to external service
   */
  async reportError(errorInfo) {
    try {
      // This would integrate with your error reporting service
      // For now, we'll just log it
      console.log('Reporting error to service:', errorInfo.id);
      
      // Example: Send to Sentry, LogRocket, etc.
      // await fetch('/api/errors', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify(errorInfo)
      // });
      
    } catch (reportingError) {
      console.error('Failed to report error:', reportingError);
    }
  }

  /**
   * Store error locally for debugging
   */
  storeErrorLocally(errorInfo) {
    try {
      const errors = this.getStoredErrors();
      errors.push(errorInfo);
      
      // Keep only last 50 errors
      if (errors.length > 50) {
        errors.splice(0, errors.length - 50);
      }
      
      localStorage.setItem('app_errors', JSON.stringify(errors));
    } catch (storageError) {
      console.warn('Failed to store error locally:', storageError);
    }
  }

  /**
   * Get stored errors from localStorage
   */
  getStoredErrors() {
    try {
      const stored = localStorage.getItem('app_errors');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  }

  /**
   * Get recent errors within time window
   */
  getRecentErrors(timeWindow = 60000) {
    const now = Date.now();
    return this.getStoredErrors().filter(error => 
      now - error.timestamp < timeWindow
    );
  }

  /**
   * Add error listener
   */
  addErrorListener(listener) {
    this.errorListeners.add(listener);
    
    return () => {
      this.errorListeners.delete(listener);
    };
  }

  /**
   * Notify all error listeners
   */
  notifyListeners(errorInfo) {
    this.errorListeners.forEach(listener => {
      try {
        listener(errorInfo);
      } catch (listenerError) {
        console.error('Error in error listener:', listenerError);
      }
    });
  }

  /**
   * Handle React component errors
   */
  handleComponentError(error, errorInfo, componentName) {
    return this.handleError(error, {
      type: 'react-component-error',
      component: componentName,
      componentStack: errorInfo.componentStack
    });
  }

  /**
   * Handle API errors
   */
  handleApiError(error, requestInfo = {}) {
    return this.handleError(error, {
      type: 'api-error',
      url: requestInfo.url,
      method: requestInfo.method,
      status: error.status || error.response?.status,
      statusText: error.statusText || error.response?.statusText
    });
  }

  /**
   * Handle network errors
   */
  handleNetworkError(error, requestInfo = {}) {
    return this.handleError(error, {
      type: 'network-error',
      url: requestInfo.url,
      method: requestInfo.method,
      offline: !navigator.onLine
    });
  }

  /**
   * Get error statistics
   */
  getErrorStats(timeWindow = 24 * 60 * 60 * 1000) {
    const errors = this.getRecentErrors(timeWindow);
    
    const stats = {
      total: errors.length,
      bySeverity: {},
      byType: {},
      byHour: {}
    };
    
    errors.forEach(error => {
      // By severity
      stats.bySeverity[error.severity] = (stats.bySeverity[error.severity] || 0) + 1;
      
      // By type
      stats.byType[error.type] = (stats.byType[error.type] || 0) + 1;
      
      // By hour
      const hour = new Date(error.timestamp).getHours();
      stats.byHour[hour] = (stats.byHour[hour] || 0) + 1;
    });
    
    return stats;
  }

  /**
   * Clear stored errors
   */
  clearStoredErrors() {
    try {
      localStorage.removeItem('app_errors');
    } catch (error) {
      console.warn('Failed to clear stored errors:', error);
    }
  }

  /**
   * Get current user ID (implement based on your auth system)
   */
  getCurrentUserId() {
    // This should be implemented based on your authentication system
    return null;
  }

  /**
   * Get session ID
   */
  getSessionId() {
    let sessionId = sessionStorage.getItem('session_id');
    if (!sessionId) {
      sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      sessionStorage.setItem('session_id', sessionId);
    }
    return sessionId;
  }
}

// Create singleton instance
const globalErrorHandler = new GlobalErrorHandler();

export default globalErrorHandler;