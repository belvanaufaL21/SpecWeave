import { motion } from 'framer-motion';
import { useMemo } from 'react';

const UserStats = ({ stats, loadingStats }) => {
  // Memoized chat statistics calculation
  const chatStats = useMemo(() => {
    try {
      const savedHistory = localStorage.getItem('specweave_chat_history');
      const savedChats = localStorage.getItem('specweave_chats');
      
      if (savedHistory && savedChats) {
        const history = JSON.parse(savedHistory);
        const chatsData = JSON.parse(savedChats);
        
        const totalChats = history.length;
        const totalMessages = Object.values(chatsData).reduce((sum, messages) => sum + messages.length, 0);
        
        return { totalChats, totalMessages };
      }
      return { totalChats: 0, totalMessages: 0 };
    } catch (error) {
      console.error('Error calculating chat stats:', error);
      return { totalChats: 0, totalMessages: 0 };
    }
  }, []); // Empty dependency array since localStorage is synchronous

  // Memoized stats data to prevent unnecessary recalculations
  const statsData = useMemo(() => {
    const baseStats = [
      {
        id: 'total_scenarios',
        title: 'Total Scenarios',
        value: loadingStats ? '--' : stats.totalScenarios,
        icon: '📝',
        color: 'text-blue-400',
        bgColor: 'bg-blue-500/10'
      },
      {
        id: 'total_chats',
        title: 'Chat Sessions',
        value: loadingStats ? '--' : chatStats.totalChats,
        icon: '💬',
        color: 'text-green-400',
        bgColor: 'bg-green-500/10'
      },
      {
        id: 'avg_score',
        title: 'Avg Quality',
        value: loadingStats ? '--' : (stats.avgMeteorScore ? `${(stats.avgMeteorScore * 100).toFixed(0)}%` : '--'),
        icon: '⭐',
        color: 'text-purple-400',
        bgColor: 'bg-purple-500/10'
      },
      {
        id: 'total_messages',
        title: 'Total Messages',
        value: loadingStats ? '--' : chatStats.totalMessages,
        icon: '💭',
        color: 'text-cyan-400',
        bgColor: 'bg-cyan-500/10'
      }
    ];

    // Only add JIRA stats if there are scenarios
    if (stats.totalScenarios > 0) {
      baseStats.push({
        id: 'jira_linked',
        title: 'JIRA Linked',
        value: loadingStats ? '--' : '0',
        icon: '🔗',
        color: 'text-amber-400',
        bgColor: 'bg-amber-500/10'
      });
    }

    // Add generation time if available
    if (stats.avgGenerationTime) {
      baseStats.push({
        id: 'avg_time',
        title: 'Avg Gen Time',
        value: loadingStats ? '--' : `${Math.round(stats.avgGenerationTime / 1000)}s`,
        icon: '⚡',
        color: 'text-pink-400',
        bgColor: 'bg-pink-500/10'
      });
    }

    return baseStats;
  }, [stats, loadingStats, chatStats]);

  // Memoized check for summary section
  const showSummary = useMemo(() => {
    return stats.scenariosLast30Days > 0 || stats.highQualityScenarios > 0;
  }, [stats.scenariosLast30Days, stats.highQualityScenarios]);

  return (
    <div className="bg-white/[0.02] backdrop-blur-xl border border-white/[0.05] rounded-2xl p-6">
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-white">Your Statistics</h3>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {statsData.map((stat, index) => (
          <motion.div
            key={stat.id}
            className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.02] border border-white/[0.05] hover:bg-white/[0.04] transition-colors"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.2, delay: index * 0.05 }}
          >
            <div className={`w-10 h-10 rounded-lg ${stat.bgColor} flex items-center justify-center text-lg flex-shrink-0`}>
              {stat.icon}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-white/60 truncate">{stat.title}</p>
              <p className={`text-lg font-bold ${stat.color} truncate`}>
                {stat.value}
              </p>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Summary section - only show if there's actual data */}
      {showSummary && (
        <motion.div
          className="mt-6 p-4 rounded-xl bg-gradient-to-r from-purple-500/10 to-blue-500/10 border border-purple-500/20"
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.4 }}
        >
          <div className="flex items-center gap-2 mb-2">
            <span className="text-lg">🏆</span>
            <h4 className="text-sm font-medium text-white">This Month</h4>
          </div>
          <div className="grid grid-cols-2 gap-4 text-xs">
            <div>
              <p className="text-white/60">Scenarios Created</p>
              <p className="text-white font-semibold">
                {loadingStats ? '--' : stats.scenariosLast30Days}
              </p>
            </div>
            <div>
              <p className="text-white/60">High Quality</p>
              <p className="text-white font-semibold">
                {loadingStats ? '--' : stats.highQualityScenarios}
              </p>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
};

export default UserStats;