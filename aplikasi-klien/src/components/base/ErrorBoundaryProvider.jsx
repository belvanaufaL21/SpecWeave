/**
 * Error Boundary Provider
 * Provides error boundary context and centralized error handling for React components
 */

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import BaseErrorBoundary from './BaseErrorBoundary.jsx';
import globalErrorHandler from '../../utils/errors/globalErrorHandler.js';
import { useToast } from '../../hooks/useToast.jsx';

const ErrorBoundaryContext = createContext();

export const useErrorBoundary = () => {
  const context = useContext(ErrorBoundaryContext);
  if (!context) {
    throw new Error('useErrorBoundary must be used within an ErrorBoundaryProvider');
  }
  return context;
};

/**
 * Error Boundary Provider Component
 */
export const ErrorBoundaryProvider = ({ children, level = 'app' }) => {
  const [errorHistory, setErrorHistory] = useState([]);
  const [isRecovering, setIsRecovering] = useState(false);
  const toast = useToast();

  /**
   * Handle error manually (for use in components)
   */
  const handleError = useCallback((error, context = {}) => {
    const errorInfo = globalErrorHandler.handleError(error, {
      ...context,
      type: 'manual-error',
      component: context.component || 'Unknown'
    });

    // Add to error history
    setErrorHistory(prev => [...prev.slice(-9), errorInfo]);

    // Show user-friendly notification
    if (errorInfo.severity === 'critical') {
      toast.error('A critical error occurred. Please refresh the page.');
    } else if (errorInfo.severity === 'high') {
      toast.error('An error occurred. Please try again.');
    } else {
      toast.warning('Something went wrong. Please try again.');
    }

    return errorInfo;
  }, [toast]);

  /**
   * Recover from error state
   */
  const recoverFromError = useCallback(async () => {
    setIsRecovering(true);
    
    try {
      // Clear error state
      setErrorHistory([]);
      
      // Clear any cached data that might be causing issues
      if ('caches' in window) {
        const cacheNames = await caches.keys();
        await Promise.all(
          cacheNames.map(cacheName => caches.delete(cacheName))
        );
      }
      
      // Clear localStorage errors
      globalErrorHandler.clearStoredErrors();
      
      toast.success('System recovered successfully');
    } catch (recoveryError) {
      console.error('Recovery failed:', recoveryError);
      toast.error('Recovery failed. Please refresh the page manually.');
    } finally {
      setIsRecovering(false);
    }
  }, [toast]);

  /**
   * Get error statistics
   */
  const getErrorStats = useCallback(() => {
    return globalErrorHandler.getErrorStats();
  }, []);

  /**
   * Clear error history
   */
  const clearErrorHistory = useCallback(() => {
    setErrorHistory([]);
    globalErrorHandler.clearStoredErrors();
  }, []);

  /**
   * Check if system is in error state
   */
  const isInErrorState = useCallback(() => {
    const recentErrors = errorHistory.filter(
      error => Date.now() - error.timestamp < 5 * 60 * 1000 // 5 minutes
    );
    
    return recentErrors.length >= 3 || 
           recentErrors.some(error => error.severity === 'critical');
  }, [errorHistory]);

  /**
   * Handle global error events
   */
  useEffect(() => {
    const unsubscribe = globalErrorHandler.addErrorListener((errorInfo) => {
      setErrorHistory(prev => [...prev.slice(-9), errorInfo]);
    });

    return unsubscribe;
  }, []);

  const contextValue = {
    handleError,
    recoverFromError,
    getErrorStats,
    clearErrorHistory,
    isInErrorState: isInErrorState(),
    isRecovering,
    errorHistory
  };

  return (
    <ErrorBoundaryContext.Provider value={contextValue}>
      <BaseErrorBoundary
        level={level}
        name="ErrorBoundaryProvider"
        onError={(error, errorInfo, handledError) => {
          // Additional handling for boundary errors
          setErrorHistory(prev => [...prev.slice(-9), handledError]);
        }}
        fallback={(error, retry, errorId) => (
          <ErrorFallbackComponent
            error={error}
            retry={retry}
            errorId={errorId}
            level={level}
            onRecover={recoverFromError}
            isRecovering={isRecovering}
          />
        )}
      >
        {children}
      </BaseErrorBoundary>
    </ErrorBoundaryContext.Provider>
  );
};

/**
 * Enhanced Error Fallback Component
 */
