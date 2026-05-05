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
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setIsVisible(true);
    } else {
      const timer = setTimeout(() => setIsVisible(false), 200);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  const handleConfirm = () => {
    onConfirm();
    onClose();
  };

  const handleCancel = () => {
    onClose();
  };

  // Type-based styling
  const getTypeStyles = () => {
    switch (type) {
      case 'danger':
        return {
          iconBg: 'bg-gradient-to-br from-red-500/20 to-rose-500/20',
          iconColor: 'text-red-400',
          confirmBg: 'bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800',
          confirmShadow: 'hover:shadow-red-500/50 shadow-lg shadow-red-500/30',
          borderColor: 'border-red-500/30'
        };
      case 'warning':
        return {
          iconBg: 'bg-[#160D14] border border-[#44273D]',
          iconColor: 'text-[#FF7AD0]',
          confirmBg: 'bg-[#44273D] hover:bg-[#5a3350]',
          confirmShadow: 'hover:shadow-[#44273D]/25',
          borderColor: 'border-[#44273D]/30'
        };
      case 'info':
        return {
          iconBg: 'bg-gradient-to-br from-blue-500/20 to-cyan-500/20',
          iconColor: 'text-blue-400',
          confirmBg: 'bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700',
          confirmShadow: 'hover:shadow-blue-500/25',
          borderColor: 'border-blue-500/20'
        };
      case 'success':
        return {
          iconBg: 'bg-gradient-to-br from-green-500/20 to-emerald-500/20',
          iconColor: 'text-green-400',
          confirmBg: 'bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700',
          confirmShadow: 'hover:shadow-green-500/25',
          borderColor: 'border-green-500/20'
        };
      default:
        return {
          iconBg: 'bg-gradient-to-br from-gray-500/20 to-slate-500/20',
          iconColor: 'text-gray-400',
          confirmBg: 'bg-gradient-to-r from-gray-600 to-slate-600 hover:from-gray-700 hover:to-slate-700',
          confirmShadow: 'hover:shadow-gray-500/25',
          borderColor: 'border-gray-500/20'
        };
    }
  };

  const getDefaultIcon = () => {
    switch (type) {
      case 'danger':
        return (
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
        );
      case 'warning':
        return (
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
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

  if (!isVisible) return null;

  const modalContent = (
    <div 
      className={`fixed inset-0 bg-black/60 backdrop-blur-sm z-[200] flex items-center justify-center p-4 transition-opacity duration-200 ${
        isOpen ? 'opacity-100' : 'opacity-0'
      }`}
      onClick={handleCancel}
    >
      <div 
        className={`bg-[#16161e] border ${styles.borderColor} rounded-2xl w-full max-w-md transform transition-all duration-200 ${
          isOpen ? 'scale-100 opacity-100' : 'scale-95 opacity-0'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-6 pb-4">
          <div className="flex items-start gap-4">
            {/* Icon */}
            <div className={`w-12 h-12 rounded-full ${styles.iconBg} flex items-center justify-center flex-shrink-0`}>
              <div className={styles.iconColor}>
                {icon || getDefaultIcon()}
              </div>
            </div>
            
            {/* Content */}
            <div className="flex-1 min-w-0">
              <h3 className="text-lg font-semibold text-white mb-2">
                {title}
              </h3>
              <p className="text-gray-300 text-sm leading-relaxed">
                {message}
              </p>
              
              {/* Details */}
              {details && (
                <div className="mt-3 p-3 bg-white/5 rounded-lg border border-white/10">
                  <p className="text-xs text-gray-400 leading-relaxed">
                    {details}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="px-6 pb-6">
          <div className="flex items-center gap-3 justify-end">
            <button
              onClick={handleCancel}
              className="px-4 py-2 text-gray-400 hover:text-white transition-all duration-200 text-sm font-medium rounded-lg hover:bg-white/5 border border-white/10 hover:border-white/20"
            >
              {cancelText}
            </button>
            <button
              onClick={handleConfirm}
              className={`px-5 py-2 ${styles.confirmBg} text-white rounded-lg transition-all duration-200 font-semibold text-sm shadow-lg ${styles.confirmShadow}`}
            >
              {confirmText}
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
};

export default ConfirmationModal;