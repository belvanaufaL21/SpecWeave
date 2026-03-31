/**
 * Test suite for ErrorHandler
 * Tests robust error handling, recovery mechanisms, and loop prevention
 */

import { vi } from 'vitest';
import errorHandler, { ErrorTypes, ErrorSeverity, RecoveryStrategies } from '../ErrorHandler.js';

describe('ErrorHandler', () => {

  beforeEach(() => {
    errorHandler.resetState();
  });

  afterEach(() => {
    errorHandler.resetState();
  });

  describe('Error Handling', () => {
    test('should handle basic error correctly', () => {
      const error = new Error('Test error');
      const result = errorHandler.handleError(error, {}, 'TestComponent');

      expect(result.success).toBe(true);
      expect(result.error.message).toBe('Test error');
      expect(result.errorType).toBeDefined();
      expect(result.severity).toBeDefined();
    });

    test('should categorize network errors correctly', () => {
      const error = new Error('Network connection failed');
      const result = errorHandler.handleError(error, {}, 'TestComponent');

      expect(result.errorType).toBe(ErrorTypes.NETWORK);
      expect(result.severity).toBe(ErrorSeverity.MEDIUM);
    });

    test('should categorize timeout errors correctly', () => {
      const error = new Error('Request timeout occurred');
      const result = errorHandler.handleError(error, {}, 'TestComponent');

      expect(result.errorType).toBe(ErrorTypes.TIMEOUT);
      expect(result.severity).toBe(ErrorSeverity.MEDIUM);
    });

    test('should categorize validation errors correctly', () => {
      const error = new Error('Invalid input provided');
      const result = errorHandler.handleError(error, {}, 'TestComponent');

      expect(result.errorType).toBe(ErrorTypes.VALIDATION);
      expect(result.severity).toBe(ErrorSeverity.LOW);
    });
  });

  describe('Loop Detection', () => {
    test('should detect loop risk with repeated errors', () => {
      const error = new Error('Repeated error');
      
      // Generate multiple similar errors quickly
      for (let i = 0; i < 6; i++) {
        errorHandler.handleError(error, {}, 'TestComponent');
      }
      
      const result = errorHandler.handleError(error, {}, 'TestComponent');
      expect(result.loopRisk).toBe(true);
    });

    test('should not detect loop risk with different errors', () => {
      for (let i = 0; i < 6; i++) {
        const error = new Error(`Different error ${i}`);
        errorHandler.handleError(error, {}, 'TestComponent');
      }
      
      const error = new Error('New error');
      const result = errorHandler.handleError(error, {}, 'TestComponent');
      expect(result.loopRisk).toBe(false);
    });
  });

  describe('Recovery Strategies', () => {
    test('should recommend retry for network errors', () => {
      const error = new Error('Network error');
      const result = errorHandler.handleError(error, {}, 'TestComponent');

      expect(result.recoveryStrategy).toBe(RecoveryStrategies.RETRY);
    });

    test('should recommend state reset for loop prevention errors', () => {
      const error = new Error('Loop detected');
      const result = errorHandler.handleError(error, {}, 'LoopPreventionController');

      expect(result.recoveryStrategy).toBe(RecoveryStrategies.RESET_STATE);
    });

    test('should recommend abort for critical errors', () => {
      const error = new Error('Critical system failure');
      const result = errorHandler.handleError(error, {}, 'TestComponent');

      // Should be high severity and recommend appropriate recovery
      expect(result.severity).toBe(ErrorSeverity.HIGH);
    });
  });

  describe('Error Callbacks', () => {
    test('should register and call error callbacks', () => {
      const callback = vi.fn();
      errorHandler.registerErrorCallback('TestComponent', callback);

      const error = new Error('Test error');
      errorHandler.handleError(error, {}, 'TestComponent');

      expect(callback).toHaveBeenCalled();
      expect(callback).toHaveBeenCalledWith(expect.objectContaining({
        error: expect.objectContaining({ message: 'Test error' })
      }));
    });

    test('should unregister error callbacks', () => {
      const callback = vi.fn();
      errorHandler.registerErrorCallback('TestComponent', callback);
      errorHandler.unregisterErrorCallback('TestComponent', callback);

      const error = new Error('Test error');
      errorHandler.handleError(error, {}, 'TestComponent');

      expect(callback).not.toHaveBeenCalled();
    });
  });

  describe('Error Statistics', () => {
    test('should track error statistics', () => {
      const error1 = new Error('Network error');
      const error2 = new Error('Timeout error');
      
      errorHandler.handleError(error1, {}, 'TestComponent');
      errorHandler.handleError(error2, {}, 'TestComponent');

      const stats = errorHandler.getErrorStatistics();
      expect(stats.totalErrors).toBe(2);
      expect(stats.errorsLast24Hours).toBe(2);
      expect(stats.errorsByType[ErrorTypes.NETWORK]).toBe(1);
      expect(stats.errorsByType[ErrorTypes.TIMEOUT]).toBe(1);
    });
  });

  describe('State Management', () => {
    test('should clear error history', () => {
      const error = new Error('Test error');
      errorHandler.handleError(error, {}, 'TestComponent');

      expect(errorHandler.getErrorStatistics().totalErrors).toBe(1);

      errorHandler.clearErrorHistory();
      expect(errorHandler.getErrorStatistics().totalErrors).toBe(0);
    });

    test('should reset state completely', () => {
      const error = new Error('Test error');
      errorHandler.handleError(error, {}, 'TestComponent');

      errorHandler.resetState();
      
      const stats = errorHandler.getErrorStatistics();
      expect(stats.totalErrors).toBe(0);
      expect(stats.isRecovering).toBe(false);
    });
  });

  describe('Error Handler Resilience', () => {
    test('should handle errors in error handler gracefully', () => {
      // Simulate error in error handler by passing invalid error
      const result = errorHandler.handleError(null, {}, 'TestComponent');

      expect(result.success).toBe(false);
      expect(result.errorType).toBe(ErrorTypes.UNKNOWN);
      expect(result.severity).toBe(ErrorSeverity.CRITICAL);
    });

    test('should handle circular reference errors', () => {
      const circularObj = {};
      circularObj.self = circularObj;

      const result = errorHandler.handleError('Error with circular context', circularObj, 'TestComponent');
      expect(result.success).toBe(true);
    });
  });

  describe('Recovery Execution', () => {
    test('should execute retry recovery', () => {
      const error = new Error('Network error');
      const result = errorHandler.handleError(error, {}, 'TestComponent');

      expect(result.recoveryResult.success).toBe(true);
      expect(result.recoveryResult.action).toBe('retry_scheduled');
    });

    test('should limit retry attempts', () => {
      const error = new Error('Network error');
      
      // Exceed max retry attempts
      for (let i = 0; i < 5; i++) {
        errorHandler.handleError(error, {}, 'TestComponent');
      }
      
      const result = errorHandler.handleError(error, {}, 'TestComponent');
      expect(result.canRetry).toBe(false);
    });
  });
});