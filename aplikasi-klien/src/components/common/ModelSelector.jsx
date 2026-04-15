import { useState, useEffect, useRef } from 'react';
import api from '../../services/api';

const RollingNumber = ({ value, className = '' }) => {
  const [displayValue, setDisplayValue] = useState(value);
  const [isAnimating, setIsAnimating] = useState(false);
  const prevValueRef = useRef(value);

  useEffect(() => {
    if (prevValueRef.current !== value) {
      setIsAnimating(true);
      const duration = 500;
      const steps = 20;
      const stepDuration = duration / steps;
      const diff = value - prevValueRef.current;
      const stepValue = diff / steps;
      let currentStep = 0;
      const interval = setInterval(() => {
        currentStep++;
        if (currentStep >= steps) {
          setDisplayValue(value);
          setIsAnimating(false);
          clearInterval(interval);
        } else {
          setDisplayValue(Math.round(prevValueRef.current + stepValue * currentStep));
        }
      }, stepDuration);
      prevValueRef.current = value;
      return () => clearInterval(interval);
    }
  }, [value]);

  return (
    <span className={`${className} ${isAnimating ? 'animate-pulse' : ''}`}>
      {displayValue}
    </span>
  );
};

const ModelSelector = ({
  selectedModel,
  onModelChange,
  onUsageUpdate,
  dropdownDirection = 'down',
  className = '',
  // refreshTrigger removed — use externalUsageInfo to push remaining updates without API call
  externalUsageInfo = null
}) => {
  const [models, setModels] = useState([]);
  const [isLoading, setIsLoading] = useState(false); // Changed to false - no loading state
  const [error, setError] = useState(null);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    fetchModels();
  }, []);

  // Update remaining count in-place from parent — no API call, no loading flash
  useEffect(() => {
    if (!externalUsageInfo || models.length === 0) return;
    setModels(prev =>
      prev.map(model =>
        model.name === externalUsageInfo.model
          ? { ...model, used: externalUsageInfo.used, remaining: externalUsageInfo.remaining, limit: externalUsageInfo.limit }
          : model
      )
    );
  }, [externalUsageInfo]);

  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (event) => {
      const dropdown = event.target.closest('.model-selector-dropdown');
      const button = event.target.closest('.model-selector-button');
      if (!dropdown && !button) setIsOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const fetchModels = async () => {
    try {
      // Fetch in background - no loading state
      setError(null);
      const response = await api.get('/usage/limits');
      if (response.data.success) {
        setModels(response.data.data.models);
        if (!selectedModel && response.data.data.models.length > 0) {
          const defaultModel =
            response.data.data.models.find(m => m.name === 'llama-3.1-8b-instant') ||
            response.data.data.models[0];
          onModelChange(defaultModel.name);
        }
        if (selectedModel && onUsageUpdate) {
          const currentModel = response.data.data.models.find(m => m.name === selectedModel);
          if (currentModel) {
            onUsageUpdate({
              model: currentModel.name,
              displayName: currentModel.displayName,
              provider: currentModel.provider,
              tier: currentModel.tier,
              used: currentModel.used,
              remaining: currentModel.remaining,
              limit: currentModel.limit
            });
          }
        }
      } else {
        throw new Error('Failed to fetch models');
      }
    } catch (err) {
      console.error('Error fetching models:', err);
      setError(err.message);
      // Silent error - no toast, just log
    }
  };

  const selectedModelData = models.find(m => m.name === selectedModel);

  // No loading state - show selector immediately
  // If error, show error state but still functional
  if (error && models.length === 0) {
    return (
      <div
        className={`flex items-center gap-2 px-3 py-2 border rounded-lg ${className}`}
        style={{ borderColor: 'rgba(255, 255, 255, 0.05)', backgroundColor: 'transparent' }}
      >
        <span className="text-xs text-gray-500">Error loading models</span>
      </div>
    );
  }

  return (
    <div className={`relative z-50 ${className}`}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="model-selector-button flex items-center gap-2 px-4 py-2 border rounded-lg transition-all group cursor-pointer"
        style={{ borderColor: 'rgba(255, 255, 255, 0.05)', backgroundColor: 'transparent' }}
        onMouseEnter={(e) => e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)'}
        onMouseLeave={(e) => e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.05)'}
        title={
          selectedModelData
            ? `${selectedModelData.displayName} • ${selectedModelData.remaining}/${selectedModelData.limit} remaining`
            : 'Select model'
        }
      >
        {selectedModelData ? (
          <>
            {/* Only show model name - no usage info */}
            <span className="text-sm text-white">{selectedModelData.displayName}</span>
          </>
        ) : (
          <span className="text-sm text-gray-500">Select model</span>
        )}
        <svg
          className={`w-3 h-3 text-gray-600 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div
          className={`model-selector-dropdown absolute left-0 right-0 border rounded-lg shadow-2xl z-50 overflow-hidden ${
            dropdownDirection === 'up' ? 'bottom-full mb-2' : 'top-full mt-2'
          }`}
          style={{
            borderColor: 'rgba(255, 255, 255, 0.05)',
            backgroundColor: '#09090A',
            minWidth: '200px'
          }}
        >
          {models.map((model, index) => {
            const isDisabled = model.remaining === 0;
            const isSelected = model.name === selectedModel;
            const isLast = index === models.length - 1;

            return (
              <button
                key={model.id}
                onClick={() => {
                  if (!isDisabled) {
                    onModelChange(model.name);
                    setIsOpen(false);
                    if (onUsageUpdate) {
                      onUsageUpdate({
                        model: model.name,
                        displayName: model.displayName,
                        provider: model.provider,
                        tier: model.tier,
                        used: model.used,
                        remaining: model.remaining,
                        limit: model.limit
                      });
                    }
                  }
                }}
                disabled={isDisabled}
                className={`
                  w-full px-4 py-2 text-left transition-colors
                  ${!isLast ? 'border-b' : ''}
                  ${isDisabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}
                `}
                style={{ borderColor: 'rgba(255, 255, 255, 0.05)', backgroundColor: 'transparent' }}
                onMouseEnter={(e) => { if (!isDisabled) e.currentTarget.style.backgroundColor = '#120C18'; }}
                onMouseLeave={(e) => { if (!isDisabled) e.currentTarget.style.backgroundColor = 'transparent'; }}
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="text-sm text-white mb-0.5">{model.displayName}</div>
                    <div className="text-sm text-gray-600">
                      <RollingNumber value={model.remaining} />/{model.limit} remaining
                    </div>
                  </div>
                  {isSelected && (
                    <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: '#C27AFF' }} />
                  )}
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default ModelSelector;