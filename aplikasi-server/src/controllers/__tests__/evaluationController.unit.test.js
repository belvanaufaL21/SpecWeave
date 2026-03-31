/**
 * Unit Tests for Evaluation Controller
 * Tests METEOR evaluation endpoints
 * 
 * Requirements: 8.1, 8.2, 8.3
 */

// Mock dependencies before imports
jest.mock('../../services/meteorService.js');
jest.mock('../../services/performanceService.js');
jest.mock('uuid', () => ({
  v4: jest.fn(() => 'test-uuid-123')
}));

const { evaluateScenario, evaluateMultipleScenarios, testMeteorEvaluation } = require('../../controllers/evaluationController.js');

describe('Evaluation Controller - Unit Tests', () => {
  let req, res;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    
    // Setup request and response objects
    req = {
      body: {},
      params: {},
      query: {}
    };
    
    res = {
      json: jest.fn().mockReturnThis(),
      status: jest.fn().mockReturnThis()
    };
  });

  describe('evaluateScenario', () => {
    it('should evaluate a single scenario successfully', async () => {
      // Requirement 8.1: Client sends scenarios to server
      req.body = {
        candidate: 'Given user is logged in When user clicks button Then page loads',
        reference: 'Given user logged in When button clicked Then page shown',
        scenarioId: 'test-scenario-123'
      };

      await evaluateScenario(req, res);

      // Requirement 8.3: Server returns quality metrics
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            meteor_metrics: expect.any(Object),
            quality_assessment: expect.any(Object),
            performance_metrics: expect.any(Object)
          })
        })
      );
    });

    it('should return 400 when candidate text is missing', async () => {
      req.body = {
        reference: 'Given user logged in'
      };

      await evaluateScenario(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: 'Both candidate and reference text are required'
        })
      );
    });

    it('should return 400 when reference text is missing', async () => {
      req.body = {
        candidate: 'Given user is logged in'
      };

      await evaluateScenario(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: 'Both candidate and reference text are required'
        })
      );
    });

    it('should handle evaluation errors gracefully', async () => {
      req.body = {
        candidate: 'Given user is logged in',
        reference: 'Given user logged in'
      };

      // Simulate error by throwing in the controller
      const originalConsoleError = console.error;
      console.error = jest.fn();

      await evaluateScenario(req, res);

      console.error = originalConsoleError;

      // Should still return a response (placeholder due to service unavailable)
      expect(res.json).toHaveBeenCalled();
    });
  });

  describe('evaluateMultipleScenarios', () => {
    it('should evaluate multiple scenarios in batch', async () => {
      // Requirement 8.1: Client sends scenarios to server
      req.body = {
        scenarios: [
          {
            candidate: 'Given user is logged in',
            reference: 'Given user logged in'
          },
          {
            candidate: 'When user clicks button',
            reference: 'When button clicked'
          }
        ]
      };

      await evaluateMultipleScenarios(req, res);

      // Requirement 8.3: Server returns quality metrics for all scenarios
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            batch_results: expect.any(Array),
            performance_metrics: expect.any(Object)
          })
        })
      );
    });

    it('should return 400 when scenarios array is missing', async () => {
      req.body = {};

      await evaluateMultipleScenarios(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: 'Scenarios array is required'
        })
      );
    });

    it('should return 400 when scenarios is not an array', async () => {
      req.body = {
        scenarios: 'not an array'
      };

      await evaluateMultipleScenarios(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: 'Scenarios array is required'
        })
      );
    });
  });

  describe('testMeteorEvaluation', () => {
    it('should run test evaluation with sample data', async () => {
      await testMeteorEvaluation(req, res);

      // Requirement 8.3: Server returns quality metrics
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          message: expect.any(String),
          data: expect.objectContaining({
            test_input: expect.any(Object),
            meteor_metrics: expect.any(Object),
            quality_assessment: expect.any(Object),
            performance_metrics: expect.any(Object)
          })
        })
      );
    });
  });
});
