import { createContext, useContext } from 'react';
import { useConfirmation } from '../hooks/useConfirmation';
import ConfirmationModal from '../components/common/ConfirmationModal';

const ConfirmationContext = createContext();

export const useConfirmationContext = () => {
  const context = useContext(ConfirmationContext);
  if (!context) {
    throw new Error('useConfirmationContext must be used within a ConfirmationProvider');
  }
  return context;
};

export const ConfirmationProvider = ({ children }) => {
  const { confirmationState, showConfirmation, hideConfirmation } = useConfirmation();

  return (
    <ConfirmationContext.Provider value={{ showConfirmation }}>
      {children}
      <ConfirmationModal
        isOpen={confirmationState.isOpen}
        onClose={confirmationState.onCancel}
        onConfirm={confirmationState.onConfirm}
        title={confirmationState.title}
        message={confirmationState.message}
        confirmText={confirmationState.confirmText}
        cancelText={confirmationState.cancelText}
        type={confirmationState.type}
        icon={confirmationState.icon}
        details={confirmationState.details}
      />
    </ConfirmationContext.Provider>
  );
};