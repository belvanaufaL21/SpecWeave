import { useState, useEffect, useCallback, useRef } from 'react';

/**
 * Hook for persisting testing state during navigation
 * Maintains testing progress, form data, and modal states across page changes
 */
const useTestingStatePersistence = () => {
  // State for ongoing tests
  const [ongoingTests, setOngoingTests] = useState(new Map());
  
  // State for form data persistence
  const [formDataCache, setFormDataCache] = useState(new Map());
  
  // State for modal states
  const [modalStates, setModalStates] = useState(new Map());
  
  // Refs for cleanup
  const cleanupTimers = useRef(new Map());
  const storageKey = 'testing_state_persistence';

  // Load persisted state on mount
  useEffect(() => {
    try {
      const savedState = localStorage.getItem(storageKey);
      if (savedState) {
        const parsed = JSON.parse(savedState);
        
        // Restore ongoing tests (but mark them as interrupted)
        if (parsed.ongoingTests) {
          const restoredTests = new Map();
          Object.entries(parsed.ongoingTests).forEach(([key, value]) => {
            restoredTests.set(key, {
              ...value,
              interrupted: true,
              resumedAt: Date.now()
            });
          });
          setOngoingTests(restoredTests);
        }
        
        // Restore form data cache
        if (parsed.formDataCache) {
          setFormDataCache(new Map(Object.entries(parsed.formDataCache)));
        }
        
        // Restore modal states
        if (parsed.modalStates) {
          setModalStates(new Map(Object.entries(parsed.modalStates)));
        }
      }
    } catch (error) {
      console.warn('Failed to restore testing state:', error);
    }
  }, []);

  // Save state to localStorage whenever it changes
  useEffect(() => {
    const stateToSave = {
      ongoingTests: Object.fromEntries(ongoingTests),
      formDataCache: Object.fromEntries(formDataCache),
      modalStates: Object.fromEntries(modalStates),
      timestamp: Date.now()
    };
    
    try {
      localStorage.setItem(storageKey, JSON.stringify(stateToSave));
    } catch (error) {
      console.warn('Failed to save testing state:', error);
    }
  }, [ongoingTests, formDataCache, modalStates]);

  // Start tracking a test
  const startTest = useCallback((testId, testData) => {
    const testState = {
      id: testId,
      scenarioId: testData.scenarioId,
      testType: testData.testType,
      generatedText: testData.generatedText,
      referenceText: testData.referenceText,
      startedAt: Date.now(),
      progress: 0,
      stage: 'preparing',
      status: 'running'
    };
    
    setOngoingTests(prev => new Map(prev.set(testId, testState)));
    
    // Set auto-cleanup after 30 minutes
    const timer = setTimeout(() => {
      completeTest(testId, { status: 'timeout' });
    }, 30 * 60 * 1000);
    
    cleanupTimers.current.set(testId, timer);
    
    return testState;
  }, []);

  // Update test progress
  const updateTestProgress = useCallback((testId, updates) => {
    setOngoingTests(prev => {
      const current = prev.get(testId);
      if (!current) return prev;
      
      const updated = new Map(prev);
      updated.set(testId, {
        ...current,
        ...updates,
        lastUpdated: Date.now()
      });
      return updated;
    });
  }, []);

  // Complete a test
  const completeTest = useCallback((testId, result = {}) => {
    setOngoingTests(prev => {
      const updated = new Map(prev);
      updated.delete(testId);
      return updated;
    });
    
    // Clear cleanup timer
    const timer = cleanupTimers.current.get(testId);
    if (timer) {
      clearTimeout(timer);
      cleanupTimers.current.delete(testId);
    }
    
    // Clear related form data
    setFormDataCache(prev => {
      const updated = new Map(prev);
      updated.delete(testId);
      return updated;
    });
  }, []);

  // Get test state
  const getTestState = useCallback((testId) => {
    return ongoingTests.get(testId) || null;
  }, [ongoingTests]);

  // Check if test is ongoing
  const isTestOngoing = useCallback((testId) => {
    return ongoingTests.has(testId);
  }, [ongoingTests]);

  // Get all ongoing tests
  const getAllOngoingTests = useCallback(() => {
    return Array.from(ongoingTests.values());
  }, [ongoingTests]);

  // Save form data
  const saveFormData = useCallback((formId, data) => {
    setFormDataCache(prev => new Map(prev.set(formId, {
      ...data,
      savedAt: Date.now()
    })));
  }, []);

  // Get form data
  const getFormData = useCallback((formId) => {
    return formDataCache.get(formId) || null;
  }, [formDataCache]);

  // Clear form data
  const clearFormData = useCallback((formId) => {
    setFormDataCache(prev => {
      const updated = new Map(prev);
      updated.delete(formId);
      return updated;
    });
  }, []);

  // Save modal state
  const saveModalState = useCallback((modalId, state) => {
    setModalStates(prev => new Map(prev.set(modalId, {
      ...state,
      savedAt: Date.now()
    })));
  }, []);

  // Get modal state
  const getModalState = useCallback((modalId) => {
    return modalStates.get(modalId) || null;
  }, [modalStates]);

  // Clear modal state
  const clearModalState = useCallback((modalId) => {
    setModalStates(prev => {
      const updated = new Map(prev);
      updated.delete(modalId);
      return updated;
    });
  }, []);

  // Resume interrupted test
  const resumeTest = useCallback((testId) => {
    const testState = getTestState(testId);
    if (!testState || !testState.interrupted) {
      return null;
    }
    
    // Update test state to mark as resumed
    updateTestProgress(testId, {
      interrupted: false,
      resumedAt: Date.now(),
      status: 'running'
    });
    
    return testState;
  }, [getTestState, updateTestProgress]);

  // Cancel interrupted test
  const cancelInterruptedTest = useCallback((testId) => {
    completeTest(testId, { status: 'cancelled' });
  }, [completeTest]);

  // Get interrupted tests (tests that were running when page was refreshed/navigated)
  const getInterruptedTests = useCallback(() => {
    return Array.from(ongoingTests.values()).filter(test => test.interrupted);
  }, [ongoingTests]);

  // Clear all persisted state
  const clearAllState = useCallback(() => {
    setOngoingTests(new Map());
    setFormDataCache(new Map());
    setModalStates(new Map());
    
    // Clear all timers
    cleanupTimers.current.forEach(timer => clearTimeout(timer));
    cleanupTimers.current.clear();
    
    // Clear localStorage
    try {
      localStorage.removeItem(storageKey);
    } catch (error) {
      console.warn('Failed to clear testing state:', error);
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanupTimers.current.forEach(timer => clearTimeout(timer));
    };
  }, []);

  return {
    // Test state management
    startTest,
    updateTestProgress,
    completeTest,
    getTestState,
    isTestOngoing,
    getAllOngoingTests,
    
    // Interrupted test handling
    resumeTest,
    cancelInterruptedTest,
    getInterruptedTests,
    
    // Form data persistence
    saveFormData,
    getFormData,
    clearFormData,
    
    // Modal state persistence
    saveModalState,
    getModalState,
    clearModalState,
    
    // Utility
    clearAllState,
    
    // State indicators
    hasOngoingTests: ongoingTests.size > 0,
    hasInterruptedTests: Array.from(ongoingTests.values()).some(test => test.interrupted),
    ongoingTestsCount: ongoingTests.size
  };
};

export default useTestingStatePersistence;