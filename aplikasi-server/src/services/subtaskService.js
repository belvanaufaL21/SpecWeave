import jiraService from './jiraService.js';

/**
 * Subtask Service for generating and managing JIRA subtasks from Gherkin scenarios
 * Handles subtask creation, linking, and management
 */
class SubtaskService {
  
  // =====================================================
  // Subtask Generation from Scenarios
  // =====================================================

  /**
   * Generate subtasks from Gherkin scenarios
   * @param {string} connectionId - JIRA connection ID
   * @param {string} userStoryId - Parent user story ID
   * @param {Array} scenarios - Gherkin scenarios
   * @param {string} userId - User ID
   * @returns {Promise<Array>} Created subtasks
   */
  async generateSubtasksFromScenarios(connectionId, userStoryId, scenarios, userId) {
    try {
      if (!scenarios || !Array.isArray(scenarios) || scenarios.length === 0) {
        return [];
      }

      console.log(`📋 Generating ${scenarios.length} subtasks for user story ${userStoryId}`);

      const subtasks = [];
      const errors = [];

      for (let i = 0; i < scenarios.length; i++) {
        const scenario = scenarios[i];
        
        try {
          const subtask = await this.createSubtaskFromScenario(
            connectionId,
            userStoryId,
            scenario,
            i + 1,
            userId
          );
          
          subtasks.push(subtask);
          console.log(`✅ Created subtask ${i + 1}/${scenarios.length}: ${subtask.key}`);
          
        } catch (error) {
          console.error(`❌ Failed to create subtask ${i + 1}/${scenarios.length}:`, error.message);
          errors.push({
            scenario_index: i,
            scenario_title: scenario.title,
            error: error.message
          });
        }
      }

      console.log(`📊 Subtask generation complete: ${subtasks.length} created, ${errors.length} failed`);

      return {
        subtasks,
        errors,
        summary: {
          total_scenarios: scenarios.length,
          successful: subtasks.length,
          failed: errors.length
        }
      };

    } catch (error) {
      console.error('Error generating subtasks from scenarios:', error);
      throw new Error(`Failed to generate subtasks: ${error.message}`);
    }
  }

  /**
   * Create a single subtask from a Gherkin scenario
   * @param {string} connectionId - JIRA connection ID
   * @param {string} userStoryId - Parent user story ID
   * @param {Object} scenario - Gherkin scenario
   * @param {number} scenarioIndex - Scenario index for ordering
   * @param {string} userId - User ID
   * @returns {Promise<Object>} Created subtask
   */
  async createSubtaskFromScenario(connectionId, userStoryId, scenario, scenarioIndex, userId) {
    try {
      // Generate subtask title and description
      const subtaskData = this.prepareSubtaskData(scenario, scenarioIndex);
      
      // Create subtask via JIRA service
      const subtask = await jiraService.createSubtasks(
        connectionId,
        userStoryId,
        [scenario], // Pass single scenario as array
        userId
      );

      // Return the first (and only) subtask
      return subtask[0];

    } catch (error) {
      console.error(`Error creating subtask from scenario "${scenario.title}":`, error);
      throw new Error(`Failed to create subtask: ${error.message}`);
    }
  }

  /**
   * Prepare subtask data from Gherkin scenario
   * @param {Object} scenario - Gherkin scenario
   * @param {number} scenarioIndex - Scenario index
   * @returns {Object} Prepared subtask data
   */
  prepareSubtaskData(scenario, scenarioIndex) {
    const title = `Scenario ${scenarioIndex}: ${scenario.title}`;
    
    let description = `*Implementation Task for Scenario ${scenarioIndex}*\n\n`;
    description += `*Scenario:* ${scenario.title}\n\n`;
    description += '*Acceptance Criteria:*\n\n';
    description += '{code:gherkin}\n';
    description += `Scenario: ${scenario.title}\n`;
    
    // Add Given steps
    if (scenario.given && scenario.given.length > 0) {
      scenario.given.forEach(step => {
        description += `  Given ${step}\n`;
      });
    }
    
    // Add When steps
    if (scenario.when && scenario.when.length > 0) {
      scenario.when.forEach(step => {
        description += `  When ${step}\n`;
      });
    }
    
    // Add Then steps
    if (scenario.then && scenario.then.length > 0) {
      scenario.then.forEach(step => {
        description += `  Then ${step}\n`;
      });
    }
    
    description += '{code}\n\n';
    
    // Add implementation guidance
    description += '*Implementation Checklist:*\n';
    description += '- [ ] Implement the functionality described in the scenario\n';
    description += '- [ ] Write unit tests for the implementation\n';
    description += '- [ ] Ensure all acceptance criteria are met\n';
    description += '- [ ] Test the scenario manually\n';
    description += '- [ ] Update documentation if needed\n\n';
    
    // Add technical notes based on scenario content
    const technicalNotes = this.generateTechnicalNotes(scenario);
    if (technicalNotes.length > 0) {
      description += '*Technical Notes:*\n';
      technicalNotes.forEach(note => {
        description += `- ${note}\n`;
      });
      description += '\n';
    }

    return {
      title,
      description,
      scenario_index: scenarioIndex,
      scenario_title: scenario.title
    };
  }

