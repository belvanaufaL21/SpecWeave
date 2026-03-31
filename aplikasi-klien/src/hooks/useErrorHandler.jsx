import { useEffect, useCallback, useState } from 'react'
import { globalErrorHandler } from '../utils/errors/errorHandler.js'
import { useToast } from './useToast.jsx'

/**
 * React hook for error handling
 */
export function useErrorHandler() {
  const [errors, setErrors] = useState([])
  const { showToast } = useToast()

  // Handle error with toast notification
  const handleError = useCallback((error, context = {}) => {
    const handledError = globalErrorHandler.handleError(error, context)
    
    // Show toast notification for user-facing errors
    const displayMessage = globalErrorHandler.getDisplayMessage(handledError)
    showToast(displayMessage, 'error')
    
    // Add to local error state
    setErrors(prev => [handledError, ...prev.slice(0, 9)]) // Keep last 10 errors
    
    return handledError
  }, [showToast])

  // Clear specific error
  const clearError = useCallback((errorId) => {
    setErrors(prev => prev.filter(err => err.id !== errorId))
  }, [])

  // Clear all errors
  const clearAllErrors = useCallback(() => {
    setErrors([])
  }, [])

  // Get troubleshooting tips for error
  const getTroubleshootingTips = useCallback((error) => {
    return globalErrorHandler.getTroubleshootingTips(error)
  }, [])

  // Create error report
  const createErrorReport = useCallback((error) => {
    return globalErrorHandler.createErrorReport(error)
  }, [])

  return {
    errors,
    handleError,
    clearError,
    clearAllErrors,
    getTroubleshootingTips,
    createErrorReport
  }
}

/**
 * Hook for async error handling
 */
export function useAsyncError() {
  const { handleError } = useErrorHandler()

  const executeAsync = useCallback(async (asyncFn, context = {}) => {
    try {
      return await asyncFn()
    } catch (error) {
      handleError(error, context)
      throw error // Re-throw so caller can handle if needed
    }
  }, [handleError])

  return { executeAsync }
}

/**
 * Hook for form error handling
 */
export function useFormErrorHandler() {
  const [fieldErrors, setFieldErrors] = useState({})
  const { handleError } = useErrorHandler()

  const setFieldError = useCallback((fieldName, error) => {
    setFieldErrors(prev => ({
      ...prev,
      [fieldName]: error
    }))
  }, [])

  const clearFieldError = useCallback((fieldName) => {
    setFieldErrors(prev => {
      const newErrors = { ...prev }
      delete newErrors[fieldName]
      return newErrors
    })
  }, [])

  const clearAllFieldErrors = useCallback(() => {
    setFieldErrors({})
  }, [])

  const handleFormError = useCallback((error, fieldMapping = {}) => {
    // Handle validation errors with field mapping
    if (error.type === 'validation' && error.details?.fields) {
      const newFieldErrors = {}
      Object.entries(error.details.fields).forEach(([field, message]) => {
        const mappedField = fieldMapping[field] || field
        newFieldErrors[mappedField] = message
      })
      setFieldErrors(prev => ({ ...prev, ...newFieldErrors }))
    } else {
      // Handle as general error
      handleError(error)
    }
  }, [handleError])

  return {
    fieldErrors,
    setFieldError,
    clearFieldError,
    clearAllFieldErrors,
    handleFormError
  }
}