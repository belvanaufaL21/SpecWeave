import axios from 'axios';
import supabaseService from './supabaseService.js';
import cleanLogger from '../config/cleanLogging.js';

/**
 * JIRA Service - handles JIRA API interactions
 */
class JiraService {
  /**
   * Get user's JIRA connections
   */
  async getUserJiraConnections(userId) {
    try {
      const connections = await supabaseService.getUserJiraConnections(userId);
      return connections || [];
    } catch (error) {
      cleanLogger.error('JIRA-SERVICE', 'Failed to get user connections', { 
        error: error.message,
        userId
      });
      return [];
    }
  }

  /**
   * Create JIRA connection
   */
  async createJiraConnection(userId, connectionData) {
    try {
      const connection = await supabaseService.createJiraConnection(userId, connectionData);
      return connection;
    } catch (error) {
      cleanLogger.error('JIRA-SERVICE', 'Failed to create connection', { 
        error: error.message,
        userId
      });
      throw error;
    }
  }

  /**
   * Delete JIRA connection
   */
  async deleteJiraConnection(userId, connectionId) {
    try {
      await supabaseService.deleteJiraConnection(connectionId, userId);
      return { success: true };
    } catch (error) {
      cleanLogger.error('JIRA-SERVICE', 'Failed to delete connection', { 
        error: error.message,
        userId,
        connectionId
      });
      return { success: false, error: error.message };
    }
  }

  /**
   * Check connection health
   */
  async checkConnectionHealth(connectionId, userId) {
    try {
      const connections = await this.getUserJiraConnections(userId);
      const connection = connections.find(conn => conn.id === connectionId);
      
      if (!connection) {
        return {
          healthy: false,
          message: 'Connection not found'
        };
      }

      // Test the connection
      const result = await this.testJiraConnection({
        jiraUrl: connection.jira_url,
        email: connection.jira_email,
        apiToken: connection.jira_api_token,
        projectKey: connection.project_key
      });

      return {
        healthy: result.success,
        message: result.success ? 'Connection is healthy' : result.error,
        lastChecked: new Date().toISOString()
      };
    } catch (error) {
      cleanLogger.error('JIRA-SERVICE', 'Health check failed', { 
        error: error.message,
        connectionId
      });
      return {
        healthy: false,
        message: error.message
      };
    }
  }

  /**
   * Check all connections health
   */
  async checkAllConnectionsHealth(userId) {
    try {
      const connections = await this.getUserJiraConnections(userId);
      const healthResults = [];

      for (const connection of connections) {
        const health = await this.checkConnectionHealth(connection.id, userId);
        healthResults.push({
          connectionId: connection.id,
          projectKey: connection.project_key,
          ...health
        });
      }

      return healthResults;
    } catch (error) {
      cleanLogger.error('JIRA-SERVICE', 'Failed to check all connections', { 
        error: error.message,
        userId
      });
      return [];
    }
  }

  /**
   * Validate epic access
   */
  async validateEpicAccess(connectionId, epicId, userId) {
    try {
      const connections = await this.getUserJiraConnections(userId);
      const connection = connections.find(conn => conn.id === connectionId);
      
      if (!connection) {
        return {
          success: false,
          error: 'Connection not found'
        };
      }

      const auth = Buffer.from(`${connection.jira_email}:${connection.jira_api_token}`).toString('base64');
      
      // Try to fetch the epic
      const response = await axios.get(
        `${connection.jira_url}/rest/api/3/issue/${epicId}`,
        {
          headers: {
            'Authorization': `Basic ${auth}`,
            'Accept': 'application/json'
          },
          timeout: 10000
        }
      );

      return {
        success: true,
        data: {
          id: response.data.id,
          key: response.data.key,
          summary: response.data.fields.summary
        }
      };
    } catch (error) {
      cleanLogger.error('JIRA-SERVICE', 'Epic validation failed', { 
        error: error.message,
        connectionId,
        epicId
      });
      return {
        success: false,
        error: error.response?.data?.errorMessages?.[0] || error.message
      };
    }
  }

