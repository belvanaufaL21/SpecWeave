import jiraService from '../services/jiraService.js';
import { validationResult } from 'express-validator';
import cleanLogger from '../config/cleanLogging.js';

/**
 * JIRA Controller - handles JIRA-related HTTP requests
 */

/**
 * Test new JIRA connection
 * POST /api/jira/test-connection
 */
export const testNewConnection = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { jiraUrl, email, apiToken, projectKey } = req.body;

    const result = await jiraService.testJiraConnection({
      jiraUrl,
      email,
      apiToken,
      projectKey
    });

    if (result.success) {
      return res.json({
        success: true,
        data: result.data,
        message: 'JIRA connection test successful'
      });
    } else {
      return res.status(400).json({
        success: false,
        error: result.error
      });
    }
  } catch (error) {
    cleanLogger.error('JIRA-CONTROLLER', 'Test connection error', { error: error.message });
    return res.status(500).json({
      success: false,
      error: 'Failed to test JIRA connection'
    });
  }
};

/**
 * Test existing JIRA connection
 * POST /api/jira/connections/:connectionId/test
 */
export const testConnection = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'User not authenticated'
      });
    }

    const { connectionId } = req.params;
    
    // Get connection details
    const connections = await jiraService.getUserJiraConnections(userId);
    const connection = connections.find(conn => conn.id === connectionId);
    
    if (!connection) {
      return res.status(404).json({
        success: false,
        error: 'Connection not found'
      });
    }

    // Test the connection
    const result = await jiraService.checkConnectionHealth(connectionId, userId);

    if (result.healthy) {
      return res.json({
        success: true,
        data: result,
        message: 'Connection is healthy'
      });
    } else {
      return res.status(400).json({
        success: false,
        error: result.message,
        data: result
      });
    }
  } catch (error) {
    cleanLogger.error('JIRA-CONTROLLER', 'Test connection error', { error: error.message });
    return res.status(500).json({
      success: false,
      error: 'Failed to test connection'
    });
  }
};

/**
 * Create new JIRA connection
 * POST /api/jira/connections
 */
export const createConnection = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'User not authenticated'
      });
    }

    // Transform camelCase to snake_case for database
    const connectionData = {
      jira_url: req.body.jiraUrl,
      jira_email: req.body.email,
      jira_api_token: req.body.apiToken,
      project_key: req.body.projectKey,
      project_name: req.body.projectName || req.body.projectKey
    };

    // Add token expiry date if provided
    if (req.body.tokenExpiresAt) {
      connectionData.token_expires_at = req.body.tokenExpiresAt;
    }
    
    const result = await jiraService.createJiraConnection(userId, connectionData);

    return res.status(201).json({
      success: true,
      data: result,
      message: 'JIRA connection created successfully'
    });
  } catch (error) {
    cleanLogger.error('JIRA-CONTROLLER', 'Create connection error', { error: error.message });
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to create JIRA connection'
    });
  }
};

/**
 * Get user's JIRA connections
 * GET /api/jira/connections
 */
export const getConnections = async (req, res) => {
  try {
    const userId = req.user?.id;
    
    // If no user, return empty array (for optionalAuth compatibility)
    if (!userId) {
      return res.json({
        success: true,
        data: []
      });
    }

    const connections = await jiraService.getUserJiraConnections(userId);

    return res.json({
      success: true,
      data: connections
    });
  } catch (error) {
    cleanLogger.error('JIRA-CONTROLLER', 'Get connections error', { error: error.message });
    return res.status(500).json({
      success: false,
      error: 'Failed to get JIRA connections'
    });
  }
};

/**
 * Delete JIRA connection
 * DELETE /api/jira/connections/:connectionId
 */
export const deleteConnection = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'User not authenticated'
      });
    }

    const { connectionId } = req.params;
    const result = await jiraService.deleteJiraConnection(userId, connectionId);

    if (result.success) {
      return res.json({
        success: true,
        message: result.message
      });
    } else {
      return res.status(400).json({
        success: false,
        error: result.error
      });
    }
  } catch (error) {
    cleanLogger.error('JIRA-CONTROLLER', 'Delete connection error', { error: error.message });
    return res.status(500).json({
      success: false,
      error: 'Failed to delete JIRA connection'
    });
  }
};

/**
 * Get available Epics from JIRA project
 * GET /api/jira/connections/:connectionId/projects/:projectKey/epics
 */
