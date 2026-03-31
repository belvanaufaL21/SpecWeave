import TestingService from '../../services/testingService.js';
import databaseService from '../../services/databaseService.js';
import cacheService from '../../services/cacheService.js';
import { AppError } from '../../middlewares/errorHandler.js';

/**
 * Optimized Testing Controller for METEOR and Sentence-BERT evaluations
 * Features: Caching, optimized database queries, async/await patterns, response time monitoring
 */

/**
 * Run METEOR test on scenario with caching and optimization
 * POST /api/testing/meteor
 */
export const runMeteorTest = async (req, res, next) => {
  const startTime = Date.now();
  
  try {
    const { scenarioId, generatedText, referenceText } = req.body;
    const userId = req.user?.id;
    
    // Validate required fields
    if (!scenarioId || !generatedText || !referenceText) {
      throw new AppError('scenarioId, generatedText, and referenceText are required', 400);
    }
    
    // Create cache key for METEOR calculation
    const cacheKey = cacheService.createKey('meteor', 
      `${Buffer.from(generatedText).toString('base64').slice(0, 20)}_${Buffer.from(referenceText).toString('base64').slice(0, 20)}`
    );
    
    // Try to get cached result first
    let meteorResult = await cacheService.get(cacheKey);
    let fromCache = false;
    
    if (!meteorResult) {
      // Calculate METEOR score using Python script
      meteorResult = await TestingService.calculateMeteorScore(
        generatedText, 
        referenceText
      );
      
      // Cache the result for 1 hour
      await cacheService.set(cacheKey, meteorResult, 3600);
    } else {
      fromCache = true;
      console.log('📦 METEOR result retrieved from cache');
    }
    
    // Save test result to database only if user is authenticated
    let testResult = null;
    if (userId) {
      // Use optimized database service
      testResult = await databaseService.insert('test_results', {
        scenario_id: scenarioId,
        test_type: 'meteor',
        score: meteorResult.score,
        generated_text: generatedText,
        reference_text: referenceText,
        user_id: userId,
        test_details: meteorResult.detailed_metrics || meteorResult.details || meteorResult,
        created_at: new Date().toISOString()
      }, {
        select: '*',
        single: true,
        invalidateCache: [`test_results_user_${userId}`, `test_results_scenario_${scenarioId}`]
      });
    }
    
    const responseTime = Date.now() - startTime;
    
    res.json({
      success: true,
      message: 'METEOR test completed successfully',
      data: {
        testResult: testResult?.data || null,
        meteorMetrics: meteorResult,
        performance: {
          responseTime,
          fromCache
        }
      }
    });
    
  } catch (error) {
    console.error('METEOR test error:', error);
    next(error);
  }
};

/**
 * Run Sentence-BERT test on scenario with caching and optimization
 * POST /api/testing/sentence-bert
 */
export const runSentenceBertTest = async (req, res, next) => {
  const startTime = Date.now();
  
  try {
    const { scenarioId, generatedText, referenceText } = req.body;
    const userId = req.user?.id;
    
    // Validate required fields
    if (!scenarioId || !generatedText || !referenceText) {
      throw new AppError('scenarioId, generatedText, and referenceText are required', 400);
    }
    
    // Create cache key for Sentence-BERT calculation
    const cacheKey = cacheService.createKey('sentence_bert', 
      `${Buffer.from(generatedText).toString('base64').slice(0, 20)}_${Buffer.from(referenceText).toString('base64').slice(0, 20)}`
    );
    
    // Try to get cached result first
    let sentenceBertResult = await cacheService.get(cacheKey);
    let fromCache = false;
    
    if (!sentenceBertResult) {
      // Calculate Sentence-BERT score using Python script
      sentenceBertResult = await TestingService.calculateSentenceBertScore(
        generatedText, 
        referenceText
      );
      
      // Cache the result for 1 hour
      await cacheService.set(cacheKey, sentenceBertResult, 3600);
    } else {
      fromCache = true;
      console.log('📦 Sentence-BERT result retrieved from cache');
    }
    
    // Save test result to database only if user is authenticated
    let testResult = null;
    if (userId) {
      // Use optimized database service
      testResult = await databaseService.insert('test_results', {
        scenario_id: scenarioId,
        test_type: 'sentence_bert',
        score: sentenceBertResult.score,
        generated_text: generatedText,
        reference_text: referenceText,
        user_id: userId,
        test_details: sentenceBertResult.detailed_metrics || sentenceBertResult.details || sentenceBertResult,
        created_at: new Date().toISOString()
      }, {
        select: '*',
        single: true,
        invalidateCache: [`test_results_user_${userId}`, `test_results_scenario_${scenarioId}`]
      });
    }
    
    const responseTime = Date.now() - startTime;
    
    res.json({
      success: true,
      message: 'Sentence-BERT test completed successfully',
      data: {
        testResult: testResult?.data || null,
        sentenceBertMetrics: sentenceBertResult,
        performance: {
          responseTime,
          fromCache
        }
      }
    });
    
  } catch (error) {
    console.error('Sentence-BERT test error:', error);
    next(error);
  }
};

