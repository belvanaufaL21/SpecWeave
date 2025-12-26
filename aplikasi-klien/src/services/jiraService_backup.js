import { supabase } from '../config/supabase';
import api from './api';

/**
 * JIRA Service for Epic management and integration
 * Handles Epic selection, validation, and JIRA API interactions
 */
class JiraService {
  /**
   * Get JIRA connections for the current user
   * @returns {Promise<Object>} JIRA connections
   */
  async getConnections() {
    return this.getJiraConnections();
  }

  /**
   * Get JIRA connections for the current user (Fixed Timeout Version)
   * @returns {Promise<Object>} JIRA connections
   */
  async getJiraConnections() {
    try {
      // Fixed timeout - use single timeout approach
      const response = await api.get('/jira/connections', { 
        timeout: 10000, // 10 seconds - reasonable for connections
        headers: {
          'Cache-Control': 'max-age=60',
          'X-Fast-Request': 'true'
        }
      });
      
      if (response.data.success) {
        return { success: true, data: response.data.data };
      } else {
        throw new Error(response.data.error || 'Failed to fetch JIRA connections');
      }
    } catch (error) {
      // Better error handling - show actual errors for debugging
      if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
        console.warn('JIRA connection fetch timeout - server may be slow');
        return { success: false, error: 'Connection timeout', data: [] };
      }
      
      console.error('Error fetching JIRA connections:', error);
      return { success: false, error: error.message, data: [] };
    }
  }

  /**
   * Get available Epics from JIRA project (Fixed Timeout Version)
   * @param {string} connectionId - JIRA connection ID
   * @param {string} projectKey - JIRA project key
   * @returns {Promise<Object>} Available Epics
   */
  async getProjectEpics(connectionId, projectKey) {
    try {
      // Fixed timeout - use single timeout approach
      const response = await api.get(`/jira/connections/${connectionId}/projects/${projectKey}/epics`, {
        timeout: 15000, // 15 seconds - reasonable for JIRA API calls
        headers: {
          'Cache-Control': 'max-age=120',
          'X-Fast-Request': 'true'
        }
      });
      
      if (response.data.success) {
        const result = { 
          success: true, 
          data: response.data.data || [] 
        };
        
        // If this was a fallback response, include the warning
        if (response.data.fallback && response.data.warning) {
          result.warning = response.data.warning;
          result.fallback = true;
        }
        
        return result;
      } else {
        throw new Error(response.data.error || 'Failed to fetch Epics');
      }
    } catch (error) {
      // Better error handling
      if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
        console.warn('Epic fetch timeout - JIRA server may be slow');
        return { 
          success: true, 
          data: [], 
          error: 'JIRA server timeout - please try again',
          fallback: true 
        };
      }
      
      console.error('Error fetching project Epics:', error);
      return { 
        success: true, 
        data: [], 
        error: error.message,
        fallback: true 
      };
    }
  }

  /**
   * Validate Epic access and permissions
   * @param {string} connectionId - JIRA connection ID
   * @param {string} epicId - Epic ID to validate
   * @returns {Promise<Object>} Validation result
   */
  async validateEpicAccess(connectionId, epicId) {
    try {
      const response = await api.get(`/jira/connections/${connectionId}/epics/${epicId}/validate`);
      
      if (response.data.success) {
        return { success: true, data: response.data.data };
      } else {
        throw new Error(response.data.error || 'Epic validation failed');
      }
    } catch (error) {
      console.error('Error validating Epic access:', error);
      

      
      return { success: false, error: error.message };
    }
  }

  /**
   * Set Epic context for the current session
   * @param {string} epicId - Epic ID to set as context
   * @param {Object} epicData - Epic data to store
   * @returns {Promise<Object>} Success status
   */
  async setEpicContext(epicId, epicData) {
    try {
      const response = await api.post('/epics/context', {
        epicId,
        epicData
      });

      if (response.data.success) {
        // Also store in localStorage as backup
        const epicContext = {
          epicId,
          epicData,
          timestamp: Date.now()
        };
        localStorage.setItem('specweave_epic_context', JSON.stringify(epicContext));
        
        return { success: true, data: response.data.data };
      } else {
        throw new Error(response.data.error || 'Failed to set Epic context');
      }
    } catch (error) {
      console.error('Error setting Epic context:', error);
      
      // Fallback to localStorage for development
      if (process.env.NODE_ENV === 'development') {
        const epicContext = {
          epicId,
          epicData,
          timestamp: Date.now()
        };
        localStorage.setItem('specweave_epic_context', JSON.stringify(epicContext));
        console.warn('Using localStorage fallback for Epic context');
        return { success: true, data: epicContext };
      }
      
      return { success: false, error: error.message };
    }
  }

  /**
   * Get current Epic context (Fixed Timeout Version)
   * @returns {Promise<Object>} Current Epic context
   */
  async getEpicContext() {
    try {
      // Fixed timeout - use single timeout approach
      const response = await api.get('/epics/context', { 
        timeout: 8000, // 8 seconds - reasonable for context fetch
        headers: {
          'Cache-Control': 'max-age=30',
          'X-Fast-Request': 'true'
        }
      });
      
      if (response.data.success) {
        return { success: true, data: response.data.data };
      } else {
        throw new Error(response.data.error || 'Failed to get Epic context');
      }
    } catch (error) {
      // Better error handling with fallback
      if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
        console.warn('Epic context fetch timeout - using localStorage fallback');
      } else {
        console.error('Error getting Epic context:', error);
      }
      
      // Fallback to localStorage
      const contextStr = localStorage.getItem('specweave_epic_context');
      
      if (!contextStr) {
        return { success: true, data: null };
      }

      try {
        const context = JSON.parse(contextStr);
        
        // Check if context is still valid (not older than 1 hour for fast access)
        const maxAge = 60 * 60 * 1000; // 1 hour
        if (Date.now() - context.timestamp > maxAge) {
          localStorage.removeItem('specweave_epic_context');
          return { success: true, data: null };
        }

        console.log('Using localStorage fallback for Epic context');
        return { success: true, data: context };
      } catch (parseError) {
        localStorage.removeItem('specweave_epic_context');
        return { success: true, data: null };
      }
    }
  }

  /**
   * Clear Epic context
   * @returns {Promise<Object>} Success status
   */
  async clearEpicContext() {
    try {
      const response = await api.delete('/epics/context');
      
      if (response.data.success) {
        // Also clear localStorage
        localStorage.removeItem('specweave_epic_context');
        return { success: true };
      } else {
        throw new Error(response.data.error || 'Failed to clear Epic context');
      }
    } catch (error) {
      console.error('Error clearing Epic context:', error);
      
      // Fallback to localStorage for development
      if (process.env.NODE_ENV === 'development') {
        localStorage.removeItem('specweave_epic_context');
        console.warn('Using localStorage fallback for clearing Epic context');
        return { success: true };
      }
      
      return { success: false, error: error.message };
    }
  }

  /**
   * Search Epics by name or key
   * @param {string} connectionId - JIRA connection ID
   * @param {string} projectKey - JIRA project key
   * @param {string} searchQuery - Search query
   * @returns {Promise<Object>} Search results
   */
  async searchEpics(connectionId, projectKey, searchQuery) {
    try {
      const result = await this.getProjectEpics(connectionId, projectKey);
      
      if (!result.success) {
        return result;
      }

      const filteredEpics = result.data.filter(epic => 
        epic.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        epic.key.toLowerCase().includes(searchQuery.toLowerCase()) ||
        epic.summary.toLowerCase().includes(searchQuery.toLowerCase())
      );

      return { success: true, data: filteredEpics };
    } catch (error) {
      console.error('Error searching Epics:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Start JIRA OAuth flow
   * @param {Object} connectionData - JIRA connection data (optional)
   * @returns {Promise<Object>} OAuth authorization URL
   */
  async startOAuthFlow(connectionData = {}) {
    try {
      const response = await api.post('/jira/oauth/start', connectionData);
      
      if (response.data.success) {
        return { success: true, data: response.data.data };
      } else {
        throw new Error(response.data.error || 'Failed to start OAuth flow');
      }
    } catch (error) {
      console.error('Error starting OAuth flow:', error);
      
      // Check if it's a 501 (Not Implemented) or 404 (Not Found)
      if (error.response?.status === 501 || error.response?.status === 404) {
        return { 
          success: false, 
          error: 'OAuth login is not yet available. Please use manual setup instead.',
          code: 'OAUTH_NOT_AVAILABLE'
        };
      }
      

      
      return { 
        success: false, 
        error: error.response?.data?.error || error.message || 'OAuth connection failed',
        code: 'OAUTH_ERROR'
      };
    }
  }

  /**
   * Complete JIRA OAuth flow
   * @param {string} oauthToken - OAuth token from callback
   * @param {string} oauthVerifier - OAuth verifier from callback
   * @returns {Promise<Object>} Created connection
   */
  async completeOAuthFlow(oauthToken, oauthVerifier) {
    try {
      const response = await api.post('/jira/oauth/callback', {
        oauth_token: oauthToken,
        oauth_verifier: oauthVerifier
      });
      
      if (response.data.success) {
        return { success: true, data: response.data.data };
      } else {
        throw new Error(response.data.error || 'Failed to complete OAuth flow');
      }
    } catch (error) {
      console.error('Error completing OAuth flow:', error);
      

      
      return { success: false, error: error.message };
    }
  }

  /**
   * Test JIRA connection before creating
   * @param {Object} connectionData - JIRA connection data
   * @returns {Promise<Object>} Test result
   */
  async testConnection(connectionData) {
    try {
      const response = await api.post('/jira/test-connection', connectionData);
      
      if (response.data.success) {
        return { success: true, data: response.data.data };
      } else {
        throw new Error(response.data.error || 'Failed to test JIRA connection');
      }
    } catch (error) {
      console.error('Error testing JIRA connection:', error);
      
      return { 
        success: false, 
        error: error.response?.data?.error || error.message || 'Connection test failed'
      };
    }
  }

  /**
   * Create a JIRA connection (API Token method)
   * @param {Object} connectionData - JIRA connection data
   * @returns {Promise<Object>} Created connection
   */
  async createConnection(connectionData) {
    try {
      const response = await api.post('/jira/connections', connectionData);
      
      if (response.data.success) {
        return { success: true, data: response.data.data };
      } else {
        throw new Error(response.data.error || 'Failed to create JIRA connection');
      }
    } catch (error) {
      console.error('Error creating JIRA connection:', error);
      

      
      return { success: false, error: error.message };
    }
  }

  /**
   * Create JIRA user story with scenarios in acceptance criteria table
   * @param {string} connectionId - JIRA connection ID
   * @param {string} epicId - Epic ID
   * @param {Object} storyData - Story data
   * @param {Array} scenarios - Scenarios for acceptance criteria table
   * @returns {Promise<Object>} Created story result
   */
  async createCompleteStory(connectionId, epicId, storyData, scenarios) {
    const maxRetries = 3;
    let lastError = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`🔄 Export attempt ${attempt}/${maxRetries}`);
        
        // Progressive timeout increase
        const timeout = 30000 + (attempt * 30000); // 30s, 60s, 90s
        
        const response = await api.post(`/jira/connections/${connectionId}/epics/${epicId}/complete-story`, {
          storyData,
          scenarios
        }, {
          timeout: timeout
        });
        
        if (response.data.success) {
          console.log(`✅ Export successful on attempt ${attempt}`);
          return { success: true, data: response.data.data };
        } else {
          throw new Error(response.data.error || 'Failed to create complete story');
        }
      } catch (error) {
        console.error(`❌ Export attempt ${attempt} failed:`, error.message);
        lastError = error;
        
        // Check if it's a timeout error
        if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
          if (attempt === maxRetries) {
            return { 
              success: false, 
              error: 'Export is taking longer than expected. Please check your JIRA project to see if the issues were created.',
              isTimeout: true
            };
          }
          // Continue to next attempt for timeout
          console.log(`⏳ Timeout on attempt ${attempt}, retrying...`);
          continue;
        }
        
        // For non-timeout errors, check if we should retry
        const shouldRetry = this.shouldRetryError(error);
        if (!shouldRetry || attempt === maxRetries) {
          break;
        }
        
        // Wait before retry (exponential backoff)
        const delay = Math.min(500 * Math.pow(2, attempt - 1), 3000); // Reduced from 1000ms base and 10000ms max
        console.log(`⏳ Waiting ${delay}ms before retry...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    
    return { 
      success: false, 
      error: lastError?.response?.data?.error || lastError?.message || 'Failed to create complete story after multiple attempts'
    };
  }

  /**
   * Determine if an error should trigger a retry
   * @param {Error} error - The error to check
   * @returns {boolean} Whether to retry
   */
  shouldRetryError(error) {
    // Retry on network errors, 5xx server errors, and some 4xx errors
    if (error.code === 'ECONNABORTED' || error.code === 'ENOTFOUND' || error.code === 'ECONNRESET') {
      return true;
    }
    
    const status = error.response?.status;
    if (status >= 500) {
      return true; // Server errors
    }
    
    if (status === 429) {
      return true; // Rate limiting
    }
    
    if (status === 408) {
      return true; // Request timeout
    }
    
    return false;
  }

  /**
   * Create a JIRA connection (placeholder for future implementation)
   * @param {Object} connectionData - JIRA connection data
   * @returns {Promise<Object>} Created connection
   */
  async createJiraConnection(connectionData) {
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user?.user) {
        throw new Error('User not authenticated');
      }

      const connection = {
        user_id: user.user.id,
        jira_url: connectionData.jiraUrl,
        access_token: connectionData.accessToken, // Should be encrypted
        refresh_token: connectionData.refreshToken, // Should be encrypted
        project_key: connectionData.projectKey,
        issue_type: connectionData.issueType || 'Story',
        custom_fields: connectionData.customFields || {},
        is_active: true
      };

      const { data, error } = await supabase
        .from('jira_connections')
        .insert([connection])
        .select('*')
        .single();

      if (error) {
        throw new Error(`Failed to create JIRA connection: ${error.message}`);
      }

      return { success: true, data };
    } catch (error) {
      console.error('Error creating JIRA connection:', error);
      return { success: false, error: error.message };
    }
  }
  /**
   * Get current chat ID from URL or context
   * @returns {string} Chat ID
   */
  getCurrentChatId() {
    // This should be improved to get actual chat ID from context/props
    return window.location.pathname.split('/').pop() || 'default-chat';
  }

  /**
   * Force clear all Epic contexts (optimized for smooth operation)
   * @param {string} chatId - Chat ID
   * @returns {Promise<Object>} Result
   */
  async forceEpicContextClear(chatId = null) {
    try {
      const currentChatId = chatId || this.getCurrentChatId();
      
      console.log('🧹 [FORCE-CLEAR] Optimized Epic context clearing...');
      
      // 1. Clear via service API (non-blocking)
      this.clearEpicContext().catch(e => {
        console.warn('[FORCE-CLEAR] Service API clear failed (non-critical):', e.message);
      });
      
      // 2. Clear per-chat Epic context (non-blocking)
      this.clearEpicContextForChat(currentChatId).catch(e => {
        console.warn('[FORCE-CLEAR] Per-chat clear failed (non-critical):', e.message);
      });
      
      // 3. Optimized localStorage clearing - essential keys only
      const essentialKeys = [
        'specweave_epic_context',
        `specweave_epic_context_${currentChatId}`,
        'epic_context',
        `epic_context_${currentChatId}`
      ];
      
      // Single batch operation
      essentialKeys.forEach(key => {
        localStorage.removeItem(key);
        sessionStorage.removeItem(key);
      });
      
      console.log('✅ [FORCE-CLEAR] Optimized Epic context clearing completed');
      
      return { success: true };
    } catch (error) {
      console.error('Error in force Epic context clear:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get active project for specific chat
   * @param {string} chatId - Chat ID
   * @returns {Promise<Object>} Active project info
   */
  async getActiveProjectForChat(chatId) {
    try {
      // For now, use localStorage to store per-chat active projects
      // In production, this should be stored in backend/database
      const activeProjects = JSON.parse(localStorage.getItem('activeProjectsPerChat') || '{}');
      const projectId = activeProjects[chatId];
      
      if (projectId) {
        return { success: true, data: { projectId } };
      } else {
        return { success: false, error: 'No active project set for this chat' };
      }
    } catch (error) {
      console.error('Error getting active project for chat:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Set active project for specific chat and clear Epic context
   * @param {string} chatId - Chat ID
   * @param {string} projectId - Project connection ID
   * @returns {Promise<Object>} Result
   */
  async setActiveProjectForChat(chatId, projectId) {
    try {
      // For now, use localStorage to store per-chat active projects
      // In production, this should be stored in backend/database
      const activeProjects = JSON.parse(localStorage.getItem('activeProjectsPerChat') || '{}');
      const previousProjectId = activeProjects[chatId];
      
      // If project is changing, clear Epic context for this chat
      if (previousProjectId && previousProjectId !== projectId) {
        await this.clearEpicContextForChat(chatId);
      }
      
      activeProjects[chatId] = projectId;
      localStorage.setItem('activeProjectsPerChat', JSON.stringify(activeProjects));
      
      return { success: true, data: { chatId, projectId, projectChanged: previousProjectId !== projectId } };
    } catch (error) {
      console.error('Error setting active project for chat:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Clear Epic context for specific chat
   * @param {string} chatId - Chat ID
   * @returns {Promise<Object>} Result
   */
  async clearEpicContextForChat(chatId) {
    try {
      // Clear Epic context from localStorage for this specific chat
      const epicContextKey = `specweave_epic_context_${chatId}`;
      localStorage.removeItem(epicContextKey);
      
      // Also clear global Epic context if it exists
      const globalContext = localStorage.getItem('specweave_epic_context');
      if (globalContext) {
        try {
          const context = JSON.parse(globalContext);
          // If global context belongs to this chat, clear it
          if (context.chatId === chatId) {
            localStorage.removeItem('specweave_epic_context');
          }
        } catch (e) {
          // If parsing fails, just remove it
          localStorage.removeItem('specweave_epic_context');
        }
      }
      
      console.log(`🧹 Cleared Epic context for chat: ${chatId}`);
      return { success: true };
    } catch (error) {
      console.error('Error clearing Epic context for chat:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get active project connection for current chat
   * @returns {Promise<Object>} Active connection
   */
  async getActiveConnectionForCurrentChat() {
    try {
      const chatId = this.getCurrentChatId();
      const activeProjectResult = await this.getActiveProjectForChat(chatId);
      
      if (!activeProjectResult.success) {
        return { success: false, error: 'No active project set for this chat' };
      }
      
      const connectionsResult = await this.getJiraConnections();
      if (!connectionsResult.success) {
        return { success: false, error: 'Failed to load connections' };
      }
      
      const activeConnection = connectionsResult.data.find(
        conn => conn.id === activeProjectResult.data.projectId
      );
      
      if (!activeConnection) {
        return { success: false, error: 'Active project connection not found' };
      }
      
      return { success: true, data: activeConnection };
    } catch (error) {
      console.error('Error getting active connection for current chat:', error);
      return { success: false, error: error.message };
    }
  }
}

// Export singleton instance
export const jiraService = new JiraService();
export default jiraService;