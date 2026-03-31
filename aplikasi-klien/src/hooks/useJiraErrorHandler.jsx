import { useState, useCallback } from 'react';

/**
 * Hook for handling JIRA errors with retry functionality and user-friendly messages
 */
export const useJiraErrorHandler = () => {
  const [errors, setErrors] = useState([]);
  const [retryAttempts, setRetryAttempts] = useState(new Map());

  // Add error to the error list
  const addError = useCallback((error, context = {}) => {
    const errorId = Date.now() + Math.random();
    const newError = {
      id: errorId,
      error,
      context,
      timestamp: new Date(),
      dismissed: false
    };
    
    setErrors(prev => [...prev, newError]);
    return errorId;
  }, []);

  // Remove error from the list
  const removeError = useCallback((errorId) => {
    setErrors(prev => prev.filter(err => err.id !== errorId));
    setRetryAttempts(prev => {
      const newMap = new Map(prev);
      newMap.delete(errorId);
      return newMap;
    });
  }, []);

  // Clear all errors
  const clearErrors = useCallback(() => {
    setErrors([]);
    setRetryAttempts(new Map());
  }, []);

  // Retry a failed operation
  const retryOperation = useCallback(async (errorId, retryFunction) => {
    if (!retryFunction) return;

    const currentAttempts = retryAttempts.get(errorId) || 0;
    const maxRetries = 3;

    if (currentAttempts >= maxRetries) {
      console.warn(`Max retry attempts (${maxRetries}) reached for error ${errorId}`);
      return;
    }

    try {
      setRetryAttempts(prev => new Map(prev).set(errorId, currentAttempts + 1));
      
      // Execute retry with exponential backoff
      const delay = Math.min(1000 * Math.pow(2, currentAttempts), 10000);
      if (currentAttempts > 0) {
        await new Promise(resolve => setTimeout(resolve, delay));
      }

      const result = await retryFunction();
      
      // If successful, remove the error
      if (result && result.success !== false) {
        removeError(errorId);
      }
      
      return result;
    } catch (retryError) {
      console.error(`Retry attempt ${currentAttempts + 1} failed:`, retryError);
      
      // Update the error with the new retry error if it's different
      setErrors(prev => prev.map(err => 
        err.id === errorId 
          ? { ...err, error: retryError, lastRetryAt: new Date() }
          : err
      ));
      
      throw retryError;
    }
  }, [retryAttempts, removeError]);

  // Handle JIRA operation with automatic error handling
  const handleJiraOperation = useCallback(async (operation, context = {}) => {
    try {
      const result = await operation();
      return result;
    } catch (error) {
      const errorId = addError(error, {
        ...context,
        operation: context.operationName || 'unknown'
      });
      
      // Return error result with retry capability
      return {
        success: false,
        error: error.message,
        errorId,
        retry: (retryFn) => retryOperation(errorId, retryFn || operation)
      };
    }
  }, [addError, retryOperation]);

  // Get categorized error information
  const getErrorInfo = useCallback((error) => {
    if (!error) return null;

    const status = error.status || error.statusCode;
    const message = error.message?.toLowerCase() || '';

    // Determine error category and severity
    let category = 'unknown';
    let severity = 'error';
    let retryable = false;

    if (status === 401 || message.includes('unauthorized')) {
      category = 'authentication';
      severity = 'error';
      retryable = false;
    } else if (status === 403 || message.includes('forbidden')) {
      category = 'authorization';
      severity = 'warning';
      retryable = false;
    } else if (status === 404 || status === 410) {
      category = 'not_found';
      severity = 'warning';
      retryable = false;
    } else if (status === 429 || message.includes('rate limit')) {
      category = 'rate_limit';
      severity = 'info';
      retryable = true;
    } else if (status >= 500) {
      category = 'server_error';
      severity = 'error';
      retryable = true;
    } else if (message.includes('network') || message.includes('fetch')) {
      category = 'network';
      severity = 'warning';
      retryable = true;
    }

    return {
      category,
      severity,
      retryable,
      status,
      message: error.message
    };
  }, []);

  // Check if an error should be automatically retried
  const shouldAutoRetry = useCallback((error, attemptCount = 0) => {
    const errorInfo = getErrorInfo(error);
    const maxAutoRetries = 2;
    
    return errorInfo?.retryable && 
           attemptCount < maxAutoRetries && 
           ['network', 'server_error', 'rate_limit'].includes(errorInfo.category);
  }, [getErrorInfo]);

  // Get active errors (not dismissed)
  const activeErrors = errors.filter(err => !err.dismissed);

  // Get error statistics
  const errorStats = {
    total: errors.length,
    active: activeErrors.length,
    byCategory: errors.reduce((acc, err) => {
      const info = getErrorInfo(err.error);
      const category = info?.category || 'unknown';
      acc[category] = (acc[category] || 0) + 1;
      return acc;
    }, {}),
    retryAttempts: Array.from(retryAttempts.values()).reduce((sum, attempts) => sum + attempts, 0)
  };

  return {
    // Error state
    errors: activeErrors,
    errorStats,
    
    // Error management
    addError,
    removeError,
    clearErrors,
    
    // Operation handling
    handleJiraOperation,
    retryOperation,
    
    // Error analysis
    getErrorInfo,
    shouldAutoRetry,
    
    // Utility
    hasErrors: activeErrors.length > 0,
    hasRetryableErrors: activeErrors.some(err => getErrorInfo(err.error)?.retryable)
  };
};

export default useJiraErrorHandler;