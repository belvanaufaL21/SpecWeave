/**
 * Form Validation Hook for Modals
 * Provides real-time form validation with Indonesian error messages
 */

import { useState, useCallback, useRef } from 'react';

const useFormValidation = (initialValues = {}, validationRules = {}) => {
  const [values, setValues] = useState(initialValues);
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const validationTimeoutRef = useRef({});

  // Common validation rules
  const commonRules = {
    required: (value, fieldName) => {
      if (!value || (typeof value === 'string' && !value.trim())) {
        return `${fieldName} wajib diisi`;
      }
      return null;
    },
    
    email: (value) => {
      if (!value) return null;
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(value)) {
        return 'Format email tidak valid';
      }
      return null;
    },
    
    minLength: (min) => (value) => {
      if (!value) return null;
      if (value.length < min) {
        return `Minimal ${min} karakter`;
      }
      return null;
    },
    
    maxLength: (max) => (value) => {
      if (!value) return null;
      if (value.length > max) {
        return `Maksimal ${max} karakter`;
      }
      return null;
    },
    
    password: (value) => {
      if (!value) return null;
      const errors = [];
      
      if (value.length < 8) {
        errors.push('minimal 8 karakter');
      }
      if (!/[A-Z]/.test(value)) {
        errors.push('satu huruf besar');
      }
      if (!/[a-z]/.test(value)) {
        errors.push('satu huruf kecil');
      }
      if (!/\d/.test(value)) {
        errors.push('satu angka');
      }
      
      if (errors.length > 0) {
        return `Password harus mengandung ${errors.join(', ')}`;
      }
      return null;
    },
    
    url: (value) => {
      if (!value) return null;
      try {
        new URL(value);
        return null;
      } catch {
        return 'Format URL tidak valid';
      }
    },
    
    match: (fieldToMatch) => (value, allValues) => {
      if (!value) return null;
      if (value !== allValues[fieldToMatch]) {
        return 'Password tidak cocok';
      }
      return null;
    }
  };

  // Validate single field
  const validateField = useCallback((fieldName, value, allValues = values) => {
    const rules = validationRules[fieldName];
    if (!rules) return null;

    // Convert single rule to array
    const ruleArray = Array.isArray(rules) ? rules : [rules];

    for (const rule of ruleArray) {
      let error = null;

      if (typeof rule === 'function') {
        error = rule(value, allValues);
      } else if (typeof rule === 'string' && commonRules[rule]) {
        error = commonRules[rule](value, fieldName);
      } else if (typeof rule === 'object') {
        const { type, message, ...params } = rule;
        
        if (commonRules[type]) {
          if (Object.keys(params).length > 0) {
            // Rule with parameters (e.g., minLength: { type: 'minLength', min: 5 })
            const ruleFunction = commonRules[type](params[Object.keys(params)[0]]);
            error = ruleFunction(value, allValues);
          } else {
            error = commonRules[type](value, allValues);
          }
          
          // Override with custom message if provided
          if (error && message) {
            error = message;
          }
        }
      }

      if (error) {
        return error;
      }
    }

    return null;
  }, [validationRules, values]);

  // Validate all fields
  const validateAll = useCallback(() => {
    const newErrors = {};
    let isValid = true;

    Object.keys(validationRules).forEach(fieldName => {
      const error = validateField(fieldName, values[fieldName], values);
      if (error) {
        newErrors[fieldName] = error;
        isValid = false;
      }
    });

    setErrors(newErrors);
    return isValid;
  }, [validationRules, values, validateField]);

  // Handle field change with real-time validation
  const handleChange = useCallback((fieldName, value) => {
    setValues(prev => ({
      ...prev,
      [fieldName]: value
    }));

    // Clear previous timeout for this field
    if (validationTimeoutRef.current[fieldName]) {
      clearTimeout(validationTimeoutRef.current[fieldName]);
    }

    // Debounced validation
    validationTimeoutRef.current[fieldName] = setTimeout(() => {
      if (touched[fieldName]) {
        const error = validateField(fieldName, value, { ...values, [fieldName]: value });
        setErrors(prev => ({
          ...prev,
          [fieldName]: error
        }));
      }
    }, 300);
  }, [validateField, touched, values]);

  // Handle field blur
  const handleBlur = useCallback((fieldName) => {
    setTouched(prev => ({
      ...prev,
      [fieldName]: true
    }));

    // Validate immediately on blur
    const error = validateField(fieldName, values[fieldName], values);
    setErrors(prev => ({
      ...prev,
      [fieldName]: error
    }));
  }, [validateField, values]);

  // Handle form submission
  const handleSubmit = useCallback(async (onSubmit) => {
    setIsSubmitting(true);
    
    // Mark all fields as touched
    const allTouched = {};
    Object.keys(validationRules).forEach(fieldName => {
      allTouched[fieldName] = true;
    });
    setTouched(allTouched);

    // Validate all fields
    const isValid = validateAll();

    if (!isValid) {
      setIsSubmitting(false);
      return false;
    }

    try {
      await onSubmit(values);
      return true;
    } catch (error) {
      console.error('Form submission error:', error);
      return false;
    } finally {
      setIsSubmitting(false);
    }
  }, [validationRules, validateAll, values]);

  // Reset form
  const reset = useCallback((newValues = initialValues) => {
    setValues(newValues);
    setErrors({});
    setTouched({});
    setIsSubmitting(false);
    
    // Clear all validation timeouts
    Object.values(validationTimeoutRef.current).forEach(timeout => {
      clearTimeout(timeout);
    });
    validationTimeoutRef.current = {};
  }, [initialValues]);

  // Set field error manually
  const setFieldError = useCallback((fieldName, error) => {
    setErrors(prev => ({
      ...prev,
      [fieldName]: error
    }));
  }, []);

  // Clear field error
  const clearFieldError = useCallback((fieldName) => {
    setErrors(prev => {
      const newErrors = { ...prev };
      delete newErrors[fieldName];
      return newErrors;
    });
  }, []);

  // Get field props for easy integration
  const getFieldProps = useCallback((fieldName) => ({
    value: values[fieldName] || '',
    onChange: (e) => {
      const value = e.target ? e.target.value : e;
      handleChange(fieldName, value);
    },
    onBlur: () => handleBlur(fieldName),
    error: touched[fieldName] ? errors[fieldName] : null,
    hasError: Boolean(touched[fieldName] && errors[fieldName])
  }), [values, errors, touched, handleChange, handleBlur]);

  return {
    // State
    values,
    errors,
    touched,
    isSubmitting,
    
    // Computed
    isValid: Object.keys(errors).length === 0,
    hasErrors: Object.keys(errors).length > 0,
    
    // Actions
    handleChange,
    handleBlur,
    handleSubmit,
    reset,
    validateField,
    validateAll,
    setFieldError,
    clearFieldError,
    getFieldProps,
    
    // Utilities
    setValues,
    setIsSubmitting
  };
};

export default useFormValidation;