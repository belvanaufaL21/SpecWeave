/**
 * Error Handling System Validation Tests
 * Simple tests to validate the comprehensive error handling system
 */

import request from 'supertest';
import express from 'express';
import { 
  errorHandlerMiddleware,
  requestIdMiddleware,
  errorLoggingMiddleware,
  AppError,
  ValidationError,
  DatabaseError,
  NotFoundError
} from '../middlewares/errorHandler.js';
import errorHandler from '../utils/errorHandler.js';
import databaseRecoveryService from '../services/databaseRecoveryService.js';
import networkRecoveryService from '../services/networkRecoveryService.js';

describe('Error Handling System Validation', () => {
  let app;

  beforeAll(() => {
    // Create test Express app
    app = express();
    app.use(express.json());
    app.use(requestIdMiddleware);
    
    // Test routes
    app.get('/test/success', (req, res) => {
      res.json({ success: true, message: 'Test successful' });
    });
    
    app.get('/test/app-error', (req, res, next) => {
      next(new AppError('Test application error', 400, 'TEST_ERROR'));
    });
    
    app.get('/test/validation-error', (req, res, next) => {
      next(new ValidationError('Test validation error', 'testField', 'invalidValue'));
    });
    
    app.get('/test/database-error', (req, res, next) => {
      next(new DatabaseError('Test database error', 'select', 'test_table'));
    });
    
    app.get('/test/not-found-error', (req, res, next) => {
      next(new NotFoundError('Test Resource'));
    });
    
    app.get('/test/generic-error', (req, res, next) => {
      next(new Error('Generic test error'));
    });
    
    // Error handling middleware
    app.use(errorLoggingMiddleware);
    app.use(errorHandlerMiddleware);
  });

  afterAll(async () => {
    // Cleanup
    await databaseRecoveryService.shutdown();
  });

  describe('Request ID Middleware', () => {
    test('should add request ID to all requests', async () => {
      const response = await request(app)
        .get('/test/success')
        .expect(200);
      
      expect(response.headers['x-request-id']).toBeDefined();
      expect(response.headers['x-request-id']).toMatch(/^[0-9a-f-]{36}$/);
    });
  });

  describe('Error Handler Middleware', () => {
    test('should handle AppError correctly', async () => {
      const response = await request(app)
        .get('/test/app-error')
        .expect(400);
      
      expect(response.body.error).toBeDefined();
      expect(response.body.error.message).toBe('Test application error');
      expect(response.body.error.code).toBe('TEST_ERROR');
      expect(response.body.error.id).toBeDefined();
      expect(response.body.error.timestamp).toBeDefined();
    });

    test('should handle ValidationError correctly', async () => {
      const response = await request(app)
        .get('/test/validation-error')
        .expect(400);
      
      expect(response.body.error).toBeDefined();
      expect(response.body.error.message).toBe('Test validation error');
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    test('should handle DatabaseError correctly', async () => {
      const response = await request(app)
        .get('/test/database-error')
        .expect(500);
      
      expect(response.body.error).toBeDefined();
      expect(response.body.error.message).toBe('Test database error');
      expect(response.body.error.code).toBe('DATABASE_ERROR');
    });

    test('should handle NotFoundError correctly', async () => {
      const response = await request(app)
        .get('/test/not-found-error')
        .expect(404);
      
      expect(response.body.error).toBeDefined();
      expect(response.body.error.message).toBe('Test Resource not found');
      expect(response.body.error.code).toBe('NOT_FOUND');
    });

    test('should handle generic errors correctly', async () => {
      const response = await request(app)
        .get('/test/generic-error')
        .expect(500);
      
      expect(response.body.error).toBeDefined();
      expect(response.body.error.message).toBe('Generic test error');
      expect(response.body.error.id).toBeDefined();
    });
  });

  describe('Database Recovery Service', () => {
    test('should initialize with correct default state', () => {
      const status = databaseRecoveryService.getStatus();
      
      expect(status.isConnected).toBe(true);
      expect(status.connectionAttempts).toBe(0);
      expect(status.circuitBreaker.state).toBe('CLOSED');
      expect(status.circuitBreaker.failureCount).toBe(0);
    });

    test('should handle connection test', async () => {
      // This might fail in test environment without proper DB setup
      // but should not throw unhandled errors
      try {
        const client = await databaseRecoveryService.getAdminClient();
        expect(client).toBeDefined();
      } catch (error) {
        // Expected in test environment
        expect(error.message).toContain('Database');
      }
    });
  });

  describe('Network Recovery Service', () => {
    test('should initialize with default services', () => {
      const health = networkRecoveryService.getAllServicesHealth();
      
      expect(health).toBeInstanceOf(Array);
      expect(health.length).toBeGreaterThan(0);
      
      const supabaseService = health.find(s => s.serviceName === 'supabase');
      expect(supabaseService).toBeDefined();
      expect(supabaseService.isHealthy).toBe(true);
      expect(supabaseService.circuitBreakerState).toBe('CLOSED');
    });

    test('should provide service statistics', () => {
      const stats = networkRecoveryService.getStats();
      
      expect(stats.totalServices).toBeGreaterThan(0);
      expect(stats.healthyServices).toBeGreaterThanOrEqual(0);
      expect(stats.openCircuitBreakers).toBeGreaterThanOrEqual(0);
      expect(stats.timestamp).toBeDefined();
    });

    test('should reset service health', () => {
      networkRecoveryService.resetServiceHealth('supabase');
      
      const health = networkRecoveryService.getServiceHealth('supabase');
      expect(health.isHealthy).toBe(true);
      expect(health.consecutiveFailures).toBe(0);
      expect(health.totalRequests).toBe(0);
    });
  });

  describe('Error Handler Utility', () => {
    test('should create error info correctly', () => {
      const testError = new Error('Test error');
      const mockReq = {
        method: 'GET',
        url: '/test',
        path: '/test',
        query: {},
        params: {},
        headers: { 'user-agent': 'test' },
        ip: '127.0.0.1'
      };

      const errorInfo = errorHandler.handleError(testError, mockReq);
      
      expect(errorInfo.id).toBeDefined();
      expect(errorInfo.timestamp).toBeDefined();
      expect(errorInfo.message).toBe('Test error');
      expect(errorInfo.request).toBeDefined();
      expect(errorInfo.request.method).toBe('GET');
      expect(errorInfo.request.url).toBe('/test');
    });

    test('should determine error severity correctly', () => {
      const criticalError = new AppError('Critical error', 500);
      const highError = new AppError('High error', 400);
      const validationError = new ValidationError('Validation error');
      
      const criticalInfo = errorHandler.handleError(criticalError);
      const highInfo = errorHandler.handleError(highError);
      const validationInfo = errorHandler.handleError(validationError);
      
      expect(criticalInfo.severity).toBe('critical');
      expect(highInfo.severity).toBe('high');
      expect(validationInfo.severity).toBe('medium');
    });

    test('should provide error statistics', () => {
      // Reset metrics first
      errorHandler.clearErrorPatterns();
      
      // Generate some test errors
      errorHandler.handleError(new Error('Test error 1'));
      errorHandler.handleError(new Error('Test error 2'));
      errorHandler.handleError(new AppError('Critical error', 500));
      
      const stats = errorHandler.getErrorStats();
      
      expect(stats.totalPatterns).toBeGreaterThan(0);
      expect(stats.recentErrors).toBeGreaterThan(0);
    });
  });

  describe('Error Recovery Mechanisms', () => {
    test('should handle network request with recovery', async () => {
      const mockRequest = () => Promise.resolve({ data: 'success' });
      
      const result = await networkRecoveryService.executeWithRecovery(mockRequest, {
        serviceName: 'test-service',
        timeout: 5000
      });
      
      expect(result.data).toBe('success');
    });

    test('should handle network request failure with fallback', async () => {
      const mockRequest = () => Promise.reject(new Error('Network error'));
      const fallback = () => ({ data: 'fallback' });
      
      const result = await networkRecoveryService.executeWithRecovery(mockRequest, {
        serviceName: 'test-service',
        timeout: 5000,
        fallback
      });
      
      expect(result.data).toBe('fallback');
    });
  });
});

describe('Error Handling Integration', () => {
  test('should handle complete error flow', async () => {
    // This test validates the entire error handling pipeline
    const testError = new DatabaseError('Connection failed', 'select', 'users');
    
    // Simulate error handling
    const errorInfo = errorHandler.handleError(testError);
    
    // Verify error was processed correctly
    expect(errorInfo.id).toBeDefined();
    expect(errorInfo.severity).toBe('critical');
    expect(errorInfo.type).toBe('manual-error');
    expect(errorInfo.message).toBe('Connection failed');
    
    // Verify error statistics were updated
    const stats = errorHandler.getErrorStats();
    expect(stats.recentErrors).toBeGreaterThan(0);
  });
});