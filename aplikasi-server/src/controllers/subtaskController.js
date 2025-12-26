import subtaskService from '../services/subtaskService.js';
import jiraService from '../services/jiraService.js';
import epicService from '../services/epicService.js';
import supabaseService from '../services/supabaseService.js';
import { validationResult } from 'express-validator';

/**
 * Subtask Controller
 * Handles subtask generation, management, and analytics
 */
class SubtaskController {

  // =====================================================
  // Subtask Generation
  // =====================================================

  /**
   * Generate subtasks from scenario
   * POST /api/subtasks/generate
   */
  async generateSubtasks(req, res) {
    try {
      // Check validation errors
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: errors.array()
        });
      }

      const userId = req.user.id;
      const { scenarioId, userStoryId, connectionId } = req.body;

      // Get scenario from database
      const scenario = await supabaseService.getScenarioById(scenarioId, userId);
      if (!scenario) {
        return res.status(404).json({
          success: false,
          error: 'Scenario not found'
        });
      }

      // Check if scenario has Gherkin scenarios
      const scenarios = scenario.scenarios_json?.scenarios || [];
      if (scenarios.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'No Gherkin scenarios found in the scenario'
        });
      }

      // Generate subtasks
      const result = await subtaskService.generateSubtasksFromScenarios(
        connectionId,
        userStoryId,
        scenarios,
        userId
      );

      res.json({
        success: true,
        data: result,
        message: `Generated ${result.subtasks.length} subtasks from ${scenarios.length} scenarios`
      });

    } catch (error) {
      console.error('Error generating subtasks:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to generate subtasks'
      });
    }
  }

  /**
   * Create subtasks for existing user story
   * POST /api/subtasks/create
   */
  async createSubtasks(req, res) {
    try {
      // Check validation errors
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: errors.array()
        });
      }

      const userId = req.user.id;
      const { userStoryId, scenarios, connectionId } = req.body;

      // Validate Epic context if connectionId not provided
      let jiraConnectionId = connectionId;
      if (!jiraConnectionId) {
        const epicContext = await epicService.getEpicContext(userId);
        if (!epicContext.success || !epicContext.data) {
          return res.status(400).json({
            success: false,
            error: 'Epic context required or provide connectionId'
          });
        }
        jiraConnectionId = epicContext.data.epicData.connection.id;
      }

      // Create subtasks via JIRA service
      const subtasks = await jiraService.createSubtasks(
        jiraConnectionId,
        userStoryId,
        scenarios,
        userId
      );

      res.json({
        success: true,
        data: {
          subtasks,
          total_created: subtasks.length,
          user_story_id: userStoryId
        },
        message: `Created ${subtasks.length} subtasks successfully`
      });

    } catch (error) {
      console.error('Error creating subtasks:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to create subtasks'
      });
    }
  }

  // =====================================================
  // Subtask Management
  // =====================================================

  /**
   * Update subtask status
   * PUT /api/subtasks/:subtaskId/status
   */
  async updateSubtaskStatus(req, res) {
    try {
      const { subtaskId } = req.params;
      const { status, connectionId } = req.body;
      const userId = req.user.id;

      // Validate Epic context if connectionId not provided
      let jiraConnectionId = connectionId;
      if (!jiraConnectionId) {
        const epicContext = await epicService.getEpicContext(userId);
        if (!epicContext.success || !epicContext.data) {
          return res.status(400).json({
            success: false,
            error: 'Epic context required or provide connectionId'
          });
        }
        jiraConnectionId = epicContext.data.epicData.connection.id;
      }

      const result = await subtaskService.updateSubtaskStatus(
        jiraConnectionId,
        subtaskId,
        { status },
        userId
      );

      res.json({
        success: true,
        data: result,
        message: 'Subtask status updated successfully'
      });

    } catch (error) {
      console.error('Error updating subtask status:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to update subtask status'
      });
    }
  }

  /**
   * Get subtask hierarchy for user story
   * GET /api/subtasks/hierarchy/:userStoryId
   */
  async getSubtaskHierarchy(req, res) {
    try {
      const { userStoryId } = req.params;
      const { connectionId } = req.query;
      const userId = req.user.id;

      // Validate Epic context if connectionId not provided
      let jiraConnectionId = connectionId;
      if (!jiraConnectionId) {
        const epicContext = await epicService.getEpicContext(userId);
        if (!epicContext.success || !epicContext.data) {
          return res.status(400).json({
            success: false,
            error: 'Epic context required or provide connectionId'
          });
        }
        jiraConnectionId = epicContext.data.epicData.connection.id;
      }

      const hierarchy = await subtaskService.getSubtaskHierarchy(
        jiraConnectionId,
        userStoryId,
        userId
      );

      res.json({
        success: true,
        data: hierarchy
      });

    } catch (error) {
      console.error('Error getting subtask hierarchy:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to get subtask hierarchy'
      });
    }
  }

  /**
   * Bulk update multiple subtasks
   * PUT /api/subtasks/bulk-update
   */
  async bulkUpdateSubtasks(req, res) {
    try {
      // Check validation errors
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: errors.array()
        });
      }

      const userId = req.user.id;
      const { subtaskUpdates, connectionId } = req.body;

      // Validate Epic context if connectionId not provided
      let jiraConnectionId = connectionId;
      if (!jiraConnectionId) {
        const epicContext = await epicService.getEpicContext(userId);
        if (!epicContext.success || !epicContext.data) {
          return res.status(400).json({
            success: false,
            error: 'Epic context required or provide connectionId'
          });
        }
        jiraConnectionId = epicContext.data.epicData.connection.id;
      }

      const result = await subtaskService.bulkUpdateSubtasks(
        jiraConnectionId,
        subtaskUpdates,
        userId
      );

      res.json({
        success: true,
        data: result,
        message: `Updated ${result.summary.successful} subtasks, ${result.summary.failed} failed`
      });

    } catch (error) {
      console.error('Error bulk updating subtasks:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to bulk update subtasks'
      });
    }
  }

  // =====================================================
  // Subtask Analytics and Reporting
  // =====================================================

  /**
   * Generate completion report for Epic
   * GET /api/subtasks/reports/completion/:epicId
   */
  async generateCompletionReport(req, res) {
    try {
      const { epicId } = req.params;
      const { connectionId } = req.query;
      const userId = req.user.id;

      // Validate Epic context if connectionId not provided
      let jiraConnectionId = connectionId;
      if (!jiraConnectionId) {
        const epicContext = await epicService.getEpicContext(userId);
        if (!epicContext.success || !epicContext.data) {
          return res.status(400).json({
            success: false,
            error: 'Epic context required or provide connectionId'
          });
        }
        jiraConnectionId = epicContext.data.epicData.connection.id;
      }

      const report = await subtaskService.generateCompletionReport(
        jiraConnectionId,
        epicId,
        userId
      );

      res.json({
        success: true,
        data: report
      });

    } catch (error) {
      console.error('Error generating completion report:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to generate completion report'
      });
    }
  }

  /**
   * Get subtask creation statistics
   * GET /api/subtasks/stats/creation
   */
  async getSubtaskCreationStats(req, res) {
    try {
      const userId = req.user.id;
      const { days = 30 } = req.query;

      const stats = await subtaskService.getSubtaskCreationStats(
        userId,
        { days: parseInt(days) }
      );

      res.json({
        success: true,
        data: stats
      });

    } catch (error) {
      console.error('Error getting subtask creation stats:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to get subtask creation stats'
      });
    }
  }

  // =====================================================
  // Subtask Templates and Patterns
  // =====================================================

  /**
   * Get subtask templates based on scenario patterns
   * GET /api/subtasks/templates
   */
  async getSubtaskTemplates(req, res) {
    try {
      const { scenario_type, complexity } = req.query;

      // Return predefined subtask templates
      const templates = {
        api_scenarios: {
          name: 'API Scenarios',
          description: 'Templates for API-related scenarios',
          checklist: [
            'Design API endpoint structure',
            'Implement request/response validation',
            'Add error handling and status codes',
            'Write API documentation',
            'Create integration tests',
            'Test with different data scenarios'
          ]
        },
        ui_scenarios: {
          name: 'UI Scenarios',
          description: 'Templates for user interface scenarios',
          checklist: [
            'Design UI components and layout',
            'Implement user interactions',
            'Add form validation and feedback',
            'Ensure accessibility compliance',
            'Test responsive design',
            'Create unit tests for components'
          ]
        },
        database_scenarios: {
          name: 'Database Scenarios',
          description: 'Templates for data-related scenarios',
          checklist: [
            'Design database schema changes',
            'Implement data validation rules',
            'Add database migration scripts',
            'Create data access layer',
            'Write database tests',
            'Optimize query performance'
          ]
        },
        authentication_scenarios: {
          name: 'Authentication Scenarios',
          description: 'Templates for authentication scenarios',
          checklist: [
            'Implement authentication mechanism',
            'Add session management',
            'Create security middleware',
            'Add password validation',
            'Implement logout functionality',
            'Test security edge cases'
          ]
        }
      };

      const filteredTemplates = scenario_type 
        ? { [scenario_type]: templates[scenario_type] }
        : templates;

      res.json({
        success: true,
        data: {
          templates: filteredTemplates,
          total_templates: Object.keys(filteredTemplates).length
        }
      });

    } catch (error) {
      console.error('Error getting subtask templates:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to get subtask templates'
      });
    }
  }
}

export default new SubtaskController();