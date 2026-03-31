/**
 * Error Handling Tests for Evaluation Controller
 * Tests error scenarios and diagnostic information
 * 
 * Requirement: 8.5 - Error message with diagnostic info
 */

import request from 'supertest';
import express from 'express';
import evaluationRoutes from '../../routes/evaluationRoutes.js';

// Create test app
const app = express();
app.use(express.json());
app.use('/api/evaluation', evaluationRoutes);

describe('Evaluation Controller - Error Handling Tests', () => {
  describe('Input Validation Errors', () => {
    it('should return 400 with diagnostic info for missing candidate', async () => {
      const response = await request(app)
        .post('/api/evaluation/meteor')
        .send({
          reference: 'Given user logged in'
        })
        .expect('Content-Type', /json/)
        .expect(400);

      // Requirement 8.5: Error message with diagnostic info
      expect(response.body).toMatchObject({
        success: false,
        error: expect.stringContaining('required')
      });
      
      // Verify diagnostic information is present
      expect(response.body.error).toBeTruthy();
      expect(typeof response.body.error).toBe('string');
    });

    it('should return 400 with diagnostic info for missing reference', async () => {
      const response = await request(app)
        .post('/api/evaluation/meteor')
        .send({
          candidate: 'Given user is logged in'
        })
        .expect('Content-Type', /json/)
        .expect(400);

      // Requirement 8.5: Error message with diagnostic info
      expect(response.body).toMatchObject({
        success: false,
        error: expect.stringContaining('required')
      });
    });

    it('should return 400 with diagnostic info for empty candidate', async () => {
      const response = await request(app)
        .post('/api/evaluation/meteor')
        .send({
          candidate: '',
          reference: 'Given user logged in'
        })
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBeTruthy();
    });

    it('should return 400 with diagnostic info for empty reference', async () => {
      const response = await request(app)
        .post('/api/evaluation/meteor')
        .send({
          candidate: 'Given user is logged in',
          reference: ''
        })
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBeTruthy();
    });

    it('should return 400 with diagnostic info for both fields missing', async () => {
      const response = await request(app)
        .post('/api/evaluation/meteor')
        .send({})
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body).toMatchObject({
        success: false,
        error: expect.stringContaining('required')
      });
    });
  });

  describe('Batch Evaluation Errors', () => {
    it('should return 400 with diagnostic info for missing scenarios array', async () => {
      const response = await request(app)
        .post('/api/evaluation/meteor/batch')
        .send({})
        .expect('Content-Type', /json/)
        .expect(400);

      // Requirement 8.5: Error message with diagnostic info
      expect(response.body).toMatchObject({
        success: false,
        error: expect.stringContaining('Scenarios array is required')
      });
    });

    it('should return 400 with diagnostic info for invalid scenarios format', async () => {
      const response = await request(app)
        .post('/api/evaluation/meteor/batch')
        .send({
          scenarios: 'not an array'
        })
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body).toMatchObject({
        success: false,
        error: expect.stringContaining('Scenarios array is required')
      });
    });

    it('should return 400 with diagnostic info for scenarios as number', async () => {
      const response = await request(app)
        .post('/api/evaluation/meteor/batch')
        .send({
          scenarios: 123
        })
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBeTruthy();
    });

    it('should return 400 with diagnostic info for scenarios as object', async () => {
      const response = await request(app)
        .post('/api/evaluation/meteor/batch')
        .send({
          scenarios: { candidate: 'test', reference: 'test' }
        })
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBeTruthy();
    });
  });

  describe('Quality Assessment Errors', () => {
    it('should return 400 with diagnostic info for invalid score format', async () => {
      const response = await request(app)
        .get('/api/evaluation/quality/invalid')
        .expect('Content-Type', /json/)
        .expect(400);

      // Requirement 8.5: Error message with diagnostic info
      expect(response.body).toMatchObject({
        success: false,
        error: expect.stringContaining('Score must be a number')
      });
    });

    it('should return 400 with diagnostic info for score below range', async () => {
      const response = await request(app)
        .get('/api/evaluation/quality/-0.5')
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body).toMatchObject({
        success: false,
        error: expect.stringContaining('between 0 and 1')
      });
    });

    it('should return 400 with diagnostic info for score above range', async () => {
      const response = await request(app)
        .get('/api/evaluation/quality/1.5')
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body).toMatchObject({
        success: false,
        error: expect.stringContaining('between 0 and 1')
      });
    });

    it('should return 400 with diagnostic info for NaN score', async () => {
      const response = await request(app)
        .get('/api/evaluation/quality/NaN')
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBeTruthy();
    });
  });

  describe('Malformed Request Errors', () => {
    it('should return 400 with diagnostic info for invalid JSON', async () => {
      const response = await request(app)
        .post('/api/evaluation/meteor')
        .set('Content-Type', 'application/json')
        .send('{ invalid json }')
        .expect(400);

      // Should handle JSON parse error
      expect(response.status).toBe(400);
    });

    it('should return 400 with diagnostic info for null body', async () => {
      const response = await request(app)
        .post('/api/evaluation/meteor')
        .send(null)
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should return 400 with diagnostic info for array body', async () => {
      const response = await request(app)
        .post('/api/evaluation/meteor')
        .send([])
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe('Edge Case Errors', () => {
    it('should handle very long candidate text gracefully', async () => {
      const longText = 'Given '.repeat(10000) + 'user is logged in';
      
      const response = await request(app)
        .post('/api/evaluation/meteor')
        .send({
          candidate: longText,
          reference: 'Given user logged in'
        })
        .expect('Content-Type', /json/);

      // Should either succeed or return appropriate error
      expect(response.body).toHaveProperty('success');
      if (!response.body.success) {
        expect(response.body.error).toBeTruthy();
      }
    });

    it('should handle special characters in text', async () => {
      const response = await request(app)
        .post('/api/evaluation/meteor')
        .send({
          candidate: 'Given user@#$%^&*() is logged in',
          reference: 'Given user logged in'
        })
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('should handle unicode characters in text', async () => {
      const response = await request(app)
        .post('/api/evaluation/meteor')
        .send({
          candidate: 'Given pengguna 用户 пользователь is logged in',
          reference: 'Given user logged in'
        })
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('should handle empty scenarios array gracefully', async () => {
      const response = await request(app)
        .post('/api/evaluation/meteor/batch')
        .send({
          scenarios: []
        })
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.batch_results).toHaveLength(0);
    });
  });

  describe('Error Response Format', () => {
    it('should include consistent error structure', async () => {
      const response = await request(app)
        .post('/api/evaluation/meteor')
        .send({})
        .expect('Content-Type', /json/)
        .expect(400);

      // Requirement 8.5: Consistent error format with diagnostic info
      expect(response.body).toHaveProperty('success');
      expect(response.body).toHaveProperty('error');
      expect(response.body.success).toBe(false);
      expect(typeof response.body.error).toBe('string');
      expect(response.body.error.length).toBeGreaterThan(0);
    });

    it('should not expose internal error details in production', async () => {
      const response = await request(app)
        .post('/api/evaluation/meteor')
        .send({})
        .expect('Content-Type', /json/)
        .expect(400);

      // Should not contain stack traces or internal paths
      expect(response.body.error).not.toContain('at ');
      expect(response.body.error).not.toContain('node_modules');
      expect(response.body.error).not.toContain('C:\\');
      expect(response.body.error).not.toContain('/home/');
    });

    it('should provide actionable error messages', async () => {
      const response = await request(app)
        .post('/api/evaluation/meteor')
        .send({
          candidate: 'test'
        })
        .expect('Content-Type', /json/)
        .expect(400);

      // Error message should be actionable
      expect(response.body.error).toMatch(/required|missing|invalid/i);
    });
  });

  describe('Service Unavailability Errors', () => {
    it('should handle METEOR service unavailable gracefully', async () => {
      const response = await request(app)
        .post('/api/evaluation/meteor')
        .send({
          candidate: 'Given user is logged in',
          reference: 'Given user logged in'
        })
        .expect('Content-Type', /json/)
        .expect(200);

      // Should return placeholder response when service unavailable
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('note');
      expect(response.body.data.note).toContain('unavailable');
    });

    it('should include service status in response', async () => {
      const response = await request(app)
        .post('/api/evaluation/test')
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body.data).toHaveProperty('note');
      expect(typeof response.body.data.note).toBe('string');
    });
  });
});