/**
 * Get test results for a specific scenario with caching
 * GET /api/testing/results/:scenarioId
 */
export const getTestResults = async (req, res, next) => {
  const startTime = Date.now();
  
  try {
    const { scenarioId } = req.params;
    const userId = req.user?.id;
    
    if (!scenarioId) {
      throw new AppError('scenarioId is required', 400);
    }
    
    if (!userId) {
      throw new AppError('User authentication required', 401);
    }
    
    // Create cache key for test results
    const cacheKey = cacheService.createKey('test_results', `scenario_${scenarioId}_user_${userId}`);
    
    // Try to get cached results first
    let testResults = await cacheService.get(cacheKey);
    let fromCache = false;
    
    if (!testResults) {
      // Get test results from database using optimized query
      const queryResult = await databaseService.executeQuery('test_results', {
        select: '*',
        filters: [
          { column: 'scenario_id', operator: 'eq', value: scenarioId },
          { column: 'user_id', operator: 'eq', value: userId }
        ],
        orderBy: [{ column: 'created_at', ascending: false }],
        cache: true,
        cacheKey,
        cacheTTL: 300 // 5 minutes
      });
      
      testResults = queryResult.data || [];
      fromCache = queryResult.fromCache;
    } else {
      fromCache = true;
      console.log('📦 Test results retrieved from cache');
    }
    
    // Organize results by test type
    const organizedResults = {
      meteor: testResults.filter(result => result.test_type === 'meteor'),
      sentence_bert: testResults.filter(result => result.test_type === 'sentence_bert')
    };
    
    // Get latest result for each test type
    const latestResults = {
      meteor: organizedResults.meteor[0] || null,
      sentence_bert: organizedResults.sentence_bert[0] || null
    };
    
    const responseTime = Date.now() - startTime;
    
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
        },
        performance: {
          responseTime,
          fromCache
        }
      }
    });
    
  } catch (error) {
    console.error('Get test results error:', error);
    next(error);
  }
};

/**
 * Get all test results for the authenticated user with pagination and caching
 * GET /api/testing/results
 */
export const getAllUserTestResults = async (req, res, next) => {
  const startTime = Date.now();
  
  try {
    const userId = req.user?.id;
    const { limit = 20, offset = 0, testType } = req.query;
    
    if (!userId) {
      throw new AppError('User authentication required', 401);
    }
    
    // Parse query parameters
    const limitNum = Math.min(parseInt(limit, 10) || 20, 100); // Max 100
    const offsetNum = parseInt(offset, 10) || 0;
    
    // Create cache key
    const cacheKey = cacheService.createKey('user_test_results', 
      `user_${userId}_${limitNum}_${offsetNum}_${testType || 'all'}`
    );
    
    // Try to get cached results first
    let testResults = await cacheService.get(cacheKey);
    let fromCache = false;
    
    if (!testResults) {
      // Build query options
      const queryOptions = {
        select: '*',
        filters: [{ column: 'user_id', operator: 'eq', value: userId }],
        orderBy: [{ column: 'created_at', ascending: false }],
        limit: limitNum,
        offset: offsetNum,
        cache: true,
        cacheKey,
        cacheTTL: 300 // 5 minutes
      };
      
      // Add test type filter if specified
      if (testType && ['meteor', 'sentence_bert'].includes(testType)) {
        queryOptions.filters.push({ column: 'test_type', operator: 'eq', value: testType });
      }
      
      const queryResult = await databaseService.executeQuery('test_results', queryOptions);
      testResults = queryResult.data || [];
      fromCache = queryResult.fromCache;
    } else {
      fromCache = true;
      console.log('📦 User test results retrieved from cache');
    }
    
    const responseTime = Date.now() - startTime;
    
    res.json({
      success: true,
      message: 'User test results retrieved successfully',
      data: {
        results: testResults,
        count: testResults.length,
        pagination: {
          limit: limitNum,
          offset: offsetNum,
          hasMore: testResults.length === limitNum
        },
        filters: { testType },
        performance: {
          responseTime,
          fromCache
        }
      }
    });
    
  } catch (error) {
    console.error('Get all user test results error:', error);
    next(error);
  }
};

/**
 * Run batch tests with parallel processing and caching
 * POST /api/testing/batch
 */
