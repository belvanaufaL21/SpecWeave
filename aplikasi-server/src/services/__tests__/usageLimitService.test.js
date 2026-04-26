/**
 * Unit Tests for Usage Limit Service
 * 
 * Tests the per-user, per-model request limit enforcement system.
 * Validates limit checking, counter increments, usage queries, and alternative model filtering.
 * 
 * Validates Requirements: 1.1, 1.2, 3.1, 3.4, 4.1, 4.2, 4.3
 */

describe('UsageLimitService', () => {
  let usageLimitService;
  let mockSupabaseClient;
  let mockSupabaseService;

  beforeEach(() => {
    // Clear module cache to get fresh instance
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
    mockSupabaseService = {
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

  describe('checkLimit Method', () => {
    describe('Basic Limit Checking', () => {
      test('should allow request when usage is below limit', async () => {
        // Arrange
        const userId = 'user-123';
        const modelName = 'llama-3.1-8b-instant';

        mockSupabaseClient.single.mockResolvedValue({
          data: {
            id: 'model-id-1',
            name: 'llama-3.1-8b-instant',
            display_name: 'Llama 3.1 8B',
            provider: 'groq',
            model_tiers: {
              name: 'economy',
              request_limit: 50,
            },
            usage_counters: [
              {
                request_count: 10,
              },
            ],
          },
          error: null,
        });

        // Act
        const result = await usageLimitService.checkLimit(userId, modelName);

        // Assert
        expect(result.allowed).toBe(true);
        expect(result.remaining).toBe(40);
        expect(result.used).toBe(10);
        expect(result.limit).toBe(50);
        expect(result.modelName).toBe('llama-3.1-8b-instant');
        expect(result.displayName).toBe('Llama 3.1 8B');
        expect(result.provider).toBe('groq');
        expect(result.tier).toBe('economy');
      });

      test('should deny request when usage equals limit', async () => {
        // Arrange
        const userId = 'user-456';
        const modelName = 'gemini-2.5-pro';

        mockSupabaseClient.single.mockResolvedValue({
          data: {
            id: 'model-id-3',
            name: 'gemini-2.5-pro',
            display_name: 'Gemini 2.5 Pro',
            provider: 'gemini',
            model_tiers: {
              name: 'premium',
              request_limit: 1,
            },
            usage_counters: [
              {
                request_count: 1,
              },
            ],
          },
          error: null,
        });

        // Mock getAlternativeModels
        const getAlternativeModelsSpy = jest.spyOn(usageLimitService, 'getAlternativeModels')
          .mockResolvedValue([
            {
              model: 'llama-3.1-8b-instant',
              displayName: 'Llama 3.1 8B',
              provider: 'groq',
              tier: 'economy',
              remaining: 50,
            },
          ]);

        // Act
        const result = await usageLimitService.checkLimit(userId, modelName);

        // Assert
        expect(result.allowed).toBe(false);
        expect(result.remaining).toBe(0);
        expect(result.used).toBe(1);
        expect(result.limit).toBe(1);
        expect(result.alternatives).toBeDefined();
        expect(result.alternatives.length).toBe(1);
        expect(getAlternativeModelsSpy).toHaveBeenCalledWith(userId, modelName);

        getAlternativeModelsSpy.mockRestore();
      });

      test('should deny request when usage exceeds limit', async () => {
        // Arrange
        const userId = 'user-789';
        const modelName = 'gemini-2.5-flash';

        mockSupabaseClient.single.mockResolvedValue({
          data: {
            id: 'model-id-2',
            name: 'gemini-2.5-flash',
            display_name: 'Gemini 2.5 Flash',
            provider: 'gemini',
            model_tiers: {
              name: 'standard',
              request_limit: 10,
            },
            usage_counters: [
              {
                request_count: 15,
              },
            ],
          },
          error: null,
        });

        // Mock getAlternativeModels
        const getAlternativeModelsSpy = jest.spyOn(usageLimitService, 'getAlternativeModels')
          .mockResolvedValue([]);

        // Act
        const result = await usageLimitService.checkLimit(userId, modelName);

        // Assert
        expect(result.allowed).toBe(false);
        expect(result.remaining).toBe(0);
        expect(result.used).toBe(15);
        expect(result.limit).toBe(10);

        getAlternativeModelsSpy.mockRestore();
      });
    });

    describe('Edge Cases', () => {
      test('should handle first-time user with no usage_counters row', async () => {
        // Arrange
        const userId = 'new-user-001';
        const modelName = 'llama-3.1-8b-instant';

        mockSupabaseClient.single.mockResolvedValue({
          data: {
            id: 'model-id-1',
            name: 'llama-3.1-8b-instant',
            display_name: 'Llama 3.1 8B',
            provider: 'groq',
            model_tiers: {
              name: 'economy',
              request_limit: 50,
            },
            usage_counters: [], // No usage counter yet
          },
          error: null,
        });

        // Act
        const result = await usageLimitService.checkLimit(userId, modelName);

        // Assert
        expect(result.allowed).toBe(true);
        expect(result.used).toBe(0);
        expect(result.remaining).toBe(50);
        expect(result.limit).toBe(50);
      });

      test('should handle counter at exactly limit (50/50)', async () => {
        // Arrange
        const userId = 'user-at-limit';
        const modelName = 'llama-3.1-8b-instant';

        mockSupabaseClient.single.mockResolvedValue({
          data: {
            id: 'model-id-1',
            name: 'llama-3.1-8b-instant',
            display_name: 'Llama 3.1 8B',
            provider: 'groq',
            model_tiers: {
              name: 'economy',
              request_limit: 50,
            },
            usage_counters: [
              {
                request_count: 50,
              },
            ],
          },
          error: null,
        });

        const getAlternativeModelsSpy = jest.spyOn(usageLimitService, 'getAlternativeModels')
          .mockResolvedValue([]);

        // Act
        const result = await usageLimitService.checkLimit(userId, modelName);

        // Assert
        expect(result.allowed).toBe(false);
        expect(result.used).toBe(50);
        expect(result.remaining).toBe(0);
        expect(result.limit).toBe(50);

        getAlternativeModelsSpy.mockRestore();
      });

      test('should handle counter at exactly limit (10/10)', async () => {
        // Arrange
        const userId = 'user-standard-limit';
        const modelName = 'gemini-2.5-flash';

        mockSupabaseClient.single.mockResolvedValue({
          data: {
            id: 'model-id-2',
            name: 'gemini-2.5-flash',
            display_name: 'Gemini 2.5 Flash',
            provider: 'gemini',
            model_tiers: {
              name: 'standard',
              request_limit: 10,
            },
            usage_counters: [
              {
                request_count: 10,
              },
            ],
          },
          error: null,
        });

        const getAlternativeModelsSpy = jest.spyOn(usageLimitService, 'getAlternativeModels')
          .mockResolvedValue([]);

        // Act
        const result = await usageLimitService.checkLimit(userId, modelName);

        // Assert
        expect(result.allowed).toBe(false);
        expect(result.used).toBe(10);
        expect(result.remaining).toBe(0);
        expect(result.limit).toBe(10);

        getAlternativeModelsSpy.mockRestore();
      });

      test('should handle counter at exactly limit (1/1)', async () => {
        // Arrange
        const userId = 'user-premium-limit';
        const modelName = 'gemini-2.5-pro';

        mockSupabaseClient.single.mockResolvedValue({
          data: {
            id: 'model-id-3',
            name: 'gemini-2.5-pro',
            display_name: 'Gemini 2.5 Pro',
            provider: 'gemini',
            model_tiers: {
              name: 'premium',
              request_limit: 1,
            },
            usage_counters: [
              {
                request_count: 1,
              },
            ],
          },
          error: null,
        });

        const getAlternativeModelsSpy = jest.spyOn(usageLimitService, 'getAlternativeModels')
          .mockResolvedValue([]);

        // Act
        const result = await usageLimitService.checkLimit(userId, modelName);

        // Assert
        expect(result.allowed).toBe(false);
        expect(result.used).toBe(1);
        expect(result.remaining).toBe(0);
        expect(result.limit).toBe(1);

        getAlternativeModelsSpy.mockRestore();
      });
    });

    describe('Error Handling', () => {
      test('should throw error when model not found', async () => {
        // Arrange
        const userId = 'user-123';
        const modelName = 'non-existent-model';

        mockSupabaseClient.single.mockResolvedValue({
          data: null,
          error: { code: 'PGRST116', message: 'No rows found' },
        });

        // Act & Assert
        await expect(
          usageLimitService.checkLimit(userId, modelName)
        ).rejects.toThrow('Model not found: non-existent-model');
      });

      test('should throw error on database failure', async () => {
        // Arrange
        const userId = 'user-123';
        const modelName = 'llama-3.1-8b-instant';

        mockSupabaseClient.single.mockResolvedValue({
          data: null,
          error: { code: 'DB_ERROR', message: 'Database connection failed' },
        });

        // Act & Assert
        await expect(
          usageLimitService.checkLimit(userId, modelName)
        ).rejects.toThrow('Failed to check usage limit');
      });
    });
  });

  describe('incrementUsage Method', () => {
    describe('Counter Increment Logic', () => {
      test('should increment existing counter', async () => {
        // Arrange
        const userId = 'user-123';
        const modelName = 'llama-3.1-8b-instant';
        const requestId = 'req-001';

        // Mock model query
        mockSupabaseClient.single
          .mockResolvedValueOnce({
            data: {
              id: 'model-id-1',
              model_tiers: {
                request_limit: 50,
              },
            },
            error: null,
          })
          .mockResolvedValueOnce({
            data: {
              request_count: 10,
            },
            error: null,
          })
          .mockResolvedValueOnce({
            data: {
              request_count: 11,
            },
            error: null,
          });

        // Act
        const result = await usageLimitService.incrementUsage(userId, modelName, requestId);

        // Assert
        expect(result.newCount).toBe(11);
        expect(result.remaining).toBe(39);
      });

      test('should create counter for first-time user', async () => {
        // Arrange
        const userId = 'new-user-001';
        const modelName = 'llama-3.1-8b-instant';
        const requestId = 'req-002';

        // Mock model query
        mockSupabaseClient.single
          .mockResolvedValueOnce({
            data: {
              id: 'model-id-1',
              model_tiers: {
                request_limit: 50,
              },
            },
            error: null,
          })
          .mockResolvedValueOnce({
            data: null,
            error: { code: 'PGRST116', message: 'No rows found' },
          })
          .mockResolvedValueOnce({
            data: {
              request_count: 1,
            },
            error: null,
          });

        // Act
        const result = await usageLimitService.incrementUsage(userId, modelName, requestId);

        // Assert
        expect(result.newCount).toBe(1);
        expect(result.remaining).toBe(49);
      });

      test('should handle increment to exactly limit', async () => {
        // Arrange
        const userId = 'user-456';
        const modelName = 'gemini-2.5-pro';
        const requestId = 'req-003';

        // Mock model query
        mockSupabaseClient.single
          .mockResolvedValueOnce({
            data: {
              id: 'model-id-3',
              model_tiers: {
                request_limit: 1,
              },
            },
            error: null,
          })
          .mockResolvedValueOnce({
            data: {
              request_count: 0,
            },
            error: null,
          })
          .mockResolvedValueOnce({
            data: {
              request_count: 1,
            },
            error: null,
          });

        // Act
        const result = await usageLimitService.incrementUsage(userId, modelName, requestId);

        // Assert
        expect(result.newCount).toBe(1);
        expect(result.remaining).toBe(0);
      });
    });

    describe('Error Handling', () => {
      test('should throw error when model not found', async () => {
        // Arrange
        const userId = 'user-123';
        const modelName = 'non-existent-model';
        const requestId = 'req-004';

        mockSupabaseClient.single.mockResolvedValue({
          data: null,
          error: { code: 'DB_ERROR', message: 'Model not found' },
        });

        // Act & Assert
        await expect(
          usageLimitService.incrementUsage(userId, modelName, requestId)
        ).rejects.toThrow('Failed to increment usage');
      });

      test('should throw error on update failure', async () => {
        // Arrange
        const userId = 'user-123';
        const modelName = 'llama-3.1-8b-instant';
        const requestId = 'req-005';

        mockSupabaseClient.single
          .mockResolvedValueOnce({
            data: {
              id: 'model-id-1',
              model_tiers: {
                request_limit: 50,
              },
            },
            error: null,
          })
          .mockResolvedValueOnce({
            data: {
              request_count: 10,
            },
            error: null,
          })
          .mockResolvedValueOnce({
            data: null,
            error: { code: 'UPDATE_ERROR', message: 'Update failed' },
          });

        // Act & Assert
        await expect(
          usageLimitService.incrementUsage(userId, modelName, requestId)
        ).rejects.toThrow('Failed to increment usage');
      });
    });
  });

  describe('getUserUsage Method', () => {
    test('should return usage for all models', async () => {
      // Arrange
      const userId = 'user-123';

      mockSupabaseClient.order.mockResolvedValue({
        data: [
          {
            id: 'model-id-1',
            name: 'llama-3.1-8b-instant',
            display_name: 'Llama 3.1 8B',
            provider: 'groq',
            model_tiers: {
              name: 'economy',
              request_limit: 50,
            },
            usage_counters: [
              {
                request_count: 10,
              },
            ],
          },
          {
            id: 'model-id-2',
            name: 'gemini-2.5-flash',
            display_name: 'Gemini 2.5 Flash',
            provider: 'gemini',
            model_tiers: {
              name: 'standard',
              request_limit: 10,
            },
            usage_counters: [
              {
                request_count: 5,
              },
            ],
          },
          {
            id: 'model-id-3',
            name: 'gemini-2.5-pro',
            display_name: 'Gemini 2.5 Pro',
            provider: 'gemini',
            model_tiers: {
              name: 'premium',
              request_limit: 1,
            },
            usage_counters: [],
          },
        ],
        error: null,
      });

      // Act
      const result = await usageLimitService.getUserUsage(userId);

      // Assert
      expect(result).toHaveLength(3);
      expect(result[0]).toEqual({
        id: 'model-id-1',
        name: 'llama-3.1-8b-instant',
        displayName: 'Llama 3.1 8B',
        provider: 'groq',
        tier: 'economy',
        limit: 50,
        used: 10,
        remaining: 40,
      });
      expect(result[1]).toEqual({
        id: 'model-id-2',
        name: 'gemini-2.5-flash',
        displayName: 'Gemini 2.5 Flash',
        provider: 'gemini',
        tier: 'standard',
        limit: 10,
        used: 5,
        remaining: 5,
      });
      expect(result[2]).toEqual({
        id: 'model-id-3',
        name: 'gemini-2.5-pro',
        displayName: 'Gemini 2.5 Pro',
        provider: 'gemini',
        tier: 'premium',
        limit: 1,
        used: 0,
        remaining: 1,
      });
    });

    test('should handle database error', async () => {
      // Arrange
      const userId = 'user-123';

      mockSupabaseClient.order.mockResolvedValue({
        data: null,
        error: { code: 'DB_ERROR', message: 'Database error' },
      });

      // Act & Assert
      await expect(
        usageLimitService.getUserUsage(userId)
      ).rejects.toThrow('Failed to get user usage');
    });
  });

  describe('getAlternativeModels Method', () => {
    test('should exclude current model and only include models with remaining > 0', async () => {
      // Arrange
      const userId = 'user-123';
      const excludeModelName = 'gemini-2.5-pro';

      // Mock getUserUsage
      const getUserUsageSpy = jest.spyOn(usageLimitService, 'getUserUsage')
        .mockResolvedValue([
          {
            id: 'model-id-1',
            name: 'llama-3.1-8b-instant',
            displayName: 'Llama 3.1 8B',
            provider: 'groq',
            tier: 'economy',
            limit: 50,
            used: 10,
            remaining: 40,
          },
          {
            id: 'model-id-2',
            name: 'gemini-2.5-flash',
            displayName: 'Gemini 2.5 Flash',
            provider: 'gemini',
            tier: 'standard',
            limit: 10,
            used: 10,
            remaining: 0,
          },
          {
            id: 'model-id-3',
            name: 'gemini-2.5-pro',
            displayName: 'Gemini 2.5 Pro',
            provider: 'gemini',
            tier: 'premium',
            limit: 1,
            used: 1,
            remaining: 0,
          },
        ]);

      // Act
      const result = await usageLimitService.getAlternativeModels(userId, excludeModelName);

      // Assert
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        model: 'llama-3.1-8b-instant',
        displayName: 'Llama 3.1 8B',
        provider: 'groq',
        tier: 'economy',
        remaining: 40,
      });
      expect(getUserUsageSpy).toHaveBeenCalledWith(userId);

      getUserUsageSpy.mockRestore();
    });

    test('should return empty array when all models are at limit', async () => {
      // Arrange
      const userId = 'user-456';
      const excludeModelName = 'llama-3.1-8b-instant';

      const getUserUsageSpy = jest.spyOn(usageLimitService, 'getUserUsage')
        .mockResolvedValue([
          {
            id: 'model-id-1',
            name: 'llama-3.1-8b-instant',
            displayName: 'Llama 3.1 8B',
            provider: 'groq',
            tier: 'economy',
            limit: 50,
            used: 50,
            remaining: 0,
          },
          {
            id: 'model-id-2',
            name: 'gemini-2.5-flash',
            displayName: 'Gemini 2.5 Flash',
            provider: 'gemini',
            tier: 'standard',
            limit: 10,
            used: 10,
            remaining: 0,
          },
        ]);

      // Act
      const result = await usageLimitService.getAlternativeModels(userId, excludeModelName);

      // Assert
      expect(result).toHaveLength(0);

      getUserUsageSpy.mockRestore();
    });

    test('should handle error from getUserUsage', async () => {
      // Arrange
      const userId = 'user-123';
      const excludeModelName = 'llama-3.1-8b-instant';

      const getUserUsageSpy = jest.spyOn(usageLimitService, 'getUserUsage')
        .mockRejectedValue(new Error('Database error'));

      // Act & Assert
      await expect(
        usageLimitService.getAlternativeModels(userId, excludeModelName)
      ).rejects.toThrow('Failed to get alternative models');

      getUserUsageSpy.mockRestore();
    });
  });

  describe('recordRequest Method', () => {
    test('should record successful request', async () => {
      // Arrange
      const userId = 'user-123';
      const modelName = 'llama-3.1-8b-instant';
      const requestId = 'req-001';
      const success = true;

      mockSupabaseClient.single.mockResolvedValue({
        data: {
          id: 'model-id-1',
        },
        error: null,
      });

      mockSupabaseClient.insert.mockResolvedValue({
        data: null,
        error: null,
      });

      // Act
      await usageLimitService.recordRequest(userId, modelName, requestId, success);

      // Assert
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('models');
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('usage_history');
    });

    test('should record failed request with error message', async () => {
      // Arrange
      const userId = 'user-456';
      const modelName = 'gemini-2.5-pro';
      const requestId = 'req-002';
      const success = false;
      const errorMessage = 'API rate limit exceeded';

      mockSupabaseClient.single.mockResolvedValue({
        data: {
          id: 'model-id-3',
        },
        error: null,
      });

      mockSupabaseClient.insert.mockResolvedValue({
        data: null,
        error: null,
      });

      // Act
      await usageLimitService.recordRequest(userId, modelName, requestId, success, errorMessage);

      // Assert
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('models');
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('usage_history');
    });

    test('should not throw error when model not found (non-critical)', async () => {
      // Arrange
      const userId = 'user-123';
      const modelName = 'non-existent-model';
      const requestId = 'req-003';
      const success = true;

      mockSupabaseClient.single.mockResolvedValue({
        data: null,
        error: { code: 'NOT_FOUND', message: 'Model not found' },
      });

      // Act & Assert - should not throw
      await expect(
        usageLimitService.recordRequest(userId, modelName, requestId, success)
      ).resolves.not.toThrow();
    });

    test('should not throw error when history insert fails (non-critical)', async () => {
      // Arrange
      const userId = 'user-123';
      const modelName = 'llama-3.1-8b-instant';
      const requestId = 'req-004';
      const success = true;

      mockSupabaseClient.single.mockResolvedValue({
        data: {
          id: 'model-id-1',
        },
        error: null,
      });

      mockSupabaseClient.insert.mockResolvedValue({
        data: null,
        error: { code: 'INSERT_ERROR', message: 'Insert failed' },
      });

      // Act & Assert - should not throw
      await expect(
        usageLimitService.recordRequest(userId, modelName, requestId, success)
      ).resolves.not.toThrow();
    });
  });
});
