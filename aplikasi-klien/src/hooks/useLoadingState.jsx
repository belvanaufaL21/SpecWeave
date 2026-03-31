import { useCallback } from 'react';
import { useLoading, LOADING_TYPES, PROGRESS_TYPES } from '../contexts/LoadingContext';

/**
 * Custom hook for managing loading states with common patterns
 */
export const useLoadingState = () => {
  const { 
    setLoading, 
    setProgress, 
    getLoadingState, 
    getProgressState,
    withLoading,
    isAnyLoading,
    clearAllLoading
  } = useLoading();

  /**
   * Start loading with optional message and estimated time
   */
  const startLoading = useCallback((type, options = {}) => {
    setLoading(type, true, {
      message: options.message || '',
      estimatedTime: options.estimatedTime,
      priority: options.priority || 'normal',
      ...options
    });
  }, [setLoading]);

  /**
   * Stop loading for a specific type
   */
  const stopLoading = useCallback((type) => {
    setLoading(type, false);
  }, [setLoading]);

  /**
   * Update progress for determinate loading
   */
  const updateProgress = useCallback((type, value, max = 100, options = {}) => {
    setProgress(type, {
      type: PROGRESS_TYPES.DETERMINATE,
      value,
      max,
      ...options
    });
  }, [setProgress]);

  /**
   * Update step progress
   */
  const updateStepProgress = useCallback((type, currentStep, steps, options = {}) => {
    setProgress(type, {
      type: PROGRESS_TYPES.STEPPED,
      currentStep,
      steps,
      ...options
    });
  }, [setProgress]);

  /**
   * Set indeterminate progress (spinner)
   */
  const setIndeterminateProgress = useCallback((type, options = {}) => {
    setProgress(type, {
      type: PROGRESS_TYPES.INDETERMINATE,
      ...options
    });
  }, [setProgress]);

  /**
   * Common loading patterns
   */
  const loadingPatterns = {
    // Authentication loading
    startAuth: (message = 'Memproses autentikasi...') => 
      startLoading(LOADING_TYPES.AUTHENTICATION, { message, estimatedTime: 3000 }),
    
    stopAuth: () => 
      stopLoading(LOADING_TYPES.AUTHENTICATION),

    // Chat generation loading
    startChatGeneration: (message = 'AI sedang memproses...') => 
      startLoading(LOADING_TYPES.CHAT_GENERATION, { message, estimatedTime: 10000 }),
    
    stopChatGeneration: () => 
      stopLoading(LOADING_TYPES.CHAT_GENERATION),

    // JIRA sync loading
    startJiraSync: (message = 'Sinkronisasi JIRA...') => 
      startLoading(LOADING_TYPES.JIRA_SYNC, { message, estimatedTime: 5000 }),
    
    stopJiraSync: () => 
      stopLoading(LOADING_TYPES.JIRA_SYNC),

    // Export loading
    startExport: (message = 'Mengekspor data...') => 
      startLoading(LOADING_TYPES.EXPORT, { message, estimatedTime: 8000 }),
    
    stopExport: () => 
      stopLoading(LOADING_TYPES.EXPORT),

    // Template loading
    startTemplateLoading: (message = 'Memuat template...') => 
      startLoading(LOADING_TYPES.TEMPLATE_LOADING, { message, estimatedTime: 2000 }),
    
    stopTemplateLoading: () => 
      stopLoading(LOADING_TYPES.TEMPLATE_LOADING),

    // Reference loading
    startReferenceLoading: (message = 'Memuat referensi...') => 
      startLoading(LOADING_TYPES.REFERENCE_LOADING, { message, estimatedTime: 3000 }),
    
    stopReferenceLoading: () => 
      stopLoading(LOADING_TYPES.REFERENCE_LOADING),

    // Meteor analysis loading
    startMeteorAnalysis: (message = 'Menganalisis dengan Meteor...') => 
      startLoading(LOADING_TYPES.METEOR_ANALYSIS, { message, estimatedTime: 15000 }),
    
    stopMeteorAnalysis: () => 
      stopLoading(LOADING_TYPES.METEOR_ANALYSIS),

    // Page transition loading
    startPageTransition: (message = 'Memuat halaman...') => 
      startLoading(LOADING_TYPES.PAGE_TRANSITION, { message, estimatedTime: 1000 }),
    
    stopPageTransition: () => 
      stopLoading(LOADING_TYPES.PAGE_TRANSITION),

    // Form submission loading
    startFormSubmission: (message = 'Menyimpan data...') => 
      startLoading(LOADING_TYPES.FORM_SUBMISSION, { message, estimatedTime: 2000 }),
    
    stopFormSubmission: () => 
      stopLoading(LOADING_TYPES.FORM_SUBMISSION)
  };

  /**
   * Async operation wrapper with automatic loading management
   */
  const withAsyncLoading = useCallback(async (type, asyncFn, options = {}) => {
    try {
      startLoading(type, options);
      const result = await asyncFn();
      return result;
    } finally {
      stopLoading(type);
    }
  }, [startLoading, stopLoading]);

  /**
   * Multi-step operation helper
   */
  const withSteppedLoading = useCallback(async (type, steps, options = {}) => {
    try {
      startLoading(type, options);
      
      const results = [];
      for (let i = 0; i < steps.length; i++) {
        updateStepProgress(type, i, steps.map((step, idx) => ({
          title: step.title || `Step ${idx + 1}`,
          description: step.description
        })));
        
        const result = await steps[i].execute();
        results.push(result);
      }
      
      // Mark as completed
      updateStepProgress(type, steps.length, steps.map((step, idx) => ({
        title: step.title || `Step ${idx + 1}`,
        description: step.description
      })));
      
      return results;
    } finally {
      setTimeout(() => stopLoading(type), 500); // Brief delay to show completion
    }
  }, [startLoading, stopLoading, updateStepProgress]);

  /**
   * Progress tracking for file operations
   */
  const withProgressLoading = useCallback(async (type, asyncFn, options = {}) => {
    try {
      startLoading(type, options);
      
      const progressCallback = (value, max = 100) => {
        updateProgress(type, value, max);
      };
      
      const result = await asyncFn(progressCallback);
      return result;
    } finally {
      stopLoading(type);
    }
  }, [startLoading, stopLoading, updateProgress]);

  return {
    // Core functions
    startLoading,
    stopLoading,
    updateProgress,
    updateStepProgress,
    setIndeterminateProgress,
    
    // State getters
    getLoadingState,
    getProgressState,
    isAnyLoading,
    clearAllLoading,
    
    // Patterns
    ...loadingPatterns,
    
    // Wrappers
    withLoading,
    withAsyncLoading,
    withSteppedLoading,
    withProgressLoading,
    
    // Constants
    LOADING_TYPES,
    PROGRESS_TYPES
  };
};

export default useLoadingState;