import { createContext, useContext, useState, useCallback, useEffect } from 'react';

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
  const [testResults, setTestResults] = useState(() => {
    try {
      const saved = localStorage.getItem('specweave_test_results');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  // Save to localStorage whenever testResults changes
  useEffect(() => {
    try {
      localStorage.setItem('specweave_test_results', JSON.stringify(testResults));
    } catch (error) {
      console.error('Error saving test results:', error);
    }
  }, [testResults]);

  // Add test result for a scenario
  const addTestResult = useCallback((messageId, scenarioIndex, result) => {
    const scenarioId = `${messageId}-${scenarioIndex}`;
    const newResult = {
      ...result,
      timestamp: new Date().toISOString(),
      scenarioId,
      messageId,
      scenarioIndex
    };
    
    setTestResults(prev => {
      const updated = {
        ...prev,
        [scenarioId]: newResult
      };
      return updated;
    });
  }, []);

  // Get test result for a scenario
  const getTestResult = useCallback((messageId, scenarioIndex) => {
    if (typeof messageId === 'string' && messageId.includes('-') && scenarioIndex === undefined) {
      // If messageId looks like a timestamp, search by timestamp
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

  // Get all test results
  const getAllTestResults = useCallback(() => {
    return testResults;
  }, [testResults]);

  // Clear all test results
  const clearTestResults = useCallback(() => {
    setTestResults({});
  }, []);

  const value = {
    testResults,
    addTestResult,
    getTestResult,
    isScenarioTested,
    getAllTestResults,
    clearTestResults
  };

  return (
    <TestResultsContext.Provider value={value}>
      {children}
    </TestResultsContext.Provider>
  );
};

export default TestResultsProvider;