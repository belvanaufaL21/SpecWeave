/**
 * Property-Based Tests for Usage Limit Service
 * 
 * Tests Properties 1, 2, 3, 4, 5, 6, and 10 for the LLM Usage Limit System
 * 
 * Feature: llm-usage-limit-system
 */

const fc = require('fast-check');

describe('UsageLimitService Property Tests', () => {
  let usageLimitService;
  let mockSupabaseClient;

  beforeEach(() => {
    // Reset modules to get fresh instance
    jest.resetModules();
    jest.clearAllMocks();

    // Create mock Supabase client with chainable query builder
    mockSupabaseClient = {
      from: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn(),
      insert: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
    };

    // Mock Supabase service
    const mockSupabaseService = {
      getClient: jest.fn(() => mockSupabaseClient),
    };

    // Mock the supabaseService module
    jest.mock('../supabaseService.js', () => ({
      __esModule: true,
      default: mockSupabaseService,
    }));

    // Import service after mocks are set up
    usageLimitService = require('../usageLimitService.js').default;
  });

  /**
   * Test data registry
   */
  const modelRegistry = [
    { id: 'model-1', name: 'llama-3.1-8b-instant', provider: 'groq', tier: 'economy', limit: 50 },
    { id: 'model-2', name: 'gemini-2.5-flash', provider: 'gemini', tier: 'standard', limit: 10 },
    { id: 'model-3', name: 'gemini-2.5-pro', provider: 'gemini', tier: 'premium', limit: 1 },
  ];

  const tierRegistry = [
    { name: 'economy', limit: 50 },
    { name: 'standard', limit: 10 },
    { name: 'premium', limit: 1 },
  ];

  // Arbitraries for property-based testing
  const userIdArb = fc.uuid();
  const modelArb = fc.constantFrom(...modelRegistry);
  const tierArb = fc.constantFrom(...tierRegistry);
  const usageCountArb = fc.nat({ max: 100 });
  const requestIdArb = fc.uuid();

  /**
   * Property 1: Counter Isolation
   * 
   * **Validates: Requirements 1.1, 1.3**
   * 
   * For any two different user-model combinations (user1, model1) and (user2, model2),
   * incrementing the counter for one combination SHALL NOT affect the counter for the
   * other combination.
   */
  test('Property 1: Counter Isolation - incrementing one user-model does not affect another', async () => {
    // Feature: llm-usage-limit-system, Property 1: Counter Isolation
    await fc.assert(
      fc.asyncProperty(
        userIdArb,
        userIdArb,
        modelArb,
        modelArb,
        async (user1, user2, model1, model2) => {
          // Skip if same user-model combination
          if (user1 === user2 && model1.id === model2.id) {
            return true;
          }

          // Mock initial state: both counters at different values
          const mockCounterData1 = { request_count: 5 };
          const mockCounterData2 = { request_count: 3 };

          // Mock for user1-model1 increment
          mockSupabaseClient.single
            .mockResolvedValueOnce({
              data: {
                id: model1.id,
                model_tiers: { request_limit: model1.limit },
              },
              error: null,
            })
            .mockResolvedValueOnce({
              data: mockCounterData1,
              error: null,
            })
            .mockResolvedValueOnce({
              data: { request_count: 6 },
              error: null,
            });

          // Act: Increment user1-model1
          await usageLimitService.incrementUsage(user1, model1.name, 'req-1');

          // Mock for user2-model2 check (should be unchanged)
          mockSupabaseClient.single.mockResolvedValueOnce({
            data: {
              id: model2.id,
              name: model2.name,
              display_name: model2.name,
              provider: model2.provider,
              model_tiers: {
                name: model2.tier,
                request_limit: model2.limit,
              },
              usage_counters: [mockCounterData2],
            },
            error: null,
          });

          // Mock getAlternativeModels in case limit is exceeded
          const getAlternativeModelsSpy = jest.spyOn(usageLimitService, 'getAlternativeModels')
            .mockResolvedValueOnce([]);

          // Assert: user2-model2 counter unchanged
          const result = await usageLimitService.checkLimit(user2, model2.name);
          
          // The counter for user2-model2 should still be 3 (unchanged)
          expect(result.used).toBe(3);

          // Cleanup
          getAlternativeModelsSpy.mockRestore();
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 2: Conditional Counter Increment
   * 
   * **Validates: Requirements 1.2, 4.3**
   * 
   * For any request to a model, the usage counter SHALL increment by exactly 1
   * if and only if the request is successfully processed by the LLM.
   */
  test('Property 2: Conditional Counter Increment - counter increments by exactly 1 on success', async () => {
    // Feature: llm-usage-limit-system, Property 2: Conditional Counter Increment
    await fc.assert(
      fc.asyncProperty(
        userIdArb,
        modelArb,
        usageCountArb,
        requestIdArb,
        async (userId, model, initialCount, requestId) => {
          // Ensure we don't exceed limit
          if (initialCount >= model.limit) {
            return true;
          }

          // Mock database responses
          mockSupabaseClient.single
            .mockResolvedValueOnce({
              data: {
                id: model.id,
                model_tiers: { request_limit: model.limit },
              },
              error: null,
            })
            .mockResolvedValueOnce({
              data: { request_count: initialCount },
              error: null,
            })
            .mockResolvedValueOnce({
              data: { request_count: initialCount + 1 },
              error: null,
            });

          // Act: Increment usage (simulating successful LLM request)
          const result = await usageLimitService.incrementUsage(userId, model.name, requestId);

          // Assert: Counter incremented by exactly 1
          expect(result.newCount).toBe(initialCount + 1);
          expect(result.remaining).toBe(model.limit - (initialCount + 1));
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 3: Model Independence
   * 
   * **Validates: Requirements 1.4**
   * 
   * For any user with multiple models, reaching the request limit on one model
   * SHALL NOT prevent the user from making requests to other models that have
   * remaining quota.
   */
  test('Property 3: Model Independence - exhausting one model does not affect others', async () => {
    // Feature: llm-usage-limit-system, Property 3: Model Independence
    await fc.assert(
      fc.asyncProperty(
        userIdArb,
        async (userId) => {
          // Setup: Model 1 is at limit, Model 2 has remaining quota
          const model1 = modelRegistry[0]; // economy, limit 50
          const model2 = modelRegistry[1]; // standard, limit 10

          // Mock model1 at limit
          mockSupabaseClient.single.mockResolvedValueOnce({
            data: {
              id: model1.id,
              name: model1.name,
              display_name: model1.name,
              provider: model1.provider,
              model_tiers: {
                name: model1.tier,
                request_limit: model1.limit,
              },
              usage_counters: [{ request_count: model1.limit }],
            },
            error: null,
          });

          // Mock getAlternativeModels for model1
          jest.spyOn(usageLimitService, 'getAlternativeModels').mockResolvedValueOnce([]);

          // Check model1 - should be blocked
          const result1 = await usageLimitService.checkLimit(userId, model1.name);
          expect(result1.allowed).toBe(false);
          expect(result1.remaining).toBe(0);

          // Mock model2 with remaining quota
          mockSupabaseClient.single.mockResolvedValueOnce({
            data: {
              id: model2.id,
              name: model2.name,
              display_name: model2.name,
              provider: model2.provider,
              model_tiers: {
                name: model2.tier,
                request_limit: model2.limit,
              },
              usage_counters: [{ request_count: 5 }],
            },
            error: null,
          });

          // Check model2 - should be allowed
          const result2 = await usageLimitService.checkLimit(userId, model2.name);
          expect(result2.allowed).toBe(true);
          expect(result2.remaining).toBeGreaterThan(0);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 4: Tier Assignment Validity
   * 
   * **Validates: Requirements 2.1**
   * 
   * For any model in the system, it SHALL be assigned to exactly one model tier
   * from the set {economy, standard, premium}.
   */
  test('Property 4: Tier Assignment Validity - each model has exactly one valid tier', async () => {
    // Feature: llm-usage-limit-system, Property 4: Tier Assignment Validity
    await fc.assert(
      fc.asyncProperty(
        modelArb,
        async (model) => {
          // Mock database response
          mockSupabaseClient.single.mockResolvedValueOnce({
            data: {
              id: model.id,
              name: model.name,
              display_name: model.name,
              provider: model.provider,
              model_tiers: {
                name: model.tier,
                request_limit: model.limit,
              },
              usage_counters: [],
            },
            error: null,
          });

          // Act: Check limit to retrieve model info
          const result = await usageLimitService.checkLimit('user-1', model.name);

          // Assert: Model has exactly one tier from valid set
          const validTiers = ['economy', 'standard', 'premium'];
          expect(validTiers).toContain(result.tier);
          expect(typeof result.tier).toBe('string');
          expect(result.tier.length).toBeGreaterThan(0);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 5: Tier Limit Ordering
   * 
   * **Validates: Requirements 2.2**
   * 
   * For any configuration of model tiers, the request limits SHALL satisfy:
   * economy_limit >= standard_limit >= premium_limit.
   */
  test('Property 5: Tier Limit Ordering - economy >= standard >= premium', async () => {
    // Feature: llm-usage-limit-system, Property 5: Tier Limit Ordering
    await fc.assert(
      fc.asyncProperty(
        fc.constant(true),
        async () => {
          // Mock getUserUsage to return all models
          mockSupabaseClient.order.mockResolvedValueOnce({
            data: modelRegistry.map(m => ({
              id: m.id,
              name: m.name,
              display_name: m.name,
              provider: m.provider,
              model_tiers: {
                name: m.tier,
                request_limit: m.limit,
              },
              usage_counters: [],
            })),
            error: null,
          });

          // Act: Get all models
          const allModels = await usageLimitService.getUserUsage('user-1');

          // Extract limits by tier
          const economyModels = allModels.filter(m => m.tier === 'economy');
          const standardModels = allModels.filter(m => m.tier === 'standard');
          const premiumModels = allModels.filter(m => m.tier === 'premium');

          // Assert: Tier ordering is correct
          if (economyModels.length > 0 && standardModels.length > 0) {
            const economyLimit = economyModels[0].limit;
            const standardLimit = standardModels[0].limit;
            expect(economyLimit).toBeGreaterThanOrEqual(standardLimit);
          }

          if (standardModels.length > 0 && premiumModels.length > 0) {
            const standardLimit = standardModels[0].limit;
            const premiumLimit = premiumModels[0].limit;
            expect(standardLimit).toBeGreaterThanOrEqual(premiumLimit);
          }

          if (economyModels.length > 0 && premiumModels.length > 0) {
            const economyLimit = economyModels[0].limit;
            const premiumLimit = premiumModels[0].limit;
            expect(economyLimit).toBeGreaterThanOrEqual(premiumLimit);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 6: Request Rejection at Limit
   * 
   * **Validates: Requirements 3.1, 4.1, 4.2**
   * 
   * For any user-model combination where usage_counter equals request_limit,
   * subsequent requests SHALL be rejected without calling the LLM.
   */
  test('Property 6: Request Rejection at Limit - requests rejected when counter equals limit', async () => {
    // Feature: llm-usage-limit-system, Property 6: Request Rejection at Limit
    await fc.assert(
      fc.asyncProperty(
        userIdArb,
        modelArb,
        async (userId, model) => {
          // Setup: Counter is at limit
          mockSupabaseClient.single.mockResolvedValueOnce({
            data: {
              id: model.id,
              name: model.name,
              display_name: model.name,
              provider: model.provider,
              model_tiers: {
                name: model.tier,
                request_limit: model.limit,
              },
              usage_counters: [{ request_count: model.limit }],
            },
            error: null,
          });

          // Mock getAlternativeModels
          jest.spyOn(usageLimitService, 'getAlternativeModels').mockResolvedValueOnce([
            {
              model: 'alternative-model',
              displayName: 'Alternative Model',
              provider: 'groq',
              tier: 'economy',
              remaining: 10,
            },
          ]);

          // Act: Check limit when counter equals limit
          const result = await usageLimitService.checkLimit(userId, model.name);

          // Assert: Request is rejected
          expect(result.allowed).toBe(false);
          expect(result.remaining).toBe(0);
          expect(result.used).toBe(model.limit);
          expect(result.limit).toBe(model.limit);
          
          // Assert: Alternatives are provided
          expect(result.alternatives).toBeDefined();
          expect(Array.isArray(result.alternatives)).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 10: Usage Information Accuracy
   * 
   * **Validates: Requirements 5.1, 5.2**
   * 
   * For any user, the usage information endpoint SHALL return accurate values
   * where: remaining = limit - used, for all models.
   */
  test('Property 10: Usage Information Accuracy - remaining = limit - used', async () => {
    // Feature: llm-usage-limit-system, Property 10: Usage Information Accuracy
    await fc.assert(
      fc.asyncProperty(
        userIdArb,
        fc.array(
          fc.record({
            model: modelArb,
            used: usageCountArb,
          }),
          { minLength: 1, maxLength: 3 }
        ),
        async (userId, usageStates) => {
          // Mock database response with usage states
          mockSupabaseClient.order.mockResolvedValueOnce({
            data: usageStates.map(state => {
              const usedCount = Math.min(state.used, state.model.limit);
              return {
                id: state.model.id,
                name: state.model.name,
                display_name: state.model.name,
                provider: state.model.provider,
                model_tiers: {
                  name: state.model.tier,
                  request_limit: state.model.limit,
                },
                usage_counters: [{ request_count: usedCount }],
              };
            }),
            error: null,
          });

          // Act: Get user usage
          const result = await usageLimitService.getUserUsage(userId);

          // Assert: For each model, remaining = limit - used
          result.forEach((modelUsage, index) => {
            const expectedUsed = Math.min(usageStates[index].used, usageStates[index].model.limit);
            const expectedRemaining = Math.max(0, modelUsage.limit - expectedUsed);
            
            expect(modelUsage.remaining).toBe(expectedRemaining);
            expect(modelUsage.used).toBe(expectedUsed);
            expect(modelUsage.remaining + modelUsage.used).toBe(modelUsage.limit);
          });
        }
      ),
      { numRuns: 100 }
    );
  });
});
