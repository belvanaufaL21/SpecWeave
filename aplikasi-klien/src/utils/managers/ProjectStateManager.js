/**
 * Unified Project State Manager
 * Ensures all components use the same active project source and stay synchronized
 */
class ProjectStateManager {
  constructor() {
    this.listeners = new Set();
    this.currentState = {
      activeProjectId: null,
      activeConnection: null,
      chatId: null,
      lastUpdated: null
    };
  }

  /**
   * Get the current active project for a specific chat
   */
  async getActiveProject(chatId) {
    try {
      console.log(`🔍 [PROJECT-MANAGER] Getting active project for chat: ${chatId}`);
      
      // Check localStorage for active project
      const activeProjects = JSON.parse(localStorage.getItem('activeProjectsPerChat') || '{}');
      const activeProjectId = activeProjects[chatId];
      
      if (!activeProjectId) {
        console.log(`⚠️ [PROJECT-MANAGER] No active project found for chat: ${chatId}`);
        return { success: false, error: 'No active project set' };
      }
      
      // Get connections to find the active one
      const { jiraService } = await import('../../services/jiraService');
      const connectionsResult = await jiraService.getConnections();
      
      if (!connectionsResult.success || !connectionsResult.data) {
        console.log(`❌ [PROJECT-MANAGER] Failed to load connections`);
        return { success: false, error: 'Failed to load connections' };
      }
      
      const activeConnection = connectionsResult.data.find(conn => conn.id === activeProjectId);
      
      if (!activeConnection) {
        console.log(`❌ [PROJECT-MANAGER] Active project connection not found: ${activeProjectId}`);
        return { success: false, error: 'Active project connection not found' };
      }
      
      const projectState = {
        connectionId: activeConnection.id,
        projectKey: activeConnection.project_key,
        projectName: activeConnection.custom_fields?.project_info?.name || activeConnection.project_key,
        connection: activeConnection,
        chatId: chatId
      };
      
      console.log(`✅ [PROJECT-MANAGER] Active project found:`, {
        connectionId: projectState.connectionId,
        projectKey: projectState.projectKey,
        projectName: projectState.projectName
      });
      
      // Update internal state
      this.currentState = {
        activeProjectId: activeConnection.id,
        activeConnection: activeConnection,
        chatId: chatId,
        lastUpdated: new Date()
      };
      
      return { success: true, data: projectState };
    } catch (error) {
      console.error('❌ [PROJECT-MANAGER] Error getting active project:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Set active project and notify all listeners
   */
  async setActiveProject(chatId, connectionId, connection = null) {
    try {
      console.log(`💾 [PROJECT-MANAGER] Setting active project for chat ${chatId}: ${connectionId}`);
      
      // Check if project is actually changing
      const currentActiveProjects = JSON.parse(localStorage.getItem('activeProjectsPerChat') || '{}');
      const currentActiveId = currentActiveProjects[chatId];
      const isProjectChanging = currentActiveId && currentActiveId !== connectionId;
      
      if (isProjectChanging) {
        console.log(`🔄 [PROJECT-MANAGER] Project changing from ${currentActiveId} to ${connectionId}, clearing Epic context`);
        
        // ENHANCED: More thorough Epic context clearing
        await this.clearEpicContext(chatId);
        
        // Additional Epic context clearing to ensure it's completely removed
        console.log(`🧹 [PROJECT-MANAGER] Performing additional Epic context cleanup...`);
        
        // Clear all possible Epic context storage locations
        const epicKeys = [
          'specweave_epic_context',
          `specweave_epic_context_${chatId}`,
          'epic_context_cleared_at',
          'epic_force_clear_time'
        ];
        
        epicKeys.forEach(key => {
          localStorage.removeItem(key);
          sessionStorage.removeItem(key);
        });
        
        // Set ENHANCED blocking timestamps with extended duration and multiple flags
        const strongClearTimestamp = Date.now();
        
        // Extended blocking timestamps (5 minutes)
        localStorage.setItem('epic_context_cleared_at', strongClearTimestamp.toString());
        localStorage.setItem('epic_force_clear_time', strongClearTimestamp.toString());
        
        // User clear flag (permanent until user selects Epic again)
        localStorage.setItem('epic_user_cleared', 'true');
        
        // Session blocking flag (blocks for entire browser session)
        sessionStorage.setItem('epic_context_blocked', 'true');
        
        console.log('🚫 [PROJECT-MANAGER] Epic context blocked with ENHANCED protection:');
        console.log('   - Time-based blocking: 5 minutes');
        console.log('   - User clear flag: permanent');
        console.log('   - Session blocking: until browser session ends');
        console.log('   - Server restoration blocked until:', new Date(strongClearTimestamp + 300000).toLocaleTimeString());
        
        // Dispatch multiple clearing events to ensure all components respond
        window.dispatchEvent(new CustomEvent('forceEpicContextClear'));
        window.dispatchEvent(new CustomEvent('epicContextCleared', {
          detail: { chatId, timestamp: strongClearTimestamp }
        }));
        
        // Force all Epic-related components to refresh
        window.dispatchEvent(new CustomEvent('forceEpicContextRefresh'));
        
        console.log(`✅ [PROJECT-MANAGER] Enhanced Epic context clearing completed with ENHANCED server blocking`);
      }
      
      // If connection not provided, fetch it
      if (!connection) {
        const { jiraService } = await import('../../services/jiraService');
        const connectionsResult = await jiraService.getConnections();
        
        if (connectionsResult.success && connectionsResult.data) {
          connection = connectionsResult.data.find(conn => conn.id === connectionId);
        }
      }
      
      if (!connection) {
        throw new Error(`Connection not found: ${connectionId}`);
      }
      
      // Update localStorage
      const activeProjects = JSON.parse(localStorage.getItem('activeProjectsPerChat') || '{}');
      activeProjects[chatId] = connectionId;
      localStorage.setItem('activeProjectsPerChat', JSON.stringify(activeProjects));
      
      // Also store in new format for compatibility
      const projectData = {
        projectId: connectionId,
        chatId: chatId,
        timestamp: new Date().toISOString()
      };
      const key = `specweave_active_project_${chatId}`;
      localStorage.setItem(key, JSON.stringify(projectData));
      
      // Update internal state
      this.currentState = {
        activeProjectId: connectionId,
        activeConnection: connection,
        chatId: chatId,
        lastUpdated: new Date()
      };
      
      const projectState = {
        connectionId: connection.id,
        projectKey: connection.project_key,
        projectName: connection.custom_fields?.project_info?.name || connection.project_key,
        connection: connection,
        chatId: chatId,
        projectChanged: isProjectChanging
      };
      
      console.log(`✅ [PROJECT-MANAGER] Active project set:`, {
        connectionId: projectState.connectionId,
        projectKey: projectState.projectKey,
        projectName: projectState.projectName,
        projectChanged: projectState.projectChanged
      });
      
      // Dispatch events for UI updates
      window.dispatchEvent(new CustomEvent('activeProjectChanged', {
        detail: {
          chatId,
          projectId: connectionId,
          projectKey: connection.project_key,
          projectName: projectState.projectName,
          projectChanged: isProjectChanging
        }
      }));
      
      if (isProjectChanging) {
        // Force refresh Epic context and connections
        window.dispatchEvent(new CustomEvent('forceEpicContextRefresh'));
        window.dispatchEvent(new CustomEvent('forceConnectionsRefresh'));
      }
      
      // Notify all listeners
      this.notifyListeners('projectChanged', projectState);
      
      return { success: true, data: projectState };
    } catch (error) {
      console.error('❌ [PROJECT-MANAGER] Error setting active project:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Clear epic context when project changes
   */
  async clearEpicContext(chatId) {
    try {
      console.log(`🧹 [PROJECT-MANAGER] Clearing epic context for chat: ${chatId}`);
      
      // ENHANCED: More comprehensive Epic context clearing
      
      // 1. Clear from localStorage (all possible keys)
      const epicStorageKeys = [
        'specweave_epic_context',
        `specweave_epic_context_${chatId}`,
        'epic_context_cleared_at',
        'epic_force_clear_time'
      ];
      
      epicStorageKeys.forEach(key => {
        localStorage.removeItem(key);
        console.log(`🧹 [PROJECT-MANAGER] Cleared localStorage key: ${key}`);
      });
      
      // 2. Clear from sessionStorage
      epicStorageKeys.forEach(key => {
        sessionStorage.removeItem(key);
        console.log(`🧹 [PROJECT-MANAGER] Cleared sessionStorage key: ${key}`);
      });
      
      // 3. Set timestamps to track clearing
      const clearTimestamp = Date.now();
      localStorage.setItem('epic_context_cleared_at', clearTimestamp.toString());
      localStorage.setItem('epic_force_clear_time', clearTimestamp.toString());
      
      console.log(`🧹 [PROJECT-MANAGER] Set clear timestamps: ${clearTimestamp}`);
      
      // 4. Dispatch multiple events to ensure all components respond
      const events = [
        'forceEpicContextClear',
        'epicContextCleared',
        'forceEpicContextRefresh',
        'epicContextReset'
      ];
      
      events.forEach(eventName => {
        window.dispatchEvent(new CustomEvent(eventName, {
          detail: { chatId, timestamp: clearTimestamp }
        }));
        console.log(`📡 [PROJECT-MANAGER] Dispatched event: ${eventName}`);
      });
      
      // 5. Notify all listeners
      this.notifyListeners('epicContextCleared', { chatId });
      
      // 6. Wait for components to acknowledge the clear (with timeout)
      const confirmationPromise = new Promise((resolve) => {
        let acknowledged = false;
        const timeout = setTimeout(() => {
          if (!acknowledged) {
            console.warn('⚠️ [PROJECT-MANAGER] Epic context clear timeout - proceeding anyway');
            resolve();
          }
        }, 2000); // Increased timeout to 2 seconds
        
        const handleAcknowledgment = (event) => {
          if (event.detail?.timestamp === clearTimestamp) {
            acknowledged = true;
            clearTimeout(timeout);
            window.removeEventListener('epicContextClearAcknowledged', handleAcknowledgment);
            console.log(`✅ [PROJECT-MANAGER] Epic context clear acknowledged`);
            resolve();
          }
        };
        
        window.addEventListener('epicContextClearAcknowledged', handleAcknowledgment);
        
        // Also resolve if no Epic context was present
        setTimeout(() => {
          if (!acknowledged) {
            acknowledged = true;
            clearTimeout(timeout);
            window.removeEventListener('epicContextClearAcknowledged', handleAcknowledgment);
            console.log(`✅ [PROJECT-MANAGER] Epic context clear completed (no acknowledgment needed)`);
            resolve();
          }
        }, 200); // Quick check if no context to clear
      });
      
      await confirmationPromise;
      
      console.log(`✅ [PROJECT-MANAGER] Epic context cleared and confirmed for chat: ${chatId}`);
      return { success: true, timestamp: clearTimestamp };
    } catch (error) {
      console.error('❌ [PROJECT-MANAGER] Error clearing epic context:', error);
      
      // Even on error, ensure Epic context is cleared
      try {
        localStorage.removeItem('specweave_epic_context');
        sessionStorage.removeItem('specweave_epic_context');
        const clearTimestamp = Date.now();
        localStorage.setItem('epic_context_cleared_at', clearTimestamp.toString());
        
        window.dispatchEvent(new CustomEvent('forceEpicContextClear'));
        console.log(`✅ [PROJECT-MANAGER] Emergency Epic context clear completed`);
      } catch (emergencyError) {
        console.error('❌ [PROJECT-MANAGER] Emergency Epic context clear failed:', emergencyError);
      }
      
      return { success: false, error: error.message };
    }
  }

  /**
   * Validate project consistency across components
   */
  async validateConsistency(chatId) {
    try {
      console.log(`🔍 [PROJECT-MANAGER] Validating consistency for chat: ${chatId}`);
      
      const activeProjectResult = await this.getActiveProject(chatId);
      
      if (!activeProjectResult.success) {
        return { success: false, error: 'No active project to validate' };
      }
      
      const { projectKey, projectName, connectionId } = activeProjectResult.data;
      
      // Check epic context
      const epicContext = JSON.parse(localStorage.getItem('specweave_epic_context') || 'null');
      
      const validation = {
        activeProject: {
          connectionId,
          projectKey,
          projectName
        },
        epicContext: epicContext ? {
          connectionId: epicContext.epicData?.connection?.id,
          projectKey: epicContext.epicData?.connection?.project_key,
          projectName: epicContext.epicData?.connection?.custom_fields?.project_info?.name
        } : null,
        consistent: true,
        issues: []
      };
      
      // Check if epic context matches active project
      if (epicContext && epicContext.epicData?.connection) {
        const epicConnectionId = epicContext.epicData.connection.id;
        if (epicConnectionId !== connectionId) {
          validation.consistent = false;
          validation.issues.push({
            type: 'epic_mismatch',
            message: `Epic context uses different connection (${epicConnectionId}) than active project (${connectionId})`
          });
        }
      }
      
      console.log(`🔍 [PROJECT-MANAGER] Validation result:`, validation);
      
      return { success: true, data: validation };
    } catch (error) {
      console.error('❌ [PROJECT-MANAGER] Error validating consistency:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Fix inconsistencies by forcing all components to use active project
   */
  async fixInconsistencies(chatId) {
    try {
      console.log(`🔧 [PROJECT-MANAGER] Fixing inconsistencies for chat: ${chatId}`);
      
      const validationResult = await this.validateConsistency(chatId);
      
      if (!validationResult.success) {
        return validationResult;
      }
      
      const { consistent, issues, activeProject } = validationResult.data;
      
      if (consistent) {
        console.log(`✅ [PROJECT-MANAGER] No inconsistencies found`);
        return { success: true, message: 'No inconsistencies found' };
      }
      
      console.log(`🔧 [PROJECT-MANAGER] Found ${issues.length} inconsistencies, fixing...`);
      
      // Fix epic context mismatch
      const epicMismatch = issues.find(issue => issue.type === 'epic_mismatch');
      if (epicMismatch) {
        console.log(`🔧 [PROJECT-MANAGER] Clearing mismatched epic context`);
        await this.clearEpicContext(chatId);
      }
      
      // Force refresh all components
      this.notifyListeners('forceRefresh', {
        chatId,
        activeProject,
        reason: 'inconsistency_fix'
      });
      
      console.log(`✅ [PROJECT-MANAGER] Inconsistencies fixed`);
      
      return { success: true, message: 'Inconsistencies fixed', fixedIssues: issues };
    } catch (error) {
      console.error('❌ [PROJECT-MANAGER] Error fixing inconsistencies:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Add listener for project state changes
   */
  addListener(callback) {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  /**
   * Notify all listeners of state changes
   */
  notifyListeners(event, data) {
    console.log(`📡 [PROJECT-MANAGER] Notifying ${this.listeners.size} listeners of ${event}`);
    this.listeners.forEach(callback => {
      try {
        callback(event, data);
      } catch (error) {
        console.error('❌ [PROJECT-MANAGER] Error in listener callback:', error);
      }
    });
  }

  /**
   * Get current state
   */
  getCurrentState() {
    return { ...this.currentState };
  }
}

// Create singleton instance
const projectStateManager = new ProjectStateManager();

export default projectStateManager;