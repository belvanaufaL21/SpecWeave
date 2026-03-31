/**
 * Enhanced Modal Component
 * Reusable modal with consistent behavior, keyboard navigation, and proper z-index management
 */

import { useEffect, useRef } from 'react';
import useFocusTrap from '../../hooks/useFocusTrap';

const Modal = ({
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
  ...props
}) => {
  const modalRef = useRef(null);
  const focusTrapRef = useFocusTrap(isOpen);

  // Size variants
  const sizeClasses = {
    sm: 'max-w-md',
    md: 'max-w-2xl',
    lg: 'max-w-4xl',
    xl: 'max-w-6xl',
    full: 'max-w-full mx-4'
  };

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && closeOnEscape && !loading) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [isOpen, closeOnEscape, onClose, loading]);

  // Focus management
  useEffect(() => {
    if (isOpen) {
      // Prevent body scroll
      document.body.style.overflow = 'hidden';
    } else {
      // Restore body scroll
      document.body.style.overflow = 'unset';
    }

    // Cleanup on unmount
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  // Handle backdrop click
  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget && closeOnBackdrop && !loading) {
      onClose();
    }
  };

  // Handle close button click
  const handleCloseClick = () => {
    if (!loading) {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby={title ? "modal-title" : undefined}
    >
      <div 
        ref={(node) => {
          modalRef.current = node;
          focusTrapRef.current = node;
        }}
        className={`rounded-2xl w-full ${sizeClasses[size]} shadow-2xl ${className}`}
        style={{ backgroundColor: '#09090A', border: '1px solid rgba(255, 255, 255, 0.05)' }}
        tabIndex={-1}
        {...props}
      >
        {/* Header */}
        {(title || showCloseButton) && (
          <div className={`flex items-center justify-between p-6 ${headerClassName}`} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.05)' }}>
            {title && (
              <h3 id="modal-title" className="text-xl font-bold text-white">
                {title}
              </h3>
            )}
            {showCloseButton && (
              <button
                onClick={handleCloseClick}
                disabled={loading}
                className="text-gray-400 hover:text-white transition-colors p-1 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg hover:bg-white/5"
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
          <div className={`p-6 rounded-b-2xl ${footerClassName}`} style={{ backgroundColor: '#09090A' }}>
            {footer}
          </div>
        )}
      </div>
    </div>
  );
};

export default Modal;