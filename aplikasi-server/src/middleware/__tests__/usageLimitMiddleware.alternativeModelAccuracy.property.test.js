/**
 * Property-Based Tests for Usage Limit Middleware - Alternative Model Accuracy
 * 
 * Property 9: Alternative Model Accuracy
 * Validates: Requirements 3.4
 * 
 * Feature: llm-usage-limit-system, Property 9: Alternative Model Accuracy
 */

const fc = require('fast-check');

// Mock usageLimitService before importing middleware
jest.mock('../../services/usageLimitService.js');

const usageLimitService = require('../../services/usageLimitService.js').default;
const { checkUsageLimit } = require('../usageLimitMiddleware.js');

// Helper functions to create mock objects
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

describe('UsageLimitMiddleware Property Tests - Alternative Model Accuracy', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  /**
   * Test data registry
   */
  const modelRegistry = [
    { 
      name: 'llama-3.1-8b-instant', 
      displayName: 'Llama 3.1 8B',
      provider: 'groq', 
      tier: 'economy', 
      limit: 50 
    },
    { 
      name: 'gemini-2.5-flash', 
      displayName: 'Gemini 2.5 Flash',
      provider: 'gemini', 
      tier: 'standard', 
      limit: 10 
    },
    { 
      name: 'gemini-2.5-pro', 
      displayName: 'Gemini 2.5 Pro',
      provider: 'gemini', 
      tier: 'premium', 
      limit: 1 
    },
  ];

  // Arbitraries for property-based testing
  const userIdArb = fc.uuid();
  const modelArb = fc.constantFrom(...modelRegistry);
  
  /**
   * Generate arbitrary usage states for all models
   * Returns array of {model, used, remaining} where remaining can be 0 or positive
   */
  const usageStatesArb = fc.array(
    fc.record({
      model: modelArb,
      used: fc.nat({ max: 100 }),
    }),
    { minLength: 3, maxLength: 3 } // All 3 models
  ).map(states => {
    // Ensure we have all 3 models (one per tier)
    const uniqueModels = modelRegistry.map(m => {
      const state = states.find(s => s.model.name === m.name) || {
        model: m,
        used: fc.sample(fc.nat({ max: m.limit }), 1)[0],
      };
      const used = Math.min(state.used, m.limit);
      const remaining = Math.max(0, m.limit - used);
      return {
        model: m,
        used,
        remaining,
      };
    });
    return uniqueModels;
  });

  /**
   * Property 9: Alternative Model Accuracy
   * 
   * **Validates: Requirements 3.4**
   * 
   * For any rejected request, the list of alternative models SHALL include
   * all and only those models where the user has remaining quota (remaining > 0).
   */
  test('Property 9: Alternative Model Accuracy - alternatives include all and only models with remaining > 0', async () => {
    // Feature: llm-usage-limit-system, Property 9: Alternative Model Accuracy
    await fc.assert(
      fc.asyncProperty(
        userIdArb,
        modelArb,
        usageStatesArb,
        async (userId, requestedModel, usageStates) => {
          // Find the requested model's usage state
          const requestedState = usageStates.find(s => s.model.name === requestedModel.name);
          
          // Ensure the requested model is at limit (to trigger rejection)
          const atLimitState = {
            ...requestedState,
            used: requestedModel.limit,
            remaining: 0,
          };

          // Calculate expected alternatives (all models with remaining > 0, excluding requested)
          const expectedAlternatives = usageStates
            .filter(s => s.remaining > 0 && s.model.name !== requestedModel.name)
            .map(s => ({
              model: s.model.name,
              displayName: s.model.displayName,
              provider: s.model.provider,
              tier: s.model.tier,
              remaining: s.remaining,
            }));

          // Mock checkLimit to return rejection with alternatives
          usageLimitService.checkLimit.mockResolvedValueOnce({
            allowed: false,
            modelName: requestedModel.name,
            displayName: requestedModel.displayName,
            provider: requestedModel.provider,
            tier: requestedModel.tier,
            limit: requestedModel.limit,
            used: atLimitState.used,
            remaining: 0,
            alternatives: expectedAlternatives,
          });

          // Setup request
          const req = createMockReq({
            user: { id: userId },
            body: { model: requestedModel.name }
          });
          const res = createMockRes();
          const next = createMockNext();

          // Act: Call middleware
          await checkUsageLimit(req, res, next);

          // Assert: Response is 429
          expect(res.status).toHaveBeenCalledWith(429);
          expect(next).not.toHaveBeenCalled();

          // Assert: Response includes alternatives
          expect(res.json).toHaveBeenCalledWith(
            expect.objectContaining({
              success: false,
              error: expect.objectContaining({
                code: 'USAGE_LIMIT_EXCEEDED',
                alternatives: expect.any(Array),
              }),
            })
          );

          // Get the actual alternatives from the response
          const responseCall = res.json.mock.calls[0][0];
          const actualAlternatives = responseCall.error.alternatives;

          // Assert: Alternatives list accuracy
          expect(actualAlternatives).toHaveLength(expectedAlternatives.length);

          // Assert: All alternatives have remaining > 0
          actualAlternatives.forEach(alt => {
            expect(alt.remaining).toBeGreaterThan(0);
          });

          // Assert: Requested model is NOT in alternatives
          const requestedInAlternatives = actualAlternatives.some(
            alt => alt.model === requestedModel.name
          );
          expect(requestedInAlternatives).toBe(false);

          // Assert: All models with remaining > 0 (except requested) are in alternatives
          const modelsWithRemaining = usageStates.filter(
            s => s.remaining > 0 && s.model.name !== requestedModel.name
          );
          
          modelsWithRemaining.forEach(state => {
            const foundInAlternatives = actualAlternatives.some(
              alt => alt.model === state.model.name
            );
            expect(foundInAlternatives).toBe(true);
          });

          // Assert: No models with remaining = 0 are in alternatives
          const modelsWithoutRemaining = usageStates.filter(s => s.remaining === 0);
          
          modelsWithoutRemaining.forEach(state => {
            const foundInAlternatives = actualAlternatives.some(
              alt => alt.model === state.model.name
            );
            expect(foundInAlternatives).toBe(false);
          });
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 9 Extension: Alternative Model Accuracy - Empty alternatives when all models exhausted
   * 
   * **Validates: Requirements 3.4**
   * 
   * When all models are at their limits, the alternatives list SHALL be empty.
   */
  test('Property 9: Alternative Model Accuracy - empty alternatives when all models exhausted', async () => {
    // Feature: llm-usage-limit-system, Property 9: Alternative Model Accuracy
    await fc.assert(
      fc.asyncProperty(
        userIdArb,
        modelArb,
        async (userId, requestedModel) => {
          // Setup: All models are at limit
          const allExhaustedStates = modelRegistry.map(m => ({
            model: m,
            used: m.limit,
            remaining: 0,
          }));

          // Mock checkLimit to return rejection with empty alternatives
          usageLimitService.checkLimit.mockResolvedValueOnce({
            allowed: false,
            modelName: requestedModel.name,
            displayName: requestedModel.displayName,
            provider: requestedModel.provider,
            tier: requestedModel.tier,
            limit: requestedModel.limit,
            used: requestedModel.limit,
            remaining: 0,
            alternatives: [], // Empty because all models exhausted
          });

          // Setup request
          const req = createMockReq({
            user: { id: userId },
            body: { model: requestedModel.name }
          });
          const res = createMockRes();
          const next = createMockNext();

          // Act: Call middleware
          await checkUsageLimit(req, res, next);

          // Assert: Response is 429
          expect(res.status).toHaveBeenCalledWith(429);

          // Get the actual alternatives from the response
          const responseCall = res.json.mock.calls[0][0];
          const actualAlternatives = responseCall.error.alternatives;

          // Assert: Alternatives list is empty
          expect(actualAlternatives).toHaveLength(0);
          expect(Array.isArray(actualAlternatives)).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 9 Extension: Alternative Model Accuracy - Alternative structure completeness
   * 
   * **Validates: Requirements 3.4**
   * 
   * Each alternative SHALL include: model, displayName, provider, tier, and remaining.
   */
  test('Property 9: Alternative Model Accuracy - each alternative has complete structure', async () => {
    // Feature: llm-usage-limit-system, Property 9: Alternative Model Accuracy
    await fc.assert(
      fc.asyncProperty(
        userIdArb,
        modelArb,
        usageStatesArb,
        async (userId, requestedModel, usageStates) => {
          // Ensure at least one model has remaining quota
          const modifiedStates = usageStates.map((s, idx) => {
            if (idx === 0 && s.model.name !== requestedModel.name) {
              return { ...s, used: 0, remaining: s.model.limit };
            }
            return s;
          });

          // Calculate expected alternatives
          const expectedAlternatives = modifiedStates
            .filter(s => s.remaining > 0 && s.model.name !== requestedModel.name)
            .map(s => ({
              model: s.model.name,
              displayName: s.model.displayName,
              provider: s.model.provider,
              tier: s.model.tier,
              remaining: s.remaining,
            }));

          // Skip if no alternatives available
          if (expectedAlternatives.length === 0) {
            return true;
          }

          // Mock checkLimit to return rejection with alternatives
          usageLimitService.checkLimit.mockResolvedValueOnce({
            allowed: false,
            modelName: requestedModel.name,
            displayName: requestedModel.displayName,
            provider: requestedModel.provider,
            tier: requestedModel.tier,
            limit: requestedModel.limit,
            used: requestedModel.limit,
            remaining: 0,
            alternatives: expectedAlternatives,
          });

          // Setup request
          const req = createMockReq({
            user: { id: userId },
            body: { model: requestedModel.name }
          });
          const res = createMockRes();
          const next = createMockNext();

          // Act: Call middleware
          await checkUsageLimit(req, res, next);

          // Get the actual alternatives from the response
          const responseCall = res.json.mock.calls[0][0];
          const actualAlternatives = responseCall.error.alternatives;

          // Assert: Each alternative has complete structure
          actualAlternatives.forEach(alt => {
            expect(alt).toHaveProperty('model');
            expect(alt).toHaveProperty('displayName');
            expect(alt).toHaveProperty('provider');
            expect(alt).toHaveProperty('tier');
            expect(alt).toHaveProperty('remaining');

            expect(typeof alt.model).toBe('string');
            expect(typeof alt.displayName).toBe('string');
            expect(typeof alt.provider).toBe('string');
            expect(typeof alt.tier).toBe('string');
            expect(typeof alt.remaining).toBe('number');

            expect(alt.model.length).toBeGreaterThan(0);
            expect(alt.displayName.length).toBeGreaterThan(0);
            expect(['groq', 'gemini']).toContain(alt.provider);
            expect(['economy', 'standard', 'premium']).toContain(alt.tier);
            expect(alt.remaining).toBeGreaterThan(0);
          });
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 9 Extension: Alternative Model Accuracy - Alternatives sorted by remaining (descending)
   * 
   * **Validates: Requirements 3.4 (user experience enhancement)**
   * 
   * Alternatives SHOULD be sorted by remaining quota in descending order
   * to help users choose the model with most remaining requests.
   */
  test('Property 9: Alternative Model Accuracy - alternatives sorted by remaining descending', async () => {
    // Feature: llm-usage-limit-system, Property 9: Alternative Model Accuracy
    await fc.assert(
      fc.asyncProperty(
        userIdArb,
        modelArb,
        usageStatesArb,
        async (userId, requestedModel, usageStates) => {
          // Ensure multiple models have remaining quota
          const modifiedStates = usageStates.map((s, idx) => {
            if (s.model.name !== requestedModel.name) {
              const remaining = (idx + 1) * 5; // Different remaining values
              return { 
                ...s, 
                used: s.model.limit - remaining, 
                remaining: Math.min(remaining, s.model.limit),
              };
            }
            return { ...s, used: s.model.limit, remaining: 0 };
          });

          // Calculate expected alternatives (sorted by remaining descending)
          const expectedAlternatives = modifiedStates
            .filter(s => s.remaining > 0 && s.model.name !== requestedModel.name)
            .sort((a, b) => b.remaining - a.remaining)
            .map(s => ({
              model: s.model.name,
              displayName: s.model.displayName,
              provider: s.model.provider,
              tier: s.model.tier,
              remaining: s.remaining,
            }));

          // Skip if less than 2 alternatives
          if (expectedAlternatives.length < 2) {
            return true;
          }

          // Mock checkLimit to return rejection with sorted alternatives
          usageLimitService.checkLimit.mockResolvedValueOnce({
            allowed: false,
            modelName: requestedModel.name,
            displayName: requestedModel.displayName,
            provider: requestedModel.provider,
            tier: requestedModel.tier,
            limit: requestedModel.limit,
            used: requestedModel.limit,
            remaining: 0,
            alternatives: expectedAlternatives,
          });

          // Setup request
          const req = createMockReq({
            user: { id: userId },
            body: { model: requestedModel.name }
          });
          const res = createMockRes();
          const next = createMockNext();

          // Act: Call middleware
          await checkUsageLimit(req, res, next);

          // Get the actual alternatives from the response
          const responseCall = res.json.mock.calls[0][0];
          const actualAlternatives = responseCall.error.alternatives;

          // Assert: Alternatives are sorted by remaining descending
          for (let i = 0; i < actualAlternatives.length - 1; i++) {
            expect(actualAlternatives[i].remaining).toBeGreaterThanOrEqual(
              actualAlternatives[i + 1].remaining
            );
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});
