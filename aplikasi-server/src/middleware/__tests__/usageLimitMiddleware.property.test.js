/**
 * Property-Based Tests for Usage Limit Middleware
 * Tests universal properties using fast-check
 * 
 * Feature: llm-usage-limit-system
 * Properties: 7, 8, 9
 */

const fc = require('fast-check');

// Mock usageLimitService
jest.mock('../../services/usageLimitService.js');

const usageLimitService = require('../../services/usageLimitService.js').default;
const { checkUsageLimit } = require('../usageLimitMiddleware.js');

// Test configuration
const testConfig = { numRuns: 100 };

// Arbitraries (generators)
const modelNameArb = fc.constantFrom(
  'llama-3.1-8b-instant',
  'gemini-2.5-flash',
  'gemini-2.5-pro'
);

const tierArb = fc.constantFrom('economy', 'standard', 'premium');

const providerArb = fc.constantFrom('groq', 'gemini');

const userIdArb = fc.uuid();

const limitArb = fc.constantFrom(1, 10, 50);

const usedArb = fc.nat({ max: 100 });

const alternativeModelArb = fc.record({
  model: modelNameArb,
  displayName: fc.string({ minLength: 5, maxLength: 30 }),
  provider: providerArb,
  tier: tierArb,
  remaining: fc.integer({ min: 1, max: 50 })
});

const alternativesListArb = fc.array(alternativeModelArb, { minLength: 0, maxLength: 5 });

// Mock request, response, and next function
const createMockReq = (userId, modelName) => ({
  headers: {},
  user: userId ? { id: userId } : null,
  body: modelName ? { model: modelName } : {},
  params: {},
});

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

const createMockNext = () => jest.fn();

