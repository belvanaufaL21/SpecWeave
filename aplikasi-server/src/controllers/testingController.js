import TestingService from '../services/testingService.js';
import { AppError } from '../middlewares/errorHandler.js';
import { formatSuccessResponse } from '../middlewares/shared/responseFormatter.js';

/**
 * Testing Controller for Sentence-BERT evaluation
 * Handles API endpoints for scenario testing functionality
 * (METEOR evaluation has been removed - only Sentence-BERT is used)
 */

/**
 * Run Sentence-BERT test on scenario
 * POST /api/testing/sentence-bert
 */
export const runSentenceBertTest = async (req, res, next) => {
  try {
    const { scenarioId, generatedText, referenceText, scenarioTitle } = req.body;
    const userId = req.user?.id;
    
    // Validate required fields
    if (!scenarioId || !generatedText || !referenceText) {
      throw new AppError('scenarioId, generatedText, and referenceText are required', 400);
    }
    
    // Calculate Sentence-BERT score using Python script
    const sentenceBertResult = await TestingService.calculateSentenceBertScore(
      generatedText, 
      referenceText
    );
    
    // Save test result to database only if user is authenticated
    let testResult = null;
    if (userId) {
      testResult = await TestingService.saveTestResult({
        scenarioId,
        testType: 'sentence_bert',
        score: sentenceBertResult.score,
        generatedText,
        referenceText,
        scenarioTitle: scenarioTitle || null, // Use extracted variable
        userId,
        testDetails: sentenceBertResult.detailed_metrics || sentenceBertResult.details || sentenceBertResult
      });
    }
    
    res.success({
      testResult,
      sentenceBertMetrics: sentenceBertResult
    }, 'Sentence-BERT test completed successfully');
    
  } catch (error) {
    console.error('Sentence-BERT test error:', error);
    next(error);
  }
};

/**
 * Get test results for a specific scenario
 * GET /api/testing/results/:scenarioId
 */
export const getTestResults = async (req, res, next) => {
  try {
    const { scenarioId } = req.params;
    const userId = req.user?.id;
    
    if (!scenarioId) {
      throw new AppError('scenarioId is required', 400);
    }
    
    if (!userId) {
      throw new AppError('User authentication required', 401);
    }
    
    // Get test results from Sentence-BERT table
    const testResults = await TestingService.getTestResultsByScenario(
      scenarioId, 
      userId
    );
    
    // testResults is organized by type: { sentence_bert: [] }
    
    // Get latest result
    const latestResult = testResults.sentence_bert[0] || null;
    
    res.success({
      scenarioId,
      latestResult,
      allResults: testResults,
      summary: {
        totalTests: testResults.sentence_bert.length,
        sentenceBertTests: testResults.sentence_bert.length,
        hasResults: testResults.sentence_bert.length > 0
      }
    }, 'Test results retrieved successfully');
    
  } catch (error) {
    console.error('Get test results error:', error);
    next(error);
  }
};

/**
 * Get all test results for the authenticated user
 * GET /api/testing/results
 */
export const getAllUserTestResults = async (req, res, next) => {
  try {
    const userId = req.user?.id;
    const { limit, offset, testType } = req.query;
    
    if (!userId) {
      throw new AppError('User authentication required', 401);
    }
    
    // Parse query parameters
    const options = {};
    if (limit) options.limit = parseInt(limit, 10);
    if (offset) options.offset = parseInt(offset, 10);
    if (testType && ['meteor', 'sentence_bert'].includes(testType)) {
      options.testType = testType;
    }
    
    // Get test results from database
    const testResults = await TestingService.getTestResultsByUser(userId, options);
    
    res.success({
      results: testResults,
      count: testResults.length,
      filters: options
    }, 'User test results retrieved successfully');
    
  } catch (error) {
    console.error('Get all user test results error:', error);
    next(error);
  }
};

/**
 * Delete a test result
 * DELETE /api/testing/results/:testId
 */
