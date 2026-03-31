/**
 * Modal State Management Hook
 * Manages modal state with proper cleanup, loading states, and error handling
 */

import { useState, useCallback, useRef, useEffect } from 'react';

const useModalState = (initialState = {}) => {
  const [state, setState] = useState({
    isOpen: false,
    loading: false,
    error: null,
    data: null,
    ...initialState
  });

  const timeoutRef = useRef(null);
  const cleanupFunctionsRef = useRef([]);

  // Open modal with optional data
  const openModal = useCallback((data = null) => {
    setState(prev => ({
      ...prev,
      isOpen: true,
      data,
      error: null
    }));
  }, []);

  // Close modal with cleanup
  const closeModal = useCallback(() => {
    setState(prev => ({
      ...prev,
      isOpen: false,
      loading: false,
      error: null,
      data: null
    }));

    // Run cleanup functions
    cleanupFunctionsRef.current.forEach(cleanup => {
      try {
        cleanup();
      } catch (error) {
        console.warn('Modal cleanup function failed:', error);
      }
    });
    cleanupFunctionsRef.current = [];

    // Clear any pending timeouts
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  // Set loading state
  const setLoading = useCallback((loading) => {
    setState(prev => ({
      ...prev,
      loading: Boolean(loading)
    }));
  }, []);

  // Set error state
  const setError = useCallback((error) => {
    setState(prev => ({
      ...prev,
      error,
      loading: false
    }));
  }, []);

  // Clear error
  const clearError = useCallback(() => {
    setState(prev => ({
      ...prev,
      error: null
    }));
  }, []);

  // Update modal data
  const setData = useCallback((data) => {
    setState(prev => ({
      ...prev,
      data
    }));
  }, []);

  // Add cleanup function
  const addCleanup = useCallback((cleanupFn) => {
    if (typeof cleanupFn === 'function') {
      cleanupFunctionsRef.current.push(cleanupFn);
    }
  }, []);

  // Handle async operations with loading and error states
  const handleAsync = useCallback(async (asyncFn, options = {}) => {
    const { 
      onSuccess, 
      onError, 
      loadingMessage = 'Loading...',
      errorMessage = 'An error occurred',
      timeout = 30000 // 30 seconds default timeout
    } = options;

    setLoading(true);
    clearError();

    // Set timeout for long-running operations
    if (timeout > 0) {
      timeoutRef.current = setTimeout(() => {
        setError('Operation timed out. Please try again.');
        setLoading(false);
      }, timeout);
    }

    try {
      const result = await asyncFn();
      
      // Clear timeout if operation completes
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }

      setLoading(false);
      
      if (onSuccess) {
        onSuccess(result);
      }
      
      return result;
    } catch (error) {
      // Clear timeout on error
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }

      const errorMsg = error?.message || errorMessage;
      setError(errorMsg);
      
      if (onError) {
        onError(error);
      }
      
      throw error;
    }
  }, [setLoading, setError, clearError]);

  // Auto-close modal after delay
  const autoClose = useCallback((delay = 2000) => {
    timeoutRef.current = setTimeout(() => {
      closeModal();
    }, delay);
  }, [closeModal]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      
      // Run cleanup functions
      cleanupFunctionsRef.current.forEach(cleanup => {
        try {
          cleanup();
        } catch (error) {
          console.warn('Modal cleanup function failed:', error);
        }
      });
    };
  }, []);

  return {
    // State
    isOpen: state.isOpen,
    loading: state.loading,
    error: state.error,
    data: state.data,
    
    // Actions
    openModal,
    closeModal,
    setLoading,
    setError,
    clearError,
    setData,
    addCleanup,
    handleAsync,
    autoClose,
    
    // Computed
    hasError: Boolean(state.error),
    isReady: state.isOpen && !state.loading && !state.error
  };
};

export default useModalState;