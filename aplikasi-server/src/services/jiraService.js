import fetch from 'node-fetch';
import crypto from 'crypto';
import supabaseService from './supabaseService.js';
import jiraErrorHandlingService from './jiraErrorHandlingService.js';

/**
 * JIRA Service for backend integration
 * Handles JIRA OAuth 2.0 authentication, Epic management, and issue creation
 */
class JiraService {
  constructor() {
    this.encryptionKey = process.env.JIRA_ENCRYPTION_KEY || 'default-key-change-in-production';
    this.algorithm = 'aes-256-cbc';
  }

  // =====================================================
  // JIRA Connection Testing
  // =====================================================

  /**
   * Test JIRA connection with provided credentials
   * @param {Object} connectionData - JIRA connection data
   * @returns {Promise<Object>} Test result
   */
  async testJiraConnection(connectionData) {
    try {
      const { jiraUrl, email, apiToken, projectKey } = connectionData;

      // Create basic auth header
      const auth = Buffer.from(`${email}:${apiToken}`).toString('base64');
      
      // Test 1: Check JIRA instance accessibility
      const serverInfoResponse = await fetch(`${jiraUrl}/rest/api/3/serverInfo`, {
        method: 'GET',
        headers: {
          'Authorization': `Basic ${auth}`,
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      });

      if (!serverInfoResponse.ok) {
        if (serverInfoResponse.status === 401) {
          throw new Error('Invalid email or API token. Please check your credentials.');
        } else if (serverInfoResponse.status === 403) {
          throw new Error('Access denied. Please check your JIRA permissions.');
        } else if (serverInfoResponse.status === 404) {
          throw new Error('JIRA instance not found. Please check your JIRA URL.');
        } else {
          throw new Error(`JIRA connection failed: ${serverInfoResponse.status} ${serverInfoResponse.statusText}`);
        }
      }

      const serverInfo = await serverInfoResponse.json();

      // Test 2: Check project accessibility
      const projectResponse = await fetch(`${jiraUrl}/rest/api/3/project/${projectKey}`, {
        method: 'GET',
        headers: {
          'Authorization': `Basic ${auth}`,
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      });

      if (!projectResponse.ok) {
        if (projectResponse.status === 404) {
          throw new Error(`Project '${projectKey}' not found. Please check the project key.`);
        } else if (projectResponse.status === 403) {
          throw new Error(`No access to project '${projectKey}'. Please check your project permissions.`);
        } else {
          throw new Error(`Project access failed: ${projectResponse.status} ${projectResponse.statusText}`);
        }
      }

      const projectInfo = await projectResponse.json();

      // Test 3: Check create issue permissions
      const createMetaResponse = await fetch(`${jiraUrl}/rest/api/3/issue/createmeta?projectKeys=${projectKey}&expand=projects.issuetypes.fields`, {
        method: 'GET',
        headers: {
          'Authorization': `Basic ${auth}`,
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      });

      if (!createMetaResponse.ok) {
        throw new Error('Cannot check issue creation permissions. You may not have permission to create issues.');
      }

      const createMeta = await createMetaResponse.json();
      
      if (!createMeta.projects || createMeta.projects.length === 0) {
        throw new Error(`No permission to create issues in project '${projectKey}'.`);
      }

      // Success - return connection info
      return {
        success: true,
        data: {
          serverInfo: {
            version: serverInfo.version,
            serverTitle: serverInfo.serverTitle,
            baseUrl: serverInfo.baseUrl
          },
          projectInfo: {
            key: projectInfo.key,
            name: projectInfo.name,
            projectTypeKey: projectInfo.projectTypeKey
          },
          permissions: {
            canCreateIssues: true,
            availableIssueTypes: createMeta.projects[0].issuetypes.map(type => ({
              id: type.id,
              name: type.name,
              description: type.description
            }))
          }
        }
      };
    } catch (error) {
      console.error('JIRA connection test failed:', error);
      return {
        success: false,
        error: error.message || 'Failed to test JIRA connection'
      };
    }
  }

  // =====================================================
  // Encryption/Decryption for secure token storage
  // =====================================================

  /**
   * Encrypt sensitive data before storing in database
   * @param {string} text - Text to encrypt
   * @returns {string} Encrypted text with IV
   */
  encrypt(text) {
    try {
      const iv = crypto.randomBytes(16);
      const key = crypto.scryptSync(this.encryptionKey, 'salt', 32);
      const cipher = crypto.createCipheriv(this.algorithm, key, iv);
      let encrypted = cipher.update(text, 'utf8', 'hex');
      encrypted += cipher.final('hex');
      return iv.toString('hex') + ':' + encrypted;
    } catch (error) {
      console.error('Encryption error:', error);
      throw new Error('Failed to encrypt data');
    }
  }

  /**
   * Decrypt sensitive data retrieved from database
   * @param {string} encryptedText - Encrypted text with IV
   * @returns {string} Decrypted text
   */
  decrypt(encryptedText) {
    try {
      const parts = encryptedText.split(':');
      const iv = Buffer.from(parts[0], 'hex');
      const encrypted = parts[1];
      const key = crypto.scryptSync(this.encryptionKey, 'salt', 32);
      const decipher = crypto.createDecipheriv(this.algorithm, key, iv);
      let decrypted = decipher.update(encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      return decrypted;
    } catch (error) {
      console.error('Decryption error:', error);
      throw new Error('Failed to decrypt data');
    }
  }

  // =====================================================
  // JIRA OAuth 2.0 Authentication
  // =====================================================

  /**
   * Create JIRA connection with API Token
   * @param {string} userId - User ID
   * @param {Object} connectionData - JIRA connection data
   * @returns {Promise<Object>} Created connection
   */
  async createJiraConnection(userId, connectionData) {
    try {
      const { jiraUrl, email, apiToken, projectKey, issueType, customFields } = connectionData;

      // Test connection first
      const testResult = await this.testJiraConnection({
        jiraUrl,
        email,
        apiToken,
        projectKey
      });

      if (!testResult.success) {
        throw new Error(testResult.error || 'JIRA connection validation failed');
      }

      // Encrypt sensitive data - use access_token field for API token
      const encryptedApiToken = this.encrypt(`${email}:${apiToken}`);

      const connection = {
        user_id: userId,
        jira_url: jiraUrl,
        access_token: encryptedApiToken, // Store email:apiToken in access_token field
        project_key: projectKey,
        issue_type: issueType || 'Story',
        custom_fields: {
          ...customFields,
          auth_type: 'api_token',
          server_info: testResult.data.serverInfo,
          project_info: testResult.data.projectInfo
        },
        is_active: true
      };

      const result = await supabaseService.createJiraConnection(connection);
      
      // Return connection without sensitive data
      return {
        ...result,
        access_token: '[ENCRYPTED]',
        custom_fields: {
          auth_type: 'api_token',
          server_info: testResult.data.serverInfo,
          project_info: testResult.data.projectInfo
        }
      };
    } catch (error) {
      console.error('Error creating JIRA connection:', error);
      throw new Error(`Failed to create JIRA connection: ${error.message}`);
    }
  }

  /**
   * Validate JIRA connection by testing API access
   * @param {string} jiraUrl - JIRA instance URL
   * @param {string} accessToken - Access token
   * @returns {Promise<boolean>} Validation result
   */
  async validateJiraConnection(jiraUrl, credentials) {
    try {
      // Assume credentials is in email:apiToken format
      const auth = Buffer.from(credentials).toString('base64');
      
      const response = await fetch(`${jiraUrl}/rest/api/3/myself`, {
        method: 'GET',
        headers: {
          'Authorization': `Basic ${auth}`,
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      });

      return response.ok;
    } catch (error) {
      console.error('JIRA connection validation error:', error);
      return false;
    }
  }

  /**
   * Get user's JIRA connections
   * @param {string} userId - User ID
   * @returns {Promise<Array>} JIRA connections
   */
  async getUserJiraConnections(userId) {
    try {
      console.log(`🔍 Getting JIRA connections for user: ${userId}`);
      const connections = await supabaseService.getUserJiraConnections(userId);
      console.log(`📊 Found ${connections.length} JIRA connections`);
      
      // Enhance connections with missing project info
      const enhancedConnections = await Promise.all(
        connections.map(async (conn) => {
          try {
            // Check if connection already has project info
            if (conn.custom_fields?.project_info?.name) {
              return {
                ...conn,
                access_token: '[ENCRYPTED]',
                refresh_token: '[ENCRYPTED]'
              };
            }
            
            // If missing project info, try to fetch it from JIRA
            console.log(`🔧 Enhancing connection ${conn.id} with project info...`);
            
            // Decrypt credentials for API call
            const decryptedToken = this.decrypt(conn.access_token);
            const [email, apiToken] = decryptedToken.split(':');
            
            // Test connection and get project info
            const testResult = await this.testJiraConnection({
              jiraUrl: conn.jira_url,
              email,
              apiToken,
              projectKey: conn.project_key
            });
            
            if (testResult.success && testResult.data.projectInfo) {
              // Update connection with project info
              const updatedCustomFields = {
                ...conn.custom_fields,
                project_info: testResult.data.projectInfo
              };
              
              // Update in database
              await supabaseService.updateJiraConnection(conn.id, userId, {
                custom_fields: updatedCustomFields
              });
              
              console.log(`✅ Enhanced connection ${conn.id} with project: ${testResult.data.projectInfo.name}`);
              
              return {
                ...conn,
                custom_fields: updatedCustomFields,
                access_token: '[ENCRYPTED]',
                refresh_token: '[ENCRYPTED]'
              };
            }
          } catch (enhanceError) {
            console.warn(`⚠️ Could not enhance connection ${conn.id}:`, enhanceError.message);
          }
          
          // Return original connection if enhancement fails
          return {
            ...conn,
            access_token: '[ENCRYPTED]',
            refresh_token: '[ENCRYPTED]'
          };
        })
      );
      
      return enhancedConnections;
    } catch (error) {
      console.error('Error getting JIRA connections:', error);
      throw new Error(`Failed to get JIRA connections: ${error.message}`);
    }
  }

  /**
   * Delete JIRA connection
   * @param {string} userId - User ID
   * @param {string} connectionId - Connection ID to delete
   * @returns {Promise<Object>} Delete result
   */
  async deleteJiraConnection(userId, connectionId) {
    try {
      console.log(`🗑️ [JIRA-SERVICE] Deleting connection ${connectionId} for user ${userId}`);

      // First, verify the connection exists and belongs to the user
      const connections = await supabaseService.getUserJiraConnections(userId);
      const connectionToDelete = connections.find(conn => conn.id === connectionId);

      if (!connectionToDelete) {
        console.error(`❌ [JIRA-SERVICE] Connection ${connectionId} not found for user ${userId}`);
        return {
          success: false,
          error: 'Connection not found or access denied'
        };
      }

      console.log(`🔍 [JIRA-SERVICE] Found connection to delete: ${connectionToDelete.project_key}`);

      // Delete the connection from database
      const deleteResult = await supabaseService.deleteJiraConnection(connectionId, userId);

      if (deleteResult) {
        console.log(`✅ [JIRA-SERVICE] Successfully deleted connection ${connectionId}`);
        
        // Clean up any related Epic contexts for this connection
        try {
          // Note: This would need to be implemented if we store Epic contexts per connection
          console.log(`🧹 [JIRA-SERVICE] Cleaning up Epic contexts for deleted connection`);
        } catch (cleanupError) {
          console.warn(`⚠️ [JIRA-SERVICE] Could not clean up Epic contexts:`, cleanupError.message);
        }

        return {
          success: true,
          message: `Connection to ${connectionToDelete.project_key} deleted successfully`
        };
      } else {
        console.error(`❌ [JIRA-SERVICE] Failed to delete connection ${connectionId} from database`);
        return {
          success: false,
          error: 'Failed to delete connection from database'
        };
      }
    } catch (error) {
      console.error('Error deleting JIRA connection:', error);
      return {
        success: false,
        error: error.message || 'Failed to delete JIRA connection'
      };
    }
  }

  // =====================================================
  // Epic Management
  // =====================================================

  /**
   * Get available Epics from JIRA project - REAL JIRA API FOCUS
   * @param {string} connectionId - JIRA connection ID
   * @param {string} projectKey - JIRA project key
   * @param {string} userId - User ID
   * @returns {Promise<Array>} Available Epics
   */
  /**
   * Get available Epics from JIRA project - ULTRA SIMPLE VERSION
   * @param {string} connectionId - JIRA connection ID
   * @param {string} projectKey - JIRA project key
   * @param {string} userId - User ID
   * @returns {Promise<Array>} Available Epics
   */
  async getProjectEpics(connectionId, projectKey, userId) {
    console.log(`🔍 [JIRA-ULTRA] === STARTING EPIC FETCH ===`);
    console.log(`🔍 [JIRA-ULTRA] User: ${userId}`);
    console.log(`🔍 [JIRA-ULTRA] Connection: ${connectionId}`);
    console.log(`🔍 [JIRA-ULTRA] Project: ${projectKey}`);
    
    try {
      // Step 1: Get connections
      console.log(`📊 [JIRA-ULTRA] Step 1: Getting connections...`);
      const connections = await supabaseService.getUserJiraConnections(userId);
      console.log(`📊 [JIRA-ULTRA] Found ${connections.length} connections`);
      
      if (connections.length === 0) {
        console.error(`❌ [JIRA-ULTRA] No connections - returning empty array`);
        return [];
      }

      // Step 2: Find specific connection
      console.log(`📊 [JIRA-ULTRA] Step 2: Finding connection ${connectionId}...`);
      const connection = connections.find(conn => conn.id === connectionId);
      if (!connection) {
        console.error(`❌ [JIRA-ULTRA] Connection not found - available IDs:`, connections.map(c => c.id));
        return [];
      }

      console.log(`✅ [JIRA-ULTRA] Found connection:`, {
        id: connection.id,
        url: connection.jira_url,
        project: connection.project_key
      });

      // Step 3: Decrypt credentials
      console.log(`📊 [JIRA-ULTRA] Step 3: Decrypting credentials...`);
      let credentials;
      try {
        credentials = this.decrypt(connection.access_token);
        const [email] = credentials.split(':');
        console.log(`✅ [JIRA-ULTRA] Credentials OK for email: ${email}`);
      } catch (error) {
        console.error(`❌ [JIRA-ULTRA] Decrypt failed:`, error.message);
        return [];
      }
      
      // Step 4: Prepare API call
      const auth = Buffer.from(credentials).toString('base64');
      // Use project key from URL parameter first, then connection default
      const targetProject = projectKey || connection.project_key || 'SCRUM';
      // Filter hanya Epic issue type
      const jql = `project = "${targetProject}" AND issuetype = "Epic"`;
      const searchUrl = `${connection.jira_url}/rest/api/3/search/jql`;
      
      console.log(`📊 [JIRA-ULTRA] Step 4: API call preparation`);
      console.log(`🔍 [JIRA-ULTRA] Target project: ${targetProject}`);
      console.log(`🔍 [JIRA-ULTRA] Connection project_key: ${connection.project_key}`);
      console.log(`🔍 [JIRA-ULTRA] Provided projectKey: ${projectKey}`);
      console.log(`🔍 [JIRA-ULTRA] Selected connection ID: ${connection.id}`);
      console.log(`🔍 [JIRA-ULTRA] JQL: ${jql}`);
      console.log(`🌐 [JIRA-ULTRA] URL: ${searchUrl}`);
      console.log(`🎯 [JIRA-ULTRA] PROJECT SELECTION LOGIC:`);
      console.log(`   - URL projectKey parameter: ${projectKey}`);
      console.log(`   - Connection default project: ${connection.project_key}`);
      console.log(`   - Final target project: ${targetProject}`);
      console.log(`   - Logic: projectKey || connection.project_key || 'SCRUM'`);
      
      // Step 5: Make API call
      console.log(`📊 [JIRA-ULTRA] Step 5: Making API call...`);
      const response = await fetch(searchUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${auth}`,
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          jql: jql,
          maxResults: 50,
          fields: ['key', 'summary', 'status', 'assignee', 'created', 'updated', 'issuetype']
        })
      });

      console.log(`📊 [JIRA-ULTRA] API Response: ${response.status} ${response.statusText}`);

      // Step 6: Handle response
      if (!response.ok) {
        console.error(`❌ [JIRA-ULTRA] API call failed with status: ${response.status}`);
        const errorText = await response.text();
        console.error(`❌ [JIRA-ULTRA] Error response:`, errorText);
        
        // Try to parse and log error details
        try {
          const errorData = JSON.parse(errorText);
          console.error(`❌ [JIRA-ULTRA] Parsed error:`, errorData);
          if (errorData.errorMessages) {
            console.error(`❌ [JIRA-ULTRA] Error messages:`, errorData.errorMessages);
          }
        } catch (parseError) {
          console.error(`❌ [JIRA-ULTRA] Could not parse error response`);
        }
        
        return [];
      }

      // Step 7: Process successful response
      console.log(`📊 [JIRA-ULTRA] Step 7: Processing response...`);
      const data = await response.json();
      const issues = data.issues || [];
      
      console.log(`✅ [JIRA-ULTRA] SUCCESS! Response data:`, {
        total: data.total,
        startAt: data.startAt,
        maxResults: data.maxResults,
        issuesFound: issues.length
      });
      
      if (issues.length > 0) {
        console.log(`📋 [JIRA-ULTRA] Issues found:`);
        issues.forEach((issue, index) => {
          console.log(`📋 [JIRA-ULTRA] ${index + 1}. ${issue.key}: ${issue.fields?.summary} (${issue.fields?.issuetype?.name})`);
        });
        
        // Transform to Epic format
        const epics = issues.map(issue => ({
          id: issue.id,
          key: issue.key,
          name: issue.fields?.summary || issue.key,
          summary: issue.fields?.summary || 'No summary',
          status: issue.fields?.status?.name || 'Unknown',
          assignee: issue.fields?.assignee?.displayName || 'Unassigned',
          created: issue.fields?.created,
          updated: issue.fields?.updated,
          issueType: issue.fields?.issuetype?.name || 'Unknown'
        }));
        
        console.log(`✅ [JIRA-ULTRA] FINAL SUCCESS! Returning ${epics.length} transformed issues`);
        return epics;
      } else {
        console.warn(`⚠️ [JIRA-ULTRA] No Epic issues found in project ${targetProject}`);
        console.warn(`⚠️ [JIRA-ULTRA] Project exists but has no Epic issues`);
        console.warn(`⚠️ [JIRA-ULTRA] User should create Epic issues in JIRA first`);
        
        // Return empty array - client will handle the messaging
        return [];
      }

    } catch (error) {
      console.error('❌ [JIRA-ULTRA] CRITICAL ERROR:', error.message);
      console.error('❌ [JIRA-ULTRA] Error stack:', error.stack);
      return [];
    }
  }

  /**
   * Transform JIRA issues to Epic format
   * @param {Array} issues - JIRA issues
   * @returns {Array} Transformed Epics
   */
  transformJiraIssuesToEpics(issues) {
    return issues.map(issue => ({
      id: issue.id,
      key: issue.key,
      name: issue.fields.summary,
      summary: issue.fields.description || issue.fields.summary,
      status: issue.fields.status?.name || 'Unknown',
      assignee: issue.fields.assignee?.displayName || 'Unassigned',
      created: issue.fields.created,
      updated: issue.fields.updated,
      issueType: issue.fields.issuetype?.name || 'Unknown'
    }));
  }

  /**
   * Validate Epic access and permissions
   * @param {string} connectionId - JIRA connection ID
   * @param {string} epicId - Epic ID
   * @param {string} userId - User ID
   * @returns {Promise<Object>} Validation result
   */
  async validateEpicAccess(connectionId, epicId, userId) {
    try {
      // Get JIRA connection
      const connections = await supabaseService.getUserJiraConnections(userId);
      const connection = connections.find(conn => conn.id === connectionId);
      
      if (!connection) {
        throw new Error('JIRA connection not found');
      }

      // Decrypt access token (contains email:apiToken)
      const credentials = this.decrypt(connection.access_token);
      const auth = Buffer.from(credentials).toString('base64');

      // Check if Epic exists and user has access
      const response = await fetch(`${connection.jira_url}/rest/api/3/issue/${epicId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Basic ${auth}`,
          'Accept': 'application/json'
        }
      });

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('Epic not found or access denied');
        }
        throw new Error(`JIRA API error: ${response.status}`);
      }

      const epic = await response.json();
      
      // Check if it's actually an Epic
      if (epic.fields.issuetype?.name !== 'Epic') {
        throw new Error('Issue is not an Epic');
      }

      return {
        hasAccess: true,
        epic: {
          id: epic.id,
          key: epic.key,
          name: epic.fields.summary,
          status: epic.fields.status?.name
        }
      };
    } catch (error) {
      console.error('Error validating Epic access:', error);
      throw new Error(`Epic validation failed: ${error.message}`);
    }
  }

  // =====================================================
  // User Story and Subtask Creation
  // =====================================================

  /**
   * Create user story from Gherkin scenario
   * @param {string} connectionId - JIRA connection ID
   * @param {string} epicId - Epic ID to link to
   * @param {Object} storyData - User story data
   * @param {string} userId - User ID
   * @returns {Promise<Object>} Created user story
   */
  async createUserStory(connectionId, epicId, storyData, userId) {
    return await this.withRetry(async () => {
      // Get JIRA connection
      const connections = await supabaseService.getUserJiraConnections(userId);
      const connection = connections.find(conn => conn.id === connectionId);
      
      if (!connection) {
        throw new Error('JIRA connection not found');
      }

      // Decrypt access token (contains email:apiToken)
      const credentials = this.decrypt(connection.access_token);
      const auth = Buffer.from(credentials).toString('base64');

      // Prepare user story data
      const issueData = {
        fields: {
          project: {
            key: connection.project_key
          },
          summary: storyData.title,
          description: this.formatGherkinForJira(storyData),
          issuetype: {
            name: connection.issue_type || 'Story'
          }
        }
      };

      // Add parent Epic if provided (skip if working without Epic)
      if (epicId && epicId !== null) {
        issueData.fields.parent = {
          id: epicId
        };
      }

      // Add custom fields if they exist and are valid
      if (connection.custom_fields && typeof connection.custom_fields === 'object') {
        // Only add non-system fields from custom_fields
        const validCustomFields = {};
        for (const [key, value] of Object.entries(connection.custom_fields)) {
          // Skip system fields and metadata
          if (!['auth_type', 'server_info', 'project_info'].includes(key)) {
            validCustomFields[key] = value;
          }
        }
        Object.assign(issueData.fields, validCustomFields);
      }

      console.log('🔍 Debug JIRA issue data:', JSON.stringify(issueData, null, 2));

      // Create user story in JIRA
      const response = await fetch(`${connection.jira_url}/rest/api/3/issue`, {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${auth}`,
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(issueData)
      });

      console.log('🔍 JIRA API Response Status:', response.status);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('🔍 JIRA API Error Response:', errorData);
        
        let errorMessage = `JIRA API error: ${response.status}`;
        if (errorData.errorMessages && errorData.errorMessages.length > 0) {
          errorMessage += ` - ${errorData.errorMessages.join(', ')}`;
        }
        if (errorData.errors) {
          const fieldErrors = Object.entries(errorData.errors).map(([field, error]) => `${field}: ${error}`);
          if (fieldErrors.length > 0) {
            errorMessage += ` - Field errors: ${fieldErrors.join(', ')}`;
          }
        }
        
        const error = new Error(errorMessage);
        error.status = response.status;
        error.statusCode = response.status;
        error.jiraError = errorData;
        throw error;
      }

      const result = await response.json();
      
      return {
        id: result.id,
        key: result.key,
        url: `${connection.jira_url}/browse/${result.key}`
      };
    }, {
      operation: 'createUserStory',
      resource: `epic/${epicId}`,
      connectionId,
      userId,
      storyData
    });
  }

  /**
   * Get available issue types for a project
   * @param {Object} connection - JIRA connection
   * @param {string} auth - Base64 encoded auth
   * @returns {Promise<Array>} Available issue types
   */
  async getProjectIssueTypes(connection, auth) {
    try {
      const response = await fetch(`${connection.jira_url}/rest/api/3/project/${connection.project_key}`, {
        method: 'GET',
        headers: {
          'Authorization': `Basic ${auth}`,
          'Accept': 'application/json'
        }
      });

      if (response.ok) {
        const projectData = await response.json();
        return projectData.issueTypes || [];
      }
    } catch (error) {
      console.warn('Could not fetch project issue types:', error.message);
    }
    return [];
  }

  /**
   * Create subtasks from Gherkin scenarios with enhanced error handling
   * @param {string} connectionId - JIRA connection ID
   * @param {string} userStoryId - Parent user story ID
   * @param {Array} scenarios - Gherkin scenarios
   * @param {string} userId - User ID
   * @returns {Promise<Array>} Created subtasks
   */
  async createSubtasks(connectionId, userStoryId, scenarios, userId) {
    // Get JIRA connection first
    const connections = await supabaseService.getUserJiraConnections(userId);
    const connection = connections.find(conn => conn.id === connectionId);
    
    if (!connection) {
      throw new Error('JIRA connection not found');
    }

    // Decrypt access token (contains email:apiToken)
    const credentials = this.decrypt(connection.access_token);
    const auth = Buffer.from(credentials).toString('base64');

    // Get available issue types with fallback
    let issueTypes = [];
    try {
      issueTypes = await this.getProjectIssueTypes(connection, auth);
      console.log('🔍 Available issue types:', issueTypes.map(t => t.name));
    } catch (error) {
      console.warn('Could not fetch issue types, using fallback');
      issueTypes = [
        { name: 'Sub-task', subtask: true },
        { name: 'Subtask', subtask: true },
        { name: 'Task', subtask: false }
      ];
    }
    
    // Find subtask issue type with multiple fallbacks
    let subtaskIssueType = issueTypes.find(type => 
      type.subtask === true || 
      type.name.toLowerCase().includes('sub')
    );
    
    if (!subtaskIssueType) {
      // Try common subtask names
      const fallbackNames = ['Sub-task', 'Subtask', 'Task', 'Story'];
      for (const name of fallbackNames) {
        subtaskIssueType = issueTypes.find(type => type.name === name);
        if (subtaskIssueType) break;
      }
    }
    
    if (!subtaskIssueType) {
      console.warn('No suitable issue type found, using Task as final fallback');
      subtaskIssueType = { name: 'Task', subtask: false };
    }
    
    console.log('🔍 Using subtask issue type:', subtaskIssueType.name);

    const subtasks = [];
    const errors = [];
    const maxRetries = 2;

    for (let i = 0; i < scenarios.length; i++) {
      const scenario = scenarios[i];
      let created = false;
      
      // Try multiple approaches for each subtask
      const approaches = [
        // Approach 1: Full ADF format with parent
        () => this.createSubtaskWithApproach(connection, auth, userStoryId, scenario, i + 1, subtaskIssueType, 'full'),
        // Approach 2: Simplified ADF format with parent
        () => this.createSubtaskWithApproach(connection, auth, userStoryId, scenario, i + 1, subtaskIssueType, 'simple'),
        // Approach 3: Plain text without parent (as regular task)
        () => this.createSubtaskWithApproach(connection, auth, null, scenario, i + 1, { name: 'Task' }, 'plain')
      ];

      for (let approachIndex = 0; approachIndex < approaches.length && !created; approachIndex++) {
        try {
          console.log(`🔄 Trying approach ${approachIndex + 1} for subtask ${i + 1}`);
          
          const result = await this.withRetry(approaches[approachIndex], {
            operation: 'createSubtask',
            resource: `userStory/${userStoryId}/subtask`,
            connectionId,
            userId,
            scenarioIndex: i + 1,
            scenarioTitle: scenario.title,
            approach: approachIndex + 1
          });

          subtasks.push({
            id: result.id,
            key: result.key,
            title: scenario.title,
            url: `${connection.jira_url}/browse/${result.key}`,
            scenario_index: i + 1
          });

          console.log(`✅ Created subtask ${i + 1}/${scenarios.length}: ${result.key} (approach ${approachIndex + 1})`);
          created = true;

        } catch (error) {
          console.error(`❌ Approach ${approachIndex + 1} failed for subtask ${i + 1}:`, error.message);
          
          if (approachIndex === approaches.length - 1) {
            // All approaches failed
            errors.push({
              scenario_index: i,
              scenario_title: scenario.title,
              error: error.message
            });
          }
        }
      }
    }

    console.log(`📊 Subtask creation complete: ${subtasks.length} created, ${errors.length} failed`);

    // Return whatever we managed to create
    return subtasks;
  }

  /**
   * Create subtask with specific approach
   * @param {Object} connection - JIRA connection
   * @param {string} auth - Authorization header
   * @param {string} userStoryId - Parent user story ID (null for standalone)
   * @param {Object} scenario - Scenario data
   * @param {number} scenarioIndex - Scenario index
   * @param {Object} issueType - Issue type to use
   * @param {string} format - Format type ('full', 'simple', 'plain')
   * @returns {Promise<Object>} Created issue
   */
  async createSubtaskWithApproach(connection, auth, userStoryId, scenario, scenarioIndex, issueType, format) {
    const subtaskData = {
      fields: {
        project: {
          key: connection.project_key
        },
        summary: `Scenario ${scenarioIndex}: ${scenario.title}`,
        issuetype: {
          name: issueType.name
        }
      }
    };

    // Add description based on format
    switch (format) {
      case 'full':
        subtaskData.fields.description = this.formatScenarioForJira(scenario, scenarioIndex);
        break;
      case 'simple':
        subtaskData.fields.description = this.formatScenarioForJiraSimple(scenario, scenarioIndex);
        break;
      case 'plain':
        subtaskData.fields.description = this.formatScenarioForJiraPlainText(scenario, scenarioIndex);
        break;
    }

    // Add parent only if provided and issue type supports it
    if (userStoryId && (issueType.subtask === true || issueType.name.toLowerCase().includes('sub'))) {
      subtaskData.fields.parent = {
        id: userStoryId
      };
    }

    console.log(`🔍 Debug subtask data (${format}):`, JSON.stringify(subtaskData, null, 2));

    const response = await fetch(`${connection.jira_url}/rest/api/3/issue`, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(subtaskData)
    });

    console.log(`🔍 Subtask API Response Status (${format}):`, response.status);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error(`🔍 Subtask API Error Response (${format}):`, errorData);
      
      let errorMessage = `JIRA API error: ${response.status}`;
      if (errorData.errorMessages && errorData.errorMessages.length > 0) {
        errorMessage += ` - ${errorData.errorMessages.join(', ')}`;
      }
      if (errorData.errors) {
        const fieldErrors = Object.entries(errorData.errors).map(([field, error]) => `${field}: ${error}`);
        if (fieldErrors.length > 0) {
          errorMessage += ` - Field errors: ${fieldErrors.join(', ')}`;
        }
      }
      
      const error = new Error(errorMessage);
      error.status = response.status;
      error.statusCode = response.status;
      error.jiraError = errorData;
      throw error;
    }

    return await response.json();
  }

  /**
   * Format scenario with simple ADF (fallback)
   * @param {Object} scenario - Scenario data
   * @param {number} scenarioIndex - Scenario index
   * @returns {Object} Simple ADF document
   */
  formatScenarioForJiraSimple(scenario, scenarioIndex = 1) {
    const content = [];

    // Simple text content
    let fullText = `Implementation Task for Scenario ${scenarioIndex}\n\n`;
    fullText += `Scenario: ${scenario.title || `Scenario ${scenarioIndex}`}\n\n`;
    
    if (scenario.given && scenario.given.length > 0) {
      fullText += `Given: ${scenario.given.join(', ')}\n`;
    }
    
    if (scenario.when && scenario.when.length > 0) {
      fullText += `When: ${scenario.when.join(', ')}\n`;
    }
    
    if (scenario.then && scenario.then.length > 0) {
      fullText += `Then: ${scenario.then.join(', ')}\n`;
    }

    content.push({
      "type": "paragraph",
      "content": [
        {
          "type": "text",
          "text": fullText
        }
      ]
    });

    return {
      "version": 1,
      "type": "doc",
      "content": content
    };
  }

  // =====================================================
  // Utility Methods
  // =====================================================

  /**
   * Format Gherkin scenario data for JIRA description using plain text
   * @param {Object} storyData - Story data with Gherkin scenarios
   * @returns {string} Formatted description in plain text
   */
  formatGherkinForJiraPlainText(storyData) {
    console.log('🔍 Debug formatGherkinForJiraPlainText storyData:', JSON.stringify(storyData, null, 2));
    
    let description = `User Story:\n${storyData.userStory || 'User story not provided'}\n\n`;
    
    if (storyData.description) {
      description += `Description:\n${storyData.description}\n\n`;
    }

    description += 'Acceptance Criteria (Gherkin):\n\n';
    
    if (storyData.scenarios && storyData.scenarios.length > 0) {
      storyData.scenarios.forEach((scenario, index) => {
        console.log(`🔍 Debug scenario ${index + 1}:`, JSON.stringify(scenario, null, 2));
        description += `Scenario ${index + 1}: ${scenario.title || `Scenario ${index + 1}`}\n\n`;
        
        let gherkinText = `Feature: ${storyData.featureName || 'Feature'}\n\n`;
        gherkinText += `  Scenario: ${scenario.title || `Scenario ${index + 1}`}\n`;
        
        if (scenario.given && scenario.given.length > 0) {
          scenario.given.forEach(step => {
            gherkinText += `    Given ${step}\n`;
          });
        }
        
        if (scenario.when && scenario.when.length > 0) {
          scenario.when.forEach(step => {
            gherkinText += `    When ${step}\n`;
          });
        }
        
        if (scenario.then && scenario.then.length > 0) {
          scenario.then.forEach(step => {
            gherkinText += `    Then ${step}\n`;
          });
        }
        
        description += gherkinText + '\n\n';
      });
    } else {
      description += 'No scenarios provided\n\n';
    }

    return description;
  }

  /**
   * Format Gherkin scenario data for JIRA description using Atlassian Document Format with table
   * @param {Object} storyData - Story data with Gherkin scenarios
   * @returns {Object} Formatted description in ADF format
   */
  formatGherkinForJira(storyData) {
    console.log('🔍 Debug formatGherkinForJira storyData:', JSON.stringify(storyData, null, 2));
    
    const content = [];

    // User Story paragraph
    content.push({
      "type": "paragraph",
      "content": [
        {
          "type": "text",
          "text": (storyData.userStory || "User story not provided")
        }
      ]
    });

    // Description paragraph if available
    if (storyData.description) {
      content.push({
        "type": "paragraph",
        "content": [
          {
            "type": "text",
            "text": storyData.description
          }
        ]
      });
    }

    // Acceptance Criteria heading
    content.push({
      "type": "heading",
      "attrs": { "level": 3 },
      "content": [
        {
          "type": "text",
          "text": "Acceptance Criteria :"
        }
      ]
    });

    // Create table for scenarios if available
    if (storyData.scenarios && storyData.scenarios.length > 0) {
      // Create table rows
      const tableRows = [];
      
      // Header row
      tableRows.push({
        "type": "tableRow",
        "content": [
          {
            "type": "tableHeader",
            "attrs": {},
            "content": [
              {
                "type": "paragraph",
                "content": [
                  {
                    "type": "text",
                    "text": "Given",
                    "marks": [{ "type": "strong" }]
                  }
                ]
              }
            ]
          },
          {
            "type": "tableHeader",
            "attrs": {},
            "content": [
              {
                "type": "paragraph",
                "content": [
                  {
                    "type": "text",
                    "text": "When",
                    "marks": [{ "type": "strong" }]
                  }
                ]
              }
            ]
          },
          {
            "type": "tableHeader",
            "attrs": {},
            "content": [
              {
                "type": "paragraph",
                "content": [
                  {
                    "type": "text",
                    "text": "Then",
                    "marks": [{ "type": "strong" }]
                  }
                ]
              }
            ]
          }
        ]
      });

      // Data rows for each scenario
      storyData.scenarios.forEach((scenario, index) => {
        console.log(`🔍 Debug scenario ${index + 1}:`, JSON.stringify(scenario, null, 2));
        
        // Combine all Given, When, Then steps into single cells
        const givenText = scenario.given && scenario.given.length > 0 
          ? scenario.given.join(', ') 
          : '';
        const whenText = scenario.when && scenario.when.length > 0 
          ? scenario.when.join(', ') 
          : '';
        const thenText = scenario.then && scenario.then.length > 0 
          ? scenario.then.join(', ') 
          : '';

        tableRows.push({
          "type": "tableRow",
          "content": [
            {
              "type": "tableCell",
              "attrs": {},
              "content": [
                {
                  "type": "paragraph",
                  "content": [
                    {
                      "type": "text",
                      "text": givenText
                    }
                  ]
                }
              ]
            },
            {
              "type": "tableCell",
              "attrs": {},
              "content": [
                {
                  "type": "paragraph",
                  "content": [
                    {
                      "type": "text",
                      "text": whenText
                    }
                  ]
                }
              ]
            },
            {
              "type": "tableCell",
              "attrs": {},
              "content": [
                {
                  "type": "paragraph",
                  "content": [
                    {
                      "type": "text",
                      "text": thenText
                    }
                  ]
                }
              ]
            }
          ]
        });
      });

      // Add the table to content
      content.push({
        "type": "table",
        "attrs": {
          "isNumberColumnEnabled": false,
          "layout": "default"
        },
        "content": tableRows
      });
    } else {
      content.push({
        "type": "paragraph",
        "content": [
          {
            "type": "text",
            "text": "No scenarios provided"
          }
        ]
      });
    }

    const adfDocument = {
      "version": 1,
      "type": "doc",
      "content": content
    };

    console.log('🔍 Generated ADF document with table:', JSON.stringify(adfDocument, null, 2));
    return adfDocument;
  }

  /**
   * Format individual scenario for subtask description using plain text
   * @param {Object} scenario - Individual Gherkin scenario
   * @param {number} scenarioIndex - Scenario index for numbering
   * @returns {string} Formatted description in plain text
   */
  formatScenarioForJiraPlainText(scenario, scenarioIndex = 1) {
    let description = `Implementation Task for Scenario ${scenarioIndex}\n\n`;
    description += `Scenario: ${scenario.title || `Scenario ${scenarioIndex}`}\n\n`;
    description += 'Acceptance Criteria:\n\n';
    
    let gherkinText = `Scenario: ${scenario.title || `Scenario ${scenarioIndex}`}\n`;
    
    if (scenario.given && scenario.given.length > 0) {
      scenario.given.forEach(step => {
        gherkinText += `  Given ${step}\n`;
      });
    }
    
    if (scenario.when && scenario.when.length > 0) {
      scenario.when.forEach(step => {
        gherkinText += `  When ${step}\n`;
      });
    }
    
    if (scenario.then && scenario.then.length > 0) {
      scenario.then.forEach(step => {
        gherkinText += `  Then ${step}\n`;
      });
    }

    description += gherkinText + '\n\n';
    
    // Add implementation checklist
    description += 'Implementation Checklist:\n';
    description += '- Implement the functionality described in the scenario\n';
    description += '- Write unit tests for the implementation\n';
    description += '- Ensure all acceptance criteria are met\n';
    description += '- Test the scenario manually\n';
    description += '- Update documentation if needed\n\n';
    
    // Add technical notes based on scenario content
    const technicalNotes = this.generateTechnicalNotes(scenario);
    if (technicalNotes.length > 0) {
      description += 'Technical Notes:\n';
      technicalNotes.forEach(note => {
        description += `- ${note}\n`;
      });
      description += '\n';
    }

    return description;
  }

  /**
   * Format individual scenario for subtask description using Atlassian Document Format
   * @param {Object} scenario - Individual Gherkin scenario
   * @param {number} scenarioIndex - Scenario index for numbering
   * @returns {Object} Formatted description in ADF format
   */
  formatScenarioForJira(scenario, scenarioIndex = 1) {
    const content = [];

    // Task description
    content.push({
      "type": "paragraph",
      "content": [
        {
          "type": "text",
          "text": `Implementation Task for Scenario ${scenarioIndex}`,
          "marks": [{ "type": "strong" }]
        }
      ]
    });

    // Scenario name
    content.push({
      "type": "paragraph",
      "content": [
        {
          "type": "text",
          "text": `Scenario: ${scenario.title || `Scenario ${scenarioIndex}`}`
        }
      ]
    });

    // Acceptance Criteria heading
    content.push({
      "type": "heading",
      "attrs": { "level": 4 },
      "content": [
        {
          "type": "text",
          "text": "Acceptance Criteria:"
        }
      ]
    });

    // Create simple table for this single scenario
    const tableRows = [];
    
    // Header row
    tableRows.push({
      "type": "tableRow",
      "content": [
        {
          "type": "tableHeader",
          "attrs": {},
          "content": [
            {
              "type": "paragraph",
              "content": [
                {
                  "type": "text",
                  "text": "Given",
                  "marks": [{ "type": "strong" }]
                }
              ]
            }
          ]
        },
        {
          "type": "tableHeader",
          "attrs": {},
          "content": [
            {
              "type": "paragraph",
              "content": [
                {
                  "type": "text",
                  "text": "When",
                  "marks": [{ "type": "strong" }]
                }
              ]
            }
          ]
        },
        {
          "type": "tableHeader",
          "attrs": {},
          "content": [
            {
              "type": "paragraph",
              "content": [
                {
                  "type": "text",
                  "text": "Then",
                  "marks": [{ "type": "strong" }]
                }
              ]
            }
          ]
        }
      ]
    });

    // Data row for this scenario
    const givenText = scenario.given && scenario.given.length > 0 
      ? scenario.given.join(', ') 
      : '';
    const whenText = scenario.when && scenario.when.length > 0 
      ? scenario.when.join(', ') 
      : '';
    const thenText = scenario.then && scenario.then.length > 0 
      ? scenario.then.join(', ') 
      : '';

    tableRows.push({
      "type": "tableRow",
      "content": [
        {
          "type": "tableCell",
          "attrs": {},
          "content": [
            {
              "type": "paragraph",
              "content": [
                {
                  "type": "text",
                  "text": givenText
                }
              ]
            }
          ]
        },
        {
          "type": "tableCell",
          "attrs": {},
          "content": [
            {
              "type": "paragraph",
              "content": [
                {
                  "type": "text",
                  "text": whenText
                }
              ]
            }
          ]
        },
        {
          "type": "tableCell",
          "attrs": {},
          "content": [
            {
              "type": "paragraph",
              "content": [
                {
                  "type": "text",
                  "text": thenText
                }
              ]
            }
          ]
        }
      ]
    });

    // Add the table
    content.push({
      "type": "table",
      "attrs": {
        "isNumberColumnEnabled": false,
        "layout": "default"
      },
      "content": tableRows
    });

    // Implementation Checklist
    content.push({
      "type": "heading",
      "attrs": { "level": 4 },
      "content": [
        {
          "type": "text",
          "text": "Implementation Checklist:"
        }
      ]
    });

    const checklistItems = [
      "Implement the functionality described in the scenario",
      "Write unit tests for the implementation", 
      "Ensure all acceptance criteria are met",
      "Test the scenario manually",
      "Update documentation if needed"
    ];

    // Create bullet list for checklist
    const listItems = checklistItems.map(item => ({
      "type": "listItem",
      "content": [
        {
          "type": "paragraph",
          "content": [
            {
              "type": "text",
              "text": item
            }
          ]
        }
      ]
    }));

    content.push({
      "type": "bulletList",
      "content": listItems
    });

    const adfDocument = {
      "version": 1,
      "type": "doc",
      "content": content
    };

    console.log('🔍 Generated subtask ADF document with table:', JSON.stringify(adfDocument, null, 2));
    return adfDocument;
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

    return notes;
  }

  /**
   * Handle JIRA API errors with comprehensive error handling and retry logic
   * @param {Function} apiCall - API call function
   * @param {Object} context - Context for error handling
   * @returns {Promise<any>} API call result
   */
  async withRetry(apiCall, context = {}) {
    let lastError;
    let attemptCount = 0;
    
    while (attemptCount < jiraErrorHandlingService.retryConfig.maxRetries) {
      try {
        return await apiCall();
      } catch (error) {
        lastError = error;
        attemptCount++;
        
        // Handle error with comprehensive error handling service
        const errorResult = await jiraErrorHandlingService.handleError(error, {
          ...context,
          attemptCount
        });
        
        // If error is not retryable, provide fallback immediately
        if (!errorResult.shouldRetry) {
          // If there's fallback data, return it instead of throwing
          if (errorResult.fallbackData !== null) {
            console.log(`🔄 Using fallback data for ${context.operation}:`, errorResult.fallbackData);
            return errorResult.fallbackData;
          }
          
          // For Epic operations, always return empty array instead of throwing
          if (context.operation === 'getEpics') {
            console.log(`🔄 Returning empty Epic array due to API error:`, error.message);
            return [];
          }
          
          throw new Error(errorResult.userMessage);
        }
        
        // Wait before retry
        if (attemptCount < jiraErrorHandlingService.retryConfig.maxRetries) {
          console.log(`⏳ Retrying ${context.operation} in ${errorResult.retryDelay}ms (attempt ${attemptCount}/${jiraErrorHandlingService.retryConfig.maxRetries})`);
          await new Promise(resolve => setTimeout(resolve, errorResult.retryDelay));
        }
      }
    }
    
    // Final error handling if all retries failed
    const finalErrorResult = await jiraErrorHandlingService.handleError(lastError, {
      ...context,
      attemptCount,
      finalAttempt: true
    });
    
    if (finalErrorResult.fallbackData !== null) {
      console.log(`🔄 Using final fallback data for ${context.operation}:`, finalErrorResult.fallbackData);
      return finalErrorResult.fallbackData;
    }
    
    // For Epic operations, always return empty array instead of throwing
    if (context.operation === 'getEpics') {
      console.log(`🔄 Returning empty Epic array after all retries failed:`, lastError.message);
      return [];
    }
    
    throw new Error(finalErrorResult.userMessage);
  }
}

export default new JiraService();