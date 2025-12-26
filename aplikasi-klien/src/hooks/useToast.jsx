import { useState, useCallback } from 'react';

export const useToast = () => {
  const [toasts, setToasts] = useState([]);

  const showToast = useCallback((options) => {
    const id = Date.now() + Math.random();
    const toast = {
      id,
      message: options.message || 'Notification',
      type: options.type || 'info',
      duration: options.duration || 4000,
      position: options.position || 'top-right'
    };

    setToasts(prev => [...prev, toast]);

    // Auto-remove toast after duration + animation time
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, toast.duration + 500);

    return id;
  }, []);

  const hideToast = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const hideAllToasts = useCallback(() => {
    setToasts([]);
  }, []);

  // Convenience methods
  const showSuccess = useCallback((message, options = {}) => {
    return showToast({ ...options, message, type: 'success' });
  }, [showToast]);

  const showError = useCallback((message, options = {}) => {
    return showToast({ ...options, message, type: 'error' });
  }, [showToast]);

  const showWarning = useCallback((message, options = {}) => {
    return showToast({ ...options, message, type: 'warning' });
  }, [showToast]);

  const showInfo = useCallback((message, options = {}) => {
    return showToast({ ...options, message, type: 'info' });
  }, [showToast]);

  return {
    toasts,
    showToast,
    hideToast,
    hideAllToasts,
    showSuccess,
    showError,
    showWarning,
    showInfo
  };
};