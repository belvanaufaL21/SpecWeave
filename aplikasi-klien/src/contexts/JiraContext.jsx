import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { jiraService } from '../services/jiraService';
import { JIRA_CONTEXT_CONSTANTS } from '../utils/constants/jiraContextConstants';
import { 
  getInitialState,
  getStatusSummary
} from '../utils/helpers/jiraContextHelpers';
import { cleanupInvalidActiveProjects } from '../utils/helpers/activeProjectHelpers';
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

  // SMOOTH DELETE: Event handlers defined outside useEffect
  const handleJiraConnectionDeletedEvent = useCallback((event) => {
    const { connectionId, updatedConnections } = event.detail;
    
    // IMMEDIATE UI UPDATE: Remove from state instantly
    setState(prev => {
      const filteredConnections = prev.connections.filter(conn => conn.id !== connectionId);
      
      return {
        ...prev,
        connections: filteredConnections,
        hasConnection: filteredConnections.length > 0,
        lastUpdated: new Date(),
        isDeleting: false // Clear any delete loading state
      };
    });
    
    // SMOOTH FEEDBACK: Show success toast
    if (window.toast) {
      window.toast.success('Project connection removed successfully', {
        duration: 3000,
        position: 'top-right'
      });
    }
    
    // DISPATCH UI REFRESH EVENT for other components
    window.dispatchEvent(new CustomEvent('jiraConnectionsUpdated', {
      detail: {
        connections: updatedConnections || [],
        hasConnection: (updatedConnections || []).length > 0,
        action: 'delete',
        deletedConnectionId: connectionId,
        timestamp: Date.now()
      }
    }));
    
    // BACKGROUND SYNC: Verify state in background (no UI impact)
    // Use setTimeout to avoid dependency issues
    setTimeout(() => {
      // Call refreshConnections if it exists
      if (window.jiraContext && window.jiraContext.refreshConnections) {
        window.jiraContext.refreshConnections(false);
      }
    }, 2000);
    
  }, []);  // Remove refreshConnections from dependency for now

  // Load initial data
  useEffect(() => {
    // Prevent duplicate initialization in React Strict Mode
    if (initializationManager.isJiraInitialized()) {
      
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
    
    // Start token health monitoring after initialization
    setTimeout(() => {
      jiraService.startHealthMonitoring(30); // Check every 30 minutes
    }, 5000); // Start after 5 seconds to allow initialization
    
    // Setup event listeners untuk force Epic context events
    const handleForceEpicClearEvent = () => {
      // CRITICAL FIX: Immediately clear epic context state
      setState(prev => {
        if (prev.epicContext) {
          return {
            ...prev,
            epicContext: null,
            hasEpic: false,
            isLoadingEpic: false,
            lastUpdated: new Date()
          };
        }
        return prev;
      });
      
      // Also call the existing forceEpicContextClear function
      forceEpicContextClear();
    };
    
    const handleForceEpicRefreshEvent = () => {
      refreshEpicContext();
    };
    
    const handleForceConnectionsRefreshEvent = (event) => {
      // CRITICAL FIX: If event contains updated connections, use them immediately
      if (event.detail?.updatedConnections) {
        setState(prev => ({
          ...prev,
          connections: event.detail.updatedConnections,
          hasConnection: event.detail.updatedConnections.length > 0,
          lastUpdated: new Date(),
          lastConnectionsRefresh: Date.now()
        }));
        
        // ENHANCED: Force additional refresh after delay to ensure UI update
        setTimeout(() => {
          refreshConnections(true);
        }, 200);
      } else {
        // Fallback to force refresh from server
        refreshConnections(true);
      }
    };
    
    const handleJiraStateChangedEvent = (event) => {
      if (event.detail?.action === 'connectionDeleted') {
        const { connectionId, updatedConnections } = event.detail;
        
        // CRITICAL FIX: Clear epic context if related to deleted connection
        setState(prev => {
          let newState = { ...prev };
          
          // Update connections
          if (updatedConnections) {
            newState.connections = updatedConnections;
            newState.hasConnection = updatedConnections.length > 0;
          }
          
          // CRITICAL: Clear epic context if it's related to deleted connection
          if (prev.epicContext) {
            const epicConnectionId = 
              prev.epicContext.epicData?.connection?.id ||
              prev.epicContext.connectionId;
            
            if (epicConnectionId === connectionId) {
              newState.epicContext = null;
              newState.hasEpic = false;
              newState.isLoadingEpic = false;
            }
          }
          
          newState.lastUpdated = new Date();
          newState.lastConnectionsRefresh = Date.now();
          
          return newState;
        });
      } else {
        // CRITICAL FIX: If event contains updated connections, use them immediately
        if (event.detail?.updatedConnections) {
          setState(prev => ({
            ...prev,
            connections: event.detail.updatedConnections,
            hasConnection: event.detail.updatedConnections.length > 0,
            lastUpdated: new Date(),
            lastConnectionsRefresh: Date.now()
          }));
        } else {
          // Fallback to force refresh and clear epic context
          refreshConnections(true);
        }
      }
    };
    
    const handleForceUIRefreshEvent = (event) => {
      // CRITICAL FIX: If event contains updated connections, use them immediately
      if (event.detail?.updatedConnections) {
        setState(prev => ({
          ...prev,
          connections: event.detail.updatedConnections,
          hasConnection: event.detail.updatedConnections.length > 0,
          lastUpdated: new Date(),
          lastConnectionsRefresh: Date.now()
        }));
      } else {
        // Force refresh both connections and epic context
        refreshConnections(true);
        
        // Force component re-render by updating lastUpdated
        setState(prev => ({
          ...prev,
          lastUpdated: new Date()
        }));
      }
    };
    
    // CRITICAL: Listen for active project changes to clear Epic context
    const handleActiveProjectChanged = (event) => {
      
      if (event.detail?.projectChanged) {
        
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

      }
    };
    
    // Handler untuk project changed event
    const handleProjectChanged = (event) => {
      console.log('🔄 [JIRA-CONTEXT] Project changed event received:', event.detail);
      
      // Refresh connections to update UI (hanya sekali)
      setTimeout(() => {
        if (window.jiraContext && window.jiraContext.refreshConnections) {
          window.jiraContext.refreshConnections(true);
        }
      }, 100);
    };

    // Handler untuk active project updated event
    const handleActiveProjectUpdated = (event) => {
      console.log('🔄 [JIRA-CONTEXT] Active project updated event received:', event.detail);
      
      // Refresh connections to update UI (hanya sekali)
      setTimeout(() => {
        if (window.jiraContext && window.jiraContext.refreshConnections) {
          window.jiraContext.refreshConnections(true);
        }
      }, 100);
    };
    
    window.addEventListener('forceEpicContextClear', handleForceEpicClearEvent);
    window.addEventListener('forceEpicContextRefresh', handleForceEpicRefreshEvent);
    window.addEventListener('forceConnectionsRefresh', handleForceConnectionsRefreshEvent);
    window.addEventListener('jiraConnectionDeleted', handleJiraConnectionDeletedEvent);
    window.addEventListener('jiraConnectionChanged', handleProjectChanged);
    window.addEventListener('jiraStateChanged', handleJiraStateChangedEvent);
    window.addEventListener('forceUIRefresh', handleForceUIRefreshEvent);
    window.addEventListener('activeProjectChanged', handleActiveProjectChanged);
    window.addEventListener('activeProjectUpdated', handleActiveProjectUpdated);
    
    return () => {
      window.removeEventListener('forceEpicContextClear', handleForceEpicClearEvent);
      window.removeEventListener('forceEpicContextRefresh', handleForceEpicRefreshEvent);
      window.removeEventListener('forceConnectionsRefresh', handleForceConnectionsRefreshEvent);
      window.removeEventListener('jiraConnectionDeleted', handleJiraConnectionDeletedEvent);
      window.removeEventListener('jiraConnectionChanged', handleProjectChanged);
      window.removeEventListener('jiraStateChanged', handleJiraStateChangedEvent);
      window.removeEventListener('forceUIRefresh', handleForceUIRefreshEvent);
      window.removeEventListener('activeProjectChanged', handleActiveProjectChanged);
      window.removeEventListener('activeProjectUpdated', handleActiveProjectUpdated);
    };
  }, [handleJiraConnectionDeletedEvent]);

  // ENHANCED: Validation useEffect to ensure epic context consistency
  useEffect(() => {
    // CRITICAL: Validate epic context whenever connections change
    if (state.connections.length === 0 && (state.hasEpic || state.epicContext)) {
      console.log('🧹 [JIRA-CONTEXT] No connections but epic exists, auto-clearing...');
      
      setState(prev => ({
        ...prev,
        epicContext: null,
        hasEpic: false,
        isLoadingEpic: false,
        lastUpdated: new Date()
      }));
      
      // Clear storage
      localStorage.removeItem('specweave_epic_context');
      sessionStorage.removeItem('epic_context_blocked');
      
      const clearTime = Date.now();
      localStorage.setItem('epic_context_cleared_at', clearTime.toString());
      localStorage.setItem('epic_force_clear_time', clearTime.toString());
      localStorage.setItem('epic_user_cleared', 'true');
      
      // Dispatch clear events
      window.dispatchEvent(new CustomEvent('forceEpicContextClear'));
      window.dispatchEvent(new CustomEvent('epicContextCleared'));
    }
    
    // ENHANCED: Validate epic connection still exists
    // GUARD: Only validate if connections are loaded and stable (not during refresh)
    if (state.hasEpic && state.epicContext && state.connections.length > 0 && !state.isLoadingConnections) {
      const epicConnectionId = state.epicContext.epicData?.connection?.id;
      
      if (epicConnectionId) {
        const connectionExists = state.connections.some(conn => conn.id === epicConnectionId);
        
        if (!connectionExists) {
          console.log('🧹 [JIRA-CONTEXT] Epic connection no longer exists, clearing epic context...');
          
          setState(prev => ({
            ...prev,
            epicContext: null,
            hasEpic: false,
            isLoadingEpic: false,
            lastUpdated: new Date()
          }));
          
          // Clear storage
          localStorage.removeItem('specweave_epic_context');
          const clearTime = Date.now();
          localStorage.setItem('epic_context_cleared_at', clearTime.toString());
          
          // Dispatch clear events
          window.dispatchEvent(new CustomEvent('forceEpicContextClear'));
        }
      }
    }
  }, [state.connections.length, state.hasEpic, state.epicContext, state.isLoadingConnections]);

  // AUTO-VALIDATION: Validate all connected projects on page load/refresh
  useEffect(() => {
    const validateConnectedProjects = async () => {
      // Only validate if we have connections and not currently loading
      if (state.connections.length === 0 || state.isLoadingConnections) {
        return;
      }

      // Check if we've already validated in this session
      const validatedFlag = sessionStorage.getItem('jira_projects_validated');
      if (validatedFlag === 'true') {
        console.log('✅ [JIRA-VALIDATION] Projects already validated in this session');
        return;
      }

      console.log('🔍 [JIRA-VALIDATION] Starting auto-validation of connected projects...');
      
      const invalidConnections = [];
      
      // Validate each connection
      for (const connection of state.connections) {
        try {
          const result = await jiraService.validateProjectConfiguration(connection.id);
          
          if (!result.success) {
            console.warn(`❌ [JIRA-VALIDATION] Project ${connection.project_key} validation failed:`, result.error);
            
            // Check if it's a 404 error (project not found)
            if (result.error?.includes('404') || 
                result.error?.includes('not found') || 
                result.error?.includes('does not exist')) {
              invalidConnections.push(connection);
            }
          } else {
            console.log(`✅ [JIRA-VALIDATION] Project ${connection.project_key} is valid`);
          }
        } catch (error) {
          console.error(`❌ [JIRA-VALIDATION] Error validating ${connection.project_key}:`, error);
        }
      }

      // Auto-disconnect invalid projects
      if (invalidConnections.length > 0) {
        console.log(`🗑️ [JIRA-VALIDATION] Found ${invalidConnections.length} invalid project(s), auto-disconnecting...`);
        
        for (const connection of invalidConnections) {
          try {
            await jiraService.deleteConnection(connection.id);
            console.log(`✅ [JIRA-VALIDATION] Auto-disconnected: ${connection.project_key}`);
            
            // Show notification
            if (window.toast) {
              window.toast.warning(
                `Project "${connection.project_key}" tidak ditemukan di Atlassian dan telah di-disconnect`,
                {
                  duration: 5000,
                  position: 'top-right'
                }
              );
            }
          } catch (error) {
            console.error(`❌ [JIRA-VALIDATION] Failed to auto-disconnect ${connection.project_key}:`, error);
          }
        }

        // Refresh connections after cleanup using event dispatch
        setTimeout(() => {
          window.dispatchEvent(new CustomEvent('forceConnectionsRefresh', {
            detail: { source: 'auto-validation' }
          }));
        }, 1000);
      } else {
        console.log('✅ [JIRA-VALIDATION] All connected projects are valid');
      }

      // Mark as validated for this session
      sessionStorage.setItem('jira_projects_validated', 'true');
    };

    // Run validation after a short delay to ensure everything is loaded
    const validationTimer = setTimeout(() => {
      validateConnectedProjects();
    }, 2000);

    return () => clearTimeout(validationTimer);
  }, [state.connections, state.isLoadingConnections]);

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
        
      let epicContext = epicResult.status === 'fulfilled' && epicResult.value.success 
        ? epicResult.value.data 
        : null;

      // Clean up invalid active projects from localStorage
      if (connections.length > 0) {
        cleanupInvalidActiveProjects(connections);
      } else {
        // ENHANCED: If no connections, ensure epic context is cleared
        console.log('🧹 [JIRA-CONTEXT] No connections found, ensuring epic context is cleared');
        
        // Clear storage
        localStorage.removeItem('specweave_epic_context');
        sessionStorage.removeItem('epic_context_blocked');
        
        const clearTime = Date.now();
        localStorage.setItem('epic_context_cleared_at', clearTime.toString());
        localStorage.setItem('epic_force_clear_time', clearTime.toString());
        localStorage.setItem('epic_user_cleared', 'true');
        
        // Force epic context to null
        epicContext = null;
      }

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
      console.log('🔥 [NUCLEAR] ENHANCED refresh connections');
      
      // FORCE loading state
      setState(prev => ({ 
        ...prev, 
        isLoadingConnections: true,
        lastConnectionsRefresh: Date.now()
      }));

      // Try JiraService
      let result = null;
      try {
        result = await jiraService.getConnections();
        console.log('✅ [NUCLEAR] Got connections from JiraService:', result.data?.length || 0);
      } catch (error) {
        console.warn('⚠️ [NUCLEAR] JiraService failed, using empty array');
        result = { success: true, data: [] };
      }
      
      const connections = result.success ? result.data : [];
      
      // FORCE state update multiple times
      for (let i = 0; i < 3; i++) {
        setTimeout(() => {
          setState(prev => ({
            ...prev,
            connections,
            hasConnection: connections.length > 0,
            isLoadingConnections: false,
            error: null,
            lastUpdated: new Date(),
            lastConnectionsRefresh: Date.now() + i
          }));
        }, i * 50);
      }
      
      // Dispatch success event
      window.dispatchEvent(new CustomEvent('connectionsRefreshed', {
        detail: {
          connections,
          hasConnection: connections.length > 0,
          timestamp: Date.now()
        }
      }));

      return result;
    } catch (error) {
      console.error('❌ [NUCLEAR] Enhanced refresh failed:', error);
      
      // Even on error, set empty connections
      setState(prev => ({
        ...prev,
        connections: [],
        hasConnection: false,
        isLoadingConnections: false,
        error: null
      }));
      
      return { success: true, data: [] };
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
      
      // Force clear state immediately
      setState(prev => ({
        ...prev,
        epicContext: null,
        hasEpic: false,
        isLoadingEpic: false,
        lastUpdated: new Date()
      }));

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

  // ENHANCED DELETE FUNCTION with optimistic updates
  const deleteConnection = useCallback(async (connectionId) => {
    try {
      console.log(`🎯 [SMOOTH-DELETE] Starting optimistic delete for: ${connectionId}`);
      
      // STEP 1: Set loading state
      setState(prev => ({
        ...prev,
        isDeleting: true,
        deletingConnectionId: connectionId
      }));
      
      // STEP 2: Optimistic UI update - remove immediately
      const originalConnections = state.connections;
      const optimisticConnections = originalConnections.filter(conn => conn.id !== connectionId);
      
      setState(prev => ({
        ...prev,
        connections: optimisticConnections,
        hasConnection: optimisticConnections.length > 0,
        lastUpdated: new Date()
      }));
      
      // STEP 3: Show immediate feedback
      if (window.toast) {
        window.toast.loading('Removing project connection...', {
          id: `delete-${connectionId}`,
          duration: 2000
        });
      }
      
      // STEP 4: Actual delete API call
      const result = await jiraService.deleteConnection(connectionId);
      
      if (result.success) {
        console.log('✅ [SMOOTH-DELETE] Delete confirmed by server');
        
        // Update toast to success
        if (window.toast) {
          window.toast.success('Project connection removed successfully', {
            id: `delete-${connectionId}`,
            duration: 3000
          });
        }
        
        // Clear any epic context related to this connection
        await clearEpicContextForConnection(connectionId);
        
        // CRITICAL: Force refresh from database to ensure sync
        console.log('🔄 [SMOOTH-DELETE] Force refreshing connections from database');
        
        const freshResult = await jiraService.getConnections();
        if (freshResult.success) {
          setState(prev => ({
            ...prev,
            connections: freshResult.data || [],
            hasConnection: (freshResult.data || []).length > 0,
            isDeleting: false,
            deletingConnectionId: null,
            lastUpdated: new Date()
          }));
          console.log('✅ [SMOOTH-DELETE] Connections refreshed from database:', freshResult.data?.length || 0);
        }
        
        // Dispatch success event
        window.dispatchEvent(new CustomEvent('jiraConnectionDeleted', {
          detail: {
            connectionId,
            updatedConnections: optimisticConnections,
            success: true
          }
        }));
        
      } else {
        console.error('❌ [SMOOTH-DELETE] Delete failed, rolling back UI');
        
        // ROLLBACK: Restore original state
        setState(prev => ({
          ...prev,
          connections: originalConnections,
          hasConnection: originalConnections.length > 0,
          error: result.error
        }));
        
        // Show error toast
        if (window.toast) {
          window.toast.error(`Failed to delete connection: ${result.error}`, {
            id: `delete-${connectionId}`,
            duration: 4000
          });
        }
      }
      
      // STEP 5: Clear loading state
      setState(prev => ({
        ...prev,
        isDeleting: false,
        deletingConnectionId: null
      }));
      
      return result;
      
    } catch (error) {
      console.error('❌ [SMOOTH-DELETE] Delete error:', error);
      
      // ROLLBACK on error
      setState(prev => ({
        ...prev,
        connections: state.connections, // Restore original
        hasConnection: state.connections.length > 0,
        isDeleting: false,
        deletingConnectionId: null,
        error: error.message
      }));
      
      if (window.toast) {
        window.toast.error(`Delete failed: ${error.message}`, {
          id: `delete-${connectionId}`,
          duration: 4000
        });
      }
      
      return { success: false, error: error.message };
    }
  }, [state.connections]);

  // HELPER: Clear epic context for deleted connection
  const clearEpicContextForConnection = async (connectionId) => {
    try {
      console.log(`🧹 [SMOOTH-DELETE] Clearing epic context for connection: ${connectionId}`);
      
      // Clear from localStorage
      const keysToRemove = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.includes('epic_context')) {
          const data = localStorage.getItem(key);
          if (data && data.includes(connectionId)) {
            keysToRemove.push(key);
          }
        }
      }
      
      keysToRemove.forEach(key => {
        localStorage.removeItem(key);
        console.log(`🧹 Cleared epic context cache: ${key}`);
      });
      
      // Dispatch epic context clear event
      window.dispatchEvent(new CustomEvent('epicContextCleared', {
        detail: { connectionId }
      }));
      
    } catch (error) {
      console.warn('⚠️ [SMOOTH-DELETE] Failed to clear epic context:', error);
    }
  };
  const forceEpicContextClear = useCallback(() => {
    
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

      // 4. Safe server clear (fire and forget)
      jiraService.clearEpicContext().catch(error => {
        console.warn('Server Epic clear warning (non-critical):', error.message);
      });
      
      // 5. Always send acknowledgment
      setTimeout(() => {
        window.dispatchEvent(new CustomEvent('epicContextClearAcknowledged', {
          detail: { timestamp: clearTimestamp }
        }));
        
      }, 50); // Small delay to ensure state is updated

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
    deleteConnection,
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

  // Make JiraContext available globally for smooth delete integration
  useEffect(() => {
    window.jiraContext = value;
    return () => {
      delete window.jiraContext;
    };
  }, [value]);

  return (
    <JiraContext.Provider value={value}>
      {children}
    </JiraContext.Provider>
  );
};

export default JiraContext;