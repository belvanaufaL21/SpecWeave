/**
 * Optimized Base Modal Component
 * High-performance modal with proper focus management, animations, and accessibility
 */

import { useEffect, useRef, useCallback, memo } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import useFocusTrap from '../../hooks/useFocusTrap';
import { useComponentPerformance } from '../../utils/performance/componentProfiler';

const BaseModal = memo(({
  isOpen,
  onClose,
  title,
  children,
  size = 'md',
  closeOnBackdrop = true,
  closeOnEscape = true,
  showCloseButton = true,
  className = '',
  headerClassName = '',
  contentClassName = '',
  footerClassName = '',
  footer,
  loading = false,
  preventBodyScroll = true,
  zIndex = 50,
  ...props
}) => {
  const modalRef = useRef(null);
  const focusTrapRef = useFocusTrap(isOpen);
  const { measureOperation } = useComponentPerformance('BaseModal');

  // Size variants optimized for performance
  const sizeClasses = {
    sm: 'max-w-md',
    md: 'max-w-2xl',
    lg: 'max-w-4xl',
    xl: 'max-w-6xl',
    full: 'max-w-full mx-4'
  };

  // Memoized event handlers
  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Escape' && closeOnEscape && !loading) {
      measureOperation('escape-close', () => onClose());
    }
  }, [closeOnEscape, onClose, loading, measureOperation]);

  const handleBackdropClick = useCallback((e) => {
    if (e.target === e.currentTarget && closeOnBackdrop && !loading) {
      measureOperation('backdrop-close', () => onClose());
    }
  }, [closeOnBackdrop, onClose, loading, measureOperation]);

  const handleCloseClick = useCallback(() => {
    if (!loading) {
      measureOperation('button-close', () => onClose());
    }
  }, [loading, onClose, measureOperation]);

  // Handle escape key
  useEffect(() => {
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [isOpen, handleKeyDown]);

  // Body scroll management
  useEffect(() => {
    if (!preventBodyScroll) return;

    if (isOpen) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [isOpen, preventBodyScroll]);

  // Animation variants
  const backdropVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1 }
  };

  const modalVariants = {
    hidden: { 
      opacity: 0, 
      scale: 0.95,
      y: 20
    },
    visible: { 
      opacity: 1, 
      scale: 1,
      y: 0,
      transition: {
        type: "spring",
        damping: 25,
        stiffness: 300
      }
    },
    exit: {
      opacity: 0,
      scale: 0.95,
      y: 20,
      transition: {
        duration: 0.2
      }
    }
  };

  const modalContent = (
    <AnimatePresence mode="wait">
      {isOpen && (
        <motion.div
          className={`fixed inset-0 flex items-center justify-center p-4 z-${zIndex}`}
          variants={backdropVariants}
          initial="hidden"
          animate="visible"
          exit="hidden"
          transition={{ duration: 0.2 }}
          onClick={handleBackdropClick}
          role="dialog"
          aria-modal="true"
          aria-labelledby={title ? "modal-title" : undefined}
        >
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
          
          {/* Modal */}
          <motion.div
            ref={(node) => {
              modalRef.current = node;
              focusTrapRef.current = node;
            }}
            className={`relative bg-[#0a0a0f]/95 backdrop-blur-xl border border-white/10 rounded-2xl w-full ${sizeClasses[size]} shadow-2xl ${className}`}
            variants={modalVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            tabIndex={-1}
            {...props}
          >
            {/* Header */}
            {(title || showCloseButton) && (
              <div className={`flex items-center justify-between p-6 border-b border-white/10 ${headerClassName}`}>
                {title && (
                  <h3 id="modal-title" className="text-xl font-bold text-white">
                    {title}
                  </h3>
                )}
                {showCloseButton && (
                  <button
                    onClick={handleCloseClick}
                    disabled={loading}
                    className="text-gray-400 hover:text-white transition-colors p-1 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg hover:bg-white/5 focus:outline-none focus:ring-2 focus:ring-white/20"
                    aria-label="Close modal"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </div>
            )}

            {/* Content */}
            <div className={`p-6 ${contentClassName}`}>
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="flex items-center gap-3">
                    <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    <span className="text-gray-400">Loading...</span>
                  </div>
                </div>
              ) : (
                children
              )}
            </div>

            {/* Footer */}
            {footer && (
              <div className={`p-6 border-t border-white/10 bg-white/5 rounded-b-2xl ${footerClassName}`}>
                {footer}
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  // Use portal for better performance and z-index management
  return typeof document !== 'undefined' 
    ? createPortal(modalContent, document.body)
    : null;
});

BaseModal.displayName = 'BaseModal';

export default BaseModal;