export const deleteTestResult = async (req, res, next) => {
  try {
    const { testId } = req.params;
    const userId = req.user?.id;
    
    if (!testId) {
      throw new AppError('testId is required', 400);
    }
    
    if (!userId) {
      throw new AppError('User authentication required', 401);
    }
    
    // Delete test result from database
    await TestingService.deleteTestResult(testId, userId);
    
    res.success({
      deletedTestId: testId
    }, 'Test result deleted successfully');
    
  } catch (error) {
    console.error('Delete test result error:', error);
    next(error);
  }
};

/**
 * Get test statistics for the authenticated user
 * GET /api/testing/statistics
 */
export const getTestStatistics = async (req, res, next) => {
  try {
    const userId = req.user?.id;
    
    if (!userId) {
      throw new AppError('User authentication required', 401);
    }
    
    // Get test statistics from database
    const statistics = await TestingService.getTestStatistics(userId);
    
    res.success(statistics, 'Test statistics retrieved successfully');
    
  } catch (error) {
    console.error('Get test statistics error:', error);
    next(error);
  }
};

/**
 * Run batch tests (Sentence-BERT) on a scenario
 * POST /api/testing/batch
 */
export const runBatchTest = async (req, res, next) => {
  try {
    const { scenarioId, generatedText, referenceText, scenarioTitle } = req.body;
    const userId = req.user?.id;
    
    // Validate required fields
    if (!scenarioId || !generatedText || !referenceText) {
      throw new AppError('scenarioId, generatedText, and referenceText are required', 400);
    }
    
    const results = {};
    
    // Run Sentence-BERT test
    try {
      const sentenceBertResult = await TestingService.calculateSentenceBertScore(
        generatedText, 
        referenceText
      );
      
      // Save test result only if user is authenticated
      let sentenceBertTestResult = null;
      if (userId) {
        sentenceBertTestResult = await TestingService.saveTestResult({
          scenarioId,
          testType: 'sentence_bert',
          score: sentenceBertResult.score,
          generatedText,
          referenceText,
          scenarioTitle: scenarioTitle || null,
          userId,
          testDetails: sentenceBertResult.detailed_metrics || sentenceBertResult.details || sentenceBertResult
        });
      }
      
      results.sentence_bert = {
        testResult: sentenceBertTestResult,
        metrics: sentenceBertResult
      };
    } catch (sentenceBertError) {
      console.error('Sentence-BERT batch test error:', sentenceBertError);
      results.sentence_bert = {
        error: sentenceBertError.message
      };
    }
    
    // Check if test succeeded
    if (results.sentence_bert.error) {
      throw new AppError('Batch test failed', 500);
    }
    
    res.success({
      scenarioId,
      results,
      summary: {
        requestedTests: ['sentence_bert'],
        successfulTests: ['sentence_bert'],
        failedTests: []
      }
    }, 'Batch test completed');
    
  } catch (error) {
    console.error('Batch test error:', error);
    next(error);
  }
};

/**
 * Save scenario reference for reuse
 * POST /api/testing/references
 */
export const saveScenarioReference = async (req, res, next) => {
  try {
    const { referenceText, description, tags } = req.body;
    const userId = req.user?.id;
    
    // Validate required fields
    if (!referenceText || !referenceText.trim()) {
      throw new AppError('referenceText is required', 400);
    }
    
    // If no user is authenticated, just return success without saving
    if (!userId) {
      return res.success(null, 'Scenario reference noted (not saved - authentication required for persistence)');
    }
    
    // Save scenario reference
    const savedReference = await TestingService.saveScenarioReference({
      userId,
      referenceText: referenceText.trim(),
      description: description?.trim() || null,
      tags: Array.isArray(tags) ? tags : []
    });
    
    res.success(savedReference, 'Scenario reference saved successfully');
    
  } catch (error) {
    console.error('Save scenario reference error:', error);
    next(error);
  }
};

/**
 * Get scenario references for the authenticated user
 * GET /api/testing/references
 */