describe('Usage Limit Middleware Property-Based Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // Feature: llm-usage-limit-system, Property 7: Rate Limit Status Code
  describe('Property 7: Rate Limit Status Code', () => {
    /**
     * **Validates: Requirements 3.2**
     * 
     * For any request that is rejected due to reaching the usage limit,
     * the HTTP response status code SHALL be 429.
     */
    test('rejected requests always return 429 status code', async () => {
      await fc.assert(
        fc.asyncProperty(
          userIdArb,
          modelNameArb,
          tierArb,
          providerArb,
          limitArb,
          alternativesListArb,
          async (userId, modelName, tier, provider, limit, alternatives) => {
            // Setup: Create a limit exceeded scenario
            const mockLimitCheck = {
              allowed: false,
              modelName,
              displayName: `${modelName} Display`,
              provider,
              tier,
              limit,
              used: limit, // Used equals limit (exceeded)
              remaining: 0,
              alternatives
            };

            usageLimitService.checkLimit.mockResolvedValue(mockLimitCheck);

            const req = createMockReq(userId, modelName);
            const res = createMockRes();
            const next = createMockNext();

            // Execute
            await checkUsageLimit(req, res, next);

            // Verify: Status code must be 429
            expect(res.statusCode).toBe(429);
            expect(next).not.toHaveBeenCalled();
          }
        ),
        testConfig
      );
    });

    test('rejected requests with varying usage patterns return 429', async () => {
      await fc.assert(
        fc.asyncProperty(
          userIdArb,
          modelNameArb,
          tierArb,
          providerArb,
          limitArb,
          usedArb,
          alternativesListArb,
          async (userId, modelName, tier, provider, limit, used, alternatives) => {
            // Only test when limit is exceeded
            const actualUsed = Math.max(limit, used);
            
            const mockLimitCheck = {
              allowed: false,
              modelName,
              displayName: `${modelName} Display`,
              provider,
              tier,
              limit,
              used: actualUsed,
              remaining: 0,
              alternatives
            };

            usageLimitService.checkLimit.mockResolvedValue(mockLimitCheck);

            const req = createMockReq(userId, modelName);
            const res = createMockRes();
            const next = createMockNext();

            await checkUsageLimit(req, res, next);

            // Property: All rejected requests return 429
            expect(res.statusCode).toBe(429);
          }
        ),
        testConfig
      );
    });
  });

  // Feature: llm-usage-limit-system, Property 8: Error Message Completeness
  describe('Property 8: Error Message Completeness', () => {
    /**
     * **Validates: Requirements 3.3**
     * 
     * For any rejected request, the error response SHALL include
     * the model name, tier name, and request limit that was exceeded.
     */
    test('error response includes model name, tier, and limit', async () => {
      await fc.assert(
        fc.asyncProperty(
          userIdArb,
          modelNameArb,
          fc.string({ minLength: 5, maxLength: 30 }), // displayName
          tierArb,
          providerArb,
          limitArb,
          alternativesListArb,
          async (userId, modelName, displayName, tier, provider, limit, alternatives) => {
            const mockLimitCheck = {
              allowed: false,
              modelName,
              displayName,
              provider,
              tier,
              limit,
              used: limit,
              remaining: 0,
              alternatives
            };

            usageLimitService.checkLimit.mockResolvedValue(mockLimitCheck);

            const req = createMockReq(userId, modelName);
            const res = createMockRes();
            const next = createMockNext();

            await checkUsageLimit(req, res, next);

            // Verify: Error response structure
            expect(res.jsonData).toBeDefined();
            expect(res.jsonData.success).toBe(false);
            expect(res.jsonData.error).toBeDefined();

            const error = res.jsonData.error;

            // Property: Must include model name
            expect(error.model).toBe(modelName);
            expect(error.displayName).toBe(displayName);

            // Property: Must include tier name
            expect(error.tier).toBe(tier);

            // Property: Must include request limit
            expect(error.limit).toBe(limit);

            // Property: Must include used count
            expect(error.used).toBe(limit);

            // Property: Error message must mention display name
            expect(error.message).toContain(displayName);
          }
        ),
        testConfig
      );
    });

    test('error message contains tier and limit information', async () => {
      await fc.assert(
        fc.asyncProperty(
          userIdArb,
          modelNameArb,
          fc.string({ minLength: 5, maxLength: 30 }),
          tierArb,
          providerArb,
          limitArb,
          alternativesListArb,
          async (userId, modelName, displayName, tier, provider, limit, alternatives) => {
            const mockLimitCheck = {
              allowed: false,
              modelName,
              displayName,
              provider,
              tier,
              limit,
              used: limit,
              remaining: 0,
              alternatives
            };

            usageLimitService.checkLimit.mockResolvedValue(mockLimitCheck);

            const req = createMockReq(userId, modelName);
            const res = createMockRes();
            const next = createMockNext();

            await checkUsageLimit(req, res, next);

            const error = res.jsonData.error;

            // Property: Message must contain tier name
            expect(error.message).toContain(tier);

            // Property: Message must contain limit value
            expect(error.message).toContain(limit.toString());
          }
        ),
        testConfig
      );
    });

    test('error response has consistent structure across all rejections', async () => {
      await fc.assert(
        fc.asyncProperty(
          userIdArb,
          modelNameArb,
          fc.string({ minLength: 5, maxLength: 30 }),
          tierArb,
          providerArb,
          limitArb,
          alternativesListArb,
          async (userId, modelName, displayName, tier, provider, limit, alternatives) => {
            const mockLimitCheck = {
              allowed: false,
              modelName,
              displayName,
              provider,
              tier,
              limit,
              used: limit,
              remaining: 0,
              alternatives
            };

            usageLimitService.checkLimit.mockResolvedValue(mockLimitCheck);

            const req = createMockReq(userId, modelName);
            const res = createMockRes();
            const next = createMockNext();

            await checkUsageLimit(req, res, next);

            const response = res.jsonData;

            // Property: Consistent error structure
            expect(response).toHaveProperty('success', false);
            expect(response).toHaveProperty('error');
            expect(response.error).toHaveProperty('code', 'USAGE_LIMIT_EXCEEDED');
            expect(response.error).toHaveProperty('message');
            expect(response.error).toHaveProperty('model');
            expect(response.error).toHaveProperty('displayName');
            expect(response.error).toHaveProperty('tier');
            expect(response.error).toHaveProperty('limit');
            expect(response.error).toHaveProperty('used');
            expect(response.error).toHaveProperty('alternatives');
          }
        ),
        testConfig
      );
    });
  });

  // Feature: llm-usage-limit-system, Property 9: Alternative Model Accuracy
  describe('Property 9: Alternative Model Accuracy', () => {
    /**
     * **Validates: Requirements 3.4**
     * 
     * For any rejected request, the list of alternative models SHALL include
     * all and only those models where the user has remaining quota (remaining > 0).
     */
    test('alternatives list only includes models with remaining > 0', async () => {
      await fc.assert(
        fc.asyncProperty(
          userIdArb,
          modelNameArb,
          tierArb,
          providerArb,
          limitArb,
          alternativesListArb,
          async (userId, modelName, tier, provider, limit, alternatives) => {
            const mockLimitCheck = {
              allowed: false,
              modelName,
              displayName: `${modelName} Display`,
              provider,
              tier,
              limit,
              used: limit,
              remaining: 0,
              alternatives
            };

            usageLimitService.checkLimit.mockResolvedValue(mockLimitCheck);

            const req = createMockReq(userId, modelName);
            const res = createMockRes();
            const next = createMockNext();

            await checkUsageLimit(req, res, next);

            const error = res.jsonData.error;

            // Property: All alternatives must have remaining > 0
            error.alternatives.forEach(alt => {
              expect(alt.remaining).toBeGreaterThan(0);
            });
          }
        ),
        testConfig
      );
    });

    test('alternatives list excludes the current model', async () => {
      await fc.assert(
        fc.asyncProperty(
          userIdArb,
          modelNameArb,
          tierArb,
          providerArb,
          limitArb,
          alternativesListArb,
          async (userId, modelName, tier, provider, limit, alternatives) => {
            // Filter out the current model from alternatives
            const filteredAlternatives = alternatives.filter(alt => alt.model !== modelName);

            const mockLimitCheck = {
              allowed: false,
              modelName,
              displayName: `${modelName} Display`,
              provider,
              tier,
              limit,
              used: limit,
              remaining: 0,
              alternatives: filteredAlternatives
            };

            usageLimitService.checkLimit.mockResolvedValue(mockLimitCheck);

            const req = createMockReq(userId, modelName);
            const res = createMockRes();
            const next = createMockNext();

            await checkUsageLimit(req, res, next);

            const error = res.jsonData.error;

            // Property: Current model must not be in alternatives
            const alternativeModels = error.alternatives.map(alt => alt.model);
            expect(alternativeModels).not.toContain(modelName);
          }
        ),
        testConfig
      );
    });

    test('alternatives list structure is valid', async () => {
      await fc.assert(
        fc.asyncProperty(
          userIdArb,
          modelNameArb,
          tierArb,
          providerArb,
          limitArb,
          alternativesListArb,
          async (userId, modelName, tier, provider, limit, alternatives) => {
            const mockLimitCheck = {
              allowed: false,
              modelName,
              displayName: `${modelName} Display`,
              provider,
              tier,
              limit,
              used: limit,
              remaining: 0,
              alternatives
            };

            usageLimitService.checkLimit.mockResolvedValue(mockLimitCheck);

            const req = createMockReq(userId, modelName);
            const res = createMockRes();
            const next = createMockNext();

            await checkUsageLimit(req, res, next);

            const error = res.jsonData.error;

            // Property: Each alternative has required fields
            error.alternatives.forEach(alt => {
              expect(alt).toHaveProperty('model');
              expect(alt).toHaveProperty('displayName');
              expect(alt).toHaveProperty('provider');
              expect(alt).toHaveProperty('tier');
              expect(alt).toHaveProperty('remaining');
              
              // Property: Remaining must be a positive number
              expect(typeof alt.remaining).toBe('number');
              expect(alt.remaining).toBeGreaterThan(0);
            });
          }
        ),
        testConfig
      );
    });

    test('empty alternatives list is valid when all models exhausted', async () => {
      await fc.assert(
        fc.asyncProperty(
          userIdArb,
          modelNameArb,
          tierArb,
          providerArb,
          limitArb,
          async (userId, modelName, tier, provider, limit) => {
            const mockLimitCheck = {
              allowed: false,
              modelName,
              displayName: `${modelName} Display`,
              provider,
              tier,
              limit,
              used: limit,
              remaining: 0,
              alternatives: [] // No alternatives available
            };

            usageLimitService.checkLimit.mockResolvedValue(mockLimitCheck);

            const req = createMockReq(userId, modelName);
            const res = createMockRes();
            const next = createMockNext();

            await checkUsageLimit(req, res, next);

            const error = res.jsonData.error;

            // Property: Empty alternatives list is valid
            expect(Array.isArray(error.alternatives)).toBe(true);
            expect(error.alternatives).toHaveLength(0);
          }
        ),
        testConfig
      );
    });

    test('alternatives contain valid provider values', async () => {
      await fc.assert(
        fc.asyncProperty(
          userIdArb,
          modelNameArb,
          tierArb,
          providerArb,
          limitArb,
          alternativesListArb,
          async (userId, modelName, tier, provider, limit, alternatives) => {
            const mockLimitCheck = {
              allowed: false,
              modelName,
              displayName: `${modelName} Display`,
              provider,
              tier,
              limit,
              used: limit,
              remaining: 0,
              alternatives
            };

            usageLimitService.checkLimit.mockResolvedValue(mockLimitCheck);

            const req = createMockReq(userId, modelName);
            const res = createMockRes();
            const next = createMockNext();

            await checkUsageLimit(req, res, next);

            const error = res.jsonData.error;

            // Property: All alternatives have valid provider values
            const validProviders = ['groq', 'gemini'];
            error.alternatives.forEach(alt => {
              expect(validProviders).toContain(alt.provider);
            });
          }
        ),
        testConfig
      );
    });

    test('alternatives contain valid tier values', async () => {
      await fc.assert(
        fc.asyncProperty(
          userIdArb,
          modelNameArb,
          tierArb,
          providerArb,
          limitArb,
          alternativesListArb,
          async (userId, modelName, tier, provider, limit, alternatives) => {
            const mockLimitCheck = {
              allowed: false,
              modelName,
              displayName: `${modelName} Display`,
              provider,
              tier,
              limit,
              used: limit,
              remaining: 0,
              alternatives
            };

            usageLimitService.checkLimit.mockResolvedValue(mockLimitCheck);

            const req = createMockReq(userId, modelName);
            const res = createMockRes();
            const next = createMockNext();

            await checkUsageLimit(req, res, next);

            const error = res.jsonData.error;

            // Property: All alternatives have valid tier values
            const validTiers = ['economy', 'standard', 'premium'];
            error.alternatives.forEach(alt => {
              expect(validTiers).toContain(alt.tier);
            });
          }
        ),
        testConfig
      );
    });
  });

  describe('Cross-Property Validation', () => {
    test('all rejected requests satisfy all three properties simultaneously', async () => {
      await fc.assert(
        fc.asyncProperty(
          userIdArb,
          modelNameArb,
          fc.string({ minLength: 5, maxLength: 30 }),
          tierArb,
          providerArb,
          limitArb,
          alternativesListArb,
          async (userId, modelName, displayName, tier, provider, limit, alternatives) => {
            // Filter out the current model from alternatives (as the service would do)
            const filteredAlternatives = alternatives.filter(alt => alt.model !== modelName);

            const mockLimitCheck = {
              allowed: false,
              modelName,
              displayName,
              provider,
              tier,
              limit,
              used: limit,
              remaining: 0,
              alternatives: filteredAlternatives
            };

            usageLimitService.checkLimit.mockResolvedValue(mockLimitCheck);

            const req = createMockReq(userId, modelName);
            const res = createMockRes();
            const next = createMockNext();

            await checkUsageLimit(req, res, next);

            // Property 7: Status code is 429
            expect(res.statusCode).toBe(429);

            const error = res.jsonData.error;

            // Property 8: Error message completeness
            expect(error.model).toBe(modelName);
            expect(error.displayName).toBe(displayName);
            expect(error.tier).toBe(tier);
            expect(error.limit).toBe(limit);

            // Property 9: Alternative model accuracy
            error.alternatives.forEach(alt => {
              expect(alt.remaining).toBeGreaterThan(0);
              expect(alt.model).not.toBe(modelName);
            });
          }
        ),
        testConfig
      );
    });
  });
});

