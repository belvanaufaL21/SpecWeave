/**
 * Property Test: Rate Limit Status Code
 * Feature: llm-usage-limit-system, Property 7: Rate Limit Status Code
 * 
 * Property: For any request that is rejected due to reaching the usage limit,
 * the HTTP response status code SHALL be 429.
 * 
 * Validates: Requirements 3.2
 */

import fc from 'fast-check';
import usageLimitService from '../../services/usageLimitService.js';
import { checkUsageLimit } from '../usageLimitMiddleware.js';

// Mock the service
jest.mock('../../services/usageLimitService.js');

const testConfig = { numRuns: 100 };

// Arbitraries for generating test data
const userIdArbitrary = fc.uuid();
const modelNameArbitrary = fc.constantFrom(
  'llama-3.1-8b-instant',
  'gemini-2.5-flash',
  'gemini-2.5-pro'
);
const tierArbitrary = fc.constantFrom('economy', 'standard', 'premium');
const limitArbitrary = fc.constantFrom(50, 10, 1);

// Helper to create mock request
const createMockReq = (userId, modelName) => ({
  user: { id: userId },
  body: { model: modelName },
  headers: {},
  params: {},
});

// Helper to create mock response
const createMockRes = () => {
  const res = {
    statusCode: null,
    jsonData: null,
  };
  res.status = jest.fn((code) => {
    res.statusCode = code;
    return res;
  });
  res.json = jest.fn((data) => {
    res.jsonData = data;
    return res;
  });
  return res;
};

// Helper to create mock next
const createMockNext = () => jest.fn();

describe('Property Test: Rate Limit Status Code', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('Property 7: Requests exceeding limits always return 429 status code', async () => {
    await fc.assert(
      fc.asyncProperty(
        userIdArbitrary,
        modelNameArbitrary,
        tierArbitrary,
        limitArbitrary,
        fc.nat(100), // used count
        async (userId, modelName, tier, limit, used) => {
          // Precondition: used >= limit (limit exceeded)
          const actualUsed = Math.max(used, limit);
          
          // Setup mock to return limit exceeded
          const mockLimitCheck = {
            allowed: false,
            modelName,
            displayName: `Test Model ${modelName}`,
            provider: tier === 'economy' ? 'groq' : 'gemini',
            tier,
            limit,
            used: actualUsed,
            remaining: 0,
            alternatives: [],
          };

          usageLimitService.checkLimit.mockResolvedValue(mockLimitCheck);

          // Create mock request/response
          const req = createMockReq(userId, modelName);
          const res = createMockRes();
          const next = createMockNext();

          // Execute middleware
          await checkUsageLimit(req, res, next);

          // Property: Status code MUST be 429
          expect(res.statusCode).toBe(429);
          
          // Additional invariants
          expect(next).not.toHaveBeenCalled(); // Should not proceed
          expect(res.jsonData).toBeDefined();
          expect(res.jsonData.success).toBe(false);
          expect(res.jsonData.error.code).toBe('USAGE_LIMIT_EXCEEDED');
        }
      ),
      testConfig
    );
  });

  test('Property 7: Status code 429 is returned regardless of tier', async () => {
    await fc.assert(
      fc.asyncProperty(
        userIdArbitrary,
        tierArbitrary,
        async (userId, tier) => {
          // Map tier to model and limit
          const tierConfig = {
            economy: { model: 'llama-3.1-8b-instant', limit: 50 },
            standard: { model: 'gemini-2.5-flash', limit: 10 },
            premium: { model: 'gemini-2.5-pro', limit: 1 },
          };

          const { model, limit } = tierConfig[tier];

          // Setup mock with limit exceeded
          const mockLimitCheck = {
            allowed: false,
            modelName: model,
            displayName: `Test ${tier}`,
            provider: tier === 'economy' ? 'groq' : 'gemini',
            tier,
            limit,
            used: limit,
            remaining: 0,
            alternatives: [],
          };

          usageLimitService.checkLimit.mockResolvedValue(mockLimitCheck);

          const req = createMockReq(userId, model);
          const res = createMockRes();
          const next = createMockNext();

          await checkUsageLimit(req, res, next);

          // Property: All tiers return 429 when limit exceeded
          expect(res.statusCode).toBe(429);
        }
      ),
      testConfig
    );
  });

  test('Property 7: Status code 429 with various usage patterns', async () => {
    await fc.assert(
      fc.asyncProperty(
        userIdArbitrary,
        modelNameArbitrary,
        fc.integer({ min: 1, max: 100 }), // limit
        fc.integer({ min: 0, max: 50 }), // excess amount
        async (userId, modelName, limit, excess) => {
          // used = limit + excess (always exceeds)
          const used = limit + excess;

          const mockLimitCheck = {
            allowed: false,
            modelName,
            displayName: 'Test Model',
            provider: 'groq',
            tier: 'economy',
            limit,
            used,
            remaining: 0,
            alternatives: [],
          };

          usageLimitService.checkLimit.mockResolvedValue(mockLimitCheck);

          const req = createMockReq(userId, modelName);
          const res = createMockRes();
          const next = createMockNext();

          await checkUsageLimit(req, res, next);

          // Property: Always 429 when used >= limit
          expect(res.statusCode).toBe(429);
          expect(res.jsonData.error.used).toBeGreaterThanOrEqual(limit);
        }
      ),
      testConfig
    );
  });

  test('Property 7: Status code 429 at exact limit boundary', async () => {
    await fc.assert(
      fc.asyncProperty(
        userIdArbitrary,
        modelNameArbitrary,
        fc.constantFrom(1, 10, 50), // Common limits
        async (userId, modelName, limit) => {
          // Exact boundary: used === limit
          const mockLimitCheck = {
            allowed: false,
            modelName,
            displayName: 'Test Model',
            provider: 'groq',
            tier: 'economy',
            limit,
            used: limit,
            remaining: 0,
            alternatives: [],
          };

          usageLimitService.checkLimit.mockResolvedValue(mockLimitCheck);

          const req = createMockReq(userId, modelName);
          const res = createMockRes();
          const next = createMockNext();

          await checkUsageLimit(req, res, next);

          // Property: 429 at exact limit boundary
          expect(res.statusCode).toBe(429);
          expect(res.jsonData.error.used).toBe(limit);
          expect(res.jsonData.error.limit).toBe(limit);
        }
      ),
      testConfig
    );
  });

  test('Property 7: No other status code is returned for limit exceeded', async () => {
    await fc.assert(
      fc.asyncProperty(
        userIdArbitrary,
        modelNameArbitrary,
        fc.nat(100),
        async (userId, modelName, limit) => {
          const mockLimitCheck = {
            allowed: false,
            modelName,
            displayName: 'Test Model',
            provider: 'groq',
            tier: 'economy',
            limit,
            used: limit + 1,
            remaining: 0,
            alternatives: [],
          };

          usageLimitService.checkLimit.mockResolvedValue(mockLimitCheck);

          const req = createMockReq(userId, modelName);
          const res = createMockRes();
          const next = createMockNext();

          await checkUsageLimit(req, res, next);

          // Property: Status code is exactly 429, not 400, 403, 500, etc.
          expect(res.statusCode).toBe(429);
          expect(res.statusCode).not.toBe(400);
          expect(res.statusCode).not.toBe(403);
          expect(res.statusCode).not.toBe(500);
        }
      ),
      testConfig
    );
  });
});
