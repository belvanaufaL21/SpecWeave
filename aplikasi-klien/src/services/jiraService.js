import { supabase } from '../config/supabase';
import api from './api.js';
import JiraConnectionService from './jira/JiraConnectionService.js';
import JiraEpicService from './jira/JiraEpicService.js';
import JiraStoryService from './jira/JiraStoryService.js';
import { 
  JIRA_TIMEOUTS, 
  JIRA_ENDPOINTS, 
  JIRA_STORAGE 
} from '../utils/constants/jiraServiceConstants';
import {
  withJiraTimeout,
  handleJiraError,
  handleJiraSuccess,
  getCurrentChatId,
  clearEpicContextStorage
} from '../utils/helpers/jiraServiceHelpers';

/**
 * Main JIRA Service - orchestrates all JIRA operations
 * Refactored for better maintainability and separation of concerns
 * Updated: Fixed import paths
 */
class JiraService {
  // Connection Management
  async getConnections() {
    return await JiraConnectionService.getConnections();
  }

  async getJiraConnections() {
    return await this.getConnections();
  }

  async testConnection(connectionData) {
    return await JiraConnectionService.testConnection(connectionData);
  }

  async createConnection(connectionData) {
    return await JiraConnectionService.createConnection(connectionData);
  }

  async startOAuthFlow(connectionData = {}) {
    return await JiraConnectionService.startOAuthFlow(connectionData);
  }

  async completeOAuthFlow(oauthToken, oauthVerifier) {
    return await JiraConnectionService.completeOAuthFlow(oauthToken, oauthVerifier);
  }

  // Epic Management
  async getProjectEpics(connectionId, projectKey) {
    return await JiraEpicService.getProjectEpics(connectionId, projectKey);
  }

  async validateEpicAccess(connectionId, epicId) {
    return await JiraEpicService.validateEpicAccess(connectionId, epicId);
  }

  async searchEpics(connectionId, projectKey, searchQuery) {
    return await JiraEpicService.searchEpics(connectionId, projectKey, searchQuery);
  }

  // Story Management
  async createCompleteStory(connectionId, epicId, storyData, scenarios) {
    return await JiraStoryService.createCompleteStory(connectionId, epicId, storyData, scenarios);
  }

  // Epic Context Management
  async setEpicContext(epicId, epicData) {
    try {
      console.log(`🔍 [JIRA-SERVICE] Setting Epic context:`, {
        epicId,
        connectionId: epicData?.connection?.id,
        projectKey: epicData?.connection?.project_key,
        workWithoutEpic: epicData?.workWithoutEpic,
        chatId: epicData?.chatId
      });
      
      // Validate Epic data consistency if chatId provided
      if (epicData?.chatId && epicData?.connection) {
        const chatId = epicData.chatId;
        const connectionId = epicData.connection.id;
        
        // Check if connection matches active project
        const activeProjects = JSON.parse(localStorage.getItem('activeProjectsPerChat') || '{}');
        const activeProjectId = activeProjects[chatId];
        
        if (activeProjectId && activeProjectId !== connectionId) {
          console.error(`❌ [JIRA-SERVICE] Epic context validation failed:`, {
            activeProjectId,
            epicConnectionId: connectionId,
            chatId
          });
          
          return {
            success: false,
            error: `Epic context validation failed: Connection mismatch (active: ${activeProjectId}, epic: ${connectionId})`
          };
        }
        
        console.log(`✅ [JIRA-SERVICE] Epic context validation passed for chat ${chatId}`);
      }
      
      const response = await withJiraTimeout(
        api.post(JIRA_ENDPOINTS.EPIC_CONTEXT, {
          epicId,
          epicData,
          timestamp: new Date().toISOString()
        }),
        JIRA_TIMEOUTS.CONTEXT_SET,
        'Set epic context'
      );
      
      if (response.data.success) {
        // Store in localStorage for quick access with validation metadata
        const contextData = {
          epicId,
          epicData: {
            ...epicData,
            validatedAt: new Date().toISOString(),
            validationPassed: true
          },
          timestamp: new Date().toISOString()
        };
        
        try {
          localStorage.setItem(JIRA_STORAGE.EPIC_CONTEXT, JSON.stringify(contextData));
          console.log(`✅ [JIRA-SERVICE] Epic context stored in localStorage with validation`);
        } catch (storageError) {
          console.warn('Failed to store epic context in localStorage:', storageError);
        }
        
        return { success: true, data: response.data.data };
      } else {
        throw new Error(response.data.error || 'Failed to set Epic context');
      }
    } catch (error) {
      return handleJiraError(error, 'Set epic context');
    }
  }

  async getEpicContext() {
    try {
      const response = await withJiraTimeout(
        api.get(JIRA_ENDPOINTS.EPIC_CONTEXT, {
          headers: {
            'Cache-Control': 'max-age=300'
          }
        }),
        JIRA_TIMEOUTS.CONTEXT_GET,
        'Get epic context'
      );
      
      return handleJiraSuccess(response, null);
    } catch (error) {
      // Try to get from localStorage as fallback
      try {
        const stored = localStorage.getItem(JIRA_STORAGE.EPIC_CONTEXT);
        if (stored) {
          const contextData = JSON.parse(stored);
          console.log('Using cached epic context from localStorage');
          return { success: true, data: contextData };
        }
      } catch (storageError) {
        console.warn('Failed to get epic context from localStorage:', storageError);
      }
      
      return handleJiraError(error, 'Get epic context');
    }
  }

