import React from 'react';

const QualityBadge = ({ qualityMetrics, performanceMetrics }) => {
  if (!qualityMetrics) return null;

  const getQualityColor = (level) => {
    switch (level) {
      case 'excellent':
        return 'from-green-500 to-emerald-500 border-green-500/30 text-green-100';
      case 'good':
        return 'from-blue-500 to-cyan-500 border-blue-500/30 text-blue-100';
      case 'acceptable':
        return 'from-yellow-500 to-orange-500 border-yellow-500/30 text-yellow-100';
      case 'poor':
        return 'from-orange-500 to-red-500 border-orange-500/30 text-orange-100';
      case 'very_poor':
        return 'from-red-500 to-red-600 border-red-500/30 text-red-100';
      default:
        return 'from-gray-500 to-gray-600 border-gray-500/30 text-gray-100';
    }
  };

  const getQualityIcon = (level) => {
    switch (level) {
      case 'excellent':
        return (
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      case 'good':
        return (
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        );
      case 'acceptable':
        return (
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        );
      case 'poor':
      case 'very_poor':
        return (
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      default:
        return (
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
    }
  };

  const formatTime = (ms) => {
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
  };

  const colorClasses = getQualityColor(qualityMetrics.quality_level);

  return (
    <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
      {/* Quality Badge */}
      <div className={`
        inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full 
        bg-gradient-to-r ${colorClasses} 
        border backdrop-blur-sm shadow-sm
      `}>
        {getQualityIcon(qualityMetrics.quality_level)}
        <span className="font-medium capitalize">
          {qualityMetrics.quality_level}
        </span>
        <span className="opacity-75">
          {(qualityMetrics.meteor_score * 100).toFixed(0)}%
        </span>
      </div>

      {/* Performance Badge */}
      {performanceMetrics && (
        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-gray-500/10 border border-gray-500/20 text-gray-400">
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>{formatTime(performanceMetrics.generation_time_ms)}</span>
        </div>
      )}

      {/* Threshold Indicator */}
      {qualityMetrics.meets_threshold !== undefined && (
        <div className={`
          inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium
          ${qualityMetrics.meets_threshold 
            ? 'bg-green-500/10 text-green-400 border border-green-500/20' 
            : 'bg-red-500/10 text-red-400 border border-red-500/20'
          }
        `}>
          {qualityMetrics.meets_threshold ? '✓ Production Ready' : '⚠ Needs Review'}
        </div>
      )}

      {/* BDD Quality Indicator */}
      <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 text-[10px] font-medium">
        <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
        </svg>
        BDD Quality
      </div>
    </div>
  );
};

export default QualityBadge;