import { motion } from 'framer-motion';

const QualityInsights = ({ stats }) => {
  const insights = [
    {
      id: 'quality_trend',
      title: 'Quality Trend',
      value: '+12%',
      description: 'Improvement this week',
      icon: '📈',
      color: 'text-green-400',
      bgColor: 'bg-green-500/10'
    },
    {
      id: 'avg_score',
      title: 'Avg METEOR Score',
      value: stats.avgMeteorScore ? (stats.avgMeteorScore * 100).toFixed(0) + '%' : '--',
      description: 'Current quality level',
      icon: '🎯',
      color: 'text-blue-400',
      bgColor: 'bg-blue-500/10'
    },
    {
      id: 'best_practice',
      title: 'Best Practice',
      value: '85%',
      description: 'Following guidelines',
      icon: '✨',
      color: 'text-purple-400',
      bgColor: 'bg-purple-500/10'
    }
  ];

  const recommendations = [
    {
      id: 1,
      text: 'Use more specific Given-When-Then statements',
      priority: 'high'
    },
    {
      id: 2,
      text: 'Add more edge case scenarios',
      priority: 'medium'
    },
    {
      id: 3,
      text: 'Consider using scenario outlines for data-driven tests',
      priority: 'low'
    }
  ];

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high': return 'text-red-400 bg-red-500/10';
      case 'medium': return 'text-yellow-400 bg-yellow-500/10';
      case 'low': return 'text-green-400 bg-green-500/10';
      default: return 'text-gray-400 bg-gray-500/10';
    }
  };

  return (
    <div className="bg-white/[0.02] backdrop-blur-xl border border-white/[0.05] rounded-2xl p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-white">Quality Insights</h3>
        <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
      </div>

      {/* Quality Metrics */}
      <div className="space-y-4 mb-6">
        {insights.map((insight, index) => (
          <motion.div
            key={insight.id}
            className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.02] border border-white/[0.05]"
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3, delay: index * 0.1 }}
          >
            <div className={`w-10 h-10 rounded-lg ${insight.bgColor} flex items-center justify-center text-lg`}>
              {insight.icon}
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-medium text-white">{insight.title}</h4>
                <span className={`text-sm font-bold ${insight.color}`}>{insight.value}</span>
              </div>
              <p className="text-xs text-white/60">{insight.description}</p>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Recommendations */}
      <div className="border-t border-white/[0.05] pt-6">
        <h4 className="text-sm font-medium text-white mb-4 flex items-center gap-2">
          <span>💡</span>
          Recommendations
        </h4>
        <div className="space-y-3">
          {recommendations.map((rec, index) => (
            <motion.div
              key={rec.id}
              className="p-3 rounded-lg bg-white/[0.02] border border-white/[0.05] hover:bg-white/[0.04] transition-colors"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: index * 0.1 }}
            >
              <div className="flex items-start gap-2">
                <span className={`text-xs px-2 py-1 rounded-full font-medium ${getPriorityColor(rec.priority)}`}>
                  {rec.priority}
                </span>
              </div>
              <p className="text-xs text-white/70 mt-2 leading-relaxed">
                {rec.text}
              </p>
            </motion.div>
          ))}
        </div>
      </div>

      <motion.button
        className="w-full mt-4 py-2 px-4 bg-gradient-to-r from-purple-500/20 to-blue-500/20 hover:from-purple-500/30 hover:to-blue-500/30 border border-purple-500/20 hover:border-purple-500/30 rounded-xl text-sm text-white transition-all duration-200"
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
      >
        View Detailed Analysis
      </motion.button>
    </div>
  );
};

export default QualityInsights;