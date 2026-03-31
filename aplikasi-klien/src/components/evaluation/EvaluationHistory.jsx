import { useState, useEffect } from 'react';
import EvaluationService from '../../services/evaluationService.js';

const EvaluationHistory = () => {
  const [evaluationHistory, setEvaluationHistory] = useState([]);
  const [userSummary, setUserSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedTimeRange, setSelectedTimeRange] = useState('all');

  useEffect(() => {
    loadEvaluationData();
  }, []);

  const loadEvaluationData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Load both history and summary
      const [historyResult, summaryResult] = await Promise.all([
        EvaluationService.getEvaluationHistory(100),
        EvaluationService.getUserEvaluationSummary()
      ]);
      
      if (historyResult.success) {
        setEvaluationHistory(historyResult.data);
      } else {
        throw new Error(historyResult.error);
      }
      
      if (summaryResult.success) {
        setUserSummary(summaryResult.data);
      } else {
        console.warn('Failed to load user summary:', summaryResult.error);
      }
    } catch (error) {
      console.error('Error loading evaluation data:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const getQualityColor = (qualityLevel) => {
    return EvaluationService.getQualityColor(qualityLevel);
  };

  const getScoreColor = (score) => {
    if (score >= 0.8) return 'text-green-400';
    if (score >= 0.6) return 'text-blue-400';
    if (score >= 0.4) return 'text-yellow-400';
    if (score >= 0.2) return 'text-orange-400';
    return 'text-red-400';
  };

  const getTrendIcon = (trend) => {
    switch (trend) {
      case 'improving':
        return (
          <svg className="w-4 h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
          </svg>
        );
      case 'declining':
        return (
          <svg className="w-4 h-4 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" />
          </svg>
        );
      case 'stable':
        return (
          <svg className="w-4 h-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
          </svg>
        );
      default:
        return (
          <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-center">
        <div className="w-8 h-8 border-2 border-purple-400 border-t-transparent rounded-full animate-spin mb-4" />
        <h3 className="text-lg font-semibold text-white mb-2">Loading Evaluation History</h3>
        <p className="text-gray-400 text-sm">Fetching your METEOR evaluation data...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-center">
        <div className="w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center mb-4">
          <svg className="w-8 h-8 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h3 className="text-lg font-semibold text-white mb-2">Error Loading Data</h3>
        <p className="text-gray-400 text-sm mb-4">{error}</p>
        <button
          onClick={loadEvaluationData}
          className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
        >
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">Evaluation History</h2>
          <p className="text-gray-400 text-sm mt-1">
            Track your METEOR evaluation results and performance trends
          </p>
        </div>
        <button
          onClick={loadEvaluationData}
          className="px-4 py-2 bg-purple-600/20 hover:bg-purple-600/30 border border-purple-500/30 rounded-lg text-purple-300 transition-colors"
        >
          <svg className="w-4 h-4 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Refresh
        </button>
      </div>

      {/* Summary Cards */}
      {userSummary && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-gradient-to-br from-purple-500/20 to-pink-500/20 border border-purple-500/30 rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-gray-300">Total Evaluations</h3>
              <svg className="w-5 h-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 002 2h2a2 2 0 002-2z" />
              </svg>
            </div>
            <div className="text-2xl font-bold text-white">{userSummary.total_evaluations}</div>
          </div>

          <div className="bg-gradient-to-br from-blue-500/20 to-cyan-500/20 border border-blue-500/30 rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-gray-300">Average Score</h3>
              <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <div className={`text-2xl font-bold ${getScoreColor(userSummary.average_score)}`}>
              {(userSummary.average_score * 100).toFixed(1)}%
            </div>
          </div>

          <div className="bg-gradient-to-br from-green-500/20 to-emerald-500/20 border border-green-500/30 rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-gray-300">Best Score</h3>
              <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3l14 9-14 9V3z" />
              </svg>
            </div>
            <div className={`text-2xl font-bold ${getScoreColor(userSummary.best_score)}`}>
              {(userSummary.best_score * 100).toFixed(1)}%
            </div>
          </div>

          <div className="bg-gradient-to-br from-yellow-500/20 to-orange-500/20 border border-yellow-500/30 rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-gray-300">Trend</h3>
              {getTrendIcon(userSummary.recent_trend)}
            </div>
            <div className="text-lg font-bold text-white capitalize">
              {userSummary.recent_trend.replace('_', ' ')}
            </div>
          </div>
        </div>
      )}

      {/* Quality Distribution */}
      {userSummary && userSummary.quality_distribution && (
        <div className="bg-white/5 border border-white/10 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Quality Distribution</h3>
          <div className="grid grid-cols-5 gap-4">
            {Object.entries(userSummary.quality_distribution).map(([quality, count]) => (
              <div key={quality} className="text-center">
                <div 
                  className="w-full h-20 rounded-lg mb-2 flex items-end justify-center"
                  style={{ backgroundColor: getQualityColor(quality) + '20' }}
                >
                  <div 
                    className="w-full rounded-lg transition-all duration-500"
                    style={{ 
                      height: `${Math.max(10, (count / Math.max(...Object.values(userSummary.quality_distribution))) * 100)}%`,
                      backgroundColor: getQualityColor(quality)
                    }}
                  />
                </div>
                <div className="text-xs text-gray-400 capitalize">{quality.replace('_', ' ')}</div>
                <div className="text-sm font-semibold text-white">{count}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Evaluation History List */}
      <div className="bg-white/5 border border-white/10 rounded-xl overflow-hidden">
        <div className="p-6 border-b border-white/10">
          <h3 className="text-lg font-semibold text-white">Recent Evaluations</h3>
        </div>
        
        {evaluationHistory.length === 0 ? (
          <div className="p-8 text-center">
            <div className="w-16 h-16 rounded-2xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 002 2h2a2 2 0 002-2z" />
              </svg>
            </div>
            <h4 className="text-base font-medium text-white mb-2">No Evaluations Yet</h4>
            <p className="text-sm text-gray-400">
              Start testing scenarios to see your evaluation history here.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-white/10">
            {evaluationHistory.map((evaluation) => (
              <div key={evaluation.id} className="p-4 hover:bg-white/5 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <div 
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: getQualityColor(evaluation.quality_level) }}
                      />
                      <span className="text-sm font-medium text-white">
                        {evaluation.scenarios?.title || `Scenario ${evaluation.scenario_id}`}
                      </span>
                      <span className="px-2 py-1 bg-white/10 rounded-full text-xs text-gray-300">
                        {evaluation.reference_type?.replace('_', ' ')}
                      </span>
                    </div>
                    
                    <div className="flex items-center gap-4 text-xs text-gray-400">
                      <span>{formatDate(evaluation.created_at)}</span>
                      <span>Generation: {evaluation.generation_time_ms}ms</span>
                      {evaluation.scenarios?.feature_name && (
                        <span>Feature: {evaluation.scenarios.feature_name}</span>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <div className={`text-lg font-bold ${getScoreColor(evaluation.meteor_score)}`}>
                        {(evaluation.meteor_score * 100).toFixed(1)}%
                      </div>
                      <div className="text-xs text-gray-400 capitalize">
                        {evaluation.quality_level.replace('_', ' ')}
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-3 gap-2 text-xs">
                      <div className="text-center">
                        <div className="text-blue-400 font-semibold">
                          {(evaluation.precision_score * 100).toFixed(0)}%
                        </div>
                        <div className="text-gray-500">P</div>
                      </div>
                      <div className="text-center">
                        <div className="text-green-400 font-semibold">
                          {(evaluation.recall_score * 100).toFixed(0)}%
                        </div>
                        <div className="text-gray-500">R</div>
                      </div>
                      <div className="text-center">
                        <div className="text-purple-400 font-semibold">
                          {(evaluation.fmean_score * 100).toFixed(0)}%
                        </div>
                        <div className="text-gray-500">F</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default EvaluationHistory;