  /**
   * Test JIRA connection
   */
  async testJiraConnection({ jiraUrl, email, apiToken, projectKey }) {
    try {
      const auth = Buffer.from(`${email}:${apiToken}`).toString('base64');
      
      // Test connection by fetching project info
      const response = await axios.get(
        `${jiraUrl}/rest/api/3/project/${projectKey}`,
        {
          headers: {
            'Authorization': `Basic ${auth}`,
            'Accept': 'application/json'
          },
          timeout: 10000
        }
      );

      return {
        success: true,
        data: {
          projectKey: response.data.key,
          projectName: response.data.name,
          projectId: response.data.id
        }
      };
    } catch (error) {
      cleanLogger.error('JIRA-SERVICE', 'Connection test failed', { 
        error: error.message,
        jiraUrl,
        projectKey
      });
      
      return {
        success: false,
        error: error.response?.data?.errorMessages?.[0] || error.message
      };
    }
  }

  /**
   * Get project epics
   */
  async getProjectEpics(connectionId, projectKey, userId) {
    try {
      cleanLogger.info('JIRA-SERVICE', 'Getting project epics', {
        connectionId,
        projectKey,
        userId: userId || 'anonymous'
      });

      // Get connection details from database
      let connection;
      
      if (userId) {
        // Get connection with user validation
        cleanLogger.debug('JIRA-SERVICE', 'Getting connection with user validation');
        const connections = await this.getUserJiraConnections(userId);
        connection = connections.find(conn => conn.id === connectionId);
        
        if (!connection) {
          throw new Error('JIRA connection not found or access denied');
        }
      } else {
        // Get connection without user validation (for testing)
        cleanLogger.debug('JIRA-SERVICE', 'Getting connection without user validation');
        connection = await supabaseService.getJiraConnection(connectionId);
        
        if (!connection) {
          throw new Error('JIRA connection not found');
        }
      }

      cleanLogger.debug('JIRA-SERVICE', 'Connection retrieved', {
        jira_url: connection.jira_url,
        jira_email: connection.jira_email,
        project_key: connection.project_key
      });

      const auth = Buffer.from(`${connection.jira_email}:${connection.jira_api_token}`).toString('base64');
      
      // First, try to get project metadata to check if it exists
      try {
        const projectResponse = await axios.get(
          `${connection.jira_url}/rest/api/3/project/${projectKey}`,
          {
            headers: {
              'Authorization': `Basic ${auth}`,
              'Accept': 'application/json'
            },
            timeout: 10000
          }
        );
        
        cleanLogger.info('JIRA-SERVICE', 'Project metadata retrieved', {
          projectKey: projectResponse.data.key,
          projectName: projectResponse.data.name,
          projectId: projectResponse.data.id
        });
      } catch (error) {
        cleanLogger.error('JIRA-SERVICE', 'Failed to get project metadata', {
          error: error.message,
          status: error.response?.status
        });
        throw new Error(`Project ${projectKey} not found or access denied`);
      }

      // Try to get all issue types available in the project
      let availableIssueTypes = [];
      try {
        const projectResponse = await axios.get(
          `${connection.jira_url}/rest/api/3/project/${projectKey}`,
          {
            headers: {
              'Authorization': `Basic ${auth}`,
              'Accept': 'application/json'
            },
            timeout: 10000
          }
        );
        
        availableIssueTypes = projectResponse.data.issueTypes || [];
        cleanLogger.info('JIRA-SERVICE', 'Available issue types in project', {
          projectKey,
          issueTypes: availableIssueTypes.map(t => ({ id: t.id, name: t.name }))
        });
      } catch (error) {
        cleanLogger.warn('JIRA-SERVICE', 'Could not fetch issue types', {
          error: error.message
        });
      }

      // Check if Epic type exists in project configuration
      const epicType = availableIssueTypes.find(t => 
        t.name && t.name.toLowerCase().includes('epic')
      );
      
      if (!epicType) {
        cleanLogger.warn('JIRA-SERVICE', 'Epic issue type not configured in project', {
          projectKey,
          availableTypes: availableIssueTypes.map(t => t.name)
        });
      } else {
        cleanLogger.info('JIRA-SERVICE', 'Epic type found', {
          epicTypeId: epicType.id,
          epicTypeName: epicType.name
        });
      }

      // First, try to get all issue types in the project to find the correct Epic type
      cleanLogger.debug('JIRA-SERVICE', 'Fetching all issues to identify Epic type');
      
      let allIssuesResponse;
      try {
        const testJql = `project = ${projectKey}`;
        
        cleanLogger.info('JIRA-SERVICE', 'Testing basic JQL', {
          jql: testJql,
          url: `${connection.jira_url}/rest/api/3/search/jql`,
          email: connection.jira_email
        });
        
        allIssuesResponse = await axios.post(
          `${connection.jira_url}/rest/api/3/search/jql`,
          {
            jql: testJql,
            maxResults: 10,
            fields: ['summary', 'key', 'id', 'status', 'issuetype']
          },
          {
            headers: {
              'Authorization': `Basic ${auth}`,
              'Accept': 'application/json',
              'Content-Type': 'application/json'
            },
            timeout: 10000
          }
        );
        
        cleanLogger.info('JIRA-SERVICE', 'JIRA Response received', {
          status: allIssuesResponse.status,
          total: allIssuesResponse.data.total,
          returned: allIssuesResponse.data.issues?.length || 0,
          maxResults: allIssuesResponse.data.maxResults,
          startAt: allIssuesResponse.data.startAt
        });
        
        if (allIssuesResponse.data.issues && allIssuesResponse.data.issues.length > 0) {
          // Get unique issue types for better debugging
          const issueTypes = [...new Set(allIssuesResponse.data.issues.map(i => i.fields?.issuetype?.name))];
          
          cleanLogger.info('JIRA-SERVICE', 'Sample issues from project', {
            count: allIssuesResponse.data.issues.length,
            uniqueIssueTypes: issueTypes,
            issueTypes: allIssuesResponse.data.issues.map(i => ({
              key: i.key,
              type: i.fields?.issuetype?.name,
              typeId: i.fields?.issuetype?.id,
              summary: i.fields?.summary?.substring(0, 50)
            }))
          });
          
          // Check if Epic type exists
          const hasEpicType = issueTypes.some(type => 
            type && type.toLowerCase().includes('epic')
          );
          
          if (!hasEpicType) {
            cleanLogger.warn('JIRA-SERVICE', 'No Epic issue type found in project', {
              projectKey,
              availableTypes: issueTypes,
              suggestion: 'Project may not have Epic issue type configured. Available types: ' + issueTypes.join(', ')
            });
          }
        } else {
          cleanLogger.warn('JIRA-SERVICE', 'No issues found in project', {
            projectKey,
            jiraUrl: connection.jira_url,
            responseTotal: allIssuesResponse.data.total,
            suggestion: 'Project may be empty or user lacks permissions to view issues'
          });
        }
      } catch (error) {
        cleanLogger.error('JIRA-SERVICE', 'Failed to fetch sample issues', { 
          error: error.message,
          status: error.response?.status,
          statusText: error.response?.statusText,
          data: error.response?.data
        });
      }
      
      // Fetch epics using JQL - try multiple variations
      const jqlVariations = [];
      
      // If we found Epic type ID, use it directly (most reliable)
      if (epicType && epicType.id) {
        jqlVariations.push(
          `project = ${projectKey} AND issuetype = ${epicType.id} ORDER BY created DESC`
        );
      }
      
      // Try various Epic name variations (most common first for speed)
      jqlVariations.push(
        `project = ${projectKey} AND issuetype = Epic ORDER BY created DESC`,
        `project = ${projectKey} AND type = Epic ORDER BY created DESC`
      );
      
      let response = null;
      let lastError = null;
      let usedJql = null;
      
      for (const jql of jqlVariations) {
        try {
          cleanLogger.debug('JIRA-SERVICE', 'Trying JQL', { jql });
          
          response = await axios.post(
            `${connection.jira_url}/rest/api/3/search/jql`,
            {
              jql,
              maxResults: 100,
              fields: ['summary', 'key', 'id', 'status', 'issuetype', 'assignee', 'created', 'updated']
            },
            {
              headers: {
                'Authorization': `Basic ${auth}`,
                'Accept': 'application/json',
                'Content-Type': 'application/json'
              },
              timeout: 15000
            }
          );
          
          if (response.data.issues && response.data.issues.length > 0) {
            usedJql = jql;
            cleanLogger.info('JIRA-SERVICE', 'Found issues with JQL', { 
              jql, 
              count: response.data.issues.length,
              issueTypes: response.data.issues.map(i => i.fields?.issuetype?.name)
            });
            break; // Found issues, stop trying
          }
        } catch (error) {
          lastError = error;
          cleanLogger.debug('JIRA-SERVICE', 'JQL failed, trying next', { 
            jql, 
            error: error.message 
          });
        }
      }
      
      if (!response || !response.data.issues || response.data.issues.length === 0) {
        cleanLogger.warn('JIRA-SERVICE', 'No issues found in project after trying all JQL variations', {
          projectKey,
          triedQueries: jqlVariations.length,
          lastError: lastError?.message,
          epicTypeConfigured: !!epicType,
          availableIssueTypes: availableIssueTypes.map(t => t.name)
        });
        
        // Return empty array with helpful metadata
        return [];
        return [];
      }

      cleanLogger.info('JIRA-SERVICE', 'JIRA API Response', {
        usedJql,
        total: response.data.total,
        issuesCount: response.data.issues?.length || 0,
        sampleIssues: response.data.issues?.slice(0, 3).map(i => ({
          key: i.key,
          type: i.fields?.issuetype?.name,
          summary: i.fields?.summary
        }))
      });

      // Filter for Epic issues (in case we got all issues)
      const epicIssues = response.data.issues.filter(issue => {
        const issueType = issue.fields?.issuetype?.name?.toLowerCase();
        return issueType === 'epic' || issueType === 'épico' || issueType?.includes('epic');
      });

      cleanLogger.info('JIRA-SERVICE', 'Filtered Epic issues', {
        totalIssues: response.data.issues.length,
        epicCount: epicIssues.length
      });

      const epics = epicIssues.map(issue => ({
        id: issue.id,
        key: issue.key,
        name: issue.fields?.summary || 'No summary',
        summary: issue.fields?.summary || 'No summary',
        status: issue.fields?.status?.name || 'Unknown',
        issueType: issue.fields?.issuetype?.name || 'Epic',
        assignee: issue.fields?.assignee?.displayName || 'Unassigned',
        created: issue.fields?.created,
        updated: issue.fields?.updated
      }));

      cleanLogger.info('JIRA-SERVICE', 'Epics mapped successfully', {
        count: epics.length,
        epics: epics.map(e => ({ id: e.id, key: e.key, summary: e.summary }))
      });

      return epics;
    } catch (error) {
      cleanLogger.error('JIRA-SERVICE', 'Failed to fetch epics', { 
        error: error.message,
        response: error.response?.data,
        status: error.response?.status,
        connectionId,
        projectKey
      });
      throw error;
    }
  }

