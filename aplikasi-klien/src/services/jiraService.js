import { supabase } from '../config/supabase';
import api from './api.js';
import cleanLogger from '../config/cleanLogging.js';
import ErrorRecovery from '../utils/errors/ErrorRecovery.js';
import UserDataService from './UserDataService.js';
import JiraConnectionService from './jira/JiraConnectionService.js';
import JiraEpicService from './jira/JiraEpicService.js';
import JiraStoryService from './jira/JiraStoryService.js';
import JiraTokenHealthService from './jira/JiraTokenHealthService.js';
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

  async deleteConnection(connectionId) {
    return await JiraConnectionService.deleteConnection(connectionId);
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

  // Token Health Management
  async checkTokenHealth(connectionId) {
    return await JiraTokenHealthService.checkTokenHealth(connectionId);
  }

  async checkAllTokensHealth() {
    return await JiraTokenHealthService.checkAllTokensHealth();
  }

  startHealthMonitoring(intervalMinutes = 30) {
    return JiraTokenHealthService.startHealthMonitoring(intervalMinutes);
  }

  stopHealthMonitoring() {
    return JiraTokenHealthService.stopHealthMonitoring();
  }

  isTokenExpired(connectionId) {
    return JiraTokenHealthService.isTokenExpired(connectionId);
  }

  getTokenHealthSummary(connectionId) {
    return JiraTokenHealthService.getTokenHealthSummary(connectionId);
  }

  // Story Management
  async createCompleteStory(connectionId, epicId, storyData, scenarios, developmentTasks = []) {
    // Check token health before creating story
    const tokenHealth = await this.checkTokenHealth(connectionId);
    if (!tokenHealth.success && tokenHealth.tokenStatus === 'expired') {
      throw new Error('API token has expired. Please update your JIRA connection.');
    }
    
    return await JiraStoryService.createCompleteStory(connectionId, epicId, storyData, scenarios, developmentTasks);
  }

  // Epic Context Management
  async setEpicContext(epicId, epicData) {
    try {
      console.log(`🔍 [JIRA-SERVICE] Setting Epic context (global):`, {
        epicId,
        connectionId: epicData?.connection?.id,
        projectKey: epicData?.connection?.project_key,
        workWithoutEpic: epicData?.workWithoutEpic
      });
      
      // Validate Epic data consistency with global active project
      if (epicData?.connection) {
        const connectionId = epicData.connection.id;
        
        // Check if connection matches global active project
        const activeProjectResult = await UserDataService.getActiveProject();
        const activeProjectId = activeProjectResult.success ? activeProjectResult.data?.id : null;
        
        if (activeProjectId && activeProjectId !== connectionId) {
          console.warn(`⚠️ [JIRA-SERVICE] Epic context validation mismatch detected:`, {
            activeProjectId,
            epicConnectionId: connectionId
          });
          
          return {
            success: false,
            error: `Epic context validation failed: Connection mismatch (active: ${activeProjectId}, epic: ${connectionId}). Please select the correct project first.`
          };
        }
      }
      
      console.log('📤 [JIRA-SERVICE] Sending setEpicContext request:', {
        epicId,
        hasEpicData: !!epicData,
        epicDataKeys: epicData ? Object.keys(epicData) : [],
        epic: epicData?.epic ? {
          id: epicData.epic.id,
          key: epicData.epic.key,
          name: epicData.epic.name,
          hasSummary: !!epicData.epic.summary
        } : null,
        connection: epicData?.connection ? {
          id: epicData.connection.id,
          project_key: epicData.connection.project_key
        } : null,
        workWithoutEpic: epicData?.workWithoutEpic
      });
      
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
          
          // Log: Epic selected
          const epicName = epicData?.name || epicData?.key || epicId;
          cleanLogger.jiraEpicSelected(epicName);
          
        } catch (storageError) {
          console.warn('Failed to store epic context in localStorage:', storageError);
        }
        
        return { success: true, data: response.data.data };
      } else {
        throw new Error(response.data.error || 'Failed to set Epic context');
      }
    } catch (error) {
      console.error('❌ [JIRA-SERVICE] setEpicContext error:', {
        message: error.message,
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        config: {
          url: error.config?.url,
          method: error.config?.method,
          data: error.config?.data ? JSON.parse(error.config.data) : null
        }
      });
      const recovery = ErrorRecovery.handleJiraError(error, 'Set epic context');
      return { success: false, error: recovery.userMessage };
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
        cleanLogger.warn('JIRA', 'Failed to get epic context from localStorage');
      }
      
      const recovery = ErrorRecovery.handleJiraError(error, 'Get epic context');
      return { success: false, error: recovery.userMessage };
    }
  }

  async clearEpicContext() {
    try {
      const response = await withJiraTimeout(
        api.delete(JIRA_ENDPOINTS.EPIC_CONTEXT),
        JIRA_TIMEOUTS.CONTEXT_CLEAR,
        'Clear epic context'
      );
      
      // Clear from localStorage (global)
      clearEpicContextStorage();
      
      return handleJiraSuccess(response);
    } catch (error) {
      // Even if API call fails, clear localStorage
      clearEpicContextStorage();
      
      const recovery = ErrorRecovery.handleJiraError(error, 'Clear epic context');
      return { success: false, error: recovery.userMessage };
    }
  }

  // Force clear operations (global)
  async forceEpicContextClear() {
    try {
      // Clear from localStorage immediately
      clearEpicContextStorage();
      
      // Try to clear from server (don't wait for response)
      api.delete(JIRA_ENDPOINTS.EPIC_CONTEXT).catch(error => {
        console.warn('Server epic context clear failed (non-blocking):', error);
      });

      return { success: true };
    } catch (error) {
      const recovery = ErrorRecovery.handleUnexpectedError(error, 'JIRA_SERVICE');
      cleanLogger.error('JIRA-SERVICE', recovery.userMessage);
      return { success: false, error: recovery.userMessage };
    }
  }

  // Chat-specific operations
  async getActiveProjectForChat(chatId) {
    try {
      const key = `${JIRA_STORAGE.ACTIVE_PROJECT}_${chatId}`;
      const stored = localStorage.getItem(key);
      
      if (stored) {
        const data = JSON.parse(stored);
        
        return { success: true, data };
      }
      
      // Fallback: check legacy format
      const legacyActiveProjects = JSON.parse(localStorage.getItem('activeProjectsPerChat') || '{}');
      const legacyProjectId = legacyActiveProjects[chatId];
      
      if (legacyProjectId) {
        
        // Migrate to new format
        const projectData = {
          projectId: legacyProjectId,
          chatId,
          timestamp: new Date().toISOString()
        };
        localStorage.setItem(key, JSON.stringify(projectData));
        return { success: true, data: projectData };
      }

      return { success: true, data: null };
    } catch (error) {
      const recovery = ErrorRecovery.handleUnexpectedError(error, 'JIRA_SERVICE');
      cleanLogger.error('JIRA-SERVICE', recovery.userMessage);
      return { success: false, error: recovery.userMessage };
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
      
      // Store in the new format (localStorage)
      localStorage.setItem(key, JSON.stringify(projectData));
      
      // ALSO store in the legacy format for backward compatibility
      const legacyActiveProjects = JSON.parse(localStorage.getItem('activeProjectsPerChat') || '{}');
      legacyActiveProjects[chatId] = projectId;
      localStorage.setItem('activeProjectsPerChat', JSON.stringify(legacyActiveProjects));

      // CRITICAL: Persist to backend API untuk update is_active flag di database
      if (projectId) {
        try {
          const response = await api.post(`/active-projects/${chatId}`, {
            connectionId: projectId
          });

          if (response.data?.success) {
            console.log('✅ [JIRA-SERVICE] Backend API set active project:', response.data);
          } else {
            console.warn('⚠️ [JIRA-SERVICE] Backend API failed to set active project:', response.data?.error);
          }
        } catch (apiError) {
          console.warn('⚠️ [JIRA-SERVICE] Failed to call backend API:', apiError.message);
          // Tidak throw error, localStorage sudah tersimpan
        }
      }

      return { 
        success: true, 
        data: { 
          ...projectData, 
          projectChanged: true // Always true when explicitly setting
        } 
      };
    } catch (error) {
      const recovery = ErrorRecovery.handleUnexpectedError(error, 'JIRA_SERVICE');
      cleanLogger.error('JIRA-SERVICE', recovery.userMessage);
      return { success: false, error: recovery.userMessage };
    }
  }

  // Deprecated: Epic context is now global, not per-chat
  async clearEpicContextForChat() {
    console.warn('⚠️ clearEpicContextForChat is deprecated - use clearEpicContext() instead (Epic is now global)');
    return this.clearEpicContext();
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
      const recovery = ErrorRecovery.handleUnexpectedError(error, 'JIRA_SERVICE');
      cleanLogger.error('JIRA-SERVICE', recovery.userMessage);
      return { success: false, error: recovery.userMessage };
    }
  }

  async deleteConnection(connectionId) {
    try {
      console.log(`🗑️ [JIRA-SERVICE-CLIENT] Deleting connection: ${connectionId}`);
      
      const response = await api.delete(`/jira/connections/${connectionId}`);

      return response.data;
    } catch (error) {
      const recovery = ErrorRecovery.handleJiraError(error, 'Delete connection');
      cleanLogger.error('JIRA-SERVICE-CLIENT', recovery.userMessage);
      return {
        success: false,
        error: recovery.userMessage
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
      const recovery = ErrorRecovery.handleJiraError(error, 'Create JIRA connection');
      return { success: false, error: recovery.userMessage };
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