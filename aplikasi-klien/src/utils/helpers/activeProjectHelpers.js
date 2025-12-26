/**
 * Helper functions for getting active project information
 * Ensures consistent display across all components
 */

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
    
    if (!activeProjectId || !connections || connections.length === 0) {
      return {
        success: false,
        projectName: 'No Active Project',
        projectKey: null,
        connectionId: null
      };
    }
    
    const activeProject = connections.find(conn => conn?.id === activeProjectId);
    
    if (!activeProject) {
      return {
        success: false,
        projectName: 'Project Not Found',
        projectKey: null,
        connectionId: activeProjectId
      };
    }
    
    return {
      success: true,
      projectName: activeProject.custom_fields?.project_info?.name || activeProject.project_key,
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
  
  // If working with Epic, show Epic name
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
  if (!hasEpic || !epicContext) {
    return {
      text: 'No Epic Selected',
      isConsistent: true,
      warning: null
    };
  }
  
  const isConsistent = isEpicContextConsistent(epicContext, connections);
  const activeProjectInfo = getActiveProjectInfo(connections);
  
  let text = '';
  let warning = null;
  
  if (epicContext.epicData?.workWithoutEpic) {
    if (isConsistent && activeProjectInfo.success) {
      text = `Project: ${activeProjectInfo.projectName}`;
    } else {
      // Show active project instead of stale Epic context project
      if (activeProjectInfo.success) {
        text = `Project: ${activeProjectInfo.projectName}`;
        warning = 'Epic context project does not match active project';
      } else {
        text = `Project: ${epicContext.epicData?.connection?.custom_fields?.project_info?.name || epicContext.epicData?.connection?.project_key}`;
        warning = 'Epic context project does not match active project';
      }
    }
  } else if (epicContext.epicData?.epic?.name) {
    if (isConsistent) {
      text = `Epic: ${epicContext.epicData.epic.name}`;
    } else {
      // Show active project instead of stale Epic when inconsistent
      if (activeProjectInfo.success) {
        text = `Active Project: ${activeProjectInfo.projectName}`;
        warning = `Epic "${epicContext.epicData.epic.name}" is from different project than active project`;
      } else {
        text = `Epic: ${epicContext.epicData.epic.name}`;
        warning = 'Epic is from different project than active project';
      }
    }
  } else {
    text = 'Epic Context Error';
    warning = 'Invalid Epic context data';
  }
  
  return {
    text,
    isConsistent,
    warning
  };
};