export const getProjectEpics = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const userId = req.user?.id;
    
    // For optionalAuth compatibility - if no user, still try to get epics
    // This allows testing without authentication
    if (!userId) {
      cleanLogger.warn('JIRA-CONTROLLER', 'Getting epics without authentication');
    }

    const { connectionId, projectKey } = req.params;

    cleanLogger.debug('JIRA-CONTROLLER', 'Getting project epics', {
      connectionId,
      projectKey,
      userId: userId || 'anonymous'
    });

    const epics = await jiraService.getProjectEpics(connectionId, projectKey, userId);

    return res.json({
      success: true,
      data: epics
    });
  } catch (error) {
    cleanLogger.error('JIRA-CONTROLLER', 'Get project epics error', { 
      error: error.message,
      stack: error.stack
    });
    
    // Return more specific error message
    const statusCode = error.message.includes('not found') ? 404 : 500;
    const errorMessage = error.message || 'Failed to get project epics';
    
    return res.status(statusCode).json({
      success: false,
      error: errorMessage
    });
  }
};

/**
 * Validate Epic access
 * GET /api/jira/connections/:connectionId/epics/:epicId/validate
 */
export const validateEpicAccess = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'User not authenticated'
      });
    }

    const { connectionId, epicId } = req.params;
    
    cleanLogger.debug('JIRA-CONTROLLER', 'Validating epic access', {
      connectionId,
      epicId,
      userId
    });

    const result = await jiraService.validateEpicAccess(connectionId, epicId, userId);

    if (result.success) {
      return res.json({
        success: true,
        data: result.data
      });
    } else {
      return res.status(400).json({
        success: false,
        error: result.error
      });
    }
  } catch (error) {
    cleanLogger.error('JIRA-CONTROLLER', 'Validate epic access error', { error: error.message });
    return res.status(500).json({
      success: false,
      error: 'Failed to validate epic access'
    });
  }
};

/**
 * Search Epics by query
 * GET /api/jira/connections/:connectionId/projects/:projectKey/epics/search
 */
export const searchEpics = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'User not authenticated'
      });
    }

    const { connectionId, projectKey } = req.params;
    const { q: searchQuery } = req.query;

    if (!searchQuery) {
      return res.status(400).json({
        success: false,
        error: 'Search query is required'
      });
    }

    const epics = await jiraService.getProjectEpics(connectionId, projectKey, userId);
    
    // Filter epics based on search query
    const filteredEpics = epics.filter(epic =>
      epic.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      epic.key?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      epic.summary?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return res.json({
      success: true,
      data: filteredEpics
    });
  } catch (error) {
    cleanLogger.error('JIRA-CONTROLLER', 'Search epics error', { error: error.message });
    return res.status(500).json({
      success: false,
      error: 'Failed to search epics'
    });
  }
};

/**
 * Check connection health
 * GET /api/jira/connections/:connectionId/health
 */
export const checkConnectionHealth = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'User not authenticated'
      });
    }

    const { connectionId } = req.params;
    const health = await jiraService.checkConnectionHealth(connectionId, userId);

    return res.json({
      success: true,
      data: health
    });
  } catch (error) {
    cleanLogger.error('JIRA-CONTROLLER', 'Check connection health error', { error: error.message });
    return res.status(500).json({
      success: false,
      error: 'Failed to check connection health'
    });
  }
};

/**
 * Check all connections health
 * GET /api/jira/connections/health/all
 */
export const checkAllConnectionsHealth = async (req, res) => {
  try {
    const userId = req.user?.id;
    
    // If user not authenticated, return empty result (not an error)
    if (!userId) {
      return res.json({
        success: true,
        data: {
          connections: [],
          summary: {
            total: 0,
            healthy: 0,
            unhealthy: 0,
            unknown: 0
          }
        }
      });
    }

    const healthResults = await jiraService.checkAllConnectionsHealth(userId);

    return res.json({
      success: true,
      data: healthResults
    });
  } catch (error) {
    cleanLogger.error('JIRA-CONTROLLER', 'Check all connections health error', { error: error.message });
    return res.status(500).json({
      success: false,
      error: 'Failed to check connections health'
    });
  }
};

/**
 * Create user story from Gherkin scenario
 * POST /api/jira/connections/:connectionId/epics/:epicId/user-stories
 */
export const createUserStory = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'User not authenticated'
      });
    }

    const { connectionId, epicId } = req.params;
    const storyData = req.body;

    // Implementation would call jiraService to create user story
    // For now, return not implemented
    return res.status(501).json({
      success: false,
      error: 'User story creation not yet implemented'
    });
  } catch (error) {
    cleanLogger.error('JIRA-CONTROLLER', 'Create user story error', { error: error.message });
    return res.status(500).json({
      success: false,
      error: 'Failed to create user story'
    });
  }
};

/**
 * Create subtasks from Gherkin scenarios
 * POST /api/jira/connections/:connectionId/user-stories/:userStoryId/subtasks
 */
export const createSubtasks = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'User not authenticated'
      });
    }

    const { connectionId, userStoryId } = req.params;
    const { scenarios } = req.body;

    // Implementation would call jiraService to create subtasks
    // For now, return not implemented
    return res.status(501).json({
      success: false,
      error: 'Subtask creation not yet implemented'
    });
  } catch (error) {
    cleanLogger.error('JIRA-CONTROLLER', 'Create subtasks error', { error: error.message });
    return res.status(500).json({
      success: false,
      error: 'Failed to create subtasks'
    });
  }
};

