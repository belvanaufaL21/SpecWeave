import React, { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { globalErrorHandler } from '../utils/errors/errorHandler.js'

const ErrorContext = createContext()

/**
 * Error context provider for managing application-wide error state
 */
export function ErrorProvider({ children }) {
  const [errors, setErrors] = useState([])
  const [isOnline, setIsOnline] = useState(navigator.onLine)

  // Handle errors from global error handler
  const handleGlobalError = useCallback((error) => {
    // Use setTimeout to avoid setState during render
    setTimeout(() => {
      setErrors(prev => {
        // Avoid duplicate errors
        const isDuplicate = prev.some(existingError => 
          existingError.type === error.type && 
          existingError.code === error.code &&
          existingError.message === error.message &&
          Date.now() - new Date(existingError.timestamp).getTime() < 5000 // Within 5 seconds
        )
        
        if (isDuplicate) return prev
        
        return [error, ...prev.slice(0, 19)] // Keep last 20 errors
      })
    }, 0)
  }, [])

  // Clear specific error
  const clearError = useCallback((errorId) => {
    setErrors(prev => prev.filter(error => error.id !== errorId))
  }, [])

  // Clear all errors
  const clearAllErrors = useCallback(() => {
    setErrors([])
  }, [])

  // Handle network status changes
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true)
      // Clear network-related errors when back online
      setErrors(prev => prev.filter(error => error.type !== 'network'))
    }

    const handleOffline = () => {
      setIsOnline(false)
      // Add offline error
      globalErrorHandler.handleError(new Error('Offline'), {
        type: 'network',
        code: 'OFFLINE'
      })
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  // Setup global error handler listener
  useEffect(() => {
    globalErrorHandler.addListener(handleGlobalError)
    
    return () => {
      globalErrorHandler.removeListener(handleGlobalError)
    }
  }, [handleGlobalError])

  // Auto-clear old errors
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now()
      setErrors(prev => prev.filter(error => {
        const errorAge = now - new Date(error.timestamp).getTime()
        // Keep critical errors for 5 minutes, others for 2 minutes
        const maxAge = error.severity === 'critical' ? 5 * 60 * 1000 : 2 * 60 * 1000
        return errorAge < maxAge
      }))
    }, 30000) // Check every 30 seconds

    return () => clearInterval(interval)
  }, [])

  const value = {
    errors,
    isOnline,
    clearError,
    clearAllErrors,
    handleError: globalErrorHandler.handleError.bind(globalErrorHandler),
    getDisplayMessage: globalErrorHandler.getDisplayMessage.bind(globalErrorHandler),
    getTroubleshootingTips: globalErrorHandler.getTroubleshootingTips.bind(globalErrorHandler),
    createErrorReport: globalErrorHandler.createErrorReport.bind(globalErrorHandler)
  }

  return (
    <ErrorContext.Provider value={value}>
      {children}
    </ErrorContext.Provider>
  )
}

/**
 * Hook to use error context
 */
export function useError() {
  const context = useContext(ErrorContext)
  if (!context) {
    throw new Error('useError must be used within an ErrorProvider')
  }
  return context
}

export default ErrorContext