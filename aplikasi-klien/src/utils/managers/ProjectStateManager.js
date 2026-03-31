import UserDataService from '../../services/UserDataService.js';

/**
 * Unified Project State Manager
 * Ensures all components use the same active project source and stay synchronized
 * Now uses database instead of localStorage for cross-browser sync
 * SIMPLIFIED: One active project per user (global, not per-chat)
 */
class ProjectStateManager {
  constructor() {
    this.listeners = new Set();
    this.currentState = {
      activeProjectId: null,
      activeConnection: null,
      lastUpdated: null
    };
  }

  /**
   * Get the current active project (global)
   */
  async getActiveProject() {
    try {
      
      // Get active project from database with improved error handling
      const activeProjectResult = await UserDataService.getActiveProject();
      
      if (!activeProjectResult.success) {
        // Handle specific error cases
        if (activeProjectResult.error?.includes('access denied') || activeProjectResult.error?.includes('permissions')) {
          console.warn(`⚠️ [PROJECT-MANAGER] Database access issue: ${activeProjectResult.error}`);
          return { success: false, error: 'Database access denied', isPermissionError: true };
        }

        return { success: false, error: activeProjectResult.error };
      }
      
      if (!activeProjectResult.data) {
        
        return { success: false, error: 'No active project set', isEmpty: true };
      }
      
      const activeConnection = activeProjectResult.data;
      
      // Get actual project name from custom_fields or fallback to project_name field
      const actualProjectName = activeConnection.custom_fields?.project_info?.name || 
                                activeConnection.project_name || 
                                activeConnection.project_key;
      
      const projectState = {
        connectionId: activeConnection.id,
        projectKey: activeConnection.project_key,
        projectName: actualProjectName,
        connection: activeConnection
      };

      // Update internal state
      this.currentState = {
        activeProjectId: activeConnection.id,
        activeConnection: activeConnection,
        lastUpdated: new Date()
      };
      
      return { success: true, data: projectState };
    } catch (error) {
      console.error('❌ [PROJECT-MANAGER] Error getting active project:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Set active project and notify all listeners (global)
   */
  async setActiveProject(connectionId, connection = null) {
    try {
      
      // Check if project is actually changing
      const currentActiveResult = await UserDataService.getActiveProject();
      const currentActiveId = currentActiveResult.success ? currentActiveResult.data?.id : null;
      const isProjectChanging = currentActiveId && currentActiveId !== connectionId;
      
      if (isProjectChanging) {
        
        // Clear Epic context when project changes
        await this.clearEpicContext();
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
      
      // Get actual project name from custom_fields or fallback to project_name field
      const actualProjectName = connection.custom_fields?.project_info?.name || 
                                connection.project_name || 
                                connection.project_key;
      
      // Save to database (simplified - no projectData needed)
      const result = await UserDataService.setActiveProject(connectionId);
      
      if (!result.success) {
        throw new Error(`Failed to save active project: ${result.error}`);
      }
      
      // Update internal state
      this.currentState = {
        activeProjectId: connectionId,
        activeConnection: connection,
        lastUpdated: new Date()
      };
      
      const projectState = {
        connectionId: connection.id,
        projectKey: connection.project_key,
        projectName: actualProjectName,
        connection: connection,
        projectChanged: isProjectChanging
      };

      // Dispatch events for UI updates
      window.dispatchEvent(new CustomEvent('activeProjectChanged', {
        detail: {
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
   * Clear epic context when project changes (global)
   */
  async clearEpicContext() {
    try {
      
      // Clear from localStorage (global)
      const result = await UserDataService.clearEpicContext();
      
      if (!result.success) {
        console.warn('⚠️ [PROJECT-MANAGER] Failed to clear epic context:', result.error);
      } else {
        
      }
      
      // Dispatch events to ensure all components respond
      const clearTimestamp = Date.now();
      const events = [
        'forceEpicContextClear',
        'epicContextCleared',
        'forceEpicContextRefresh',
        'epicContextReset'
      ];
      
      events.forEach(eventName => {
        window.dispatchEvent(new CustomEvent(eventName, {
          detail: { timestamp: clearTimestamp }
        }));
        
      });
      
      // Notify all listeners
      this.notifyListeners('epicContextCleared', {});

      return { success: true, timestamp: clearTimestamp };
    } catch (error) {
      console.error('❌ [PROJECT-MANAGER] Error clearing epic context:', error);
      
      // Still dispatch events to ensure UI updates
      try {
        const clearTimestamp = Date.now();
        window.dispatchEvent(new CustomEvent('forceEpicContextClear', {
          detail: { timestamp: clearTimestamp }
        }));
        
      } catch (emergencyError) {
        console.error('❌ [PROJECT-MANAGER] Emergency Epic context clear failed:', emergencyError);
      }
      
      return { success: false, error: error.message };
    }
  }

  /**
   * Validate project consistency (simplified for global active project)
   */
  async validateConsistency() {
    try {
      
      const activeProjectResult = await this.getActiveProject();
      
      if (!activeProjectResult.success) {
        return { success: false, error: 'No active project to validate' };
      }
      
      const { projectKey, projectName, connectionId } = activeProjectResult.data;
      
      const validation = {
        activeProject: {
          connectionId,
          projectKey,
          projectName
        },
        consistent: true,
        issues: []
      };

      return { success: true, data: validation };
    } catch (error) {
      console.error('❌ [PROJECT-MANAGER] Error validating consistency:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Fix inconsistencies by forcing all components to use active project (simplified)
   */
  async fixInconsistencies() {
    try {
      
      const validationResult = await this.validateConsistency();
      
      if (!validationResult.success) {
        return validationResult;
      }
      
      const { consistent, activeProject } = validationResult.data;
      
      if (consistent) {
        
        return { success: true, message: 'No inconsistencies found' };
      }

      // Force refresh all components
      this.notifyListeners('forceRefresh', {
        activeProject,
        reason: 'inconsistency_fix'
      });

      return { success: true, message: 'Inconsistencies fixed' };
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