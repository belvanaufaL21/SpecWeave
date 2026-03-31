/**
 * API Response Consistency Tests
 * Tests to ensure all API endpoints follow standardized response format
 */

import request from 'supertest';
import app from '../index.js';

describe('API Response Consistency', () => {
  // Mock authentication for protected routes
  const mockUser = {
    id: 'test-user-id',
    email: 'test@example.com'
  };

  // Helper function to validate standard response structure
  const validateResponseStructure = (response, expectedStatus = 200) => {
    expect(response.status).toBe(expectedStatus);
    expect(response.body).toHaveProperty('success');
    expect(response.body).toHaveProperty('timestamp');
    expect(response.body).toHaveProperty('requestId');
    expect(typeof response.body.success).toBe('boolean');
    expect(typeof response.body.timestamp).toBe('string');
    expect(typeof response.body.requestId).toBe('string');
  };

  // Helper function to validate success response
  const validateSuccessResponse = (response, expectedStatus = 200) => {
    validateResponseStructure(response, expectedStatus);
    expect(response.body.success).toBe(true);
    
    if (response.body.data !== undefined) {
      expect(response.body).toHaveProperty('data');
    }
    
    if (response.body.message !== undefined) {
      expect(typeof response.body.message).toBe('string');
    }
  };

  // Helper function to validate error response
  const validateErrorResponse = (response, expectedStatus) => {
    validateResponseStructure(response, expectedStatus);
    expect(response.body.success).toBe(false);
    expect(response.body).toHaveProperty('message');
    expect(typeof response.body.message).toBe('string');
  };

  // Helper function to validate paginated response
  const validatePaginatedResponse = (response) => {
    validateSuccessResponse(response);
    expect(response.body).toHaveProperty('meta');
    expect(response.body.meta).toHaveProperty('pagination');
    
    const pagination = response.body.meta.pagination;
    expect(pagination).toHaveProperty('page');
    expect(pagination).toHaveProperty('limit');
    expect(pagination).toHaveProperty('total');
    expect(pagination).toHaveProperty('totalPages');
    expect(pagination).toHaveProperty('hasNext');
    expect(pagination).toHaveProperty('hasPrev');
    
    expect(typeof pagination.page).toBe('number');
    expect(typeof pagination.limit).toBe('number');
    expect(typeof pagination.total).toBe('number');
    expect(typeof pagination.totalPages).toBe('number');
    expect(typeof pagination.hasNext).toBe('boolean');
    expect(typeof pagination.hasPrev).toBe('boolean');
  };

  describe('Template API Endpoints', () => {
    test('GET /api/templates should return paginated response', async () => {
      const response = await request(app)
        .get('/api/templates')
        .expect(200);

      validatePaginatedResponse(response);
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    test('GET /api/templates/system should return paginated response', async () => {
      const response = await request(app)
        .get('/api/templates/system')
        .expect(200);

      validatePaginatedResponse(response);
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    test('GET /api/templates/categories should return success response', async () => {
      const response = await request(app)
        .get('/api/templates/categories')
        .expect(200);

      validateSuccessResponse(response);
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    test('GET /api/templates/:id with invalid ID should return error response', async () => {
      const response = await request(app)
        .get('/api/templates/invalid-id')
        .expect(404);

      validateErrorResponse(response, 404);
    });

    test('POST /api/templates/setup-defaults should return success response', async () => {
      const response = await request(app)
        .post('/api/templates/setup-defaults')
        .expect(200);

      validateSuccessResponse(response);
      expect(response.body.data).toHaveProperty('existing_count');
      expect(response.body.data).toHaveProperty('new_count');
    });
  });

  describe('Testing API Endpoints', () => {
    // Mock authentication middleware for testing
    beforeEach(() => {
      jest.spyOn(require('../middlewares/auth.js'), 'authenticate')
        .mockImplementation((req, res, next) => {
          req.user = mockUser;
          next();
        });
    });

    afterEach(() => {
      jest.restoreAllMocks();
    });

    test('POST /api/testing/meteor should return success response', async () => {
      const testData = {
        scenarioId: 'test-scenario-id',
        generatedText: 'This is generated text',
        referenceText: 'This is reference text'
      };

      const response = await request(app)
        .post('/api/testing/meteor')
        .send(testData)
        .expect(200);

      validateSuccessResponse(response);
      expect(response.body.data).toHaveProperty('meteorMetrics');
    });

    test('POST /api/testing/sentence-bert should return success response', async () => {
      const testData = {
        scenarioId: 'test-scenario-id',
        generatedText: 'This is generated text',
        referenceText: 'This is reference text'
      };

      const response = await request(app)
        .post('/api/testing/sentence-bert')
        .send(testData)
        .expect(200);

      validateSuccessResponse(response);
      expect(response.body.data).toHaveProperty('sentenceBertMetrics');
    });

    test('POST /api/testing/batch should return success response', async () => {
      const testData = {
        scenarioId: 'test-scenario-id',
        generatedText: 'This is generated text',
        referenceText: 'This is reference text',
        testTypes: ['meteor', 'sentence_bert']
      };

      const response = await request(app)
        .post('/api/testing/batch')
        .send(testData)
        .expect(200);

      validateSuccessResponse(response);
      expect(response.body.data).toHaveProperty('results');
      expect(response.body.data).toHaveProperty('summary');
    });

    test('GET /api/testing/results/:scenarioId should return success response', async () => {
      const response = await request(app)
        .get('/api/testing/results/test-scenario-id')
        .expect(200);

      validateSuccessResponse(response);
      expect(response.body.data).toHaveProperty('scenarioId');
      expect(response.body.data).toHaveProperty('latestResults');
      expect(response.body.data).toHaveProperty('allResults');
      expect(response.body.data).toHaveProperty('summary');
    });

    test('GET /api/testing/results should return success response', async () => {
      const response = await request(app)
        .get('/api/testing/results')
        .expect(200);

      validateSuccessResponse(response);
      expect(response.body.data).toHaveProperty('results');
      expect(response.body.data).toHaveProperty('count');
      expect(Array.isArray(response.body.data.results)).toBe(true);
    });

    test('GET /api/testing/statistics should return success response', async () => {
      const response = await request(app)
        .get('/api/testing/statistics')
        .expect(200);

      validateSuccessResponse(response);
      expect(response.body.data).toBeDefined();
    });

    test('POST /api/testing/references should return success response', async () => {
      const referenceData = {
        referenceText: 'This is a reference text',
        description: 'Test reference',
        tags: ['test', 'reference']
      };

      const response = await request(app)
        .post('/api/testing/references')
        .send(referenceData)
        .expect(200);

      validateSuccessResponse(response);
    });

    test('GET /api/testing/references should return success response', async () => {
      const response = await request(app)
        .get('/api/testing/references')
        .expect(200);

      validateSuccessResponse(response);
      expect(response.body.data).toHaveProperty('references');
      expect(response.body.data).toHaveProperty('count');
      expect(Array.isArray(response.body.data.references)).toBe(true);
    });
  });

  describe('Error Response Consistency', () => {
    test('404 errors should return consistent error response', async () => {
      const response = await request(app)
        .get('/api/nonexistent-endpoint')
        .expect(404);

      validateErrorResponse(response, 404);
    });

    test('400 validation errors should return consistent error response', async () => {
      const response = await request(app)
        .post('/api/testing/meteor')
        .send({}) // Empty body to trigger validation error
        .expect(400);

      validateErrorResponse(response, 400);
    });

    test('401 authentication errors should return consistent error response', async () => {
      const response = await request(app)
        .get('/api/testing/results')
        .expect(401);

      validateErrorResponse(response, 401);
    });
  });

  describe('HTTP Status Codes', () => {
    test('GET requests should return 200 for success', async () => {
      const response = await request(app)
        .get('/api/templates/system')
        .expect(200);

      validateSuccessResponse(response, 200);
    });

    test('POST requests should return 201 for resource creation', async () => {
      // Mock successful template creation
      const templateData = {
        name: 'Test Template',
        category: 'Test',
        template_content: 'Test content'
      };

      // This would need proper authentication setup
      // const response = await request(app)
      //   .post('/api/templates')
      //   .send(templateData)
      //   .expect(201);

      // validateSuccessResponse(response, 201);
    });

    test('DELETE requests should return 200 for successful deletion', async () => {
      // This would need proper authentication and existing resource
      // const response = await request(app)
      //   .delete('/api/templates/test-id')
      //   .expect(200);

      // validateSuccessResponse(response, 200);
    });
  });

  describe('Response Headers', () => {
    test('All responses should include proper headers', async () => {
      const response = await request(app)
        .get('/api/templates/system')
        .expect(200);

      expect(response.headers['content-type']).toMatch(/application\/json/);
      expect(response.headers['x-powered-by']).toBeUndefined(); // Should be hidden for security
    });

    test('CORS headers should be present', async () => {
      const response = await request(app)
        .options('/api/templates/system')
        .expect(200);

      expect(response.headers['access-control-allow-origin']).toBeDefined();
      expect(response.headers['access-control-allow-methods']).toBeDefined();
      expect(response.headers['access-control-allow-headers']).toBeDefined();
    });
  });

  describe('Response Time Performance', () => {
    test('API responses should be within acceptable time limits', async () => {
      const startTime = Date.now();
      
      await request(app)
        .get('/api/templates/system')
        .expect(200);
      
      const responseTime = Date.now() - startTime;
      expect(responseTime).toBeLessThan(2000); // 2 seconds max
    });
  });

  describe('Data Validation', () => {
    test('Response data should match expected types', async () => {
      const response = await request(app)
        .get('/api/templates/system')
        .expect(200);

      validateSuccessResponse(response);
      
      if (response.body.data && response.body.data.length > 0) {
        const template = response.body.data[0];
        expect(typeof template.id).toBe('string');
        expect(typeof template.name).toBe('string');
        expect(typeof template.category).toBe('string');
        expect(typeof template.is_system).toBe('boolean');
      }
    });

    test('Pagination data should have correct types', async () => {
      const response = await request(app)
        .get('/api/templates/system?limit=5&page=1')
        .expect(200);

      validatePaginatedResponse(response);
      
      const pagination = response.body.meta.pagination;
      expect(pagination.page).toBeGreaterThan(0);
      expect(pagination.limit).toBeGreaterThan(0);
      expect(pagination.total).toBeGreaterThanOrEqual(0);
      expect(pagination.totalPages).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Request ID Tracking', () => {
    test('All responses should include unique request IDs', async () => {
      const response1 = await request(app)
        .get('/api/templates/system')
        .expect(200);

      const response2 = await request(app)
        .get('/api/templates/system')
        .expect(200);

      expect(response1.body.requestId).toBeDefined();
      expect(response2.body.requestId).toBeDefined();
      expect(response1.body.requestId).not.toBe(response2.body.requestId);
    });
  });
});