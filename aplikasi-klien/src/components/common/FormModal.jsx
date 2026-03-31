/**
 * Form Modal Component
 * Complete modal with form validation, state management, and consistent styling
 */

import EnhancedModal from './EnhancedModal';
import useFormValidation from '../../hooks/useFormValidation';
import { FormButton } from './FormField';

const FormModal = ({
  isOpen,
  onClose,
  onSubmit,
  title,
  children,
  initialValues = {},
  validationRules = {},
  submitButtonText = 'Simpan',
  cancelButtonText = 'Batal',
  showCancelButton = true,
  size = 'md',
  ...modalProps
}) => {
  const form = useFormValidation(initialValues, validationRules);

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const success = await form.handleSubmit(async (values) => {
      if (onSubmit) {
        await onSubmit(values, form);
      }
    });

    if (success && onClose) {
      onClose();
    }
  };

  // Handle modal close
  const handleClose = () => {
    form.reset();
    if (onClose) {
      onClose();
    }
  };

  // Reset form when modal opens
  const handleModalOpen = () => {
    form.reset(initialValues);
  };

  return (
    <EnhancedModal
      isOpen={isOpen}
      onClose={handleClose}
      onOpen={handleModalOpen}
      title={title}
      size={size}
      closeOnBackdrop={!form.isSubmitting}
      closeOnEscape={!form.isSubmitting}
      {...modalProps}
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Form Content */}
        <div className="space-y-4">
          {typeof children === 'function' ? children(form) : children}
        </div>

        {/* Form Actions */}
        <div className="flex gap-3 pt-4 border-t border-white/10">
          <FormButton
            type="submit"
            variant="primary"
            loading={form.isSubmitting}
            disabled={form.hasErrors}
            className="flex-1"
          >
            {submitButtonText}
          </FormButton>
          
          {showCancelButton && (
            <FormButton
              type="button"
              variant="ghost"
              onClick={handleClose}
              disabled={form.isSubmitting}
            >
              {cancelButtonText}
            </FormButton>
          )}
        </div>
      </form>
    </EnhancedModal>
  );
};

export default FormModal;