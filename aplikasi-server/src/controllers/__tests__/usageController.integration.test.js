/**
 * Integration Tests for Usage Controller
 * Tests the complete flow for usage limits and history endpoints
 * 
 * Requirements: 5.1, 5.2
 */

import request from 'supertest';
import express from 'express';
import { v4 as uuidv4 } from 'uuid';

// Mock dependencies before importing routes
jest.mock('../../services/usageLimitService.js');
jest.mock('../../services/supabaseService.js');
jest.mock('../../middlewares/auth.js', () => ({
  authenticate: (req, res, next) => {
    if (req.headers.authorization === 'Bearer valid-token') {
      req.user = { id: 'test-user-id-123' };
    }
    next();
  },
  validateSession: (req, res, next) => {
    next();
  }
}));

import usageRoutes from '../../routes/usageRoutes.js';
import { errorHandler } from '../../middlewares/errorHandler.js';
import usageLimitService from '../../services/usageLimitService.js';
import supabaseService from '../../services/supabaseService.js';

// Create test app
const app = express();
app.use(express.json());
app.use('/api/usage', usageRoutes);
app.use(errorHandler);

describe('Usage Endpoints - Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/usage/limits', () => {
    it('should return accurate usage data for authenticated user with no usage', async () => {
      // Requirement 5.1: Provide endpoint to fetch usage limits
      // Requirement 5.2: Display tier, limit, and remaining requests

      const mockModels = [
        {
          id: uuidv4(),
          name: 'llama-3.1-8b-instant',
          displayName: 'Llama 3.1 8B',
          provider: 'groq',
          tier: 'economy',
          limit: 50,
          used: 0,
          remaining: 50
        },
        {
          id: uuidv4(),
          name: 'gemini-2.5-flash',
          displayName: 'Gemini 2.5 Flash',
          provider: 'gemini',
          tier: 'standard',
          limit: 10,
          used: 0,
          remaining: 10
        },
        {
          id: uuidv4(),
          name: 'gemini-2.5-pro',
          displayName: 'Gemini 2.5 Pro',
          provider: 'gemini',
          tier: 'premium',
          limit: 1,
          used: 0,
          remaining: 1
        }
      ];

      usageLimitService.getUserUsage.mockResolvedValue(mockModels);

      const response = await request(app)
        .get('/api/usage/limits')
        .set('Authorization', 'Bearer valid-token')
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('models');
      expect(Array.isArray(response.body.data.models)).toBe(true);

      // Verify structure of model data
      const models = response.body.data.models;
      expect(models.length).toBe(3);

      models.forEach(model => {
        expect(model).toHaveProperty('id');
        expect(model).toHaveProperty('name');
        expect(model).toHaveProperty('displayName');
        expect(model).toHaveProperty('provider');
        expect(model).toHaveProperty('tier');
        expect(model).toHaveProperty('limit');
        expect(model).toHaveProperty('used');
        expect(model).toHaveProperty('remaining');

        // Verify data types
        expect(typeof model.name).toBe('string');
        expect(typeof model.displayName).toBe('string');
        expect(typeof model.provider).toBe('string');
        expect(typeof model.tier).toBe('string');
        expect(typeof model.limit).toBe('number');
        expect(typeof model.used).toBe('number');
        expect(typeof model.remaining).toBe('number');

        // For new user, used should be 0 and remaining should equal limit
        expect(model.used).toBe(0);
        expect(model.remaining).toBe(model.limit);
      });

      expect(usageLimitService.getUserUsage).toHaveBeenCalledWith('test-user-id-123');
    });

    it('should return accurate usage data for authenticated user with existing usage', async () => {
      const mockModels = [
        {
          id: uuidv4(),
          name: 'llama-3.1-8b-instant',
          displayName: 'Llama 3.1 8B',
          provider: 'groq',
          tier: 'economy',
          limit: 50,
          used: 5,
          remaining: 45
        },
        {
          id: uuidv4(),
          name: 'gemini-2.5-flash',
          displayName: 'Gemini 2.5 Flash',
          provider: 'gemini',
          tier: 'standard',
          limit: 10,
          used: 0,
          remaining: 10
        },
        {
          id: uuidv4(),
          name: 'gemini-2.5-pro',
          displayName: 'Gemini 2.5 Pro',
          provider: 'gemini',
          tier: 'premium',
          limit: 1,
          used: 0,
          remaining: 1
        }
      ];

      usageLimitService.getUserUsage.mockResolvedValue(mockModels);

      const response = await request(app)
        .get('/api/usage/limits')
        .set('Authorization', 'Bearer valid-token')
        .expect(200);

      expect(response.body.success).toBe(true);
      
      const llamaModel = response.body.data.models.find(
        m => m.name === 'llama-3.1-8b-instant'
      );

      expect(llamaModel).toBeDefined();
      expect(llamaModel.used).toBe(5);
      expect(llamaModel.remaining).toBe(45);
    });

    it('should return 401 for unauthenticated users', async () => {
      // Requirement 5.1: Authentication required
      const response = await request(app)
        .get('/api/usage/limits')
        .expect(401);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toHaveProperty('message', 'User not authenticated');
      
      // Service should not be called for unauthenticated users
      expect(usageLimitService.getUserUsage).not.toHaveBeenCalled();
    });

    it('should include all active models in response', async () => {
      const mockModels = [
        {
          id: uuidv4(),
          name: 'llama-3.1-8b-instant',
          displayName: 'Llama 3.1 8B',
          provider: 'groq',
          tier: 'economy',
          limit: 50,
          used: 0,
          remaining: 50
        },
        {
          id: uuidv4(),
          name: 'gemini-2.5-flash',
          displayName: 'Gemini 2.5 Flash',
          provider: 'gemini',
          tier: 'standard',
          limit: 10,
          used: 0,
          remaining: 10
        },
        {
          id: uuidv4(),
          name: 'gemini-2.5-pro',
          displayName: 'Gemini 2.5 Pro',
          provider: 'gemini',
          tier: 'premium',
          limit: 1,
          used: 0,
          remaining: 1
        }
      ];

      usageLimitService.getUserUsage.mockResolvedValue(mockModels);

      const response = await request(app)
        .get('/api/usage/limits')
        .set('Authorization', 'Bearer valid-token')
        .expect(200);

      const models = response.body.data.models;
      const modelNames = models.map(m => m.name);

      // Verify all three seeded models are present
      expect(modelNames).toContain('llama-3.1-8b-instant');
      expect(modelNames).toContain('gemini-2.5-flash');
      expect(modelNames).toContain('gemini-2.5-pro');
    });

    it('should show correct tier information for each model', async () => {
      const mockModels = [
        {
          id: uuidv4(),
          name: 'llama-3.1-8b-instant',
          displayName: 'Llama 3.1 8B',
          provider: 'groq',
          tier: 'economy',
          limit: 50,
          used: 0,
          remaining: 50
        },
        {
          id: uuidv4(),
          name: 'gemini-2.5-flash',
          displayName: 'Gemini 2.5 Flash',
          provider: 'gemini',
          tier: 'standard',
          limit: 10,
          used: 0,
          remaining: 10
        },
        {
          id: uuidv4(),
          name: 'gemini-2.5-pro',
          displayName: 'Gemini 2.5 Pro',
          provider: 'gemini',
          tier: 'premium',
          limit: 1,
          used: 0,
          remaining: 1
        }
      ];

      usageLimitService.getUserUsage.mockResolvedValue(mockModels);

      const response = await request(app)
        .get('/api/usage/limits')
        .set('Authorization', 'Bearer valid-token')
        .expect(200);

      const models = response.body.data.models;

      const llamaModel = models.find(m => m.name === 'llama-3.1-8b-instant');
      const geminiFlash = models.find(m => m.name === 'gemini-2.5-flash');
      const geminiPro = models.find(m => m.name === 'gemini-2.5-pro');

      expect(llamaModel.tier).toBe('economy');
      expect(llamaModel.limit).toBe(50);

      expect(geminiFlash.tier).toBe('standard');
      expect(geminiFlash.limit).toBe(10);

      expect(geminiPro.tier).toBe('premium');
      expect(geminiPro.limit).toBe(1);
    });
  });

  describe('GET /api/usage/history', () => {
    it('should return usage history for authenticated user', async () => {
      // Requirement 5.2: Provide usage history
      
      const mockHistory = [
        {
          id: uuidv4(),
          model: 'llama-3.1-8b-instant',
          displayName: 'Llama 3.1 8B',
          success: true,
          errorMessage: null,
          requestId: uuidv4(),
          createdAt: new Date().toISOString()
        },
        {
          id: uuidv4(),
          model: 'llama-3.1-8b-instant',
          displayName: 'Llama 3.1 8B',
          success: true,
          errorMessage: null,
          requestId: uuidv4(),
          createdAt: new Date(Date.now() - 1800000).toISOString()
        },
        {
          id: uuidv4(),
          model: 'llama-3.1-8b-instant',
          displayName: 'Llama 3.1 8B',
          success: false,
          errorMessage: 'Test error',
          requestId: uuidv4(),
          createdAt: new Date(Date.now() - 3600000).toISOString()
        }
      ];

      const mockClient = {
        from: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        range: jest.fn().mockResolvedValue({
          data: mockHistory.map(h => ({
            id: h.id,
            request_id: h.requestId,
            success: h.success,
            error_message: h.errorMessage,
            created_at: h.createdAt,
            models: {
              name: h.model,
              display_name: h.displayName
            }
          })),
          error: null,
          count: 3
        })
      };

      supabaseService.getClient.mockReturnValue(mockClient);

      const response = await request(app)
        .get('/api/usage/history')
        .set('Authorization', 'Bearer valid-token')
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('history');
      expect(response.body.data).toHaveProperty('total');
      expect(response.body.data).toHaveProperty('limit');
      expect(response.body.data).toHaveProperty('offset');

      const history = response.body.data.history;
      expect(Array.isArray(history)).toBe(true);
      expect(history.length).toBe(3);

      // Verify structure
      history.forEach(record => {
        expect(record).toHaveProperty('id');
        expect(record).toHaveProperty('model');
        expect(record).toHaveProperty('displayName');
        expect(record).toHaveProperty('success');
        expect(record).toHaveProperty('createdAt');
      });
    });

    it('should support pagination with limit and offset', async () => {
      const mockHistoryPage1 = Array.from({ length: 5 }, (_, i) => ({
        id: uuidv4(),
        request_id: uuidv4(),
        success: true,
        error_message: null,
        created_at: new Date(Date.now() - i * 60000).toISOString(),
        models: {
          name: 'llama-3.1-8b-instant',
          display_name: 'Llama 3.1 8B'
        }
      }));

      const mockHistoryPage2 = Array.from({ length: 5 }, (_, i) => ({
        id: uuidv4(),
        request_id: uuidv4(),
        success: true,
        error_message: null,
        created_at: new Date(Date.now() - (i + 5) * 60000).toISOString(),
        models: {
          name: 'llama-3.1-8b-instant',
          display_name: 'Llama 3.1 8B'
        }
      }));

      const mockClient = {
        from: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        range: jest.fn()
          .mockResolvedValueOnce({
            data: mockHistoryPage1,
            error: null,
            count: 10
          })
          .mockResolvedValueOnce({
            data: mockHistoryPage2,
            error: null,
            count: 10
          })
      };

      supabaseService.getClient.mockReturnValue(mockClient);

      // Test first page
      const response1 = await request(app)
        .get('/api/usage/history?limit=5&offset=0')
        .set('Authorization', 'Bearer valid-token')
        .expect(200);

      expect(response1.body.data.history.length).toBe(5);
      expect(response1.body.data.total).toBe(10);
      expect(response1.body.data.limit).toBe(5);
      expect(response1.body.data.offset).toBe(0);

      // Test second page
      const response2 = await request(app)
        .get('/api/usage/history?limit=5&offset=5')
        .set('Authorization', 'Bearer valid-token')
        .expect(200);

      expect(response2.body.data.history.length).toBe(5);
      expect(response2.body.data.total).toBe(10);
      expect(response2.body.data.limit).toBe(5);
      expect(response2.body.data.offset).toBe(5);

      // Verify no overlap
      const ids1 = response1.body.data.history.map(r => r.id);
      const ids2 = response2.body.data.history.map(r => r.id);
      const overlap = ids1.filter(id => ids2.includes(id));
      expect(overlap.length).toBe(0);
    });

    it.skip('should support filtering by model name', async () => {
      const mockHistory = [
        {
          id: uuidv4(),
          request_id: uuidv4(),
          success: true,
          error_message: null,
          created_at: new Date().toISOString(),
          models: {
            name: 'llama-3.1-8b-instant',
            display_name: 'Llama 3.1 8B'
          }
        },
        {
          id: uuidv4(),
          request_id: uuidv4(),
          success: true,
          error_message: null,
          created_at: new Date().toISOString(),
          models: {
            name: 'llama-3.1-8b-instant',
            display_name: 'Llama 3.1 8B'
          }
        }
      ];

      const mockClient = {
        from: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        range: jest.fn().mockResolvedValue({
          data: mockHistory,
          error: null,
          count: 2
        })
      };

      supabaseService.getClient.mockReturnValue(mockClient);

      const response = await request(app)
        .get('/api/usage/history?model=llama-3.1-8b-instant')
        .set('Authorization', 'Bearer valid-token')
        .expect(200);

      expect(response.body.data.history.length).toBe(2);
      response.body.data.history.forEach(record => {
        expect(record.model).toBe('llama-3.1-8b-instant');
      });
    });

    it('should return 401 for unauthenticated users', async () => {
      const response = await request(app)
        .get('/api/usage/history')
        .expect(401);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toHaveProperty('message', 'User not authenticated');
    });

    it('should validate pagination parameters', async () => {
      // Test invalid limit (too high)
      const response1 = await request(app)
        .get('/api/usage/history?limit=200')
        .set('Authorization', 'Bearer valid-token')
        .expect(400);

      expect(response1.body).toHaveProperty('error');

      // Test invalid limit (negative)
      const response2 = await request(app)
        .get('/api/usage/history?limit=-5')
        .set('Authorization', 'Bearer valid-token')
        .expect(400);

      expect(response2.body).toHaveProperty('error');

      // Test invalid offset (negative)
      const response3 = await request(app)
        .get('/api/usage/history?offset=-1')
        .set('Authorization', 'Bearer valid-token')
        .expect(400);

      expect(response3.body).toHaveProperty('error');
    });

    it('should use default pagination values when not provided', async () => {
      const mockClient = {
        from: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        range: jest.fn().mockResolvedValue({
          data: [],
          error: null,
          count: 0
        })
      };

      supabaseService.getClient.mockReturnValue(mockClient);

      const response = await request(app)
        .get('/api/usage/history')
        .set('Authorization', 'Bearer valid-token')
        .expect(200);

      expect(response.body.data.limit).toBe(50);
      expect(response.body.data.offset).toBe(0);
    });

    it('should return empty array when user has no history', async () => {
      const mockClient = {
        from: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        range: jest.fn().mockResolvedValue({
          data: [],
          error: null,
          count: 0
        })
      };

      supabaseService.getClient.mockReturnValue(mockClient);

      const response = await request(app)
        .get('/api/usage/history')
        .set('Authorization', 'Bearer valid-token')
        .expect(200);

      expect(response.body.data.history).toEqual([]);
      expect(response.body.data.total).toBe(0);
    });
  });

  describe('Complete flow validation', () => {
    it('should handle concurrent requests to both endpoints', async () => {
      const mockModels = [
        {
          id: uuidv4(),
          name: 'llama-3.1-8b-instant',
          displayName: 'Llama 3.1 8B',
          provider: 'groq',
          tier: 'economy',
          limit: 50,
          used: 0,
          remaining: 50
        }
      ];

      const mockClient = {
        from: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        range: jest.fn().mockResolvedValue({
          data: [],
          error: null,
          count: 0
        })
      };

      usageLimitService.getUserUsage.mockResolvedValue(mockModels);
      supabaseService.getClient.mockReturnValue(mockClient);

      const requests = [
        request(app)
          .get('/api/usage/limits')
          .set('Authorization', 'Bearer valid-token'),
        request(app)
          .get('/api/usage/history')
          .set('Authorization', 'Bearer valid-token'),
        request(app)
          .get('/api/usage/limits')
          .set('Authorization', 'Bearer valid-token')
      ];

      const responses = await Promise.all(requests);

      responses.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
      });
    });
  });
});
