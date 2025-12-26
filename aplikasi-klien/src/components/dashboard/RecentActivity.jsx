import { motion } from 'framer-motion';
import { useState, useEffect, useMemo, useCallback } from 'react';
import { scenarioService } from '../../services/scenarioService';

const RecentActivity = () => {
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [cache, setCache] = useState(null);
  const [lastLoad, setLastLoad] = useState(0);
  
  const CACHE_DURATION = 2 * 60 * 1000; // 2 minutes cache

  // Memoized chat stats calculation
  const chatStats = useMemo(() => {
    try {
      const savedHistory = localStorage.getItem('specweave_chat_history');
      const savedChats = localStorage.getItem('specweave_chats');
      
      if (savedHistory && savedChats) {
        const history = JSON.parse(savedHistory);
        const chatsData = JSON.parse(savedChats);
        
        return history
          .filter(item => item && item.id)
          .map(item => ({
            ...item,
            messageCount: (chatsData[item.id] || []).length,
            timestamp: item.timestamp || new Date().toISOString()
          }))
          .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
      }
      return [];
    } catch (error) {
      console.error('Error loading chat history:', error);
      return [];
    }
  }, []);

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
    const now = Date.now();
    const cacheValid = cache && (now - lastLoad) < CACHE_DURATION;
    
    if (!force && cacheValid) {
      setActivities(cache);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      
      // Load scenarios and chat activities in parallel
      const [scenarioResult] = await Promise.allSettled([
        scenarioService.getUserScenarios({
          page: 1,
          limit: 5, // Reduced limit for faster loading
          sortBy: 'created_at',
          sortOrder: 'desc'
        })
      ]);

      let recentActivities = [];
      
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

      // Add chat activities (already cached in useMemo)
      const chatActivities = chatStats.slice(0, 3).map(chat => ({
        id: `chat_${chat.id}`,
        type: 'chat_session',
        title: chat.title || 'Chat Session',
        description: `${chat.messageCount} messages exchanged`,
        time: formatTimeAgo(chat.timestamp),
        timestamp: chat.timestamp,
        icon: '💬',
        color: 'text-blue-400'
      }));

      // Combine and sort by timestamp
      const allActivities = [...recentActivities, ...chatActivities]
        .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
        .slice(0, 6); // Show last 6 activities for faster rendering

      setActivities(allActivities);
      setCache(allActivities);
      setLastLoad(now);
    } catch (error) {
      console.error('Error loading recent activities:', error);
      // Use cached data if available
      if (cache) {
        setActivities(cache);
      } else {
        setActivities([]);
      }
    } finally {
      setLoading(false);
    }
  }, [cache, lastLoad, chatStats, formatTimeAgo]);

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

  if (loading) {
    return (
      <div className="bg-white/[0.02] backdrop-blur-xl border border-white/[0.05] rounded-2xl p-6">
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-white">Recent Activity</h3>
        </div>
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="animate-pulse">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-white/[0.05]"></div>
                <div className="flex-1">
                  <div className="h-4 bg-white/[0.05] rounded mb-2"></div>
                  <div className="h-3 bg-white/[0.05] rounded w-3/4"></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white/[0.02] backdrop-blur-xl border border-white/[0.05] rounded-2xl p-6">
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-white">Recent Activity</h3>
      </div>

      {activities.length === 0 ? (
        <div className="text-center py-6">
          <div className="w-10 h-10 mx-auto mb-2 rounded-full bg-gray-500/20 flex items-center justify-center">
            <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <p className="text-gray-400 text-sm">No recent activity</p>
          <p className="text-gray-500 text-xs mt-1">Start creating scenarios to see activity here</p>
        </div>
      ) : (
        <div className="space-y-3">
          {activities.map((activity, index) => (
            <motion.div
              key={activity.id}
              className="group relative p-3 rounded-xl bg-white/[0.02] hover:bg-white/[0.05] border border-white/[0.05] hover:border-white/[0.1] transition-all duration-200"
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2, delay: index * 0.05 }}
            >
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-white/[0.05] flex items-center justify-center text-sm flex-shrink-0">
                  {getActivityIcon(activity.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="text-sm font-medium text-white truncate group-hover:text-purple-100 transition-colors">
                    {activity.title}
                  </h4>
                  <p className="text-xs text-white/60 truncate group-hover:text-white/80 transition-colors">
                    {getActivityDescription(activity)}
                  </p>
                  <p className="text-xs text-white/40 mt-1">
                    {activity.time}
                  </p>
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