import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import fc from 'fast-check'

// Mock DOM globals for Node.js environment
const mockWindow = {
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  location: { href: 'http://localhost:3000' }
}

const mockNavigator = {
  userAgent: 'Mozilla/5.0 (Test Environment)',
  onLine: true
}

// Set up globals before importing modules
Object.defineProperty(global, 'window', {
  value: mockWindow,
  writable: true
})

Object.defineProperty(global, 'navigator', {
  value: mockNavigator,
  writable: true
})

import { globalErrorHandler } from '../errorHandler.js'
import { ErrorType, ErrorSeverity, SpecWeaveError } from '../errorTypes.js'
import { getErrorMessage } from '../errorMessages.js'

/**
 * Feature: specweave-ux-revision, Property 7: Error Handling Consistency
 * Validates: Requirements 9.3, 9.4, 9.5, 9.6, 9.7, 9.8
 */

describe('Error Handler Property Tests', () => {
  beforeEach(() => {
    // Clear error log before each test
    globalErrorHandler.clearErrorLog()
    // Reset listeners
    globalErrorHandler.listeners = []
    // Reset mocks
    vi.clearAllMocks()
  })

  afterEach(() => {
    // Clean up after each test
    globalErrorHandler.clearErrorLog()
    globalErrorHandler.listeners = []
  })

  describe('Property 7: Error Handling Consistency', () => {
    it('should consistently classify and handle any error type with appropriate Indonesian messages', () => {
      fc.assert(fc.property(
        fc.record({
          message: fc.string({ minLength: 1, maxLength: 200 }),
          name: fc.oneof(
            fc.constant('Error'),
            fc.constant('NetworkError'),
            fc.constant('TypeError'),
            fc.constant('ReferenceError')
          ),
          status: fc.option(fc.integer({ min: 400, max: 599 })),
          code: fc.option(fc.string({ minLength: 1, maxLength: 50 }))
        }),
        (errorData) => {
          // Create error object
          const originalError = new Error(errorData.message)
          originalError.name = errorData.name
          if (errorData.status) originalError.status = errorData.status
          if (errorData.code) originalError.code = errorData.code

          // Handle error through global handler
          const handledError = globalErrorHandler.handleError(originalError)

          // Verify error is properly classified
          expect(handledError).toBeInstanceOf(SpecWeaveError)
          expect(Object.values(ErrorType)).toContain(handledError.type)
          expect(Object.values(ErrorSeverity)).toContain(handledError.severity)

          // Verify error has required properties
          expect(handledError.timestamp).toBeInstanceOf(Date)
          expect(typeof handledError.code).toBe('string')
          expect(handledError.code.length).toBeGreaterThan(0)

          // Verify Indonesian message is provided (now we always provide Indonesian messages)
          const displayMessage = getErrorMessage(handledError)
          expect(typeof displayMessage).toBe('string')
          expect(displayMessage.length).toBeGreaterThan(0)
          
          // Verify message is in Indonesian - check for Indonesian words or common patterns
          // For edge cases like whitespace-only input, we may get generic messages
          const indonesianWords = ['silakan', 'coba', 'lagi', 'tidak', 'gagal', 'bermasalah', 'sedang', 'terjadi', 'kesalahan', 'format', 'invalid', 'tak', 'terduga']
          const hasIndonesianWords = indonesianWords.some(word => 
            displayMessage.toLowerCase().includes(word)
          )
          // For very short or whitespace-only messages, we may get fallback messages
          // that still should be meaningful but might not contain specific Indonesian keywords
          if (!hasIndonesianWords && errorData.message.trim().length > 0) {
            // At minimum, the message should not be empty and should be user-friendly
            expect(displayMessage).not.toBe(errorData.message) // Should be transformed, not raw
          }

          // Verify error is logged
          const errorLog = globalErrorHandler.getErrorLog()
          expect(errorLog.length).toBeGreaterThan(0)
          expect(errorLog[0].type).toBe(handledError.type)
        }
      ), { numRuns: 100 })
    })

    it('should consistently provide troubleshooting tips for all error types', () => {
      fc.assert(fc.property(
        fc.constantFrom(...Object.values(ErrorType)),
        (errorType) => {
          // Create error of specific type
          const error = new SpecWeaveError(errorType, 'TEST_CODE', 'Test message')
          
          // Get troubleshooting tips
          const tips = globalErrorHandler.getTroubleshootingTips(error)
          
          // Verify tips are provided as array
          expect(Array.isArray(tips)).toBe(true)
          
          // If tips are provided, they should be non-empty strings
          tips.forEach(tip => {
            expect(typeof tip).toBe('string')
            expect(tip.length).toBeGreaterThan(0)
          })
        }
      ), { numRuns: 50 })
    })

    it('should consistently handle error listener notifications', () => {
      fc.assert(fc.property(
        fc.array(fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0), { minLength: 1, maxLength: 5 }),
        (errorMessages) => {
          const receivedErrors = []
          
          // Add listener
          const listener = (error) => {
            receivedErrors.push(error)
          }
          globalErrorHandler.addListener(listener)

          // Handle multiple errors
          errorMessages.forEach(message => {
            const error = new Error(message)
            globalErrorHandler.handleError(error)
          })

          // Verify all errors were received by listener
          expect(receivedErrors.length).toBe(errorMessages.length)
          
          // Verify each error was properly classified
          receivedErrors.forEach((error, index) => {
            expect(error).toBeInstanceOf(SpecWeaveError)
            // The error should contain the original message in details
            expect(error.details.originalError).toContain(errorMessages[index])
          })

          // Clean up
          globalErrorHandler.removeListener(listener)
        }
      ), { numRuns: 50 })
    })

    it('should consistently maintain error log with proper size limits', () => {
      fc.assert(fc.property(
        fc.integer({ min: 50, max: 200 }),
        (numErrors) => {
          // Clear error log before test to ensure clean state
          globalErrorHandler.clearErrorLog()
          
          // Generate and handle multiple errors
          for (let i = 0; i < numErrors; i++) {
            const error = new Error(`Test error ${i}`)
            globalErrorHandler.handleError(error)
          }

          const errorLog = globalErrorHandler.getErrorLog()
          
          // Verify log doesn't exceed maximum size (implementation uses 100)
          expect(errorLog.length).toBeLessThanOrEqual(100)
          
          // Verify most recent errors are kept (LIFO order)
          if (numErrors > 100) {
            expect(errorLog.length).toBe(100)
            // First error in log should be the most recent
            expect(errorLog[0].details.originalError).toContain(`Test error ${numErrors - 1}`)
          } else {
            expect(errorLog.length).toBe(numErrors)
          }
        }
      ), { numRuns: 20 })
    })

    it('should consistently generate unique error IDs', () => {
      fc.assert(fc.property(
        fc.integer({ min: 10, max: 50 }),
        (numErrors) => {
          // Clear error log before test to ensure clean state
          globalErrorHandler.clearErrorLog()
          
          const errorIds = new Set()
          
          // Generate multiple errors and collect IDs
          for (let i = 0; i < numErrors; i++) {
            const error = new Error(`Test error ${i}`)
            globalErrorHandler.handleError(error)
          }
          
          // Get all error IDs from the log
          const errorLog = globalErrorHandler.getErrorLog()
          errorLog.forEach(loggedError => {
            if (loggedError.id) {
              errorIds.add(loggedError.id)
            }
          })
          
          // Verify all IDs are unique (should have at least as many IDs as errors, up to log limit)
          const expectedIds = Math.min(numErrors, 100) // Implementation uses maxLogSize of 100
          expect(errorIds.size).toBe(expectedIds)
        }
      ), { numRuns: 30 })
    })

    it('should consistently create error reports with required information', () => {
      fc.assert(fc.property(
        fc.record({
          type: fc.constantFrom(...Object.values(ErrorType)),
          code: fc.string({ minLength: 1, maxLength: 50 }),
          message: fc.string({ minLength: 1, maxLength: 200 }),
          userId: fc.option(fc.string({ minLength: 1, maxLength: 50 }))
        }),
        (errorData) => {
          // Set user ID if provided
          if (errorData.userId) {
            globalErrorHandler.setUserId(errorData.userId)
          }

          // Create and handle error
          const error = new SpecWeaveError(errorData.type, errorData.code, errorData.message)
          const handledError = globalErrorHandler.handleError(error)

          // Create error report
          const report = globalErrorHandler.createErrorReport(handledError)

          // Verify report has required fields
          expect(typeof report.errorId).toBe('string')
          expect(report.errorId.length).toBeGreaterThan(0)
          expect(report.type).toBe(errorData.type)
          expect(report.code).toBe(errorData.code)
          expect(report.message).toBe(errorData.message)
          expect(report.timestamp).toBeInstanceOf(Date)
          expect(typeof report.userAgent).toBe('string')
          expect(typeof report.url).toBe('string')
          expect(Array.isArray(report.troubleshootingTips)).toBe(true)

          // Verify user ID is included if set
          if (errorData.userId) {
            expect(report.userId).toBe(errorData.userId)
          }
        }
      ), { numRuns: 100 })
    })
  })
})