/**
 * Unit tests for ErrorRecovery utility
 * Tests error handling and recovery strategies
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import ErrorRecovery from '../ErrorRecovery.js';
import { ErrorType } from '../errorTypes.js';

describe('ErrorRecovery', () => {
  beforeEach(() => {
    // Clear console mocks
    vi.clearAllMocks();
  });

  describe('handleNetworkError', () => {
    it('should return user-friendly message for network errors', () => {
      const error = new Error('Network request failed');
      const result = ErrorRecovery.handleNetworkError(error, 'TEST');

      expect(result.success).toBe(false);
      expect(result.type).toBe(ErrorType.NETWORK);
      expect(result.userMessage).toBe('Error jaringan - silakan periksa koneksi Anda');
      expect(result.canRetry).toBe(true);
      expect(result.retryDelay).toBe(3000);
    });

    it('should include technical details', () => {
      const error = new Error('Connection timeout');
      const result = ErrorRecovery.handleNetworkError(error);

      expect(result.technicalDetails).toBe('Connection timeout');
    });
  });

  describe('handleAuthError', () => {
    it('should return user-friendly message for auth errors', () => {
      const error = new Error('Unauthorized');
      const result = ErrorRecovery.handleAuthError(error, 'TEST');

      expect(result.success).toBe(false);
      expect(result.type).toBe(ErrorType.AUTHENTICATION);
      expect(result.userMessage).toBe('Autentikasi gagal - silakan login kembali');
      expect(result.canRetry).toBe(false);
      expect(result.shouldRedirect).toBe(true);
      expect(result.redirectTo).toBe('/login');
    });
  });

  describe('handleServiceError', () => {
    it('should return user-friendly message for service errors', () => {
      const error = new Error('Service unavailable');
      const result = ErrorRecovery.handleServiceError(error, 'TEST');

      expect(result.success).toBe(false);
      expect(result.type).toBe(ErrorType.SERVER);
      expect(result.userMessage).toBe('Layanan sementara tidak tersedia - silakan coba lagi');
      expect(result.canRetry).toBe(true);
      expect(result.retryDelay).toBe(5000);
    });
  });

  describe('handleUnexpectedError', () => {
    it('should return generic message for unexpected errors', () => {
      const error = new Error('Something went wrong');
      const result = ErrorRecovery.handleUnexpectedError(error, 'TEST');

      expect(result.success).toBe(false);
      expect(result.type).toBe(ErrorType.UNKNOWN);
      expect(result.userMessage).toBe('Terjadi kesalahan - silakan coba lagi');
      expect(result.canRetry).toBe(true);
    });

    it('should log full technical details', () => {
      const error = new Error('Detailed error');
      error.stack = 'Error stack trace';
      const result = ErrorRecovery.handleUnexpectedError(error);

      expect(result.technicalDetails).toBe('Detailed error');
    });
  });

  describe('categorizeError', () => {
    it('should categorize network errors', () => {
      const error = new Error('Failed to fetch');
      const type = ErrorRecovery.categorizeError(error);

      expect(type).toBe(ErrorType.NETWORK);
    });

    it('should categorize auth errors by status code', () => {
      const error = new Error('Unauthorized');
      error.status = 401;
      const type = ErrorRecovery.categorizeError(error);

      expect(type).toBe(ErrorType.AUTHENTICATION);
    });

    it('should categorize server errors by status code', () => {
      const error = new Error('Internal server error');
      error.status = 500;
      const type = ErrorRecovery.categorizeError(error);

      expect(type).toBe(ErrorType.SERVER);
    });

    it('should categorize JIRA errors', () => {
      const error = new Error('JIRA API authentication failed');
      const type = ErrorRecovery.categorizeError(error);

      expect(type).toBe(ErrorType.JIRA_INTEGRATION);
    });

    it('should return UNKNOWN for unrecognized errors', () => {
      const error = new Error('Random error');
      const type = ErrorRecovery.categorizeError(error);

      expect(type).toBe(ErrorType.UNKNOWN);
    });
  });

  describe('handleError', () => {
    it('should route to appropriate handler based on error type', async () => {
      const networkError = new Error('Network failed');
      const result = await ErrorRecovery.handleError(networkError);

      expect(result.type).toBe(ErrorType.NETWORK);
      expect(result.userMessage).toBe('Error jaringan - silakan periksa koneksi Anda');
    });

    it('should handle auth errors', async () => {
      const authError = new Error('Unauthorized');
      authError.status = 401;
      const result = await ErrorRecovery.handleError(authError);

      expect(result.type).toBe(ErrorType.AUTHENTICATION);
      expect(result.shouldRedirect).toBe(true);
    });

    it('should handle server errors', async () => {
      const serverError = new Error('Server error');
      serverError.status = 503;
      const result = await ErrorRecovery.handleError(serverError);

      expect(result.type).toBe(ErrorType.SERVER);
      expect(result.canRetry).toBe(true);
    });
  });

  describe('handleJiraError', () => {
    it('should return JIRA-specific error message', () => {
      const error = new Error('JIRA API failed');
      const result = ErrorRecovery.handleJiraError(error, 'Test connection');

      expect(result.success).toBe(false);
      expect(result.type).toBe(ErrorType.JIRA_INTEGRATION);
      expect(result.userMessage).toContain('Test connection gagal');
      expect(result.canRetry).toBe(true);
    });
  });

  describe('handleValidationError', () => {
    it('should return validation-specific error message', () => {
      const error = new Error('Invalid input');
      const result = ErrorRecovery.handleValidationError(error, 'TEST');

      expect(result.success).toBe(false);
      expect(result.type).toBe(ErrorType.VALIDATION);
      expect(result.canRetry).toBe(false);
      expect(result.recoveryAction).toBe('fix_input');
    });
  });

  describe('wrapWithErrorHandling', () => {
    it('should wrap function with error handling', async () => {
      const fn = async () => {
        throw new Error('Test error');
      };

      const wrapped = ErrorRecovery.wrapWithErrorHandling(fn, 'TEST');

      await expect(wrapped()).rejects.toThrow('Terjadi kesalahan - silakan coba lagi');
    });

    it('should return result on success', async () => {
      const fn = async () => 'success';
      const wrapped = ErrorRecovery.wrapWithErrorHandling(fn, 'TEST');

      const result = await wrapped();
      expect(result).toBe('success');
    });
  });

  describe('retryWithBackoff', () => {
    it('should retry operation on failure', async () => {
      let attempts = 0;
      const operation = async () => {
        attempts++;
        if (attempts < 3) {
          throw new Error('Temporary failure');
        }
        return 'success';
      };

      const result = await ErrorRecovery.retryWithBackoff(operation, 3, 100, 'TEST');
      expect(result).toBe('success');
      expect(attempts).toBe(3);
    });

    it('should return error result after max retries', async () => {
      const operation = async () => {
        throw new Error('Persistent failure');
      };

      const result = await ErrorRecovery.retryWithBackoff(operation, 2, 100, 'TEST');
      expect(result.success).toBe(false);
      expect(result.userMessage).toBe('Terjadi kesalahan - silakan coba lagi');
    });
  });
});
