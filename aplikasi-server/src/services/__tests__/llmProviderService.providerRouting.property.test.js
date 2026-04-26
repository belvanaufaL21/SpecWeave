/**
 * Property-Based Tests for LLM Provider Service - Provider Routing
 * 
 * Property 13: Provider Routing Correctness
 * Validates: Architecture requirement (multi-provider support)
 * 
 * Feature: llm-usage-limit-system, Property 13: Provider Routing Correctness
 */

const fc = require('fast-check');

describe('LLMProviderService Property Tests - Provider Routing', () => {
  let llmProviderService;
  let mockGroqCreate;
  let mockGeminiGenerateContent;
  let mockGeminiGetGenerativeModel;

  beforeEach(() => {
    // Clear module cache to get fresh instance
    jest.resetModules();
    jest.clearAllMocks();

    // Mock Groq SDK
    mockGroqCreate = jest.fn().mockResolvedValue({
      choices: [
        {
          message: {
            content: 'Groq generated response',
          },
        },
      ],
      usage: {
        prompt_tokens: 50,
        completion_tokens: 100,
      },
    });

    jest.mock('groq-sdk', () => {
      return jest.fn().mockImplementation(() => ({
        chat: {
          completions: {
            create: mockGroqCreate,
          },
        },
      }));
    });

    // Mock Gemini SDK
    mockGeminiGenerateContent = jest.fn().mockResolvedValue({
      response: {
        text: () => 'Gemini generated response',
        usageMetadata: {
          promptTokenCount: 30,
          candidatesTokenCount: 80,
        },
      },
    });

    mockGeminiGetGenerativeModel = jest.fn(() => ({
      generateContent: mockGeminiGenerateContent,
    }));

    jest.mock('@google/generative-ai', () => ({
      GoogleGenerativeAI: jest.fn().mockImplementation(() => ({
        getGenerativeModel: mockGeminiGetGenerativeModel,
      })),
    }));

    // Import service after mocks are set up
    llmProviderService = require('../llmProviderService.js').default;
  });

  /**
   * Model registry for property-based testing
   * Represents the models available in the system with their providers
   */
  const modelRegistry = [
    { name: 'llama-3.1-8b-instant', provider: 'groq', tier: 'economy' },
    { name: 'llama-3.1-70b-versatile', provider: 'groq', tier: 'economy' },
    { name: 'gemini-2.5-flash', provider: 'gemini', tier: 'standard' },
    { name: 'gemini-2.5-pro', provider: 'gemini', tier: 'premium' },
  ];

  // Arbitraries for property-based testing
  const modelArb = fc.constantFrom(...modelRegistry);
  
  const messagesArb = fc.array(
    fc.record({
      role: fc.constantFrom('system', 'user'),
      content: fc.string({ minLength: 1, maxLength: 200 }),
    }),
    { minLength: 1, maxLength: 5 }
  );

  /**
   * Property 13: Provider Routing Correctness
   * 
   * **Validates: Architecture requirement (multi-provider support)**
   * 
   * For any request to a model, the system SHALL route the request to the correct
   * LLM provider as specified in the model's provider field. A request to a Groq
   * model SHALL NOT be sent to the Gemini API, and vice versa.
   */
  test('Property 13: Provider Routing Correctness - Groq models route to Groq SDK', async () => {
    // Feature: llm-usage-limit-system, Property 13: Provider Routing Correctness
    await fc.assert(
      fc.asyncProperty(
        modelArb.filter(m => m.provider === 'groq'),
        messagesArb,
        async (model, messages) => {
          // Spy on private methods to verify routing
          const callGroqSpy = jest.spyOn(llmProviderService, '_callGroq');
          const callGeminiSpy = jest.spyOn(llmProviderService, '_callGemini');

          // Act: Call generateCompletion with Groq model
          await llmProviderService.generateCompletion(
            model.name,
            model.provider,
            messages
          );

          // Assert: Groq method called, Gemini method NOT called
          expect(callGroqSpy).toHaveBeenCalledTimes(1);
          expect(callGroqSpy).toHaveBeenCalledWith(model.name, messages);
          expect(callGeminiSpy).not.toHaveBeenCalled();

          // Cleanup
          callGroqSpy.mockRestore();
          callGeminiSpy.mockRestore();
        }
      ),
      { numRuns: 100 }
    );
  });

  test('Property 13: Provider Routing Correctness - Gemini models route to Gemini SDK', async () => {
    // Feature: llm-usage-limit-system, Property 13: Provider Routing Correctness
    await fc.assert(
      fc.asyncProperty(
        modelArb.filter(m => m.provider === 'gemini'),
        messagesArb,
        async (model, messages) => {
          // Spy on private methods to verify routing
          const callGroqSpy = jest.spyOn(llmProviderService, '_callGroq');
          const callGeminiSpy = jest.spyOn(llmProviderService, '_callGemini');

          // Act: Call generateCompletion with Gemini model
          await llmProviderService.generateCompletion(
            model.name,
            model.provider,
            messages
          );

          // Assert: Gemini method called, Groq method NOT called
          expect(callGeminiSpy).toHaveBeenCalledTimes(1);
          expect(callGeminiSpy).toHaveBeenCalledWith(model.name, messages);
          expect(callGroqSpy).not.toHaveBeenCalled();

          // Cleanup
          callGroqSpy.mockRestore();
          callGeminiSpy.mockRestore();
        }
      ),
      { numRuns: 100 }
    );
  });

  test('Property 13: Provider Routing Correctness - No cross-contamination', async () => {
    // Feature: llm-usage-limit-system, Property 13: Provider Routing Correctness
    await fc.assert(
      fc.asyncProperty(
        modelArb,
        messagesArb,
        async (model, messages) => {
          // Spy on private methods to verify routing
          const callGroqSpy = jest.spyOn(llmProviderService, '_callGroq');
          const callGeminiSpy = jest.spyOn(llmProviderService, '_callGemini');

          // Act: Call generateCompletion
          await llmProviderService.generateCompletion(
            model.name,
            model.provider,
            messages
          );

          // Assert: Exactly one provider method is called based on model.provider
          if (model.provider === 'groq') {
            expect(callGroqSpy).toHaveBeenCalledTimes(1);
            expect(callGeminiSpy).not.toHaveBeenCalled();
          } else if (model.provider === 'gemini') {
            expect(callGeminiSpy).toHaveBeenCalledTimes(1);
            expect(callGroqSpy).not.toHaveBeenCalled();
          }

          // Verify correct model name is passed to the provider
          if (model.provider === 'groq') {
            expect(callGroqSpy).toHaveBeenCalledWith(model.name, messages);
          } else if (model.provider === 'gemini') {
            expect(callGeminiSpy).toHaveBeenCalledWith(model.name, messages);
          }

          // Cleanup
          callGroqSpy.mockRestore();
          callGeminiSpy.mockRestore();
        }
      ),
      { numRuns: 100 }
    );
  });

  test('Property 13: Provider Routing Correctness - Unified response format regardless of provider', async () => {
    // Feature: llm-usage-limit-system, Property 13: Provider Routing Correctness
    await fc.assert(
      fc.asyncProperty(
        modelArb,
        messagesArb,
        async (model, messages) => {
          // Act: Call generateCompletion
          const result = await llmProviderService.generateCompletion(
            model.name,
            model.provider,
            messages
          );

          // Assert: Response has unified format regardless of provider
          expect(result).toHaveProperty('text');
          expect(result).toHaveProperty('tokensInput');
          expect(result).toHaveProperty('tokensOutput');
          
          expect(typeof result.text).toBe('string');
          expect(typeof result.tokensInput).toBe('number');
          expect(typeof result.tokensOutput).toBe('number');
          
          expect(result.tokensInput).toBeGreaterThanOrEqual(0);
          expect(result.tokensOutput).toBeGreaterThanOrEqual(0);
          
          // Verify response structure is identical regardless of provider
          const expectedKeys = ['text', 'tokensInput', 'tokensOutput'];
          expect(Object.keys(result).sort()).toEqual(expectedKeys.sort());
        }
      ),
      { numRuns: 100 }
    );
  });

  test('Property 13: Provider Routing Correctness - Provider field determines routing, not model name', async () => {
    // Feature: llm-usage-limit-system, Property 13: Provider Routing Correctness
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 5, maxLength: 50 }),
        fc.constantFrom('groq', 'gemini'),
        messagesArb,
        async (arbitraryModelName, provider, messages) => {
          // Spy on private methods
          const callGroqSpy = jest.spyOn(llmProviderService, '_callGroq');
          const callGeminiSpy = jest.spyOn(llmProviderService, '_callGemini');

          // Act: Call with arbitrary model name but specific provider
          await llmProviderService.generateCompletion(
            arbitraryModelName,
            provider,
            messages
          );

          // Assert: Routing is determined by provider field, not model name
          if (provider === 'groq') {
            expect(callGroqSpy).toHaveBeenCalledTimes(1);
            expect(callGroqSpy).toHaveBeenCalledWith(arbitraryModelName, messages);
            expect(callGeminiSpy).not.toHaveBeenCalled();
          } else if (provider === 'gemini') {
            expect(callGeminiSpy).toHaveBeenCalledTimes(1);
            expect(callGeminiSpy).toHaveBeenCalledWith(arbitraryModelName, messages);
            expect(callGroqSpy).not.toHaveBeenCalled();
          }

          // Cleanup
          callGroqSpy.mockRestore();
          callGeminiSpy.mockRestore();
        }
      ),
      { numRuns: 100 }
    );
  });

  test('Property 13: Provider Routing Correctness - Invalid provider throws error without calling any SDK', async () => {
    // Feature: llm-usage-limit-system, Property 13: Provider Routing Correctness
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 5, maxLength: 50 }),
        fc.string({ minLength: 1, maxLength: 20 }).filter(
          s => s !== 'groq' && s !== 'gemini'
        ),
        messagesArb,
        async (modelName, invalidProvider, messages) => {
          // Spy on private methods
          const callGroqSpy = jest.spyOn(llmProviderService, '_callGroq');
          const callGeminiSpy = jest.spyOn(llmProviderService, '_callGemini');

          // Act & Assert: Invalid provider should throw error
          await expect(
            llmProviderService.generateCompletion(
              modelName,
              invalidProvider,
              messages
            )
          ).rejects.toThrow(`Unsupported provider: ${invalidProvider}`);

          // Assert: No SDK methods should be called
          expect(callGroqSpy).not.toHaveBeenCalled();
          expect(callGeminiSpy).not.toHaveBeenCalled();

          // Cleanup
          callGroqSpy.mockRestore();
          callGeminiSpy.mockRestore();
        }
      ),
      { numRuns: 100 }
    );
  });
});
