import api from '../api.js';
import { 
  JIRA_TIMEOUTS, 
  JIRA_ENDPOINTS,
  JIRA_ERRORS 
} from '../../utils/constants/jiraServiceConstants';
import {
  retryJiraOperation,
  getProgressiveTimeout
} from '../../utils/helpers/jiraServiceHelpers';

/**
 * JIRA Story Service - handles story creation and export
 */
class JiraStoryService {
  /**
   * Create complete story dengan scenarios
   * @param {string} connectionId - JIRA connection ID
   * @param {string} epicId - Epic ID
   * @param {Object} storyData - Story data
   * @param {Array} scenarios - Scenarios array
   * @returns {Promise<Object>} Created story result
   */
  static async createCompleteStory(connectionId, epicId, storyData, scenarios) {
    const operation = async (attempt) => {
      const timeout = getProgressiveTimeout(attempt, JIRA_TIMEOUTS.EXPORT_STORY);
      
      // Use the correct endpoint with parameters
      const endpoint = JIRA_ENDPOINTS.CREATE_STORY(connectionId, epicId);
      
      const response = await api.post(endpoint, {
        storyData,
        scenarios
      }, { timeout });
      
      if (response.data.success) {
        return { success: true, data: response.data.data };
      } else {
        throw new Error(response.data.error || JIRA_ERRORS.STORY_CREATE_FAILED);
      }
    };
    
    return await retryJiraOperation(operation, 'Export story');
  }

  /**
   * Create story tanpa Epic (work without Epic)
   * @param {string} connectionId - JIRA connection ID
   * @param {Object} storyData - Story data
   * @param {Array} scenarios - Scenarios array
   * @returns {Promise<Object>} Created story result
   */
  static async createStoryWithoutEpic(connectionId, storyData, scenarios) {
    return await this.createCompleteStory(connectionId, null, storyData, scenarios);
  }

  /**
   * Validate story data sebelum export
   * @param {Object} storyData - Story data to validate
   * @param {Array} scenarios - Scenarios to validate
   * @returns {Object} Validation result
   */
  static validateStoryData(storyData, scenarios) {
    const errors = [];
    
    // Validate story data
    if (!storyData) {
      errors.push('Story data is required');
    } else {
      if (!storyData.title || storyData.title.trim() === '') {
        errors.push('Story title is required');
      }
      
      if (!storyData.description || storyData.description.trim() === '') {
        errors.push('Story description is required');
      }
    }
    
    // Validate scenarios
    if (!scenarios || !Array.isArray(scenarios) || scenarios.length === 0) {
      errors.push('At least one scenario is required');
    } else {
      scenarios.forEach((scenario, index) => {
        if (!scenario.title || scenario.title.trim() === '') {
          errors.push(`Scenario ${index + 1} title is required`);
        }
        
        if (!scenario.steps || !Array.isArray(scenario.steps) || scenario.steps.length === 0) {
          errors.push(`Scenario ${index + 1} must have at least one step`);
        }
      });
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Format story data untuk JIRA export
   * @param {Object} rawStoryData - Raw story data
   * @returns {Object} Formatted story data
   */
  static formatStoryData(rawStoryData) {
    return {
      title: rawStoryData.title?.trim() || '',
      description: rawStoryData.description?.trim() || '',
      priority: rawStoryData.priority || 'Medium',
      storyPoints: rawStoryData.storyPoints || null,
      labels: rawStoryData.labels || [],
      components: rawStoryData.components || [],
      assignee: rawStoryData.assignee || null
    };
  }

  /**
   * Format scenarios untuk JIRA export
   * @param {Array} rawScenarios - Raw scenarios data
   * @returns {Array} Formatted scenarios
   */
  static formatScenarios(rawScenarios) {
    if (!Array.isArray(rawScenarios)) return [];
    
    return rawScenarios.map(scenario => ({
      title: scenario.title?.trim() || '',
      description: scenario.description?.trim() || '',
      steps: Array.isArray(scenario.steps) ? scenario.steps.map(step => ({
        type: step.type || 'Given',
        text: step.text?.trim() || ''
      })) : [],
      tags: scenario.tags || []
    }));
  }
}

export default JiraStoryService;