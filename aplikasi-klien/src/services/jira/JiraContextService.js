import { jiraService } from '../jiraService';
import { 
  safeAsyncOperation, 
  processParallelResults,
  wasRecentlyForceCleared,
  setForceClearTimestamp,
  clearEpicStorage,
  getCurrentChatId
} from '../../utils/helpers/jiraHelpers';
import { JIRA_EVENTS } from '../../utils/constants/jiraConstants';

/**
 * JIRA Context Service - handles JIRA context operations
 */
class JiraContextService {
  /**
   * Load initial JIRA data (connections and epic context)
   * @returns {Promise<Object>} - Initial data
   */
  static async loadInitialData() {
    const [connectionsResult, epicResult] = await Promise.allSettled([
      safeAsyncOperation(
        () => jiraService.getConnections(),
        'Connection fetch'
      ),
      safeAsyncOperation(
        () => jiraService.getEpicContext(),
        'Epic fetch'
      )
    ]);

    const [connections, epicContext] = processParallelResults([
      connectionsResult,
      epicResult
    ]);

    return {
      connections: connections || [],
      epicContext: epicContext || null,
      hasConnection: Array.isArray(connections) && connections.length > 0,
      hasEpic: Boolean(epicContext)
    };
  }

  /**
   * Refresh connections
   * @param {boolean} force - Force refresh ignoring cache
   * @returns {Promise<Object>} - Refresh result
   */
  static async refreshConnections(force = false) {
    return await safeAsyncOperation(
      () => jiraService.getConnections(),
      'Connections refresh'
    );
  }

  /**
   * Refresh epic context
   * @returns {Promise<Object>} - Refresh result
   */
  static async refreshEpicContext() {
    // Check if Epic context was recently force cleared
    if (wasRecentlyForceCleared()) {
      return { success: true, data: null };
    }

    return await safeAsyncOperation(
      () => jiraService.getEpicContext(),
      'Epic context refresh'
    );
  }

  /**
   * Set epic context
   * @param {Object} epicData - Epic data to set
   * @returns {Promise<Object>} - Set result
   */
  static async setEpicContext(epicData) {
    const epicId = epicData.workWithoutEpic ? null : epicData.epic?.id;
    
    return await safeAsyncOperation(
      () => jiraService.setEpicContext(epicId, epicData),
      'Set epic context'
    );
  }

  /**
   * Clear epic context
   * @returns {Promise<Object>} - Clear result
   */
  static async clearEpicContext() {
    console.log('🧹 [JIRA-SERVICE] Clearing Epic context...');
    
    return await safeAsyncOperation(
      () => jiraService.clearEpicContext(),
      'Clear epic context'
    );
  }

  /**
   * Force clear epic context immediately
   */
  static forceEpicContextClear() {
    console.log('🧹 [JIRA-SERVICE] FORCE EPIC CLEAR - OPTIMIZED');
    
    try {
      // Set force clear timestamp
      setForceClearTimestamp();
      
      // Clear storage
      const chatId = getCurrentChatId();
      clearEpicStorage(chatId);
      
      console.log('✅ [JIRA-SERVICE] Force Epic clear completed successfully');
      
      return { success: true };
    } catch (error) {
      console.error('❌ [JIRA-SERVICE] Force Epic clear failed:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Refresh all data (connections + epic)
   * @returns {Promise<Array>} - Refresh results
   */
  static async refreshAll() {
    const [connectionsResult, epicResult] = await Promise.all([
      this.refreshConnections(),
      this.refreshEpicContext()
    ]);

    return [connectionsResult, epicResult];
  }

  /**
   * Setup event listeners
   * @param {Function} onEpicClear - Epic clear handler
   * @param {Function} onEpicRefresh - Epic refresh handler
   * @returns {Function} - Cleanup function
   */
  static setupEventListeners(onEpicClear, onEpicRefresh) {
    const handleForceEpicClear = () => {
      console.log('🔄 [JIRA-SERVICE] Force Epic clear event received');
      onEpicClear();
    };
    
    const handleForceEpicRefresh = () => {
      console.log('🔄 [JIRA-SERVICE] Force Epic refresh event received');
      onEpicRefresh();
    };
    
    window.addEventListener(JIRA_EVENTS.FORCE_EPIC_CLEAR, handleForceEpicClear);
    window.addEventListener(JIRA_EVENTS.FORCE_EPIC_REFRESH, handleForceEpicRefresh);
    
    // Return cleanup function
    return () => {
      window.removeEventListener(JIRA_EVENTS.FORCE_EPIC_CLEAR, handleForceEpicClear);
      window.removeEventListener(JIRA_EVENTS.FORCE_EPIC_REFRESH, handleForceEpicRefresh);
    };
  }
}

export default JiraContextService;