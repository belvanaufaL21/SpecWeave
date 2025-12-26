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
 * Handle force Epic clear dengan optimized storage operations
 */
export function handleForceEpicClear(setState) {
  // Set force clear timestamp
  const timestamp = Date.now().toString();
  localStorage.setItem(JIRA_CONTEXT_CONSTANTS.STORAGE_KEYS.EPIC_FORCE_CLEAR_TIME, timestamp);
  
  // Single state update
  setState(prev => ({
    ...prev,
    epicContext: null,
    hasEpic: false,
    isLoadingEpic: false,
    error: null,
    lastUpdated: new Date()
  }));
  
  // Optimized storage clearing
  const currentPath = window.location.pathname;
  const chatId = currentPath.split('/').pop() || 'default-chat';
  
  // Clear essential keys dengan error handling
  const essentialKeys = [
    ...JIRA_CONTEXT_CONSTANTS.ESSENTIAL_STORAGE_KEYS,
    `${JIRA_CONTEXT_CONSTANTS.STORAGE_KEYS.EPIC_CONTEXT}_${chatId}`,
    `epic_context_${chatId}`
  ];
  
  essentialKeys.forEach(key => {
    try {
      localStorage.removeItem(key);
      sessionStorage.removeItem(key);
    } catch (storageError) {
      console.warn('Storage clear warning (non-critical):', storageError.message);
    }
  });
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
 * Safe storage operation dengan error handling
 */
export function safeStorageOperation(operation, key, value = null) {
  try {
    switch (operation) {
      case 'get':
        return localStorage.getItem(key);
      case 'set':
        localStorage.setItem(key, value);
        break;
      case 'remove':
        localStorage.removeItem(key);
        break;
      default:
        console.warn('Unknown storage operation:', operation);
    }
  } catch (error) {
    console.warn(`Storage ${operation} operation failed for key ${key}:`, error.message);
    return null;
  }
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