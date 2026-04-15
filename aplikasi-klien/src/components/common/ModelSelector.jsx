import { useState, useEffect } from 'react';
import api from '../../services/api';
import toast from 'react-hot-toast';

const ModelSelector = ({ selectedModel, onModelChange, onUsageUpdate, dropdownDirection = 'down', className = '' }) => {
  const [models, setModels] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    fetchModels();
  }, []);

  const fetchModels = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const response = await api.get('/usage/limits');
      
      if (response.data.success) {
        setModels(response.data.data.models);
        
        // Set default model if none selected
        if (!selectedModel && response.data.data.models.length > 0) {
          const defaultModel = response.data.data.models.find(m => m.name === 'llama-3.1-8b-instant') 
            || response.data.data.models[0];
          onModelChange(defaultModel.name);
        }
        
        // Update usage info for currently selected model
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
      toast.error('Failed to load available models');
    } finally {
      setIsLoading(false);
    }
  };

  const selectedModelData = models.find(m => m.name === selectedModel);

  if (isLoading) {
    return (
      <div className={`flex items-center gap-2 px-3 py-2 border rounded-lg ${className}`} 
           style={{ borderColor: 'rgba(255, 255, 255, 0.05)', backgroundColor: 'transparent' }}>
        <div className="w-3 h-3 border border-gray-600 border-t-gray-400 rounded-full animate-spin"></div>
        <span className="text-xs text-gray-500">Loading...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`flex items-center gap-2 px-3 py-2 border rounded-lg ${className}`}
           style={{ borderColor: 'rgba(255, 255, 255, 0.05)', backgroundColor: 'transparent' }}>
        <span className="text-xs text-gray-500">Error loading models</span>
      </div>
    );
  }

  return (
    <div className={`relative ${className}`}>
      {/* Minimalist Selector Button - Match height with other buttons */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2.5 border rounded-lg transition-all group"
        style={{ 
          borderColor: 'rgba(255, 255, 255, 0.05)', 
          backgroundColor: 'transparent' 
        }}
        onMouseEnter={(e) => e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)'}
        onMouseLeave={(e) => e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.05)'}
        title={selectedModelData ? `${selectedModelData.displayName} • ${selectedModelData.remaining}/${selectedModelData.limit} remaining` : 'Select model'}
      >
        {selectedModelData ? (
          <>
            {/* Model name - subtle */}
            <span className="text-xs text-gray-400 group-hover:text-gray-300 transition-colors">
              {selectedModelData.displayName}
            </span>
            
            {/* Quota - minimal indicator */}
            <span className="text-xs text-gray-600">
              {selectedModelData.remaining}/{selectedModelData.limit}
            </span>
          </>
        ) : (
          <span className="text-xs text-gray-500">Select model</span>
        )}
        
        {/* Subtle dropdown arrow */}
        <svg 
          className={`w-3 h-3 text-gray-600 transition-transform ${isOpen ? 'rotate-180' : ''}`} 
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Clean Dropdown Menu - Direction based on prop */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 z-40" 
            onClick={() => setIsOpen(false)}
          />
          
          {/* Menu - positioned based on dropdownDirection prop */}
          <div 
            className={`absolute left-0 right-0 border rounded-lg shadow-2xl z-50 overflow-hidden ${
              dropdownDirection === 'up' ? 'bottom-full mb-1' : 'top-full mt-1'
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
                      
                      // Update usage info when model changes
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
                    w-full px-3 py-2.5 text-left transition-colors
                    ${!isLast ? 'border-b' : ''}
                    ${isDisabled ? 'opacity-40 cursor-not-allowed' : 'hover:bg-white/5 cursor-pointer'}
                    ${isSelected ? 'bg-white/5' : ''}
                  `}
                  style={{ borderColor: 'rgba(255, 255, 255, 0.05)' }}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      {/* Model name */}
                      <div className="text-xs text-white mb-0.5">
                        {model.displayName}
                      </div>
                      
                      {/* Quota - subtle */}
                      <div className="text-xs text-gray-600">
                        {model.remaining}/{model.limit} remaining
                      </div>
                    </div>
                    
                    {/* Selected indicator - minimal */}
                    {isSelected && (
                      <div className="w-1.5 h-1.5 rounded-full bg-white flex-shrink-0" />
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
};

export default ModelSelector;