export const runBatchTest = async (req, res, next) => {
  const startTime = Date.now();
  
  try {
    const { scenarioId, generatedText, referenceText, testTypes = ['meteor', 'sentence_bert'] } = req.body;
    const userId = req.user?.id;
    
    // Validate required fields
    if (!scenarioId || !generatedText || !referenceText) {
      throw new AppError('scenarioId, generatedText, and referenceText are required', 400);
    }
    
    const results = {};
    const promises = [];
    
    // Create cache keys for both test types
    const meteorCacheKey = cacheService.createKey('meteor', 
      `${Buffer.from(generatedText).toString('base64').slice(0, 20)}_${Buffer.from(referenceText).toString('base64').slice(0, 20)}`
    );
    const sentenceBertCacheKey = cacheService.createKey('sentence_bert', 
      `${Buffer.from(generatedText).toString('base64').slice(0, 20)}_${Buffer.from(referenceText).toString('base64').slice(0, 20)}`
    );
    
    // Run METEOR test if requested
    if (testTypes.includes('meteor')) {
      promises.push(
        (async () => {
          try {
            // Check cache first
            let meteorResult = await cacheService.get(meteorCacheKey);
            let fromCache = false;
            
            if (!meteorResult) {
              meteorResult = await TestingService.calculateMeteorScore(generatedText, referenceText);
              await cacheService.set(meteorCacheKey, meteorResult, 3600);
            } else {
              fromCache = true;
            }
            
            // Save test result if user is authenticated
            let meteorTestResult = null;
            if (userId) {
              const insertResult = await databaseService.insert('test_results', {
                scenario_id: scenarioId,
                test_type: 'meteor',
                score: meteorResult.score,
                generated_text: generatedText,
                reference_text: referenceText,
                user_id: userId,
                test_details: meteorResult.detailed_metrics || meteorResult.details || meteorResult,
                created_at: new Date().toISOString()
              }, {
                select: '*',
                single: true,
                invalidateCache: [`test_results_user_${userId}`, `test_results_scenario_${scenarioId}`]
              });
              
              meteorTestResult = insertResult.data;
            }
            
            results.meteor = {
              testResult: meteorTestResult,
              metrics: meteorResult,
              fromCache
            };
          } catch (meteorError) {
            console.error('METEOR batch test error:', meteorError);
            results.meteor = {
              error: meteorError.message
            };
          }
        })()
      );
    }
    
    // Run Sentence-BERT test if requested
    if (testTypes.includes('sentence_bert')) {
      promises.push(
        (async () => {
          try {
            // Check cache first
            let sentenceBertResult = await cacheService.get(sentenceBertCacheKey);
            let fromCache = false;
            
            if (!sentenceBertResult) {
              sentenceBertResult = await TestingService.calculateSentenceBertScore(generatedText, referenceText);
              await cacheService.set(sentenceBertCacheKey, sentenceBertResult, 3600);
            } else {
              fromCache = true;
            }
            
            // Save test result if user is authenticated
            let sentenceBertTestResult = null;
            if (userId) {
              const insertResult = await databaseService.insert('test_results', {
                scenario_id: scenarioId,
                test_type: 'sentence_bert',
                score: sentenceBertResult.score,
                generated_text: generatedText,
                reference_text: referenceText,
                user_id: userId,
                test_details: sentenceBertResult.detailed_metrics || sentenceBertResult.details || sentenceBertResult,
                created_at: new Date().toISOString()
              }, {
                select: '*',
                single: true,
                invalidateCache: [`test_results_user_${userId}`, `test_results_scenario_${scenarioId}`]
              });
              
              sentenceBertTestResult = insertResult.data;
            }
            
            results.sentence_bert = {
              testResult: sentenceBertTestResult,
              metrics: sentenceBertResult,
              fromCache
            };
          } catch (sentenceBertError) {
            console.error('Sentence-BERT batch test error:', sentenceBertError);
            results.sentence_bert = {
              error: sentenceBertError.message
            };
          }
        })()
      );
    }
    
    // Wait for all tests to complete
    await Promise.all(promises);
    
    // Check if any tests succeeded
    const hasSuccessfulTests = Object.values(results).some(result => !result.error);
    
    if (!hasSuccessfulTests) {
      throw new AppError('All batch tests failed', 500);
    }
    
    const responseTime = Date.now() - startTime;
    
    res.json({
      success: true,
      message: 'Batch tests completed',
      data: {
        scenarioId,
        results,
        summary: {
          requestedTests: testTypes,
          successfulTests: Object.keys(results).filter(key => !results[key].error),
          failedTests: Object.keys(results).filter(key => results[key].error),
          cacheHits: Object.values(results).filter(result => result.fromCache).length
        },
        performance: {
          responseTime,
          parallelExecution: true
        }
      }
    });
    
  } catch (error) {
    console.error('Batch test error:', error);
    next(error);
  }
};

export default {
  runMeteorTest,
  runSentenceBertTest,
  getTestResults,
  getAllUserTestResults,
  runBatchTest
};