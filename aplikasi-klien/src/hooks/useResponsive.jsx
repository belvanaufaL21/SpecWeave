import { useState, useEffect } from 'react';
import { getCurrentBreakpoint, isMobile, isTablet, isDesktop } from '../utils/responsive/breakpoints';

/**
 * Hook for responsive design utilities
 */
export const useResponsive = () => {
  const [breakpoint, setBreakpoint] = useState(() => getCurrentBreakpoint());
  const [windowSize, setWindowSize] = useState(() => ({
    width: typeof window !== 'undefined' ? window.innerWidth : 1024,
    height: typeof window !== 'undefined' ? window.innerHeight : 768
  }));

  useEffect(() => {
    const handleResize = () => {
      const newBreakpoint = getCurrentBreakpoint();
      const newSize = {
        width: window.innerWidth,
        height: window.innerHeight
      };

      setBreakpoint(newBreakpoint);
      setWindowSize(newSize);
    };

    // Debounce resize events
    let timeoutId;
    const debouncedResize = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(handleResize, 150);
    };

    window.addEventListener('resize', debouncedResize);
    
    // Initial call
    handleResize();

    return () => {
      window.removeEventListener('resize', debouncedResize);
      clearTimeout(timeoutId);
    };
  }, []);

  return {
    breakpoint,
    windowSize,
    isMobile: isMobile(),
    isTablet: isTablet(),
    isDesktop: isDesktop(),
    
    // Utility functions
    isBreakpoint: (bp) => breakpoint === bp,
    isAtLeast: (bp) => {
      const order = ['xs', 'sm', 'md', 'lg', 'xl', '2xl'];
      const currentIndex = order.indexOf(breakpoint);
      const targetIndex = order.indexOf(bp);
      return currentIndex >= targetIndex;
    },
    isAtMost: (bp) => {
      const order = ['xs', 'sm', 'md', 'lg', 'xl', '2xl'];
      const currentIndex = order.indexOf(breakpoint);
      const targetIndex = order.indexOf(bp);
      return currentIndex <= targetIndex;
    }
  };
};