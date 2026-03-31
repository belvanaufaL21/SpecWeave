import { 
  JIRA_CACHE_DURATION, 
  EPIC_FORCE_CLEAR_THRESHOLD,
  JIRA_STORAGE_KEYS,
  JIRA_STATUS,
  STATUS_COLORS
} from '../constants/jiraConstants';

/**
 * Check if cache is still valid
 * @param {number} lastRefresh - Last refresh timestamp
 * @param {number} duration - Cache duration in milliseconds
 * @returns {boolean} - True if cache is valid
 */
export const isCacheValid = (lastRefresh, duration = JIRA_CACHE_DURATION) => {
  if (!lastRefresh) return false;
  return Date.now() - lastRefresh < duration;
};

/**
 * Check if epic was recently force cleared (legacy function)
 * @returns {boolean} - Always returns false since Epic context is now in database
 */
export const wasRecentlyForceCleared = () => {
  
  return false;
};

/**
 * Set force clear timestamp (legacy function)
 */
export const setForceClearTimestamp = () => {
  
  // Dispatch event to notify components
  window.dispatchEvent(new CustomEvent('forceEpicContextClear', {
    detail: { timestamp: Date.now() }
  }));
};

/**
 * Clear epic-related storage keys (legacy function)
 * @param {string} chatId - Current chat ID
 */
export const clearEpicStorage = (chatId = 'default-chat') => {

  // Dispatch event to notify components
  window.dispatchEvent(new CustomEvent('forceEpicContextClear', {
    detail: { chatId, timestamp: Date.now() }
  }));
};

/**
 * Get current chat ID from URL
 * @returns {string} - Chat ID
 */
export const getCurrentChatId = () => {
  const currentPath = window.location.pathname;
  return currentPath.split('/').pop() || 'default-chat';
};

/**
 * Determine JIRA status based on state
 * @param {Object} state - JIRA context state
 * @returns {Object} - Status object with status, message, and color
 */
export const getJiraStatus = (state) => {
  if (state.isLoadingConnections || state.isLoadingEpic) {
    return {
      status: JIRA_STATUS.LOADING,
      message: 'Loading JIRA data...',
      color: STATUS_COLORS[JIRA_STATUS.LOADING]
    };
  }

  if (state.error) {
    return {
      status: JIRA_STATUS.ERROR,
      message: `Error: ${state.error}`,
      color: STATUS_COLORS[JIRA_STATUS.ERROR]
    };
  }

  if (!state.hasConnection) {
    return {
      status: JIRA_STATUS.NO_CONNECTION,
      message: 'No JIRA connection',
      color: STATUS_COLORS[JIRA_STATUS.NO_CONNECTION]
    };
  }

  if (!state.hasEpic) {
    return {
      status: JIRA_STATUS.NO_EPIC,
      message: 'No Epic selected',
      color: STATUS_COLORS[JIRA_STATUS.NO_EPIC]
    };
  }

  return {
    status: JIRA_STATUS.READY,
    message: 'Ready for export',
    color: STATUS_COLORS[JIRA_STATUS.READY]
  };
};

/**
 * Safe async operation dengan error handling
 * @param {Function} operation - Async operation to execute
 * @param {string} operationName - Name for logging
 * @returns {Promise<Object>} - Result with success flag
 */
export const safeAsyncOperation = async (operation, operationName) => {
  try {
    const result = await operation();
    return result;
  } catch (error) {
    console.warn(`${operationName} failed:`, error.message);
    return { success: false, data: null, error: error.message };
  }
};

/**
 * Dispatch JIRA event
 * @param {string} eventName - Event name
 * @param {*} detail - Event detail
 */
export const dispatchJiraEvent = (eventName, detail = null) => {
  try {
    const event = detail 
      ? new CustomEvent(eventName, { detail })
      : new CustomEvent(eventName);
    window.dispatchEvent(event);
  } catch (error) {
    console.warn(`Failed to dispatch ${eventName}:`, error);
  }
};

/**
 * Process parallel results dari Promise.allSettled
 * @param {Array} results - Results from Promise.allSettled
 * @returns {Array} - Processed data array
 */
export const processParallelResults = (results) => {
  return results.map(result => {
    if (result.status === 'fulfilled' && result.value.success) {
      return result.value.data;
    }
    return null;
  });
};