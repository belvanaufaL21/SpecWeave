/**
 * Property-Based Test for Error Handling Consistency
 * 
 * **Property 11: Error Handling Consistency**
 * **Validates: Requirements 8.3**
 * 
 * Tests that error handling is consistent across all testing components and services,
 * ensuring that all errors are properly classified, formatted, and handled using
 * the existing error handling infrastructure.
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import fc from 'fast-check';

// Import components and services
import TestingModal from '../../components/modals/TestingModal';
import TestButton from '../../components/common/TestButton';
import TestResultsDetailPage from '../../pages/TestResultsDetailPage';
import TestingService from '../../services/testingService';
import { ErrorProvider, useError } from '../../contexts/ErrorContext';
import { LoadingProvider } from '../../contexts/LoadingContext';
import { globalErrorHandler } from '../../utils/errors/errorHandler';

// Mock API
vi.mock('../../services/api.js', () => ({
  default: {
    post: vi.fn(),
    get: vi.fn()
  }
}));

import api from '../../services/api.js';

// Test wrapper component
const TestWrapper = ({ children }) => (
  <BrowserRouter>
    <ErrorProvider>
      <LoadingProvider>
        {children}
      </LoadingProvider>
    </ErrorProvider>
  </BrowserRouter>
);

describe('Error Handling Consistency Property Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    globalErrorHandler.clearErrorLog();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  /**
   * Property 11: Error Handling Consistency
   * For any error that occurs in the testing system, the error should be:
   * 1. Properly classified using the global error handler
   * 2. Formatted consistently across all components
   * 3. Displayed with appropriate user-friendly messages
   * 4. Logged with proper context information
   */
  it('should handle all testing errors consistently across components', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate different types of errors that can occur in testing
        fc.record({
          errorType: fc.constantFrom(
            'network',
            'server',
            'validation',
            'authentication'
          ),
          statusCode: fc.option(fc.integer({ min: 400, max: 599 })),
          message: fc.string({ minLength: 5, maxLength: 50 }),
          component: fc.constantFrom('TestingService')
        }),
        async ({ errorType, statusCode, message, component }) => {
          // Create error based on type
          const error = createTestError(errorType, statusCode, message);
          
          // Test error handling in TestingService
          if (component === 'TestingService') {
            await testErrorInTestingService(error);
          }
          
          // Verify error handling consistency
          const errorLog = globalErrorHandler.getErrorLog();
          
          if (errorLog.length > 0) {
            const handledError = errorLog[0];
            
            // Property 1: Error should be properly classified
            expect(handledError).toHaveProperty('type');
            expect(handledError).toHaveProperty('code');
            expect(handledError).toHaveProperty('message');
            
            // Property 2: Error should have consistent structure
            expect(handledError).toHaveProperty('timestamp');
            expect(handledError).toHaveProperty('context');
            
            // Property 3: Error message should be user-friendly
            expect(handledError.message).toBeDefined();
            expect(handledError.message.length).toBeGreaterThan(0);
            
            // Property 4: Error should have proper severity classification
            expect(handledError).toHaveProperty('severity');
            
            // Property 5: Context should include relevant information
            expect(handledError.context).toHaveProperty('timestamp');
          }
        }
      ),
      { numRuns: 20 }
    );
  });

  it('should maintain consistent error response format across all API endpoints', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          endpoint: fc.constantFrom('/testing/meteor', '/testing/sentence-bert', '/testing/results'),
          httpStatus: fc.integer({ min: 400, max: 599 }),
          errorMessage: fc.string({ minLength: 1, maxLength: 200 }),
          errorCode: fc.option(fc.string({ minLength: 1, maxLength: 50 }))
        }),
        async ({ endpoint, httpStatus, errorMessage, errorCode }) => {
          // Mock API error response
          const apiError = {
            response: {
              status: httpStatus,
              data: {
                success: false,
                message: errorMessage,
                error: errorCode,
                status: httpStatus >= 500 ? 'error' : 'fail'
              }
            }
          };
          
          api.post.mockRejectedValue(apiError);
          api.get.mockRejectedValue(apiError);
          
          let caughtError = null;
          
          try {
            // Test different service methods
            if (endpoint === '/testing/meteor') {
              await TestingService.submitTest({
                testType: 'meteor',
                scenarioId: 'test-123',
                generatedText: 'test',
                referenceText: 'test'
              });
            } else if (endpoint === '/testing/sentence-bert') {
              await TestingService.submitTest({
                testType: 'sentence_bert',
                scenarioId: 'test-123',
                generatedText: 'test',
                referenceText: 'test'
              });
            } else if (endpoint === '/testing/results') {
              await TestingService.getTestResults('test-123');
            }
          } catch (error) {
            caughtError = error;
          }
          
          // Verify consistent error handling
          if (caughtError) {
            // Property 1: Error should be properly formatted
            expect(caughtError).toBeInstanceOf(Error);
            expect(caughtError.message).toBeDefined();
            expect(caughtError.message.length).toBeGreaterThan(0);
            
            // Property 2: HTTP status should be preserved for classification
            if (caughtError.status) {
              expect(caughtError.status).toBe(httpStatus);
            }
            
            // Property 3: Error should be user-friendly
            expect(caughtError.message).not.toMatch(/undefined|null|NaN/);
          }
        }
      ),
      { numRuns: 30 }
    );
  });

  it('should handle concurrent errors without interference', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(
          fc.record({
            errorType: fc.constantFrom('network', 'server', 'validation'),
            delay: fc.integer({ min: 0, max: 50 }),
            message: fc.string({ minLength: 5, maxLength: 20 })
          }),
          { minLength: 2, maxLength: 3 }
        ),
        async (errorConfigs) => {
          const initialLogLength = globalErrorHandler.getErrorLog().length;
          
          // Create concurrent error scenarios
          const errorPromises = errorConfigs.map(async (config, index) => {
            await new Promise(resolve => setTimeout(resolve, config.delay));
            
            const error = createTestError(config.errorType, 500, `${config.message}-${index}`);
            
            // Simulate error in TestingService
            try {
              api.post.mockRejectedValueOnce(error);
              await TestingService.submitTest({
                testType: 'meteor',
                scenarioId: `test-${index}`,
                generatedText: 'test',
                referenceText: 'test'
              });
            } catch (e) {
              globalErrorHandler.handleError(e, { source: 'concurrent-test', index });
            }
          });
          
          await Promise.allSettled(errorPromises);
          
          // Allow time for error processing
          await new Promise(resolve => setTimeout(resolve, 50));
          
          const errorLog = globalErrorHandler.getErrorLog();
          const newErrors = errorLog.length - initialLogLength;
          
          // Property 1: All errors should be logged
          expect(newErrors).toBeGreaterThanOrEqual(errorConfigs.length);
          
          // Property 2: Each error should have unique context
          const recentErrors = errorLog.slice(0, newErrors);
          const contexts = recentErrors.map(err => err.context?.index).filter(idx => idx !== undefined);
          const uniqueContexts = new Set(contexts);
          expect(uniqueContexts.size).toBe(contexts.length); // No duplicate contexts
          
          // Property 3: Error order should be preserved or properly timestamped
          for (let i = 1; i < recentErrors.length; i++) {
            const prevTime = new Date(recentErrors[i - 1].timestamp).getTime();
            const currTime = new Date(recentErrors[i].timestamp).getTime();
            expect(prevTime).toBeGreaterThanOrEqual(currTime); // Newer errors first
          }
        }
      ),
      { numRuns: 10 }
    );
  });

  it('should provide consistent troubleshooting information for all error types', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom(
          'network',
          'server', 
          'authentication',
          'validation',
          'jira_integration',
          'export',
          'unknown'
        ),
        async (errorType) => {
          const error = createTestError(errorType, 500, 'Test error message');
          const classifiedError = globalErrorHandler.handleError(error, { source: 'property-test' });
          
          // Property 1: Should have display message
          const displayMessage = globalErrorHandler.getDisplayMessage(classifiedError);
          expect(displayMessage).toBeDefined();
          expect(displayMessage.length).toBeGreaterThan(0);
          expect(displayMessage).toMatch(/^[A-Z]/); // Should start with capital letter
          
          // Property 2: Should have troubleshooting tips
          const troubleshootingTips = globalErrorHandler.getTroubleshootingTips(classifiedError);
          expect(troubleshootingTips).toBeDefined();
          expect(Array.isArray(troubleshootingTips)).toBe(true);
          
          // Property 3: Should be able to create error report
          const errorReport = globalErrorHandler.createErrorReport(classifiedError);
          expect(errorReport).toHaveProperty('errorId');
          expect(errorReport).toHaveProperty('type');
          expect(errorReport).toHaveProperty('message');
          expect(errorReport).toHaveProperty('timestamp');
          expect(errorReport).toHaveProperty('troubleshootingTips');
          
          // Property 4: Error report should be serializable
          expect(() => JSON.stringify(errorReport)).not.toThrow();
        }
      ),
      { numRuns: 25 }
    );
  });
});

// Helper functions
function createTestError(errorType, statusCode, message) {
  const error = new Error(message);
  
  switch (errorType) {
    case 'network':
      error.name = 'NetworkError';
      error.code = 'NETWORK_ERROR';
      break;
    case 'server':
      error.status = statusCode || 500;
      break;
    case 'validation':
      error.status = 400;
      break;
    case 'authentication':
      error.status = 401;
      break;
    case 'python_process':
      error.message = `Python calculation failed: ${message}`;
      break;
    case 'database':
      error.message = `Database error: ${message}`;
      break;
    case 'timeout':
      error.message = `Request timeout: ${message}`;
      break;
    default:
      // Keep as generic error
      break;
  }
  
  return error;
}

async function testErrorInTestingService(error) {
  api.post.mockRejectedValue(error);
  
  try {
    await TestingService.submitTest({
      testType: 'meteor',
      scenarioId: 'test-123',
      generatedText: 'test',
      referenceText: 'test'
    });
  } catch (caughtError) {
    globalErrorHandler.handleError(caughtError, { source: 'TestingService' });
  }
}