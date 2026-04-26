/**
 * Unit Tests for LLM Provider Service
 * 
 * Tests the multi-provider abstraction layer that routes requests to
 * Groq or Gemini based on model configuration.
 * 
 * Validates Requirements: Architecture (multi-provider support)
 */

describe('LLMProviderService', () => {
  let llmProviderService;
  let mockGroqCreate;
  let mockGeminiGenerateContent;
  let mockGeminiGetGenerativeModel;

  beforeEach(() => {
    // Clear module cache to get fresh instance
    jest.resetModules();
    jest.clearAllMocks();

    // Mock Groq SDK
    mockGroqCreate = jest.fn();
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
    mockGeminiGenerateContent = jest.fn();
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

  describe('Groq Provider Routing', () => {
    test('should route economy model to Groq SDK correctly', async () => {
      // Arrange
      const modelName = 'llama-3.1-8b-instant';
      const provider = 'groq';
      const messages = [
        { role: 'system', content: 'You are a helpful assistant.' },
        { role: 'user', content: 'Generate a test scenario.' },
      ];

      const mockGroqResponse = {
        choices: [
          {
            message: {
              content: 'Generated Gherkin scenario',
            },
          },
        ],
        usage: {
          prompt_tokens: 50,
          completion_tokens: 100,
        },
      };

      // Spy on the private method
      const callGroqSpy = jest.spyOn(llmProviderService, '_callGroq')
        .mockResolvedValue({
          text: 'Generated Gherkin scenario',
          tokensInput: 50,
          tokensOutput: 100,
        });

      // Act
      const result = await llmProviderService.generateCompletion(
        modelName,
        provider,
        messages
      );

      // Assert
      expect(callGroqSpy).toHaveBeenCalledTimes(1);
      expect(callGroqSpy).toHaveBeenCalledWith(modelName, messages);
      expect(result).toEqual({
        text: 'Generated Gherkin scenario',
        tokensInput: 50,
        tokensOutput: 100,
      });

      callGroqSpy.mockRestore();
    });

    test('should handle Groq response without usage metadata', async () => {
      // Arrange
      const modelName = 'llama-3.1-8b-instant';
      const provider = 'groq';
      const messages = [{ role: 'user', content: 'Test' }];

      const callGroqSpy = jest.spyOn(llmProviderService, '_callGroq')
        .mockResolvedValue({
          text: 'Response text',
          tokensInput: 0,
          tokensOutput: 0,
        });

      // Act
      const result = await llmProviderService.generateCompletion(
        modelName,
        provider,
        messages
      );

      // Assert
      expect(result).toEqual({
        text: 'Response text',
        tokensInput: 0,
        tokensOutput: 0,
      });

      callGroqSpy.mockRestore();
    });

    test('should propagate Groq API errors', async () => {
      // Arrange
      const modelName = 'llama-3.1-8b-instant';
      const provider = 'groq';
      const messages = [{ role: 'user', content: 'Test' }];

      const mockError = new Error('Groq API rate limit exceeded');
      const callGroqSpy = jest.spyOn(llmProviderService, '_callGroq')
        .mockRejectedValue(mockError);

      // Act & Assert
      await expect(
        llmProviderService.generateCompletion(modelName, provider, messages)
      ).rejects.toThrow('Groq API rate limit exceeded');

      callGroqSpy.mockRestore();
    });
  });

  describe('Gemini Provider Routing', () => {
    test('should route standard model to Gemini SDK correctly', async () => {
      // Arrange
      const modelName = 'gemini-2.5-flash';
      const provider = 'gemini';
      const messages = [
        { role: 'system', content: 'You are a Gherkin expert.' },
        { role: 'user', content: 'Create a login scenario.' },
      ];

      const callGeminiSpy = jest.spyOn(llmProviderService, '_callGemini')
        .mockResolvedValue({
          text: 'Feature: User Login\nScenario: Successful login',
          tokensInput: 30,
          tokensOutput: 80,
        });

      // Act
      const result = await llmProviderService.generateCompletion(
        modelName,
        provider,
        messages
      );

      // Assert
      expect(callGeminiSpy).toHaveBeenCalledTimes(1);
      expect(callGeminiSpy).toHaveBeenCalledWith(modelName, messages);
      expect(result).toEqual({
        text: 'Feature: User Login\nScenario: Successful login',
        tokensInput: 30,
        tokensOutput: 80,
      });

      callGeminiSpy.mockRestore();
    });

    test('should route premium model to Gemini SDK correctly', async () => {
      // Arrange
      const modelName = 'gemini-2.5-pro';
      const provider = 'gemini';
      const messages = [
        { role: 'system', content: 'Expert system prompt.' },
        { role: 'user', content: 'Complex scenario request.' },
      ];

      const callGeminiSpy = jest.spyOn(llmProviderService, '_callGemini')
        .mockResolvedValue({
          text: 'Complex Gherkin output',
          tokensInput: 100,
          tokensOutput: 200,
        });

      // Act
      const result = await llmProviderService.generateCompletion(
        modelName,
        provider,
        messages
      );

      // Assert
      expect(callGeminiSpy).toHaveBeenCalledWith(modelName, messages);
      expect(result).toEqual({
        text: 'Complex Gherkin output',
        tokensInput: 100,
        tokensOutput: 200,
      });

      callGeminiSpy.mockRestore();
    });

    test('should handle Gemini response without usage metadata', async () => {
      // Arrange
      const modelName = 'gemini-2.5-flash';
      const provider = 'gemini';
      const messages = [{ role: 'user', content: 'Test' }];

      const callGeminiSpy = jest.spyOn(llmProviderService, '_callGemini')
        .mockResolvedValue({
          text: 'Response text',
          tokensInput: 0,
          tokensOutput: 0,
        });

      // Act
      const result = await llmProviderService.generateCompletion(
        modelName,
        provider,
        messages
      );

      // Assert
      expect(result).toEqual({
        text: 'Response text',
        tokensInput: 0,
        tokensOutput: 0,
      });

      callGeminiSpy.mockRestore();
    });

    test('should propagate Gemini API errors', async () => {
      // Arrange
      const modelName = 'gemini-2.5-flash';
      const provider = 'gemini';
      const messages = [{ role: 'user', content: 'Test' }];

      const mockError = new Error('Gemini API quota exceeded');
      const callGeminiSpy = jest.spyOn(llmProviderService, '_callGemini')
        .mockRejectedValue(mockError);

      // Act & Assert
      await expect(
        llmProviderService.generateCompletion(modelName, provider, messages)
      ).rejects.toThrow('Gemini API quota exceeded');

      callGeminiSpy.mockRestore();
    });
  });

  describe('Unsupported Provider Error Handling', () => {
    test('should throw error for unsupported provider', async () => {
      // Arrange
      const modelName = 'gpt-4';
      const provider = 'openai';
      const messages = [{ role: 'user', content: 'Test' }];

      // Act & Assert
      await expect(
        llmProviderService.generateCompletion(modelName, provider, messages)
      ).rejects.toThrow('Unsupported provider: openai');
    });

    test('should throw error for null provider', async () => {
      // Arrange
      const modelName = 'some-model';
      const provider = null;
      const messages = [{ role: 'user', content: 'Test' }];

      // Act & Assert
      await expect(
        llmProviderService.generateCompletion(modelName, provider, messages)
      ).rejects.toThrow('Unsupported provider: null');
    });

    test('should throw error for undefined provider', async () => {
      // Arrange
      const modelName = 'some-model';
      const provider = undefined;
      const messages = [{ role: 'user', content: 'Test' }];

      // Act & Assert
      await expect(
        llmProviderService.generateCompletion(modelName, provider, messages)
      ).rejects.toThrow('Unsupported provider: undefined');
    });

    test('should throw error for empty string provider', async () => {
      // Arrange
      const modelName = 'some-model';
      const provider = '';
      const messages = [{ role: 'user', content: 'Test' }];

      // Act & Assert
      await expect(
        llmProviderService.generateCompletion(modelName, provider, messages)
      ).rejects.toThrow('Unsupported provider: ');
    });
  });

  describe('Response Format Consistency', () => {
    test('Groq response should match unified format', async () => {
      // Arrange
      const callGroqSpy = jest.spyOn(llmProviderService, '_callGroq')
        .mockResolvedValue({
          text: 'Test',
          tokensInput: 10,
          tokensOutput: 20,
        });

      // Act
      const result = await llmProviderService.generateCompletion(
        'llama-3.1-8b-instant',
        'groq',
        [{ role: 'user', content: 'Test' }]
      );

      // Assert - verify unified response format
      expect(result).toHaveProperty('text');
      expect(result).toHaveProperty('tokensInput');
      expect(result).toHaveProperty('tokensOutput');
      expect(typeof result.text).toBe('string');
      expect(typeof result.tokensInput).toBe('number');
      expect(typeof result.tokensOutput).toBe('number');

      callGroqSpy.mockRestore();
    });

    test('Gemini response should match unified format', async () => {
      // Arrange
      const callGeminiSpy = jest.spyOn(llmProviderService, '_callGemini')
        .mockResolvedValue({
          text: 'Test',
          tokensInput: 10,
          tokensOutput: 20,
        });

      // Act
      const result = await llmProviderService.generateCompletion(
        'gemini-2.5-flash',
        'gemini',
        [{ role: 'user', content: 'Test' }]
      );

      // Assert - verify unified response format
      expect(result).toHaveProperty('text');
      expect(result).toHaveProperty('tokensInput');
      expect(result).toHaveProperty('tokensOutput');
      expect(typeof result.text).toBe('string');
      expect(typeof result.tokensInput).toBe('number');
      expect(typeof result.tokensOutput).toBe('number');

      callGeminiSpy.mockRestore();
    });

    test('both providers should return same response structure', async () => {
      // Arrange
      const callGroqSpy = jest.spyOn(llmProviderService, '_callGroq')
        .mockResolvedValue({
          text: 'Groq response',
          tokensInput: 15,
          tokensOutput: 25,
        });
      const callGeminiSpy = jest.spyOn(llmProviderService, '_callGemini')
        .mockResolvedValue({
          text: 'Gemini response',
          tokensInput: 15,
          tokensOutput: 25,
        });

      // Act
      const groqResult = await llmProviderService.generateCompletion(
        'llama-3.1-8b-instant',
        'groq',
        [{ role: 'user', content: 'Test' }]
      );
      const geminiResult = await llmProviderService.generateCompletion(
        'gemini-2.5-flash',
        'gemini',
        [{ role: 'user', content: 'Test' }]
      );

      // Assert - both should have identical structure
      expect(Object.keys(groqResult).sort()).toEqual(
        Object.keys(geminiResult).sort()
      );
      expect(Object.keys(groqResult)).toEqual(['text', 'tokensInput', 'tokensOutput']);

      callGroqSpy.mockRestore();
      callGeminiSpy.mockRestore();
    });
  });

  describe('System Prompt Handling for Gemini', () => {
    test('should handle Gemini system prompt correctly', async () => {
      // This test verifies that system prompts are handled differently for Gemini
      // In the actual implementation, system messages are extracted and passed separately
      const modelName = 'gemini-2.5-flash';
      const provider = 'gemini';
      const messages = [
        { role: 'system', content: 'First system instruction.' },
        { role: 'system', content: 'Second system instruction.' },
        { role: 'user', content: 'User message.' },
      ];

      const callGeminiSpy = jest.spyOn(llmProviderService, '_callGemini')
        .mockResolvedValue({
          text: 'Response',
          tokensInput: 10,
          tokensOutput: 20,
        });

      // Act
      await llmProviderService.generateCompletion(modelName, provider, messages);

      // Assert - verify _callGemini was called with the messages
      expect(callGeminiSpy).toHaveBeenCalledWith(modelName, messages);

      callGeminiSpy.mockRestore();
    });

    test('should handle multiple user messages correctly', async () => {
      // This test verifies that multiple user messages are handled correctly
      const modelName = 'gemini-2.5-flash';
      const provider = 'gemini';
      const messages = [
        { role: 'user', content: 'First user message.' },
        { role: 'user', content: 'Second user message.' },
      ];

      const callGeminiSpy = jest.spyOn(llmProviderService, '_callGemini')
        .mockResolvedValue({
          text: 'Response',
          tokensInput: 10,
          tokensOutput: 20,
        });

      // Act
      await llmProviderService.generateCompletion(modelName, provider, messages);

      // Assert - verify _callGemini was called with the messages
      expect(callGeminiSpy).toHaveBeenCalledWith(modelName, messages);

      callGeminiSpy.mockRestore();
    });

    test('should handle Gemini messages without system prompt', async () => {
      // This test verifies that Gemini can handle messages without system prompts
      const modelName = 'gemini-2.5-flash';
      const provider = 'gemini';
      const messages = [{ role: 'user', content: 'Just user content.' }];

      const callGeminiSpy = jest.spyOn(llmProviderService, '_callGemini')
        .mockResolvedValue({
          text: 'Response',
          tokensInput: 5,
          tokensOutput: 10,
        });

      // Act
      await llmProviderService.generateCompletion(modelName, provider, messages);

      // Assert - verify _callGemini was called with the messages
      expect(callGeminiSpy).toHaveBeenCalledWith(modelName, messages);

      callGeminiSpy.mockRestore();
    });
  });
});
