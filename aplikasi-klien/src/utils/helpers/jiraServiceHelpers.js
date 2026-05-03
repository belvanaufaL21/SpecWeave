import { 
  JIRA_TIMEOUTS, 
  JIRA_RETRY, 
  JIRA_ERRORS,
  JIRA_STORAGE 
} from '../constants/jiraServiceConstants';

/**
 * Create timeout promise untuk JIRA operations
 * @param {number} timeout - Timeout in milliseconds
 * @param {string} operation - Operation name for error message
 * @returns {Promise} - Promise that rejects after timeout
 */
export const createJiraTimeout = (timeout, operation) => {
  return new Promise((_, reject) => 
    setTimeout(() => reject(new Error(`${operation} timeout`)), timeout)
  );
};

/**
 * Execute JIRA operation dengan timeout
 * @param {Promise} operation - Operation to execute
 * @param {number} timeout - Timeout in milliseconds
 * @param {string} operationName - Operation name
 * @returns {Promise} - Operation result
 */
export const withJiraTimeout = async (operation, timeout, operationName) => {
  const timeoutPromise = createJiraTimeout(timeout, operationName);
  return Promise.race([operation, timeoutPromise]);
};

/**
 * Handle JIRA API errors dengan consistent error format
 * @param {Error} error - Error object
 * @param {string} operation - Operation name
 * @returns {Object} - Formatted error response
 */
export const handleJiraError = (error, operation) => {
  if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
    console.warn(`${operation} timeout - server may be slow`);
    return { 
      success: false, 
      error: JIRA_ERRORS.CONNECTION_TIMEOUT, 
      data: [],
      isTimeout: true 
    };
  }
  
  // Check if error has response data from backend (axios error)
  if (error.response && error.response.data) {
    const responseData = error.response.data;
    
    // If backend sent specific error message, use it
    if (responseData.error) {
      console.error(`Error in ${operation}:`, responseData.error);
      return { 
        success: false, 
        error: responseData.error,
        errorType: responseData.errorType, // Include error type if available
        data: [] 
      };
    }
  }
  
  console.error(`Error in ${operation}:`, error);
  return { 
    success: false, 
    error: error.message, 
    data: [] 
  };
};

/**
 * Handle JIRA API success response
 * @param {Object} response - API response
 * @param {*} fallbackData - Fallback data if response is empty
 * @returns {Object} - Formatted success response
 */
export const handleJiraSuccess = (response, fallbackData = []) => {
  if (response.data.success) {
    const result = { 
      success: true, 
      data: response.data.data || fallbackData 
    };
    
    // Include warning if this was a fallback response
    if (response.data.fallback && response.data.warning) {
      result.warning = response.data.warning;
      result.fallback = true;
    }
    
    return result;
  } else {
    throw new Error(response.data.error || 'Operation failed');
  }
};

/**
 * Retry JIRA operation dengan exponential backoff
 * @param {Function} operation - Operation to retry
 * @param {string} operationName - Operation name for logging
 * @param {number} maxRetries - Maximum retry attempts
 * @returns {Promise} - Operation result
 */
export const retryJiraOperation = async (operation, operationName, maxRetries = JIRA_RETRY.MAX_ATTEMPTS) => {
  let lastError = null;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`🔄 ${operationName} attempt ${attempt}/${maxRetries}`);
      const result = await operation(attempt);
      
      if (result.success) {
        console.log(`✅ ${operationName} succeeded on attempt ${attempt}`);
        return result;
      } else {
        lastError = new Error(result.error || 'Operation failed');
      }
    } catch (error) {
      console.error(`❌ ${operationName} attempt ${attempt} failed:`, error.message);
      lastError = error;
      
      // If this is a timeout and we're on the last attempt, return timeout error
      if (attempt === maxRetries && (error.message.includes('timeout') || error.code === 'ECONNABORTED')) {
        return { 
          success: false, 
          error: JIRA_ERRORS.EXPORT_TIMEOUT,
          isTimeout: true
        };
      }
      
      // Wait before retry (exponential backoff)
      if (attempt < maxRetries) {
        const delay = JIRA_RETRY.DELAY_BASE * Math.pow(JIRA_RETRY.TIMEOUT_MULTIPLIER, attempt - 1);
        console.log(`⏳ Waiting ${delay}ms before retry...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  // All attempts failed
  console.error(`❌ ${operationName} failed after ${maxRetries} attempts`);
  return { 
    success: false, 
    error: lastError?.message || 'Operation failed after multiple attempts' 
  };
};

/**
 * Get current chat ID dari URL atau fallback
 * @returns {string} - Chat ID
 */
export const getCurrentChatId = () => {
  try {
    // Try to get from URL first
    const urlPath = window.location.pathname;
    const pathParts = urlPath.split('/');
    
    if (pathParts.includes('chat') && pathParts.length > 2) {
      return pathParts[pathParts.length - 1];
    }
    
    // Fallback to default
    return 'default-chat';
  } catch (error) {
    console.warn('Error getting current chat ID:', error);
    return 'default-chat';
  }
};

/**
 * Clear Epic context (global - no chatId needed)
 */
export const clearEpicContextStorage = () => {
  console.log(`🧹 Clearing Epic context (global)`);
  
  // Clear from localStorage
  localStorage.removeItem(JIRA_STORAGE.EPIC_CONTEXT);
  
  // Dispatch event to notify components
  window.dispatchEvent(new CustomEvent('forceEpicContextClear', {
    detail: { timestamp: Date.now() }
  }));
};

/**
 * Get progressive timeout untuk retry attempts
 * @param {number} attempt - Current attempt number
 * @param {number} baseTimeout - Base timeout
 * @returns {number} - Progressive timeout
 */
export const getProgressiveTimeout = (attempt, baseTimeout) => {
  return Math.floor(baseTimeout * Math.pow(JIRA_RETRY.TIMEOUT_MULTIPLIER, attempt - 1));
};

/**
 * Validate JIRA response data
 * @param {Object} response - API response
 * @returns {boolean} - True if response is valid
 */
export const isValidJiraResponse = (response) => {
  return response && 
         typeof response === 'object' && 
         response.data && 
         typeof response.data === 'object';
};

/**
 * Format JIRA error untuk user display
 * @param {string} error - Error message
 * @returns {string} - User-friendly error message
 */
export const formatJiraError = (error) => {
  if (error.includes('timeout')) {
    return 'Connection timeout. Please try again.';
  }
  
  if (error.includes('unauthorized') || error.includes('401')) {
    return 'Authentication failed. Please check your JIRA credentials.';
  }
  
  if (error.includes('forbidden') || error.includes('403')) {
    return 'Access denied. Please check your JIRA permissions.';
  }
  
  if (error.includes('not found') || error.includes('404')) {
    return 'JIRA resource not found. Please check your configuration.';
  }
  
  return error || 'An unexpected error occurred.';
};
