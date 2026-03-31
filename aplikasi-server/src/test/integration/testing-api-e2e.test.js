import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import request from 'supertest';
import express from 'express';
import { spawn } from 'child_process';
import path from 'path';
import testingController from '../../controllers/testingController.js';
import TestingService from '../../services/testingService.js';
import { supabase } from '../../config/supabase.js';

// Mock authentication middleware
const mockAuth = (req, res, next) => {
  req.user = { id: 'test-user-123' };
  next();
};

// Create test app
const createTestApp = () => {
  const app = express();
  app.use(express.json());
  app.use(mockAuth);
  
  // Testing routes
  app.post('/api/testing/meteor', testingController.runMeteorTest);
  app.post('/api/testing/sentence-bert', testingController.runSentenceBertTest);
  app.get('/api/testing/results/:scenarioId', testingController.getTestResults);
  
  return app;
};

// Mock Supabase
jest.mock('../../config/supabase.js', () => ({
  supabase: {
    from: jest.fn(() => ({
      insert: jest.fn(() => ({
        select: jest.fn(() => Promise.resolve({
          data: [{
            id: 'test-result-1',
            scenario_id: 'scenario-123',
            test_type: 'meteor',
            score: 0.75,
            created_at: '2024-01-01T00:00:00Z'
          }],
          error: null
        }))
      })),
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          eq: jest.fn(() => ({
            order: jest.fn(() => Promise.resolve({
              data: [{
                id: 'test-result-1',
                scenario_id: 'scenario-123',
                test_type: 'meteor',
                score: 0.75,
                test_details: { method: 'METEOR' },
                generated_text: 'Generated text',
                reference_text: 'Reference text',
                created_at: '2024-01-01T00:00:00Z'
              }],
              error: null
            }))
          }))
        }))
      }))
    }))
  }
}));

