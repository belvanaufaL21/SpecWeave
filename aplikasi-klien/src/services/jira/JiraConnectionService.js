import api from '../api.js';
import cleanLogger from '../../config/cleanLogging.js';
import { 
  JIRA_TIMEOUTS, 
  JIRA_ENDPOINTS, 
  JIRA_HEADERS,
  JIRA_ERRORS 
} from '../../utils/constants/jiraServiceConstants';
import {
  withJiraTimeout,
  handleJiraError,
  handleJiraSuccess
} from '../../utils/helpers/jiraServiceHelpers';

/**
 * JIRA Connection Service - handles connection management
 */
class JiraConnectionService {
  /**
   * Get JIRA connections for the current user
   * @param {boolean} forceRefresh - Force refresh from database
   * @returns {Promise<Object>} JIRA connections
   */
  static async getConnections(forceRefresh = false) {
    try {
      // Clear connection cache if force refresh
      if (forceRefresh && window.jiraCache) {
        delete window.jiraCache.connections;
        console.log('🔄 [JIRA-CONNECTION] Cache cleared, forcing fresh fetch');
      }
      
      const response = await withJiraTimeout(
        api.get(JIRA_ENDPOINTS.CONNECTIONS, { 
          headers: {
            ...JIRA_HEADERS.FAST_REQUEST,
            'Cache-Control': 'no-cache',
            'X-Force-Refresh': 'true',
            'X-Timestamp': Date.now().toString() // Prevent browser cache
          }
        }),
        JIRA_TIMEOUTS.CONNECTIONS,
        'Get connections'
      );
      
      const result = handleJiraSuccess(response, []);
      
      // Cache the fresh connections
      if (result.success && window.jiraCache) {
        window.jiraCache.connections = {
          data: result.data,
          timestamp: Date.now()
        };
      }
      
      // Only log in development
      if (import.meta.env.DEV) {
        cleanLogger.debug('JIRA-CONNECTION', `Fetched ${result.data?.length || 0} connections`);
      }
      return result;
    } catch (error) {
      return handleJiraError(error, 'Get connections');
    }
  }

  /**
   * Test JIRA connection
   * @param {Object} connectionData - Connection data to test
   * @returns {Promise<Object>} Test result
   */
  static async testConnection(connectionData) {
    try {
      // Log: Testing connection
      cleanLogger.jiraTestConnection();
      
      const response = await withJiraTimeout(
        api.post(JIRA_ENDPOINTS.TEST_CONNECTION, connectionData),
        JIRA_TIMEOUTS.TEST_CONNECTION,
        'Test connection'
      );
      
      const result = handleJiraSuccess(response);
      
      // Log: Connection success or failure
      if (result.success) {
        cleanLogger.jiraConnectionSuccess();
      } else {
        cleanLogger.jiraConnectionFailed(result.error);
      }
      
      return result;
    } catch (error) {
      const result = handleJiraError(error, 'Test connection');
      cleanLogger.jiraConnectionFailed(result.error);
      return result;
    }
  }

  /**
   * Create new JIRA connection
   * @param {Object} connectionData - Connection data
   * @returns {Promise<Object>} Created connection
   */
  static async createConnection(connectionData) {
    try {
      const response = await withJiraTimeout(
        api.post(JIRA_ENDPOINTS.CONNECTIONS, connectionData),
        JIRA_TIMEOUTS.CREATE_CONNECTION,
        'Create connection'
      );
      
      return handleJiraSuccess(response);
    } catch (error) {
      return handleJiraError(error, 'Create connection');
    }
  }

  /**
   * Delete JIRA connection
   * @param {string} connectionId - Connection ID to delete
   * @returns {Promise<Object>} Delete result
   */
  static async deleteConnection(connectionId) {
    try {
      const response = await withJiraTimeout(
        api.delete(`${JIRA_ENDPOINTS.CONNECTIONS}/${connectionId}`),
        JIRA_TIMEOUTS.DELETE_CONNECTION,
        'Delete connection'
      );
      
      return handleJiraSuccess(response);
    } catch (error) {
      return handleJiraError(error, 'Delete connection');
    }
  }
}

export default JiraConnectionService;