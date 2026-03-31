/**
 * Enhanced Modal with State Management
 * Combines Modal component with useModalState hook for complete modal functionality
 */

import Modal from './Modal';
import useModalState from '../../hooks/useModalState';

const EnhancedModal = ({
  children,
  onClose,
  initialState = {},
  ...modalProps
}) => {
  const modalState = useModalState(initialState);

  // Handle close with state cleanup
  const handleClose = () => {
    modalState.closeModal();
    if (onClose) {
      onClose();
    }
  };

  // Error display component
  const ErrorDisplay = ({ error, onRetry, onDismiss }) => (
    <div className="text-center py-4">
      <div className="w-12 h-12 bg-red-600/20 rounded-full flex items-center justify-center mx-auto mb-4">
        <svg className="w-6 h-6 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      </div>
      
      <h4 className="text-lg font-semibold text-white mb-2">
        Terjadi Kesalahan
      </h4>
      
      <p className="text-gray-400 text-sm mb-6">
        {error}
      </p>

      <div className="flex gap-3 justify-center">
        {onRetry && (
          <button
            onClick={onRetry}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
          >
            Coba Lagi
          </button>
        )}
        <button
          onClick={onDismiss || handleClose}
          className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
        >
          Tutup
        </button>
      </div>
    </div>
  );

  return (
    <Modal
      {...modalProps}
      isOpen={modalState.isOpen}
      onClose={handleClose}
      loading={modalState.loading}
    >
      {modalState.hasError ? (
        <ErrorDisplay 
          error={modalState.error}
          onDismiss={modalState.clearError}
        />
      ) : (
        typeof children === 'function' 
          ? children(modalState)
          : children
      )}
    </Modal>
  );
};

// Hook to use with EnhancedModal
export const useEnhancedModal = (initialState = {}) => {
  return useModalState(initialState);
};

export default EnhancedModal;