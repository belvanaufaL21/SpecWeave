import api from '../api.js';
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
   * @returns {Promise<Object>} JIRA connections
   */
  static async getConnections() {
    try {
      const response = await withJiraTimeout(
        api.get(JIRA_ENDPOINTS.CONNECTIONS, { 
          headers: {
            ...JIRA_HEADERS.CACHE_SHORT,
            ...JIRA_HEADERS.FAST_REQUEST
          }
        }),
        JIRA_TIMEOUTS.CONNECTIONS,
        'Get connections'
      );
      
      return handleJiraSuccess(response, []);
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
      const response = await withJiraTimeout(
        api.post(JIRA_ENDPOINTS.TEST_CONNECTION, connectionData),
        JIRA_TIMEOUTS.TEST_CONNECTION,
        'Test connection'
      );
      
      return handleJiraSuccess(response);
    } catch (error) {
      return handleJiraError(error, 'Test connection');
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
   * Start OAuth flow
   * @param {Object} connectionData - Connection data
   * @returns {Promise<Object>} OAuth authorization URL
   */
  static async startOAuthFlow(connectionData = {}) {
    try {
      const response = await withJiraTimeout(
        api.post(JIRA_ENDPOINTS.OAUTH_START, connectionData),
        JIRA_TIMEOUTS.OAUTH_START,
        'Start OAuth flow'
      );
      
      if (response.data.success && response.data.data?.authorizationUrl) {
        return { 
          success: true, 
          data: response.data.data 
        };
      } else {
        throw new Error(response.data.error || JIRA_ERRORS.OAUTH_START_FAILED);
      }
    } catch (error) {
      return handleJiraError(error, 'Start OAuth flow');
    }
  }

  /**
   * Complete OAuth flow
   * @param {string} oauthToken - OAuth token
   * @param {string} oauthVerifier - OAuth verifier
   * @returns {Promise<Object>} Created connection
   */
  static async completeOAuthFlow(oauthToken, oauthVerifier) {
    try {
      const response = await withJiraTimeout(
        api.post(JIRA_ENDPOINTS.OAUTH_CALLBACK, {
          oauth_token: oauthToken,
          oauth_verifier: oauthVerifier
        }),
        JIRA_TIMEOUTS.OAUTH_COMPLETE,
        'Complete OAuth flow'
      );
      
      return handleJiraSuccess(response);
    } catch (error) {
      return handleJiraError(error, 'Complete OAuth flow');
    }
  }
}

export default JiraConnectionService;