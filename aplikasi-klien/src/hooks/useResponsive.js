import { useState, useEffect } from 'react';

/**
 * Custom hook untuk mendeteksi ukuran layar
 * Breakpoints:
 * - mobile: < 768px
 * - tablet: 768px - 1024px
 * - desktop: > 1024px
 */
export const useResponsive = () => {
  const [screenSize, setScreenSize] = useState({
    width: typeof window !== 'undefined' ? window.innerWidth : 1024,
    height: typeof window !== 'undefined' ? window.innerHeight : 768,
  });

  useEffect(() => {
    const handleResize = () => {
      setScreenSize({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return {
    isMobile: screenSize.width < 768,
    isTablet: screenSize.width >= 768 && screenSize.width < 1024,
    isDesktop: screenSize.width >= 1024,
    width: screenSize.width,
    height: screenSize.height,
  };
};