  async clearEpicContext() {
    try {
      const response = await withJiraTimeout(
        api.delete(JIRA_ENDPOINTS.EPIC_CONTEXT),
        JIRA_TIMEOUTS.CONTEXT_CLEAR,
        'Clear epic context'
      );
      
      // Clear from localStorage
      const chatId = getCurrentChatId();
      clearEpicContextStorage(chatId);
      
      return handleJiraSuccess(response);
    } catch (error) {
      // Even if API call fails, clear localStorage
      const chatId = getCurrentChatId();
      clearEpicContextStorage(chatId);
      
      return handleJiraError(error, 'Clear epic context');
    }
  }

  // Force clear operations
  async forceEpicContextClear(chatId = null) {
    try {
      const currentChatId = chatId || getCurrentChatId();
      
      console.log('🧹 [JIRA-SERVICE] Force clearing Epic context for chat:', currentChatId);
      
      // Clear from localStorage immediately
      clearEpicContextStorage(currentChatId);
      
      // Try to clear from server (don't wait for response)
      api.delete(JIRA_ENDPOINTS.EPIC_CONTEXT).catch(error => {
        console.warn('Server epic context clear failed (non-blocking):', error);
      });
      
      console.log('✅ [JIRA-SERVICE] Force Epic context clear completed');
      
      return { success: true };
    } catch (error) {
      console.error('❌ [JIRA-SERVICE] Force Epic context clear failed:', error);
      return { success: false, error: error.message };
    }
  }

  // Chat-specific operations
  async getActiveProjectForChat(chatId) {
    try {
      const key = `${JIRA_STORAGE.ACTIVE_PROJECT}_${chatId}`;
      const stored = localStorage.getItem(key);
      
      if (stored) {
        const data = JSON.parse(stored);
        console.log(`✅ [JIRA-SERVICE] Found active project for chat ${chatId}: ${data.projectId}`);
        return { success: true, data };
      }
      
      // Fallback: check legacy format
      const legacyActiveProjects = JSON.parse(localStorage.getItem('activeProjectsPerChat') || '{}');
      const legacyProjectId = legacyActiveProjects[chatId];
      
      if (legacyProjectId) {
        console.log(`✅ [JIRA-SERVICE] Found legacy active project for chat ${chatId}: ${legacyProjectId}`);
        // Migrate to new format
        const projectData = {
          projectId: legacyProjectId,
          chatId,
          timestamp: new Date().toISOString()
        };
        localStorage.setItem(key, JSON.stringify(projectData));
        return { success: true, data: projectData };
      }
      
      console.log(`ℹ️ [JIRA-SERVICE] No active project found for chat ${chatId}`);
      return { success: true, data: null };
    } catch (error) {
      console.error('Error getting active project for chat:', error);
      return { success: false, error: error.message };
    }
  }

  async setActiveProjectForChat(chatId, projectId) {
    try {
      const key = `${JIRA_STORAGE.ACTIVE_PROJECT}_${chatId}`;
      const projectData = {
        projectId,
        chatId,
        timestamp: new Date().toISOString()
      };
      
      // Store in the new format
      localStorage.setItem(key, JSON.stringify(projectData));
      
      // ALSO store in the legacy format for backward compatibility
      const legacyActiveProjects = JSON.parse(localStorage.getItem('activeProjectsPerChat') || '{}');
      legacyActiveProjects[chatId] = projectId;
      localStorage.setItem('activeProjectsPerChat', JSON.stringify(legacyActiveProjects));
      
      console.log(`✅ [JIRA-SERVICE] Active project set for chat ${chatId}: ${projectId}`);
      console.log(`✅ [JIRA-SERVICE] Stored in both formats for compatibility`);
      
      return { 
        success: true, 
        data: { 
          ...projectData, 
          projectChanged: true // Always true when explicitly setting
        } 
      };
    } catch (error) {
      console.error('Error setting active project for chat:', error);
      return { success: false, error: error.message };
    }
  }

  async clearEpicContextForChat(chatId) {
    try {
      clearEpicContextStorage(chatId);
      
      console.log(`✅ Epic context cleared for chat: ${chatId}`);
      
      return { success: true };
    } catch (error) {
      console.error('Error clearing Epic context for chat:', error);
      return { success: false, error: error.message };
    }
  }

  async getActiveConnectionForCurrentChat() {
    try {
      const chatId = getCurrentChatId();
      const projectResult = await this.getActiveProjectForChat(chatId);
      
      if (projectResult.success && projectResult.data) {
        return { success: true, data: projectResult.data };
      }
      
      return { success: true, data: null };
    } catch (error) {
      console.error('Error getting active connection for current chat:', error);
      return { success: false, error: error.message };
    }
  }

  async deleteConnection(connectionId) {
    try {
      console.log(`🗑️ [JIRA-SERVICE-CLIENT] Deleting connection: ${connectionId}`);
      
      const response = await api.delete(`/jira/connections/${connectionId}`);
      
      console.log(`✅ [JIRA-SERVICE-CLIENT] Delete response:`, response.data);
      
      return response.data;
    } catch (error) {
      console.error('❌ [JIRA-SERVICE-CLIENT] Delete error:', error);
      return {
        success: false,
        error: error.response?.data?.error || error.message || 'Failed to delete connection'
      };
    }
  }

  // Legacy support methods
  async createJiraConnection(connectionData) {
    try {
      const { data: user } = await supabase.auth.getUser();
      
      if (!user.user) {
        throw new Error('User not authenticated');
      }
      
      const connectionWithUser = {
        ...connectionData,
        userId: user.user.id
      };
      
      return await this.createConnection(connectionWithUser);
    } catch (error) {
      return handleJiraError(error, 'Create JIRA connection');
    }
  }

  // Utility methods
  getCurrentChatId() {
    return getCurrentChatId();
  }
}

// Export singleton instance
export const jiraService = new JiraService();
export default jiraService;