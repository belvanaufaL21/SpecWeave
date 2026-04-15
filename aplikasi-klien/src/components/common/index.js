/**
 * Common Components Index
 * Exports all common components for easy importing
 */

// Shared utilities and components
export * from '../shared';
export * from '../../utils/shared';

// Modal Components
export { default as Modal } from './Modal';
export { default as EnhancedModal, useEnhancedModal } from './EnhancedModal';
export { default as FormModal } from './FormModal';

// Form Components
export { 
  FormInput, 
  FormTextarea, 
  FormSelect, 
  FormCheckbox, 
  FormButton 
} from './FormField';

// Hooks
export { default as useModalState } from '../../hooks/useModalState';
export { default as useFormValidation } from '../../hooks/useFormValidation';
export { default as useFocusTrap } from '../../hooks/useFocusTrap';

// Existing components (if they exist)
export { default as Button } from './Button';
export { default as Input } from './Input';
export { default as LoadingSpinner } from './LoadingSpinner';
export { default as AppLoader } from './AppLoader';
export { default as ErrorBoundary } from './ErrorBoundary';
export { default as ProgressIndicator } from './ProgressIndicator';
export { default as SkeletonLoader } from './SkeletonLoader';

// Testing Components
export { default as TestButton } from './TestButton';
export { default as ComparisonTable } from './ComparisonTable';

// METEOR Detail Components
export { default as CosineSimilarityTabs } from './CosineSimilarityTabs';

// Usage Components
export { default as ModelSelector } from './ModelSelector';
export { default as UsageIndicator } from './UsageIndicator';