import React from 'react';
import { useLoading, PROGRESS_TYPES } from '../../contexts/LoadingContext';

/**
 * Linear progress bar component
 */
export const LinearProgress = ({ 
  value = 0, 
  max = 100, 
  className = '',
  variant = 'default',
  size = 'md',
  showPercentage = false,
  animated = true
}) => {
  const percentage = Math.min(Math.max((value / max) * 100, 0), 100);
  
  const sizeClasses = {
    sm: 'h-1',
    md: 'h-2',
    lg: 'h-3'
  };

  const variants = {
    default: 'from-purple-500 to-pink-500',
    success: 'from-green-500 to-emerald-500',
    warning: 'from-yellow-500 to-orange-500',
    error: 'from-red-500 to-rose-500',
    info: 'from-blue-500 to-cyan-500'
  };

  return (
    <div className={`w-full ${className}`}>
      <div className={`bg-white/10 rounded-full overflow-hidden ${sizeClasses[size]}`}>
        <div 
          className={`h-full bg-gradient-to-r ${variants[variant]} transition-all duration-300 ${animated ? 'animate-pulse' : ''}`}
          style={{ width: `${percentage}%` }}
        />
      </div>
      {showPercentage && (
        <div className="text-xs text-gray-400 mt-1 text-center">
          {Math.round(percentage)}%
        </div>
      )}
    </div>
  );
};

/**
 * Circular progress indicator
 */
export const CircularProgress = ({ 
  value = 0, 
  max = 100, 
  size = 'md',
  className = '',
  variant = 'default',
  showPercentage = false,
  strokeWidth = 2
}) => {
  const percentage = Math.min(Math.max((value / max) * 100, 0), 100);
  
  const sizes = {
    sm: { width: 24, height: 24, radius: 10 },
    md: { width: 32, height: 32, radius: 14 },
    lg: { width: 48, height: 48, radius: 22 },
    xl: { width: 64, height: 64, radius: 30 }
  };

  const colors = {
    default: '#8b5cf6', // purple-500
    success: '#10b981', // emerald-500
    warning: '#f59e0b', // amber-500
    error: '#ef4444', // red-500
    info: '#3b82f6' // blue-500
  };

  const { width, height, radius } = sizes[size];
  const circumference = 2 * Math.PI * radius;
  const strokeDasharray = circumference;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  return (
    <div className={`relative inline-flex items-center justify-center ${className}`}>
      <svg width={width} height={height} className="transform -rotate-90">
        {/* Background circle */}
        <circle
          cx={width / 2}
          cy={height / 2}
          r={radius}
          stroke="rgba(255, 255, 255, 0.1)"
          strokeWidth={strokeWidth}
          fill="none"
        />
        {/* Progress circle */}
        <circle
          cx={width / 2}
          cy={height / 2}
          r={radius}
          stroke={colors[variant]}
          strokeWidth={strokeWidth}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={strokeDasharray}
          strokeDashoffset={strokeDashoffset}
          className="transition-all duration-300"
        />
      </svg>
      {showPercentage && (
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-xs font-medium text-white">
            {Math.round(percentage)}%
          </span>
        </div>
      )}
    </div>
  );
};

/**
 * Step progress indicator
 */
export const StepProgress = ({ 
  steps = [], 
  currentStep = 0, 
  className = '',
  variant = 'default'
}) => {
  const variants = {
    default: {
      active: 'bg-purple-500 border-purple-500',
      completed: 'bg-green-500 border-green-500',
      pending: 'bg-white/10 border-white/20'
    },
    minimal: {
      active: 'bg-white border-white',
      completed: 'bg-green-500 border-green-500',
      pending: 'bg-white/10 border-white/20'
    }
  };

  const getStepStatus = (index) => {
    if (index < currentStep) return 'completed';
    if (index === currentStep) return 'active';
    return 'pending';
  };

  return (
    <div className={`flex items-center ${className}`}>
      {steps.map((step, index) => {
        const status = getStepStatus(index);
        const isLast = index === steps.length - 1;
        
        return (
          <div key={index} className="flex items-center">
            {/* Step circle */}
            <div className="flex items-center">
              <div 
                className={`w-8 h-8 rounded-full border-2 flex items-center justify-center transition-all duration-300 ${variants[variant][status]}`}
              >
                {status === 'completed' ? (
                  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  <span className="text-xs font-medium text-white">
                    {index + 1}
                  </span>
                )}
              </div>
              
              {/* Step label */}
              <div className="ml-3">
                <div className={`text-sm font-medium ${status === 'active' ? 'text-white' : status === 'completed' ? 'text-green-400' : 'text-gray-400'}`}>
                  {step.title || `Step ${index + 1}`}
                </div>
                {step.description && (
                  <div className="text-xs text-gray-500 mt-1">
                    {step.description}
                  </div>
                )}
              </div>
            </div>
            
            {/* Connector line */}
            {!isLast && (
              <div className={`flex-1 h-0.5 mx-4 ${status === 'completed' ? 'bg-green-500' : 'bg-white/20'} transition-colors duration-300`} />
            )}
          </div>
        );
      })}
    </div>
  );
};

/**
 * Indeterminate loading indicator (spinner)
 */
export const SpinnerProgress = ({ 
  size = 'md', 
  className = '',
  variant = 'default'
}) => {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8',
    xl: 'w-12 h-12'
  };

  const variants = {
    default: 'border-purple-500/30 border-t-purple-500',
    light: 'border-white/30 border-t-white',
    dark: 'border-gray-600/30 border-t-gray-600'
  };

  return (
    <div className={`${sizeClasses[size]} border-2 ${variants[variant]} rounded-full animate-spin ${className}`} />
  );
};

/**
 * Progress indicator that automatically adapts based on loading context
 */
export const AdaptiveProgress = ({ 
  loadingType,
  className = '',
  showMessage = true,
  showProgress = true
}) => {
  const { getLoadingState, getProgressState } = useLoading();
  
  const loadingState = getLoadingState(loadingType);
  const progressState = getProgressState(loadingType);

  if (!loadingState.isLoading) {
    return null;
  }

  const renderProgress = () => {
    if (!showProgress) return null;

    switch (progressState.type) {
      case PROGRESS_TYPES.DETERMINATE:
        return (
          <LinearProgress 
            value={progressState.value || 0}
            max={progressState.max || 100}
            variant={progressState.variant || 'default'}
            showPercentage={progressState.showPercentage}
          />
        );
      
      case PROGRESS_TYPES.STEPPED:
        return (
          <StepProgress 
            steps={progressState.steps || []}
            currentStep={progressState.currentStep || 0}
            variant={progressState.variant || 'default'}
          />
        );
      
      default:
        return <SpinnerProgress variant={progressState.variant || 'default'} />;
    }
  };

  return (
    <div className={`flex flex-col items-center gap-3 ${className}`}>
      {renderProgress()}
      {showMessage && loadingState.message && (
        <div className="text-sm text-gray-400 text-center">
          {loadingState.message}
        </div>
      )}
      {loadingState.estimatedTime && (
        <div className="text-xs text-gray-500 text-center">
          Estimasi: {loadingState.estimatedTime}
        </div>
      )}
    </div>
  );
};

export default {
  LinearProgress,
  CircularProgress,
  StepProgress,
  SpinnerProgress,
  AdaptiveProgress
};