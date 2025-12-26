import { motion } from 'framer-motion';

const StatisticsChart = ({ stats, loadingStats }) => {
  // Calculate chart data
  const maxValue = Math.max(stats.totalScenarios, stats.scenariosLast30Days, stats.highQualityScenarios, 10);
  const chartData = [
    { label: '1-10 Aug', value: stats.scenariosLast30Days * 0.3, color: 'bg-purple-500' },
    { label: '11-20 Aug', value: stats.scenariosLast30Days * 0.7, color: 'bg-purple-600' },
    { label: '21-30 Aug', value: stats.scenariosLast30Days, color: 'bg-purple-700' },
    { label: '31-40 Aug', value: stats.highQualityScenarios, color: 'bg-blue-500' },
  ];

  const getBarHeight = (value) => {
    if (maxValue === 0) return 0;
    return Math.max((value / maxValue) * 100, 5); // Minimum 5% height for visibility
  };

  return (
    <div className="bg-white/[0.02] backdrop-blur-xl border border-white/[0.05] rounded-2xl p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-white mb-1">Statistics</h3>
          <p className="text-sm text-white/60">Continue your learning to achieve your target!</p>
        </div>
        <div className="text-right">
          <div className="text-2xl font-bold text-white">
            {loadingStats ? (
              <div className="w-8 h-8 bg-purple-500/20 animate-pulse rounded"></div>
            ) : (
              `${Math.round((stats.avgMeteorScore || 0) * 100)}%`
            )}
          </div>
          <p className="text-xs text-white/60">Avg Quality</p>
        </div>
      </div>

      {/* Chart */}
      <div className="relative h-32 mb-4">
        <div className="absolute inset-0 flex items-end justify-between gap-2">
          {chartData.map((item, index) => (
            <motion.div
              key={index}
              className="flex-1 flex flex-col items-center"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              transition={{ duration: 0.6, delay: index * 0.1 }}
            >
              <motion.div
                className={`w-full rounded-t-lg ${item.color} relative overflow-hidden`}
                initial={{ height: 0 }}
                animate={{ height: `${getBarHeight(item.value)}%` }}
                transition={{ duration: 0.8, delay: index * 0.1, ease: "easeOut" }}
              >
                {/* Shimmer effect */}
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -skew-x-12 animate-pulse"></div>
              </motion.div>
              <span className="text-xs text-white/50 mt-2 text-center">{item.label}</span>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center justify-between text-xs">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
            <span className="text-white/60">Scenarios</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
            <span className="text-white/60">Quality</span>
          </div>
        </div>
        <span className="text-white/40">Last 30 days</span>
      </div>
    </div>
  );
};

export default StatisticsChart;