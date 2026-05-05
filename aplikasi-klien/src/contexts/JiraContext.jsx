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

// ─────────────────────────────────────────────────────────────────────────
// Helper: deteksi komprehensif error "project tidak ditemukan di Atlassian"
// Dipakai untuk auto-cleanup ghost project saat user refresh (Ctrl+R)
// ─────────────────────────────────────────────────────────────────────────
const isProjectNotFoundError = (error, errorMessage = '') => {
  // Cek HTTP status code dari berbagai bentuk error object
  const status = error?.response?.status || error?.status || error?.statusCode;
  if (status === 404 || status === 410) return true;

  // Gabungkan semua sumber pesan error yang mungkin ada
  const sources = [
    errorMessage,
    error?.message,
    Array.isArray(error?.response?.data?.errorMessages)
      ? error.response.data.errorMessages.join(' ')
      : '',
    error?.response?.data?.message,
    error?.response?.data?.error,
    error?.data?.error,
    error?.data?.message,
  ].filter(Boolean).join(' ').toLowerCase();

  if (!sources) return false;

  const notFoundPatterns = [
    '404',
    '410',
    'not found',
    'does not exist',
    "doesn't exist",
    'could not be found',
    'no project could be found',
    'no project found',
    'project not found',
    'no longer exists',
    'has been deleted',
    'invalid project',
    'project deleted',
    'unknown project',
    'project key',           // sering muncul: "...with project key 'XYZ' was not found"
    'gone',                  // HTTP 410
    'no such project',
    'project does not'
  ];

  return notFoundPatterns.some(pattern => sources.includes(pattern));
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
    setTimeout(() => {
      if (window.jiraContext && window.jiraContext.refreshConnections) {
        window.jiraContext.refreshConnections(false);
      }
    }, 2000);

  }, []);

  // Load initial data
  useEffect(() => {
    // Prevent duplicate initialization in React Strict Mode
    if (initializationManager.isJiraInitialized()) {

      const existingPromise = initializationManager.getJiraPromise();
      if (existingPromise) {
        existingPromise.then(() => {
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
    }, 5000);

    // Setup event listeners untuk force Epic context events
    const handleForceEpicClearEvent = () => {
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

      forceEpicContextClear();
    };

    const handleForceEpicRefreshEvent = () => {
      refreshEpicContext();
    };

    const handleForceConnectionsRefreshEvent = (event) => {
      if (event.detail?.updatedConnections) {
        setState(prev => ({
          ...prev,
          connections: event.detail.updatedConnections,
          hasConnection: event.detail.updatedConnections.length > 0,
          lastUpdated: new Date(),
          lastConnectionsRefresh: Date.now()
        }));

        setTimeout(() => {
          refreshConnections(true);
        }, 200);
      } else {
        refreshConnections(true);
      }
    };

    const handleJiraStateChangedEvent = (event) => {
      if (event.detail?.action === 'connectionDeleted') {
        const { connectionId, updatedConnections } = event.detail;

        setState(prev => {
          let newState = { ...prev };

          if (updatedConnections) {
            newState.connections = updatedConnections;
            newState.hasConnection = updatedConnections.length > 0;
          }

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
        if (event.detail?.updatedConnections) {
          setState(prev => ({
            ...prev,
            connections: event.detail.updatedConnections,
            hasConnection: event.detail.updatedConnections.length > 0,
            lastUpdated: new Date(),
            lastConnectionsRefresh: Date.now()
          }));
        } else {
          refreshConnections(true);
        }
      }
    };

    const handleForceUIRefreshEvent = (event) => {
      if (event.detail?.updatedConnections) {
        setState(prev => ({
          ...prev,
          connections: event.detail.updatedConnections,
          hasConnection: event.detail.updatedConnections.length > 0,
          lastUpdated: new Date(),
          lastConnectionsRefresh: Date.now()
        }));
      } else {
        refreshConnections(true);

        setState(prev => ({
          ...prev,
          lastUpdated: new Date()
        }));
      }
    };

    const handleActiveProjectChanged = (event) => {

      if (event.detail?.projectChanged) {

        setState(prev => ({
          ...prev,
          epicContext: null,
          hasEpic: false,
          isLoadingEpic: false,
          lastUpdated: new Date()
        }));

        const epicKeys = [
          'specweave_epic_context',
          'epic_context_cleared_at',
          'epic_force_clear_time'
        ];

        epicKeys.forEach(key => {
          localStorage.removeItem(key);
          sessionStorage.removeItem(key);
        });

        const clearTimestamp = Date.now();
        localStorage.setItem('epic_context_cleared_at', clearTimestamp.toString());

      }
    };

    const handleProjectChanged = (event) => {
      console.log('🔄 [JIRA-CONTEXT] Project changed event received:', event.detail);

      setTimeout(() => {
        if (window.jiraContext && window.jiraContext.refreshConnections) {
          window.jiraContext.refreshConnections(true);
        }
      }, 100);
    };

    const handleActiveProjectUpdated = (event) => {
      console.log('🔄 [JIRA-CONTEXT] Active project updated event received:', event.detail);

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
    if (state.connections.length === 0 && (state.hasEpic || state.epicContext)) {
      console.log('🧹 [JIRA-CONTEXT] No connections but epic exists, auto-clearing...');

      setState(prev => ({
        ...prev,
        epicContext: null,
        hasEpic: false,
        isLoadingEpic: false,
        lastUpdated: new Date()
      }));

      localStorage.removeItem('specweave_epic_context');
      sessionStorage.removeItem('epic_context_blocked');

      const clearTime = Date.now();
      localStorage.setItem('epic_context_cleared_at', clearTime.toString());
      localStorage.setItem('epic_force_clear_time', clearTime.toString());
      localStorage.setItem('epic_user_cleared', 'true');

      window.dispatchEvent(new CustomEvent('forceEpicContextClear'));
      window.dispatchEvent(new CustomEvent('epicContextCleared'));
    }

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

          localStorage.removeItem('specweave_epic_context');
          const clearTime = Date.now();
          localStorage.setItem('epic_context_cleared_at', clearTime.toString());

          window.dispatchEvent(new CustomEvent('forceEpicContextClear'));
        }
      }
    }
  }, [state.connections.length, state.hasEpic, state.epicContext, state.isLoadingConnections]);

  // ─────────────────────────────────────────────────────────────────────────
  // AUTO-VALIDATION: Validate all connected projects on page load/refresh
  // FIXED: pakai isProjectNotFoundError() yang lebih komprehensif
  // ─────────────────────────────────────────────────────────────────────────
  useEffect(() => {
    const validateConnectedProjects = async () => {
      if (state.connections.length === 0 || state.isLoadingConnections) {
        return;
      }

      console.log('🔍 [JIRA-VALIDATION] Starting auto-validation of connected projects...');

      const validationPromises = state.connections.map(async (connection) => {
        try {
          const result = await Promise.race([
            jiraService.validateProjectConfiguration(connection.id),
            new Promise((_, reject) =>
              setTimeout(() => reject(new Error('Validation timeout')), 15000)
            )
          ]);

          if (!result?.success) {
            console.warn(`❌ [JIRA-VALIDATION] ${connection.project_key} failed:`, result?.error);

            // ENHANCED: pakai pattern matching komprehensif
            if (isProjectNotFoundError(null, result?.error)) {
              return { invalid: true, connection, reason: 'not_found' };
            }
            // Error lain (network, auth, dll) — biarkan, jangan auto-hapus
            return { invalid: false };
          }

          console.log(`✅ [JIRA-VALIDATION] ${connection.project_key} is valid`);
          return { invalid: false };
        } catch (error) {
          console.error(`❌ [JIRA-VALIDATION] Error validating ${connection.project_key}:`, error);

          // CRITICAL FIX: kalau exception-nya jelas 404, treat as invalid
          if (isProjectNotFoundError(error)) {
            return { invalid: true, connection, reason: 'not_found_exception' };
          }

          return { invalid: false };
        }
      });

      const results = await Promise.all(validationPromises);
      const invalidResults = results.filter(r => r.invalid);

      if (invalidResults.length > 0) {
        console.log(`🗑️ [JIRA-VALIDATION] Found ${invalidResults.length} ghost project(s), auto-disconnecting...`);

        const deletePromises = invalidResults.map(async ({ connection, reason }) => {
          try {
            await jiraService.deleteConnection(connection.id);
            console.log(`✅ [JIRA-VALIDATION] Auto-disconnected ${connection.project_key} (reason: ${reason})`);

            if (window.toast) {
              window.toast.warning(
                `Project "${connection.project_key}" tidak ditemukan di Atlassian dan telah di-disconnect`,
                { duration: 5000, position: 'top-right' }
              );
            }
            return true;
          } catch (error) {
            console.error(`❌ Failed to auto-disconnect ${connection.project_key}:`, error);
            return false;
          }
        });

        await Promise.all(deletePromises);

        // CRITICAL: update state langsung tanpa nunggu event
        const invalidIds = new Set(invalidResults.map(r => r.connection.id));
        setState(prev => {
          const filtered = prev.connections.filter(c => !invalidIds.has(c.id));
          return {
            ...prev,
            connections: filtered,
            hasConnection: filtered.length > 0,
            lastUpdated: new Date()
          };
        });

        // Dispatch event untuk komponen lain
        setTimeout(() => {
          window.dispatchEvent(new CustomEvent('forceConnectionsRefresh', {
            detail: { source: 'auto-validation' }
          }));
        }, 300);
      } else {
        console.log('✅ [JIRA-VALIDATION] All connected projects are valid');
      }
    };

    if (state.connections.length > 0 && !state.isLoadingConnections) {
      validateConnectedProjects();
    }
  }, [state.connections, state.isLoadingConnections]);

  /**
   * Load initial data dengan timeout yang reasonable dan duplicate prevention
   * FIXED: pre-validate connections terhadap Atlassian SEBELUM render
   *        supaya ghost project langsung hilang saat refresh (Ctrl+R)
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
            setTimeout(() => reject(new Error('Connection timeout')), 45000)
          )
        ]).catch((error) => {
          console.warn('⚠️ Connection fetch failed:', error.message);
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
          (async () => {
            const epicClearedTime = localStorage.getItem('epic_context_cleared_at');
            const forceClearTime = localStorage.getItem('epic_force_clear_time');

            const now = Date.now();
            const extendedBlockDuration = 300000; // 5 minutes

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

            const userClearedFlag = localStorage.getItem('epic_user_cleared');
            if (userClearedFlag === 'true') {
              console.log(`🚫 [JIRA-CONTEXT] Epic context load blocked - user explicitly cleared`);
              return { success: true, data: null, blocked: true, reason: 'user_cleared' };
            }

            const sessionBlockFlag = sessionStorage.getItem('epic_context_blocked');
            if (sessionBlockFlag === 'true') {
              console.log(`🚫 [JIRA-CONTEXT] Epic context load blocked - session blocked`);
              return { success: true, data: null, blocked: true, reason: 'session_blocked' };
            }

            try {
              return await jiraService.getEpicContext();
            } catch (error) {
              if (error.message.includes('Network Error') ||
                  error.message.includes('ERR_CONNECTION_REFUSED') ||
                  error.message.includes('Failed to fetch') ||
                  error.code === 'ECONNABORTED') {
                console.warn('🔌 [JIRA-CONTEXT] Server not available for Epic context, clearing cached data');
                localStorage.removeItem('specweave_epic_context');
                return { success: true, data: null, offline: true };
              }
              throw error;
            }
          })(),
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Epic context timeout')), 45000)
          )
        ]).catch((error) => {
          console.warn('⚠️ Epic context fetch failed:', error.message);
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

      // ─────────────────────────────────────────────────────────────────
      // CRITICAL FIX: Pre-validate connections terhadap Atlassian
      // SEBELUM dipasang ke state. Ini memastikan ghost project (yang sudah
      // dihapus di Atlassian) langsung tersaring saat user refresh (Ctrl+R)
      // ─────────────────────────────────────────────────────────────────
      let validConnections = connections;

      if (connections.length > 0) {
        console.log('🔍 [JIRA-CONTEXT] Pre-validating connections on initial load...');

        const validationResults = await Promise.all(
          connections.map(async (connection) => {
            try {
              const result = await Promise.race([
                jiraService.validateProjectConfiguration(connection.id),
                new Promise((_, reject) =>
                  setTimeout(() => reject(new Error('Validation timeout')), 12000)
                )
              ]);

              // Project tidak ada di Atlassian
              if (!result?.success && isProjectNotFoundError(null, result?.error)) {
                console.warn(`🗑️ [JIRA-CONTEXT] Ghost project detected: ${connection.project_key}`);

                // Auto-hapus dari database (fire-and-forget, jangan blok UI)
                jiraService.deleteConnection(connection.id).catch(err =>
                  console.warn(`Failed to delete ghost ${connection.project_key}:`, err)
                );

                if (window.toast) {
                  window.toast.warning(
                    `Project "${connection.project_key}" tidak ditemukan di Atlassian dan telah dihapus`,
                    { duration: 5000, position: 'top-right' }
                  );
                }

                return null; // tandai untuk dibuang
              }

              return connection;
            } catch (error) {
              // Kalau exception jelas 404, juga buang
              if (isProjectNotFoundError(error)) {
                console.warn(`🗑️ [JIRA-CONTEXT] Ghost project (exception): ${connection.project_key}`);
                jiraService.deleteConnection(connection.id).catch(() => {});

                if (window.toast) {
                  window.toast.warning(
                    `Project "${connection.project_key}" tidak ditemukan di Atlassian dan telah dihapus`,
                    { duration: 5000, position: 'top-right' }
                  );
                }

                return null;
              }
              // Error lain (network, timeout) — pertahankan koneksi,
              // biar useEffect validasi yang handle nanti
              return connection;
            }
          })
        );

        validConnections = validationResults.filter(c => c !== null);

        if (validConnections.length < connections.length) {
          console.log(
            `🧹 [JIRA-CONTEXT] Filtered ${connections.length - validConnections.length} ghost connection(s) on load`
          );
        }

        cleanupInvalidActiveProjects(validConnections);

        // Kalau semua koneksi ternyata ghost dan terhapus, clear epic juga
        if (validConnections.length === 0) {
          console.log('🧹 [JIRA-CONTEXT] All connections were ghosts, clearing epic context');
          localStorage.removeItem('specweave_epic_context');
          sessionStorage.removeItem('epic_context_blocked');

          const clearTime = Date.now();
          localStorage.setItem('epic_context_cleared_at', clearTime.toString());
          localStorage.setItem('epic_force_clear_time', clearTime.toString());
          localStorage.setItem('epic_user_cleared', 'true');

          epicContext = null;
        }
      } else {
        // Tidak ada koneksi sama sekali — pastikan epic context juga clear
        console.log('🧹 [JIRA-CONTEXT] No connections found, ensuring epic context is cleared');

        localStorage.removeItem('specweave_epic_context');
        sessionStorage.removeItem('epic_context_blocked');

        const clearTime = Date.now();
        localStorage.setItem('epic_context_cleared_at', clearTime.toString());
        localStorage.setItem('epic_force_clear_time', clearTime.toString());
        localStorage.setItem('epic_user_cleared', 'true');

        epicContext = null;
      }

      setState(prev => ({
        ...prev,
        connections: validConnections,
        hasConnection: validConnections.length > 0,
        epicContext,
        hasEpic: epicContext !== null,
        isLoadingConnections: false,
        isLoadingEpic: false,
        error: null,
        lastUpdated: new Date()
      }));

      if (validConnections.length > 0) {

      }

    } catch (error) {
      console.error('Error loading initial JIRA data:', error);
      setState(prev => ({
        ...prev,
        isLoadingConnections: false,
        isLoadingEpic: false,
        error: null
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

      setState(prev => ({
        ...prev,
        isLoadingConnections: true,
        lastConnectionsRefresh: Date.now()
      }));

      let result = null;
      try {
        result = await jiraService.getConnections();
        console.log('✅ [NUCLEAR] Got connections from JiraService:', result.data?.length || 0);
      } catch (error) {
        console.warn('⚠️ [NUCLEAR] JiraService failed, using empty array');
        result = { success: true, data: [] };
      }

      const connections = result.success ? result.data : [];

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
      const lastClearTime = localStorage.getItem(JIRA_CONTEXT_CONSTANTS.STORAGE_KEYS.EPIC_FORCE_CLEAR_TIME);
      if (lastClearTime && Date.now() - parseInt(lastClearTime) < JIRA_CONTEXT_CONSTANTS.FORCE_CLEAR_BLOCK_DURATION) {
        console.log('🚫 [JIRA-CONTEXT] Epic context refresh blocked - recently cleared');
        return { success: true, data: null };
      }

      const epicClearedTime = localStorage.getItem('epic_context_cleared_at');
      if (epicClearedTime && Date.now() - parseInt(epicClearedTime) < 10000) {
        console.log('🚫 [JIRA-CONTEXT] Epic context refresh blocked - cleared due to project change');
        return { success: true, data: null };
      }

      setState(prev => ({ ...prev, isLoadingEpic: true }));

      const result = await jiraService.getEpicContext().catch((error) => {
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

      setState(prev => ({
        ...prev,
        epicContext: null,
        hasEpic: false,
        isLoadingEpic: false,
        lastUpdated: new Date()
      }));

      jiraService.clearEpicContext().catch(error => {
        console.warn('Service clear failed (non-critical):', error.message);
      });

      return { success: true };
    } catch (error) {
      console.error('Error clearing Epic context:', error);

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

      setState(prev => ({
        ...prev,
        isDeleting: true,
        deletingConnectionId: connectionId
      }));

      const originalConnections = state.connections;
      const optimisticConnections = originalConnections.filter(conn => conn.id !== connectionId);

      setState(prev => ({
        ...prev,
        connections: optimisticConnections,
        hasConnection: optimisticConnections.length > 0,
        lastUpdated: new Date()
      }));

      if (window.toast) {
        window.toast.loading('Removing project connection...', {
          id: `delete-${connectionId}`,
          duration: 2000
        });
      }

      const result = await jiraService.deleteConnection(connectionId);

      if (result.success) {
        console.log('✅ [SMOOTH-DELETE] Delete confirmed by server');

        if (window.toast) {
          window.toast.success('Project connection removed successfully', {
            id: `delete-${connectionId}`,
            duration: 3000
          });
        }

        await clearEpicContextForConnection(connectionId);

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

        window.dispatchEvent(new CustomEvent('jiraConnectionDeleted', {
          detail: {
            connectionId,
            updatedConnections: optimisticConnections,
            success: true
          }
        }));

      } else {
        console.error('❌ [SMOOTH-DELETE] Delete failed, rolling back UI');

        setState(prev => ({
          ...prev,
          connections: originalConnections,
          hasConnection: originalConnections.length > 0,
          error: result.error
        }));

        if (window.toast) {
          window.toast.error(`Failed to delete connection: ${result.error}`, {
            id: `delete-${connectionId}`,
            duration: 4000
          });
        }
      }

      setState(prev => ({
        ...prev,
        isDeleting: false,
        deletingConnectionId: null
      }));

      return result;

    } catch (error) {
      console.error('❌ [SMOOTH-DELETE] Delete error:', error);

      setState(prev => ({
        ...prev,
        connections: state.connections,
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

      window.dispatchEvent(new CustomEvent('epicContextCleared', {
        detail: { connectionId }
      }));

    } catch (error) {
      console.warn('⚠️ [SMOOTH-DELETE] Failed to clear epic context:', error);
    }
  };

  const forceEpicContextClear = useCallback(() => {

    try {
      setState(prev => ({
        ...prev,
        epicContext: null,
        hasEpic: false,
        isLoadingEpic: false,
        error: null,
        lastUpdated: new Date()
      }));

      const epicKeys = [
        'specweave_epic_context',
        'epic_context_cleared_at',
        'epic_force_clear_time'
      ];

      epicKeys.forEach(key => {
        localStorage.removeItem(key);
        sessionStorage.removeItem(key);
      });

      const clearTimestamp = Date.now();
      localStorage.setItem('epic_context_cleared_at', clearTimestamp.toString());
      localStorage.setItem('epic_force_clear_time', clearTimestamp.toString());

      jiraService.clearEpicContext().catch(error => {
        console.warn('Server Epic clear warning (non-critical):', error.message);
      });

      setTimeout(() => {
        window.dispatchEvent(new CustomEvent('epicContextClearAcknowledged', {
          detail: { timestamp: clearTimestamp }
        }));

      }, 50);

    } catch (error) {
      console.warn('Epic clear warning (non-critical):', error.message);

      setState(prev => ({
        ...prev,
        epicContext: null,
        hasEpic: false,
        isLoadingEpic: false,
        error: null
      }));

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