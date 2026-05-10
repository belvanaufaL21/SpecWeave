import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import UserDataService from '../services/UserDataService';
import cleanLogger from '../config/cleanLogging';

const TestResultsContext = createContext();

export const useTestResults = () => {
  const context = useContext(TestResultsContext);
  if (!context) {
    throw new Error('useTestResults must be used within a TestResultsProvider');
  }
  return context;
};

export const TestResultsProvider = ({ children }) => {
  // Store test results by scenario ID (messageId + scenarioIndex)
  const [testResults, setTestResults] = useState({});
  const [loading, setLoading] = useState(true);

  // Load test results from database on mount
  useEffect(() => {
    loadTestResultsFromDatabase();
  }, []);

  const loadTestResultsFromDatabase = async () => {
    try {
      setLoading(true);
      
      const result = await UserDataService.getAllTestResults();
      
      if (result.success) {
        // Convert database format to context format
        const resultsMap = {};
        result.data.forEach(testResult => {
          // Use scenario_id as key
          const scenarioId = testResult.scenario_id;
          
          // Extract METEOR and Sentence-BERT details
          const meteorDetails = testResult.test_details?.meteor || {};
          const sbertDetails = testResult.test_details?.sentence_bert || {};
          
          resultsMap[scenarioId] = {
            scenarioId: testResult.scenario_id,
            messageId: testResult.message_id || scenarioId.split('-')[0], // Extract from scenario_id if not present
            scenarioIndex: testResult.scenario_index || parseInt(scenarioId.split('-')[1]) || 0,
            testType: testResult.test_type,
            timestamp: testResult.created_at,
            generatedText: testResult.generated_text,
            referenceText: testResult.reference_text,
            
            // Primary score (METEOR if available, otherwise Sentence-BERT)
            score: testResult.score,
            meteor_score: meteorDetails.score || testResult.score,
            
            // METEOR metrics
            meteor: meteorDetails.score ? {
              success: true,
              score: meteorDetails.score,
              given_score: meteorDetails.given_score,
              when_score: meteorDetails.when_score,
              then_score: meteorDetails.then_score,
              precision: (meteorDetails.given_precision + meteorDetails.when_precision + meteorDetails.then_precision) / 3,
              recall: (meteorDetails.given_recall + meteorDetails.when_recall + meteorDetails.then_recall) / 3,
              f_mean: (meteorDetails.given_f_mean + meteorDetails.when_f_mean + meteorDetails.then_f_mean) / 3,
              penalty: (meteorDetails.given_penalty + meteorDetails.when_penalty + meteorDetails.then_penalty) / 3,
              translation_info: meteorDetails.translation_info
            } : null,
            
            // Sentence-BERT metrics
            sentence_bert: sbertDetails.score ? {
              success: true,
              score: sbertDetails.score,
              given_score: sbertDetails.given_score,
              when_score: sbertDetails.when_score,
              then_score: sbertDetails.then_score,
              details: sbertDetails.details
            } : null
          };
        });
        
        setTestResults(resultsMap);
        // Only log in development
        if (import.meta.env.DEV) {
          cleanLogger.debug('TEST-RESULTS', `Loaded ${Object.keys(resultsMap).length} test results from database`);
        }

      } else {
        cleanLogger.error('TEST-RESULTS', 'Failed to load test results', result.error);
      }
    } catch (error) {
      cleanLogger.error('TEST-RESULTS', 'Error loading test results', error);
    } finally {
      setLoading(false);
    }
  };

  // Add test result for a scenario
  const addTestResult = useCallback(async (messageId, scenarioIndex, result) => {
    const scenarioId = `${messageId}-${scenarioIndex}`;
    const newResult = {
      ...result,
      timestamp: new Date().toISOString(),
      scenarioId,
      messageId,
      scenarioIndex,
      // CRITICAL: Add chatId to ensure proper filtering per chat
      chatId: result.chatId || 'unknown'
    };
    
    try {
      console.log('💾 [TEST-RESULTS] Saving test result to database:', {
        scenarioId,
        messageId,
        chatId: newResult.chatId,
        scenarioIndex
      });
      
      // CRITICAL FIX: Update local state IMMEDIATELY for instant UI feedback
      // Use functional update to ensure we have the latest state
      setTestResults(prev => {
        const updated = {
          ...prev,
          [scenarioId]: newResult
        };
        console.log('✅ [TEST-RESULTS] Local state updated immediately:', {
          scenarioId,
          hasResult: !!updated[scenarioId],
          totalResults: Object.keys(updated).length
        });
        return updated;
      });
      
      // DISABLED: Frontend no longer saves to database
      // Backend SSE endpoints (runMeteorTestSSE, runSentenceBertTestSSE) handle the save
      // to new tables: meteor_test_results and sentence_bert_test_results
      console.log('💾 [TEST-RESULTS] Save handled by backend SSE - frontend save disabled');
      
      /* COMMENTED OUT - Backend SSE now handles saving
      const saveResult = await UserDataService.saveTestResult(newResult);
      
      if (saveResult.success) {
        console.log('✅ [TEST-RESULTS] Test result saved to database successfully');
        
        // Update with database response to ensure consistency
        setTestResults(prev => ({
          ...prev,
          [scenarioId]: {
            ...newResult,
            ...(saveResult.data.test_details || {}),
            scenarioId: saveResult.data.scenario_id,
            messageId: saveResult.data.message_id,
            scenarioIndex: saveResult.data.scenario_index,
            meteor_score: saveResult.data.score,
            score: saveResult.data.score,
            testType: saveResult.data.test_type
          }
        }));
        
      } else {
        console.error('❌ [TEST-RESULTS] Failed to save to database:', saveResult.error);
        // Local state already updated, so UI still works
      }
      */
    } catch (error) {
      console.error('❌ [TEST-RESULTS] Error saving test result:', error);
      // Local state already updated, so UI still works
    }
  }, []);

  // Get test result for a scenario
  const getTestResult = useCallback((messageId, scenarioIndex) => {
    if (typeof messageId === 'string' && messageId.includes('-') && scenarioIndex === undefined) {
      // If messageId looks like a scenarioId (messageId-scenarioIndex format), use it directly
      const result = testResults[messageId];
      if (result) {
        return result;
      }
      
      // Fallback: search by timestamp if not found as scenarioId
      return Object.values(testResults).find(result => result.timestamp === messageId) || null;
    }
    const scenarioId = `${messageId}-${scenarioIndex}`;
    return testResults[scenarioId] || null;
  }, [testResults]);

  // Check if scenario has been tested
  const isScenarioTested = useCallback((messageId, scenarioIndex) => {
    const scenarioId = `${messageId}-${scenarioIndex}`;
    return !!testResults[scenarioId];
  }, [testResults]);

  // Get test results for specific chat
  const getTestResultsForChat = useCallback((chatId) => {
    if (!chatId) return {};
    
    const chatResults = {};
    Object.entries(testResults).forEach(([scenarioId, result]) => {
      if (result.chatId === chatId) {
        chatResults[scenarioId] = result;
      }
    });

    return chatResults;
  }, [testResults]);

  // Get all test results
  const getAllTestResults = useCallback(() => {
    return testResults;
  }, [testResults]);

  // Clear all test results
  const clearTestResults = useCallback(async () => {
    try {
      console.log('🗑️ [TEST-RESULTS] Clearing all test results...');
      
      // Clear from database (delete all user's test results)
      const allResults = Object.keys(testResults);
      for (const scenarioId of allResults) {
        await UserDataService.deleteTestResult(scenarioId);
      }

      // Clear local state
      setTestResults({});
    } catch (error) {
      console.error('❌ [TEST-RESULTS] Error clearing test results:', error);
      
      // Still clear local state
      setTestResults({});
    }
  }, [testResults]);

  const value = {
    testResults,
    loading,
    addTestResult,
    getTestResult,
    isScenarioTested,
    getAllTestResults,
    getTestResultsForChat,
    clearTestResults,
    loadTestResultsFromDatabase
  };

  return (
    <TestResultsContext.Provider value={value}>
      {children}
    </TestResultsContext.Provider>
  );
};

export default TestResultsProvider;
