/**
 * End-to-End Integration Tests for LLM Usage Limit System
 * 
 * These tests verify the complete flow of the LLM Usage Limit System
 * with simulated database interactions. Tests cover:
 * - Full request flows across all three model tiers (economy, standard, premium)
 * - Multi-provider support (Groq and Gemini)
 * - Dynamic model addition
 * - Edge cases like premium tier with limit of 1
 * 
 * Validates Requirements: 1.1, 1.2, 1.4, 3.1, 3.2, 3.3, 3.4, 4.1, 4.2, 4.3, 6.1, 6.2, 6.3
 * Architecture requirement: multi-provider support
 */

const { v4: uuidv4 } = require('uuid');

describe('LLM Usage Limit System - End-to-End Integration Tests', () => {
  let usageLimitService;
  let mockSupabaseClient;
  let testUserId;
  let testModels = [];
  let testTiers;
  
  // In-memory state to simulate database - use objects that can be cleared
  let mockUsageCounters = {};
  let mockUsageHistory = [];

  beforeAll(() => {
    // Define test data (tiers are constant)
    testTiers = [
      { id: 'tier-1', name: 'economy', request_limit: 50, description: 'Low-cost models' },
      { id: 'tier-2', name: 'standard', request_limit: 10, description: 'Mid-tier models' },
      { id: 'tier-3', name: 'premium', request_limit: 1, description: 'High-cost models' },
    ];
  });

  beforeEach(() => {
    // Clear mocks
    jest.clearAllMocks();
    
    // Generate a new test user ID for each test to ensure isolation
    testUserId = uuidv4();
    
    // Clear in-memory state - IMPORTANT: Clear instead of reassign to maintain reference
    Object.keys(mockUsageCounters).forEach(key => delete mockUsageCounters[key]);
    mockUsageHistory.length = 0;
    
    // Reset testModels to original 3 models (remove any added models from previous tests)
    testModels.length = 0;
    testModels.push(
      { id: 'model-1', name: 'llama-3.1-8b-instant', display_name: 'Llama 3.1 8B', provider: 'groq', tier_id: 'tier-1', is_active: true },
      { id: 'model-2', name: 'gemini-2.5-flash', display_name: 'Gemini 2.5 Flash', provider: 'gemini', tier_id: 'tier-2', is_active: true },
      { id: 'model-3', name: 'gemini-2.5-pro', display_name: 'Gemini 2.5 Pro', provider: 'gemini', tier_id: 'tier-3', is_active: true }
    );

    // Create mock Supabase client with stateful behavior
    mockSupabaseClient = {
      from: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn(),
      insert: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      delete: jest.fn().mockReturnThis(),
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

    // Import service after mocks are set up (only once)
    if (!usageLimitService) {
      usageLimitService = require('../usageLimitService.js').default;
    }
    
    // Setup mock implementations
    setupMockImplementations();
  });
  
  function setupMockImplementations() {
    // Mock checkLimit behavior
    mockSupabaseClient.single.mockImplementation(() => {
      const fromCall = mockSupabaseClient.from.mock.calls[mockSupabaseClient.from.mock.calls.length - 1];
      const tableName = fromCall ? fromCall[0] : null;
      
      if (tableName === 'models') {
        // Get the most recent eq calls (last 3) to avoid cross-contamination from previous queries
        const allEqCalls = mockSupabaseClient.eq.mock.calls;
        const recentEqCalls = allEqCalls.slice(-3);
        const modelNameCall = recentEqCalls.find(call => call[0] === 'name');
        const modelName = modelNameCall ? modelNameCall[1] : null;
        
        const model = testModels.find(m => m.name === modelName);
        if (!model) {
          return Promise.resolve({ data: null, error: { code: 'PGRST116', message: 'No rows found' } });
        }
        
        const tier = testTiers.find(t => t.id === model.tier_id);
        const counterKey = `${testUserId}-${model.id}`;
        const counter = mockUsageCounters[counterKey];
        
        return Promise.resolve({
          data: {
            id: model.id,
            name: model.name,
            display_name: model.display_name,
            provider: model.provider,
            model_tiers: {
              name: tier.name,
              request_limit: tier.request_limit,
            },
            usage_counters: counter ? [{ request_count: counter.request_count }] : [],
          },
          error: null,
        });
      }
      
      return Promise.resolve({ data: null, error: { code: 'UNKNOWN', message: 'Unknown table' } });
    });
    
    // Mock order (for getUserUsage)
    mockSupabaseClient.order.mockImplementation(() => {
      const modelsWithUsage = testModels.map(model => {
        const tier = testTiers.find(t => t.id === model.tier_id);
        const counterKey = `${testUserId}-${model.id}`;
        const counter = mockUsageCounters[counterKey];
        
        return {
          id: model.id,
          name: model.name,
          display_name: model.display_name,
          provider: model.provider,
          model_tiers: {
            name: tier.name,
            request_limit: tier.request_limit,
          },
          usage_counters: counter ? [{ request_count: counter.request_count }] : [],
        };
      });
      
      return Promise.resolve({ data: modelsWithUsage, error: null });
    });
  }
  
  // Helper function to simulate incrementUsage
  async function simulateIncrementUsage(userId, modelName, requestId) {
    const model = testModels.find(m => m.name === modelName);
    if (!model) {
      throw new Error('Model not found');
    }
    
    const tier = testTiers.find(t => t.id === model.tier_id);
    const counterKey = `${userId}-${model.id}`;
    
    if (!mockUsageCounters[counterKey]) {
      mockUsageCounters[counterKey] = { request_count: 0 };
    }
    
    mockUsageCounters[counterKey].request_count += 1;
    mockUsageHistory.push({
      user_id: userId,
      model_id: model.id,
      request_id: requestId,
      success: true,
    });
    
    return {
      newCount: mockUsageCounters[counterKey].request_count,
      remaining: Math.max(0, tier.request_limit - mockUsageCounters[counterKey].request_count),
    };
  }

  describe('11.1 Test full request flow across all model tiers', () => {
    test('should handle complete flow: economy model until limit reached', async () => {
      // Find economy model
      const economyModel = testModels.find(m => 
        testTiers.find(t => t.id === m.tier_id && t.name === 'economy')
      );
      expect(economyModel).toBeDefined();
      
      const economyTier = testTiers.find(t => t.name === 'economy');
      const limit = economyTier.request_limit;
      
      // Make requests until limit reached
      for (let i = 0; i < limit; i++) {
        const checkResult = await usageLimitService.checkLimit(testUserId, economyModel.name);
        expect(checkResult.allowed).toBe(true);
        expect(checkResult.remaining).toBe(limit - i);
        
        // Increment counter (simulated)
        const incrementResult = await simulateIncrementUsage(
          testUserId,
          economyModel.name,
          `req-${i}`
        );
        expect(incrementResult.newCount).toBe(i + 1);
        expect(incrementResult.remaining).toBe(limit - (i + 1));
      }
      
      // Next request should be rejected
      const finalCheck = await usageLimitService.checkLimit(testUserId, economyModel.name);
      expect(finalCheck.allowed).toBe(false);
      expect(finalCheck.remaining).toBe(0);
      expect(finalCheck.used).toBe(limit);
      expect(finalCheck.alternatives).toBeDefined();
      expect(Array.isArray(finalCheck.alternatives)).toBe(true);
    });

    test('should handle complete flow: standard model until limit reached', async () => {
      // Find standard model
      const standardModel = testModels.find(m => 
        testTiers.find(t => t.id === m.tier_id && t.name === 'standard')
      );
      expect(standardModel).toBeDefined();
      
      const standardTier = testTiers.find(t => t.name === 'standard');
      const limit = standardTier.request_limit;
      
      // Make requests until limit reached
      for (let i = 0; i < limit; i++) {
        const checkResult = await usageLimitService.checkLimit(testUserId, standardModel.name);
        expect(checkResult.allowed).toBe(true);
        
        await simulateIncrementUsage(
          testUserId,
          standardModel.name,
          `req-${i}`
        );
      }
      
      // Next request should be rejected
      const finalCheck = await usageLimitService.checkLimit(testUserId, standardModel.name);
      expect(finalCheck.allowed).toBe(false);
      expect(finalCheck.remaining).toBe(0);
      expect(finalCheck.alternatives).toBeDefined();
    });

    test('should handle complete flow: premium model until limit reached', async () => {
      // Find premium model
      const premiumModel = testModels.find(m => 
        testTiers.find(t => t.id === m.tier_id && t.name === 'premium')
      );
      expect(premiumModel).toBeDefined();
      
      const premiumTier = testTiers.find(t => t.name === 'premium');
      const limit = premiumTier.request_limit;
      expect(limit).toBe(1); // Premium should have limit of 1
      
      // First request should be allowed
      const firstCheck = await usageLimitService.checkLimit(testUserId, premiumModel.name);
      expect(firstCheck.allowed).toBe(true);
      expect(firstCheck.remaining).toBe(1);
      
      await simulateIncrementUsage(
        testUserId,
        premiumModel.name,
        'req-0'
      );
      
      // Second request should be rejected
      const secondCheck = await usageLimitService.checkLimit(testUserId, premiumModel.name);
      expect(secondCheck.allowed).toBe(false);
      expect(secondCheck.remaining).toBe(0);
      expect(secondCheck.used).toBe(1);
      expect(secondCheck.alternatives).toBeDefined();
    });

    test('should verify rejection includes alternatives with correct information', async () => {
      // Exhaust premium model
      const premiumModel = testModels.find(m => 
        testTiers.find(t => t.id === m.tier_id && t.name === 'premium')
      );
      
      await simulateIncrementUsage(testUserId, premiumModel.name, 'req-0');
      
      // Check limit - should be rejected with alternatives
      const checkResult = await usageLimitService.checkLimit(testUserId, premiumModel.name);
      expect(checkResult.allowed).toBe(false);
      expect(checkResult.alternatives).toBeDefined();
      expect(checkResult.alternatives.length).toBeGreaterThan(0);
      
      // Verify alternatives structure
      checkResult.alternatives.forEach(alt => {
        expect(alt).toHaveProperty('model');
        expect(alt).toHaveProperty('displayName');
        expect(alt).toHaveProperty('provider');
        expect(alt).toHaveProperty('tier');
        expect(alt).toHaveProperty('remaining');
        expect(alt.remaining).toBeGreaterThan(0);
        expect(alt.model).not.toBe(premiumModel.name);
      });
    });

    test('should verify counter accuracy across all providers', async () => {
      // Test Groq provider (economy)
      const groqModel = testModels.find(m => m.provider === 'groq');
      expect(groqModel).toBeDefined();
      
      await simulateIncrementUsage(testUserId, groqModel.name, 'req-groq-1');
      await simulateIncrementUsage(testUserId, groqModel.name, 'req-groq-2');
      
      const groqCheck = await usageLimitService.checkLimit(testUserId, groqModel.name);
      expect(groqCheck.provider).toBe('groq');
      expect(groqCheck.used).toBeGreaterThanOrEqual(2); // At least 2 increments
      
      // Test Gemini provider (standard) - find by name to be specific
      const geminiModel = testModels.find(m => m.name === 'gemini-2.5-flash');
      expect(geminiModel).toBeDefined();
      expect(geminiModel.provider).toBe('gemini');
      
      const geminiInitial = await usageLimitService.checkLimit(testUserId, geminiModel.name);
      const geminiStartCount = geminiInitial.used;
      
      await simulateIncrementUsage(testUserId, geminiModel.name, 'req-gemini-1');
      await simulateIncrementUsage(testUserId, geminiModel.name, 'req-gemini-2');
      await simulateIncrementUsage(testUserId, geminiModel.name, 'req-gemini-3');
      
      const geminiCheckFinal = await usageLimitService.checkLimit(testUserId, geminiModel.name);
      expect(geminiCheckFinal.provider).toBe('gemini');
      expect(geminiCheckFinal.used).toBeGreaterThanOrEqual(geminiStartCount + 3); // At least 3 more increments
      
      // Verify counters track independently (Groq counter shouldn't change when Gemini is incremented)
      const groqCheckAgain = await usageLimitService.checkLimit(testUserId, groqModel.name);
      expect(groqCheckAgain.used).toBe(groqCheck.used); // Should be same as before, not affected by Gemini
    });
  });

  describe('11.2 Test multi-provider flow', () => {
    test('should handle requests to Groq model (economy)', async () => {
      const groqModel = testModels.find(m => m.provider === 'groq');
      expect(groqModel).toBeDefined();
      
      // Check limit
      const checkResult = await usageLimitService.checkLimit(testUserId, groqModel.name);
      expect(checkResult.allowed).toBe(true);
      expect(checkResult.provider).toBe('groq');
      expect(checkResult.tier).toBe('economy');
      
      // Increment usage
      const incrementResult = await simulateIncrementUsage(
        testUserId,
        groqModel.name,
        'req-groq-test'
      );
      expect(incrementResult.newCount).toBe(1);
      
      // Verify counter was updated
      const verifyCheck = await usageLimitService.checkLimit(testUserId, groqModel.name);
      expect(verifyCheck.used).toBe(1);
    });

    test('should handle requests to Gemini model (standard)', async () => {
      const geminiModel = testModels.find(m => m.name === 'gemini-2.5-flash');
      expect(geminiModel).toBeDefined();
      
      // Check limit
      const checkResult = await usageLimitService.checkLimit(testUserId, geminiModel.name);
      expect(checkResult.allowed).toBe(true);
      expect(checkResult.provider).toBe('gemini');
      expect(checkResult.tier).toBe('standard');
      
      // Increment usage
      const incrementResult = await simulateIncrementUsage(
        testUserId,
        geminiModel.name,
        'req-gemini-test'
      );
      expect(incrementResult.newCount).toBe(1);
      
      // Verify counter was updated
      const verifyCheck = await usageLimitService.checkLimit(testUserId, geminiModel.name);
      expect(verifyCheck.used).toBe(1);
    });

    test('should verify both providers return unified response format', async () => {
      const groqModel = testModels.find(m => m.provider === 'groq');
      const geminiModel = testModels.find(m => m.name === 'gemini-2.5-flash');
      
      const groqCheck = await usageLimitService.checkLimit(testUserId, groqModel.name);
      const geminiCheck = await usageLimitService.checkLimit(testUserId, geminiModel.name);
      
      // Both should have the same response structure
      const groqKeys = Object.keys(groqCheck).sort();
      const geminiKeys = Object.keys(geminiCheck).sort();
      expect(groqKeys).toEqual(geminiKeys);
      
      // Verify required fields
      ['allowed', 'modelName', 'displayName', 'provider', 'tier', 'limit', 'used', 'remaining', 'modelId'].forEach(field => {
        expect(groqCheck).toHaveProperty(field);
        expect(geminiCheck).toHaveProperty(field);
      });
    });

    test('should verify counters track independently across providers', async () => {
      const groqModel = testModels.find(m => m.provider === 'groq');
      const geminiModel = testModels.find(m => m.name === 'gemini-2.5-flash');
      
      // Get initial counts
      const groqInitial = await usageLimitService.checkLimit(testUserId, groqModel.name);
      const geminiInitial = await usageLimitService.checkLimit(testUserId, geminiModel.name);
      const groqStartCount = groqInitial.used;
      const geminiStartCount = geminiInitial.used;
      
      // Increment Groq counter 3 times
      await simulateIncrementUsage(testUserId, groqModel.name, 'req-groq-1');
      await simulateIncrementUsage(testUserId, groqModel.name, 'req-groq-2');
      await simulateIncrementUsage(testUserId, groqModel.name, 'req-groq-3');
      
      // Increment Gemini counter 5 times
      await simulateIncrementUsage(testUserId, geminiModel.name, 'req-gemini-1');
      await simulateIncrementUsage(testUserId, geminiModel.name, 'req-gemini-2');
      await simulateIncrementUsage(testUserId, geminiModel.name, 'req-gemini-3');
      await simulateIncrementUsage(testUserId, geminiModel.name, 'req-gemini-4');
      await simulateIncrementUsage(testUserId, geminiModel.name, 'req-gemini-5');
      
      // Verify independent counters
      const groqCheck = await usageLimitService.checkLimit(testUserId, groqModel.name);
      const geminiCheck = await usageLimitService.checkLimit(testUserId, geminiModel.name);
      
      // Verify counters increased by exact amounts
      expect(groqCheck.used).toBe(groqStartCount + 3);
      expect(geminiCheck.used).toBe(geminiStartCount + 5);
      
      // Verify providers are correct
      expect(groqCheck.provider).toBe('groq');
      expect(geminiCheck.provider).toBe('gemini');
    });
  });

  describe('11.3 Test model addition workflow', () => {
    test('should add new model via database INSERT and verify immediately available', async () => {
      // Get economy tier ID
      const economyTier = testTiers.find(t => t.name === 'economy');
      expect(economyTier).toBeDefined();
      
      // Add new model to test data
      const newModelName = `test-model-${uuidv4().substring(0, 8)}`;
      const newModel = {
        id: uuidv4(),
        name: newModelName,
        display_name: 'Test Model',
        provider: 'groq',
        tier_id: economyTier.id,
        is_active: true,
      };
      testModels.push(newModel);
      
      // Verify immediately available via getUserUsage
      const userUsage = await usageLimitService.getUserUsage(testUserId);
      const foundModel = userUsage.find(m => m.name === newModelName);
      expect(foundModel).toBeDefined();
      expect(foundModel.displayName).toBe('Test Model');
      expect(foundModel.provider).toBe('groq');
      expect(foundModel.tier).toBe('economy');
      
      // Cleanup
      testModels = testModels.filter(m => m.id !== newModel.id);
    });

    test('should verify correct limit applied from tier for new model', async () => {
      // Get standard tier ID
      const standardTier = testTiers.find(t => t.name === 'standard');
      expect(standardTier).toBeDefined();
      
      // Add new model with standard tier
      const newModelName = `test-model-${uuidv4().substring(0, 8)}`;
      const newModel = {
        id: uuidv4(),
        name: newModelName,
        display_name: 'Test Standard Model',
        provider: 'gemini',
        tier_id: standardTier.id,
        is_active: true,
      };
      testModels.push(newModel);
      
      // Check limit for new model
      const checkResult = await usageLimitService.checkLimit(testUserId, newModelName);
      expect(checkResult.allowed).toBe(true);
      expect(checkResult.limit).toBe(standardTier.request_limit);
      expect(checkResult.tier).toBe('standard');
      expect(checkResult.remaining).toBe(standardTier.request_limit);
      
      // Cleanup
      testModels = testModels.filter(m => m.id !== newModel.id);
    });

    test('should verify new model works with usage tracking', async () => {
      // Get premium tier ID
      const premiumTier = testTiers.find(t => t.name === 'premium');
      expect(premiumTier).toBeDefined();
      
      // Add new model with premium tier
      const newModelName = `test-model-${uuidv4().substring(0, 8)}`;
      const newModel = {
        id: uuidv4(),
        name: newModelName,
        display_name: 'Test Premium Model',
        provider: 'gemini',
        tier_id: premiumTier.id,
        is_active: true,
      };
      testModels.push(newModel);
      
      // Use the new model
      const checkBefore = await usageLimitService.checkLimit(testUserId, newModelName);
      expect(checkBefore.allowed).toBe(true);
      expect(checkBefore.used).toBe(0);
      
      // Increment usage
      await simulateIncrementUsage(testUserId, newModelName, 'req-test');
      
      // Verify counter was updated
      const checkAfter = await usageLimitService.checkLimit(testUserId, newModelName);
      expect(checkAfter.used).toBe(1);
      expect(checkAfter.remaining).toBe(0); // Premium has limit of 1
      expect(checkAfter.allowed).toBe(false);
      
      // Cleanup
      testModels = testModels.filter(m => m.id !== newModel.id);
    });
  });

  describe('11.4 Test premium limit edge case', () => {
    test('should handle premium model with limit of 1 correctly', async () => {
      // Find premium model (Gemini 2.5 Pro)
      const premiumModel = testModels.find(m => 
        testTiers.find(t => t.id === m.tier_id && t.name === 'premium')
      );
      expect(premiumModel).toBeDefined();
      expect(premiumModel.display_name).toContain('Pro');
      
      const premiumTier = testTiers.find(t => t.name === 'premium');
      expect(premiumTier.request_limit).toBe(1);
      
      // First request should be allowed
      const firstCheck = await usageLimitService.checkLimit(testUserId, premiumModel.name);
      expect(firstCheck.allowed).toBe(true);
      expect(firstCheck.limit).toBe(1);
      expect(firstCheck.remaining).toBe(1);
      expect(firstCheck.used).toBe(0);
      expect(firstCheck.tier).toBe('premium');
      
      // Send first request
      const incrementResult = await simulateIncrementUsage(
        testUserId,
        premiumModel.name,
        'req-premium-1'
      );
      expect(incrementResult.newCount).toBe(1);
      expect(incrementResult.remaining).toBe(0);
      
      // Second request should return 429 (simulated by allowed: false)
      const secondCheck = await usageLimitService.checkLimit(testUserId, premiumModel.name);
      expect(secondCheck.allowed).toBe(false);
      expect(secondCheck.used).toBe(1);
      expect(secondCheck.remaining).toBe(0);
      expect(secondCheck.limit).toBe(1);
    });

    test('should verify alternatives include economy and standard models', async () => {
      // Exhaust premium model
      const premiumModel = testModels.find(m => 
        testTiers.find(t => t.id === m.tier_id && t.name === 'premium')
      );
      
      await simulateIncrementUsage(testUserId, premiumModel.name, 'req-premium-1');
      
      // Check for alternatives
      const checkResult = await usageLimitService.checkLimit(testUserId, premiumModel.name);
      expect(checkResult.allowed).toBe(false);
      expect(checkResult.alternatives).toBeDefined();
      expect(checkResult.alternatives.length).toBeGreaterThan(0);
      
      // Verify alternatives include economy and standard tiers
      const tiers = checkResult.alternatives.map(alt => alt.tier);
      expect(tiers).toContain('economy');
      expect(tiers).toContain('standard');
      
      // Verify alternatives do not include premium model
      const modelNames = checkResult.alternatives.map(alt => alt.model);
      expect(modelNames).not.toContain(premiumModel.name);
      
      // Verify all alternatives have remaining > 0
      checkResult.alternatives.forEach(alt => {
        expect(alt.remaining).toBeGreaterThan(0);
      });
    });

    test('should verify premium model rejection includes correct error information', async () => {
      // Exhaust premium model
      const premiumModel = testModels.find(m => 
        testTiers.find(t => t.id === m.tier_id && t.name === 'premium')
      );
      
      await simulateIncrementUsage(testUserId, premiumModel.name, 'req-premium-1');
      
      // Check rejection details
      const checkResult = await usageLimitService.checkLimit(testUserId, premiumModel.name);
      
      // Verify error information completeness (Requirements 3.3)
      expect(checkResult.allowed).toBe(false);
      expect(checkResult.modelName).toBe(premiumModel.name);
      expect(checkResult.displayName).toBeDefined();
      expect(checkResult.tier).toBe('premium');
      expect(checkResult.limit).toBe(1);
      expect(checkResult.used).toBe(1);
      expect(checkResult.remaining).toBe(0);
      expect(checkResult.provider).toBe('gemini');
      expect(checkResult.alternatives).toBeDefined();
    });

    test('should verify user can still use other models after premium exhausted', async () => {
      // Exhaust premium model
      const premiumModel = testModels.find(m => m.name === 'gemini-2.5-pro');
      await simulateIncrementUsage(testUserId, premiumModel.name, 'req-premium-1');
      
      // Verify premium is exhausted
      const premiumCheck = await usageLimitService.checkLimit(testUserId, premiumModel.name);
      expect(premiumCheck.allowed).toBe(false);
      expect(premiumCheck.remaining).toBe(0);
      expect(premiumCheck.limit).toBe(1); // Premium tier has limit of 1
      
      // Verify economy model has remaining quota
      const economyModel = testModels.find(m => m.name === 'llama-3.1-8b-instant');
      const economyCheck = await usageLimitService.checkLimit(testUserId, economyModel.name);
      // Economy has limit of 50, so even if used, should have remaining
      expect(economyCheck.limit).toBe(50);
      expect(economyCheck.allowed).toBe(true);
      expect(economyCheck.remaining).toBeGreaterThan(0);
      
      // Verify standard model has remaining quota
      const standardModel = testModels.find(m => m.name === 'gemini-2.5-flash');
      const standardCheck = await usageLimitService.checkLimit(testUserId, standardModel.name);
      expect(standardCheck.limit).toBe(10);
      expect(standardCheck.allowed).toBe(true);
      expect(standardCheck.remaining).toBeGreaterThan(0);
    });
  });
});
