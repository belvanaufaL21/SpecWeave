/**
 * Integration Tests for Evaluation Controller
 * Tests complete METEOR evaluation flow from client to server
 * 
 * Requirements: 8.1, 8.2, 8.3
 */

import request from 'supertest';
import express from 'express';
import evaluationRoutes from '../../routes/evaluationRoutes.js';

// Create test app
const app = express();
app.use(express.json());
app.use('/api/evaluation', evaluationRoutes);

describe('Evaluation Controller - Integration Tests', () => {
  describe('POST /api/evaluation/meteor', () => {
    it('should evaluate a single scenario and return metrics', async () => {
      // Requirement 8.1: Client sends scenarios to server
      const requestData = {
        candidate: 'Given user is logged in When user clicks button Then page loads',
        reference: 'Given user logged in When button clicked Then page shown',
        scenarioId: 'test-scenario-123'
      };

      const response = await request(app)
        .post('/api/evaluation/meteor')
        .send(requestData)
        .expect('Content-Type', /json/)
        .expect(200);

      // Requirement 8.3: Server returns quality metrics to client
      expect(response.body).toMatchObject({
        success: true,
        data: {
          meteor_metrics: expect.objectContaining({
            meteor_score: expect.any(Number),
            precision: expect.any(Number),
            recall: expect.any(Number),
            f_measure: expect.any(Number)
          }),
          quality_assessment: expect.objectContaining({
            level: expect.any(String),
            description: expect.any(String)
          }),
          performance_metrics: expect.any(Object)
        }
      });

      // Verify metrics are within valid ranges
      expect(response.body.data.meteor_metrics.meteor_score).toBeGreaterThanOrEqual(0);
      expect(response.body.data.meteor_metrics.meteor_score).toBeLessThanOrEqual(1);
    });

    it('should return 400 for missing candidate text', async () => {
      const requestData = {
        reference: 'Given user logged in'
      };

      const response = await request(app)
        .post('/api/evaluation/meteor')
        .send(requestData)
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body).toMatchObject({
        success: false,
        error: 'Both candidate and reference text are required'
      });
    });

    it('should return 400 for missing reference text', async () => {
      const requestData = {
        candidate: 'Given user is logged in'
      };

      const response = await request(app)
        .post('/api/evaluation/meteor')
        .send(requestData)
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body).toMatchObject({
        success: false,
        error: 'Both candidate and reference text are required'
      });
    });

    it('should handle empty strings gracefully', async () => {
      const requestData = {
        candidate: '',
        reference: ''
      };

      const response = await request(app)
        .post('/api/evaluation/meteor')
        .send(requestData)
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/evaluation/meteor/batch', () => {
    it('should evaluate multiple scenarios and return batch results', async () => {
      // Requirement 8.1: Client sends scenarios to server
      const requestData = {
        scenarios: [
          {
            candidate: 'Given user is logged in',
            reference: 'Given user logged in'
          },
          {
            candidate: 'When user clicks button',
            reference: 'When button clicked'
          },
          {
            candidate: 'Then page loads successfully',
            reference: 'Then page shown'
          }
        ]
      };

      const response = await request(app)
        .post('/api/evaluation/meteor/batch')
        .send(requestData)
        .expect('Content-Type', /json/)
        .expect(200);

      // Requirement 8.3: Server returns quality metrics for all scenarios
      expect(response.body).toMatchObject({
        success: true,
        data: {
          batch_results: expect.any(Array),
          performance_metrics: expect.any(Object)
        }
      });

      // Verify batch results match input count
      expect(response.body.data.batch_results).toHaveLength(3);

      // Verify each result has proper structure
      response.body.data.batch_results.forEach(result => {
        expect(result).toMatchObject({
          meteor_score: expect.any(Number),
          precision: expect.any(Number),
          recall: expect.any(Number),
          f_measure: expect.any(Number)
        });
      });
    });

    it('should return 400 for missing scenarios array', async () => {
      const requestData = {};

      const response = await request(app)
        .post('/api/evaluation/meteor/batch')
        .send(requestData)
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body).toMatchObject({
        success: false,
        error: 'Scenarios array is required'
      });
    });

    it('should return 400 for invalid scenarios format', async () => {
      const requestData = {
        scenarios: 'not an array'
      };

      const response = await request(app)
        .post('/api/evaluation/meteor/batch')
        .send(requestData)
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body).toMatchObject({
        success: false,
        error: 'Scenarios array is required'
      });
    });

    it('should handle empty scenarios array', async () => {
      const requestData = {
        scenarios: []
      };

      const response = await request(app)
        .post('/api/evaluation/meteor/batch')
        .send(requestData)
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body.data.batch_results).toHaveLength(0);
    });
  });

  describe('POST /api/evaluation/test', () => {
    it('should run test evaluation with sample data', async () => {
      const response = await request(app)
        .post('/api/evaluation/test')
        .expect('Content-Type', /json/)
        .expect(200);

      // Requirement 8.2: Server invokes METEOR evaluation
      // Requirement 8.3: Server returns quality metrics
      expect(response.body).toMatchObject({
        success: true,
        message: expect.any(String),
        data: {
          test_input: {
            candidate: expect.any(String),
            reference: expect.any(String)
          },
          meteor_metrics: expect.objectContaining({
            meteor_score: expect.any(Number),
            precision: expect.any(Number),
            recall: expect.any(Number),
            f_measure: expect.any(Number)
          }),
          quality_assessment: expect.objectContaining({
            level: expect.any(String),
            description: expect.any(String)
          }),
          performance_metrics: expect.any(Object)
        }
      });
    });
  });

  describe('GET /api/evaluation/quality/:score', () => {
    it('should return quality assessment for valid score', async () => {
      const response = await request(app)
        .get('/api/evaluation/quality/0.75')
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        data: {
          score: 0.75,
          assessment: expect.objectContaining({
            level: expect.any(String),
            description: expect.any(String)
          }),
          meets_threshold: expect.any(Boolean)
        }
      });
    });

    it('should return 400 for invalid score', async () => {
      const response = await request(app)
        .get('/api/evaluation/quality/invalid')
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body).toMatchObject({
        success: false,
        error: 'Score must be a number between 0 and 1'
      });
    });

    it('should return 400 for score out of range', async () => {
      const response = await request(app)
        .get('/api/evaluation/quality/1.5')
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body).toMatchObject({
        success: false,
        error: 'Score must be a number between 0 and 1'
      });
    });
  });

  describe('Complete Evaluation Flow', () => {
    it('should complete full evaluation workflow', async () => {
      // Step 1: Test connection
      const testResponse = await request(app)
        .post('/api/evaluation/test')
        .expect(200);

      expect(testResponse.body.success).toBe(true);

      // Step 2: Evaluate single scenario
      const singleResponse = await request(app)
        .post('/api/evaluation/meteor')
        .send({
          candidate: 'Given user is logged in When user clicks button Then page loads',
          reference: 'Given user logged in When button clicked Then page shown'
        })
        .expect(200);

      expect(singleResponse.body.success).toBe(true);
      const meteorScore = singleResponse.body.data.meteor_metrics.meteor_score;

      // Step 3: Get quality assessment
      const qualityResponse = await request(app)
        .get(`/api/evaluation/quality/${meteorScore}`)
        .expect(200);

      expect(qualityResponse.body.success).toBe(true);
      expect(qualityResponse.body.data.score).toBe(meteorScore);

      // Step 4: Evaluate batch
      const batchResponse = await request(app)
        .post('/api/evaluation/meteor/batch')
        .send({
          scenarios: [
            {
              candidate: 'Given user is logged in',
              reference: 'Given user logged in'
            },
            {
              candidate: 'When user clicks button',
              reference: 'When button clicked'
            }
          ]
        })
        .expect(200);

      expect(batchResponse.body.success).toBe(true);
      expect(batchResponse.body.data.batch_results).toHaveLength(2);
    });
  });
});