  /**
   * Create user story in JIRA
   */
  async createUserStory(connectionId, epicId, storyData) {
    try {
      // Get connection details from database
      const connection = await supabaseService.getJiraConnection(connectionId);
      
      if (!connection) {
        throw new Error('JIRA connection not found');
      }

      const auth = Buffer.from(`${connection.jira_email}:${connection.jira_api_token}`).toString('base64');
      
      // Create user story
      const issueData = {
        fields: {
          project: {
            key: connection.project_key
          },
          summary: storyData.title || storyData.feature || storyData.featureName || storyData.userStory,
          description: this._formatDescriptionADF(storyData),
          issuetype: {
            name: 'Story'
          }
        }
      };

      // Add epic link if provided
      // In JIRA, Stories cannot have Epics as parents using the parent field
      // Instead, we need to use the Epic Link custom field or set it after creation
      // For now, we'll create the story without the Epic link and add it separately
      // The Epic link will be set using a separate API call after story creation

      // Log the payload being sent to JIRA
      cleanLogger.info('JIRA-SERVICE', 'Creating user story with payload', {
        projectKey: connection.project_key,
        summary: issueData.fields.summary,
        hasDescription: !!issueData.fields.description,
        descriptionContentLength: issueData.fields.description?.content?.length || 0,
        epicId: epicId,
        issueType: issueData.fields.issuetype.name
      });

      const response = await axios.post(
        `${connection.jira_url}/rest/api/3/issue`,
        issueData,
        {
          headers: {
            'Authorization': `Basic ${auth}`,
            'Accept': 'application/json',
            'Content-Type': 'application/json'
          },
          timeout: 15000
        }
      );

      const createdIssue = {
        id: response.data.id,
        key: response.data.key,
        self: response.data.self
      };

      // Link to Epic if provided
      if (epicId) {
        try {
          await this._linkStoryToEpic(connection, createdIssue.id, epicId, auth);
          cleanLogger.info('JIRA-SERVICE', 'Story linked to Epic successfully', {
            storyId: createdIssue.id,
            epicId: epicId
          });
        } catch (linkError) {
          cleanLogger.warn('JIRA-SERVICE', 'Failed to link story to Epic (story created successfully)', {
            storyId: createdIssue.id,
            epicId: epicId,
            error: linkError.message
          });
          // Don't fail the whole operation if Epic link fails
        }
      }

      return createdIssue;
    } catch (error) {
      // Log detailed error response from JIRA
      const errorDetails = {
        message: error.message,
        connectionId,
        epicId
      };
      
      if (error.response) {
        errorDetails.status = error.response.status;
        errorDetails.jiraError = error.response.data;
        
        // Log the full request payload for debugging
        if (error.config?.data) {
          try {
            const requestData = JSON.parse(error.config.data);
            cleanLogger.error('JIRA-SERVICE', 'Failed request payload', {
              summary: requestData.fields?.summary,
              description: requestData.fields?.description,
              epicId: requestData.fields?.parent?.id
            });
          } catch (parseError) {
            // Ignore parse errors
          }
        }
      }
      
      cleanLogger.error('JIRA-SERVICE', 'Failed to create user story', errorDetails);
      throw error;
    }
  }

