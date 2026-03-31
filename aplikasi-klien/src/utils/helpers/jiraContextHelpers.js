import { JIRA_CONTEXT_CONSTANTS } from '../constants/jiraContextConstants';

/**
 * Helper functions untuk JIRA Context
 */

/**
 * Get initial state untuk JIRA Context
 */
export function getInitialState() {
  return {
    // Connection State
    connections: [],
    hasConnection: false,
    isLoadingConnections: true,
    
    // Epic State
    epicContext: null,
    hasEpic: false,
    isLoadingEpic: true,
    
    // UI State
    isEpicModalOpen: false,
    isJiraSetupModalOpen: false,
    
    // Error State
    error: null,
    
    // Last Updated
    lastUpdated: null,
    
    // Cache State
    lastConnectionsRefresh: null,
    lastEpicRefresh: null
  };
}

/**
 * Handle force Epic clear (legacy function - now uses database)
 */
export function handleForceEpicClear(setState) {
  
  // Update state to clear Epic context
  setState(prev => ({
    ...prev,
    epicContext: null,
    hasEpic: false,
    isLoadingEpic: false,
    error: null,
    lastUpdated: new Date()
  }));
  
  // Dispatch event to notify components
  const currentPath = window.location.pathname;
  const chatId = currentPath.split('/').pop() || 'default-chat';
  
  window.dispatchEvent(new CustomEvent('forceEpicContextClear', {
    detail: { chatId, timestamp: Date.now() }
  }));
}

/**
 * Get status summary berdasarkan current state
 */
export function getStatusSummary(state) {
  const { STATUS_TYPES, STATUS_MESSAGES, STATUS_COLORS } = JIRA_CONTEXT_CONSTANTS;

  if (state.isLoadingConnections || state.isLoadingEpic) {
    return {
      status: STATUS_TYPES.LOADING,
      message: STATUS_MESSAGES.LOADING,
      color: STATUS_COLORS.LOADING
    };
  }

  if (state.error) {
    return {
      status: STATUS_TYPES.ERROR,
      message: state.error,
      color: STATUS_COLORS.ERROR
    };
  }

  if (!state.hasConnection) {
    return {
      status: STATUS_TYPES.NO_CONNECTION,
      message: STATUS_MESSAGES.NO_CONNECTION,
      color: STATUS_COLORS.NO_CONNECTION
    };
  }

  if (!state.hasEpic) {
    return {
      status: STATUS_TYPES.NO_EPIC,
      message: STATUS_MESSAGES.NO_EPIC,
      color: STATUS_COLORS.NO_EPIC
    };
  }

  return {
    status: STATUS_TYPES.READY,
    message: STATUS_MESSAGES.READY,
    color: STATUS_COLORS.READY
  };
}

/**
 * Check if cache is valid
 */
export function isCacheValid(lastRefreshTime, cacheDuration = JIRA_CONTEXT_CONSTANTS.CACHE_DURATION) {
  if (!lastRefreshTime) return false;
  
  const timeSinceLastRefresh = Date.now() - lastRefreshTime;
  return timeSinceLastRefresh < cacheDuration;
}

/**
 * Safe storage operation (legacy function - now uses database)
 */
export function safeStorageOperation(operation, key, value = null) {

  return null;
}

/**
 * Format connection data untuk display
 */
export function formatConnectionForDisplay(connection) {
  return {
    ...connection,
    displayName: connection.name || connection.url || 'Unknown Connection',
    isActive: connection.status === 'active' || connection.connected === true,
    lastUsed: connection.lastUsed ? new Date(connection.lastUsed).toLocaleDateString() : 'Never'
  };
}

/**
 * Validate Epic context data
 */
export function validateEpicContext(epicContext) {
  if (!epicContext) return false;
  
  // Check if it's a "work without epic" context
  if (epicContext.workWithoutEpic === true) return true;
  
  // Check if it has valid epic data
  return epicContext.epicId || (epicContext.epic && epicContext.epic.id);
}