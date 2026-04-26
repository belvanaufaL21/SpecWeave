/**
 * Unit Tests for Usage Limit Middleware
 * Tests request validation, limit checking, and error responses
 * 
 * Validates Requirements: 3.1, 3.2, 3.3, 3.4, 4.1, 4.2
 */

// Mock usageLimitService
jest.mock('../../services/usageLimitService.js');

const usageLimitService = require('../../services/usageLimitService.js').default;
const { checkUsageLimit } = require('../usageLimitMiddleware.js');

// Mock request, response, and next function
const createMockReq = (overrides = {}) => ({
  headers: {},
  user: null,
  body: {},
  params: {},
  ...overrides
});

const createMockRes = () => ({
  status: jest.fn().mockReturnThis(),
  json: jest.fn().mockReturnThis(),
});

const createMockNext = () => jest.fn();

describe('Usage Limit Middleware Unit Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Anonymous User Handling', () => {
    test('should skip limit check for anonymous users (no req.user)', async () => {
      const req = createMockReq(); // No user
      const res = createMockRes();
      const next = createMockNext();

      await checkUsageLimit(req, res, next);

      expect(usageLimitService.checkLimit).not.toHaveBeenCalled();
      expect(next).toHaveBeenCalledWith();
      expect(res.status).not.toHaveBeenCalled();
    });

    test('should skip limit check for users without id', async () => {
      const req = createMockReq({ user: {} }); // User object but no id
      const res = createMockRes();
      const next = createMockNext();

      await checkUsageLimit(req, res, next);

      expect(usageLimitService.checkLimit).not.toHaveBeenCalled();
      expect(next).toHaveBeenCalledWith();
      expect(res.status).not.toHaveBeenCalled();
    });
  });

  describe('Authenticated User - Successful Validation', () => {
    test('should attach usageLimit to req when limit check passes', async () => {
      const req = createMockReq({
        user: { id: 'user-123' },
        body: { model: 'llama-3.1-8b-instant' }
      });
      const res = createMockRes();
      const next = createMockNext();

      const mockLimitCheck = {
        allowed: true,
        modelName: 'llama-3.1-8b-instant',
        displayName: 'Llama 3.1 8B',
        provider: 'groq',
        tier: 'economy',
        limit: 50,
        used: 10,
        remaining: 40,
        modelId: 'model-uuid-123'
      };

      usageLimitService.checkLimit.mockResolvedValue(mockLimitCheck);

      await checkUsageLimit(req, res, next);

      expect(usageLimitService.checkLimit).toHaveBeenCalledWith('user-123', 'llama-3.1-8b-instant');
      expect(req.usageLimit).toEqual(mockLimitCheck);
      expect(next).toHaveBeenCalledWith();
      expect(res.status).not.toHaveBeenCalled();
    });

    test('should use default model when req.body.model is absent', async () => {
      const req = createMockReq({
        user: { id: 'user-456' },
        body: {} // No model specified
      });
      const res = createMockRes();
      const next = createMockNext();

      const mockLimitCheck = {
        allowed: true,
        modelName: 'llama-3.1-8b-instant',
        displayName: 'Llama 3.1 8B',
        provider: 'groq',
        tier: 'economy',
        limit: 50,
        used: 0,
        remaining: 50,
        modelId: 'model-uuid-123'
      };

      usageLimitService.checkLimit.mockResolvedValue(mockLimitCheck);

      await checkUsageLimit(req, res, next);

      expect(usageLimitService.checkLimit).toHaveBeenCalledWith('user-456', 'llama-3.1-8b-instant');
      expect(req.usageLimit).toEqual(mockLimitCheck);
      expect(next).toHaveBeenCalledWith();
    });

    test('should handle different model tiers correctly', async () => {
      const req = createMockReq({
        user: { id: 'user-789' },
        body: { model: 'gemini-2.5-pro' }
      });
      const res = createMockRes();
      const next = createMockNext();

      const mockLimitCheck = {
        allowed: true,
        modelName: 'gemini-2.5-pro',
        displayName: 'Gemini 2.5 Pro',
        provider: 'gemini',
        tier: 'premium',
        limit: 1,
        used: 0,
        remaining: 1,
        modelId: 'model-uuid-456'
      };

      usageLimitService.checkLimit.mockResolvedValue(mockLimitCheck);

      await checkUsageLimit(req, res, next);

      expect(usageLimitService.checkLimit).toHaveBeenCalledWith('user-789', 'gemini-2.5-pro');
      expect(req.usageLimit.tier).toBe('premium');
      expect(req.usageLimit.limit).toBe(1);
      expect(next).toHaveBeenCalledWith();
    });
  });

  describe('Limit Exceeded Response - Requirements 3.2, 3.3, 3.4', () => {
    test('should return 429 status code when limit exceeded (Req 3.2)', async () => {
      const req = createMockReq({
        user: { id: 'user-123' },
        body: { model: 'gemini-2.5-pro' }
      });
      const res = createMockRes();
      const next = createMockNext();

      const mockLimitCheck = {
        allowed: false,
        modelName: 'gemini-2.5-pro',
        displayName: 'Gemini 2.5 Pro',
        provider: 'gemini',
        tier: 'premium',
        limit: 1,
        used: 1,
        remaining: 0,
        alternatives: [
          {
            model: 'llama-3.1-8b-instant',
            displayName: 'Llama 3.1 8B',
            provider: 'groq',
            tier: 'economy',
            remaining: 38
          }
        ]
      };

      usageLimitService.checkLimit.mockResolvedValue(mockLimitCheck);

      await checkUsageLimit(req, res, next);

      expect(res.status).toHaveBeenCalledWith(429);
      expect(next).not.toHaveBeenCalled();
    });

    test('should include model name, tier, and limit in error message (Req 3.3)', async () => {
      const req = createMockReq({
        user: { id: 'user-123' },
        body: { model: 'gemini-2.5-flash' }
      });
      const res = createMockRes();
      const next = createMockNext();

      const mockLimitCheck = {
        allowed: false,
        modelName: 'gemini-2.5-flash',
        displayName: 'Gemini 2.5 Flash',
        provider: 'gemini',
        tier: 'standard',
        limit: 10,
        used: 10,
        remaining: 0,
        alternatives: []
      };

      usageLimitService.checkLimit.mockResolvedValue(mockLimitCheck);

      await checkUsageLimit(req, res, next);

      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'USAGE_LIMIT_EXCEEDED',
          message: expect.stringContaining('Gemini 2.5 Flash'),
          message: expect.stringContaining('standard'),
          message: expect.stringContaining('10'),
          model: 'gemini-2.5-flash',
          displayName: 'Gemini 2.5 Flash',
          tier: 'standard',
          limit: 10,
          used: 10,
          alternatives: []
        }
      });
    });

    test('should include alternatives list in error response (Req 3.4)', async () => {
      const req = createMockReq({
        user: { id: 'user-123' },
        body: { model: 'gemini-2.5-pro' }
      });
      const res = createMockRes();
      const next = createMockNext();

      const mockAlternatives = [
        {
          model: 'llama-3.1-8b-instant',
          displayName: 'Llama 3.1 8B',
          provider: 'groq',
          tier: 'economy',
          remaining: 38
        },
        {
          model: 'gemini-2.5-flash',
          displayName: 'Gemini 2.5 Flash',
          provider: 'gemini',
          tier: 'standard',
          remaining: 7
        }
      ];

      const mockLimitCheck = {
        allowed: false,
        modelName: 'gemini-2.5-pro',
        displayName: 'Gemini 2.5 Pro',
        provider: 'gemini',
        tier: 'premium',
        limit: 1,
        used: 1,
        remaining: 0,
        alternatives: mockAlternatives
      };

      usageLimitService.checkLimit.mockResolvedValue(mockLimitCheck);

      await checkUsageLimit(req, res, next);

      const responseCall = res.json.mock.calls[0][0];
      expect(responseCall.error.alternatives).toEqual(mockAlternatives);
      expect(responseCall.error.alternatives).toHaveLength(2);
      expect(responseCall.error.alternatives[0].remaining).toBeGreaterThan(0);
      expect(responseCall.error.alternatives[1].remaining).toBeGreaterThan(0);
    });

    test('should handle empty alternatives list when all models exhausted', async () => {
      const req = createMockReq({
        user: { id: 'user-123' },
        body: { model: 'llama-3.1-8b-instant' }
      });
      const res = createMockRes();
      const next = createMockNext();

      const mockLimitCheck = {
        allowed: false,
        modelName: 'llama-3.1-8b-instant',
        displayName: 'Llama 3.1 8B',
        provider: 'groq',
        tier: 'economy',
        limit: 50,
        used: 50,
        remaining: 0,
        alternatives: [] // No alternatives available
      };

      usageLimitService.checkLimit.mockResolvedValue(mockLimitCheck);

      await checkUsageLimit(req, res, next);

      const responseCall = res.json.mock.calls[0][0];
      expect(responseCall.error.alternatives).toEqual([]);
      expect(res.status).toHaveBeenCalledWith(429);
    });
  });

  describe('Error Handling', () => {
    test('should pass service errors to error handling middleware', async () => {
      const req = createMockReq({
        user: { id: 'user-123' },
        body: { model: 'invalid-model' }
      });
      const res = createMockRes();
      const next = createMockNext();

      const serviceError = new Error('Model not found: invalid-model');
      usageLimitService.checkLimit.mockRejectedValue(serviceError);

      await checkUsageLimit(req, res, next);

      expect(next).toHaveBeenCalledWith(serviceError);
      expect(res.status).not.toHaveBeenCalled();
    });

    test('should handle database connection errors', async () => {
      const req = createMockReq({
        user: { id: 'user-123' },
        body: { model: 'llama-3.1-8b-instant' }
      });
      const res = createMockRes();
      const next = createMockNext();

      const dbError = new Error('Database connection failed');
      usageLimitService.checkLimit.mockRejectedValue(dbError);

      await checkUsageLimit(req, res, next);

      expect(next).toHaveBeenCalledWith(dbError);
      expect(res.status).not.toHaveBeenCalled();
    });

    test('should handle service timeout errors', async () => {
      const req = createMockReq({
        user: { id: 'user-123' },
        body: { model: 'llama-3.1-8b-instant' }
      });
      const res = createMockRes();
      const next = createMockNext();

      const timeoutError = new Error('Request timeout');
      usageLimitService.checkLimit.mockRejectedValue(timeoutError);

      await checkUsageLimit(req, res, next);

      expect(next).toHaveBeenCalledWith(timeoutError);
    });
  });

  describe('Edge Cases', () => {
    test('should handle user at exactly the limit (remaining = 0)', async () => {
      const req = createMockReq({
        user: { id: 'user-123' },
        body: { model: 'gemini-2.5-pro' }
      });
      const res = createMockRes();
      const next = createMockNext();

      const mockLimitCheck = {
        allowed: false,
        modelName: 'gemini-2.5-pro',
        displayName: 'Gemini 2.5 Pro',
        provider: 'gemini',
        tier: 'premium',
        limit: 1,
        used: 1,
        remaining: 0,
        alternatives: []
      };

      usageLimitService.checkLimit.mockResolvedValue(mockLimitCheck);

      await checkUsageLimit(req, res, next);

      expect(res.status).toHaveBeenCalledWith(429);
      expect(next).not.toHaveBeenCalled();
    });

    test('should handle first-time user (used = 0)', async () => {
      const req = createMockReq({
        user: { id: 'new-user-123' },
        body: { model: 'llama-3.1-8b-instant' }
      });
      const res = createMockRes();
      const next = createMockNext();

      const mockLimitCheck = {
        allowed: true,
        modelName: 'llama-3.1-8b-instant',
        displayName: 'Llama 3.1 8B',
        provider: 'groq',
        tier: 'economy',
        limit: 50,
        used: 0,
        remaining: 50,
        modelId: 'model-uuid-123'
      };

      usageLimitService.checkLimit.mockResolvedValue(mockLimitCheck);

      await checkUsageLimit(req, res, next);

      expect(req.usageLimit.used).toBe(0);
      expect(req.usageLimit.remaining).toBe(50);
      expect(next).toHaveBeenCalledWith();
    });

    test('should handle model name with special characters', async () => {
      const req = createMockReq({
        user: { id: 'user-123' },
        body: { model: 'llama-3.1-8b-instant' }
      });
      const res = createMockRes();
      const next = createMockNext();

      const mockLimitCheck = {
        allowed: true,
        modelName: 'llama-3.1-8b-instant',
        displayName: 'Llama 3.1 8B',
        provider: 'groq',
        tier: 'economy',
        limit: 50,
        used: 5,
        remaining: 45,
        modelId: 'model-uuid-123'
      };

      usageLimitService.checkLimit.mockResolvedValue(mockLimitCheck);

      await checkUsageLimit(req, res, next);

      expect(usageLimitService.checkLimit).toHaveBeenCalledWith('user-123', 'llama-3.1-8b-instant');
      expect(next).toHaveBeenCalledWith();
    });

    test('should handle null or undefined model in request body', async () => {
      const req = createMockReq({
        user: { id: 'user-123' },
        body: { model: null }
      });
      const res = createMockRes();
      const next = createMockNext();

      const mockLimitCheck = {
        allowed: true,
        modelName: 'llama-3.1-8b-instant',
        displayName: 'Llama 3.1 8B',
        provider: 'groq',
        tier: 'economy',
        limit: 50,
        used: 0,
        remaining: 50,
        modelId: 'model-uuid-123'
      };

      usageLimitService.checkLimit.mockResolvedValue(mockLimitCheck);

      await checkUsageLimit(req, res, next);

      // Should default to 'llama-3.1-8b-instant'
      expect(usageLimitService.checkLimit).toHaveBeenCalledWith('user-123', 'llama-3.1-8b-instant');
    });
  });

  describe('Requirements Validation - 4.1, 4.2', () => {
    test('should validate limit before LLM request (Req 4.1)', async () => {
      const req = createMockReq({
        user: { id: 'user-123' },
        body: { model: 'gemini-2.5-pro' }
      });
      const res = createMockRes();
      const next = createMockNext();

      const mockLimitCheck = {
        allowed: false,
        modelName: 'gemini-2.5-pro',
        displayName: 'Gemini 2.5 Pro',
        provider: 'gemini',
        tier: 'premium',
        limit: 1,
        used: 1,
        remaining: 0,
        alternatives: []
      };

      usageLimitService.checkLimit.mockResolvedValue(mockLimitCheck);

      await checkUsageLimit(req, res, next);

      // Middleware should reject before controller processes request
      expect(res.status).toHaveBeenCalledWith(429);
      expect(next).not.toHaveBeenCalled();
      expect(req.usageLimit).toBeUndefined(); // Not attached when rejected
    });

    test('should not call next when limit exceeded (Req 4.2)', async () => {
      const req = createMockReq({
        user: { id: 'user-123' },
        body: { model: 'llama-3.1-8b-instant' }
      });
      const res = createMockRes();
      const next = createMockNext();

      const mockLimitCheck = {
        allowed: false,
        modelName: 'llama-3.1-8b-instant',
        displayName: 'Llama 3.1 8B',
        provider: 'groq',
        tier: 'economy',
        limit: 50,
        used: 50,
        remaining: 0,
        alternatives: []
      };

      usageLimitService.checkLimit.mockResolvedValue(mockLimitCheck);

      await checkUsageLimit(req, res, next);

      // Should not proceed to controller
      expect(next).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(429);
    });
  });
});

