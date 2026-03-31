/**
 * Tests for EnhancedSpecWeaveService - Client-side Gherkin generation
 * Tests the client sending requirements to server
 * 
 * Requirements: 7.1, 7.5
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { generateGherkin, generateGherkinBasic } from '../EnhancedSpecWeaveService.js';
import api from '../api.js';

// Mock dependencies
vi.mock('../api.js');
vi.mock('../config/cleanLogging.js', () => ({
  default: {
    generationStart: vi.fn(),
    generationSuccess: vi.fn(),
    generationFailed: vi.fn(),
    error: vi.fn()
  }
}));

vi.mock('../utils/errors/ErrorRecovery.js', () => ({
  default: {
    handleUnexpectedError: vi.fn((error, context) => ({
      userMessage: `Error: ${error.message}`,
      canRetry: true
    }))
  }
}));

vi.mock('./reference/AutoReferenceService.js', () => ({
  autoReferenceService: {
    generateScenarioFromUserStory: vi.fn(),
    analyzeReferencePatterns: vi.fn(),
    clearCache: vi.fn()
  }
}));

describe('EnhancedSpecWeaveService - Gherkin Generation Flow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('8.1 Client sends requirements to server', () => {
    it('should send user story to server API', async () => {
      // Requirement 7.1: Client sends requirements to server
      const userStory = 'As a user, I want to login';
      
      api.post.mockResolvedValue({
        data: {
          success: true,
          data: {
            type: 'gherkin',
            gherkin: '{"feature": "Login"}',
            isConnextra: true
          }
        }
      });

      await generateGherkin(userStory);

      expect(api.post).toHaveBeenCalledWith(
        '/gherkin/generate',
        expect.objectContaining({
          userStory: expect.any(String)
        })
      );
    });

    it('should include options in API request', async () => {
      const userStory = 'As a user, I want to register';
      const options = {
        evaluateQuality: true,
        includeBackground: true
      };

      api.post.mockResolvedValue({
        data: {
          success: true,
          data: {
            type: 'gherkin',
            gherkin: '{"feature": "Register"}',
            isConnextra: true
          }
        }
      });

      await generateGherkin(userStory, options);

      expect(api.post).toHaveBeenCalledWith(
        '/gherkin/generate',
        expect.objectContaining({
          options: expect.objectContaining({
            evaluateQuality: true,
            includeBackground: true
          })
        })
      );
    });

    it('should handle successful Gherkin response', async () => {
      const userStory = 'As a user, I want to view my profile';

      api.post.mockResolvedValue({
        data: {
          success: true,
          data: {
            type: 'gherkin',
            gherkin: '{"feature": "Profile", "scenarios": []}',
            isConnextra: true,
            formatDetection: { isConnextra: true }
          }
        }
      });

      const result = await generateGherkin(userStory);

      expect(result.success).toBe(true);
      expect(result.data.type).toBe('gherkin');
      expect(result.data.gherkin).toBeDefined();
      expect(result.data.isConnextra).toBe(true);
    });

    it('should handle general (non-Connextra) response', async () => {
      const userStory = 'Tell me about testing';

      api.post.mockResolvedValue({
        data: {
          success: true,
          data: {
            type: 'general',
            content: 'Testing is important for quality...',
            isConnextra: false
          }
        }
      });

      const result = await generateGherkin(userStory);

      expect(result.success).toBe(true);
      expect(result.data.type).toBe('general');
      expect(result.data.content).toBeDefined();
      expect(result.data.isConnextra).toBe(false);
    });

    it('should include reference information in response', async () => {
      const userStory = 'As a user, I want to search products';

      api.post.mockResolvedValue({
        data: {
          success: true,
          data: {
            type: 'gherkin',
            gherkin: '{"feature": "Search"}',
            isConnextra: true
          }
        }
      });

      const result = await generateGherkin(userStory);

      expect(result.success).toBe(true);
      expect(result.data).toHaveProperty('referenceInfo');
    });

    it('should handle quality metrics in response', async () => {
      const userStory = 'As a user, I want to checkout';

      api.post.mockResolvedValue({
        data: {
          success: true,
          data: {
            type: 'gherkin',
            gherkin: '{"feature": "Checkout"}',
            isConnextra: true,
            quality_metrics: {
              meteor_score: 0.85,
              quality_level: 'good'
            }
          }
        }
      });

      const result = await generateGherkin(userStory, { evaluateQuality: true });

      expect(result.success).toBe(true);
      expect(result.data.quality_metrics).toBeDefined();
      expect(result.data.quality_metrics.meteor_score).toBe(0.85);
    });

    it('should handle performance metrics in response', async () => {
      const userStory = 'As a user, I want to update settings';

      api.post.mockResolvedValue({
        data: {
          success: true,
          data: {
            type: 'gherkin',
            gherkin: '{"feature": "Settings"}',
            isConnextra: true,
            performance_metrics: {
              generation_time_ms: 150,
              request_id: 'test-123'
            }
          }
        }
      });

      const result = await generateGherkin(userStory);

      expect(result.success).toBe(true);
      expect(result.data.performance_metrics).toBeDefined();
      expect(result.data.performance_metrics.generation_time_ms).toBe(150);
    });
  });

  describe('8.2 Client handles generation errors', () => {
    it('should handle network errors', async () => {
      // Requirement 7.5: Error message when generation fails
      const userStory = 'As a user, I want to test error';

      const networkError = new Error('Network Error');
      networkError.code = 'ECONNREFUSED';
      api.post.mockRejectedValue(networkError);

      const result = await generateGherkin(userStory);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(typeof result.error).toBe('string');
    });

    it('should handle server validation errors', async () => {
      const userStory = 'short';

      api.post.mockRejectedValue({
        response: {
          data: {
            error: 'User story must be at least 10 characters'
          }
        }
      });

      const result = await generateGherkin(userStory);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(typeof result.error).toBe('string');
    });

    it('should handle server errors with descriptive messages', async () => {
      const userStory = 'As a user, I want to test server error';

      api.post.mockRejectedValue({
        response: {
          data: {
            error: 'AI service temporarily unavailable'
          }
        }
      });

      const result = await generateGherkin(userStory);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should handle timeout errors', async () => {
      const userStory = 'As a user, I want to test timeout';

      const timeoutError = new Error('Request timeout');
      timeoutError.code = 'ETIMEDOUT';
      api.post.mockRejectedValue(timeoutError);

      const result = await generateGherkin(userStory);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should handle unexpected errors gracefully', async () => {
      const userStory = 'As a user, I want to test unexpected error';

      api.post.mockRejectedValue(new Error('Unexpected error occurred'));

      const result = await generateGherkin(userStory);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.fallbackAvailable).toBe(true);
    });

    it('should provide user-friendly error messages', async () => {
      const userStory = 'As a user, I want to test friendly errors';

      api.post.mockRejectedValue({
        response: {
          status: 500,
          data: {
            error: 'Internal server error'
          }
        }
      });

      const result = await generateGherkin(userStory);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(typeof result.error).toBe('string');
      expect(result.error.length).toBeGreaterThan(0);
    });
  });

  describe('Basic generation mode', () => {
    it('should support basic generation without auto-reference', async () => {
      const userStory = 'As a user, I want to test basic mode';

      api.post.mockResolvedValue({
        data: {
          success: true,
          data: {
            type: 'gherkin',
            gherkin: '{"feature": "Basic"}',
            isConnextra: true
          }
        }
      });

      const result = await generateGherkinBasic(userStory);

      expect(result.success).toBe(true);
      expect(api.post).toHaveBeenCalledWith(
        '/gherkin/generate',
        expect.objectContaining({
          options: expect.objectContaining({
            skipAutoReference: true
          })
        })
      );
    });
  });

  describe('Complete flow validation', () => {
    it('should complete full client-to-server flow', async () => {
      const userStory = 'As a user, I want to complete the flow';

      api.post.mockResolvedValue({
        data: {
          success: true,
          data: {
            type: 'gherkin',
            id: 12345,
            gherkin: '{"feature": "Complete Flow", "scenarios": []}',
            isConnextra: true,
            formatDetection: { isConnextra: true },
            performance_metrics: {
              generation_time_ms: 200,
              request_id: 'flow-test-123'
            }
          }
        }
      });

      const result = await generateGherkin(userStory);

      // Verify complete flow
      expect(api.post).toHaveBeenCalled(); // Client sends
      expect(result.success).toBe(true); // Server responds
      expect(result.data.gherkin).toBeDefined(); // Scenarios returned
      expect(result.data.performance_metrics).toBeDefined(); // Metrics included
    });
  });
});
