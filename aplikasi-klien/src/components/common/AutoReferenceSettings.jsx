import { useState, useEffect } from 'react';
import { 
  isAutoReferenceEnabled, 
  setAutoReferenceEnabled, 
  getReferenceStats, 
  refreshReferencePatterns 
} from '../../services/EnhancedSpecWeaveService';

/**
 * Component untuk mengelola settings auto reference system
 */
const AutoReferenceSettings = ({ isOpen, onClose }) => {
  const [isEnabled, setIsEnabled] = useState(true);
  const [stats, setStats] = useState(null);
  const [isLoadingStats, setIsLoadingStats] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (isOpen) {
      loadSettings();
      loadStats();
    }
  }, [isOpen]);

  const loadSettings = () => {
    const enabled = isAutoReferenceEnabled();
    setIsEnabled(enabled);
  };

  const loadStats = async () => {
    setIsLoadingStats(true);
    setError(null);
    
    try {
      const result = await getReferenceStats();
      if (result.success) {
        setStats(result.data);
      } else {
        setError(result.error);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoadingStats(false);
    }
  };

  const handleToggleEnabled = (enabled) => {
    setIsEnabled(enabled);
    setAutoReferenceEnabled(enabled);
    console.log(`Auto reference ${enabled ? 'enabled' : 'disabled'}`);
  };

  const handleRefreshPatterns = async () => {
    setIsRefreshing(true);
    setError(null);
    
    try {
      const result = await refreshReferencePatterns();
      if (result.success) {
        await loadStats(); // Reload stats after refresh
        console.log('Patterns refreshed successfully');
      } else {
        setError(result.error);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setIsRefreshing(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-[#16161e] border border-white/10 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-white/10">
          <div>
            <h2 className="text-xl font-bold text-white">Auto Reference Settings</h2>
            <p className="text-gray-400 text-sm mt-1">
              Configure automatic reference pattern analysis
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-white transition-colors rounded-lg hover:bg-white/5"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Enable/Disable Toggle */}
          <div className="flex items-center justify-between p-4 bg-white/5 border border-white/10 rounded-lg">
            <div>
              <h3 className="text-lg font-semibold text-white">Enable Auto Reference</h3>
              <p className="text-sm text-gray-400 mt-1">
                Automatically analyze reference patterns when generating Gherkin scenarios
              </p>
            </div>
            <button
              onClick={() => handleToggleEnabled(!isEnabled)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                isEnabled ? 'bg-green-600' : 'bg-gray-600'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  isEnabled ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          {/* Statistics */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-white">Pattern Statistics</h3>
              <button
                onClick={handleRefreshPatterns}
                disabled={isRefreshing}
                className="flex items-center gap-2 px-3 py-1 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-600/50 text-white text-sm rounded-lg transition-colors"
              >
                <svg 
                  className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} 
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                {isRefreshing ? 'Refreshing...' : 'Refresh'}
              </button>
            </div>

            {error && (
              <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                <div className="flex items-center gap-2">
                  <svg className="w-4 h-4 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="text-sm text-red-400">Error: {error}</span>
                </div>
              </div>
            )}

            {isLoadingStats ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full"></div>
              </div>
            ) : stats ? (
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-white/5 border border-white/10 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-purple-600/20 border border-purple-600/30 rounded-lg flex items-center justify-center">
                      <svg className="w-5 h-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-white">{stats.totalPatterns}</div>
                      <div className="text-sm text-gray-400">Total Patterns</div>
                    </div>
                  </div>
                </div>

                <div className="p-4 bg-white/5 border border-white/10 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-green-600/20 border border-green-600/30 rounded-lg flex items-center justify-center">
                      <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                      </svg>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-white">{stats.categoryPatterns}</div>
                      <div className="text-sm text-gray-400">Category Patterns</div>
                    </div>
                  </div>
                </div>

                <div className="p-4 bg-white/5 border border-white/10 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-600/20 border border-blue-600/30 rounded-lg flex items-center justify-center">
                      <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                      </svg>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-white">{stats.structurePatterns}</div>
                      <div className="text-sm text-gray-400">Structure Patterns</div>
                    </div>
                  </div>
                </div>

                <div className="p-4 bg-white/5 border border-white/10 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-orange-600/20 border border-orange-600/30 rounded-lg flex items-center justify-center">
                      <svg className="w-5 h-5 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2h-2a2 2 0 00-2 2z" />
                      </svg>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-white">{stats.averageWeight.toFixed(1)}</div>
                      <div className="text-sm text-gray-400">Avg Weight</div>
                    </div>
                  </div>
                </div>
              </div>
            ) : null}

            {stats && stats.categories && stats.categories.length > 0 && (
              <div className="p-4 bg-white/5 border border-white/10 rounded-lg">
                <h4 className="text-sm font-semibold text-white mb-3">Available Categories</h4>
                <div className="flex flex-wrap gap-2">
                  {stats.categories.map((category, index) => (
                    <span 
                      key={index}
                      className="px-2 py-1 bg-purple-600/20 border border-purple-600/30 text-purple-300 text-xs rounded-lg"
                    >
                      {category}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* How it works */}
          <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <h4 className="text-sm font-semibold text-blue-400">How Auto Reference Works</h4>
            </div>
            <div className="text-sm text-blue-300 space-y-2">
              <p>1. <strong>Pattern Analysis:</strong> System analyzes all references in your library to identify common patterns</p>
              <p>2. <strong>Smart Selection:</strong> When you input a user story, relevant patterns are automatically selected</p>
              <p>3. <strong>Enhanced Generation:</strong> LLM uses these patterns to generate more accurate Gherkin scenarios</p>
              <p>4. <strong>No Manual Selection:</strong> No need to manually choose references - it's all automatic!</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AutoReferenceSettings;