const ErrorFallbackComponent = ({ 
  error, 
  retry, 
  errorId, 
  level, 
  onRecover, 
  isRecovering 
}) => {
  const [showDetails, setShowDetails] = useState(false);
  const [reportSent, setReportSent] = useState(false);

  const handleSendReport = async () => {
    try {
      // Send error report
      await fetch('/api/error-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          errorId,
          error: {
            name: error.name,
            message: error.message,
            stack: error.stack
          },
          userAgent: navigator.userAgent,
          url: window.location.href,
          timestamp: new Date().toISOString()
        })
      });
      
      setReportSent(true);
    } catch (reportError) {
      console.error('Failed to send error report:', reportError);
    }
  };

  if (level === 'component') {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 m-2">
        <div className="flex items-start">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3 flex-1">
            <h3 className="text-sm font-medium text-red-800">
              Component Error
            </h3>
            <p className="mt-1 text-sm text-red-700">
              {error.message || 'An unexpected error occurred'}
            </p>
            <div className="mt-3 flex space-x-2">
              <button
                onClick={retry}
                disabled={isRecovering}
                className="bg-red-100 text-red-800 px-3 py-1 rounded text-sm hover:bg-red-200 transition-colors disabled:opacity-50"
              >
                {isRecovering ? 'Recovering...' : 'Try Again'}
              </button>
              <button
                onClick={() => setShowDetails(!showDetails)}
                className="text-red-600 text-sm underline hover:text-red-800"
              >
                {showDetails ? 'Hide' : 'Show'} Details
              </button>
            </div>
            {showDetails && (
              <div className="mt-3 p-2 bg-red-100 rounded text-xs text-red-800 font-mono">
                <div>Error ID: {errorId}</div>
                <div>Type: {error.name}</div>
                {process.env.NODE_ENV === 'development' && (
                  <pre className="mt-2 whitespace-pre-wrap">{error.stack}</pre>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-lg w-full bg-white rounded-lg shadow-lg p-6">
        <div className="flex items-center mb-4">
          <div className="flex-shrink-0">
            <svg className="h-8 w-8 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 18.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <div className="ml-3">
            <h3 className="text-lg font-medium text-gray-900">
              Something went wrong
            </h3>
            <p className="text-xs text-gray-500 mt-1">
              Error ID: {errorId}
            </p>
          </div>
        </div>

        <div className="mb-4">
          <p className="text-sm text-gray-700 mb-3">
            {error.message || 'An unexpected error occurred. Our team has been notified.'}
          </p>

          <div className="bg-blue-50 border border-blue-200 rounded-md p-3 mb-4">
            <h4 className="text-sm font-medium text-blue-800 mb-2">
              What you can do:
            </h4>
            <ul className="text-sm text-blue-700 list-disc list-inside space-y-1">
              <li>Try refreshing the page</li>
              <li>Check your internet connection</li>
              <li>Clear your browser cache</li>
              <li>Try again in a few minutes</li>
            </ul>
          </div>
        </div>

        <div className="flex flex-col space-y-3">
          <div className="flex space-x-3">
            <button
              onClick={retry}
              disabled={isRecovering}
              className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors disabled:opacity-50"
            >
              {isRecovering ? 'Recovering...' : 'Try Again'}
            </button>
            <button
              onClick={onRecover}
              disabled={isRecovering}
              className="flex-1 bg-green-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 transition-colors disabled:opacity-50"
            >
              {isRecovering ? 'Recovering...' : 'Recover System'}
            </button>
          </div>

          <button
            onClick={() => window.location.reload()}
            className="w-full bg-gray-200 text-gray-800 px-4 py-2 rounded-md text-sm font-medium hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-500 transition-colors"
          >
            Reload Page
          </button>

          <button
            onClick={() => window.location.href = '/'}
            className="w-full bg-gray-100 text-gray-700 px-4 py-2 rounded-md text-sm font-medium hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500 transition-colors"
          >
            Go to Home
          </button>

          {!reportSent && (
            <button
              onClick={handleSendReport}
              className="text-sm text-gray-500 hover:text-gray-700 underline"
            >
              Send Error Report
            </button>
          )}

          {reportSent && (
            <p className="text-sm text-green-600 text-center">
              ✓ Error report sent successfully
            </p>
          )}

          {process.env.NODE_ENV === 'development' && (
            <button
              onClick={() => setShowDetails(!showDetails)}
              className="text-xs text-gray-500 hover:text-gray-700 underline"
            >
              {showDetails ? 'Hide' : 'Show'} Error Details
            </button>
          )}
        </div>

        {showDetails && process.env.NODE_ENV === 'development' && (
          <div className="mt-4 p-3 bg-gray-100 rounded-md">
            <h4 className="text-xs font-medium text-gray-700 mb-2">Error Details:</h4>
            <div className="text-xs text-gray-600 space-y-2">
              <div><strong>Type:</strong> {error.name}</div>
              <div><strong>Message:</strong> {error.message}</div>
              <pre className="overflow-auto max-h-32 whitespace-pre-wrap bg-gray-200 p-2 rounded">
                {error.stack}
              </pre>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ErrorBoundaryProvider;