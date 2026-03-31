import { useEffect, useRef, useCallback } from 'react';
import { 
  trapFocus, 
  handleArrowNavigation, 
  handleKeyboardActivation,
  focusManager,
  KEYS 
} from '../utils/accessibility/keyboardNavigation';

/**
 * Hook for keyboard navigation in components
 */
export const useKeyboardNavigation = (options = {}) => {
  const {
    trapFocusEnabled = false,
    arrowNavigationEnabled = false,
    arrowNavigationOptions = {},
    onEscape = null,
    onEnter = null,
    autoFocus = false
  } = options;

  const containerRef = useRef(null);

  // Handle keyboard events
  const handleKeyDown = useCallback((event) => {
    const container = containerRef.current;
    if (!container) return;

    // Handle escape key
    if (event.key === KEYS.ESCAPE && onEscape) {
      onEscape(event);
      return;
    }

    // Handle enter key
    if (event.key === KEYS.ENTER && onEnter) {
      onEnter(event);
      return;
    }

    // Handle focus trapping
    if (trapFocusEnabled) {
      trapFocus(container, event);
    }

    // Handle arrow navigation
    if (arrowNavigationEnabled) {
      handleArrowNavigation(container, event, arrowNavigationOptions);
    }
  }, [trapFocusEnabled, arrowNavigationEnabled, arrowNavigationOptions, onEscape, onEnter]);

  // Setup keyboard event listeners
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    container.addEventListener('keydown', handleKeyDown);

    // Auto focus first element if enabled
    if (autoFocus) {
      focusManager.focusFirst(container);
    }

    return () => {
      container.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleKeyDown, autoFocus]);

  return {
    containerRef,
    focusFirst: () => focusManager.focusFirst(containerRef.current),
    focusLast: () => focusManager.focusLast(containerRef.current)
  };
};

/**
 * Hook for modal keyboard navigation
 */
export const useModalKeyboardNavigation = (isOpen, onClose) => {
  const { containerRef } = useKeyboardNavigation({
    trapFocusEnabled: true,
    onEscape: onClose,
    autoFocus: true
  });

  useEffect(() => {
    if (isOpen) {
      // Save current focus
      focusManager.saveFocus();
      
      // Focus first element in modal
      setTimeout(() => {
        if (containerRef.current) {
          focusManager.focusFirst(containerRef.current);
        }
      }, 100);
    } else {
      // Restore previous focus when modal closes
      focusManager.restoreFocus();
    }
  }, [isOpen, containerRef]);

  return { containerRef };
};

/**
 * Hook for dropdown/menu keyboard navigation
 */
export const useDropdownKeyboardNavigation = (isOpen, onClose, options = {}) => {
  const { containerRef } = useKeyboardNavigation({
    arrowNavigationEnabled: true,
    arrowNavigationOptions: {
      itemSelector: '[role="menuitem"], button, a',
      orientation: 'vertical',
      loop: true,
      ...options
    },
    onEscape: onClose,
    autoFocus: isOpen
  });

  // Handle item activation
  const handleItemActivation = useCallback((callback) => {
    return (event) => {
      handleKeyboardActivation(event, () => {
        callback();
        if (onClose) onClose();
      });
    };
  }, [onClose]);

  return { 
    containerRef, 
    handleItemActivation 
  };
};

/**
 * Hook for tab navigation
 */
export const useTabNavigation = (tabs = [], activeTab = 0, onTabChange) => {
  const { containerRef } = useKeyboardNavigation({
    arrowNavigationEnabled: true,
    arrowNavigationOptions: {
      itemSelector: '[role="tab"]',
      orientation: 'horizontal',
      loop: true
    }
  });

  // Handle tab activation
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleKeyDown = (event) => {
      const tabElements = Array.from(container.querySelectorAll('[role="tab"]'));
      const currentIndex = tabElements.indexOf(document.activeElement);

      if (event.key === KEYS.ENTER || event.key === KEYS.SPACE) {
        event.preventDefault();
        if (currentIndex >= 0 && onTabChange) {
          onTabChange(currentIndex);
        }
      }
    };

    container.addEventListener('keydown', handleKeyDown);
    return () => container.removeEventListener('keydown', handleKeyDown);
  }, [onTabChange]);

  return { containerRef };
};