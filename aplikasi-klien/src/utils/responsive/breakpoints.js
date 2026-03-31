/**
 * Responsive design breakpoints and utilities
 */

// Tailwind CSS breakpoints
export const BREAKPOINTS = {
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  '2xl': 1536
};

// Custom breakpoints for specific components
export const COMPONENT_BREAKPOINTS = {
  sidebar: {
    mobile: 768,
    tablet: 1024,
    desktop: 1280
  },
  modal: {
    mobile: 640,
    tablet: 768,
    desktop: 1024
  },
  table: {
    mobile: 640,
    tablet: 768,
    desktop: 1024
  }
};

/**
 * Get current breakpoint based on window width
 */
export const getCurrentBreakpoint = () => {
  if (typeof window === 'undefined') return 'lg';
  
  const width = window.innerWidth;
  
  if (width >= BREAKPOINTS['2xl']) return '2xl';
  if (width >= BREAKPOINTS.xl) return 'xl';
  if (width >= BREAKPOINTS.lg) return 'lg';
  if (width >= BREAKPOINTS.md) return 'md';
  if (width >= BREAKPOINTS.sm) return 'sm';
  return 'xs';
};

/**
 * Check if current screen size matches breakpoint
 */
export const isBreakpoint = (breakpoint) => {
  if (typeof window === 'undefined') return false;
  
  const width = window.innerWidth;
  
  switch (breakpoint) {
    case 'xs':
      return width < BREAKPOINTS.sm;
    case 'sm':
      return width >= BREAKPOINTS.sm && width < BREAKPOINTS.md;
    case 'md':
      return width >= BREAKPOINTS.md && width < BREAKPOINTS.lg;
    case 'lg':
      return width >= BREAKPOINTS.lg && width < BREAKPOINTS.xl;
    case 'xl':
      return width >= BREAKPOINTS.xl && width < BREAKPOINTS['2xl'];
    case '2xl':
      return width >= BREAKPOINTS['2xl'];
    default:
      return false;
  }
};

/**
 * Check if screen is mobile size
 */
export const isMobile = () => {
  return typeof window !== 'undefined' && window.innerWidth < BREAKPOINTS.md;
};

/**
 * Check if screen is tablet size
 */
export const isTablet = () => {
  return typeof window !== 'undefined' && 
         window.innerWidth >= BREAKPOINTS.md && 
         window.innerWidth < BREAKPOINTS.lg;
};

/**
 * Check if screen is desktop size
 */
export const isDesktop = () => {
  return typeof window !== 'undefined' && window.innerWidth >= BREAKPOINTS.lg;
};

/**
 * Get responsive classes based on breakpoint
 */
export const getResponsiveClasses = (classes) => {
  const currentBreakpoint = getCurrentBreakpoint();
  
  if (typeof classes === 'string') return classes;
  if (typeof classes === 'object') {
    return classes[currentBreakpoint] || classes.default || '';
  }
  
  return '';
};

/**
 * Media query strings for CSS-in-JS
 */
export const MEDIA_QUERIES = {
  mobile: `(max-width: ${BREAKPOINTS.md - 1}px)`,
  tablet: `(min-width: ${BREAKPOINTS.md}px) and (max-width: ${BREAKPOINTS.lg - 1}px)`,
  desktop: `(min-width: ${BREAKPOINTS.lg}px)`,
  sm: `(min-width: ${BREAKPOINTS.sm}px)`,
  md: `(min-width: ${BREAKPOINTS.md}px)`,
  lg: `(min-width: ${BREAKPOINTS.lg}px)`,
  xl: `(min-width: ${BREAKPOINTS.xl}px)`,
  '2xl': `(min-width: ${BREAKPOINTS['2xl']}px)`
};