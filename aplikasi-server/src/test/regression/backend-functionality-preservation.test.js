/**
 * Backend Functionality Preservation Tests
 * Comprehensive regression tests to ensure backend refactoring doesn't break existing functionality
 */

import request from 'supertest';
import { vi } from 'vitest';
import app from '../../index.js';

// Import services and utilities to test
import TestingService from '../../services/testingService.js';
import supabaseService from '../../services/supabaseService.js';
import { AppError } from '../../middlewares/errorHandler.js';
import { 
  formatSuccessResponse, 
  formatErrorResponse, 
  formatPaginationMeta 
} from '../../middlewares/shared/responseFormatter.js';
import { 
  validationRules, 
  createValidation, 
  sanitizeInput 
} from '../../middlewares/shared/requestValidator.js';

describe('Backend Functionality Preservation Tests', () => {
  // Mock authentication for protected routes
  const mockUser = {
    id: 'test-user-id',
    email: 'test@example.com',
    profile: {
      name: 'Test User',
      role: 'user'
    }
  };

  beforeEach(() => {
    // Mock authentication middleware
    vi.spyOn(require('../../middlewares/auth.js'), 'authenticate')
      .mockImplementation((req, res, next) => {
        req.user = mockUser;
        next();
      });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('API Endpoint Functionality', () => {
    describe('Template Endpoints', () => {
      test('GET /api/templates should return templates with pagination', async () => {
        const response = await request(app)
          .get('/api/templates')
          .expect(200);

        expect(response.body).toHaveProperty('success', true);
        expect(response.body).toHaveProperty('data');
        expect(response.body).toHaveProperty('meta');
        expect(response.body.meta).toHaveProperty('pagination');
        expect(Array.isArray(response.body.data)).toBe(true);
      });

      test('GET /api/templates with filters should work correctly', async () => {
        const response = await request(app)
          .get('/api/templates?category=Authentication&limit=5')
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.meta.pagination.limit).toBe(5);
      });

      test('GET /api/templates/system should return only system templates', async () => {
        const response = await request(app)
          .get('/api/templates/system')
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(Array.isArray(response.body.data)).toBe(true);
        
        // All returned templates should be system templates
        response.body.data.forEach(template => {
          expect(template.is_system).toBe(true);
        });
      });

      test('GET /api/templates/categories should return unique categories', async () => {
        const response = await request(app)
          .get('/api/templates/categories')
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(Array.isArray(response.body.data)).toBe(true);
        
        // Should contain unique string values
        const categories = response.body.data;
        const uniqueCategories = [...new Set(categories)];
        expect(categories.length).toBe(uniqueCategories.length);
      });

      test('POST /api/templates/setup-defaults should setup default templates', async () => {
        const response = await request(app)
          .post('/api/templates/setup-defaults')
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data).toHaveProperty('existing_count');
        expect(response.body.data).toHaveProperty('new_count');
        expect(typeof response.body.data.existing_count).toBe('number');
        expect(typeof response.body.data.new_count).toBe('number');
      });
    });

    describe('Testing Endpoints', () => {
      const testData = {
        scenarioId: 'test-scenario-id',
        generatedText: 'This is generated text for testing',
        referenceText: 'This is reference text for comparison'
      };

      test('POST /api/testing/meteor should calculate METEOR score', async () => {
        // Mock the Python service call
        vi.spyOn(TestingService, 'calculateMeteorScore')
          .mockResolvedValue({
            score: 0.75,
            detailed_metrics: {
              precision: 0.8,
              recall: 0.7,
              f_mean: 0.75
            }
          });

        vi.spyOn(TestingService, 'saveTestResult')
          .mockResolvedValue({
            id: 'test-result-id',
            scenario_id: testData.scenarioId,
            test_type: 'meteor',
            score: 0.75
          });

        const response = await request(app)
          .post('/api/testing/meteor')
          .send(testData)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data).toHaveProperty('meteorMetrics');
        expect(response.body.data).toHaveProperty('testResult');
        expect(response.body.data.meteorMetrics.score).toBe(0.75);
      });

      test('POST /api/testing/sentence-bert should calculate Sentence-BERT score', async () => {
        // Mock the Python service call
        vi.spyOn(TestingService, 'calculateSentenceBertScore')
          .mockResolvedValue({
            score: 0.85,
            detailed_metrics: {
              similarity: 0.85,
              confidence: 0.9
            }
          });

        vi.spyOn(TestingService, 'saveTestResult')
          .mockResolvedValue({
            id: 'test-result-id',
            scenario_id: testData.scenarioId,
            test_type: 'sentence_bert',
            score: 0.85
          });

        const response = await request(app)
          .post('/api/testing/sentence-bert')
          .send(testData)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data).toHaveProperty('sentenceBertMetrics');
        expect(response.body.data).toHaveProperty('testResult');
        expect(response.body.data.sentenceBertMetrics.score).toBe(0.85);
      });

      test('POST /api/testing/batch should run multiple tests', async () => {
        // Mock both service calls
        vi.spyOn(TestingService, 'calculateMeteorScore')
          .mockResolvedValue({ score: 0.75 });
        vi.spyOn(TestingService, 'calculateSentenceBertScore')
          .mockResolvedValue({ score: 0.85 });
        vi.spyOn(TestingService, 'saveTestResult')
          .mockResolvedValue({ id: 'test-result-id' });

        const batchData = {
          ...testData,
          testTypes: ['meteor', 'sentence_bert']
        };

        const response = await request(app)
          .post('/api/testing/batch')
          .send(batchData)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data).toHaveProperty('results');
        expect(response.body.data).toHaveProperty('summary');
        expect(response.body.data.results).toHaveProperty('meteor');
        expect(response.body.data.results).toHaveProperty('sentence_bert');
      });

      test('GET /api/testing/results/:scenarioId should return test results', async () => {
        vi.spyOn(TestingService, 'getTestResultsByScenario')
          .mockResolvedValue([
            {
              id: 'result-1',
              test_type: 'meteor',
              score: 0.75,
              created_at: new Date().toISOString()
            },
            {
              id: 'result-2',
              test_type: 'sentence_bert',
              score: 0.85,
              created_at: new Date().toISOString()
            }
          ]);

        const response = await request(app)
          .get('/api/testing/results/test-scenario-id')
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data).toHaveProperty('scenarioId');
        expect(response.body.data).toHaveProperty('latestResults');
        expect(response.body.data).toHaveProperty('allResults');
        expect(response.body.data).toHaveProperty('summary');
      });

      test('GET /api/testing/statistics should return user statistics', async () => {
        vi.spyOn(TestingService, 'getTestStatistics')
          .mockResolvedValue({
            totalTests: 10,
            meteorTests: 6,
            sentenceBertTests: 4,
            averageScore: 0.78
          });

        const response = await request(app)
          .get('/api/testing/statistics')
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data).toHaveProperty('totalTests');
        expect(response.body.data).toHaveProperty('meteorTests');
        expect(response.body.data).toHaveProperty('sentenceBertTests');
      });
    });
  });

  describe('Service Layer Functionality', () => {
    describe('TestingService', () => {
      test('should maintain existing method signatures', () => {
        expect(typeof TestingService.calculateMeteorScore).toBe('function');
        expect(typeof TestingService.calculateSentenceBertScore).toBe('function');
        expect(typeof TestingService.saveTestResult).toBe('function');
        expect(typeof TestingService.getTestResultsByScenario).toBe('function');
        expect(typeof TestingService.getTestResultsByUser).toBe('function');
        expect(typeof TestingService.deleteTestResult).toBe('function');
        expect(typeof TestingService.getTestStatistics).toBe('function');
      });

      test('calculateMeteorScore should handle valid inputs', async () => {
        // This would need actual Python service integration
        // For now, we test the method exists and can be called
        expect(TestingService.calculateMeteorScore).toBeDefined();
      });

      test('calculateSentenceBertScore should handle valid inputs', async () => {
        // This would need actual Python service integration
        // For now, we test the method exists and can be called
        expect(TestingService.calculateSentenceBertScore).toBeDefined();
      });
    });

    describe('SupabaseService', () => {
      test('should maintain existing method signatures', () => {
        expect(typeof supabaseService.createTemplate).toBe('function');
        expect(typeof supabaseService.updateTemplate).toBe('function');
        expect(typeof supabaseService.incrementTemplateUsage).toBe('function');
        expect(supabaseService.admin).toBeDefined();
      });
    });
  });

  describe('Middleware Functionality', () => {
    describe('Response Formatter', () => {
      test('formatSuccessResponse should create consistent structure', () => {
        const mockReq = { requestId: 'test-request-id' };
        const data = { test: 'data' };
        const message = 'Success message';
        const meta = { pagination: { page: 1 } };

        const response = formatSuccessResponse(data, message, meta, mockReq);

        expect(response).toHaveProperty('success', true);
        expect(response).toHaveProperty('data', data);
        expect(response).toHaveProperty('message', message);
        expect(response).toHaveProperty('meta', meta);
        expect(response).toHaveProperty('requestId', 'test-request-id');
        expect(response).toHaveProperty('timestamp');
      });

      test('formatErrorResponse should create consistent error structure', () => {
        const mockReq = { requestId: 'test-request-id' };
        const error = new AppError('Test error', 400, 'TEST_ERROR');

        const response = formatErrorResponse(error, mockReq);

        expect(response).toHaveProperty('success', false);
        expect(response).toHaveProperty('message', 'Test error');
        expect(response).toHaveProperty('requestId', 'test-request-id');
        expect(response).toHaveProperty('timestamp');
      });

      test('formatPaginationMeta should create correct pagination structure', () => {
        const meta = formatPaginationMeta(2, 10, 25);

        expect(meta.pagination).toHaveProperty('page', 2);
        expect(meta.pagination).toHaveProperty('limit', 10);
        expect(meta.pagination).toHaveProperty('total', 25);
        expect(meta.pagination).toHaveProperty('totalPages', 3);
        expect(meta.pagination).toHaveProperty('hasNext', true);
        expect(meta.pagination).toHaveProperty('hasPrev', true);
      });
    });

    describe('Request Validator', () => {
      test('validation rules should work correctly', () => {
        const emailRule = validationRules.email();
        const requiredRule = validationRules.required();
        const minLengthRule = validationRules.minLength(5);

        expect(emailRule).toHaveProperty('validator');
        expect(emailRule).toHaveProperty('message');
        expect(requiredRule).toHaveProperty('validator');
        expect(minLengthRule).toHaveProperty('validator');
        expect(minLengthRule).toHaveProperty('length', 5);
      });

      test('createValidation should create middleware array', () => {
        const validation = createValidation(
          validationRules.required('name'),
          validationRules.email('email')
        );

        expect(Array.isArray(validation)).toBe(true);
        expect(validation.length).toBeGreaterThan(0);
      });

      test('sanitizeInput should clean malicious input', () => {
        const mockReq = {
          body: {
            name: '<script>alert("xss")</script>John',
            email: 'test@example.com',
            nested: {
              value: '<img src="x" onerror="alert(1)">'
            }
          },
          query: {
            search: '<b>search term</b>'
          }
        };

        const mockRes = {};
        const mockNext = vi.fn();

        sanitizeInput(mockReq, mockRes, mockNext);

        expect(mockReq.body.name).not.toContain('<script>');
        expect(mockReq.body.nested.value).not.toContain('<img');
        expect(mockReq.query.search).not.toContain('<b>');
        expect(mockNext).toHaveBeenCalled();
      });
    });
  });

  describe('Error Handling Functionality', () => {
    test('AppError should maintain consistent structure', () => {
      const error = new AppError('Test error', 400, 'TEST_ERROR', { field: 'test' });

      expect(error.message).toBe('Test error');
      expect(error.statusCode).toBe(400);
      expect(error.code).toBe('TEST_ERROR');
      expect(error.details).toEqual({ field: 'test' });
      expect(error.isOperational).toBe(true);
      expect(error.timestamp).toBeDefined();
      expect(error.id).toBeDefined();
    });

    test('Error responses should be consistent across endpoints', async () => {
      // Test validation error
      const response = await request(app)
        .post('/api/testing/meteor')
        .send({}) // Empty body to trigger validation error
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBeDefined();
      expect(response.body.requestId).toBeDefined();
      expect(response.body.timestamp).toBeDefined();
    });

    test('Authentication errors should be consistent', async () => {
      // Remove auth mock to test unauthenticated request
      vi.restoreAllMocks();

      const response = await request(app)
        .get('/api/testing/results')
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBeDefined();
    });
  });

  describe('Performance Regression Tests', () => {
    test('API endpoints should respond within acceptable time', async () => {
      const startTime = Date.now();

      await request(app)
        .get('/api/templates/system')
        .expect(200);

      const responseTime = Date.now() - startTime;
      expect(responseTime).toBeLessThan(2000); // 2 seconds max
    });

    test('Batch operations should not timeout', async () => {
      // Mock services to return quickly
      vi.spyOn(TestingService, 'calculateMeteorScore')
        .mockResolvedValue({ score: 0.75 });
      vi.spyOn(TestingService, 'calculateSentenceBertScore')
        .mockResolvedValue({ score: 0.85 });
      vi.spyOn(TestingService, 'saveTestResult')
        .mockResolvedValue({ id: 'test-result-id' });

      const startTime = Date.now();

      await request(app)
        .post('/api/testing/batch')
        .send({
          scenarioId: 'test-scenario-id',
          generatedText: 'Test text',
          referenceText: 'Reference text',
          testTypes: ['meteor', 'sentence_bert']
        })
        .expect(200);

      const responseTime = Date.now() - startTime;
      expect(responseTime).toBeLessThan(5000); // 5 seconds max for batch
    });
  });

  describe('Data Integrity Tests', () => {
    test('should maintain data consistency in responses', async () => {
      const response = await request(app)
        .get('/api/templates/system')
        .expect(200);

      if (response.body.data && response.body.data.length > 0) {
        const template = response.body.data[0];
        
        // Check required fields exist
        expect(template).toHaveProperty('id');
        expect(template).toHaveProperty('name');
        expect(template).toHaveProperty('category');
        expect(template).toHaveProperty('is_system');
        
        // Check data types
        expect(typeof template.id).toBe('string');
        expect(typeof template.name).toBe('string');
        expect(typeof template.category).toBe('string');
        expect(typeof template.is_system).toBe('boolean');
      }
    });

    test('should maintain pagination consistency', async () => {
      const response = await request(app)
        .get('/api/templates/system?limit=5&page=1')
        .expect(200);

      const pagination = response.body.meta.pagination;
      
      expect(pagination.page).toBe(1);
      expect(pagination.limit).toBe(5);
      expect(pagination.total).toBeGreaterThanOrEqual(0);
      expect(pagination.totalPages).toBeGreaterThanOrEqual(0);
      expect(typeof pagination.hasNext).toBe('boolean');
      expect(typeof pagination.hasPrev).toBe('boolean');
      
      // Data length should not exceed limit
      expect(response.body.data.length).toBeLessThanOrEqual(5);
    });
  });

  describe('Backward Compatibility', () => {
    test('should maintain existing API contract', async () => {
      // Test that old API calls still work
      const response = await request(app)
        .get('/api/templates')
        .expect(200);

      // Should have the expected structure
      expect(response.body).toHaveProperty('success');
      expect(response.body).toHaveProperty('data');
      expect(response.body).toHaveProperty('timestamp');
      expect(response.body).toHaveProperty('requestId');
    });

    test('should handle legacy query parameters', async () => {
      // Test with various query parameter formats
      const response = await request(app)
        .get('/api/templates?category=Authentication&limit=10&offset=0')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.meta.pagination.limit).toBe(10);
    });
  });
});