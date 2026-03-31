/**
 * Unit Tests for Gherkin Controller
 * Tests specific functions and error scenarios
 * 
 * Requirements: 7.1, 7.2, 7.3, 7.5
 */

import { jest } from '@jest/globals';

describe('Gherkin Controller - Unit Tests', () => {
  let generateGherkin;
  let convertToGherkin;
  let MeteorService;
  let PerformanceService;

  beforeEach(async () => {
    // Mock dependencies
    jest.unstable_mockModule('../services/aiService.js', () => ({
      convertToGherkin: jest.fn()
    }));

    jest.unstable_mockModule('../services/meteorService.js', () => ({
      default: jest.fn().mockImplementation(() => ({
        extractScenarioText: jest.fn(),
        generateReferenceText: jest.fn(),
        evaluateScenario: jest.fn(),
        getQualityAssessment: jest.fn(),
        meetsQualityThreshold: jest.fn()
      }))
    }));

    jest.unstable_mockModule('../services/performanceService.js', () => ({
      default: jest.fn().mockImplementation(() => ({
        startTimer: jest.fn(),
        endTimer: jest.fn(),
        recordError: jest.fn(),
        logPerformanceMetrics: jest.fn(),
        logMeteorMetrics: jest.fn()
      }))
    }));

    jest.unstable_mockModule('../services/supabaseService.js', () => ({
      default: {
        createScenario: jest.fn(),
        updateScenario: jest.fn(),
        logEvaluationMetrics: jest.fn()
      }
    }));

    jest.unstable_mockModule('../services/jiraService.js', () => ({
      default: {
        createUserStory: jest.fn(),
        createSubtasks: jest.fn()
      }
    }));

    jest.unstable_mockModule('../services/epicService.js', () => ({
      default: {
        getEpicContext: jest.fn()
      }
    }));

    // Import after mocking
    const controller = await import('../../controllers/gherkinController.js');
    generateGherkin = controller.generateGherkin;

    const aiService = await import('../services/aiService.js');
    convertToGherkin = aiService.convertToGherkin;

    const meteorModule = await import('../services/meteorService.js');
    MeteorService = meteorModule.default;

    const performanceModule = await import('../services/performanceService.js');
    PerformanceService = performanceModule.default;
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.resetModules();
  });

  describe('Input validation', () => {
    it('should validate user story is present', async () => {
      const req = {
        body: {},
        user: null
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };
      const next = jest.fn();

      await generateGherkin(req, res, next);

      expect(next).toHaveBeenCalled();
      const error = next.mock.calls[0][0];
      expect(error.message).toContain('User story is required');
      expect(error.statusCode).toBe(400);
    });

    it('should validate user story is a string', async () => {
      const req = {
        body: { userStory: 123 },
        user: null
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };
      const next = jest.fn();

      await generateGherkin(req, res, next);

      expect(next).toHaveBeenCalled();
      const error = next.mock.calls[0][0];
      expect(error.message).toContain('must be a string');
    });

    it('should validate user story minimum length', async () => {
      const req = {
        body: { userStory: 'short' },
        user: null
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };
      const next = jest.fn();

      await generateGherkin(req, res, next);

      expect(next).toHaveBeenCalled();
      const error = next.mock.calls[0][0];
      expect(error.message).toContain('at least 10 characters');
    });

    it('should trim whitespace from user story', async () => {
      const req = {
        body: { userStory: '  As a user, I want to login  ' },
        user: null
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };
      const next = jest.fn();

      convertToGherkin.mockResolvedValue({
        type: 'gherkin',
        content: '{"feature": "Login"}',
        formatDetection: { isConnextra: true }
      });

      await generateGherkin(req, res, next);

      expect(convertToGherkin).toHaveBeenCalledWith('As a user, I want to login');
    });
  });

  describe('Response type handling', () => {
    it('should handle general (non-Connextra) responses', async () => {
      const req = {
        body: { userStory: 'Tell me about testing' },
        user: null
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };
      const next = jest.fn();

      convertToGherkin.mockResolvedValue({
        type: 'general',
        content: 'Testing is important...',
        formatDetection: { isConnextra: false }
      });

      await generateGherkin(req, res, next);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            type: 'general',
            content: 'Testing is important...',
            isConnextra: false
          })
        })
      );
    });

    it('should handle Connextra format responses', async () => {
      const req = {
        body: { userStory: 'As a user, I want to login' },
        user: null
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };
      const next = jest.fn();

      convertToGherkin.mockResolvedValue({
        type: 'gherkin',
        content: '{"feature": "Login", "scenarios": []}',
        formatDetection: { isConnextra: true }
      });

      await generateGherkin(req, res, next);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            type: 'gherkin',
            gherkin: expect.any(String),
            isConnextra: true
          })
        })
      );
    });
  });

  describe('Error handling', () => {
    it('should handle AI service errors gracefully', async () => {
      const req = {
        body: { userStory: 'As a user, I want to test error handling' },
        user: null
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };
      const next = jest.fn();

      const aiError = new Error('AI service unavailable');
      convertToGherkin.mockRejectedValue(aiError);

      await generateGherkin(req, res, next);

      expect(next).toHaveBeenCalledWith(aiError);
    });

    it('should continue without METEOR evaluation if it fails', async () => {
      const req = {
        body: { 
          userStory: 'As a user, I want to test METEOR failure',
          evaluateQuality: true
        },
        user: { id: 'user-123' }
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };
      const next = jest.fn();

      convertToGherkin.mockResolvedValue({
        type: 'gherkin',
        content: '{"feature": "Test", "scenarios": []}',
        formatDetection: { isConnextra: true }
      });

      // Mock METEOR service to throw error
      const meteorInstance = new MeteorService();
      meteorInstance.extractScenarioText.mockImplementation(() => {
        throw new Error('METEOR evaluation failed');
      });

      await generateGherkin(req, res, next);

      // Should still return success without METEOR metrics
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            quality_metrics: null
          })
        })
      );
    });

    it('should provide descriptive error messages', async () => {
      const req = {
        body: { userStory: 'As a user, I want to test' },
        user: null
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };
      const next = jest.fn();

      const detailedError = new Error('Network timeout after 30 seconds');
      detailedError.code = 'ETIMEDOUT';
      convertToGherkin.mockRejectedValue(detailedError);

      await generateGherkin(req, res, next);

      expect(next).toHaveBeenCalled();
      const error = next.mock.calls[0][0];
      expect(error.message).toBeDefined();
    });
  });

  describe('Performance monitoring', () => {
    it('should track generation time', async () => {
      const req = {
        body: { userStory: 'As a user, I want to test performance' },
        user: null
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };
      const next = jest.fn();

      convertToGherkin.mockResolvedValue({
        type: 'gherkin',
        content: '{"feature": "Test"}',
        formatDetection: { isConnextra: true }
      });

      const performanceInstance = new PerformanceService();
      performanceInstance.endTimer.mockReturnValue({
        durationMs: 150,
        requestId: 'test-request-id'
      });

      await generateGherkin(req, res, next);

      expect(performanceInstance.startTimer).toHaveBeenCalled();
      expect(performanceInstance.endTimer).toHaveBeenCalled();
    });

    it('should include performance metrics in response', async () => {
      const req = {
        body: { userStory: 'As a user, I want to check metrics' },
        user: null
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };
      const next = jest.fn();

      convertToGherkin.mockResolvedValue({
        type: 'gherkin',
        content: '{"feature": "Metrics"}',
        formatDetection: { isConnextra: true }
      });

      const performanceInstance = new PerformanceService();
      performanceInstance.endTimer.mockReturnValue({
        durationMs: 200,
        requestId: 'metrics-request-id'
      });

      await generateGherkin(req, res, next);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            performance_metrics: expect.objectContaining({
              generation_time_ms: 200,
              request_id: 'metrics-request-id'
            })
          })
        })
      );
    });
  });
});