export const getScenarioReferences = async (req, res, next) => {
  try {
    const userId = req.user?.id;
    const { limit, searchText, tags } = req.query;
    
    // If no user is authenticated, return empty results
    if (!userId) {
      return res.success({
        references: [],
        count: 0,
        filters: {}
      }, 'No scenario references available (authentication required)');
    }
    
    // Parse query parameters
    const options = {};
    if (limit) options.limit = parseInt(limit, 10);
    if (searchText) options.searchText = searchText.trim();
    if (tags) {
      options.tags = Array.isArray(tags) ? tags : tags.split(',').map(tag => tag.trim());
    }
    
    // Get scenario references
    const references = await TestingService.getScenarioReferences(userId, options);
    
    res.success({
      references,
      count: references.length,
      filters: options
    }, 'Scenario references retrieved successfully');
    
  } catch (error) {
    console.error('Get scenario references error:', error);
    next(error);
  }
};

/**
 * Get the most recent reference scenario used for a specific scenario
 * GET /api/testing/references/last/:scenarioId
 */
export const getLastUsedReference = async (req, res, next) => {
  try {
    const { scenarioId } = req.params;
    const userId = req.user?.id;
    
    if (!scenarioId) {
      throw new AppError('scenarioId is required', 400);
    }
    
    // If no user is authenticated, return null reference
    if (!userId) {
      return res.success({
        scenarioId,
        lastUsedReference: null
      }, 'No last used reference available (authentication required)');
    }
    
    // Get last used reference
    const lastReference = await TestingService.getLastUsedReference(scenarioId, userId);
    
    res.success({
      scenarioId,
      lastUsedReference: lastReference
    }, 'Last used reference retrieved successfully');
    
  } catch (error) {
    console.error('Get last used reference error:', error);
    next(error);
  }
};

/**
 * Get cross-test data for a scenario (Sentence-BERT results only)
 * GET /api/testing/cross-test/:scenarioId
 */
export const getCrossTestData = async (req, res, next) => {
  try {
    const { scenarioId } = req.params;
    const userId = req.user?.id;
    
    if (!scenarioId) {
      throw new AppError('scenarioId is required', 400);
    }
    
    // If no user is authenticated, return empty cross-test data
    if (!userId) {
      return res.success({
        scenarioId,
        hasResults: false,
        sentence_bert: null,
        sharedReferenceText: null
      }, 'No cross-test data available (authentication required)');
    }
    
    // Get cross-test data
    const crossTestData = await TestingService.getCrossTestData(scenarioId, userId);
    
    res.success({
      scenarioId,
      ...crossTestData
    }, 'Cross-test data retrieved successfully');
    
  } catch (error) {
    console.error('Get cross-test data error:', error);
    next(error);
  }
};

/**
 * Run single evaluation (Sentence-BERT only)
 * POST /api/testing/evaluation
 * (Replaces dual-evaluation endpoint)
 */
export const runEvaluation = async (req, res, next) => {
  try {
    const { scenarioId, generatedText, referenceText } = req.body;
    const userId = req.user?.id;
    
    // Validate required fields
    if (!scenarioId || !generatedText || !referenceText) {
      throw new AppError('scenarioId, generatedText, and referenceText are required', 400);
    }
    
    // If no user is authenticated, still run the evaluation but don't save
    if (!userId) {
      const sentenceBertResult = await TestingService.calculateSentenceBertScore(generatedText, referenceText);

      return res.success({
        success: true,
        timestamp: new Date().toISOString(),
        sentence_bert: {
          success: sentenceBertResult.success,
          score: sentenceBertResult.score,
          details: sentenceBertResult.details
        },
        generatedText,
        referenceText,
        saved: false
      }, 'Evaluation completed (not saved - authentication required for persistence)');
    }
    
    // Run evaluation with database save
    const result = await TestingService.runSingleEvaluation(
      generatedText,
      referenceText,
      scenarioId,
      userId
    );
    
    res.success({
      ...result,
      saved: true
    }, 'Evaluation completed and saved successfully');
    
  } catch (error) {
    console.error('Evaluation error:', error);
    next(error);
  }
};