  /**
   * Create subtasks from development tasks
   */
  async createSubtasks(connectionId, userStoryId, developmentTasks) {
    try {
      // Get connection details from database
      const connection = await supabaseService.getJiraConnection(connectionId);
      
      if (!connection) {
        throw new Error('JIRA connection not found');
      }

      const auth = Buffer.from(`${connection.jira_email}:${connection.jira_api_token}`).toString('base64');
      
      const subtasks = [];

      for (const task of developmentTasks) {
        // Format task summary
        let taskSummary = '';
        if (typeof task === 'string') {
          taskSummary = task;
        } else if (task.summary) {
          taskSummary = task.summary;
        } else if (task.title) {
          taskSummary = task.title;
        } else if (task.description) {
          const role = task.role ? `[${task.role}] ` : '';
          taskSummary = `${role}${task.description}`;
        } else {
          taskSummary = 'Development Task';
        }

        // Format task description (optional details)
        let taskDescription = null;
        if (task.description && typeof task === 'object') {
          const descriptionParts = [];
          
          if (task.role) {
            descriptionParts.push(`Role: ${task.role}`);
          }
          if (task.priority) {
            descriptionParts.push(`Priority: ${task.priority}`);
          }
          if (task.status) {
            descriptionParts.push(`Status: ${task.status}`);
          }
          
          if (descriptionParts.length > 0) {
            taskDescription = {
              type: 'doc',
              version: 1,
              content: [
                {
                  type: 'paragraph',
                  content: [
                    {
                      type: 'text',
                      text: descriptionParts.join(' | ')
                    }
                  ]
                }
              ]
            };
          }
        }

        const subtaskData = {
          fields: {
            project: {
              key: connection.project_key
            },
            summary: taskSummary,
            issuetype: {
              name: 'Subtask'
            },
            parent: {
              id: userStoryId
            }
          }
        };

        // Add description if available
        if (taskDescription) {
          subtaskData.fields.description = taskDescription;
        }

        // Add priority if available
        if (task.priority && typeof task === 'object') {
          const priorityMap = {
            'High': 'High',
            'Medium': 'Medium',
            'Low': 'Low',
            'Highest': 'Highest',
            'Lowest': 'Lowest'
          };
          
          if (priorityMap[task.priority]) {
            subtaskData.fields.priority = {
              name: priorityMap[task.priority]
            };
          }
        }

        const response = await axios.post(
          `${connection.jira_url}/rest/api/3/issue`,
          subtaskData,
          {
            headers: {
              'Authorization': `Basic ${auth}`,
              'Accept': 'application/json',
              'Content-Type': 'application/json'
            },
            timeout: 15000
          }
        );

        subtasks.push({
          id: response.data.id,
          key: response.data.key,
          self: response.data.self
        });
      }

      return subtasks;
    } catch (error) {
      // Log detailed error response from JIRA
      const errorDetails = {
        message: error.message,
        connectionId,
        userStoryId
      };
      
      if (error.response) {
        errorDetails.status = error.response.status;
        errorDetails.jiraError = error.response.data;
      }
      
      cleanLogger.error('JIRA-SERVICE', 'Failed to create subtasks', errorDetails);
      throw error;
    }
  }

