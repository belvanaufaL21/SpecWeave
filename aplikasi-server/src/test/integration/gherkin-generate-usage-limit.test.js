const request = require('supertest');
const express = require('express');

// Mock services before importing middleware
const mockUsageLimitService = {
  checkLimit: jest.fn(),
  incrementUsage: jest.fn(),
  recordRequest: jest.fn(),
  getUserUsage: jest.fn(),
  getAlternativeModels: jest.fn()
};

const mockLlmProviderService = {
  generateCompletion: jest.fn()
};

jest.mock('../../services/usageLimitService', () => mockUsageLimitService);
jest.mock('../../services/llmProviderService', () => mockLlmProviderService);

const { checkUsageLimit } = require('../../middleware/usageLimitMiddleware');

// Reference the mocks for use in tests
const usageLimitService = mockUsageLimitService;
const llmProviderService = mockLlmProviderService;

// Create test app with gherkin endpoint
const createTestApp = () => {
  const app = express();
  app.use(express.json());
  
  // Mock authentication middleware
  const mockAuth = (req, res, next) => {
    req.user = { id: 'test-user-123' };
    next();
  };
  
  // Gherkin generate endpoint with usage limit middleware
  app.post('/api/gherkin/generate', mockAuth, checkUsageLimit, async (req, res) => {
    try {
      const { userStory, model = 'llama-3.1-8b-instant' } = req.body;
      
      if (!userStory) {
        return res.status(400).json({
          success: false,
          error: 'User story is required'
        });
      }
      
      // Get provider and model info from req.usageLimit (set by middleware)
      const { provider, modelName, displayName, tier, limit, remaining } = req.usageLimit;
      
      // Call LLM provider service
      const messages = [
        { role: 'system', content: 'Convert user story to Gherkin format.' },
        { role: 'user', content: userStory }
      ];
      
      const result = await llmProviderService.generateCompletion(modelName, provider, messages);
      
      // Increment usage counter after successful LLM call
      await usageLimitService.incrementUsage(req.user.id, modelName, `req-${Date.now()}`);
      
      // Record request in history
      await usageLimitService.recordRequest(req.user.id, modelName, `req-${Date.now()}`, true, null);
      
      // Return response with usage information
      res.json({
        success: true,
        data: {
          type: 'gherkin',
          gherkin: result.text,
          usage: {
            model: modelName,
            displayName,
            provider,
            tier,
            remaining: remaining - 1, // Decremented after this request
            limit
          }
        }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });
  
  return app;
};

describe('Gherkin Generate API - Usage Limit Integration Tests', () => {
  let app;

  beforeEach(() => {
    app = createTestApp();
    jest.clearAllMocks();
  });

  describe('Request with Groq model (economy tier)', () => {
    it('should process request successfully with Groq model', async () => {
      // **Feature: llm-usage-limit-system, Requirements: 1.2, 4.3, 5.3**
      
      // Mock limit check - user has remaining quota
      usageLimitService.checkLimit.mockResolvedValue({
        allowed: true,
        modelName: 'llama-3.1-8b-instant',
        displayName: 'Llama 3.1 8B',
        provider: 'groq',
        tier: 'economy',
        limit: 50,
        used: 10,
        remaining: 40
      });
      
      // Mock LLM provider response
      llmProviderService.generateCompletion.mockResolvedValue({
        text: 'Feature: User Login\n  Scenario: Successful login\n    Given user is on login page\n    When user enters valid credentials\n    Then user is redirected to dashboard',
        tokensInput: 50,
        tokensOutput: 100
      });
      
      // Mock increment usage
      usageLimitService.incrementUsage.mockResolvedValue({
        newCount: 11,
        remaining: 39
      });
      
      // Mock record request
      usageLimitService.recordRequest.mockResolvedValue();
      
      const testRequest = {
        userStory: 'As a user, I want to login so that I can access my dashboard',
        model: 'llama-3.1-8b-instant'
      };

      const response = await request(app)
        .post('/api/gherkin/generate')
        .send(testRequest)
        .expect(200);

      // Verify response structure
      expect(response.body.success).toBe(true);
      expect(response.body.data.type).toBe('gherkin');
      expect(response.body.data.gherkin).toBeDefined();
      
      // Verify usage information is included
      expect(response.body.data.usage).toBeDefined();
      expect(response.body.data.usage.model).toBe('llama-3.1-8b-instant');
      expect(response.body.data.usage.displayName).toBe('Llama 3.1 8B');
      expect(response.body.data.usage.provider).toBe('groq');
      expect(response.body.data.usage.tier).toBe('economy');
      expect(response.body.data.usage.limit).toBe(50);
      expect(response.body.data.usage.remaining).toBe(39);
      
      // Verify LLM provider was called with correct parameters
      expect(llmProviderService.generateCompletion).toHaveBeenCalledWith(
        'llama-3.1-8b-instant',
        'groq',
        expect.arrayContaining([
          expect.objectContaining({ role: 'system' }),
          expect.objectContaining({ role: 'user', content: testRequest.userStory })
        ])
      );
      
      // Verify counter was incremented
      expect(usageLimitService.incrementUsage).toHaveBeenCalledWith(
        'test-user-123',
        'llama-3.1-8b-instant',
        expect.any(String)
      );
      
      // Verify request was recorded
      expect(usageLimitService.recordRequest).toHaveBeenCalledWith(
        'test-user-123',
        'llama-3.1-8b-instant',
        expect.any(String),
        true,
        null
      );
    });
  });

  describe('Request with Gemini model (standard tier)', () => {
    it('should process request successfully with Gemini Flash model', async () => {
      // **Feature: llm-usage-limit-system, Requirements: 1.2, 4.3, 5.3**
      
      // Mock limit check
      usageLimitService.checkLimit.mockResolvedValue({
        allowed: true,
        modelName: 'gemini-2.5-flash',
        displayName: 'Gemini 2.5 Flash',
        provider: 'gemini',
        tier: 'standard',
        limit: 10,
        used: 3,
        remaining: 7
      });
      
      // Mock LLM provider response
      llmProviderService.generateCompletion.mockResolvedValue({
        text: 'Feature: User Registration\n  Scenario: New user signs up\n    Given user is on registration page\n    When user fills in valid details\n    Then account is created successfully',
        tokensInput: 45,
        tokensOutput: 95
      });
      
      // Mock increment usage
      usageLimitService.incrementUsage.mockResolvedValue({
        newCount: 4,
        remaining: 6
      });
      
      // Mock record request
      usageLimitService.recordRequest.mockResolvedValue();
      
      const testRequest = {
        userStory: 'As a new user, I want to register an account',
        model: 'gemini-2.5-flash'
      };

      const response = await request(app)
        .post('/api/gherkin/generate')
        .send(testRequest)
        .expect(200);

      // Verify response
      expect(response.body.success).toBe(true);
      expect(response.body.data.usage.model).toBe('gemini-2.5-flash');
      expect(response.body.data.usage.provider).toBe('gemini');
      expect(response.body.data.usage.tier).toBe('standard');
      expect(response.body.data.usage.limit).toBe(10);
      expect(response.body.data.usage.remaining).toBe(6);
      
      // Verify Gemini provider was called
      expect(llmProviderService.generateCompletion).toHaveBeenCalledWith(
        'gemini-2.5-flash',
        'gemini',
        expect.any(Array)
      );
    });
  });

  describe('Request with Gemini model (premium tier)', () => {
    it('should process request successfully with Gemini Pro model', async () => {
      // **Feature: llm-usage-limit-system, Requirements: 1.2, 4.3, 5.3**
      
      // Mock limit check - user has 1 remaining request
      usageLimitService.checkLimit.mockResolvedValue({
        allowed: true,
        modelName: 'gemini-2.5-pro',
        displayName: 'Gemini 2.5 Pro',
        provider: 'gemini',
        tier: 'premium',
        limit: 1,
        used: 0,
        remaining: 1
      });
      
      // Mock LLM provider response
      llmProviderService.generateCompletion.mockResolvedValue({
        text: 'Feature: Payment Processing\n  Scenario: Successful payment\n    Given user has items in cart\n    When user completes payment\n    Then order is confirmed',
        tokensInput: 60,
        tokensOutput: 120
      });
      
      // Mock increment usage
      usageLimitService.incrementUsage.mockResolvedValue({
        newCount: 1,
        remaining: 0
      });
      
      // Mock record request
      usageLimitService.recordRequest.mockResolvedValue();
      
      const testRequest = {
        userStory: 'As a customer, I want to complete payment for my order',
        model: 'gemini-2.5-pro'
      };

      const response = await request(app)
        .post('/api/gherkin/generate')
        .send(testRequest)
        .expect(200);

      // Verify response
      expect(response.body.success).toBe(true);
      expect(response.body.data.usage.model).toBe('gemini-2.5-pro');
      expect(response.body.data.usage.provider).toBe('gemini');
      expect(response.body.data.usage.tier).toBe('premium');
      expect(response.body.data.usage.limit).toBe(1);
      expect(response.body.data.usage.remaining).toBe(0); // Used up the last request
      
      // Verify Gemini provider was called
      expect(llmProviderService.generateCompletion).toHaveBeenCalledWith(
        'gemini-2.5-pro',
        'gemini',
        expect.any(Array)
      );
    });
  });

  describe('Counter increment after successful request', () => {
    it('should increment counter only after successful LLM response', async () => {
      // **Feature: llm-usage-limit-system, Requirements: 1.2, 4.3**
      // **Feature: llm-usage-limit-system, Property 2: Conditional Counter Increment**
      
      usageLimitService.checkLimit.mockResolvedValue({
        allowed: true,
        modelName: 'llama-3.1-8b-instant',
        displayName: 'Llama 3.1 8B',
        provider: 'groq',
        tier: 'economy',
        limit: 50,
        used: 25,
        remaining: 25
      });
      
      llmProviderService.generateCompletion.mockResolvedValue({
        text: 'Feature: Test\n  Scenario: Test scenario',
        tokensInput: 10,
        tokensOutput: 20
      });
      
      usageLimitService.incrementUsage.mockResolvedValue({
        newCount: 26,
        remaining: 24
      });
      
      usageLimitService.recordRequest.mockResolvedValue();
      
      const testRequest = {
        userStory: 'As a user, I want to test the system',
        model: 'llama-3.1-8b-instant'
      };

      await request(app)
        .post('/api/gherkin/generate')
        .send(testRequest)
        .expect(200);

      // Verify increment was called after LLM completion
      expect(usageLimitService.incrementUsage).toHaveBeenCalledTimes(1);
      expect(usageLimitService.incrementUsage).toHaveBeenCalledWith(
        'test-user-123',
        'llama-3.1-8b-instant',
        expect.any(String)
      );
    });

    it('should not increment counter if LLM call fails', async () => {
      // **Feature: llm-usage-limit-system, Requirements: 4.3**
      // **Feature: llm-usage-limit-system, Property 2: Conditional Counter Increment**
      
      usageLimitService.checkLimit.mockResolvedValue({
        allowed: true,
        modelName: 'llama-3.1-8b-instant',
        displayName: 'Llama 3.1 8B',
        provider: 'groq',
        tier: 'economy',
        limit: 50,
        used: 25,
        remaining: 25
      });
      
      // Mock LLM provider failure
      llmProviderService.generateCompletion.mockRejectedValue(
        new Error('LLM provider error')
      );
      
      const testRequest = {
        userStory: 'As a user, I want to test error handling',
        model: 'llama-3.1-8b-instant'
      };

      await request(app)
        .post('/api/gherkin/generate')
        .send(testRequest)
        .expect(500);

      // Verify increment was NOT called
      expect(usageLimitService.incrementUsage).not.toHaveBeenCalled();
      expect(usageLimitService.recordRequest).not.toHaveBeenCalled();
    });
  });

  describe('Limit enforcement (429 response)', () => {
    it('should return 429 when limit is reached', async () => {
      // **Feature: llm-usage-limit-system, Requirements: 3.1, 3.2, 3.3, 3.4, 4.1, 4.2**
      // **Feature: llm-usage-limit-system, Property 6: Request Rejection at Limit**
      // **Feature: llm-usage-limit-system, Property 7: Rate Limit Status Code**
      
      // Mock limit check - user has exhausted quota
      usageLimitService.checkLimit.mockResolvedValue({
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
          },
          {
            model: 'gemini-2.5-flash',
            displayName: 'Gemini 2.5 Flash',
            provider: 'gemini',
            tier: 'standard',
            remaining: 7
          }
        ]
      });
      
      const testRequest = {
        userStory: 'As a user, I want to use premium model',
        model: 'gemini-2.5-pro'
      };

      const response = await request(app)
        .post('/api/gherkin/generate')
        .send(testRequest)
        .expect(429);

      // Verify error response structure
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBeDefined();
      expect(response.body.error.code).toBe('USAGE_LIMIT_EXCEEDED');
      
      // Verify error message includes model, tier, and limit info
      expect(response.body.error.message).toContain('Gemini 2.5 Pro');
      expect(response.body.error.message).toContain('premium');
      expect(response.body.error.message).toContain('1');
      
      // Verify error details
      expect(response.body.error.model).toBe('gemini-2.5-pro');
      expect(response.body.error.displayName).toBe('Gemini 2.5 Pro');
      expect(response.body.error.tier).toBe('premium');
      expect(response.body.error.limit).toBe(1);
      expect(response.body.error.used).toBe(1);
      
      // Verify alternatives are provided
      expect(response.body.error.alternatives).toBeDefined();
      expect(Array.isArray(response.body.error.alternatives)).toBe(true);
      expect(response.body.error.alternatives.length).toBe(2);
      
      // Verify alternative models have remaining quota
      response.body.error.alternatives.forEach(alt => {
        expect(alt.remaining).toBeGreaterThan(0);
        expect(alt.model).toBeDefined();
        expect(alt.displayName).toBeDefined();
        expect(alt.provider).toBeDefined();
        expect(alt.tier).toBeDefined();
      });
      
      // Verify LLM was NOT called
      expect(llmProviderService.generateCompletion).not.toHaveBeenCalled();
      
      // Verify counter was NOT incremented
      expect(usageLimitService.incrementUsage).not.toHaveBeenCalled();
    });

    it('should return 429 for economy tier when limit reached', async () => {
      // **Feature: llm-usage-limit-system, Requirements: 3.1, 3.2, 4.1, 4.2**
      
      usageLimitService.checkLimit.mockResolvedValue({
        allowed: false,
        modelName: 'llama-3.1-8b-instant',
        displayName: 'Llama 3.1 8B',
        provider: 'groq',
        tier: 'economy',
        limit: 50,
        used: 50,
        remaining: 0,
        alternatives: [
          {
            model: 'gemini-2.5-flash',
            displayName: 'Gemini 2.5 Flash',
            provider: 'gemini',
            tier: 'standard',
            remaining: 5
          }
        ]
      });
      
      const testRequest = {
        userStory: 'As a user, I want to test limit enforcement',
        model: 'llama-3.1-8b-instant'
      };

      const response = await request(app)
        .post('/api/gherkin/generate')
        .send(testRequest)
        .expect(429);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('USAGE_LIMIT_EXCEEDED');
      expect(response.body.error.limit).toBe(50);
      expect(response.body.error.used).toBe(50);
      expect(response.body.error.alternatives.length).toBeGreaterThan(0);
    });
  });

  describe('Response includes usage information', () => {
    it('should include complete usage information in successful response', async () => {
      // **Feature: llm-usage-limit-system, Requirements: 5.3**
      // **Feature: llm-usage-limit-system, Property 11: Response Enrichment**
      
      usageLimitService.checkLimit.mockResolvedValue({
        allowed: true,
        modelName: 'gemini-2.5-flash',
        displayName: 'Gemini 2.5 Flash',
        provider: 'gemini',
        tier: 'standard',
        limit: 10,
        used: 5,
        remaining: 5
      });
      
      llmProviderService.generateCompletion.mockResolvedValue({
        text: 'Feature: Test',
        tokensInput: 10,
        tokensOutput: 20
      });
      
      usageLimitService.incrementUsage.mockResolvedValue({
        newCount: 6,
        remaining: 4
      });
      
      usageLimitService.recordRequest.mockResolvedValue();
      
      const testRequest = {
        userStory: 'As a user, I want to see usage information',
        model: 'gemini-2.5-flash'
      };

      const response = await request(app)
        .post('/api/gherkin/generate')
        .send(testRequest)
        .expect(200);

      // Verify usage object structure
      expect(response.body.data.usage).toEqual({
        model: 'gemini-2.5-flash',
        displayName: 'Gemini 2.5 Flash',
        provider: 'gemini',
        tier: 'standard',
        remaining: 4,
        limit: 10
      });
      
      // Verify remaining count is accurate after increment
      expect(response.body.data.usage.remaining).toBe(4);
      expect(response.body.data.usage.limit - response.body.data.usage.remaining).toBe(6);
    });

    it('should show remaining as 0 after using last request', async () => {
      // **Feature: llm-usage-limit-system, Requirements: 5.3**
      
      usageLimitService.checkLimit.mockResolvedValue({
        allowed: true,
        modelName: 'gemini-2.5-pro',
        displayName: 'Gemini 2.5 Pro',
        provider: 'gemini',
        tier: 'premium',
        limit: 1,
        used: 0,
        remaining: 1
      });
      
      llmProviderService.generateCompletion.mockResolvedValue({
        text: 'Feature: Last Request',
        tokensInput: 10,
        tokensOutput: 20
      });
      
      usageLimitService.incrementUsage.mockResolvedValue({
        newCount: 1,
        remaining: 0
      });
      
      usageLimitService.recordRequest.mockResolvedValue();
      
      const testRequest = {
        userStory: 'As a user, I want to use my last request',
        model: 'gemini-2.5-pro'
      };

      const response = await request(app)
        .post('/api/gherkin/generate')
        .send(testRequest)
        .expect(200);

      // Verify remaining is 0 after using last request
      expect(response.body.data.usage.remaining).toBe(0);
      expect(response.body.data.usage.limit).toBe(1);
    });
  });

  describe('Model independence', () => {
    it('should allow requests to other models when one is exhausted', async () => {
      // **Feature: llm-usage-limit-system, Requirements: 1.4**
      // **Feature: llm-usage-limit-system, Property 3: Model Independence**
      
      // First request - premium model exhausted
      usageLimitService.checkLimit.mockResolvedValueOnce({
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
            remaining: 40
          }
        ]
      });
      
      const premiumRequest = {
        userStory: 'As a user, I want to use premium model',
        model: 'gemini-2.5-pro'
      };

      const premiumResponse = await request(app)
        .post('/api/gherkin/generate')
        .send(premiumRequest)
        .expect(429);

      expect(premiumResponse.body.error.alternatives).toBeDefined();
      expect(premiumResponse.body.error.alternatives.length).toBeGreaterThan(0);
      
      // Second request - economy model still available
      usageLimitService.checkLimit.mockResolvedValueOnce({
        allowed: true,
        modelName: 'llama-3.1-8b-instant',
        displayName: 'Llama 3.1 8B',
        provider: 'groq',
        tier: 'economy',
        limit: 50,
        used: 10,
        remaining: 40
      });
      
      llmProviderService.generateCompletion.mockResolvedValue({
        text: 'Feature: Alternative Model',
        tokensInput: 10,
        tokensOutput: 20
      });
      
      usageLimitService.incrementUsage.mockResolvedValue({
        newCount: 11,
        remaining: 39
      });
      
      usageLimitService.recordRequest.mockResolvedValue();
      
      const economyRequest = {
        userStory: 'As a user, I want to use economy model',
        model: 'llama-3.1-8b-instant'
      };

      const economyResponse = await request(app)
        .post('/api/gherkin/generate')
        .send(economyRequest)
        .expect(200);

      expect(economyResponse.body.success).toBe(true);
      expect(economyResponse.body.data.usage.model).toBe('llama-3.1-8b-instant');
      expect(economyResponse.body.data.usage.remaining).toBe(39);
    });
  });
});
