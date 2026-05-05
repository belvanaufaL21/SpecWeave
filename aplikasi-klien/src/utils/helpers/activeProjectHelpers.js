/**
 * Helper functions for getting active project information
 * Ensures consistent display across all components
 */

/**
 * Clean up invalid project IDs from localStorage
 * Should be called when connections are loaded
 */
export const cleanupInvalidActiveProjects = (connections) => {
  try {
    const activeProjects = JSON.parse(localStorage.getItem('activeProjectsPerChat') || '{}');
    const validConnectionIds = connections.map(conn => conn.id);
    let hasChanges = false;
    
    // Remove invalid project IDs
    Object.keys(activeProjects).forEach(chatId => {
      const projectId = activeProjects[chatId];
      if (projectId && !validConnectionIds.includes(projectId)) {
        delete activeProjects[chatId];
        hasChanges = true;
      }
    });
    
    // Update localStorage if there were changes
    if (hasChanges) {
      localStorage.setItem('activeProjectsPerChat', JSON.stringify(activeProjects));
    }
  } catch (error) {
    console.error('Error cleaning up active projects:', error);
  }
};

/**
 * Get current chat ID based on URL
 */
export const getCurrentChatId = () => {
  const currentPath = window.location.pathname;
  const pathSegments = currentPath.split('/');
  
  // For chat pages, use the last segment
  if (currentPath.includes('/chat')) {
    const chatId = pathSegments[pathSegments.length - 1];
    return chatId && chatId !== 'chat' ? chatId : 'default-chat';
  }
  
  // For dashboard, use dashboard-specific ID
  if (currentPath.includes('/dashboard')) {
    return 'dashboard-default';
  }
  
  // Default fallback
  return 'default-chat';
};

/**
 * Get active project information for display
 * This should be used instead of Epic context for project info
 */
export const getActiveProjectInfo = (connections) => {
  try {
    const chatId = getCurrentChatId();
    const activeProjects = JSON.parse(localStorage.getItem('activeProjectsPerChat') || '{}');
    const activeProjectId = activeProjects[chatId];
    
    if (!connections || connections.length === 0) {
      return {
        success: false,
        projectName: 'No Connections Available',
        projectKey: null,
        connectionId: null
      };
    }
    
    if (!activeProjectId) {
      // If no active project set, try to use first available connection
      const firstConnection = connections[0];
      if (firstConnection) {
        const actualProjectName = firstConnection.custom_fields?.project_info?.name || 
                                  firstConnection.project_name || 
                                  firstConnection.project_key;
        return {
          success: true,
          projectName: actualProjectName,
          projectKey: firstConnection.project_key,
          connectionId: firstConnection.id,
          connection: firstConnection
        };
      }
      
      return {
        success: false,
        projectName: 'No Active Project',
        projectKey: null,
        connectionId: null
      };
    }
    
    const activeProject = connections.find(conn => conn?.id === activeProjectId);
    
    if (!activeProject) {
      // If stored active project not found, try to use first available connection
      // This is normal when connections change or project is deleted
      const firstConnection = connections[0];
      if (firstConnection) {
        // Update localStorage to use the first available connection
        const updatedActiveProjects = { ...activeProjects, [chatId]: firstConnection.id };
        localStorage.setItem('activeProjectsPerChat', JSON.stringify(updatedActiveProjects));
        
        const actualProjectName = firstConnection.custom_fields?.project_info?.name || 
                                  firstConnection.project_name || 
                                  firstConnection.project_key;
        return {
          success: true,
          projectName: actualProjectName,
          projectKey: firstConnection.project_key,
          connectionId: firstConnection.id,
          connection: firstConnection
        };
      }
      
      return {
        success: false,
        projectName: 'Project Connection Lost',
        projectKey: null,
        connectionId: activeProjectId
      };
    }
    
    const actualProjectName = activeProject.custom_fields?.project_info?.name || 
                              activeProject.project_name || 
                              activeProject.project_key;
    return {
      success: true,
      projectName: actualProjectName,
      projectKey: activeProject.project_key,
      connectionId: activeProject.id,
      connection: activeProject
    };
  } catch (error) {
    console.error('Error getting active project info:', error);
    return {
      success: false,
      projectName: 'Error Loading Project',
      projectKey: null,
      connectionId: null
    };
  }
};

/**
 * Get Epic button text based on Epic context and active project
 * Prioritizes active project over Epic context for project display
 */
export const getEpicButtonText = (hasEpic, epicContext, connections) => {
  if (!hasEpic || !epicContext) {
    return 'Select Epic';
  }
  
  // If working without Epic, show active project name
  if (epicContext.epicData?.workWithoutEpic) {
    const activeProjectInfo = getActiveProjectInfo(connections);
    if (activeProjectInfo.success) {
      return `Project: ${activeProjectInfo.projectName}`;
    }
    // Fallback to Epic context if active project not found
    return `Project: ${epicContext.epicData?.connection?.custom_fields?.project_info?.name || epicContext.epicData?.connection?.project_key}`;
  }
  
  // If working with Epic, show Epic summary (name)
  if (epicContext.epicData?.epic?.summary) {
    return `Epic: ${epicContext.epicData.epic.summary}`;
  }
  
  if (epicContext.epicData?.epic?.name) {
    return `Epic: ${epicContext.epicData.epic.name}`;
  }
  
  if (epicContext.epicData?.epic?.key) {
    return `Epic: ${epicContext.epicData.epic.key}`;
  }
  
  return 'Select Epic';
};