/**
 * Create complete JIRA structure (user story + subtasks)
 * POST /api/jira/connections/:connectionId/epics/:epicId/complete-story
 */
export const createCompleteStory = async (req, res) => {
  const requestId = `ctrl-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  
  // Force console log for production debugging
  console.log(`🔴 [JIRA-CONTROLLER][${requestId}] ===== RECEIVED REQUEST =====`);
  console.log(`🔴 [JIRA-CONTROLLER][${requestId}] Timestamp: ${new Date().toISOString()}`);
  
  try {
    cleanLogger.info('JIRA-CONTROLLER', `[${requestId}] Received createCompleteStory request`);
    
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'User not authenticated'
      });
    }

    const { connectionId, epicId } = req.params;
    const { storyData, scenarios, developmentTasks } = req.body;

    console.log(`🔴 [JIRA-CONTROLLER][${requestId}] Story Title: ${storyData?.title || storyData?.feature}`);
    console.log(`🔴 [JIRA-CONTROLLER][${requestId}] Scenarios: ${scenarios?.length || 0}`);
    console.log(`🔴 [JIRA-CONTROLLER][${requestId}] Tasks: ${developmentTasks?.length || 0}`);

    cleanLogger.info('JIRA-CONTROLLER', `[${requestId}] Creating complete story`, {
      connectionId,
      epicId,
      storyTitle: storyData?.title || storyData?.feature,
      scenarioCount: scenarios?.length || 0,
      taskCount: developmentTasks?.length || 0
    });

    // Create the complete story with scenarios and development tasks
    const result = await jiraService.createCompleteStory(
      connectionId,
      userId,
      epicId,
      storyData,
      scenarios,
      developmentTasks
    );

    if (result.success) {
      console.log(`🔴 [JIRA-CONTROLLER][${requestId}] ===== SUCCESS =====`);
      console.log(`🔴 [JIRA-CONTROLLER][${requestId}] Issue Key: ${result.data?.userStory?.key}`);
      
      cleanLogger.info('JIRA-CONTROLLER', `[${requestId}] Story created successfully`, {
        issueKey: result.data?.userStory?.key
      });
      
      return res.status(201).json({
        success: true,
        data: result.data,
        message: `User story created successfully with ${scenarios?.length || 0} scenarios and ${developmentTasks?.length || 0} development tasks`
      });
    } else {
      cleanLogger.error('JIRA-CONTROLLER', `[${requestId}] Story creation failed`, {
        error: result.error
      });
      
      return res.status(400).json({
        success: false,
        error: result.error
      });
    }
  } catch (error) {
    cleanLogger.error('JIRA-CONTROLLER', `[${requestId}] Create complete story error`, { error: error.message });
    return res.status(500).json({
      success: false,
      error: 'Failed to create complete story'
    });
  }
};

/**
 * Handle JIRA integration errors with fallback options
 * POST /api/jira/handle-error
 */
export const handleIntegrationError = async (req, res) => {
  try {
    const { error, context, scenarioData } = req.body;

    cleanLogger.error('JIRA-INTEGRATION', 'Integration error reported', {
      error,
      context
    });

    // Return error handling suggestions
    return res.json({
      success: true,
      data: {
        suggestions: [
          'Check your JIRA connection settings',
          'Verify your API token is still valid',
          'Ensure you have proper permissions in JIRA'
        ],
        canRetry: true
      }
    });
  } catch (error) {
    cleanLogger.error('JIRA-CONTROLLER', 'Handle integration error failed', { error: error.message });
    return res.status(500).json({
      success: false,
      error: 'Failed to handle integration error'
    });
  }
};

/**
 * Retry failed JIRA operations
 * POST /api/jira/retry
 */
export const retryOperation = async (req, res) => {
  try {
    const { operationType, operationData } = req.body;

    cleanLogger.info('JIRA-CONTROLLER', 'Retrying operation', { operationType });

    // Implementation would retry the failed operation
    // For now, return not implemented
    return res.status(501).json({
      success: false,
      error: 'Operation retry not yet implemented'
    });
  } catch (error) {
    cleanLogger.error('JIRA-CONTROLLER', 'Retry operation error', { error: error.message });
    return res.status(500).json({
      success: false,
      error: 'Failed to retry operation'
    });
  }
};

// Export as default object for compatibility
export default {
  testNewConnection,
  testConnection,
  createConnection,
  getConnections,
  deleteConnection,
  getProjectEpics,
  validateEpicAccess,
  searchEpics,
  checkConnectionHealth,
  checkAllConnectionsHealth,
  createUserStory,
  createSubtasks,
  createCompleteStory,
  handleIntegrationError,
  retryOperation
};
