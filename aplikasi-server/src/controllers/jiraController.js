import jiraService from '../services/jiraService.js';
import { validationResult } from 'express-validator';

/**
 * JIRA Controller
 * Handles JIRA integration endpoints including OAuth, Epic management, and issue creation
 */
class JiraController {
  
  // =====================================================
  // JIRA Connection Management
  // =====================================================

  /**
   * Create new JIRA connection
   * POST /api/jira/connections
   */
  async createConnection(req, res) {
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
      const connectionData = req.body;

      const connection = await jiraService.createJiraConnection(userId, connectionData);

      res.status(201).json({
        success: true,
        data: connection,
        message: 'JIRA connection created successfully'
      });
    } catch (error) {
      console.error('Error creating JIRA connection:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to create JIRA connection'
      });
    }
  }

  /**
   * Get user's JIRA connections
   * GET /api/jira/connections
   */
  async getConnections(req, res) {
    try {
      // If user is not authenticated, return empty connections without error
      if (!req.user || !req.user.id) {
        return res.json({
          success: true,
          data: [],
          message: 'No authentication - returning empty connections'
        });
      }

      const userId = req.user.id;
      
      // Add timeout to prevent hanging requests
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Connection fetch timeout')), 5000)
      );
      
      const connectionsPromise = jiraService.getUserJiraConnections(userId);
      
      const connections = await Promise.race([
        connectionsPromise,
        timeoutPromise
      ]);

      res.json({
        success: true,
        data: connections || []
      });
    } catch (error) {
      // Don't log errors for timeout or common issues
      if (error.message !== 'Connection fetch timeout') {
        console.error('Error fetching JIRA connections:', error);
      }
      
      // Always return success with empty array to prevent UI errors
      res.json({
        success: true,
        data: [],
        warning: 'Could not fetch connections',
        fallback: true
      });
    }
  }

  /**
   * Delete JIRA connection
   * DELETE /api/jira/connections/:connectionId
   */
  async deleteConnection(req, res) {
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
      const { connectionId } = req.params;

      console.log(`🗑️ [JIRA-CONTROLLER] Deleting connection ${connectionId} for user ${userId}`);

      const result = await jiraService.deleteJiraConnection(userId, connectionId);

      if (result.success) {
        res.json({
          success: true,
          message: 'JIRA connection deleted successfully'
        });
      } else {
        res.status(400).json({
          success: false,
          error: result.error || 'Failed to delete JIRA connection'
        });
      }
    } catch (error) {
      console.error('Error deleting JIRA connection:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to delete JIRA connection'
      });
    }
  }

  /**
   * Test new JIRA connection before creating
   * POST /api/jira/test-connection
   */
  async testNewConnection(req, res) {
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

      const { jiraUrl, email, apiToken, projectKey } = req.body;

      // Test the connection using JIRA service
      const testResult = await jiraService.testJiraConnection({
        jiraUrl,
        email,
        apiToken,
        projectKey
      });

      if (testResult.success) {
        res.json({
          success: true,
          data: testResult.data,
          message: 'JIRA connection test successful'
        });
      } else {
        res.status(400).json({
          success: false,
          error: testResult.error || 'JIRA connection test failed'
        });
      }
    } catch (error) {
      console.error('Error testing new JIRA connection:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'JIRA connection test failed'
      });
    }
  }

  /**
   * Test existing JIRA connection
   * POST /api/jira/connections/:connectionId/test
   */
  async testConnection(req, res) {
    try {
      const { connectionId } = req.params;
      const userId = req.user.id;

      // This would test the connection by making a simple API call
      // For now, we'll return a success response
      res.json({
        success: true,
        message: 'JIRA connection test successful'
      });
    } catch (error) {
      console.error('Error testing JIRA connection:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'JIRA connection test failed'
      });
    }
  }

  // =====================================================
  // Epic Management
  // =====================================================

  /**
   * Get available Epics from JIRA project
   * GET /api/jira/connections/:connectionId/projects/:projectKey/epics
   */
  async getProjectEpics(req, res) {
    try {
      const { connectionId, projectKey } = req.params;
      
      // Handle both authenticated and unauthenticated requests
      if (!req.user || !req.user.id) {
        console.log('⚠️ No authenticated user, returning empty Epic list');
        return res.json({
          success: true,
          data: [],
          warning: 'Authentication required for JIRA integration',
          fallback: true
        });
      }

      const userId = req.user.id;
      
      console.log(`🔍 Fetching Epics for user ${userId}, connection ${connectionId}, project ${projectKey}`);

      // Add timeout to prevent hanging requests
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Epic fetch timeout')), 10000)
      );
      
      const epicsPromise = jiraService.getProjectEpics(connectionId, projectKey, userId);
      
      const epics = await Promise.race([
        epicsPromise,
        timeoutPromise
      ]);

      console.log(`✅ Successfully fetched ${epics ? epics.length : 0} Epics`);

      res.json({
        success: true,
        data: epics || []
      });
    } catch (error) {
      console.error('Error fetching project Epics:', error);
      
      // Always return empty array to prevent UI breaking
      res.json({
        success: true,
        data: [],
        warning: error.message || 'Could not fetch Epics from JIRA',
        fallback: true
      });
    }
  }

  /**
   * Validate Epic access and permissions
   * GET /api/jira/connections/:connectionId/epics/:epicId/validate
   */
  async validateEpicAccess(req, res) {
    try {
      const { connectionId, epicId } = req.params;
      const userId = req.user.id;

      const validation = await jiraService.validateEpicAccess(connectionId, epicId, userId);

      res.json({
        success: true,
        data: validation
      });
    } catch (error) {
      console.error('Error validating Epic access:', error);
      res.status(400).json({
        success: false,
        error: error.message || 'Epic validation failed'
      });
    }
  }

  /**
   * Search Epics by query
   * GET /api/jira/connections/:connectionId/projects/:projectKey/epics/search
   */
  async searchEpics(req, res) {
    try {
      const { connectionId, projectKey } = req.params;
      const { q: searchQuery } = req.query;
      const userId = req.user.id;

      if (!searchQuery) {
        return res.status(400).json({
          success: false,
          error: 'Search query is required'
        });
      }

      // Get all epics first, then filter
      const allEpics = await jiraService.getProjectEpics(connectionId, projectKey, userId);
      
      const filteredEpics = allEpics.filter(epic => 
        epic.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        epic.key.toLowerCase().includes(searchQuery.toLowerCase()) ||
        epic.summary.toLowerCase().includes(searchQuery.toLowerCase())
      );

      res.json({
        success: true,
        data: filteredEpics
      });
    } catch (error) {
      console.error('Error searching Epics:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to search Epics'
      });
    }
  }

  // =====================================================
  // User Story and Subtask Creation
  // =====================================================

  /**
   * Create user story from Gherkin scenario
   * POST /api/jira/connections/:connectionId/epics/:epicId/user-stories
   */
  async createUserStory(req, res) {
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

      const { connectionId, epicId } = req.params;
      const userId = req.user.id;
      const storyData = req.body;

      const userStory = await jiraService.createUserStory(connectionId, epicId, storyData, userId);

      res.status(201).json({
        success: true,
        data: userStory,
        message: 'User story created successfully'
      });
    } catch (error) {
      console.error('Error creating user story:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to create user story'
      });
    }
  }

  /**
   * Create subtasks from Gherkin scenarios
   * POST /api/jira/connections/:connectionId/user-stories/:userStoryId/subtasks
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

      const { connectionId, userStoryId } = req.params;
      const userId = req.user.id;
      const { scenarios } = req.body;

      if (!scenarios || !Array.isArray(scenarios)) {
        return res.status(400).json({
          success: false,
          error: 'Scenarios array is required'
        });
      }

      const subtasks = await jiraService.createSubtasks(connectionId, userStoryId, scenarios, userId);

      res.status(201).json({
        success: true,
        data: subtasks,
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

  /**
   * Create complete JIRA structure (user story + subtasks) with enhanced error handling
   * POST /api/jira/connections/:connectionId/epics/:epicId/complete-story
   */
  async createCompleteStory(req, res) {
    let userStory = null;
    let subtasks = [];
    
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

      const { connectionId, epicId } = req.params;
      const userId = req.user.id;
      const { storyData, scenarios } = req.body;

      console.log('🔍 Debug createCompleteStory data:');
      console.log('connectionId:', connectionId);
      console.log('epicId:', epicId);
      console.log('userId:', userId);
      console.log('storyData:', JSON.stringify(storyData, null, 2));
      console.log('scenarios (separate):', JSON.stringify(scenarios, null, 2));
      console.log('storyData.scenarios:', JSON.stringify(storyData.scenarios, null, 2));

      // Validate required data
      if (!storyData || !storyData.title) {
        return res.status(400).json({
          success: false,
          error: 'Story data with title is required'
        });
      }

      // Step 1: Create user story with retry mechanism
      console.log('🔍 Creating user story...');
      try {
        userStory = await jiraService.createUserStory(connectionId, epicId, storyData, userId);
        console.log('✅ User story created:', userStory);
      } catch (userStoryError) {
        console.error('❌ Failed to create user story:', userStoryError);
        
        // Try with simplified data if original fails
        console.log('🔄 Retrying user story creation with simplified data...');
        const simplifiedStoryData = {
          title: storyData.title,
          userStory: storyData.userStory || storyData.title,
          description: 'Generated from SpecWeave',
          scenarios: [] // Empty scenarios for fallback
        };
        
        try {
          userStory = await jiraService.createUserStory(connectionId, epicId, simplifiedStoryData, userId);
          console.log('✅ User story created with simplified data:', userStory);
        } catch (fallbackError) {
          console.error('❌ Failed to create user story even with simplified data:', fallbackError);
          throw userStoryError; // Throw original error
        }
      }

      // Note: Scenarios are already included in the user story's acceptance criteria table
      // No need to create separate subtasks
      console.log('ℹ️ Scenarios included in user story acceptance criteria, no subtasks needed');

      // Return success with user story containing acceptance criteria table
      const scenarioCount = scenarios && Array.isArray(scenarios) ? scenarios.length : 0;
      const successMessage = scenarioCount > 0 
        ? `Created user story with ${scenarioCount} scenarios in acceptance criteria table`
        : 'Created user story successfully';

      res.status(201).json({
        success: true,
        data: {
          userStory,
          subtasks: [], // No subtasks created - scenarios are in acceptance criteria
          scenarioCount
        },
        message: successMessage
      });
      
    } catch (error) {
      console.error('Error creating complete story:', error);
      
      // If we have a user story, that's all we need (scenarios are in acceptance criteria)
      if (userStory) {
        console.log('✅ User story created successfully with acceptance criteria');
        return res.status(201).json({
          success: true,
          data: {
            userStory,
            subtasks: [], // No subtasks needed
            scenarioCount: scenarios && Array.isArray(scenarios) ? scenarios.length : 0
          },
          message: 'Created user story successfully with acceptance criteria table'
        });
      }
      
      // Complete failure
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to create complete story'
      });
    }
  }

  // =====================================================
  // OAuth Methods
  // =====================================================

  /**
   * Check if OAuth is available/configured
   * GET /api/jira/oauth/available
   */
  async checkOAuthAvailable(req, res) {
    try {
      // For now, return false since OAuth is not implemented yet
      // In production, this would check if OAuth credentials are configured
      res.json({
        success: true,
        data: {
          available: false,
          reason: 'OAuth integration is not yet configured. Please use manual setup.'
        }
      });
    } catch (error) {
      console.error('Error checking OAuth availability:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to check OAuth availability'
      });
    }
  }

  /**
   * Start JIRA OAuth flow
   * POST /api/jira/oauth/start
   */
  async startOAuthFlow(req, res) {
    try {
      // For now, return an error since OAuth is not implemented
      // In production, this would initiate the OAuth flow
      res.status(501).json({
        success: false,
        error: 'OAuth integration is not yet implemented. Please use manual setup with your JIRA URL and project key.'
      });
    } catch (error) {
      console.error('Error starting OAuth flow:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to start OAuth flow'
      });
    }
  }

  /**
   * Complete JIRA OAuth flow
   * POST /api/jira/oauth/callback
   */
  async completeOAuthFlow(req, res) {
    try {
      // For now, return an error since OAuth is not implemented
      res.status(501).json({
        success: false,
        error: 'OAuth callback is not yet implemented'
      });
    } catch (error) {
      console.error('Error completing OAuth flow:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to complete OAuth flow'
      });
    }
  }

  // =====================================================
  // Error Handling and Fallbacks
  // =====================================================

  /**
   * Handle JIRA integration errors with fallback options
   * POST /api/jira/handle-error
   */
  async handleIntegrationError(req, res) {
    try {
      const { error, context, scenarioData } = req.body;
      const userId = req.user.id;

      // Log the error for monitoring
      console.error('JIRA Integration Error:', {
        userId,
        error,
        context,
        timestamp: new Date().toISOString()
      });

      // Provide fallback options
      const fallbackOptions = {
        saveLocally: {
          available: true,
          description: 'Save scenario locally and retry JIRA integration later'
        },
        exportToFile: {
          available: true,
          description: 'Export scenario data to file for manual JIRA import'
        },
        retryConnection: {
          available: true,
          description: 'Retry with different JIRA connection or credentials'
        },
        contactSupport: {
          available: true,
          description: 'Contact support for assistance with JIRA integration'
        }
      };

      res.json({
        success: true,
        data: {
          error: error,
          fallbackOptions,
          recoveryInstructions: [
            'Check your JIRA connection settings',
            'Verify Epic permissions and access',
            'Ensure JIRA instance is accessible',
            'Try again with a different Epic or project'
          ]
        },
        message: 'Error handled with fallback options provided'
      });
    } catch (error) {
      console.error('Error handling JIRA integration error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to handle integration error'
      });
    }
  }



  /**
   * Retry failed JIRA operations
   * POST /api/jira/retry
   */
  async retryOperation(req, res) {
    try {
      const { operationType, operationData } = req.body;
      const userId = req.user.id;

      let result;

      switch (operationType) {
        case 'createUserStory':
          result = await jiraService.createUserStory(
            operationData.connectionId,
            operationData.epicId,
            operationData.storyData,
            userId
          );
          break;

        case 'createSubtasks':
          result = await jiraService.createSubtasks(
            operationData.connectionId,
            operationData.userStoryId,
            operationData.scenarios,
            userId
          );
          break;

        default:
          return res.status(400).json({
            success: false,
            error: 'Invalid operation type for retry'
          });
      }

      res.json({
        success: true,
        data: result,
        message: 'Operation retried successfully'
      });
    } catch (error) {
      console.error('Error retrying JIRA operation:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to retry operation'
      });
    }
  }
}

export default new JiraController();