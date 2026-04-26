/**
 * Property-Based Tests for Usage Limit Service - Automatic Limit Inheritance
 * 
 * Property 12: Automatic Limit Inheritance
 * Validates: Requirements 6.3
 * 
 * Feature: llm-usage-limit-system, Property 12: Automatic Limit Inheritance
 */

const fc = require('fast-check');

describe('UsageLimitService Property Tests - Automatic Limit Inheritance', () => {
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
   * Tier registry with their limits
   */
  const tierRegistry = [
    { id: 'tier-economy', name: 'economy', limit: 50 },
    { id: 'tier-standard', name: 'standard', limit: 10 },
    { id: 'tier-premium', name: 'premium', limit: 1 },
  ];

  /**
   * Provider registry
   */
  const providerRegistry = ['groq', 'gemini', 'openai', 'anthropic'];

  // Arbitraries for property-based testing
  const tierArb = fc.constantFrom(...tierRegistry);
  const providerArb = fc.constantFrom(...providerRegistry);
  const modelNameArb = fc.string({ minLength: 5, maxLength: 50 }).filter(s => !s.includes(' '));
  const displayNameArb = fc.string({ minLength: 5, maxLength: 100 });
  const userIdArb = fc.uuid();

  /**
   * Property 12: Automatic Limit Inheritance
   * 
   * **Validates: Requirements 6.3**
   * 
   * For any newly added model with an assigned tier, the model SHALL automatically
   * inherit the request_limit value from that tier without requiring code changes.
   * 
   * This property verifies that:
   * 1. A new model can be added to the database with just tier assignment
   * 2. The model automatically gets the correct limit from its tier
   * 3. No code changes are needed to support the new model
   * 4. The limit is retrieved correctly through the JOIN query
   */
  test('Property 12: Automatic Limit Inheritance - new model inherits tier limit', async () => {
    // Feature: llm-usage-limit-system, Property 12: Automatic Limit Inheritance
    await fc.assert(
      fc.asyncProperty(
        tierArb,
        providerArb,
        modelNameArb,
        displayNameArb,
        userIdArb,
        async (tier, provider, modelName, displayName, userId) => {
          // Simulate adding a new model to the database
          // In real scenario, this would be: INSERT INTO models (name, display_name, provider, tier_id)
          const newModelId = fc.sample(fc.uuid(), 1)[0];
          
          // Mock the database response for checkLimit
          // This simulates the JOIN query that retrieves model + tier info
          mockSupabaseClient.single.mockResolvedValueOnce({
            data: {
              id: newModelId,
              name: modelName,
              display_name: displayName,
              provider: provider,
              model_tiers: {
                name: tier.name,
                request_limit: tier.limit, // Limit comes from tier, not model
              },
              usage_counters: [], // New model, no usage yet
            },
            error: null,
          });

          // Act: Check limit for the newly added model
          const result = await usageLimitService.checkLimit(userId, modelName);

          // Assert: Model automatically inherits limit from tier
          expect(result.limit).toBe(tier.limit);
          expect(result.tier).toBe(tier.name);
          expect(result.modelName).toBe(modelName);
          expect(result.displayName).toBe(displayName);
          expect(result.provider).toBe(provider);
          
          // Assert: New model has no usage yet
          expect(result.used).toBe(0);
          expect(result.remaining).toBe(tier.limit);
          expect(result.allowed).toBe(true);

          // Verify the limit matches the tier's limit exactly
          const expectedLimitByTier = {
            'economy': 50,
            'standard': 10,
            'premium': 1,
          };
          expect(result.limit).toBe(expectedLimitByTier[tier.name]);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 12 Extension: Multiple new models with same tier inherit same limit
   * 
   * Verifies that multiple models assigned to the same tier all inherit
   * the same limit value, demonstrating the tier-based limit system.
   */
  test('Property 12: Automatic Limit Inheritance - multiple models with same tier have same limit', async () => {
    // Feature: llm-usage-limit-system, Property 12: Automatic Limit Inheritance
    await fc.assert(
      fc.asyncProperty(
        tierArb,
        fc.array(
          fc.record({
            name: modelNameArb,
            displayName: displayNameArb,
            provider: providerArb,
          }),
          { minLength: 2, maxLength: 5 }
        ),
        userIdArb,
        async (tier, models, userId) => {
          // Ensure unique model names
          const uniqueModels = models.filter((model, index, self) =>
            index === self.findIndex(m => m.name === model.name)
          );

          if (uniqueModels.length < 2) {
            return true; // Skip if not enough unique models
          }

          // Mock getUserUsage to return all models with the same tier
          mockSupabaseClient.order.mockResolvedValueOnce({
            data: uniqueModels.map((model, index) => ({
              id: `model-${index}`,
              name: model.name,
              display_name: model.displayName,
              provider: model.provider,
              model_tiers: {
                name: tier.name,
                request_limit: tier.limit,
              },
              usage_counters: [],
            })),
            error: null,
          });

          // Act: Get usage for all models
          const result = await usageLimitService.getUserUsage(userId);

          // Assert: All models have the same limit (inherited from tier)
          const limits = result.map(m => m.limit);
          const uniqueLimits = [...new Set(limits)];
          
          expect(uniqueLimits.length).toBe(1);
          expect(uniqueLimits[0]).toBe(tier.limit);

          // Assert: All models have the same tier
          const tiers = result.map(m => m.tier);
          const uniqueTiers = [...new Set(tiers)];
          
          expect(uniqueTiers.length).toBe(1);
          expect(uniqueTiers[0]).toBe(tier.name);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 12 Extension: Tier change propagates to all models
   * 
   * Verifies that if a tier's limit is updated, all models assigned to that
   * tier automatically reflect the new limit without code changes.
   */
  test('Property 12: Automatic Limit Inheritance - tier limit change propagates to models', async () => {
    // Feature: llm-usage-limit-system, Property 12: Automatic Limit Inheritance
    await fc.assert(
      fc.asyncProperty(
        tierArb,
        fc.nat({ min: 10, max: 100 }), // Ensure newLimit > 5 to avoid limit reached
        modelNameArb,
        displayNameArb,
        providerArb,
        userIdArb,
        async (tier, newLimit, modelName, displayName, provider, userId) => {
          // Skip if limit would be reached
          if (newLimit <= 5) {
            return true;
          }

          const modelId = fc.sample(fc.uuid(), 1)[0];

          // Simulate tier limit update (in real scenario: UPDATE model_tiers SET request_limit = newLimit)
          const updatedTier = { ...tier, limit: newLimit };

          // Mock checkLimit with updated tier limit
          mockSupabaseClient.single.mockResolvedValueOnce({
            data: {
              id: modelId,
              name: modelName,
              display_name: displayName,
              provider: provider,
              model_tiers: {
                name: updatedTier.name,
                request_limit: updatedTier.limit, // Updated limit
              },
              usage_counters: [{ request_count: 5 }],
            },
            error: null,
          });

          // Act: Check limit after tier update
          const result = await usageLimitService.checkLimit(userId, modelName);

          // Assert: Model automatically reflects new tier limit
          expect(result.limit).toBe(newLimit);
          expect(result.tier).toBe(tier.name);
          
          // Assert: Remaining is calculated with new limit
          expect(result.remaining).toBe(newLimit - 5);
          expect(result.allowed).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 12 Extension: New tier can be added and models assigned to it
   * 
   * Verifies that a new tier can be added to the system and models can be
   * assigned to it, inheriting the new tier's limit.
   */
  test('Property 12: Automatic Limit Inheritance - new tier with models works correctly', async () => {
    // Feature: llm-usage-limit-system, Property 12: Automatic Limit Inheritance
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 6, maxLength: 20 })
          .filter(s => !['economy', 'standard', 'premium'].includes(s))
          .filter(s => s.trim().length >= 6 && /^[a-zA-Z]/.test(s)), // Ensure valid tier name
        fc.integer({ min: 1, max: 100 }),
        modelNameArb.filter(s => s.trim().length >= 5 && /^[a-zA-Z0-9]/.test(s)), // Valid model name
        displayNameArb.filter(s => s.trim().length >= 5), // Ensure non-empty display name
        providerArb,
        userIdArb,
        async (newTierName, newTierLimit, modelName, displayName, provider, userId) => {
          const modelId = fc.sample(fc.uuid(), 1)[0];

          // Simulate adding a new tier and assigning a model to it
          mockSupabaseClient.single.mockResolvedValueOnce({
            data: {
              id: modelId,
              name: modelName,
              display_name: displayName,
              provider: provider,
              model_tiers: {
                name: newTierName,
                request_limit: newTierLimit,
              },
              usage_counters: [],
            },
            error: null,
          });

          // Act: Check limit for model with new tier
          const result = await usageLimitService.checkLimit(userId, modelName);

          // Assert: Model inherits limit from new tier
          expect(result.limit).toBe(newTierLimit);
          expect(result.tier).toBe(newTierName);
          expect(result.used).toBe(0);
          expect(result.remaining).toBe(newTierLimit);
          expect(result.allowed).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 12 Extension: Limit inheritance works across all service methods
   * 
   * Verifies that limit inheritance from tiers works consistently across
   * all service methods (checkLimit, getUserUsage, getAlternativeModels).
   */
  test('Property 12: Automatic Limit Inheritance - consistent across all service methods', async () => {
    // Feature: llm-usage-limit-system, Property 12: Automatic Limit Inheritance
    await fc.assert(
      fc.asyncProperty(
        tierArb,
        modelNameArb,
        displayNameArb,
        providerArb,
        userIdArb,
        fc.nat({ max: 40 }), // Keep usage below typical limits to avoid edge cases
        async (tier, modelName, displayName, provider, userId, usedCount) => {
          const modelId = fc.sample(fc.uuid(), 1)[0];
          const actualUsed = Math.min(usedCount, tier.limit - 1); // Ensure remaining > 0

          // Mock checkLimit
          mockSupabaseClient.single.mockResolvedValueOnce({
            data: {
              id: modelId,
              name: modelName,
              display_name: displayName,
              provider: provider,
              model_tiers: {
                name: tier.name,
                request_limit: tier.limit,
              },
              usage_counters: [{ request_count: actualUsed }],
            },
            error: null,
          });

          // Act: Check limit
          const checkResult = await usageLimitService.checkLimit(userId, modelName);

          // Mock getUserUsage
          mockSupabaseClient.order.mockResolvedValueOnce({
            data: [{
              id: modelId,
              name: modelName,
              display_name: displayName,
              provider: provider,
              model_tiers: {
                name: tier.name,
                request_limit: tier.limit,
              },
              usage_counters: [{ request_count: actualUsed }],
            }],
            error: null,
          });

          // Act: Get user usage
          const usageResult = await usageLimitService.getUserUsage(userId);

          // Assert: Both methods return consistent limit (inherited from tier)
          expect(checkResult.limit).toBe(tier.limit);
          expect(usageResult[0].limit).toBe(tier.limit);
          expect(checkResult.limit).toBe(usageResult[0].limit);

          // Assert: Both methods calculate remaining consistently
          expect(checkResult.remaining).toBe(usageResult[0].remaining);
          expect(checkResult.used).toBe(usageResult[0].used);
        }
      ),
      { numRuns: 100 }
    );
  });
});
