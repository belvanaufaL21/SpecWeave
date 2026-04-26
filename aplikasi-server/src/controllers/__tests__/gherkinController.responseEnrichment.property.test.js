/**
 * Property-Based Integration Test for Response Enrichment
 * 
 * Property 11: Response Enrichment
 * Validates: Requirements 5.3
 * 
 * Feature: llm-usage-limit-system, Property 11: Response Enrichment
 * 
 * For any successful request, the response SHALL include the remaining limit
 * information for the model used.
 */

import fc from 'fast-check';
import request from 'supertest';
import express from 'express';
import gherkinRoutes from '../../routes/gherkinRoutes.js';
import { errorHandler } from '../../middlewares/errorHandler.js';

// Mock dependencies
jest.mock('../../services/supabaseService.js');
jest.mock('../../services/usageLimitService.js');
jest.mock('../../services/llmProviderService.js');
jest.mock('../../services/epicService.js');
jest.mock('../../services/jiraService.js');
jest.mock('../../services/meteorService.js');
jest.mock('../../services/performanceService.js');

describe('Gherkin Controller Property Tests - Response Enrichment', () => {
  let app;
  let mockSupabaseService;
  let mockUsageLimitService;
  let mockLlmProviderService;
  let mockEpicService;
  let mockPerformanceService;
  let mockMeteorService;

  beforeEach(async () => {
    // Clear all mocks
    jest.clearAllMocks();

    // Import mocked services
    mockSupabaseService = (await import('../../services/supabaseService.js')).default;
    mockUsageLimitService = (await import('../../services/usageLimitService.js')).default;
    mockLlmProviderService = (await import('../../services/llmProviderService.js')).default;
    mockEpicService = (await import('../../services/epicService.js')).default;
    
    const PerformanceService = (await import('../../services/performanceService.js')).default;
    mockPerformanceService = new PerformanceService();
    
    const MeteorService = (await import('../../services/meteorService.js')).default;
    mockMeteorService = new MeteorService();

    // Setup default mocks
    mockSupabaseService.createScenario = jest.fn().mockResolvedValue({ id: 'scenario-123' });
    mockSupabaseService.logEvaluationMetrics = jest.fn().mockResolvedValue({});
    
    mockEpicService.getEpicContext = jest.fn().mockResolvedValue({ success: false });
    
    mockPerformanceService.startTimer = jest.fn();
    mockPerformanceService.endTimer = jest.fn().mockReturnValue({ durationMs: 1000 });
    mockPerformanceService.recordError = jest.fn().mockReturnValue({ durationMs: 500 });
    mockPerformanceService.logPerformanceMetrics = jest.fn().mockResolvedValue({});
    mockPerformanceService.logMeteorMetrics = jest.fn().mockResolvedValue({});
    
    mockMeteorService.extractScenarioText = jest.fn().mockReturnValue('test scenario');
    mockMeteorService.generateReferenceText = jest.fn().mockReturnValue('test reference');
    mockMeteorService.evaluateScenario = jest.fn().mockResolvedValue({
      meteor_score: 0.85,
      precision: 0.9,
      recall: 0.8,
      fmean: 0.85,
      fragmentation_penalty: 0.05,
    });
    mockMeteorService.getQualityAssessment = jest.fn().mockReturnValue({
      level: 'good',
      description: 'Good quality',
      recommendation: 'Acceptable',
    });
    mockMeteorService.meetsQualityThreshold = jest.fn().mockReturnValue(true);

    // Mock LLM provider to return valid Gherkin
    mockLlmProviderService.generateCompletion = jest.fn().mockResolvedValue({
      text: JSON.stringify({
        feature: 'User Login',
        description: 'Test feature',
        scenarios: [
          {
            scenario: 'Successful login',
            given: ['User is on login page'],
            when: ['User enters valid credentials'],
            then: ['User is logged in'],
          },
        ],
      }),
      tokensInput: 50,
      tokensOutput: 100,
    });

    // Create test app with authentication middleware
    app = express();
    app.use(express.json());
    
    // Mock authentication middleware
    app.use((req, res, next) => {
      req.user = { id: 'test-user-123' };
      next();
    });
    
    app.use('/api/gherkin', gherkinRoutes);
    app.use(errorHandler);
  });

  /**
   * Model registry for property-based testing
   */
  const modelRegistry = [
    { name: 'llama-3.1-8b-instant', provider: 'groq', tier: 'economy', limit: 50 },
    { name: 'gemini-2.5-flash', provider: 'gemini', tier: 'standard', limit: 10 },
    { name: 'gemini-2.5-pro', provider: 'gemini', tier: 'premium', limit: 1 },
  ];

  // Arbitraries for property-based testing
  const modelArb = fc.constantFrom(...modelRegistry);
  const usageCountArb = fc.nat({ max: 45 }); // Keep below limit to ensure success
  const userStoryArb = fc.string({ minLength: 50, maxLength: 200 }).map(
    s => `As a user, I want to ${s}, so that I can achieve my goals.`
  );

  /**
   * Property 11: Response Enrichment
   * 
   * **Validates: Requirements 5.3**
   * 
   * For any successful request, the response SHALL include the remaining limit
   * information for the model used.
   */
  test('Property 11: Response Enrichment - successful requests include usage information', async () => {
    // Feature: llm-usage-limit-system, Property 11: Response Enrichment
    await fc.assert(
      fc.asyncProperty(
        modelArb,
        usageCountArb,
        userStoryArb,
        async (model, usedCount, userStory) => {
          // Ensure we have remaining quota
          if (usedCount >= model.limit) {
            return true;
          }

          const remaining = model.limit - usedCount;
          const displayName = model.name.replace(/-/g, ' ').toUpperCase();

          // Mock checkLimit - user has remaining quota
          mockUsageLimitService.checkLimit = jest.fn().mockResolvedValue({
            allowed: true,
            remaining,
            limit: model.limit,
            tier: model.tier,
            provider: model.provider,
            modelName: model.name,
            displayName,
            used: usedCount,
          });

          // Mock incrementUsage
          mockUsageLimitService.incrementUsage = jest.fn().mockResolvedValue({
            newCount: usedCount + 1,
            remaining: remaining - 1,
          });

          // Mock recordRequest
          mockUsageLimitService.recordRequest = jest.fn().mockResolvedValue({});

          // Act: Send request to generate endpoint
          const response = await request(app)
            .post('/api/gherkin/generate')
            .send({
              userStory,
              model: model.name,
            })
            .expect(200);

          // Assert: Response structure
          expect(response.body.success).toBe(true);
          expect(response.body.data).toBeDefined();

          // Assert: Usage information is included
          expect(response.body.data.usage).toBeDefined();
          expect(response.body.data.usage).toHaveProperty('model');
          expect(response.body.data.usage).toHaveProperty('displayName');
          expect(response.body.data.usage).toHaveProperty('provider');
          expect(response.body.data.usage).toHaveProperty('tier');
          expect(response.body.data.usage).toHaveProperty('remaining');
          expect(response.body.data.usage).toHaveProperty('limit');

          // Assert: Usage information values are correct
          expect(response.body.data.usage.model).toBe(model.name);
          expect(response.body.data.usage.provider).toBe(model.provider);
          expect(response.body.data.usage.tier).toBe(model.tier);
          expect(response.body.data.usage.limit).toBe(model.limit);

          // Assert: Remaining count is accurate (after increment)
          expect(response.body.data.usage.remaining).toBe(remaining - 1);
          expect(response.body.data.usage.remaining).toBeGreaterThanOrEqual(0);
          expect(response.body.data.usage.remaining).toBeLessThan(model.limit);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 11: Response Enrichment - Usage info completeness
   * 
   * Verify that all required fields are present and have correct types
   */
  test('Property 11: Response Enrichment - usage info has all required fields with correct types', async () => {
    // Feature: llm-usage-limit-system, Property 11: Response Enrichment
    await fc.assert(
      fc.asyncProperty(
        modelArb,
        usageCountArb,
        userStoryArb,
        async (model, usedCount, userStory) => {
          // Ensure we have remaining quota
          if (usedCount >= model.limit) {
            return true;
          }

          const remaining = model.limit - usedCount;
          const displayName = model.name.replace(/-/g, ' ').toUpperCase();

          // Mock services
          mockUsageLimitService.checkLimit = jest.fn().mockResolvedValue({
            allowed: true,
            remaining,
            limit: model.limit,
            tier: model.tier,
            provider: model.provider,
            modelName: model.name,
            displayName,
            used: usedCount,
          });

          mockUsageLimitService.incrementUsage = jest.fn().mockResolvedValue({
            newCount: usedCount + 1,
            remaining: remaining - 1,
          });

          mockUsageLimitService.recordRequest = jest.fn().mockResolvedValue({});

          // Act: Send request
          const response = await request(app)
            .post('/api/gherkin/generate')
            .send({
              userStory,
              model: model.name,
            })
            .expect(200);

          // Assert: Field types are correct
          const usage = response.body.data.usage;
          expect(typeof usage.model).toBe('string');
          expect(typeof usage.displayName).toBe('string');
          expect(typeof usage.provider).toBe('string');
          expect(typeof usage.tier).toBe('string');
          expect(typeof usage.remaining).toBe('number');
          expect(typeof usage.limit).toBe('number');

          // Assert: No extra fields (strict schema)
          const expectedKeys = ['model', 'displayName', 'provider', 'tier', 'remaining', 'limit'];
          const actualKeys = Object.keys(usage).sort();
          expect(actualKeys).toEqual(expectedKeys.sort());
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 11: Response Enrichment - Remaining count consistency
   * 
   * Verify that remaining + used = limit (conservation property)
   */
  test('Property 11: Response Enrichment - remaining count satisfies conservation property', async () => {
    // Feature: llm-usage-limit-system, Property 11: Response Enrichment
    await fc.assert(
      fc.asyncProperty(
        modelArb,
        usageCountArb,
        userStoryArb,
        async (model, usedCount, userStory) => {
          // Ensure we have remaining quota
          if (usedCount >= model.limit) {
            return true;
          }

          const remaining = model.limit - usedCount;
          const displayName = model.name.replace(/-/g, ' ').toUpperCase();

          // Mock services
          mockUsageLimitService.checkLimit = jest.fn().mockResolvedValue({
            allowed: true,
            remaining,
            limit: model.limit,
            tier: model.tier,
            provider: model.provider,
            modelName: model.name,
            displayName,
            used: usedCount,
          });

          mockUsageLimitService.incrementUsage = jest.fn().mockResolvedValue({
            newCount: usedCount + 1,
            remaining: remaining - 1,
          });

          mockUsageLimitService.recordRequest = jest.fn().mockResolvedValue({});

          // Act: Send request
          const response = await request(app)
            .post('/api/gherkin/generate')
            .send({
              userStory,
              model: model.name,
            })
            .expect(200);

          // Assert: Conservation property holds
          const usage = response.body.data.usage;
          const usedAfterRequest = usedCount + 1;
          
          // remaining + used = limit
          expect(usage.remaining + usedAfterRequest).toBe(usage.limit);
          
          // Verify remaining is non-negative
          expect(usage.remaining).toBeGreaterThanOrEqual(0);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 11: Response Enrichment - Usage info reflects model used
   * 
   * Verify that usage information corresponds to the model actually used in the request
   */
  test('Property 11: Response Enrichment - usage info matches requested model', async () => {
    // Feature: llm-usage-limit-system, Property 11: Response Enrichment
    await fc.assert(
      fc.asyncProperty(
        modelArb,
        usageCountArb,
        userStoryArb,
        async (model, usedCount, userStory) => {
          // Ensure we have remaining quota
          if (usedCount >= model.limit) {
            return true;
          }

          const remaining = model.limit - usedCount;
          const displayName = model.name.replace(/-/g, ' ').toUpperCase();

          // Mock services
          mockUsageLimitService.checkLimit = jest.fn().mockResolvedValue({
            allowed: true,
            remaining,
            limit: model.limit,
            tier: model.tier,
            provider: model.provider,
            modelName: model.name,
            displayName,
            used: usedCount,
          });

          mockUsageLimitService.incrementUsage = jest.fn().mockResolvedValue({
            newCount: usedCount + 1,
            remaining: remaining - 1,
          });

          mockUsageLimitService.recordRequest = jest.fn().mockResolvedValue({});

          // Act: Send request with specific model
          const response = await request(app)
            .post('/api/gherkin/generate')
            .send({
              userStory,
              model: model.name,
            })
            .expect(200);

          // Assert: Usage info matches the requested model
          const usage = response.body.data.usage;
          expect(usage.model).toBe(model.name);
          expect(usage.provider).toBe(model.provider);
          expect(usage.tier).toBe(model.tier);
          expect(usage.limit).toBe(model.limit);
        }
      ),
      { numRuns: 100 }
    );
  });
});
