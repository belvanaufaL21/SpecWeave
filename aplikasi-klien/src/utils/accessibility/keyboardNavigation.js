/**
 * Keyboard navigation utilities for accessibility
 */

// Key codes for common navigation keys
export const KEYS = {
  ENTER: 'Enter',
  SPACE: ' ',
  ESCAPE: 'Escape',
  TAB: 'Tab',
  ARROW_UP: 'ArrowUp',
  ARROW_DOWN: 'ArrowDown',
  ARROW_LEFT: 'ArrowLeft',
  ARROW_RIGHT: 'ArrowRight',
  HOME: 'Home',
  END: 'End',
  PAGE_UP: 'PageUp',
  PAGE_DOWN: 'PageDown'
};

/**
 * Check if element is focusable
 */
export const isFocusable = (element) => {
  if (!element) return false;
  
  const focusableSelectors = [
    'a[href]',
    'button:not([disabled])',
    'input:not([disabled])',
    'select:not([disabled])',
    'textarea:not([disabled])',
    '[tabindex]:not([tabindex="-1"])',
    '[contenteditable="true"]'
  ];
  
  return focusableSelectors.some(selector => element.matches(selector));
};

/**
 * Get all focusable elements within a container
 */
export const getFocusableElements = (container) => {
  if (!container) return [];
  
  const focusableSelectors = [
    'a[href]',
    'button:not([disabled])',
    'input:not([disabled])',
    'select:not([disabled])',
    'textarea:not([disabled])',
    '[tabindex]:not([tabindex="-1"])',
    '[contenteditable="true"]'
  ].join(', ');
  
  return Array.from(container.querySelectorAll(focusableSelectors))
    .filter(element => {
      // Check if element is visible
      const style = window.getComputedStyle(element);
      return style.display !== 'none' && 
             style.visibility !== 'hidden' && 
             element.offsetParent !== null;
    });
};

/**
 * Trap focus within a container (useful for modals)
 */
export const trapFocus = (container, event) => {
  const focusableElements = getFocusableElements(container);
  
  if (focusableElements.length === 0) return;
  
  const firstElement = focusableElements[0];
  const lastElement = focusableElements[focusableElements.length - 1];
  
  if (event.key === KEYS.TAB) {
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
};

/**
 * Handle arrow key navigation in a list
 */
export const handleArrowNavigation = (container, event, options = {}) => {
  const {
    itemSelector = '[role="option"], [role="menuitem"], button, a',
    orientation = 'vertical', // 'vertical' or 'horizontal'
    loop = true
  } = options;
  
  const items = Array.from(container.querySelectorAll(itemSelector))
    .filter(item => !item.disabled && item.offsetParent !== null);
  
  if (items.length === 0) return;
  
  const currentIndex = items.indexOf(document.activeElement);
  let nextIndex = currentIndex;
  
  const isVertical = orientation === 'vertical';
  const nextKey = isVertical ? KEYS.ARROW_DOWN : KEYS.ARROW_RIGHT;
  const prevKey = isVertical ? KEYS.ARROW_UP : KEYS.ARROW_LEFT;
  
  switch (event.key) {
    case nextKey:
      event.preventDefault();
      nextIndex = currentIndex + 1;
      if (nextIndex >= items.length) {
        nextIndex = loop ? 0 : items.length - 1;
      }
      items[nextIndex].focus();
      break;
      
    case prevKey:
      event.preventDefault();
      nextIndex = currentIndex - 1;
      if (nextIndex < 0) {
        nextIndex = loop ? items.length - 1 : 0;
      }
      items[nextIndex].focus();
      break;
      
    case KEYS.HOME:
      event.preventDefault();
      items[0].focus();
      break;
      
    case KEYS.END:
      event.preventDefault();
      items[items.length - 1].focus();
      break;
  }
};

/**
 * Handle keyboard activation (Enter/Space)
 */
export const handleKeyboardActivation = (event, callback) => {
  if (event.key === KEYS.ENTER || event.key === KEYS.SPACE) {
    event.preventDefault();
    callback(event);
  }
};

/**
 * Create keyboard event handler for common patterns
 */
export const createKeyboardHandler = (handlers = {}) => {
  return (event) => {
    const handler = handlers[event.key];
    if (handler) {
      handler(event);
    }
  };
};

/**
 * Focus management utilities
 */
export const focusManager = {
  // Store the previously focused element
  previousFocus: null,
  
  // Save current focus
  saveFocus() {
    this.previousFocus = document.activeElement;
  },
  
  // Restore previous focus
  restoreFocus() {
    if (this.previousFocus && this.previousFocus.focus) {
      this.previousFocus.focus();
      this.previousFocus = null;
    }
  },
  
  // Focus first focusable element in container
  focusFirst(container) {
    const focusableElements = getFocusableElements(container);
    if (focusableElements.length > 0) {
      focusableElements[0].focus();
    }
  },
  
  // Focus last focusable element in container
  focusLast(container) {
    const focusableElements = getFocusableElements(container);
    if (focusableElements.length > 0) {
      focusableElements[focusableElements.length - 1].focus();
    }
  }
};

/**
 * ARIA utilities
 */
export const ariaUtils = {
  // Announce to screen readers
  announce(message, priority = 'polite') {
    const announcer = document.createElement('div');
    announcer.setAttribute('aria-live', priority);
    announcer.setAttribute('aria-atomic', 'true');
    announcer.className = 'sr-only';
    announcer.textContent = message;
    
    document.body.appendChild(announcer);
    
    setTimeout(() => {
      document.body.removeChild(announcer);
    }, 1000);
  },
  
  // Set expanded state
  setExpanded(element, expanded) {
    element.setAttribute('aria-expanded', expanded.toString());
  },
  
  // Set selected state
  setSelected(element, selected) {
    element.setAttribute('aria-selected', selected.toString());
  },
  
  // Set pressed state
  setPressed(element, pressed) {
    element.setAttribute('aria-pressed', pressed.toString());
  }
};