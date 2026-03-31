/**
 * Optimized Base Error Boundary Component
 * Enhanced error boundary with better error handling and recovery options
 */

import React, { Component } from 'react';
import globalErrorHandler from '../../utils/errors/globalErrorHandler.js';
import { withProfiler } from '../../utils/performance/componentProfiler.jsx';

class BaseErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: null,
      retryCount: 0,
      showDetails: false
    };
    
    this.maxRetries = props.maxRetries || 3;
    this.retryDelay = props.retryDelay || 1000;
  }

  static getDerivedStateFromError(error) {
    return {
      hasError: true,
      error
    };
  }

  componentDidCatch(error, errorInfo) {
    const handledError = globalErrorHandler.handleComponentError(
      error,
      errorInfo,
      this.props.name || 'BaseErrorBoundary'
    );

    this.setState({
      errorInfo,
      errorId: handledError.id
    });

    // Call custom error handler if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo, handledError);
    }
  }

  handleRetry = () => {
    if (this.state.retryCount >= this.maxRetries) {
      return;
    }

    this.setState(prevState => ({
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: null,
      retryCount: prevState.retryCount + 1,
      showDetails: false
    }));

    // Add delay before retry to prevent immediate re-error
    if (this.retryDelay > 0) {
      setTimeout(() => {
        // Force re-render
        this.forceUpdate();
      }, this.retryDelay);
    }
  };

  handleReload = () => {
    window.location.reload();
  };

  handleGoHome = () => {
    window.location.href = '/';
  };

  toggleDetails = () => {
    this.setState(prevState => ({
      showDetails: !prevState.showDetails
    }));
  };

  getErrorMessage() {
    const { error } = this.state;
    const { errorMessages } = this.props;

    if (errorMessages && error?.name && errorMessages[error.name]) {
      return errorMessages[error.name];
    }

    if (error?.message) {
      return error.message;
    }

    return 'An unexpected error occurred';
  }

  getTroubleshootingTips() {
    const { error } = this.state;
    const tips = [];

    if (error?.name === 'ChunkLoadError') {
      tips.push('Try refreshing the page');
      tips.push('Clear your browser cache');
      tips.push('Check your internet connection');
    } else if (error?.name === 'TypeError') {
      tips.push('This might be a temporary issue');
      tips.push('Try the action again');
    } else if (error?.message?.includes('Network')) {
      tips.push('Check your internet connection');
      tips.push('Try again in a few moments');
    } else {
      tips.push('Try refreshing the page');
      tips.push('If the problem persists, contact support');
    }

    return tips;
  }

  renderFallbackUI() {
    const { fallback, level = 'page' } = this.props;
    const { error, errorId, retryCount, showDetails } = this.state;

    // Use custom fallback if provided
    if (fallback) {
      return fallback(error, this.handleRetry, errorId);
    }

    const errorMessage = this.getErrorMessage();
    const troubleshootingTips = this.getTroubleshootingTips();
    const canRetry = retryCount < this.maxRetries;

    // Component-level error boundary (smaller UI)
    if (level === 'component') {
      return (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 m-4">
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
                {errorMessage}
              </p>
              {canRetry && (
                <div className="mt-3">
                  <button
                    onClick={this.handleRetry}
                    className="bg-red-100 text-red-800 px-3 py-1 rounded text-sm hover:bg-red-200 transition-colors"
                  >
                    Try Again ({this.maxRetries - retryCount} attempts left)
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      );
    }

    // Page-level error boundary (full page UI)
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
              {errorId && (
                <p className="text-xs text-gray-500 mt-1">
                  Error ID: {errorId}
                </p>
              )}
            </div>
          </div>

          <div className="mb-4">
            <p className="text-sm text-gray-700 mb-3">
              {errorMessage}
            </p>

            {troubleshootingTips.length > 0 && (
              <div className="bg-blue-50 border border-blue-200 rounded-md p-3 mb-4">
                <h4 className="text-sm font-medium text-blue-800 mb-2">
                  Try these solutions:
                </h4>
                <ul className="text-sm text-blue-700 list-disc list-inside space-y-1">
                  {troubleshootingTips.map((tip, index) => (
                    <li key={index}>{tip}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          <div className="flex flex-col space-y-3">
            <div className="flex space-x-3">
              {canRetry && (
                <button
                  onClick={this.handleRetry}
                  className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
                >
                  Try Again ({this.maxRetries - retryCount} left)
                </button>
              )}
              <button
                onClick={this.handleReload}
                className="flex-1 bg-gray-200 text-gray-800 px-4 py-2 rounded-md text-sm font-medium hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-500 transition-colors"
              >
                Reload Page
              </button>
            </div>

            <button
              onClick={this.handleGoHome}
              className="w-full bg-gray-100 text-gray-700 px-4 py-2 rounded-md text-sm font-medium hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500 transition-colors"
            >
              Go to Home
            </button>

            {process.env.NODE_ENV === 'development' && (
              <button
                onClick={this.toggleDetails}
                className="text-xs text-gray-500 hover:text-gray-700 underline"
              >
                {showDetails ? 'Hide' : 'Show'} Error Details
              </button>
            )}
          </div>

          {showDetails && process.env.NODE_ENV === 'development' && (
            <div className="mt-4 p-3 bg-gray-100 rounded-md">
              <h4 className="text-xs font-medium text-gray-700 mb-2">Error Details:</h4>
              <pre className="text-xs text-gray-600 overflow-auto max-h-32 whitespace-pre-wrap">
                {error?.stack || error?.toString()}
              </pre>
              {this.state.errorInfo?.componentStack && (
                <div className="mt-2">
                  <h4 className="text-xs font-medium text-gray-700 mb-1">Component Stack:</h4>
                  <pre className="text-xs text-gray-600 overflow-auto max-h-32 whitespace-pre-wrap">
                    {this.state.errorInfo.componentStack}
                  </pre>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    );
  }

  render() {
    if (this.state.hasError) {
      return this.renderFallbackUI();
    }

    return this.props.children;
  }
}

// Export both the base class and a profiled version
export default BaseErrorBoundary;
export const ProfiledErrorBoundary = withProfiler(BaseErrorBoundary, 'BaseErrorBoundary');