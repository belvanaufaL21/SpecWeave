import { useState, useCallback } from 'react';
import { useLoading, LOADING_TYPES } from '../contexts/LoadingContext';
import { useError } from '../contexts/ErrorContext';
import TestingService from '../services/testingService';

/**
 * Custom hook for managing testing operations
 */
const useTesting = () => {
  const { setLoading, getLoadingState } = useLoading();
  const { handleError, clearError: clearGlobalError } = useError();
  
  const [error, setError] = useState(null);
  const [testResults, setTestResults] = useState({});

  // Get loading state from context
  const loading = getLoadingState(LOADING_TYPES.METEOR_ANALYSIS).isLoading;

  /**
   * Submit a test and handle the response
   */
  const submitTest = useCallback(async (testRequest) => {
    setLoading(LOADING_TYPES.METEOR_ANALYSIS, true, {
      message: `Running ${testRequest.testType.toUpperCase()} test...`,
      estimatedTime: 10000 // 10 seconds estimate
    });
    setError(null);
    clearGlobalError();
    
    try {
      // Validate request
      const validation = TestingService.validateTestRequest(testRequest);
      if (!validation.isValid) {
        throw new Error(validation.errors.join(', '));
      }

      // Submit test
      const result = await TestingService.submitTest(testRequest);
      console.log('🚀 useTesting - submitTest result:', result);
      
      // Format and store result
      const formattedResult = TestingService.formatTestResult(result);
      console.log('🎨 useTesting - formatTestResult returned:', formattedResult);
      
      if (formattedResult) {
        // Cache the result per test type
        if (testRequest.scenarioId && testRequest.testType) {
          TestingService.cacheTestResult(
            testRequest.scenarioId,
            testRequest.testType,
            formattedResult
          );
        }
        
        setTestResults(prev => ({
          ...prev,
          [testRequest.scenarioId]: {
            ...prev[testRequest.scenarioId],
            [testRequest.testType]: formattedResult
          }
        }));
      }
      
      console.log('📤 useTesting - returning to TestingModal:', formattedResult);
      return formattedResult;
    } catch (err) {
      const errorMessage = err.message || 'Gagal menjalankan pengujian';
      setError(errorMessage);
      
      // Use global error handler for consistent error handling
      handleError(err, {
        type: 'testing',
        code: 'TEST_SUBMISSION_FAILED',
        context: { testType: testRequest.testType, scenarioId: testRequest.scenarioId }
      });
      
      throw new Error(errorMessage);
    } finally {
      setLoading(LOADING_TYPES.METEOR_ANALYSIS, false);
    }
  }, [setLoading, handleError, clearGlobalError]);

  /**
   * Get test results for a scenario
   */
  const getTestResults = useCallback(async (scenarioId) => {
    setLoading(LOADING_TYPES.METEOR_ANALYSIS, true, {
      message: 'Loading test results...'
    });
    setError(null);
    clearGlobalError();
    
    try {
      const result = await TestingService.getTestResults(scenarioId);
      
      // Handle both old and new API response structures
      let results = [];
      if (result && result.allResults) {
        // New API structure
        Object.values(result.allResults).forEach(typeResults => {
          if (Array.isArray(typeResults)) {
            results = results.concat(typeResults);
          }
        });
      } else if (result && result.results) {
        // Alternative structure
        results = result.results;
      } else if (Array.isArray(result)) {
        // Direct array
        results = result;
      }
      
      if (results.length > 0) {
        // Format and organize results by test type
        const organizedResults = {};
        results.forEach(testResult => {
          const formatted = TestingService.formatTestResult({ testResult });
          if (formatted) {
            organizedResults[testResult.test_type] = formatted;
          }
        });
        
        setTestResults(prev => ({
          ...prev,
          [scenarioId]: organizedResults
        }));
        
        return organizedResults;
      }
      
      return {};
    } catch (err) {
      const errorMessage = err.message || 'Gagal mengambil hasil pengujian';
      setError(errorMessage);
      
      // Use global error handler for consistent error handling
      handleError(err, {
        type: 'testing',
        code: 'TEST_RESULTS_FETCH_FAILED',
        context: { scenarioId }
      });
      
      throw new Error(errorMessage);
    } finally {
      setLoading(LOADING_TYPES.METEOR_ANALYSIS, false);
    }
  }, [setLoading, handleError, clearGlobalError]);

  /**
   * Get cached test result for a specific scenario and test type
   */
  const getCachedResult = useCallback((scenarioId, testType) => {
    // First try in-memory cache
    const memoryResult = testResults[scenarioId]?.[testType];
    if (memoryResult) {
      return memoryResult;
    }
    
    // Then try localStorage cache
    const cachedResult = TestingService.getCachedTestResult(scenarioId, testType);
    if (cachedResult) {
      // Update in-memory cache
      setTestResults(prev => ({
        ...prev,
        [scenarioId]: {
          ...prev[scenarioId],
          [testType]: cachedResult
        }
      }));
      return cachedResult;
    }
    
    return null;
  }, [testResults]);

  /**
   * Check if a test has been completed for a scenario
   */
  const hasTestResult = useCallback((scenarioId, testType) => {
    return Boolean(testResults[scenarioId]?.[testType]);
  }, [testResults]);

  /**
   * Get test status for a scenario
   */
  const getTestStatus = useCallback((scenarioId) => {
    const scenarioResults = testResults[scenarioId] || {};
    
    return {
      meteor: Boolean(scenarioResults.meteor),
      sentence_bert: Boolean(scenarioResults.sentence_bert),
      hasAnyTest: Boolean(scenarioResults.meteor || scenarioResults.sentence_bert),
      hasBothTests: Boolean(scenarioResults.meteor && scenarioResults.sentence_bert)
    };
  }, [testResults]);

  /**
   * Clear error state
   */
  const clearError = useCallback(() => {
    setError(null);
    clearGlobalError();
  }, [clearGlobalError]);

  /**
   * Clear all test results
   */
  const clearResults = useCallback(() => {
    setTestResults({});
  }, []);

  /**
   * Clear results for a specific scenario
   */
  const clearScenarioResults = useCallback((scenarioId) => {
    setTestResults(prev => {
      const updated = { ...prev };
      delete updated[scenarioId];
      return updated;
    });
  }, []);

  return {
    // State
    loading,
    error,
    testResults,
    
    // Actions
    submitTest,
    getTestResults,
    getCachedResult,
    hasTestResult,
    getTestStatus,
    clearError,
    clearResults,
    clearScenarioResults,
    
    // Utilities
    formatScore: TestingService.formatScore,
    getQualityLevel: TestingService.getQualityLevel,
    getTestTypeDisplayName: TestingService.getTestTypeDisplayName
  };
};

export default useTesting;