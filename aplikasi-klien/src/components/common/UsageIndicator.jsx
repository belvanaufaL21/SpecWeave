import { useMemo } from 'react';

const UsageIndicator = ({ usageInfo, className = '' }) => {
  // Calculate usage percentage
  const usagePercentage = useMemo(() => {
    if (!usageInfo || !usageInfo.limit) return 0;
    return Math.round((usageInfo.used / usageInfo.limit) * 100);
  }, [usageInfo]);

  // Determine color based on usage percentage
  const getColorClasses = (percentage) => {
    if (percentage >= 90) {
      return {
        text: 'text-red-400',
        bar: 'bg-red-500',
        badge: 'bg-red-500/10 border-red-500/20 text-red-400'
      };
    } else if (percentage >= 70) {
      return {
        text: 'text-yellow-400',
        bar: 'bg-yellow-500',
        badge: 'bg-yellow-500/10 border-yellow-500/20 text-yellow-400'
      };
    } else {
      return {
        text: 'text-green-400',
        bar: 'bg-green-500',
        badge: 'bg-green-500/10 border-green-500/20 text-green-400'
      };
    }
  };

  const colors = getColorClasses(usagePercentage);

  if (!usageInfo) {
    return null;
  }

  return (
    <div className={`flex items-center gap-3 px-4 py-2.5 border rounded-lg ${className}`}
         style={{ 
           borderColor: 'rgba(255, 255, 255, 0.05)', 
           backgroundColor: '#09090A' 
         }}>
      {/* Usage Stats */}
      <div className="flex items-center gap-2 flex-1 min-w-0">
        {/* Icon */}
        <svg className={`w-4 h-4 ${colors.text} flex-shrink-0`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
        
        {/* Usage Text */}
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <span className="text-xs text-gray-400">Usage:</span>
          <span className={`text-sm font-medium ${colors.text}`}>
            {usageInfo.used}/{usageInfo.limit}
          </span>
          <span className={`text-xs px-2 py-0.5 rounded border ${colors.badge}`}>
            {usagePercentage}%
          </span>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="w-24 h-2 bg-gray-800 rounded-full overflow-hidden flex-shrink-0">
        <div 
          className={`h-full ${colors.bar} transition-all duration-300`}
          style={{ width: `${usagePercentage}%` }}
        />
      </div>
    </div>
  );
};

export default UsageIndicator;