  /**
   * Link a story to an Epic
   * @private
   */
  async _linkStoryToEpic(connection, storyId, epicId, auth) {
    try {
      // Get Epic key first
      const epicResponse = await axios.get(
        `${connection.jira_url}/rest/api/3/issue/${epicId}`,
        {
          headers: {
            'Authorization': `Basic ${auth}`,
            'Accept': 'application/json'
          },
          timeout: 10000
        }
      );

      const epicKey = epicResponse.data.key;

      // Find the Epic Link field ID
      // Common field IDs: customfield_10014, customfield_10008, etc.
      // We'll try to get it from the project's field configuration
      const fieldsResponse = await axios.get(
        `${connection.jira_url}/rest/api/3/field`,
        {
          headers: {
            'Authorization': `Basic ${auth}`,
            'Accept': 'application/json'
          },
          timeout: 10000
        }
      );

      // Find Epic Link field
      const epicLinkField = fieldsResponse.data.find(
        field => field.name === 'Epic Link' || field.schema?.custom === 'com.pyxis.greenhopper.jira:gh-epic-link'
      );

      if (epicLinkField) {
        // Update story with Epic Link
        await axios.put(
          `${connection.jira_url}/rest/api/3/issue/${storyId}`,
          {
            fields: {
              [epicLinkField.id]: epicKey
            }
          },
          {
            headers: {
              'Authorization': `Basic ${auth}`,
              'Accept': 'application/json',
              'Content-Type': 'application/json'
            },
            timeout: 10000
          }
        );
      } else {
        // Try using parent field for next-gen projects
        await axios.put(
          `${connection.jira_url}/rest/api/3/issue/${storyId}`,
          {
            fields: {
              parent: {
                id: epicId
              }
            }
          },
          {
            headers: {
              'Authorization': `Basic ${auth}`,
              'Accept': 'application/json',
              'Content-Type': 'application/json'
            },
            timeout: 10000
          }
        );
      }
    } catch (error) {
      cleanLogger.warn('JIRA-SERVICE', 'Failed to link story to Epic', {
        storyId,
        epicId,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Format story description for JIRA
   */
  _formatDescription(storyData) {
    let description = '';
    
    if (storyData.description) {
      description += storyData.description + '\n\n';
    }
    
    if (storyData.feature) {
      description += `*Feature:* ${storyData.feature}\n\n`;
    }
    
    if (storyData.scenarios && storyData.scenarios.length > 0) {
      description += '*Scenarios:*\n';
      storyData.scenarios.forEach((scenario, index) => {
        description += `${index + 1}. ${scenario.title || scenario.type || 'Scenario'}\n`;
      });
    }
    
    return description;
  }

  /**
   * Format description in Atlassian Document Format (ADF) for JIRA API v3
   */
  _formatDescriptionADF(storyData) {
    const content = [];
    
    // 1. Add description/explanation paragraph first
    if (storyData.description) {
      content.push({
        type: 'paragraph',
        content: [
          {
            type: 'text',
            text: storyData.description
          }
        ]
      });
      
      // Add empty line after description
      content.push({
        type: 'paragraph',
        content: []
      });
    }
    
    // 2. Add "User Story :" heading
    if (storyData.userStory) {
      content.push({
        type: 'paragraph',
        content: [
          {
            type: 'text',
            text: 'User Story :',
            marks: [{ type: 'strong' }]
          }
        ]
      });
      
      // 3. Add user story text (As a... I want... So that...)
      content.push({
        type: 'paragraph',
        content: [
          {
            type: 'text',
            text: storyData.userStory
          }
        ]
      });
      
      // Add empty line after user story
      content.push({
        type: 'paragraph',
        content: []
      });
    }
    
    // 4. Add acceptance criteria as a table if scenarios present
    if (storyData.scenarios && storyData.scenarios.length > 0) {
      // Add "Acceptance Criteria :" heading
      content.push({
        type: 'paragraph',
        content: [
          {
            type: 'text',
            text: 'Acceptance Criteria :',
            marks: [{ type: 'strong' }]
          }
        ]
      });
      
      // Create table with Given, When, Then columns
      const tableRows = [];
      
      // Header row
      tableRows.push({
        type: 'tableRow',
        content: [
          {
            type: 'tableHeader',
            content: [
              {
                type: 'paragraph',
                content: [
                  {
                    type: 'text',
                    text: 'Given',
                    marks: [{ type: 'strong' }]
                  }
                ]
              }
            ]
          },
          {
            type: 'tableHeader',
            content: [
              {
                type: 'paragraph',
                content: [
                  {
                    type: 'text',
                    text: 'When',
                    marks: [{ type: 'strong' }]
                  }
                ]
              }
            ]
          },
          {
            type: 'tableHeader',
            content: [
              {
                type: 'paragraph',
                content: [
                  {
                    type: 'text',
                    text: 'Then',
                    marks: [{ type: 'strong' }]
                  }
                ]
              }
            ]
          }
        ]
      });
      
      // Data rows - one row per scenario
      storyData.scenarios.forEach(scenario => {
        // Format Given steps
        const givenSteps = scenario.given || [];
        const givenText = Array.isArray(givenSteps) 
          ? givenSteps.join('\n') 
          : givenSteps;
        
        // Format When steps
        const whenSteps = scenario.when || [];
        const whenText = Array.isArray(whenSteps) 
          ? whenSteps.join('\n') 
          : whenSteps;
        
        // Format Then steps
        const thenSteps = scenario.then || [];
        const thenText = Array.isArray(thenSteps) 
          ? thenSteps.join('\n') 
          : thenSteps;
        
        tableRows.push({
          type: 'tableRow',
          content: [
            {
              type: 'tableCell',
              content: [
                {
                  type: 'paragraph',
                  content: [
                    {
                      type: 'text',
                      text: givenText || '-'
                    }
                  ]
                }
              ]
            },
            {
              type: 'tableCell',
              content: [
                {
                  type: 'paragraph',
                  content: [
                    {
                      type: 'text',
                      text: whenText || '-'
                    }
                  ]
                }
              ]
            },
            {
              type: 'tableCell',
              content: [
                {
                  type: 'paragraph',
                  content: [
                    {
                      type: 'text',
                      text: thenText || '-'
                    }
                  ]
                }
              ]
            }
          ]
        });
      });
      
      // Add table to content
      content.push({
        type: 'table',
        content: tableRows
      });
    }
    
    return {
      type: 'doc',
      version: 1,
      content: content
    };
  }

  /**
   * Format scenario description for JIRA
   */
  _formatScenarioDescription(scenario) {
    let description = '';
    
    if (scenario.gherkin) {
      description = scenario.gherkin;
    } else {
      if (scenario.given) {
        const givenText = Array.isArray(scenario.given) ? scenario.given.join('\nAnd ') : scenario.given;
        description += `Given ${givenText}\n`;
      }
      if (scenario.when) {
        const whenText = Array.isArray(scenario.when) ? scenario.when.join('\nAnd ') : scenario.when;
        description += `When ${whenText}\n`;
      }
      if (scenario.then) {
        const thenText = Array.isArray(scenario.then) ? scenario.then.join('\nAnd ') : scenario.then;
        description += `Then ${thenText}\n`;
      }
    }
    
    return description;
  }

  /**
   * Format scenario description in Atlassian Document Format (ADF) for JIRA API v3
   */
  _formatScenarioDescriptionADF(scenario) {
    const content = [];
    
    if (scenario.gherkin) {
      // If gherkin is provided, format it as a code block
      content.push({
        type: 'codeBlock',
        attrs: {
          language: 'gherkin'
        },
        content: [
          {
            type: 'text',
            text: scenario.gherkin
          }
        ]
      });
    } else {
      // Format Given-When-Then structure
      if (scenario.given) {
        const givenText = Array.isArray(scenario.given) ? scenario.given.join('\nAnd ') : scenario.given;
        content.push({
          type: 'paragraph',
          content: [
            {
              type: 'text',
              text: 'Given ',
              marks: [{ type: 'strong' }]
            },
            {
              type: 'text',
              text: givenText
            }
          ]
        });
      }
      
      if (scenario.when) {
        const whenText = Array.isArray(scenario.when) ? scenario.when.join('\nAnd ') : scenario.when;
        content.push({
          type: 'paragraph',
          content: [
            {
              type: 'text',
              text: 'When ',
              marks: [{ type: 'strong' }]
            },
            {
              type: 'text',
              text: whenText
            }
          ]
        });
      }
      
      if (scenario.then) {
        const thenText = Array.isArray(scenario.then) ? scenario.then.join('\nAnd ') : scenario.then;
        content.push({
          type: 'paragraph',
          content: [
            {
              type: 'text',
              text: 'Then ',
              marks: [{ type: 'strong' }]
            },
            {
              type: 'text',
              text: thenText
            }
          ]
        });
      }
    }
    
    // Add scenario type if present
    if (scenario.type) {
      content.push({
        type: 'paragraph',
        content: [
          {
            type: 'text',
            text: 'Type: ',
            marks: [{ type: 'strong' }]
          },
          {
            type: 'text',
            text: scenario.type
          }
        ]
      });
    }
    
    return {
      type: 'doc',
      version: 1,
      content: content
    };
  }

  /**
   * Create complete JIRA story with scenarios and development tasks
   */
  async createCompleteStory(connectionId, userId, epicId, storyData, scenarios, developmentTasks) {
    try {
      cleanLogger.info('JIRA-SERVICE', 'Creating complete story', {
        connectionId,
        epicId,
        scenarioCount: scenarios?.length || 0,
        taskCount: developmentTasks?.length || 0
      });

      // Get connection details
      const connections = await this.getUserJiraConnections(userId);
      const connection = connections.find(conn => conn.id === connectionId);
      
      if (!connection) {
        return {
          success: false,
          error: 'Connection not found'
        };
      }

      // Prepare story data with scenarios and development tasks
      const completeStoryData = {
        ...storyData,
        scenarios: scenarios || [],
        developmentTasks: developmentTasks || []
      };

      // Create the user story
      const userStoryResult = await this.createUserStory(connectionId, epicId, completeStoryData);

      cleanLogger.info('JIRA-SERVICE', 'User story created', {
        userStoryId: userStoryResult.id,
        userStoryKey: userStoryResult.key
      });

      // Create subtasks for development tasks if any
      let subtasks = [];
      if (developmentTasks && developmentTasks.length > 0) {
        try {
          const subtasksResult = await this.createSubtasks(connectionId, userStoryResult.id, developmentTasks);
          subtasks = subtasksResult || [];
          
          cleanLogger.info('JIRA-SERVICE', 'Subtasks created', {
            count: subtasks.length
          });
        } catch (error) {
          cleanLogger.error('JIRA-SERVICE', 'Failed to create subtasks', {
            error: error.message
          });
          // Continue even if subtasks fail
        }
      }

      // Build JIRA URL for the created story
      const issueUrl = `${connection.jira_url}/browse/${userStoryResult.key}`;

      return {
        success: true,
        data: {
          userStory: {
            ...userStoryResult,
            url: issueUrl
          },
          subtasks: subtasks,
          scenarioCount: scenarios?.length || 0,
          taskCount: subtasks.length
        }
      };
    } catch (error) {
      cleanLogger.error('JIRA-SERVICE', 'Failed to create complete story', {
        error: error.message,
        connectionId,
        epicId
      });
      return {
        success: false,
        error: error.message
      };
    }
  }
}

export default new JiraService();
