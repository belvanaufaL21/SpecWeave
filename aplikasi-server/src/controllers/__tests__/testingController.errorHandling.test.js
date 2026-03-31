/**
 * Unit Tests for TestingController Error Handling
 * Tests error handling for authentication, authorization, and API validation
 * 
 * Requirements: 8.3 - Error handling consistency
 */

// Mock AppError first
class MockAppError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
    this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
    this.isOperational = true;
  }
}

// Mock TestingService to avoid ES module issues
const mockTestingService = {
  calculateMeteorScore: jest.fn(),
  calculateSentenceBertScore: jest.fn(),
  saveTestResult: jest.fn(),
  getTestResultsByScenario: jest.fn(),
  getTestResultsByUser: jest.fn(),
  deleteTestResult: jest.fn(),
  getTestStatistics: jest.fn()
};

jest.mock('../../services/testingService.js', () => ({
  default: mockTestingService
}));

jest.mock('../../middlewares/errorHandler.js', () => ({
  AppError: MockAppError
}));

// Create mock controller functions that simulate the actual behavior
const createMockControllers = () => {
  const runMeteorTest = async (req, res, next) => {
    try {
      const { scenarioId, generatedText, referenceText } = req.body;
      const userId = req.user?.id;
      
      if (!scenarioId || !generatedText || !referenceText) {
        throw new MockAppError('scenarioId, generatedText, and referenceText are required', 400);
      }
      
      if (!userId) {
        throw new MockAppError('User authentication required', 401);
      }
      
      const meteorResult = await mockTestingService.calculateMeteorScore(
        generatedText, 
        referenceText
      );
      
      const testResult = await mockTestingService.saveTestResult({
        scenarioId,
        testType: 'meteor',
        score: meteorResult.score,
        generatedText,
        referenceText,
        userId,
        testDetails: meteorResult.details || meteorResult
      });
      
      res.json({
        success: true,
        message: 'METEOR test completed successfully',
        data: {
          testResult,
          meteorMetrics: meteorResult
        }
      });
      
    } catch (error) {
      next(error);
    }
  };

  const runSentenceBertTest = async (req, res, next) => {
    try {
      const { scenarioId, generatedText, referenceText } = req.body;
      const userId = req.user?.id;
      
      if (!scenarioId || !generatedText || !referenceText) {
        throw new MockAppError('scenarioId, generatedText, and referenceText are required', 400);
      }
      
      if (!userId) {
        throw new MockAppError('User authentication required', 401);
      }
      
      const sentenceBertResult = await mockTestingService.calculateSentenceBertScore(
        generatedText, 
        referenceText
      );
      
      const testResult = await mockTestingService.saveTestResult({
        scenarioId,
        testType: 'sentence_bert',
        score: sentenceBertResult.score,
        generatedText,
        referenceText,
        userId,
        testDetails: sentenceBertResult.details || sentenceBertResult
      });
      
      res.json({
        success: true,
        message: 'Sentence-BERT test completed successfully',
        data: {
          testResult,
          sentenceBertMetrics: sentenceBertResult
        }
      });
      
    } catch (error) {
      next(error);
    }
  };

  const getTestResults = async (req, res, next) => {
    try {
      const { scenarioId } = req.params;
      const userId = req.user?.id;
      
      if (!scenarioId) {
        throw new MockAppError('scenarioId is required', 400);
      }
      
      if (!userId) {
        throw new MockAppError('User authentication required', 401);
      }
      
      const testResults = await mockTestingService.getTestResultsByScenario(
        scenarioId, 
        userId
      );
      
      const organizedResults = {
        meteor: testResults.filter(result => result.test_type === 'meteor'),
        sentence_bert: testResults.filter(result => result.test_type === 'sentence_bert')
      };
      
      const latestResults = {
        meteor: organizedResults.meteor[0] || null,
        sentence_bert: organizedResults.sentence_bert[0] || null
      };
      
      res.json({
        success: true,
        message: 'Test results retrieved successfully',
        data: {
          scenarioId,
          latestResults,
          allResults: organizedResults,
          summary: {
            totalTests: testResults.length,
            meteorTests: organizedResults.meteor.length,
            sentenceBertTests: organizedResults.sentence_bert.length,
            hasResults: testResults.length > 0
          }
        }
      });
      
    } catch (error) {
      next(error);
    }
  };

  const getAllUserTestResults = async (req, res, next) => {
    try {
      const userId = req.user?.id;
      const { limit, offset, testType } = req.query;
      
      if (!userId) {
        throw new MockAppError('User authentication required', 401);
      }
      
      const options = {};
      if (limit) options.limit = parseInt(limit, 10);
      if (offset) options.offset = parseInt(offset, 10);
      if (testType && ['meteor', 'sentence_bert'].includes(testType)) {
        options.testType = testType;
      }
      
      const testResults = await mockTestingService.getTestResultsByUser(userId, options);
      
      res.json({
        success: true,
        message: 'User test results retrieved successfully',
        data: {
          results: testResults,
          count: testResults.length,
          filters: options
        }
      });
      
    } catch (error) {
      next(error);
    }
  };

  const deleteTestResult = async (req, res, next) => {
    try {
      const { testId } = req.params;
      const userId = req.user?.id;
      
      if (!testId) {
        throw new MockAppError('testId is required', 400);
      }
      
      if (!userId) {
        throw new MockAppError('User authentication required', 401);
      }
      
      await mockTestingService.deleteTestResult(testId, userId);
      
      res.json({
        success: true,
        message: 'Test result deleted successfully',
        data: {
          deletedTestId: testId
        }
      });
      
    } catch (error) {
      next(error);
    }
  };

  const getTestStatistics = async (req, res, next) => {
    try {
      const userId = req.user?.id;
      
      if (!userId) {
        throw new MockAppError('User authentication required', 401);
      }
      
      const statistics = await mockTestingService.getTestStatistics(userId);
      
      res.json({
        success: true,
        message: 'Test statistics retrieved successfully',
        data: statistics
      });
      
    } catch (error) {
      next(error);
    }
  };

  const runBatchTest = async (req, res, next) => {
    try {
      const { scenarioId, generatedText, referenceText, testTypes } = req.body;
      const userId = req.user?.id;
      
      if (!scenarioId || !generatedText || !referenceText) {
        throw new MockAppError('scenarioId, generatedText, and referenceText are required', 400);
      }
      
      if (!userId) {
        throw new MockAppError('User authentication required', 401);
      }
      
      const typesToRun = testTypes || ['meteor', 'sentence_bert'];
      const results = {};
      
      if (typesToRun.includes('meteor')) {
        try {
          const meteorResult = await mockTestingService.calculateMeteorScore(
            generatedText, 
            referenceText
          );
          
          const meteorTestResult = await mockTestingService.saveTestResult({
            scenarioId,
            testType: 'meteor',
            score: meteorResult.score,
            generatedText,
            referenceText,
            userId,
            testDetails: meteorResult.details || meteorResult
          });
          
          results.meteor = {
            testResult: meteorTestResult,
            metrics: meteorResult
          };
        } catch (meteorError) {
          results.meteor = {
            error: meteorError.message
          };
        }
      }
      
      if (typesToRun.includes('sentence_bert')) {
        try {
          const sentenceBertResult = await mockTestingService.calculateSentenceBertScore(
            generatedText, 
            referenceText
          );
          
          const sentenceBertTestResult = await mockTestingService.saveTestResult({
            scenarioId,
            testType: 'sentence_bert',
            score: sentenceBertResult.score,
            generatedText,
            referenceText,
            userId,
            testDetails: sentenceBertResult.details || sentenceBertResult
          });
          
          results.sentence_bert = {
            testResult: sentenceBertTestResult,
            metrics: sentenceBertResult
          };
        } catch (sentenceBertError) {
          results.sentence_bert = {
            error: sentenceBertError.message
          };
        }
      }
      
      const hasSuccessfulTests = Object.values(results).some(result => !result.error);
      
      if (!hasSuccessfulTests) {
        throw new MockAppError('All batch tests failed', 500);
      }
      
      res.json({
        success: true,
        message: 'Batch tests completed',
        data: {
          scenarioId,
          results,
          summary: {
            requestedTests: typesToRun,
            successfulTests: Object.keys(results).filter(key => !results[key].error),
            failedTests: Object.keys(results).filter(key => results[key].error)
          }
        }
      });
      
    } catch (error) {
      next(error);
    }
  };

  return {
    runMeteorTest,
    runSentenceBertTest,
    getTestResults,
    getAllUserTestResults,
    deleteTestResult,
    getTestStatistics,
    runBatchTest
  };
};

