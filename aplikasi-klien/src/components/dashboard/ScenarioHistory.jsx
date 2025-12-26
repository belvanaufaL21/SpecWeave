import React, { useState, useEffect, useCallback } from 'react';
import { scenarioService } from '../../services/scenarioService';
import { useAuth } from '../../contexts/AuthContext';

const ScenarioHistory = () => {
  const { user } = useAuth();
  const [scenarios, setScenarios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0,
    hasNext: false,
    hasPrev: false
  });

  // Search and filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTags, setSelectedTags] = useState([]);
  const [qualityFilter, setQualityFilter] = useState('');
  const [sortBy, setSortBy] = useState('created_at');
  const [sortOrder, setSortOrder] = useState('desc');
  const [availableTags, setAvailableTags] = useState([]);

  // Load scenarios
  const loadScenarios = useCallback(async (options = {}) => {
    try {
      setLoading(true);
      setError(null);

      const searchOptions = {
        page: pagination.page,
        limit: pagination.limit,
        search: searchQuery,
        tags: selectedTags,
        qualityLevel: qualityFilter || null,
        sortBy,
        sortOrder,
        includePublic: false,
        ...options
      };

      const result = await scenarioService.getUserScenarios(searchOptions);

      if (result.success) {
        setScenarios(result.data.scenarios);
        setPagination(result.data.pagination);
      } else {
        setError(result.error);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [pagination.page, pagination.limit, searchQuery, selectedTags, qualityFilter, sortBy, sortOrder]);

  // Load available tags
  const loadTags = useCallback(async () => {
    try {
      const result = await scenarioService.getUserTags();
      if (result.success) {
        setAvailableTags(result.data);
      }
    } catch (err) {
      console.error('Error loading tags:', err);
    }
  }, []);

  // Initial load
  useEffect(() => {
    if (user) {
      loadScenarios();
      loadTags();
    }
  }, [user, loadScenarios, loadTags]);

  // Handle search
  const handleSearch = (e) => {
    e.preventDefault();
    setPagination(prev => ({ ...prev, page: 1 }));
    loadScenarios({ page: 1 });
  };

  // Handle pagination
  const handlePageChange = (newPage) => {
    setPagination(prev => ({ ...prev, page: newPage }));
    loadScenarios({ page: newPage });
  };

  // Handle tag selection
  const handleTagToggle = (tag) => {
    const newTags = selectedTags.includes(tag)
      ? selectedTags.filter(t => t !== tag)
      : [...selectedTags, tag];
    setSelectedTags(newTags);
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  // Handle quality filter
  const handleQualityFilter = (quality) => {
    setQualityFilter(quality);
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  // Handle sorting
  const handleSort = (field) => {
    const newOrder = sortBy === field && sortOrder === 'desc' ? 'asc' : 'desc';
    setSortBy(field);
    setSortOrder(newOrder);
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  // Handle scenario deletion
  const handleDeleteScenario = async (scenarioId) => {
    if (!window.confirm('Are you sure you want to delete this scenario?')) {
      return;
    }

    try {
      const result = await scenarioService.deleteScenario(scenarioId);
      if (result.success) {
        // Reload scenarios
        loadScenarios();
      } else {
        setError(result.error);
      }
    } catch (err) {
      setError(err.message);
    }
  };

  // Handle scenario sharing
  const handleToggleShare = async (scenarioId, currentIsPublic) => {
    try {
      const result = await scenarioService.shareScenario(scenarioId, !currentIsPublic);
      if (result.success) {
        // Update local state
        setScenarios(prev => prev.map(scenario => 
          scenario.id === scenarioId 
            ? { ...scenario, is_public: !currentIsPublic }
            : scenario
        ));
      } else {
        setError(result.error);
      }
    } catch (err) {
      setError(err.message);
    }
  };

  // Format date
  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Get quality badge color
  const getQualityBadgeColor = (quality) => {
    switch (quality) {
      case 'excellent': return 'bg-green-500/20 text-green-400 border-green-500/30';
      case 'good': return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
      case 'acceptable': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
      case 'poor': return 'bg-orange-500/20 text-orange-400 border-orange-500/30';
      case 'very_poor': return 'bg-red-500/20 text-red-400 border-red-500/30';
      default: return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
    }
  };

  if (loading && scenarios.length === 0) {
    return (
      <div className="bg-[#16161e] border border-white/10 rounded-xl p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-700 rounded mb-4"></div>
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-16 bg-gray-700 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#16161e] border border-white/10 rounded-xl p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-white">Scenario History</h3>
        <div className="text-sm text-gray-400">
          {pagination.total} scenario{pagination.total !== 1 ? 's' : ''}
        </div>
      </div>

      {/* Search and Filters */}
      <div className="mb-6 space-y-4">
        {/* Search Bar */}
        <form onSubmit={handleSearch} className="flex gap-2">
          <div className="flex-1">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search scenarios..."
              className="w-full px-4 py-2 bg-[#0a0a0f] border border-white/10 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-purple-500/50"
            />
          </div>
          <button
            type="submit"
            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
          >
            Search
          </button>
        </form>

        {/* Filters Row */}
        <div className="flex flex-wrap gap-4 items-center">
          {/* Quality Filter */}
          <select
            value={qualityFilter}
            onChange={(e) => handleQualityFilter(e.target.value)}
            className="px-3 py-1 bg-[#0a0a0f] border border-white/10 rounded text-white text-sm focus:outline-none focus:border-purple-500/50"
          >
            <option value="">All Quality Levels</option>
            <option value="excellent">Excellent</option>
            <option value="good">Good</option>
            <option value="acceptable">Acceptable</option>
            <option value="poor">Poor</option>
            <option value="very_poor">Very Poor</option>
          </select>

          {/* Sort Options */}
          <select
            value={`${sortBy}-${sortOrder}`}
            onChange={(e) => {
              const [field, order] = e.target.value.split('-');
              setSortBy(field);
              setSortOrder(order);
              setPagination(prev => ({ ...prev, page: 1 }));
            }}
            className="px-3 py-1 bg-[#0a0a0f] border border-white/10 rounded text-white text-sm focus:outline-none focus:border-purple-500/50"
          >
            <option value="created_at-desc">Newest First</option>
            <option value="created_at-asc">Oldest First</option>
            <option value="title-asc">Title A-Z</option>
            <option value="title-desc">Title Z-A</option>
            <option value="meteor_score-desc">Best Quality First</option>
            <option value="meteor_score-asc">Worst Quality First</option>
          </select>

          {/* Clear Filters */}
          {(searchQuery || selectedTags.length > 0 || qualityFilter) && (
            <button
              onClick={() => {
                setSearchQuery('');
                setSelectedTags([]);
                setQualityFilter('');
                setPagination(prev => ({ ...prev, page: 1 }));
              }}
              className="px-3 py-1 text-sm text-gray-400 hover:text-white transition-colors"
            >
              Clear Filters
            </button>
          )}
        </div>

        {/* Tags Filter */}
        {availableTags.length > 0 && (
          <div className="flex flex-wrap gap-2">
            <span className="text-sm text-gray-400 py-1">Tags:</span>
            {availableTags.map(tag => (
              <button
                key={tag}
                onClick={() => handleTagToggle(tag)}
                className={`px-2 py-1 text-xs rounded border transition-colors ${
                  selectedTags.includes(tag)
                    ? 'bg-purple-600/20 text-purple-400 border-purple-500/30'
                    : 'bg-gray-600/20 text-gray-400 border-gray-500/30 hover:border-gray-400/50'
                }`}
              >
                {tag}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Error Display */}
      {error && (
        <div className="mb-4 p-3 bg-red-500/20 border border-red-500/30 rounded-lg text-red-400 text-sm">
          {error}
        </div>
      )}

      {/* Scenarios List */}
      {scenarios.length === 0 ? (
        <div className="text-center py-12">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-500/20 flex items-center justify-center">
            <svg className="w-8 h-8 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <p className="text-gray-400 mb-4">
            {searchQuery || selectedTags.length > 0 || qualityFilter 
              ? 'No scenarios match your filters' 
              : 'No scenarios created yet'
            }
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {scenarios.map((scenario) => (
            <div
              key={scenario.id}
              className="p-4 bg-[#0a0a0f] border border-white/10 rounded-lg hover:border-white/20 transition-colors"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-2">
                    <h4 className="text-white font-medium truncate">{scenario.title}</h4>
                    {scenario.quality_level && (
                      <span className={`px-2 py-1 text-xs rounded border ${getQualityBadgeColor(scenario.quality_level)}`}>
                        {scenario.quality_level.replace('_', ' ')}
                      </span>
                    )}
                    {scenario.is_public && (
                      <span className="px-2 py-1 text-xs rounded border bg-blue-500/20 text-blue-400 border-blue-500/30">
                        Public
                      </span>
                    )}
                  </div>
                  
                  <p className="text-gray-400 text-sm mb-2 line-clamp-2">
                    {scenario.user_story}
                  </p>
                  
                  <div className="flex items-center gap-4 text-xs text-gray-500">
                    <span>{formatDate(scenario.created_at)}</span>
                    {scenario.meteor_score && (
                      <span>METEOR: {scenario.meteor_score.toFixed(2)}</span>
                    )}
                    {scenario.generation_time_ms && (
                      <span>{scenario.generation_time_ms}ms</span>
                    )}
                    {scenario.template?.name && (
                      <span>Template: {scenario.template.name}</span>
                    )}
                  </div>

                  {/* Tags */}
                  {scenario.tags && scenario.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {scenario.tags.map(tag => (
                        <span
                          key={tag}
                          className="px-2 py-1 text-xs rounded bg-gray-600/20 text-gray-400 border border-gray-500/30"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 ml-4">
                  <button
                    onClick={() => handleToggleShare(scenario.id, scenario.is_public)}
                    className="p-2 text-gray-400 hover:text-white transition-colors"
                    title={scenario.is_public ? 'Make Private' : 'Make Public'}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      {scenario.is_public ? (
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.367 2.684 3 3 0 00-5.367-2.684z" />
                      ) : (
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                      )}
                    </svg>
                  </button>
                  
                  <button
                    onClick={() => handleDeleteScenario(scenario.id)}
                    className="p-2 text-gray-400 hover:text-red-400 transition-colors"
                    title="Delete Scenario"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-between mt-6 pt-4 border-t border-white/10">
          <div className="text-sm text-gray-400">
            Page {pagination.page} of {pagination.totalPages}
          </div>
          
          <div className="flex items-center gap-2">
            <button
              onClick={() => handlePageChange(pagination.page - 1)}
              disabled={!pagination.hasPrev}
              className="px-3 py-1 text-sm bg-[#0a0a0f] border border-white/10 rounded text-white disabled:opacity-50 disabled:cursor-not-allowed hover:border-white/20 transition-colors"
            >
              Previous
            </button>
            
            <span className="px-3 py-1 text-sm text-gray-400">
              {pagination.page}
            </span>
            
            <button
              onClick={() => handlePageChange(pagination.page + 1)}
              disabled={!pagination.hasNext}
              className="px-3 py-1 text-sm bg-[#0a0a0f] border border-white/10 rounded text-white disabled:opacity-50 disabled:cursor-not-allowed hover:border-white/20 transition-colors"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {loading && scenarios.length > 0 && (
        <div className="text-center py-4">
          <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-purple-500"></div>
        </div>
      )}
    </div>
  );
};

export default ScenarioHistory;