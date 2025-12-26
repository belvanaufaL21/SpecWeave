import { useState, useCallback } from 'react';
import { 
  createConfirmationOptions, 
  validateConfirmationOptions 
} from '../utils/helpers/confirmationHelpers.js';
import { DEFAULT_CONFIRMATION } from '../utils/constants/confirmationConstants.js';

export const useConfirmation = () => {
  const [confirmationState, setConfirmationState] = useState({
    ...DEFAULT_CONFIRMATION,
    isOpen: false,
    onConfirm: () => {},
    onCancel: () => {}
  });

  const showConfirmation = useCallback((options = {}) => {
    // Validate options
    const validation = validateConfirmationOptions(options);
    if (!validation.isValid) {
      console.warn('Invalid confirmation options:', validation.errors);
    }

    return new Promise((resolve) => {
      const confirmationOptions = createConfirmationOptions(options);
      
      setConfirmationState({
        ...confirmationOptions,
        isOpen: true,
        onConfirm: () => {
          resolve(true);
          setConfirmationState(prev => ({ ...prev, isOpen: false }));
        },
        onCancel: () => {
          resolve(false);
          setConfirmationState(prev => ({ ...prev, isOpen: false }));
        }
      });
    });
  }, []);

  const hideConfirmation = useCallback(() => {
    setConfirmationState(prev => ({ ...prev, isOpen: false }));
  }, []);

  return {
    confirmationState,
    showConfirmation,
    hideConfirmation
  };
};