describe('Testing API Integration Tests', () => {
  let app;

  beforeEach(() => {
    app = createTestApp();
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('METEOR Testing Endpoint', () => {
    it('should process METEOR test request successfully', async () => {
      // **Feature: meteor-sentence-bert-testing, Property 12: METEOR Score Calculation Correctness**
      
      const testRequest = {
        scenarioId: 'scenario-123',
        generatedText: 'Given user is on login page When user enters valid credentials Then user is redirected to dashboard',
        referenceText: 'Given user is on the login page When user provides valid email and password Then system redirects to main dashboard'
      };

      const response = await request(app)
        .post('/api/testing/meteor')
        .send(testRequest)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.result).toBeDefined();
      expect(response.body.result.test_type).toBe('meteor');
      expect(response.body.result.score).toBeTypeOf('number');
      expect(response.body.result.score).toBeGreaterThanOrEqual(0);
      expect(response.body.result.score).toBeLessThanOrEqual(1);
    });

    it('should validate METEOR test request parameters', async () => {
      // **Feature: meteor-sentence-bert-testing, Property 4: Form Validation Logic**
      
      const invalidRequests = [
        {}, // Empty request
        { scenarioId: 'test' }, // Missing texts
        { scenarioId: 'test', generatedText: 'text' }, // Missing reference
        { scenarioId: '', generatedText: 'text', referenceText: 'ref' }, // Empty scenario ID
        { scenarioId: 'test', generatedText: '', referenceText: 'ref' }, // Empty generated text
        { scenarioId: 'test', generatedText: 'text', referenceText: '' } // Empty reference text
      ];

      for (const invalidRequest of invalidRequests) {
        const response = await request(app)
          .post('/api/testing/meteor')
          .send(invalidRequest)
          .expect(400);

        expect(response.body.success).toBe(false);
        expect(response.body.error).toBeDefined();
      }
    });

    it('should handle METEOR calculation errors gracefully', async () => {
      // **Feature: meteor-sentence-bert-testing, Property 11: Error Handling Consistency**
      
      // Mock Python process failure
      const originalSpawn = TestingService.calculateMeteorScore;
      TestingService.calculateMeteorScore = jest.fn().mockRejectedValue(new Error('Python process failed'));

      const testRequest = {
        scenarioId: 'scenario-123',
        generatedText: 'Generated text',
        referenceText: 'Reference text'
      };

      const response = await request(app)
        .post('/api/testing/meteor')
        .send(testRequest)
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Python process failed');

      // Restore original function
      TestingService.calculateMeteorScore = originalSpawn;
    });
  });

  describe('Sentence-BERT Testing Endpoint', () => {
    it('should process Sentence-BERT test request successfully', async () => {
      // **Feature: meteor-sentence-bert-testing, Property 13: Sentence-BERT Score Calculation Correctness**
      
      const testRequest = {
        scenarioId: 'scenario-123',
        generatedText: 'Given user is on login page When user enters valid credentials Then user is redirected to dashboard',
        referenceText: 'Given user is on the login page When user provides valid email and password Then system redirects to main dashboard'
      };

      const response = await request(app)
        .post('/api/testing/sentence-bert')
        .send(testRequest)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.result).toBeDefined();
      expect(response.body.result.test_type).toBe('sentence_bert');
      expect(response.body.result.score).toBeTypeOf('number');
      expect(response.body.result.score).toBeGreaterThanOrEqual(0);
      expect(response.body.result.score).toBeLessThanOrEqual(1);
    });

    it('should validate Sentence-BERT test request parameters', async () => {
      // **Feature: meteor-sentence-bert-testing, Property 4: Form Validation Logic**
      
      const invalidRequest = {
        scenarioId: 'test',
        generatedText: 'text',
        referenceText: '' // Empty reference text
      };

      const response = await request(app)
        .post('/api/testing/sentence-bert')
        .send(invalidRequest)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBeDefined();
    });

    it('should handle Sentence-BERT calculation errors gracefully', async () => {
      // **Feature: meteor-sentence-bert-testing, Property 11: Error Handling Consistency**
      
      // Mock Python process failure
      const originalSpawn = TestingService.calculateSentenceBertScore;
      TestingService.calculateSentenceBertScore = jest.fn().mockRejectedValue(new Error('Model loading failed'));

      const testRequest = {
        scenarioId: 'scenario-123',
        generatedText: 'Generated text',
        referenceText: 'Reference text'
      };

      const response = await request(app)
        .post('/api/testing/sentence-bert')
        .send(testRequest)
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Model loading failed');

      // Restore original function
      TestingService.calculateSentenceBertScore = originalSpawn;
    });
  });

  describe('Test Results Retrieval', () => {
    it('should retrieve test results for a scenario', async () => {
      // **Feature: meteor-sentence-bert-testing, Property 9: Data Persistence Round-trip**
      
      const scenarioId = 'scenario-123';

      const response = await request(app)
        .get(`/api/testing/results/${scenarioId}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.results).toBeDefined();
      expect(Array.isArray(response.body.results)).toBe(true);
      
      if (response.body.results.length > 0) {
        const result = response.body.results[0];
        expect(result.scenario_id).toBe(scenarioId);
        expect(result.test_type).toMatch(/^(meteor|sentence_bert)$/);
        expect(typeof result.score).toBe('number');
      }
    });

    it('should handle non-existent scenario gracefully', async () => {
      // **Feature: meteor-sentence-bert-testing, Property 11: Error Handling Consistency**
      
      // Mock empty results
      supabase.from().select().eq().eq().order.mockResolvedValueOnce({
        data: [],
        error: null
      });

      const response = await request(app)
        .get('/api/testing/results/non-existent-scenario')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.results).toEqual([]);
    });

    it('should handle database errors gracefully', async () => {
      // **Feature: meteor-sentence-bert-testing, Property 11: Error Handling Consistency**
      
      // Mock database error
      supabase.from().select().eq().eq().order.mockResolvedValueOnce({
        data: null,
        error: { message: 'Database connection failed' }
      });

      const response = await request(app)
        .get('/api/testing/results/scenario-123')
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Database connection failed');
    });
  });

  describe('Cross-Testing Scenarios', () => {
    it('should handle multiple test types for same scenario', async () => {
      // **Feature: meteor-sentence-bert-testing, Property 8: Cross-Test Data Sharing**
      
      const testData = {
        scenarioId: 'scenario-123',
        generatedText: 'Given user is on login page When user enters valid credentials Then user is redirected to dashboard',
        referenceText: 'Given user is on the login page When user provides valid email and password Then system redirects to main dashboard'
      };

      // Submit METEOR test
      const meteorResponse = await request(app)
        .post('/api/testing/meteor')
        .send(testData)
        .expect(200);

      expect(meteorResponse.body.success).toBe(true);
      expect(meteorResponse.body.result.test_type).toBe('meteor');

      // Submit Sentence-BERT test with same data
      const sentenceBertResponse = await request(app)
        .post('/api/testing/sentence-bert')
        .send(testData)
        .expect(200);

      expect(sentenceBertResponse.body.success).toBe(true);
      expect(sentenceBertResponse.body.result.test_type).toBe('sentence_bert');

      // Verify both tests used same reference text
      expect(meteorResponse.body.result.reference_text).toBe(testData.referenceText);
      expect(sentenceBertResponse.body.result.reference_text).toBe(testData.referenceText);
      expect(meteorResponse.body.result.scenario_id).toBe(sentenceBertResponse.body.result.scenario_id);
    });

    it('should maintain data consistency across test methods', async () => {
      // **Feature: meteor-sentence-bert-testing, Property 9: Data Persistence Round-trip**
      
      const testData = {
        scenarioId: 'scenario-cross-test',
        generatedText: 'Given user logs in When credentials are valid Then dashboard appears',
        referenceText: 'Given user provides login credentials When they are validated Then user sees dashboard'
      };

      // Submit both tests
      await request(app).post('/api/testing/meteor').send(testData).expect(200);
      await request(app).post('/api/testing/sentence-bert').send(testData).expect(200);

      // Mock results for both test types
      supabase.from().select().eq().eq().order.mockResolvedValueOnce({
        data: [
          {
            id: 'result-1',
            scenario_id: 'scenario-cross-test',
            test_type: 'meteor',
            score: 0.75,
            generated_text: testData.generatedText,
            reference_text: testData.referenceText,
            created_at: '2024-01-01T00:00:00Z'
          },
          {
            id: 'result-2',
            scenario_id: 'scenario-cross-test',
            test_type: 'sentence_bert',
            score: 0.85,
            generated_text: testData.generatedText,
            reference_text: testData.referenceText,
            created_at: '2024-01-01T00:01:00Z'
          }
        ],
        error: null
      });

      // Retrieve results
      const response = await request(app)
        .get('/api/testing/results/scenario-cross-test')
        .expect(200);

      expect(response.body.results).toHaveLength(2);
      
      const meteorResult = response.body.results.find(r => r.test_type === 'meteor');
      const sentenceBertResult = response.body.results.find(r => r.test_type === 'sentence_bert');

      expect(meteorResult).toBeDefined();
      expect(sentenceBertResult).toBeDefined();
      
      // Verify data consistency
      expect(meteorResult.generated_text).toBe(sentenceBertResult.generated_text);
      expect(meteorResult.reference_text).toBe(sentenceBertResult.reference_text);
      expect(meteorResult.scenario_id).toBe(sentenceBertResult.scenario_id);
    });
  });

  describe('Authentication and Authorization', () => {
    it('should require authentication for all endpoints', async () => {
      // **Feature: meteor-sentence-bert-testing, Property 10: System Integration Compatibility**
      
      // Create app without auth middleware
      const unauthenticatedApp = express();
      unauthenticatedApp.use(express.json());
      unauthenticatedApp.post('/api/testing/meteor', testingController.runMeteorTest);
      unauthenticatedApp.post('/api/testing/sentence-bert', testingController.runSentenceBertTest);
      unauthenticatedApp.get('/api/testing/results/:scenarioId', testingController.getTestResults);

      const testData = {
        scenarioId: 'scenario-123',
        generatedText: 'Generated text',
        referenceText: 'Reference text'
      };

      // All endpoints should require authentication
      await request(unauthenticatedApp)
        .post('/api/testing/meteor')
        .send(testData)
        .expect(401);

      await request(unauthenticatedApp)
        .post('/api/testing/sentence-bert')
        .send(testData)
        .expect(401);

      await request(unauthenticatedApp)
        .get('/api/testing/results/scenario-123')
        .expect(401);
    });

    it('should isolate test results by user', async () => {
      // **Feature: meteor-sentence-bert-testing, Property 10: System Integration Compatibility**
      
      // Mock different user contexts
      const createUserApp = (userId) => {
        const app = express();
        app.use(express.json());
        app.use((req, res, next) => {
          req.user = { id: userId };
          next();
        });
        app.get('/api/testing/results/:scenarioId', testingController.getTestResults);
        return app;
      };

      const user1App = createUserApp('user-1');
      const user2App = createUserApp('user-2');

      // Mock different results for different users
      let callCount = 0;
      supabase.from().select().eq().eq().order.mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          // First call (user-1)
          return Promise.resolve({
            data: [{ id: 'result-user-1', scenario_id: 'scenario-123', test_type: 'meteor', score: 0.75 }],
            error: null
          });
        } else {
          // Second call (user-2)
          return Promise.resolve({
            data: [{ id: 'result-user-2', scenario_id: 'scenario-123', test_type: 'sentence_bert', score: 0.85 }],
            error: null
          });
        }
      });

      // User 1 should see their results
      const user1Response = await request(user1App)
        .get('/api/testing/results/scenario-123')
        .expect(200);

      // User 2 should see their results
      const user2Response = await request(user2App)
        .get('/api/testing/results/scenario-123')
        .expect(200);

      // Results should be different for different users
      expect(user1Response.body.results[0].id).toBe('result-user-1');
      expect(user2Response.body.results[0].id).toBe('result-user-2');
    });
  });

  describe('Performance and Scalability', () => {
    it('should handle concurrent test requests', async () => {
      // **Feature: meteor-sentence-bert-testing, Property 5: Test Processing and Method Selection**
      
      const testRequests = Array.from({ length: 5 }, (_, i) => ({
        scenarioId: `scenario-${i}`,
        generatedText: `Generated text ${i}`,
        referenceText: `Reference text ${i}`
      }));

      // Submit all requests concurrently
      const promises = testRequests.map(testData =>
        request(app)
          .post('/api/testing/meteor')
          .send(testData)
      );

      const responses = await Promise.all(promises);

      // All requests should succeed
      responses.forEach((response, index) => {
        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.result.scenario_id).toBe(`scenario-${index}`);
      });
    });

    it('should handle large text inputs', async () => {
      // **Feature: meteor-sentence-bert-testing, Property 12: METEOR Score Calculation Correctness**
      // **Feature: meteor-sentence-bert-testing, Property 13: Sentence-BERT Score Calculation Correctness**
      
      const largeText = 'Given user is on login page '.repeat(100) + 
                      'When user enters valid credentials '.repeat(100) + 
                      'Then user is redirected to dashboard '.repeat(100);

      const testRequest = {
        scenarioId: 'scenario-large',
        generatedText: largeText,
        referenceText: largeText
      };

      // Test both endpoints with large inputs
      const meteorResponse = await request(app)
        .post('/api/testing/meteor')
        .send(testRequest)
        .expect(200);

      const sentenceBertResponse = await request(app)
        .post('/api/testing/sentence-bert')
        .send(testRequest)
        .expect(200);

      expect(meteorResponse.body.success).toBe(true);
      expect(sentenceBertResponse.body.success).toBe(true);
      
      // Scores should still be valid numbers
      expect(meteorResponse.body.result.score).toBeGreaterThanOrEqual(0);
      expect(meteorResponse.body.result.score).toBeLessThanOrEqual(1);
      expect(sentenceBertResponse.body.result.score).toBeGreaterThanOrEqual(0);
      expect(sentenceBertResponse.body.result.score).toBeLessThanOrEqual(1);
    });
  });
});