  /**
   * Generate technical implementation notes based on scenario content
   * @param {Object} scenario - Gherkin scenario
   * @returns {Array} Technical notes
   */
  generateTechnicalNotes(scenario) {
    const notes = [];
    const allSteps = [
      ...(scenario.given || []),
      ...(scenario.when || []),
      ...(scenario.then || [])
    ].join(' ').toLowerCase();

    // API-related scenarios
    if (allSteps.includes('api') || allSteps.includes('endpoint') || allSteps.includes('request')) {
      notes.push('Consider API endpoint design and error handling');
      notes.push('Implement proper request/response validation');
    }

    // UI-related scenarios
    if (allSteps.includes('click') || allSteps.includes('button') || allSteps.includes('page') || allSteps.includes('form')) {
      notes.push('Focus on user interface components and interactions');
      notes.push('Ensure accessibility and responsive design');
    }

    // Database-related scenarios
    if (allSteps.includes('save') || allSteps.includes('store') || allSteps.includes('database') || allSteps.includes('record')) {
      notes.push('Consider database schema and data validation');
      notes.push('Implement proper error handling for data operations');
    }

    // Authentication-related scenarios
    if (allSteps.includes('login') || allSteps.includes('auth') || allSteps.includes('user') || allSteps.includes('password')) {
      notes.push('Implement secure authentication mechanisms');
      notes.push('Consider session management and security');
    }

    // Validation scenarios
    if (allSteps.includes('invalid') || allSteps.includes('error') || allSteps.includes('validation')) {
      notes.push('Implement comprehensive input validation');
      notes.push('Provide clear error messages to users');
    }

    // Performance scenarios
    if (allSteps.includes('fast') || allSteps.includes('quick') || allSteps.includes('performance')) {
      notes.push('Consider performance optimization');
      notes.push('Implement appropriate caching strategies');
    }

    return notes;
  }

  // =====================================================
  // Subtask Management
  // =====================================================

  /**
   * Update subtask status and progress
   * @param {string} connectionId - JIRA connection ID
   * @param {string} subtaskId - Subtask ID
   * @param {Object} updates - Status updates
   * @param {string} userId - User ID
   * @returns {Promise<Object>} Update result
   */
  async updateSubtaskStatus(connectionId, subtaskId, updates, userId) {
    try {
      // This would integrate with JIRA API to update subtask status
      // For now, return mock response
      return {
        success: true,
        subtask_id: subtaskId,
        updates: updates,
        message: 'Subtask status updated successfully'
      };
    } catch (error) {
      console.error('Error updating subtask status:', error);
      throw new Error(`Failed to update subtask status: ${error.message}`);
    }
  }

  /**
   * Get subtask hierarchy for a user story
   * @param {string} connectionId - JIRA connection ID
   * @param {string} userStoryId - User story ID
   * @param {string} userId - User ID
   * @returns {Promise<Object>} Subtask hierarchy
   */
  async getSubtaskHierarchy(connectionId, userStoryId, userId) {
    try {
      // This would integrate with JIRA API to get subtask hierarchy
      // For now, return mock response
      return {
        user_story_id: userStoryId,
        subtasks: [],
        total_subtasks: 0,
        completed_subtasks: 0,
        progress_percentage: 0
      };
    } catch (error) {
      console.error('Error getting subtask hierarchy:', error);
      throw new Error(`Failed to get subtask hierarchy: ${error.message}`);
    }
  }

  /**
   * Bulk update multiple subtasks
   * @param {string} connectionId - JIRA connection ID
   * @param {Array} subtaskUpdates - Array of subtask updates
   * @param {string} userId - User ID
   * @returns {Promise<Object>} Bulk update result
   */
  async bulkUpdateSubtasks(connectionId, subtaskUpdates, userId) {
    try {
      const results = [];
      const errors = [];

      for (const update of subtaskUpdates) {
        try {
          const result = await this.updateSubtaskStatus(
            connectionId,
            update.subtask_id,
            update.updates,
            userId
          );
          results.push(result);
        } catch (error) {
          errors.push({
            subtask_id: update.subtask_id,
            error: error.message
          });
        }
      }

      return {
        success: true,
        results,
        errors,
        summary: {
          total_updates: subtaskUpdates.length,
          successful: results.length,
          failed: errors.length
        }
      };

    } catch (error) {
      console.error('Error bulk updating subtasks:', error);
      throw new Error(`Failed to bulk update subtasks: ${error.message}`);
    }
  }

  // =====================================================
  // Subtask Analytics and Reporting
  // =====================================================

  /**
   * Generate subtask completion report
   * @param {string} connectionId - JIRA connection ID
   * @param {string} epicId - Epic ID
   * @param {string} userId - User ID
   * @returns {Promise<Object>} Completion report
   */
  async generateCompletionReport(connectionId, epicId, userId) {
    try {
      // This would analyze subtask completion across an Epic
      return {
        epic_id: epicId,
        total_user_stories: 0,
        total_subtasks: 0,
        completed_subtasks: 0,
        in_progress_subtasks: 0,
        todo_subtasks: 0,
        completion_percentage: 0,
        estimated_completion_date: null,
        bottlenecks: [],
        recommendations: []
      };
    } catch (error) {
      console.error('Error generating completion report:', error);
      throw new Error(`Failed to generate completion report: ${error.message}`);
    }
  }

  /**
   * Get subtask creation statistics
   * @param {string} userId - User ID
   * @param {Object} timeRange - Time range for statistics
   * @returns {Promise<Object>} Creation statistics
   */
  async getSubtaskCreationStats(userId, timeRange = { days: 30 }) {
    try {
      // This would analyze subtask creation patterns
      return {
        time_range: timeRange,
        total_subtasks_created: 0,
        average_subtasks_per_story: 0,
        most_common_scenario_types: [],
        creation_trends: [],
        quality_metrics: {
          average_scenario_complexity: 0,
          most_detailed_scenarios: [],
          improvement_suggestions: []
        }
      };
    } catch (error) {
      console.error('Error getting subtask creation stats:', error);
      throw new Error(`Failed to get subtask creation stats: ${error.message}`);
    }
  }
}

export default new SubtaskService();