import { useState, useEffect } from 'react';
import api from '../../services/api';
import toast from 'react-hot-toast';

const ModelSelector = ({ selectedModel, onModelChange, onUsageUpdate, className = '' }) => {
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

  const getTierColor = (tier) => {
    switch (tier) {
      case 'economy':
        return 'text-green-400';
      case 'standard':
        return 'text-blue-400';
      case 'premium':
        return 'text-purple-400';
      default:
        return 'text-gray-400';
    }
  };

  const getTierBadgeColor = (tier) => {
    switch (tier) {
      case 'economy':
        return 'bg-green-500/10 border-green-500/20 text-green-400';
      case 'standard':
        return 'bg-blue-500/10 border-blue-500/20 text-blue-400';
      case 'premium':
        return 'bg-purple-500/10 border-purple-500/20 text-purple-400';
      default:
        return 'bg-gray-500/10 border-gray-500/20 text-gray-400';
    }
  };

  const selectedModelData = models.find(m => m.name === selectedModel);

  if (isLoading) {
    return (
      <div className={`flex items-center gap-2 px-3 py-2 border rounded-lg ${className}`} 
           style={{ borderColor: 'rgba(255, 255, 255, 0.05)', backgroundColor: '#09090A' }}>
        <div className="w-4 h-4 border-2 border-gray-400/30 border-t-gray-400 rounded-full animate-spin"></div>
        <span className="text-sm text-gray-400">Loading models...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`flex items-center gap-2 px-3 py-2 border rounded-lg ${className}`}
           style={{ borderColor: 'rgba(255, 0, 0, 0.2)', backgroundColor: '#09090A' }}>
        <svg className="w-4 h-4 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <span className="text-sm text-red-400">Failed to load models</span>
      </div>
    );
  }

  return (
    <div className={`relative ${className}`}>
      {/* Selector Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between gap-3 px-4 py-2.5 border rounded-lg transition-all"
        style={{ 
          borderColor: 'rgba(255, 255, 255, 0.05)', 
          backgroundColor: '#09090A' 
        }}
        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#120C18'}
        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#09090A'}
      >
        <div className="flex items-center gap-3 flex-1 min-w-0">
          {/* AI Icon */}
          <svg className="w-5 h-5 text-purple-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
          </svg>
          
          {selectedModelData ? (
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <span className="text-sm text-white truncate">{selectedModelData.displayName}</span>
              <span className={`text-xs px-2 py-0.5 rounded border ${getTierBadgeColor(selectedModelData.tier)}`}>
                {selectedModelData.tier}
              </span>
              <span className={`text-xs ${selectedModelData.remaining > 0 ? 'text-gray-400' : 'text-red-400'}`}>
                {selectedModelData.remaining}/{selectedModelData.limit}
              </span>
            </div>
          ) : (
            <span className="text-sm text-gray-400">Select model</span>
          )}
        </div>
        
        {/* Dropdown Arrow */}
        <svg 
          className={`w-4 h-4 text-gray-400 transition-transform flex-shrink-0 ${isOpen ? 'rotate-180' : ''}`} 
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 z-40" 
            onClick={() => setIsOpen(false)}
          />
          
          {/* Menu */}
          <div 
            className="absolute top-full left-0 right-0 mt-2 border rounded-lg shadow-xl z-50 overflow-hidden"
            style={{ 
              borderColor: 'rgba(255, 255, 255, 0.05)', 
              backgroundColor: '#09090A' 
            }}
          >
            <div className="max-h-64 overflow-y-auto">
              {models.map((model) => {
                const isDisabled = model.remaining === 0;
                const isSelected = model.name === selectedModel;
                
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
                      w-full px-4 py-3 text-left transition-colors border-b
                      ${isDisabled ? 'opacity-50 cursor-not-allowed' : 'hover:bg-white/5 cursor-pointer'}
                      ${isSelected ? 'bg-white/10' : ''}
                    `}
                    style={{ borderColor: 'rgba(255, 255, 255, 0.05)' }}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`text-sm font-medium ${isDisabled ? 'text-gray-500' : 'text-white'}`}>
                            {model.displayName}
                          </span>
                          <span className={`text-xs px-2 py-0.5 rounded border ${getTierBadgeColor(model.tier)}`}>
                            {model.tier}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-xs">
                          <span className="text-gray-500">{model.provider}</span>
                          <span className="text-gray-600">•</span>
                          <span className={isDisabled ? 'text-red-400' : 'text-gray-400'}>
                            {model.remaining}/{model.limit} remaining
                          </span>
                        </div>
                      </div>
                      
                      {isSelected && (
                        <svg className="w-5 h-5 text-purple-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                      
                      {isDisabled && (
                        <svg className="w-5 h-5 text-red-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                        </svg>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default ModelSelector;
