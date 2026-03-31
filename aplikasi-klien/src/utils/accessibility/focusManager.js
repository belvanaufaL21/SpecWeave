/**
 * Enhanced focus management utilities for accessibility
 */

class FocusManager {
  constructor() {
    this.focusStack = [];
    this.focusableSelectors = [
      'a[href]',
      'button:not([disabled])',
      'input:not([disabled])',
      'select:not([disabled])',
      'textarea:not([disabled])',
      '[tabindex]:not([tabindex="-1"])',
      '[contenteditable="true"]',
      'details',
      'summary'
    ].join(', ');
  }

  /**
   * Save current focus to stack
   */
  saveFocus() {
    const activeElement = document.activeElement;
    if (activeElement && activeElement !== document.body) {
      this.focusStack.push(activeElement);
    }
  }

  /**
   * Restore focus from stack
   */
  restoreFocus() {
    const elementToFocus = this.focusStack.pop();
    if (elementToFocus && elementToFocus.focus) {
      // Use setTimeout to ensure DOM is ready
      setTimeout(() => {
        try {
          elementToFocus.focus();
        } catch (error) {
          console.warn('Failed to restore focus:', error);
        }
      }, 0);
    }
  }

  /**
   * Get all focusable elements within a container
   */
  getFocusableElements(container = document) {
    const elements = Array.from(container.querySelectorAll(this.focusableSelectors));
    
    return elements.filter(element => {
      // Check if element is visible and not disabled
      const style = window.getComputedStyle(element);
      const isVisible = style.display !== 'none' && 
                       style.visibility !== 'hidden' && 
                       element.offsetParent !== null;
      
      const isEnabled = !element.disabled && 
                       element.getAttribute('aria-disabled') !== 'true';
      
      return isVisible && isEnabled;
    });
  }

  /**
   * Focus first focusable element in container
   */
  focusFirst(container) {
    const focusableElements = this.getFocusableElements(container);
    if (focusableElements.length > 0) {
      focusableElements[0].focus();
      return true;
    }
    return false;
  }

  /**
   * Focus last focusable element in container
   */
  focusLast(container) {
    const focusableElements = this.getFocusableElements(container);
    if (focusableElements.length > 0) {
      focusableElements[focusableElements.length - 1].focus();
      return true;
    }
    return false;
  }

  /**
   * Focus next focusable element
   */
  focusNext(container, currentElement) {
    const focusableElements = this.getFocusableElements(container);
    const currentIndex = focusableElements.indexOf(currentElement);
    
    if (currentIndex >= 0 && currentIndex < focusableElements.length - 1) {
      focusableElements[currentIndex + 1].focus();
      return true;
    }
    return false;
  }

  /**
   * Focus previous focusable element
   */
  focusPrevious(container, currentElement) {
    const focusableElements = this.getFocusableElements(container);
    const currentIndex = focusableElements.indexOf(currentElement);
    
    if (currentIndex > 0) {
      focusableElements[currentIndex - 1].focus();
      return true;
    }
    return false;
  }

  /**
   * Trap focus within a container
   */
  trapFocus(container, event) {
    const focusableElements = this.getFocusableElements(container);
    
    if (focusableElements.length === 0) return;
    
    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];
    
    if (event.key === 'Tab') {
      if (event.shiftKey) {
        // Shift + Tab
        if (document.activeElement === firstElement) {
          event.preventDefault();
          lastElement.focus();
        }
      } else {
        // Tab
        if (document.activeElement === lastElement) {
          event.preventDefault();
          firstElement.focus();
        }
      }
    }
  }

  /**
   * Create a focus trap for a container
   */
  createFocusTrap(container, options = {}) {
    const {
      initialFocus = null,
      returnFocus = true,
      escapeDeactivates = true
    } = options;

    let isActive = false;
    let previousActiveElement = null;

    const activate = () => {
      if (isActive) return;
      
      isActive = true;
      previousActiveElement = document.activeElement;
      
      // Focus initial element or first focusable element
      if (initialFocus) {
        initialFocus.focus();
      } else {
        this.focusFirst(container);
      }
      
      // Add event listeners
      container.addEventListener('keydown', handleKeyDown);
    };

    const deactivate = () => {
      if (!isActive) return;
      
      isActive = false;
      
      // Remove event listeners
      container.removeEventListener('keydown', handleKeyDown);
      
      // Return focus if requested
      if (returnFocus && previousActiveElement) {
        previousActiveElement.focus();
      }
    };

    const handleKeyDown = (event) => {
      if (!isActive) return;
      
      if (event.key === 'Escape' && escapeDeactivates) {
        deactivate();
        return;
      }
      
      this.trapFocus(container, event);
    };

    return {
      activate,
      deactivate,
      isActive: () => isActive
    };
  }

  /**
   * Announce message to screen readers
   */
  announce(message, priority = 'polite') {
    const announcer = document.createElement('div');
    announcer.setAttribute('aria-live', priority);
    announcer.setAttribute('aria-atomic', 'true');
    announcer.className = 'sr-only absolute -left-10000px w-1px h-1px overflow-hidden';
    announcer.textContent = message;
    
    document.body.appendChild(announcer);
    
    // Remove after announcement
    setTimeout(() => {
      if (document.body.contains(announcer)) {
        document.body.removeChild(announcer);
      }
    }, 1000);
  }

  /**
   * Set focus visible styles
   */
  setFocusVisible(element, visible = true) {
    if (visible) {
      element.setAttribute('data-focus-visible', 'true');
      element.classList.add('focus-visible');
    } else {
      element.removeAttribute('data-focus-visible');
      element.classList.remove('focus-visible');
    }
  }

  /**
   * Handle focus visible for keyboard vs mouse interaction
   */
  initializeFocusVisible() {
    let hadKeyboardEvent = true;
    let keyboardThrottleTimeout = 0;

    const pointerEvents = ['mousedown', 'pointerdown'];
    const keyboardEvents = ['keydown'];

    // Mark keyboard usage
    const onKeyDown = (e) => {
      if (e.metaKey || e.altKey || e.ctrlKey) return;
      hadKeyboardEvent = true;
    };

    // Mark pointer usage
    const onPointer = () => {
      hadKeyboardEvent = false;
    };

    // Handle focus events
    const onFocus = (e) => {
      if (hadKeyboardEvent || e.target.matches(':focus-visible')) {
        this.setFocusVisible(e.target, true);
      }
    };

    const onBlur = (e) => {
      this.setFocusVisible(e.target, false);
    };

    // Add event listeners
    keyboardEvents.forEach(event => {
      document.addEventListener(event, onKeyDown, true);
    });

    pointerEvents.forEach(event => {
      document.addEventListener(event, onPointer, true);
    });

    document.addEventListener('focus', onFocus, true);
    document.addEventListener('blur', onBlur, true);

    // Cleanup function
    return () => {
      keyboardEvents.forEach(event => {
        document.removeEventListener(event, onKeyDown, true);
      });

      pointerEvents.forEach(event => {
        document.removeEventListener(event, onPointer, true);
      });

      document.removeEventListener('focus', onFocus, true);
      document.removeEventListener('blur', onBlur, true);
    };
  }
}

// Create singleton instance
const focusManager = new FocusManager();

export default focusManager;