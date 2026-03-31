import { motion } from 'framer-motion';
import { useState, useEffect, useMemo, useCallback } from 'react';
import { scenarioService } from '../../services/scenarioService';
import { useChat } from '../../contexts/ChatContext';

const RecentActivity = () => {
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [cache, setCache] = useState(null);
  const [lastLoad, setLastLoad] = useState(0);
  
  // Use ChatContext for chat data
  const { history: chatHistory, chats, loading: chatLoading } = useChat();
  
  const CACHE_DURATION = 2 * 60 * 1000; // 2 minutes cache

  const formatTimeAgo = useCallback((timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric'
    });
  }, []);

  const loadRecentActivities = useCallback(async (force = false) => {
    // Wait for chat data to load
    if (chatLoading) return;
    
    const now = Date.now();
    const cacheValid = cache && (now - lastLoad) < CACHE_DURATION;
    
    if (!force && cacheValid) {
      setActivities(cache);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      
      // Load scenarios
      const [scenarioResult] = await Promise.allSettled([
        scenarioService.getUserScenarios({
          page: 1,
          limit: 5,
          sortBy: 'created_at',
          sortOrder: 'desc'
        })
      ]);

      let recentActivities = [];
      
      // Add scenario activities
      if (scenarioResult.status === 'fulfilled' && scenarioResult.value.success) {
        recentActivities = scenarioResult.value.data.scenarios.map(scenario => ({
          id: scenario.id,
          type: 'scenario_created',
          title: scenario.title || 'Untitled Scenario',
          description: `Created ${scenario.feature_name ? `for ${scenario.feature_name}` : 'new scenario'}`,
          time: formatTimeAgo(scenario.created_at),
          timestamp: scenario.created_at,
          icon: '📝',
          color: 'text-green-400',
          meteorScore: scenario.meteor_score,
          hasJira: !!scenario.jira_epic_id
        }));
      }

      // Add chat activities from ChatContext
      const chatActivities = chatHistory.slice(0, 5).map(chat => {
        const messages = chats[chat.id] || [];
        return {
          id: `chat_${chat.id}`,
          type: 'chat_session',
          title: chat.title || 'Chat Session',
          description: `${messages.length} messages exchanged`,
          time: formatTimeAgo(chat.timestamp),
          timestamp: chat.timestamp,
          icon: '💬',
          color: 'text-blue-400'
        };
      });

      // Combine and sort by timestamp
      const allActivities = [...recentActivities, ...chatActivities]
        .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
        .slice(0, 8); // Show last 8 activities

      setActivities(allActivities);
      setCache(allActivities);
      setLastLoad(now);

    } catch (error) {
      console.error('❌ [RECENT-ACTIVITY] Error loading recent activities:', error);
      // Use cached data if available
      if (cache) {
        setActivities(cache);
      } else {
        setActivities([]);
      }
    } finally {
      setLoading(false);
    }
  }, [cache, lastLoad, chatHistory, chats, chatLoading, formatTimeAgo]);

  useEffect(() => {
    loadRecentActivities();
  }, [loadRecentActivities]);

  const getActivityIcon = useCallback((type) => {
    switch (type) {
      case 'scenario_created': return '📝';
      case 'chat_session': return '💬';
      case 'meteor_evaluation': return '📊';
      case 'jira_sync': return '🔗';
      default: return '📋';
    }
  }, []);

  const getActivityDescription = useCallback((activity) => {
    if (activity.type === 'scenario_created') {
      let desc = activity.description;
      if (activity.meteorScore) {
        desc += ` • Score: ${(activity.meteorScore * 100).toFixed(0)}%`;
      }
      if (activity.hasJira) {
        desc += ' • JIRA linked';
      }
      return desc;
    }
    return activity.description;
  }, []);

  if (loading || chatLoading) {
    return (
      <div className="bg-[#0a0a0f]/60 backdrop-blur-xl border border-white/10 rounded-2xl p-6 shadow-lg">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-8 h-8 rounded-lg bg-gray-600/20 animate-pulse"></div>
          <div className="w-32 h-5 bg-gray-600/20 rounded animate-pulse"></div>
        </div>
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="animate-pulse">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-xl bg-gray-600/20"></div>
                <div className="flex-1">
                  <div className="h-4 bg-gray-600/20 rounded mb-2"></div>
                  <div className="h-3 bg-gray-600/20 rounded w-3/4 mb-2"></div>
                  <div className="h-3 bg-gray-600/20 rounded w-1/2"></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#0a0a0f]/60 backdrop-blur-xl border border-white/10 rounded-2xl p-6 shadow-lg">
      {/* Header with elegant styling */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500/20 to-cyan-500/20 border border-emerald-500/20 flex items-center justify-center">
          <svg className="w-4 h-4 text-emerald-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
        </div>
        <h3 className="text-lg font-bold text-white">Recent Activity</h3>
      </div>

      {activities.length === 0 ? (
        <div className="text-center py-8">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-emerald-500/10 to-cyan-500/10 border border-white/10 flex items-center justify-center">
            <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h4 className="text-white font-semibold mb-2">No recent activity</h4>
          <p className="text-gray-400 text-sm max-w-sm mx-auto">Start creating scenarios and chatting to see your activity timeline here</p>
        </div>
      ) : (
        <div className="space-y-3">
          {activities.map((activity, index) => (
            <motion.div
              key={activity.id}
              className="group relative p-4 rounded-xl bg-[#0a0a0f]/40 border border-white/5 hover:border-white/10 hover:bg-[#0a0a0f]/60 transition-all duration-200 cursor-default"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2, delay: index * 0.05 }}
            >
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500/10 to-cyan-500/10 border border-white/10 flex items-center justify-center text-lg flex-shrink-0 group-hover:scale-110 transition-transform duration-300">
                  {getActivityIcon(activity.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="text-sm font-semibold text-white truncate group-hover:text-emerald-100 transition-colors">
                    {activity.title}
                  </h4>
                  <p className="text-xs text-gray-400 truncate group-hover:text-gray-300 transition-colors leading-relaxed mt-1">
                    {getActivityDescription(activity)}
                  </p>
                  <div className="flex items-center gap-2 mt-2">
                    <div className="flex items-center gap-1 text-xs text-gray-500">
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span>{activity.time}</span>
                    </div>
                    {activity.meteorScore && (
                      <div className="px-2 py-0.5 bg-purple-500/20 text-purple-300 text-xs rounded-lg border border-purple-500/30">
                        {(activity.meteorScore * 100).toFixed(0)}% quality
                      </div>
                    )}
                    {activity.hasJira && (
                      <div className="px-2 py-0.5 bg-amber-500/20 text-amber-300 text-xs rounded-lg border border-amber-500/30">
                        JIRA
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
};

export default RecentActivity;