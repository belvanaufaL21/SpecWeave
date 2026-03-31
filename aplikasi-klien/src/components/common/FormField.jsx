/**
 * Form Field Components for Modal Forms
 * Provides consistent styling and validation display for form inputs
 */

import { forwardRef } from 'react';

// Base Input Component
export const FormInput = forwardRef(({
  label,
  error,
  hasError,
  required = false,
  className = '',
  labelClassName = '',
  inputClassName = '',
  icon,
  ...props
}, ref) => {
  return (
    <div className={`space-y-1.5 ${className}`}>
      {label && (
        <label className={`text-xs font-semibold text-gray-400 ml-1 uppercase tracking-wider ${labelClassName}`}>
          {label}
          {required && <span className="text-red-400 ml-1">*</span>}
        </label>
      )}
      
      <div className="relative group">
        {icon && (
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
            <div className={`h-5 w-5 transition-colors duration-300 ${
              hasError 
                ? 'text-red-400' 
                : 'text-gray-500 group-focus-within:text-purple-400'
            }`}>
              {icon}
            </div>
          </div>
        )}
        
        <input
          ref={ref}
          className={`w-full ${icon ? 'pl-12' : 'pl-4'} pr-4 py-3.5 bg-[#050507] border rounded-xl text-white placeholder-gray-600 focus:outline-none focus:bg-[#0c0c12] transition-all duration-300 text-sm font-medium ${
            hasError 
              ? 'border-red-500/50 focus:border-red-500/50 focus:ring-2 focus:ring-red-500/20' 
              : 'border-white/10 focus:border-purple-500/50 focus:ring-2 focus:ring-purple-500/20'
          } ${inputClassName}`}
          {...props}
        />
      </div>
      
      {error && (
        <p className="text-red-400 text-xs mt-1 ml-1 animate-in slide-in-from-top-1 duration-200">
          {error}
        </p>
      )}
    </div>
  );
});

FormInput.displayName = 'FormInput';

// Textarea Component
export const FormTextarea = forwardRef(({
  label,
  error,
  hasError,
  required = false,
  className = '',
  labelClassName = '',
  textareaClassName = '',
  rows = 4,
  ...props
}, ref) => {
  return (
    <div className={`space-y-1.5 ${className}`}>
      {label && (
        <label className={`text-xs font-semibold text-gray-400 ml-1 uppercase tracking-wider ${labelClassName}`}>
          {label}
          {required && <span className="text-red-400 ml-1">*</span>}
        </label>
      )}
      
      <textarea
        ref={ref}
        rows={rows}
        className={`w-full px-4 py-3.5 bg-[#050507] border rounded-xl text-white placeholder-gray-600 focus:outline-none focus:bg-[#0c0c12] transition-all duration-300 text-sm font-medium resize-vertical ${
          hasError 
            ? 'border-red-500/50 focus:border-red-500/50 focus:ring-2 focus:ring-red-500/20' 
            : 'border-white/10 focus:border-purple-500/50 focus:ring-2 focus:ring-purple-500/20'
        } ${textareaClassName}`}
        {...props}
      />
      
      {error && (
        <p className="text-red-400 text-xs mt-1 ml-1 animate-in slide-in-from-top-1 duration-200">
          {error}
        </p>
      )}
    </div>
  );
});

FormTextarea.displayName = 'FormTextarea';

// Select Component
export const FormSelect = forwardRef(({
  label,
  error,
  hasError,
  required = false,
  className = '',
  labelClassName = '',
  selectClassName = '',
  options = [],
  placeholder = 'Pilih opsi...',
  ...props
}, ref) => {
  return (
    <div className={`space-y-1.5 ${className}`}>
      {label && (
        <label className={`text-xs font-semibold text-gray-400 ml-1 uppercase tracking-wider ${labelClassName}`}>
          {label}
          {required && <span className="text-red-400 ml-1">*</span>}
        </label>
      )}
      
      <div className="relative">
        <select
          ref={ref}
          className={`w-full px-4 py-3.5 bg-[#050507] border rounded-xl text-white focus:outline-none focus:bg-[#0c0c12] transition-all duration-300 text-sm font-medium appearance-none cursor-pointer ${
            hasError 
              ? 'border-red-500/50 focus:border-red-500/50 focus:ring-2 focus:ring-red-500/20' 
              : 'border-white/10 focus:border-purple-500/50 focus:ring-2 focus:ring-purple-500/20'
          } ${selectClassName}`}
          {...props}
        >
          {placeholder && (
            <option value="" disabled className="text-gray-600">
              {placeholder}
            </option>
          )}
          {options.map((option) => (
            <option 
              key={option.value} 
              value={option.value}
              className="bg-[#050507] text-white"
            >
              {option.label}
            </option>
          ))}
        </select>
        
        {/* Custom dropdown arrow */}
        <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none">
          <svg className={`h-5 w-5 transition-colors duration-300 ${
            hasError ? 'text-red-400' : 'text-gray-500'
          }`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </div>
      
      {error && (
        <p className="text-red-400 text-xs mt-1 ml-1 animate-in slide-in-from-top-1 duration-200">
          {error}
        </p>
      )}
    </div>
  );
});

FormSelect.displayName = 'FormSelect';

// Checkbox Component
export const FormCheckbox = forwardRef(({
  label,
  error,
  hasError,
  className = '',
  labelClassName = '',
  checkboxClassName = '',
  ...props
}, ref) => {
  return (
    <div className={`space-y-1.5 ${className}`}>
      <div className="flex items-start gap-3">
        <input
          ref={ref}
          type="checkbox"
          className={`mt-1 w-4 h-4 bg-[#050507] border border-white/10 rounded focus:outline-none focus:ring-2 focus:ring-purple-500/20 text-purple-600 ${checkboxClassName}`}
          {...props}
        />
        {label && (
          <label className={`text-sm text-gray-300 cursor-pointer ${labelClassName}`}>
            {label}
          </label>
        )}
      </div>
      
      {error && (
        <p className="text-red-400 text-xs mt-1 ml-1 animate-in slide-in-from-top-1 duration-200">
          {error}
        </p>
      )}
    </div>
  );
});

FormCheckbox.displayName = 'FormCheckbox';

// Form Button Component
export const FormButton = ({
  children,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  className = '',
  ...props
}) => {
  const baseClasses = 'font-semibold rounded-xl transition-all duration-300 transform active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-transparent disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none';
  
  const variants = {
    primary: 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg shadow-purple-500/30 hover:shadow-purple-500/50 hover:opacity-90 hover:-translate-y-0.5 focus:ring-purple-500/50 border border-white/10',
    secondary: 'bg-white/10 text-white border border-white/20 hover:bg-white/20 focus:ring-white/50',
    danger: 'bg-gradient-to-r from-red-600 to-red-700 text-white shadow-lg shadow-red-500/30 hover:shadow-red-500/50 hover:opacity-90 hover:-translate-y-0.5 focus:ring-red-500/50',
    ghost: 'text-gray-400 hover:text-white hover:bg-white/5 focus:ring-white/20'
  };
  
  const sizes = {
    sm: 'px-3 py-2 text-sm',
    md: 'px-4 py-3 text-sm',
    lg: 'px-6 py-3.5 text-base'
  };

  return (
    <button
      className={`${baseClasses} ${variants[variant]} ${sizes[size]} ${className}`}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <div className="flex items-center justify-center">
          <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2"></div>
          Loading...
        </div>
      ) : (
        children
      )}
    </button>
  );
};