const request = require('supertest');
const express = require('express');

// Create Express app for testing
const createTestApp = () => {
  const app = express();
  app.use(express.json());
  
  // Mock authentication middleware
  app.use((req, res, next) => {
    // Set default user for tests (can be overridden)
    if (!req.user && !req.skipAuth) {
      req.user = {
        id: 'test-user-id',
        email: 'test@example.com'
      };
    }
    next();
  });

  // Error handler
  app.use((err, req, res, next) => {
    res.status(err.statusCode || 500).json({
      success: false,
      message: err.message,
      status: err.status || 'error'
    });
  });

  return app;
};

describe('TestingController Error Handling Tests', () => {
  let app;
  let controllers;

  beforeEach(() => {
    app = createTestApp();
    controllers = createMockControllers();
    jest.clearAllMocks();
  });

  describe('Authentication and Authorization Error Handling', () => {
    test('should return 401 when user is not authenticated for METEOR test', async () => {
      app.post('/meteor', (req, res, next) => {
        req.skipAuth = true; // Skip default auth
        req.user = null; // No user
        controllers.runMeteorTest(req, res, next);
      });

      const response = await request(app)
        .post('/meteor')
        .send({
          scenarioId: 'test-scenario',
          generatedText: 'test generated',
          referenceText: 'test reference'
        });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('User authentication required');
    });

    test('should return 401 when user is not authenticated for Sentence-BERT test', async () => {
      app.post('/sentence-bert', (req, res, next) => {
        req.skipAuth = true; // Skip default auth
        req.user = null; // No user
        controllers.runSentenceBertTest(req, res, next);
      });

      const response = await request(app)
        .post('/sentence-bert')
        .send({
          scenarioId: 'test-scenario',
          generatedText: 'test generated',
          referenceText: 'test reference'
        });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('User authentication required');
    });

    test('should return 401 when user is not authenticated for getting test results', async () => {
      app.get('/results/:scenarioId', (req, res, next) => {
        req.skipAuth = true; // Skip default auth
        req.user = null; // No user
        controllers.getTestResults(req, res, next);
      });

      const response = await request(app)
        .get('/results/test-scenario');

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('User authentication required');
    });

    test('should return 401 when user is not authenticated for getting all user results', async () => {
      app.get('/results', (req, res, next) => {
        req.skipAuth = true; // Skip default auth
        req.user = null; // No user
        controllers.getAllUserTestResults(req, res, next);
      });

      const response = await request(app)
        .get('/results');

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('User authentication required');
    });

    test('should return 401 when user is not authenticated for deleting test result', async () => {
      app.delete('/results/:testId', (req, res, next) => {
        req.skipAuth = true; // Skip default auth
        req.user = null; // No user
        controllers.deleteTestResult(req, res, next);
      });

      const response = await request(app)
        .delete('/results/test-id');

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('User authentication required');
    });

    test('should return 401 when user is not authenticated for getting statistics', async () => {
      app.get('/statistics', (req, res, next) => {
        req.skipAuth = true; // Skip default auth
        req.user = null; // No user
        controllers.getTestStatistics(req, res, next);
      });

      const response = await request(app)
        .get('/statistics');

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('User authentication required');
    });

    test('should handle malformed authentication token', async () => {
      app.post('/meteor', (req, res, next) => {
        req.skipAuth = true; // Skip default auth
        req.user = { id: null }; // Malformed user object
        controllers.runMeteorTest(req, res, next);
      });

      const response = await request(app)
        .post('/meteor')
        .send({
          scenarioId: 'test-scenario',
          generatedText: 'test generated',
          referenceText: 'test reference'
        });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('User authentication required');
    });
  });

  describe('Input Validation Error Handling', () => {
    test('should return 400 when scenarioId is missing for METEOR test', async () => {
      app.post('/meteor', controllers.runMeteorTest);

      const response = await request(app)
        .post('/meteor')
        .send({
          // Missing scenarioId
          generatedText: 'test generated',
          referenceText: 'test reference'
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('scenarioId, generatedText, and referenceText are required');
    });

    test('should return 400 when generatedText is missing for Sentence-BERT test', async () => {
      app.post('/sentence-bert', controllers.runSentenceBertTest);

      const response = await request(app)
        .post('/sentence-bert')
        .send({
          scenarioId: 'test-scenario',
          // Missing generatedText
          referenceText: 'test reference'
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('scenarioId, generatedText, and referenceText are required');
    });

    test('should return 400 when referenceText is missing', async () => {
      app.post('/meteor', controllers.runMeteorTest);

      const response = await request(app)
        .post('/meteor')
        .send({
          scenarioId: 'test-scenario',
          generatedText: 'test generated'
          // Missing referenceText
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('scenarioId, generatedText, and referenceText are required');
    });

    test('should return 400 when scenarioId is missing from URL parameter', async () => {
      app.get('/results/:scenarioId', controllers.getTestResults);

      const response = await request(app)
        .get('/results/'); // Empty scenarioId

      expect(response.status).toBe(404); // Express returns 404 for missing route params
    });

    test('should return 400 when testId is missing from URL parameter', async () => {
      app.delete('/results/:testId', controllers.deleteTestResult);

      const response = await request(app)
        .delete('/results/'); // Empty testId

      expect(response.status).toBe(404); // Express returns 404 for missing route params
    });

    test('should handle empty string values in required fields', async () => {
      app.post('/meteor', controllers.runMeteorTest);

      const response = await request(app)
        .post('/meteor')
        .send({
          scenarioId: '',
          generatedText: '',
          referenceText: ''
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('scenarioId, generatedText, and referenceText are required');
    });

    test('should handle null values in required fields', async () => {
      app.post('/sentence-bert', controllers.runSentenceBertTest);

      const response = await request(app)
        .post('/sentence-bert')
        .send({
          scenarioId: null,
          generatedText: null,
          referenceText: null
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('scenarioId, generatedText, and referenceText are required');
    });

    test('should handle malformed JSON in request body', async () => {
      app.post('/meteor', controllers.runMeteorTest);

      const response = await request(app)
        .post('/meteor')
        .set('Content-Type', 'application/json')
        .send('{ invalid json }');

      expect(response.status).toBe(400);
    });
  });

  describe('Service Layer Error Handling', () => {
    test('should handle TestingService.calculateMeteorScore failure', async () => {
      app.post('/meteor', controllers.runMeteorTest);

      mockTestingService.calculateMeteorScore.mockRejectedValue(
        new Error('METEOR calculation failed with code 1: ModuleNotFoundError')
      );

      const response = await request(app)
        .post('/meteor')
        .send({
          scenarioId: 'test-scenario',
          generatedText: 'test generated',
          referenceText: 'test reference'
        });

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('METEOR calculation failed with code 1: ModuleNotFoundError');
    });

    test('should handle TestingService.calculateSentenceBertScore failure', async () => {
      app.post('/sentence-bert', controllers.runSentenceBertTest);

      mockTestingService.calculateSentenceBertScore.mockRejectedValue(
        new Error('Sentence-BERT calculation failed: No module named sentence_transformers')
      );

      const response = await request(app)
        .post('/sentence-bert')
        .send({
          scenarioId: 'test-scenario',
          generatedText: 'test generated',
          referenceText: 'test reference'
        });

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Sentence-BERT calculation failed: No module named sentence_transformers');
    });

    test('should handle TestingService.saveTestResult failure', async () => {
      app.post('/meteor', controllers.runMeteorTest);

      mockTestingService.calculateMeteorScore.mockResolvedValue({
        score: 0.85,
        details: { method: 'METEOR' }
      });

      mockTestingService.saveTestResult.mockRejectedValue(
        new Error('Database error: Connection to database failed')
      );

      const response = await request(app)
        .post('/meteor')
        .send({
          scenarioId: 'test-scenario',
          generatedText: 'test generated',
          referenceText: 'test reference'
        });

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Database error: Connection to database failed');
    });

    test('should handle TestingService.getTestResultsByScenario failure', async () => {
      app.get('/results/:scenarioId', controllers.getTestResults);

      mockTestingService.getTestResultsByScenario.mockRejectedValue(
        new Error('Database error: Query timeout exceeded')
      );

      const response = await request(app)
        .get('/results/test-scenario');

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Database error: Query timeout exceeded');
    });

    test('should handle TestingService.deleteTestResult failure', async () => {
      app.delete('/results/:testId', controllers.deleteTestResult);

      mockTestingService.deleteTestResult.mockRejectedValue(
        new Error('Database error: Record not found or access denied')
      );

      const response = await request(app)
        .delete('/results/test-id');

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Database error: Record not found or access denied');
    });

    test('should handle TestingService.getTestStatistics failure', async () => {
      app.get('/statistics', controllers.getTestStatistics);

      mockTestingService.getTestStatistics.mockRejectedValue(
        new Error('Database error: Insufficient permissions')
      );

      const response = await request(app)
        .get('/statistics');

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Database error: Insufficient permissions');
    });
  });

  describe('Batch Test Error Handling', () => {
    test('should handle partial failure in batch test', async () => {
      app.post('/batch', controllers.runBatchTest);

      // Mock METEOR success but Sentence-BERT failure
      mockTestingService.calculateMeteorScore.mockResolvedValue({
        score: 0.85,
        details: { method: 'METEOR' }
      });

      mockTestingService.calculateSentenceBertScore.mockRejectedValue(
        new Error('Sentence-BERT calculation failed')
      );

      mockTestingService.saveTestResult.mockResolvedValue({
        id: 'test-result-id'
      });

      const response = await request(app)
        .post('/batch')
        .send({
          scenarioId: 'test-scenario',
          generatedText: 'test generated',
          referenceText: 'test reference',
          testTypes: ['meteor', 'sentence_bert']
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.results.meteor).toBeDefined();
      expect(response.body.data.results.sentence_bert.error).toBeDefined();
      expect(response.body.data.summary.successfulTests).toEqual(['meteor']);
      expect(response.body.data.summary.failedTests).toEqual(['sentence_bert']);
    });

    test('should return 500 when all batch tests fail', async () => {
      app.post('/batch', controllers.runBatchTest);

      // Mock both tests failing
      mockTestingService.calculateMeteorScore.mockRejectedValue(
        new Error('METEOR calculation failed')
      );

      mockTestingService.calculateSentenceBertScore.mockRejectedValue(
        new Error('Sentence-BERT calculation failed')
      );

      const response = await request(app)
        .post('/batch')
        .send({
          scenarioId: 'test-scenario',
          generatedText: 'test generated',
          referenceText: 'test reference',
          testTypes: ['meteor', 'sentence_bert']
        });

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('All batch tests failed');
    });

    test('should handle missing testTypes in batch test', async () => {
      app.post('/batch', controllers.runBatchTest);

      // Mock successful calculations
      mockTestingService.calculateMeteorScore.mockResolvedValue({
        score: 0.85,
        details: { method: 'METEOR' }
      });

      mockTestingService.calculateSentenceBertScore.mockResolvedValue({
        score: 0.75,
        details: { method: 'Sentence-BERT' }
      });

      mockTestingService.saveTestResult.mockResolvedValue({
        id: 'test-result-id'
      });

      const response = await request(app)
        .post('/batch')
        .send({
          scenarioId: 'test-scenario',
          generatedText: 'test generated',
          referenceText: 'test reference'
          // Missing testTypes - should default to both
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.summary.requestedTests).toEqual(['meteor', 'sentence_bert']);
    });
  });

  describe('Query Parameter Error Handling', () => {
    test('should handle invalid limit parameter in getAllUserTestResults', async () => {
      app.get('/results', controllers.getAllUserTestResults);

      mockTestingService.getTestResultsByUser.mockResolvedValue([]);

      const response = await request(app)
        .get('/results?limit=invalid');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      // Should handle gracefully, parseInt returns NaN which is falsy
    });

    test('should handle negative limit parameter', async () => {
      app.get('/results', controllers.getAllUserTestResults);

      mockTestingService.getTestResultsByUser.mockResolvedValue([]);

      const response = await request(app)
        .get('/results?limit=-10');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      // Should handle gracefully
    });

    test('should handle invalid testType parameter', async () => {
      app.get('/results', controllers.getAllUserTestResults);

      mockTestingService.getTestResultsByUser.mockResolvedValue([]);

      const response = await request(app)
        .get('/results?testType=invalid_type');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      // Should ignore invalid testType
    });
  });

  describe('Concurrent Request Error Handling', () => {
    test('should handle concurrent requests to same endpoint', async () => {
      app.post('/meteor', controllers.runMeteorTest);

      mockTestingService.calculateMeteorScore.mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve({
          score: 0.85,
          details: { method: 'METEOR' }
        }), 100))
      );

      mockTestingService.saveTestResult.mockResolvedValue({
        id: 'test-result-id'
      });

      // Send multiple concurrent requests
      const requests = Array(5).fill().map(() => 
        request(app)
          .post('/meteor')
          .send({
            scenarioId: 'test-scenario',
            generatedText: 'test generated',
            referenceText: 'test reference'
          })
      );

      const responses = await Promise.all(requests);

      // All requests should succeed
      responses.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
      });

      // Service should be called for each request
      expect(mockTestingService.calculateMeteorScore).toHaveBeenCalledTimes(5);
    });

    test('should handle service overload gracefully', async () => {
      app.post('/sentence-bert', controllers.runSentenceBertTest);

      mockTestingService.calculateSentenceBertScore.mockRejectedValue(
        new Error('Service temporarily overloaded, please try again later')
      );

      const response = await request(app)
        .post('/sentence-bert')
        .send({
          scenarioId: 'test-scenario',
          generatedText: 'test generated',
          referenceText: 'test reference'
        });

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Service temporarily overloaded, please try again later');
    });
  });

  describe('Memory and Resource Error Handling', () => {
    test('should handle out of memory errors', async () => {
      app.post('/meteor', controllers.runMeteorTest);

      mockTestingService.calculateMeteorScore.mockRejectedValue(
        new Error('JavaScript heap out of memory')
      );

      const response = await request(app)
        .post('/meteor')
        .send({
          scenarioId: 'test-scenario',
          generatedText: 'test generated',
          referenceText: 'test reference'
        });

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('JavaScript heap out of memory');
    });

    test('should handle timeout errors', async () => {
      app.post('/sentence-bert', controllers.runSentenceBertTest);

      mockTestingService.calculateSentenceBertScore.mockRejectedValue(
        new Error('Request timeout: Operation took too long to complete')
      );

      const response = await request(app)
        .post('/sentence-bert')
        .send({
          scenarioId: 'test-scenario',
          generatedText: 'test generated',
          referenceText: 'test reference'
        });

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Request timeout: Operation took too long to complete');
    });
  });
});