import React from 'react';
import { useLocation } from 'react-router-dom';

/**
 * Page transition wrapper - Instant (no animation for better UX)
 */
const PageTransition = ({ children, className = '' }) => {
  const location = useLocation();

  return (
    <div key={location.pathname} className={`w-full h-full ${className}`}>
      {children}
    </div>
  );
};

export default PageTransition;