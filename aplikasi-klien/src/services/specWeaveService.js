/**
 * SpecWeave Service - Main service for Gherkin generation
 * 
 * This service handles Gherkin scenario generation and JIRA integration
 */

import api from './api.js';

/**
 * SpecWeave Service Class
 */
class SpecWeaveService {
  /**
   * Generate Gherkin scenarios from user story
   * @param {string} userStory - The user story text
   * @param {Object} options - Generation options
   * @returns {Promise<Object>} Generation result
   */
  async generateGherkin(userStory, options = {}) {
    try {
      const response = await api.post('/gherkin/generate', {
        userStory,
        options
      });
      
      if (response.data.success) {
        return { success: true, data: response.data.data };
      } else {
        throw new Error(response.data.error || 'Failed to generate Gherkin');
      }
    } catch (error) {
      console.error('Error generating Gherkin:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Authenticate with JIRA
   * @param {string} domain - JIRA domain
   * @param {string} email - User email
   * @param {string} token - API token
   * @returns {Promise<Object>} Authentication result
   */
  async authenticateJira(domain, email, token) {
    try {
      const response = await api.post('/jira/authenticate', {
        domain,
        email,
        token
      });
      
      if (response.data.success) {
        return { success: true, data: response.data.data };
      } else {
        throw new Error(response.data.error || 'Failed to authenticate with JIRA');
      }
    } catch (error) {
      console.error('Error authenticating with JIRA:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Connect to JIRA project
   * @param {string} projectKey - JIRA project key
   * @returns {Promise<Object>} Connection result
   */
  async connectJiraProject(projectKey) {
    try {
      const response = await api.post('/jira/connect-project', {
        projectKey
      });
      
      if (response.data.success) {
        return { success: true, data: response.data.data };
      } else {
        throw new Error(response.data.error || 'Failed to connect to JIRA project');
      }
    } catch (error) {
      console.error('Error connecting to JIRA project:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Save issue to JIRA
   * @param {Object} data - Issue data
   * @returns {Promise<Object>} Save result
   */
  async saveJiraIssue(data) {
    try {
      const response = await api.post('/jira/save-issue', data);
      
      if (response.data.success) {
        return { success: true, data: response.data.data };
      } else {
        throw new Error(response.data.error || 'Failed to save JIRA issue');
      }
    } catch (error) {
      console.error('Error saving JIRA issue:', error);
      return { success: false, error: error.message };
    }
  }
}

// Create service instance
const specWeaveService = new SpecWeaveService();

/**
 * Generate Gherkin scenarios from user story
 * @param {string} userStory - The user story text
 * @param {Object} options - Generation options
 * @returns {Promise<Object>} Generation result
 */
export const generateGherkin = async (userStory, options = {}) => {
  return await specWeaveService.generateGherkin(userStory, options);
};

/**
 * Mock JIRA Service for backward compatibility
 * @deprecated Use JiraService instead
 */
export const jiraService = {
  authenticate: async (domain, email, token) => {
    return await specWeaveService.authenticateJira(domain, email, token);
  },

  connectProject: async (projectKey) => {
    return await specWeaveService.connectJiraProject(projectKey);
  },

  saveIssue: async (data) => {
    return await specWeaveService.saveJiraIssue(data);
  }
};

// Export service instance for direct use
export default specWeaveService;