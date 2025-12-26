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
 * JIRA Epic Service - handles epic management
 */
class JiraEpicService {
  /**
   * Get available Epics from JIRA project
   * @param {string} connectionId - JIRA connection ID
   * @param {string} projectKey - JIRA project key
   * @returns {Promise<Object>} Available Epics
   */
  static async getProjectEpics(connectionId, projectKey) {
    try {
      const response = await withJiraTimeout(
        api.get(JIRA_ENDPOINTS.EPICS(connectionId, projectKey), {
          headers: {
            ...JIRA_HEADERS.CACHE_MEDIUM,
            ...JIRA_HEADERS.FAST_REQUEST
          }
        }),
        JIRA_TIMEOUTS.EPICS,
        'Get project epics'
      );
      
      return handleJiraSuccess(response, []);
    } catch (error) {
      // For epic fetch, return success with empty data to allow fallback
      if (error.message.includes('timeout')) {
        console.warn('Epic fetch timeout - JIRA server may be slow');
        return { 
          success: true, 
          data: [], 
          error: JIRA_ERRORS.EPIC_FETCH_TIMEOUT,
          fallback: true 
        };
      }
      
      return { 
        success: true, 
        data: [], 
        error: error.message,
        fallback: true 
      };
    }
  }

  /**
   * Validate Epic access
   * @param {string} connectionId - JIRA connection ID
   * @param {string} epicId - Epic ID to validate
   * @returns {Promise<Object>} Validation result
   */
  static async validateEpicAccess(connectionId, epicId) {
    try {
      const response = await withJiraTimeout(
        api.get(JIRA_ENDPOINTS.EPIC_VALIDATE(connectionId, epicId)),
        JIRA_TIMEOUTS.VALIDATION,
        'Validate epic access'
      );
      
      return handleJiraSuccess(response);
    } catch (error) {
      return handleJiraError(error, 'Validate epic access');
    }
  }

  /**
   * Search Epics dalam project
   * @param {string} connectionId - JIRA connection ID
   * @param {string} projectKey - JIRA project key
   * @param {string} searchQuery - Search query
   * @returns {Promise<Object>} Search results
   */
  static async searchEpics(connectionId, projectKey, searchQuery) {
    try {
      const result = await this.getProjectEpics(connectionId, projectKey);
      
      if (result.success && result.data) {
        const filteredEpics = result.data.filter(epic => 
          epic.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          epic.key?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          epic.summary?.toLowerCase().includes(searchQuery.toLowerCase())
        );
        
        return { 
          success: true, 
          data: filteredEpics 
        };
      }
      
      return result;
    } catch (error) {
      return handleJiraError(error, 'Search epics');
    }
  }
}

export default JiraEpicService;