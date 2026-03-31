import { useEffect, useRef } from 'react';
import { useJira } from '../contexts/JiraContext';

/**
 * Hook for real-time JIRA updates
 * Automatically refreshes JIRA state when certain events occur
 */
export const useJiraRealtime = (options = {}) => {
  const {
    refreshConnections,
    refreshEpicContext,
    refreshAll,
    lastUpdated
  } = useJira();

  const {
    autoRefreshInterval = 30000, // 30 seconds
    refreshOnFocus = true,
    refreshOnVisibilityChange = true,
    enableAutoRefresh = false
  } = options;

  const intervalRef = useRef(null);
  const lastRefreshRef = useRef(Date.now());

  // Auto refresh interval
  useEffect(() => {
    if (enableAutoRefresh && autoRefreshInterval > 0) {
      intervalRef.current = setInterval(() => {
        const now = Date.now();
        const timeSinceLastUpdate = now - (lastUpdated?.getTime() || 0);
        
        // Only refresh if it's been a while since last update
        if (timeSinceLastUpdate > autoRefreshInterval) {
          
          refreshAll();
        }
      }, autoRefreshInterval);

      return () => {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
        }
      };
    }
  }, [enableAutoRefresh, autoRefreshInterval, refreshAll, lastUpdated]);

  // Refresh on window focus
  useEffect(() => {
    if (!refreshOnFocus) return;

    const handleFocus = () => {
      const now = Date.now();
      const timeSinceLastRefresh = now - lastRefreshRef.current;
      
      // Only refresh if it's been more than 5 seconds since last refresh
      if (timeSinceLastRefresh > 5000) {
        
        refreshAll();
        lastRefreshRef.current = now;
      }
    };

    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [refreshOnFocus, refreshAll]);

  // Refresh on visibility change
  useEffect(() => {
    if (!refreshOnVisibilityChange) return;

    const handleVisibilityChange = () => {
      if (!document.hidden) {
        const now = Date.now();
        const timeSinceLastRefresh = now - lastRefreshRef.current;
        
        // Only refresh if it's been more than 5 seconds since last refresh
        if (timeSinceLastRefresh > 5000) {
          
          refreshAll();
          lastRefreshRef.current = now;
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [refreshOnVisibilityChange, refreshAll]);

  return {
    refreshConnections,
    refreshEpicContext,
    refreshAll,
    lastUpdated
  };
};

export default useJiraRealtime;