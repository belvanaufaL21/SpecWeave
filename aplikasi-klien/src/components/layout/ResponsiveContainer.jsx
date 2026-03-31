import React from 'react';
import { motion } from 'framer-motion';
import { useResponsive } from '../../hooks/useResponsive';

/**
 * Responsive container that adapts layout based on screen size
 */
const ResponsiveContainer = ({ 
  children, 
  className = '',
  mobileClass = '',
  tabletClass = '',
  desktopClass = '',
  animate = true,
  ...props 
}) => {
  const { isMobile, isTablet, isDesktop } = useResponsive();

  // Determine responsive classes
  const responsiveClass = isMobile ? mobileClass : 
                         isTablet ? tabletClass : 
                         desktopClass;

  const containerClass = `${className} ${responsiveClass}`.trim();

  const containerVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { 
      opacity: 1, 
      y: 0,
      transition: {
        duration: 0.3,
        ease: 'easeOut'
      }
    }
  };

  if (animate) {
    return (
      <motion.div
        className={containerClass}
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        {...props}
      >
        {children}
      </motion.div>
    );
  }

  return (
    <div className={containerClass} {...props}>
      {children}
    </div>
  );
};

export default ResponsiveContainer;