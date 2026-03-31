import { motion } from 'framer-motion';
import { useMemo, useState, useEffect } from 'react';
import UserDataService from '../../services/UserDataService';
import { formatNumber, formatDuration } from '../../utils/localization';

const UserStats = ({ stats, loadingStats }) => {
  const [chatStats, setChatStats] = useState({ totalChats: 0, totalMessages: 0 });
  const [chatStatsLoaded, setChatStatsLoaded] = useState(false);
  const [error, setError] = useState(null);
  
  // Load chat statistics from database
  useEffect(() => {
    const loadChatStats = async () => {
      try {
        setError(null);
        const result = await UserDataService.getChatSessions();
        
        if (result.success) {
          const totalChats = result.data.length;
          const totalMessages = result.data.reduce((sum, session) => 
            sum + (session.messages?.length || 0), 0
          );
          
          setChatStats({ totalChats, totalMessages });
        } else {
          setError('Gagal memuat statistik chat');
        }
      } catch (error) {
        console.error('Error loading chat stats:', error);
        setError('Terjadi kesalahan saat memuat data');
      } finally {
        setChatStatsLoaded(true);
      }
    };
    
    loadChatStats();
  }, []);

  // Memoized stats data to prevent unnecessary recalculations
  const statsData = useMemo(() => {
    // Show loading only if both stats are loading
    const isLoading = loadingStats || !chatStatsLoaded;
    
    const baseStats = [
      {
        id: 'total_scenarios',
        title: 'Total Skenario',
        value: isLoading ? '--' : formatNumber(stats.totalScenarios || 0),
        icon: '📝',
        color: 'text-blue-400',
        bgColor: 'bg-blue-500/10',
        description: 'Skenario yang telah dibuat'
      },
      {
        id: 'total_chats',
        title: 'Sesi Chat',
        value: isLoading ? '--' : formatNumber(chatStats.totalChats || 0),
        icon: '💬',
        color: 'text-green-400',
        bgColor: 'bg-green-500/10',
        description: 'Total percakapan'
      },
      {
        id: 'avg_score',
        title: 'Kualitas Rata-rata',
        value: isLoading ? '--' : (stats.avgMeteorScore && !isNaN(stats.avgMeteorScore) ? `${(stats.avgMeteorScore * 100).toFixed(0)}%` : '--'),
        icon: '⭐',
        color: 'text-purple-400',
        bgColor: 'bg-purple-500/10',
        description: 'Skor kualitas skenario'
      },
      {
        id: 'total_messages',
        title: 'Total Pesan',
        value: isLoading ? '--' : formatNumber(chatStats.totalMessages || 0),
        icon: '💭',
        color: 'text-cyan-400',
        bgColor: 'bg-cyan-500/10',
        description: 'Pesan yang dikirim'
      }
    ];

    // Only add JIRA stats if there are scenarios
    if (stats.totalScenarios > 0) {
      baseStats.push({
        id: 'jira_linked',
        title: 'Terhubung JIRA',
        value: isLoading ? '--' : '0',
        icon: '🔗',
        color: 'text-amber-400',
        bgColor: 'bg-amber-500/10',
        description: 'Skenario terhubung JIRA'
      });
    }

    // Add generation time if available
    if (stats.avgGenerationTime) {
      baseStats.push({
        id: 'avg_time',
        title: 'Waktu Rata-rata',
        value: isLoading ? '--' : formatDuration(stats.avgGenerationTime),
        icon: '⚡',
        color: 'text-pink-400',
        bgColor: 'bg-pink-500/10',
        description: 'Waktu pembuatan skenario'
      });
    }

    return baseStats;
  }, [stats, loadingStats, chatStats, chatStatsLoaded]);

  // Memoized check for summary section
  const showSummary = useMemo(() => {
    return stats.scenariosLast30Days > 0 || stats.highQualityScenarios > 0;
  }, [stats.scenariosLast30Days, stats.highQualityScenarios]);

  // Combined loading state
  const isLoading = loadingStats || !chatStatsLoaded;

  // Skeleton loading component
  const StatSkeleton = () => (
    <div className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.02] border border-white/[0.05]">
      <div className="w-10 h-10 rounded-lg bg-gray-600/20 animate-pulse flex-shrink-0"></div>
      <div className="flex-1 min-w-0">
        <div className="w-16 h-3 bg-gray-600/20 rounded animate-pulse mb-1"></div>
        <div className="w-12 h-5 bg-gray-600/20 rounded animate-pulse"></div>
      </div>
    </div>
  );

  return (
    <div className="bg-[#0a0a0f]/60 backdrop-blur-xl border border-white/10 rounded-2xl p-6 shadow-lg">
      {/* Header with elegant styling */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500/20 to-pink-500/20 border border-purple-500/20 flex items-center justify-center">
          <svg className="w-4 h-4 text-purple-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
        </div>
        <h3 className="text-lg font-bold text-white">Your Statistics</h3>
        {error && (
          <div className="ml-auto">
            <div className="w-2 h-2 bg-red-400 rounded-full animate-pulse"></div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        {isLoading ? (
          // Enhanced skeleton loading
          Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="flex items-center gap-3 p-4 rounded-xl bg-[#0a0a0f]/40 border border-white/5">
              <div className="w-12 h-12 rounded-xl bg-gray-600/20 animate-pulse flex-shrink-0"></div>
              <div className="flex-1 min-w-0">
                <div className="w-20 h-3 bg-gray-600/20 rounded animate-pulse mb-2"></div>
                <div className="w-16 h-5 bg-gray-600/20 rounded animate-pulse"></div>
              </div>
            </div>
          ))
        ) : (
          // Enhanced stat cards
          statsData.map((stat, index) => (
            <motion.div
              key={stat.id}
              className="group flex items-center gap-3 p-4 rounded-xl bg-[#0a0a0f]/40 border border-white/5 hover:border-white/10 hover:bg-[#0a0a0f]/60 transition-all cursor-default"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2, delay: index * 0.05 }}
              title={stat.description}
            >
              <div className={`w-12 h-12 rounded-xl ${stat.bgColor} border border-white/10 flex items-center justify-center text-lg flex-shrink-0 group-hover:scale-110 transition-transform duration-300`}>
                {stat.icon}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-gray-400 truncate font-medium uppercase tracking-wider">{stat.title}</p>
                <p className={`text-xl font-bold ${stat.color} truncate`}>
                  {stat.value}
                </p>
              </div>
            </motion.div>
          ))
        )}
      </div>

      {/* Enhanced Summary section */}
      {showSummary && !isLoading && (
        <motion.div
          className="mt-6 p-5 rounded-xl bg-gradient-to-r from-purple-500/10 via-pink-500/10 to-purple-500/10 border border-purple-500/20 backdrop-blur-sm"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.4 }}
        >
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500/20 to-pink-500/20 border border-purple-500/20 flex items-center justify-center">
              <svg className="w-4 h-4 text-purple-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
              </svg>
            </div>
            <h4 className="text-sm font-semibold text-white">This Month's Performance</h4>
          </div>
          <div className="grid grid-cols-2 gap-6">
            <div className="text-center">
              <p className="text-xs text-gray-400 font-medium uppercase tracking-wider mb-1">Scenarios Created</p>
              <p className="text-2xl font-bold text-white">
                {formatNumber(stats.scenariosLast30Days)}
              </p>
            </div>
            <div className="text-center">
              <p className="text-xs text-gray-400 font-medium uppercase tracking-wider mb-1">High Quality</p>
              <p className="text-2xl font-bold text-white">
                {formatNumber(stats.highQualityScenarios)}
              </p>
            </div>
          </div>
        </motion.div>
      )}

      {/* Enhanced loading skeleton for summary */}
      {isLoading && (
        <div className="mt-6 p-5 rounded-xl bg-gradient-to-r from-purple-500/10 via-pink-500/10 to-purple-500/10 border border-purple-500/20">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 bg-gray-600/20 rounded-lg animate-pulse"></div>
            <div className="w-32 h-4 bg-gray-600/20 rounded animate-pulse"></div>
          </div>
          <div className="grid grid-cols-2 gap-6">
            <div className="text-center">
              <div className="w-24 h-3 bg-gray-600/20 rounded animate-pulse mb-2 mx-auto"></div>
              <div className="w-12 h-6 bg-gray-600/20 rounded animate-pulse mx-auto"></div>
            </div>
            <div className="text-center">
              <div className="w-20 h-3 bg-gray-600/20 rounded animate-pulse mb-2 mx-auto"></div>
              <div className="w-12 h-6 bg-gray-600/20 rounded animate-pulse mx-auto"></div>
            </div>
          </div>
        </div>
      )}

      {/* Enhanced error state */}
      {error && !isLoading && (
        <div className="mt-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-center backdrop-blur-sm">
          <div className="flex items-center justify-center gap-2 mb-2">
            <svg className="w-4 h-4 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-sm text-red-400 font-medium">Unable to load some statistics</p>
          </div>
          <button 
            onClick={() => window.location.reload()}
            className="text-xs text-red-300 hover:text-red-200 transition-colors px-3 py-1 border border-red-500/30 rounded-lg hover:bg-red-500/10"
          >
            Reload page
          </button>
        </div>
      )}
    </div>
  );
};

export default UserStats;