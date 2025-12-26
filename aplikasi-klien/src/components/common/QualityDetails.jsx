import React, { useState } from 'react';

const QualityDetails = ({ qualityMetrics, performanceMetrics }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  if (!qualityMetrics) return null;

  const getRecommendationIcon = (level) => {
    switch (level) {
      case 'excellent':
      case 'good':
        return (
          <svg className="w-4 h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      case 'acceptable':
        return (
          <svg className="w-4 h-4 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      case 'poor':
      case 'very_poor':
        return (
          <svg className="w-4 h-4 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        );
      default:
        return null;
    }
  };

  return (
    <div className="mt-4 border border-white/10 rounded-lg bg-white/[0.02] overflow-hidden">
      {/* Header - Always Visible */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-4 py-3 flex items-center justify-between hover:bg-white/[0.05] transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            {getRecommendationIcon(qualityMetrics.quality_level)}
            <span className="text-sm font-medium text-gray-200">
              Quality Assessment
            </span>
          </div>
          <div className="text-xs text-gray-400">
            METEOR: {(qualityMetrics.meteor_score * 100).toFixed(1)}%
          </div>
        </div>
        
        <svg 
          className={`w-4 h-4 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="px-4 pb-4 border-t border-white/5">
          {/* Quality Description */}
          <div className="mb-4">
            <h4 className="text-xs font-semibold text-gray-300 mb-2 uppercase tracking-wide">
              Quality Assessment
            </h4>
            <p className="text-sm text-gray-400 leading-relaxed">
              {qualityMetrics.quality_description}
            </p>
          </div>

          {/* Score Insight */}
          {qualityMetrics.score_insight && (
            <div className="mb-4">
              <h4 className="text-xs font-semibold text-gray-300 mb-2 uppercase tracking-wide">
                Analysis
              </h4>
              <p className="text-sm text-blue-300 leading-relaxed bg-blue-500/5 p-3 rounded-lg border border-blue-500/10">
                {qualityMetrics.score_insight}
              </p>
            </div>
          )}

          {/* Recommendation */}
          <div className="mb-4">
            <h4 className="text-xs font-semibold text-gray-300 mb-2 uppercase tracking-wide">
              Recommendation
            </h4>
            <p className="text-sm text-gray-400 leading-relaxed">
              {qualityMetrics.recommendation}
            </p>
            {qualityMetrics.details && (
              <p className="text-xs text-gray-500 mt-2 italic">
                {qualityMetrics.details}
              </p>
            )}
          </div>

          {/* Metrics Grid */}
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div className="bg-white/[0.03] rounded-lg p-3">
              <div className="text-xs text-gray-500 mb-1">METEOR Score</div>
              <div className="text-lg font-bold text-white">
                {(qualityMetrics.meteor_score * 100).toFixed(1)}%
              </div>
            </div>
            
            <div className="bg-white/[0.03] rounded-lg p-3">
              <div className="text-xs text-gray-500 mb-1">Quality Level</div>
              <div className="text-sm font-semibold text-white capitalize">
                {qualityMetrics.quality_level.replace('_', ' ')}
              </div>
            </div>

            {performanceMetrics && (
              <>
                <div className="bg-white/[0.03] rounded-lg p-3">
                  <div className="text-xs text-gray-500 mb-1">Generation Time</div>
                  <div className="text-lg font-bold text-white">
                    {performanceMetrics.generation_time_ms < 1000 
                      ? `${performanceMetrics.generation_time_ms}ms`
                      : `${(performanceMetrics.generation_time_ms / 1000).toFixed(1)}s`
                    }
                  </div>
                </div>

                <div className="bg-white/[0.03] rounded-lg p-3">
                  <div className="text-xs text-gray-500 mb-1">Threshold</div>
                  <div className={`text-sm font-semibold ${
                    qualityMetrics.meets_threshold ? 'text-green-400' : 'text-red-400'
                  }`}>
                    {qualityMetrics.meets_threshold ? '✓ Passed' : '✗ Failed'}
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Action Buttons */}
          {qualityMetrics.quality_level === 'poor' || qualityMetrics.quality_level === 'very_poor' ? (
            <div className="flex gap-2">
              <button className="flex-1 px-3 py-2 bg-purple-600 hover:bg-purple-700 text-white text-xs font-medium rounded-lg transition-colors">
                Regenerate Scenario
              </button>
              <button className="px-3 py-2 bg-white/10 hover:bg-white/20 text-gray-300 text-xs font-medium rounded-lg transition-colors">
                Manual Review
              </button>
            </div>
          ) : (
            <div className="text-center">
              <div className="inline-flex items-center gap-2 px-3 py-2 bg-green-500/10 text-green-400 text-xs font-medium rounded-lg border border-green-500/20">
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Scenario Ready to Use
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default QualityDetails;