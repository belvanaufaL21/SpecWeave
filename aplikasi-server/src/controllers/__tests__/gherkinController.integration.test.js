/**
 * Integration Tests for Gherkin Controller
 * Tests the complete flow from client request to server response
 * 
 * Requirements: 7.1, 7.2, 7.3, 7.5
 */

import request from 'supertest';
import express from 'express';
import gherkinRoutes from '../../routes/gherkinRoutes.js';
import { errorHandler } from '../../middlewares/errorHandler.js';

// Create test app
const app = express();
app.use(express.json());
app.use('/api/gherkin', gherkinRoutes);
app.use(errorHandler);

describe('Gherkin Generation Flow - Integration Tests', () => {
  describe('8.1 Test requirements to scenarios flow', () => {
    it('should accept user story from client and return generated scenarios', async () => {
      // Requirement 7.1: Client sends requirements to server
      const userStory = 'As a user, I want to login to the system, so that I can access my account';

      const response = await request(app)
        .post('/api/gherkin/generate')
        .send({ userStory })
        .expect(200);

      // Requirement 7.2: Server processes and generates scenarios
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');
      
      // Requirement 7.3: Server returns scenarios to client
      expect(response.body.data).toHaveProperty('type');
      expect(response.body.data).toHaveProperty('gherkin');
      expect(response.body.data.isConnextra).toBe(true);
    });

    it('should process Connextra format user stories', async () => {
      const userStory = 'As a customer, I want to add items to cart, so that I can purchase multiple products';

      const response = await request(app)
        .post('/api/gherkin/generate')
        .send({ userStory })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.type).toBe('gherkin');
      expect(response.body.data.gherkin).toBeDefined();
      expect(typeof response.body.data.gherkin).toBe('string');
    });

    it('should handle non-Connextra format with general response', async () => {
      const userStory = 'Tell me about testing';

      const response = await request(app)
        .post('/api/gherkin/generate')
        .send({ userStory })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.type).toBe('general');
      expect(response.body.data.content).toBeDefined();
      expect(response.body.data.isConnextra).toBe(false);
    });

    it('should include performance metrics in response', async () => {
      const userStory = 'As a user, I want to reset my password, so that I can regain access';

      const response = await request(app)
        .post('/api/gherkin/generate')
        .send({ userStory })
        .expect(200);

      expect(response.body.data).toHaveProperty('performance_metrics');
      expect(response.body.data.performance_metrics).toHaveProperty('generation_time_ms');
      expect(response.body.data.performance_metrics).toHaveProperty('request_id');
    });

    it('should optionally include quality metrics when requested', async () => {
      const userStory = 'As a user, I want to view my profile, so that I can see my information';

      const response = await request(app)
        .post('/api/gherkin/generate')
        .send({ 
          userStory,
          evaluateQuality: true 
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      
      // Quality metrics may or may not be present depending on METEOR service availability
      if (response.body.data.quality_metrics) {
        expect(response.body.data.quality_metrics).toHaveProperty('meteor_score');
        expect(response.body.data.quality_metrics).toHaveProperty('quality_level');
      }
    });

    it('should handle multiple scenarios in user story', async () => {
      const userStory = 'As a user, I want to manage my account, so that I can update my settings and preferences';

      const response = await request(app)
        .post('/api/gherkin/generate')
        .send({ userStory })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.gherkin).toBeDefined();
    });
  });

  describe('8.2 Test generation error handling', () => {
    it('should return error when user story is missing', async () => {
      // Requirement 7.5: Error message when generation fails
      const response = await request(app)
        .post('/api/gherkin/generate')
        .send({})
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('User story is required');
    });

    it('should return error when user story is not a string', async () => {
      const response = await request(app)
        .post('/api/gherkin/generate')
        .send({ userStory: 123 })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('must be a string');
    });

    it('should return error when user story is too short', async () => {
      const response = await request(app)
        .post('/api/gherkin/generate')
        .send({ userStory: 'short' })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('at least 10 characters');
    });

    it('should return error when user story is empty string', async () => {
      const response = await request(app)
        .post('/api/gherkin/generate')
        .send({ userStory: '   ' })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBeDefined();
    });

    it('should handle malformed JSON gracefully', async () => {
      const response = await request(app)
        .post('/api/gherkin/generate')
        .set('Content-Type', 'application/json')
        .send('{"userStory": invalid}')
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should provide descriptive error messages', async () => {
      // Test that error messages explain the failure
      const response = await request(app)
        .post('/api/gherkin/generate')
        .send({ userStory: '' })
        .expect(400);

      expect(response.body.error).toBeDefined();
      expect(typeof response.body.error).toBe('string');
      expect(response.body.error.length).toBeGreaterThan(0);
    });
  });

  describe('Complete flow validation', () => {
    it('should complete full generation flow successfully', async () => {
      // Test complete flow: client sends -> server processes -> server returns
      const userStory = 'As an admin, I want to manage users, so that I can control access';

      const response = await request(app)
        .post('/api/gherkin/generate')
        .send({ userStory })
        .expect(200);

      // Verify complete response structure
      expect(response.body).toMatchObject({
        success: true,
        data: expect.objectContaining({
          type: expect.any(String),
          id: expect.any(Number),
          formatDetection: expect.any(Object),
          performance_metrics: expect.objectContaining({
            generation_time_ms: expect.any(Number),
            request_id: expect.any(String)
          })
        })
      });
    });

    it('should handle concurrent requests', async () => {
      const userStories = [
        'As a user, I want to login',
        'As a user, I want to logout',
        'As a user, I want to register'
      ];

      const requests = userStories.map(userStory =>
        request(app)
          .post('/api/gherkin/generate')
          .send({ userStory })
      );

      const responses = await Promise.all(requests);

      responses.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
      });
    });
  });
});
