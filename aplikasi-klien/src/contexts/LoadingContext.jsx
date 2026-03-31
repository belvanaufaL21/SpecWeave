import React, { createContext, useContext, useState, useCallback } from 'react';

const LoadingContext = createContext();

export const useLoading = () => {
  const context = useContext(LoadingContext);
  if (!context) {
    throw new Error('useLoading must be used within a LoadingProvider');
  }
  return context;
};

// Loading state types
export const LOADING_TYPES = {
  GLOBAL: 'global',
  AUTHENTICATION: 'authentication',
  CHAT_GENERATION: 'chatGeneration',
  JIRA_SYNC: 'jiraSync',
  EXPORT: 'export',
  TEMPLATE_LOADING: 'templateLoading',
  REFERENCE_LOADING: 'referenceLoading',
  METEOR_ANALYSIS: 'meteorAnalysis',
  PAGE_TRANSITION: 'pageTransition',
  FORM_SUBMISSION: 'formSubmission'
};

// Progress types for different operations
export const PROGRESS_TYPES = {
  INDETERMINATE: 'indeterminate',
  DETERMINATE: 'determinate',
  STEPPED: 'stepped'
};

export const LoadingProvider = ({ children }) => {
  const [loadingStates, setLoadingStates] = useState({});
  const [progressStates, setProgressStates] = useState({});

  /**
   * Set loading state for a specific type
   * @param {string} type - Loading type from LOADING_TYPES
   * @param {boolean} isLoading - Loading state
   * @param {Object} options - Additional options (message, progress, etc.)
   */
  const setLoading = useCallback((type, isLoading, options = {}) => {
    setLoadingStates(prev => ({
      ...prev,
      [type]: {
        isLoading,
        message: options.message || '',
        startTime: isLoading ? Date.now() : prev[type]?.startTime,
        estimatedTime: options.estimatedTime,
        priority: options.priority || 'normal', // low, normal, high
        ...options
      }
    }));

    // Clear progress when loading stops
    if (!isLoading) {
      setProgressStates(prev => {
        const newState = { ...prev };
        delete newState[type];
        return newState;
      });
    }
  }, []);

  /**
   * Set progress for a specific loading operation
   * @param {string} type - Loading type
   * @param {Object} progress - Progress information
   */
  const setProgress = useCallback((type, progress) => {
    setProgressStates(prev => ({
      ...prev,
      [type]: {
        ...prev[type],
        ...progress,
        updatedAt: Date.now()
      }
    }));
  }, []);

  /**
   * Get loading state for a specific type
   * @param {string} type - Loading type
   * @returns {Object} Loading state object
   */
  const getLoadingState = useCallback((type) => {
    return loadingStates[type] || { isLoading: false };
  }, [loadingStates]);

  /**
   * Get progress state for a specific type
   * @param {string} type - Loading type
   * @returns {Object} Progress state object
   */
  const getProgressState = useCallback((type) => {
    return progressStates[type] || {};
  }, [progressStates]);

  /**
   * Check if any loading state is active
   * @param {Array} types - Optional array of types to check
   * @returns {boolean} True if any loading is active
   */
  const isAnyLoading = useCallback((types = null) => {
    const typesToCheck = types || Object.keys(loadingStates);
    return typesToCheck.some(type => loadingStates[type]?.isLoading);
  }, [loadingStates]);

  /**
   * Get all active loading states
   * @returns {Array} Array of active loading states
   */
  const getActiveLoadingStates = useCallback(() => {
    return Object.entries(loadingStates)
      .filter(([_, state]) => state.isLoading)
      .map(([type, state]) => ({ type, ...state }));
  }, [loadingStates]);

  /**
   * Clear all loading states
   */
  const clearAllLoading = useCallback(() => {
    setLoadingStates({});
    setProgressStates({});
  }, []);

  /**
   * Set multiple loading states at once
   * @param {Object} states - Object with type: boolean pairs
   */
  const setMultipleLoading = useCallback((states) => {
    Object.entries(states).forEach(([type, isLoading]) => {
      setLoading(type, isLoading);
    });
  }, [setLoading]);

  /**
   * Helper for common loading patterns
   */
  const withLoading = useCallback(async (type, asyncFunction, options = {}) => {
    try {
      setLoading(type, true, options);
      const result = await asyncFunction();
      return result;
    } finally {
      setLoading(type, false);
    }
  }, [setLoading]);

  const value = {
    // State
    loadingStates,
    progressStates,
    
    // Actions
    setLoading,
    setProgress,
    clearAllLoading,
    setMultipleLoading,
    withLoading,
    
    // Getters
    getLoadingState,
    getProgressState,
    isAnyLoading,
    getActiveLoadingStates,
    
    // Constants
    LOADING_TYPES,
    PROGRESS_TYPES
  };

  return (
    <LoadingContext.Provider value={value}>
      {children}
    </LoadingContext.Provider>
  );
};

export default LoadingProvider;