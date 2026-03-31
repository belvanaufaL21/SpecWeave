import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useLoading, LOADING_TYPES } from '../../contexts/LoadingContext';

/**
 * Enhanced Link component with smooth transitions and loading states
 */
const SmoothLink = ({ 
  to, 
  children, 
  className = '', 
  loadingMessage = 'Navigating...',
  replace = false,
  state = null,
  ...props 
}) => {
  const navigate = useNavigate();
  const { setLoading } = useLoading();

  const handleClick = (e) => {
    e.preventDefault();
    
    // Start loading state
    setLoading(LOADING_TYPES.PAGE_TRANSITION, true, {
      message: loadingMessage,
      priority: 'normal'
    });

    // Small delay for smooth UX
    setTimeout(() => {
      navigate(to, { replace, state });
    }, 50);
  };

  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      transition={{ type: 'spring', stiffness: 400, damping: 17 }}
    >
      <Link
        to={to}
        onClick={handleClick}
        className={`inline-block transition-colors duration-200 ${className}`}
        {...props}
      >
        {children}
      </Link>
    </motion.div>
  );
};

export default SmoothLink;