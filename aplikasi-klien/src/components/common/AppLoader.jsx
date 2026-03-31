import React from 'react';
import { motion } from 'framer-motion';

/**
 * Universal app loader with SpecWeave logo
 * Used for authentication, page transitions, and global loading states
 */
const AppLoader = ({ 
  message = 'Loading...', 
  showMessage = true,
  size = 'md',
  className = '' 
}) => {
  const sizeConfig = {
    sm: { logo: 'w-12 h-12' },
    md: { logo: 'w-20 h-20' },
    lg: { logo: 'w-32 h-32' }
  };

  const config = sizeConfig[size];

  return (
    <div className={`flex flex-col items-center justify-center ${className}`}>
      {/* Logo with pulse animation */}
      <div className="relative flex items-center justify-center mb-6">
        {/* SpecWeave Logo */}
        <motion.div
          className={`${config.logo} rounded-2xl overflow-hidden relative z-10`}
          animate={{ 
            scale: [1, 1.05, 1],
          }}
          transition={{ 
            duration: 2, 
            repeat: Infinity,
            ease: "easeInOut"
          }}
        >
          <img 
            src="/logo.png"
            alt="SpecWeave"
            className="w-full h-full object-cover"
          />
        </motion.div>

        {/* Subtle glow effect */}
        <motion.div
          className="absolute inset-0 rounded-full"
          style={{
            background: 'radial-gradient(circle, rgba(194, 122, 255, 0.1) 0%, transparent 70%)',
          }}
          animate={{
            opacity: [0.3, 0.6, 0.3],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />
      </div>

      {/* Loading Message */}
      {showMessage && (
        <motion.p 
          className="text-gray-400 text-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          {message}
        </motion.p>
      )}
    </div>
  );
};

export default AppLoader;
