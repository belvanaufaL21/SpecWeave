import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { jiraService } from '../services/jiraService';
import { JIRA_CONTEXT_CONSTANTS } from '../utils/constants/jiraContextConstants';
import { 
  getInitialState,
  getStatusSummary
} from '../utils/helpers/jiraContextHelpers';
import initializationManager from '../utils/singletons/InitializationManager.js';

const JiraContext = createContext();

export const useJira = () => {
  const context = useContext(JiraContext);
  if (!context) {
    throw new Error('useJira must be used within a JiraProvider');
  }
  return context;
};

export const JiraProvider = ({ children }) => {
  const [state, setState] = useState(getInitialState());
  
  // Add loading state to prevent duplicate calls
  const [isInitializing, setIsInitializing] = useState(false);

  // Load initial data
  useEffect(() => {
    // Prevent duplicate initialization in React Strict Mode
    if (initializationManager.isJiraInitialized()) {
      console.log('🎯 [JIRA-CONTEXT] Using existing JIRA initialization');
      const existingPromise = initializationManager.getJiraPromise();
      if (existingPromise) {
        existingPromise.then(() => {
          // Sync with existing state if available
          setState(prev => ({ ...prev, isLoadingConnections: false, isLoadingEpic: false }));
        });
      }
      return;
    }

    if (!isInitializing) {
      const jiraPromise = loadInitialData();
      initializationManager.setJiraInitialized(jiraPromise);
    }
    
    // Setup event listeners untuk force Epic context events
    const handleForceEpicClearEvent = () => {
      console.log('🔄 [JIRA-CONTEXT] Force Epic clear event received');
      forceEpicContextClear();
    };
    
    const handleForceEpicRefreshEvent = () => {
      console.log('🔄 [JIRA-CONTEXT] Force Epic refresh event received');
      refreshEpicContext();
    };
    
    const handleForceConnectionsRefreshEvent = () => {
      console.log('🔄 [JIRA-CONTEXT] Force connections refresh event received');
      refreshConnections(true); // Force refresh
    };
    
    // ENHANCED: Additional event listener for Epic context reset
    const handleEpicContextResetEvent = () => {
      console.log('🔄 [JIRA-CONTEXT] Epic context reset event received');
      // Immediately clear Epic context state
      setState(prev => ({
        ...prev,
        epicContext: null,
        hasEpic: false,
        isLoadingEpic: false,
        lastUpdated: new Date()
      }));
      
      // Send acknowledgment
      setTimeout(() => {
        const clearTimestamp = localStorage.getItem('epic_context_cleared_at');
        const timestamp = clearTimestamp ? parseInt(clearTimestamp) : Date.now();
        
        window.dispatchEvent(new CustomEvent('epicContextClearAcknowledged', {
          detail: { timestamp }
        }));
        console.log('✅ [JIRA-CONTEXT] Epic context reset acknowledged');
      }, 50);
    };
    
    // CRITICAL: Listen for active project changes to clear Epic context
    const handleActiveProjectChanged = (event) => {
      console.log('🔄 [JIRA-CONTEXT] Active project changed event received:', event.detail);
      
      if (event.detail?.projectChanged) {
        console.log('🧹 [JIRA-CONTEXT] Project changed, clearing Epic context immediately');
        
        // Immediately clear Epic context state
        setState(prev => ({
          ...prev,
          epicContext: null,
          hasEpic: false,
          isLoadingEpic: false,
          lastUpdated: new Date()
        }));
        
        // Clear storage
        const epicKeys = [
          'specweave_epic_context',
          'epic_context_cleared_at',
          'epic_force_clear_time'
        ];
        
        epicKeys.forEach(key => {
          localStorage.removeItem(key);
          sessionStorage.removeItem(key);
        });
        
        // Set clear timestamp
        const clearTimestamp = Date.now();
        localStorage.setItem('epic_context_cleared_at', clearTimestamp.toString());
        
        console.log('✅ [JIRA-CONTEXT] Epic context cleared due to project change');
      }
    };
    
    window.addEventListener('forceEpicContextClear', handleForceEpicClearEvent);
    window.addEventListener('forceEpicContextRefresh', handleForceEpicRefreshEvent);
    window.addEventListener('forceConnectionsRefresh', handleForceConnectionsRefreshEvent);
    window.addEventListener('epicContextReset', handleEpicContextResetEvent);
    window.addEventListener('activeProjectChanged', handleActiveProjectChanged);
    
    return () => {
      window.removeEventListener('forceEpicContextClear', handleForceEpicClearEvent);
      window.removeEventListener('forceEpicContextRefresh', handleForceEpicRefreshEvent);
      window.removeEventListener('forceConnectionsRefresh', handleForceConnectionsRefreshEvent);
      window.removeEventListener('epicContextReset', handleEpicContextResetEvent);
      window.removeEventListener('activeProjectChanged', handleActiveProjectChanged);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  /**
   * Load initial data dengan timeout yang reasonable dan duplicate prevention
   */
  const loadInitialData = async () => {
    if (isInitializing) {
      console.log('⏳ [JIRA-CONTEXT] Initial data loading already in progress');
      return;
    }
    
    try {
      setIsInitializing(true);
      setState(prev => ({ 
        ...prev, 
        isLoadingConnections: true, 
        isLoadingEpic: true 
      }));

      console.log('🔄 [JIRA-CONTEXT] Loading initial JIRA data...');

      // Parallel loading dengan proper timeout handling dan fallback
      const [connectionsResult, epicResult] = await Promise.allSettled([
        Promise.race([
          jiraService.getConnections(),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Connection timeout')), 45000) // Increased to 45s
          )
        ]).catch((error) => {
          console.warn('⚠️ Connection fetch failed:', error.message);
          // ENHANCED: Better fallback handling for server connection issues
          if (error.message.includes('Network Error') || 
              error.message.includes('ERR_CONNECTION_REFUSED') ||
              error.message.includes('Failed to fetch') ||
              error.code === 'ECONNABORTED') {
            console.warn('🔌 [JIRA-CONTEXT] Server not available, using offline mode');
            return { success: true, data: [], offline: true };
          }
          return { success: true, data: [], fallback: true };
        }),
        
        Promise.race([
          // CRITICAL: Enhanced Epic context blocking - check multiple conditions
          (async () => {
            const epicClearedTime = localStorage.getItem('epic_context_cleared_at');
            const forceClearTime = localStorage.getItem('epic_force_clear_time');
            
            // ENHANCED: Extended blocking duration and multiple checks
            const now = Date.now();
            const extendedBlockDuration = 300000; // 5 minutes instead of 30 seconds
            
            // Check if Epic was cleared within the last 5 minutes
            if (epicClearedTime && now - parseInt(epicClearedTime) < extendedBlockDuration) {
              const timeRemaining = Math.round((extendedBlockDuration - (now - parseInt(epicClearedTime))) / 1000);
              console.log(`🚫 [JIRA-CONTEXT] Epic context load blocked - recently cleared (${timeRemaining}s remaining)`);
              return { success: true, data: null, blocked: true, reason: 'recently_cleared' };
            }
            
            if (forceClearTime && now - parseInt(forceClearTime) < extendedBlockDuration) {
              const timeRemaining = Math.round((extendedBlockDuration - (now - parseInt(forceClearTime))) / 1000);
              console.log(`🚫 [JIRA-CONTEXT] Epic context load blocked - force cleared (${timeRemaining}s remaining)`);
              return { success: true, data: null, blocked: true, reason: 'force_cleared' };
            }
            
            // ADDITIONAL: Check if user explicitly cleared Epic context
            const userClearedFlag = localStorage.getItem('epic_user_cleared');
            if (userClearedFlag === 'true') {
              console.log(`🚫 [JIRA-CONTEXT] Epic context load blocked - user explicitly cleared`);
              return { success: true, data: null, blocked: true, reason: 'user_cleared' };
            }
            
            // ADDITIONAL: Check if Epic context should be blocked for current session
            const sessionBlockFlag = sessionStorage.getItem('epic_context_blocked');
            if (sessionBlockFlag === 'true') {
              console.log(`🚫 [JIRA-CONTEXT] Epic context load blocked - session blocked`);
              return { success: true, data: null, blocked: true, reason: 'session_blocked' };
            }
            
            console.log(`✅ [JIRA-CONTEXT] Epic context load allowed - no blocking conditions met`);
            
            // If not blocked, try to load from server
            try {
              return await jiraService.getEpicContext();
            } catch (error) {
              // ENHANCED: Better handling for server connection issues
              if (error.message.includes('Network Error') || 
                  error.message.includes('ERR_CONNECTION_REFUSED') ||
                  error.message.includes('Failed to fetch') ||
                  error.code === 'ECONNABORTED') {
                console.warn('🔌 [JIRA-CONTEXT] Server not available for Epic context, clearing cached data');
                // Clear cached Epic context when server is not available
                localStorage.removeItem('specweave_epic_context');
                return { success: true, data: null, offline: true };
              }
              throw error;
            }
          })(),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Epic context timeout')), 45000) // Increased to 45s
          )
        ]).catch((error) => {
          console.warn('⚠️ Epic context fetch failed:', error.message);
          // ENHANCED: Clear cached Epic context when server is not available
          if (error.message.includes('Network Error') || 
              error.message.includes('ERR_CONNECTION_REFUSED') ||
              error.message.includes('Failed to fetch') ||
              error.code === 'ECONNABORTED') {
            console.warn('🔌 [JIRA-CONTEXT] Server not available, clearing cached Epic context');
            localStorage.removeItem('specweave_epic_context');
            return { success: true, data: null, offline: true };
          }
          return { success: true, data: null, fallback: true };
        })
      ]);

      // Process results with better fallback handling
      const connections = connectionsResult.status === 'fulfilled' && connectionsResult.value.success 
        ? connectionsResult.value.data 
        : [];
        
      const epicContext = epicResult.status === 'fulfilled' && epicResult.value.success 
        ? epicResult.value.data 
        : null;

      console.log('✅ [JIRA-CONTEXT] Initial data loaded:', {
        connections: connections.length,
        hasEpicContext: !!epicContext
      });

      setState(prev => ({
        ...prev,
        connections,
        hasConnection: connections.length > 0,
        epicContext,
        hasEpic: epicContext !== null,
        isLoadingConnections: false,
        isLoadingEpic: false,
        error: null,
        lastUpdated: new Date()
      }));

      if (connections.length > 0) {
        console.log(`✅ Loaded ${connections.length} JIRA connections successfully`);
      }

    } catch (error) {
      console.error('Error loading initial JIRA data:', error);
      setState(prev => ({
        ...prev,
        isLoadingConnections: false,
        isLoadingEpic: false,
        error: null // Don't show errors on initial load
      }));
    } finally {
      setIsInitializing(false);
    }
  };

  /**
   * Refresh connections dengan caching
   */
  const refreshConnections = useCallback(async (force = false) => {
    try {
      setState(prev => {
        if (!force && prev.lastConnectionsRefresh) {
          const timeSinceLastRefresh = Date.now() - prev.lastConnectionsRefresh;
          if (timeSinceLastRefresh < JIRA_CONTEXT_CONSTANTS.CACHE_DURATION) {
            return prev;
          }
        }
        
        return { ...prev, isLoadingConnections: true };
      });

      const result = await jiraService.getConnections().catch((error) => {
        // Enhanced error handling for server unavailability
        if (error.message.includes('Network Error') || 
            error.message.includes('ERR_CONNECTION_REFUSED') ||
            error.message.includes('Failed to fetch') ||
            error.code === 'ECONNABORTED') {
          console.warn('🔌 [JIRA-CONTEXT] Server not available during refresh, using offline mode');
          return { success: true, data: [], offline: true };
        }
        return { success: false, error: error.message };
      });
      
      setState(prev => ({
        ...prev,
        connections: result.success ? result.data : prev.connections,
        hasConnection: result.success ? result.data.length > 0 : prev.hasConnection,
        isLoadingConnections: false,
        error: null,
        lastUpdated: new Date(),
        lastConnectionsRefresh: Date.now()
      }));

      if (result.success) {
        console.log(`✅ Refreshed ${result.data.length} JIRA connections`);
      } else {
        console.warn('Connection refresh failed:', result.error);
      }

      return result;
    } catch (error) {
      console.error('Error refreshing connections:', error);
      setState(prev => ({
        ...prev,
        isLoadingConnections: false,
        error: null
      }));
      return { success: false, error: error.message };
    }
  }, []);

  /**
   * Refresh Epic context
   */
  const refreshEpicContext = useCallback(async () => {
    try {
      // CRITICAL: Check if Epic context was recently force cleared
      const lastClearTime = localStorage.getItem(JIRA_CONTEXT_CONSTANTS.STORAGE_KEYS.EPIC_FORCE_CLEAR_TIME);
      if (lastClearTime && Date.now() - parseInt(lastClearTime) < JIRA_CONTEXT_CONSTANTS.FORCE_CLEAR_BLOCK_DURATION) {
        console.log('🚫 [JIRA-CONTEXT] Epic context refresh blocked - recently cleared');
        return { success: true, data: null };
      }
      
      // CRITICAL: Check if Epic context was cleared due to project change
      const epicClearedTime = localStorage.getItem('epic_context_cleared_at');
      if (epicClearedTime && Date.now() - parseInt(epicClearedTime) < 10000) { // Block for 10 seconds after clearing
        console.log('🚫 [JIRA-CONTEXT] Epic context refresh blocked - cleared due to project change');
        return { success: true, data: null };
      }
      
      setState(prev => ({ ...prev, isLoadingEpic: true }));
      
      const result = await jiraService.getEpicContext().catch((error) => {
        // Enhanced error handling for server unavailability
        if (error.message.includes('Network Error') || 
            error.message.includes('ERR_CONNECTION_REFUSED') ||
            error.message.includes('Failed to fetch') ||
            error.code === 'ECONNABORTED') {
          console.warn('🔌 [JIRA-CONTEXT] Server not available during Epic refresh, clearing cached data');
          localStorage.removeItem('specweave_epic_context');
          return { success: true, data: null, offline: true };
        }
        return { success: false, error: error.message };
      });
      
      // CRITICAL: Double-check if Epic was cleared while we were fetching
      const epicClearedTimeAfter = localStorage.getItem('epic_context_cleared_at');
      if (epicClearedTimeAfter && parseInt(epicClearedTimeAfter) > (epicClearedTime ? parseInt(epicClearedTime) : 0)) {
        console.log('🚫 [JIRA-CONTEXT] Epic context refresh cancelled - cleared during fetch');
        setState(prev => ({
          ...prev,
          epicContext: null,
          hasEpic: false,
          isLoadingEpic: false,
          error: null,
          lastUpdated: new Date()
        }));
        return { success: true, data: null };
      }
      
      setState(prev => ({
        ...prev,
        epicContext: result.success ? result.data : null,
        hasEpic: result.success && result.data !== null,
        isLoadingEpic: false,
        error: null,
        lastUpdated: new Date()
      }));

      if (result.success && result.data) {
        console.log('✅ Epic context refreshed successfully');
      } else {
        console.log('📭 Epic context refresh returned no data');
      }

      return result;
    } catch (error) {
      console.warn('Epic context refresh failed:', error.message);
      setState(prev => ({
        ...prev,
        isLoadingEpic: false,
        error: null
      }));
      return { success: false, error: error.message };
    }
  }, []);

  /**
   * Set Epic context
   */
  const setEpicContext = useCallback(async (epicData) => {
    try {
      setState(prev => ({ ...prev, isLoadingEpic: true }));
      
      // CRITICAL: Clear blocking flags when Epic context is legitimately set
      console.log('🎯 [JIRA-CONTEXT] Setting Epic context, clearing blocking flags');
      localStorage.removeItem('epic_user_cleared');
      sessionStorage.removeItem('epic_context_blocked');
      localStorage.removeItem('epic_context_cleared_at');
      localStorage.removeItem('epic_force_clear_time');
      
      const epicId = epicData.workWithoutEpic ? null : epicData.epic?.id;
      const result = await jiraService.setEpicContext(epicId, epicData);
      
      if (result.success) {
        setState(prev => ({
          ...prev,
          epicContext: { epicId, epicData },
          hasEpic: true,
          isLoadingEpic: false,
          isEpicModalOpen: false,
          error: null,
          lastUpdated: new Date()
        }));
        
        console.log('✅ [JIRA-CONTEXT] Epic context set and blocking flags cleared');
      } else {
        throw new Error(result.error || 'Failed to set Epic context');
      }

      return result;
    } catch (error) {
      console.error('Error setting Epic context:', error);
      setState(prev => ({
        ...prev,
        isLoadingEpic: false,
        error: error.message
      }));
      return { success: false, error: error.message };
    }
  }, []);

  /**
   * Clear Epic context
   */
  const clearEpicContext = useCallback(async () => {
    try {
      console.log('🧹 [JIRA-CONTEXT] Clearing Epic context...');
      
      // Force clear state immediately
      setState(prev => ({
        ...prev,
        epicContext: null,
        hasEpic: false,
        isLoadingEpic: false,
        lastUpdated: new Date()
      }));
      
      console.log('✅ [JIRA-CONTEXT] Epic context state cleared immediately');
      
      // Clear via service (async, don't wait)
      jiraService.clearEpicContext().catch(error => {
        console.warn('Service clear failed (non-critical):', error.message);
      });
      
      return { success: true };
    } catch (error) {
      console.error('Error clearing Epic context:', error);
      
      // Ensure state is cleared even on error
      setState(prev => ({
        ...prev,
        epicContext: null,
        hasEpic: false,
        isLoadingEpic: false,
        error: null
      }));
      
      return { success: true };
    }
  }, []);

  /**
   * Force clear Epic context immediately (optimized)
   */
  const forceEpicContextClear = useCallback(() => {
    console.log('🧹 [JIRA-CONTEXT] ENHANCED EPIC CLEAR - ULTRA OPTIMIZED');
    
    try {
      // 1. Immediately clear state
      setState(prev => ({
        ...prev,
        epicContext: null,
        hasEpic: false,
        isLoadingEpic: false,
        error: null,
        lastUpdated: new Date()
      }));
      
      // 2. Clear all storage locations
      const epicKeys = [
        'specweave_epic_context',
        'epic_context_cleared_at',
        'epic_force_clear_time'
      ];
      
      epicKeys.forEach(key => {
        localStorage.removeItem(key);
        sessionStorage.removeItem(key);
      });
      
      // 3. Set clear timestamp
      const clearTimestamp = Date.now();
      localStorage.setItem('epic_context_cleared_at', clearTimestamp.toString());
      localStorage.setItem('epic_force_clear_time', clearTimestamp.toString());
      
      console.log('✅ [JIRA-CONTEXT] Epic context state and storage cleared immediately');
      
      // 4. Safe server clear (fire and forget)
      jiraService.clearEpicContext().catch(error => {
        console.warn('Server Epic clear warning (non-critical):', error.message);
      });
      
      // 5. Always send acknowledgment
      setTimeout(() => {
        window.dispatchEvent(new CustomEvent('epicContextClearAcknowledged', {
          detail: { timestamp: clearTimestamp }
        }));
        console.log('✅ [JIRA-CONTEXT] Epic context clear acknowledged with timestamp:', clearTimestamp);
      }, 50); // Small delay to ensure state is updated
      
      console.log('✅ [JIRA-CONTEXT] ENHANCED EPIC CLEAR - ULTRA OPTIMIZED COMPLETE');
      
    } catch (error) {
      console.warn('Epic clear warning (non-critical):', error.message);
      
      // Ensure state is cleared even if there are errors
      setState(prev => ({
        ...prev,
        epicContext: null,
        hasEpic: false,
        isLoadingEpic: false,
        error: null
      }));
      
      // Still send acknowledgment even on error
      setTimeout(() => {
        const clearTimestamp = Date.now();
        localStorage.setItem('epic_context_cleared_at', clearTimestamp.toString());
        
        window.dispatchEvent(new CustomEvent('epicContextClearAcknowledged', {
          detail: { timestamp: clearTimestamp }
        }));
        console.log('✅ [JIRA-CONTEXT] Epic context clear acknowledged (error case) with timestamp:', clearTimestamp);
      }, 50);
    }
  }, []);

  // Modal controls
  const openEpicModal = useCallback(() => {
    setState(prev => ({ ...prev, isEpicModalOpen: true }));
  }, []);

  const closeEpicModal = useCallback(() => {
    setState(prev => ({ ...prev, isEpicModalOpen: false }));
  }, []);

  const openJiraSetupModal = useCallback(() => {
    setState(prev => ({ ...prev, isJiraSetupModalOpen: true }));
  }, []);

  const closeJiraSetupModal = useCallback(() => {
    setState(prev => ({ ...prev, isJiraSetupModalOpen: false }));
  }, []);

  /**
   * Complete refresh (connections + Epic)
   */
  const refreshAll = useCallback(async () => {
    const [connectionsResult, epicResult] = await Promise.all([
      refreshConnections(),
      refreshEpicContext()
    ]);
    
    return {
      connections: connectionsResult,
      epic: epicResult
    };
  }, [refreshConnections, refreshEpicContext]);

  /**
   * Get status summary
   */
  const getStatus = useCallback(() => {
    return getStatusSummary(state);
  }, [state]);

  const value = {
    // State
    ...state,
    
    // Actions
    refreshConnections,
    refreshEpicContext,
    setEpicContext,
    clearEpicContext,
    forceEpicContextClear,
    refreshAll,
    
    // Modal controls
    openEpicModal,
    closeEpicModal,
    openJiraSetupModal,
    closeJiraSetupModal,
    
    // Utilities
    getStatus,
    
    // Computed values
    isLoading: state.isLoadingConnections || state.isLoadingEpic,
    isReady: state.hasConnection && state.hasEpic
  };

  return (
    <JiraContext.Provider value={value}>
      {children}
    </JiraContext.Provider>
  );
};

export default JiraContext;