/**
 * Get project display text for various components
 * Always uses active project, not Epic context
 */
export const getProjectDisplayText = (connections, prefix = 'Project') => {
  const activeProjectInfo = getActiveProjectInfo(connections);
  
  if (activeProjectInfo.success) {
    return `${prefix}: ${activeProjectInfo.projectName}`;
  }
  
  return `${prefix}: ${activeProjectInfo.projectName}`;
};

/**
 * Check if Epic context matches active project
 * Returns true if they match, false if inconsistent
 */
export const isEpicContextConsistent = (epicContext, connections) => {
  if (!epicContext || !epicContext.epicData?.connection) {
    return true; // No Epic context is considered consistent
  }
  
  const activeProjectInfo = getActiveProjectInfo(connections);
  
  if (!activeProjectInfo.success) {
    return false; // No active project is inconsistent if Epic context exists
  }
  
  const epicConnectionId = epicContext.epicData.connection.id;
  const activeConnectionId = activeProjectInfo.connectionId;
  
  return epicConnectionId === activeConnectionId;
};

/**
 * Get Epic context display text with consistency check
 * Shows warning if Epic context doesn't match active project
 */
export const getEpicContextDisplayText = (hasEpic, epicContext, connections) => {
  // CRITICAL: If no connections, always return "No Epic Selected"
  if (!connections || connections.length === 0) {
    return {
      text: 'No Epic Selected',
      isConsistent: true,
      warning: null
    };
  }
  
  // CRITICAL: If no epic context, return "No Epic Selected"
  if (!hasEpic || !epicContext) {
    return {
      text: 'No Epic Selected',
      isConsistent: true,
      warning: null
    };
  }
  
  // ENHANCED: Validate epic context has valid connection data
  if (!epicContext.epicData || !epicContext.epicData.connection) {
    return {
      text: 'No Epic Selected',
      isConsistent: true,
      warning: 'Invalid epic context data'
    };
  }
  
  const isConsistent = isEpicContextConsistent(epicContext, connections);
  const activeProjectInfo = getActiveProjectInfo(connections);
  
  let text = '';
  let warning = null;
  
  if (epicContext.epicData?.workWithoutEpic) {
    // For "work without Epic" mode, prioritize Epic context project info
    const epicProjectName = epicContext.epicData?.connection?.custom_fields?.project_info?.name || 
                           epicContext.epicData?.connection?.project_key;
    
    if (epicProjectName) {
      text = `Project: ${epicProjectName}`;
      
      // Only show warning if active project exists but doesn't match
      if (activeProjectInfo.success && !isConsistent) {
        warning = 'Epic context project does not match active project';
      }
    } else if (activeProjectInfo.success) {
      // Fallback to active project if Epic context has no project info
      text = `Project: ${activeProjectInfo.projectName}`;
    } else {
      text = 'Project: Unknown';
      warning = 'Unable to determine project information';
    }
  } else if (epicContext.epicData?.epic?.summary) {
    // ENHANCED: Validate epic connection exists in current connections
    const epicConnectionId = epicContext.epicData.connection.id;
    const connectionExists = connections.some(conn => conn.id === epicConnectionId);
    
    if (!connectionExists) {
      // Epic connection no longer exists, clear epic context
      return {
        text: 'No Epic Selected',
        isConsistent: false,
        warning: 'Epic connection no longer exists'
      };
    }
    
    // For Epic mode, show Epic summary (name)
    text = `Epic: ${epicContext.epicData.epic.summary}`;
    
    // Show warning if Epic is from different project than active project
    if (activeProjectInfo.success && !isConsistent) {
      warning = `Epic "${epicContext.epicData.epic.summary}" is from different project than active project`;
    }
  } else if (epicContext.epicData?.epic?.name) {
    // ENHANCED: Validate epic connection exists in current connections
    const epicConnectionId = epicContext.epicData.connection.id;
    const connectionExists = connections.some(conn => conn.id === epicConnectionId);
    
    if (!connectionExists) {
      // Epic connection no longer exists, clear epic context
      return {
        text: 'No Epic Selected',
        isConsistent: false,
        warning: 'Epic connection no longer exists'
      };
    }
    
    // For Epic mode, show Epic name
    text = `Epic: ${epicContext.epicData.epic.name}`;
    
    // Show warning if Epic is from different project than active project
    if (activeProjectInfo.success && !isConsistent) {
      warning = `Epic "${epicContext.epicData.epic.name}" is from different project than active project`;
    }
  } else if (epicContext.epicData?.epic?.key) {
    // ENHANCED: Validate epic connection exists
    const epicConnectionId = epicContext.epicData.connection.id;
    const connectionExists = connections.some(conn => conn.id === epicConnectionId);
    
    if (!connectionExists) {
      return {
        text: 'No Epic Selected',
        isConsistent: false,
        warning: 'Epic connection no longer exists'
      };
    }
    
    // Fallback to Epic key if no name
    text = `Epic: ${epicContext.epicData.epic.key}`;
    
    if (activeProjectInfo.success && !isConsistent) {
      warning = `Epic "${epicContext.epicData.epic.key}" is from different project than active project`;
    }
  } else {
    text = 'No Epic Selected';
    warning = 'Invalid Epic context data';
  }
  
  return {
    text,
    isConsistent,
    warning
  };
};