import { createPortal } from 'react-dom';
import { useState, useEffect } from 'react';

const ConfirmationModal = ({ 
  isOpen, 
  onClose, 
  onConfirm, 
  title = "Confirm Action",
  message = "Are you sure you want to proceed?",
  confirmText = "Confirm",
  cancelText = "Cancel",
  type = "warning", // warning, danger, info, success
  icon = null,
  details = null
}) => {
  const [isProcessing, setIsProcessing] = useState(false);

  // Reset state when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setIsProcessing(false);
    }
  }, [isOpen]);

  // Close modal on Escape key
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape' && isOpen && !isProcessing) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, isProcessing, onClose]);

  const handleConfirm = async () => {
    setIsProcessing(true);
    try {
      await onConfirm();
      onClose();
    } catch (error) {
      console.error('Confirmation failed:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget && !isProcessing) {
      onClose();
    }
  };

  // Type-based styling - matching DeleteConfirmationModal exactly
  const getTypeStyles = () => {
    switch (type) {
      case 'danger':
        return {
          iconBgColor: '#160D0C',
          iconBorderColor: '#442726',
          iconColor: '#EE4038',
          confirmBgColor: '#EE4038',
          confirmHoverColor: '#f1554d'
        };
      case 'warning':
        return {
          iconBgColor: '#160D14',
          iconBorderColor: '#44273D',
          iconColor: '#FF7AD0',
          confirmBgColor: '#44273D',
          confirmHoverColor: '#5a3350'
        };
      case 'info':
        return {
          iconBgColor: '#0D1216',
          iconBorderColor: '#264478',
          iconColor: '#4A9EFF',
          confirmBgColor: '#4A9EFF',
          confirmHoverColor: '#6bb0ff'
        };
      case 'success':
        return {
          iconBgColor: '#0D160E',
          iconBorderColor: '#264428',
          iconColor: '#4AFF6B',
          confirmBgColor: '#4AFF6B',
          confirmHoverColor: '#6bff88'
        };
      default:
        return {
          iconBgColor: '#0D0D0D',
          iconBorderColor: '#444444',
          iconColor: '#888888',
          confirmBgColor: '#888888',
          confirmHoverColor: '#999999'
        };
    }
  };

  const getDefaultIcon = () => {
    switch (type) {
      case 'danger':
      case 'warning':
        return (
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
        );
      case 'info':
        return (
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      case 'success':
        return (
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        );
      default:
        return (
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
    }
  };

  const styles = getTypeStyles();

  if (!isOpen) return null;

  const modalContent = (
    <div 
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={handleBackdropClick}
      style={{ 
        position: 'fixed', 
        top: 0, 
        left: 0, 
        right: 0, 
        bottom: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}
    >
      <div 
        className="relative w-full max-w-md rounded-2xl shadow-2xl transform transition-all duration-300 scale-100"
        style={{
          backgroundColor: '#09090A',
          border: '1px solid rgba(255, 255, 255, 0.05)',
          margin: 'auto',
          maxHeight: '90vh',
          overflow: 'auto'
        }}
      >
        
        {/* Header with Icon */}
        <div className="p-6 pb-4">
          <div className="flex items-center gap-4 mb-4">
            <div 
              className="w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0"
              style={{
                backgroundColor: styles.iconBgColor,
                border: `1px solid ${styles.iconBorderColor}`
              }}
            >
              <div style={{ color: styles.iconColor }}>
                {icon || getDefaultIcon()}
              </div>
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-white">{title}</h3>
            </div>
          </div>

          {/* Message */}
          <div className="mb-4">
            <p className="text-gray-300 leading-relaxed">
              {message}
            </p>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-6 pb-6">
          <div className="flex gap-3">
            <button
              onClick={onClose}
              disabled={isProcessing}
              className="flex-1 px-4 py-3 text-gray-300 rounded-lg transition-all duration-200 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              style={{
                backgroundColor: '#0D0D0D',
                border: '1px solid rgba(255, 255, 255, 0.05)'
              }}
              onMouseEnter={(e) => {
                if (!isProcessing) {
                  e.currentTarget.style.backgroundColor = '#1a1a1a';
                }
              }}
              onMouseLeave={(e) => {
                if (!isProcessing) {
                  e.currentTarget.style.backgroundColor = '#0D0D0D';
                }
              }}
            >
              {cancelText}
            </button>
            <button
              onClick={handleConfirm}
              disabled={isProcessing}
              className={`flex-1 px-4 py-3 rounded-lg font-medium transition-all duration-200 flex items-center justify-center gap-2 ${
                isProcessing ? 'opacity-50 cursor-not-allowed' : ''
              }`}
              style={{
                backgroundColor: styles.confirmBgColor,
                border: `1px solid ${styles.confirmBgColor}`,
                color: '#FFFFFF'
              }}
              onMouseEnter={(e) => {
                if (!isProcessing) {
                  e.currentTarget.style.backgroundColor = styles.confirmHoverColor;
                }
              }}
              onMouseLeave={(e) => {
                if (!isProcessing) {
                  e.currentTarget.style.backgroundColor = styles.confirmBgColor;
                }
              }}
            >
              {isProcessing ? (
                <>
                  <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  Processing...
                </>
              ) : (
                confirmText
              )}
            </button>
          </div>
        </div>

        {/* Loading Overlay */}
        {isProcessing && (
          <div className="absolute inset-0 bg-black/20 backdrop-blur-sm rounded-2xl flex items-center justify-center">
            <div 
              className="rounded-lg p-4 flex items-center gap-3"
              style={{
                backgroundColor: '#09090A',
                border: '1px solid rgba(255, 255, 255, 0.05)'
              }}
            >
              <svg className="w-5 h-5 animate-spin" style={{ color: styles.iconColor }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              <span className="text-sm text-gray-300">Processing...</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
};

export default ConfirmationModal;