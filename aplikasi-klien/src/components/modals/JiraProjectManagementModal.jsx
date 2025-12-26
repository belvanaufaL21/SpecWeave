import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { jiraService } from '../../services/jiraService';
import { useConfirmation } from '../../hooks/useConfirmation';
import ConfirmationModal from '../common/ConfirmationModal';
import projectStateManager from '../../utils/managers/ProjectStateManager.js';
import { getActiveProjectInfo } from '../../utils/helpers/activeProjectHelpers';

const JiraProjectManagementModal = ({ isOpen, onClose, onAddNewProject }) => {
  const [connections, setConnections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [activeProjectPerChat, setActiveProjectPerChat] = useState({});
  const [pendingActiveProject, setPendingActiveProject] = useState(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Use confirmation modal hook
  const { confirmationState, showConfirmation } = useConfirmation();

  useEffect(() => {
    if (isOpen) {
      loadConnections();
      loadActiveProjectContext();
      // Clear previous messages when modal opens
      setError(null);
      setSuccess(null);
    }
  }, [isOpen]);

  // Listen for storage changes and active project updates
  useEffect(() => {
    const handleStorageChange = (e) => {
      if (e.key === 'activeProjectsPerChat' || e.key?.includes('specweave_active_project')) {
        console.log('🔄 [PROJECT-MODAL] Storage change detected, reloading active project context');
        loadActiveProjectContext();
      }
    };

    const handleActiveProjectUpdate = (e) => {
      console.log('🔄 [PROJECT-MODAL] Active project update event received:', e.detail);
      const { chatId, projectId } = e.detail;
      
      setActiveProjectPerChat(prev => ({
        ...prev,
        [chatId]: projectId
      }));
      
      // Update pending selection if it matches current chat
      const currentChatId = getCurrentChatId();
      if (chatId === currentChatId) {
        setPendingActiveProject(projectId);
        setHasUnsavedChanges(false);
      }
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('activeProjectUpdated', handleActiveProjectUpdate);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('activeProjectUpdated', handleActiveProjectUpdate);
    };
  }, []);

  const loadConnections = async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await jiraService.getConnections();
      
      if (result.success) {
        setConnections(result.data || []);
      } else {
        setError(result.error || 'Failed to load connections');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const loadActiveProjectContext = async () => {
    try {
      // Get current chat ID (you might need to get this from context or props)
      const chatId = getCurrentChatId();
      const result = await jiraService.getActiveProjectForChat(chatId);
      
      if (result.success && result.data) {
        const activeProjectId = result.data.projectId;
        setActiveProjectPerChat(prev => ({
          ...prev,
          [chatId]: activeProjectId
        }));
        // Set pending to current active project
        setPendingActiveProject(activeProjectId);
      }
    } catch (err) {
      console.warn('Could not load active project context:', err.message);
    }
  };

  const getCurrentChatId = () => {
    // Get chat ID from URL or use default
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

  const handleSelectProject = (connectionId) => {
    console.log(`🎯 [PROJECT-MODAL] User selected project: ${connectionId}`);
    
    setPendingActiveProject(connectionId);
    const chatId = getCurrentChatId();
    const currentActive = activeProjectPerChat[chatId];
    
    console.log(`🎯 [PROJECT-MODAL] Chat ID: ${chatId}`);
    console.log(`🎯 [PROJECT-MODAL] Current active: ${currentActive}`);
    console.log(`🎯 [PROJECT-MODAL] New selection: ${connectionId}`);
    
    const hasChanges = connectionId !== currentActive;
    setHasUnsavedChanges(hasChanges);
    
    console.log(`🎯 [PROJECT-MODAL] Has unsaved changes: ${hasChanges}`);
  };

  const handleSaveChanges = async () => {
    if (!pendingActiveProject) {
      console.warn('🚫 [PROJECT-MODAL] No pending project to save');
      return;
    }
    
    const chatId = getCurrentChatId();
    const currentActive = activeProjectPerChat[chatId];
    
    console.log(`💾 [PROJECT-MODAL] Saving project changes using ProjectStateManager...`);
    console.log(`💾 [PROJECT-MODAL] Chat ID: ${chatId}`);
    console.log(`💾 [PROJECT-MODAL] Current active: ${currentActive}`);
    console.log(`💾 [PROJECT-MODAL] Pending project: ${pendingActiveProject}`);
    
    // Show modern confirmation if project is changing and there might be Epic context
    if (pendingActiveProject !== currentActive) {
      const selectedProject = connections.find(conn => conn.id === pendingActiveProject);
      const projectName = selectedProject?.custom_fields?.project_info?.name || selectedProject?.project_key || 'Unknown';
      
      console.log(`⚠️ [PROJECT-MODAL] Project changing to: ${projectName} (${pendingActiveProject})`);
      
      const confirmed = await showConfirmation({
        type: 'warning',
        title: 'Project Change Impact',
        message: `Changing active project to "${projectName}" will clear any selected Epic context for this chat.`,
        details: 'You\'ll need to select a new Epic from the new project if needed. This action cannot be undone.',
        confirmText: 'Continue',
        cancelText: 'Cancel'
      });

      if (!confirmed) {
        console.log('🚫 [PROJECT-MODAL] User cancelled project change');
        return;
      }
    }
    
    try {
      setSaving(true);
      setError(null);
      setSuccess(null);
      
      const selectedProject = connections.find(conn => conn.id === pendingActiveProject);
      
      if (!selectedProject) {
        setError('Selected project not found');
        return;
      }
      
      // Use ProjectStateManager for consistent state management
      const result = await projectStateManager.setActiveProject(chatId, pendingActiveProject, selectedProject);
      
      console.log(`💾 [PROJECT-MODAL] ProjectStateManager result:`, result);
      
      if (result.success) {
        // Update local state immediately
        setActiveProjectPerChat(prev => ({
          ...prev,
          [chatId]: pendingActiveProject
        }));
        
        setHasUnsavedChanges(false);
        
        const projectName = result.data.projectName;
        const projectChanged = result.data.projectChanged;
        setSuccess(`Project "${projectName}" is now active for this chat!`);
        
        console.log(`✅ [PROJECT-MODAL] Project successfully changed to: ${projectName}`);
        console.log(`✅ [PROJECT-MODAL] All components will be synchronized via ProjectStateManager`);
        
        // ENHANCED: Close modal immediately after successful save
        console.log('🚪 [PROJECT-MODAL] Closing modal immediately after successful save');
        onClose();
        
        // Continue background processes without blocking modal close
        if (projectChanged) {
          console.log(`🔄 [PROJECT-MODAL] Project changed, Epic context clearing in background...`);
          
          // Wait for Epic context clear confirmation in background (non-blocking)
          const clearConfirmationPromise = new Promise((resolve) => {
            const timeout = setTimeout(() => {
              console.warn('⚠️ [PROJECT-MODAL] Epic clear confirmation timeout (background)');
              resolve();
            }, 2000);
            
            const handleClearConfirmation = (event) => {
              console.log(`✅ [PROJECT-MODAL] Epic context clear confirmed (background)`);
              clearTimeout(timeout);
              window.removeEventListener('epicContextCleared', handleClearConfirmation);
              resolve();
            };
            
            window.addEventListener('epicContextCleared', handleClearConfirmation);
          });
          
          // Background validation after Epic clear
          clearConfirmationPromise.then(async () => {
            try {
              const validationResult = await projectStateManager.validateConsistency(chatId);
              if (validationResult.success) {
                if (validationResult.data.consistent) {
                  console.log('✅ [PROJECT-MODAL] Background validation: All components synchronized');
                } else {
                  console.warn('⚠️ [PROJECT-MODAL] Background validation: Inconsistencies detected, fixing...');
                  await projectStateManager.fixInconsistencies(chatId);
                }
              }
            } catch (error) {
              console.warn('⚠️ [PROJECT-MODAL] Background validation error:', error);
            }
          });
        } else {
          // Background validation for non-project-change saves
          setTimeout(async () => {
            try {
              const validationResult = await projectStateManager.validateConsistency(chatId);
              if (validationResult.success) {
                if (validationResult.data.consistent) {
                  console.log('✅ [PROJECT-MODAL] Background validation: All components synchronized');
                } else {
                  console.warn('⚠️ [PROJECT-MODAL] Background validation: Inconsistencies detected, fixing...');
                  await projectStateManager.fixInconsistencies(chatId);
                }
              }
            } catch (error) {
              console.warn('⚠️ [PROJECT-MODAL] Background validation error:', error);
            }
          }, 500); // Quick background validation
        }
      } else {
        console.error('❌ [PROJECT-MODAL] Failed to set active project:', result.error);
        setError(result.error || 'Failed to set active project');
      }
    } catch (err) {
      console.error('❌ [PROJECT-MODAL] Project save error:', err);
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleCancelChanges = () => {
    const chatId = getCurrentChatId();
    const currentActive = activeProjectPerChat[chatId];
    setPendingActiveProject(currentActive);
    setHasUnsavedChanges(false);
  };

  const handleDeleteConnection = async (connectionId) => {
    const connection = connections.find(conn => conn.id === connectionId);
    const projectName = connection?.custom_fields?.project_info?.name || connection?.project_key || 'this project';
    
    const confirmed = await showConfirmation({
      type: 'danger',
      title: 'Delete JIRA Connection',
      message: `Are you sure you want to delete the connection to "${projectName}"?`,
      details: 'This action will permanently remove the connection and cannot be undone. Any saved Epic contexts for this project will be lost.',
      confirmText: 'Delete',
      cancelText: 'Cancel'
    });

    if (!confirmed) {
      return;
    }

    try {
      setDeletingId(connectionId);
      setError(null);
      
      console.log(`🗑️ [PROJECT-MODAL] Deleting connection: ${connectionId}`);
      
      // Call the backend API to delete the connection
      const result = await jiraService.deleteConnection(connectionId);
      
      if (result.success) {
        // Remove from local state
        setConnections(prev => prev.filter(conn => conn.id !== connectionId));
        
        // Clear from active project if it was the active one
        const chatId = getCurrentChatId();
        const currentActive = activeProjectPerChat[chatId];
        if (currentActive === connectionId) {
          setActiveProjectPerChat(prev => ({
            ...prev,
            [chatId]: null
          }));
          setPendingActiveProject(null);
          
          // Clear from localStorage
          await jiraService.setActiveProjectForChat(chatId, null);
          
          console.log(`🧹 [PROJECT-MODAL] Cleared active project after deletion`);
        }
        
        // Force refresh connections from server to ensure consistency
        console.log(`🔄 [PROJECT-MODAL] Force refreshing connections after deletion`);
        try {
          const refreshResult = await jiraService.getConnections();
          if (refreshResult.success) {
            setConnections(refreshResult.data);
            console.log(`✅ [PROJECT-MODAL] Connections refreshed after deletion`);
          }
        } catch (refreshError) {
          console.warn('⚠️ [PROJECT-MODAL] Could not refresh connections after deletion:', refreshError);
        }
        
        // Dispatch event to refresh other components
        window.dispatchEvent(new CustomEvent('forceConnectionsRefresh'));
        
        setSuccess(`Connection to "${projectName}" deleted successfully`);
        
        console.log(`✅ [PROJECT-MODAL] Successfully deleted connection: ${projectName}`);
        
        // Auto-hide success message after 3 seconds
        setTimeout(() => setSuccess(null), 3000);
      } else {
        console.error(`❌ [PROJECT-MODAL] Delete failed:`, result.error);
        setError(result.error || 'Failed to delete connection');
      }
    } catch (err) {
      console.error('❌ [PROJECT-MODAL] Delete error:', err);
      setError(err.message || 'Failed to delete connection');
    } finally {
      setDeletingId(null);
    }
  };

  const handleAddNewProject = () => {
    onClose();
    onAddNewProject();
  };

  // Group connections by JIRA URL
  const groupedConnections = connections.reduce((groups, connection) => {
    const url = connection.jira_url;
    if (!groups[url]) {
      groups[url] = [];
    }
    groups[url].push(connection);
    return groups;
  }, {});

  const currentChatId = getCurrentChatId();
  const activeProjectId = activeProjectPerChat[currentChatId];
  const selectedProjectId = pendingActiveProject;

  if (!isOpen) return null;

  const modalContent = (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
      <div className="bg-[#16161e] border border-white/10 rounded-xl w-full max-w-2xl max-h-[80vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-white/10">
          <div>
            <h2 className="text-lg font-semibold text-white">JIRA Project Management</h2>
            <p className="text-sm text-gray-400 mt-1">
              Manage your connected JIRA projects
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-white transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-4 overflow-y-auto max-h-[60vh]">
          {/* Enhanced Success Display */}
          {success && (
            <div className="mb-4 p-4 bg-gradient-to-r from-green-500/10 to-emerald-500/10 border border-green-500/20 rounded-xl backdrop-blur-sm">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-green-500/20 to-emerald-500/20 flex items-center justify-center flex-shrink-0">
                  <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h4 className="text-green-400 text-sm font-semibold">Success</h4>
                    <span className="px-2 py-0.5 text-xs rounded-full bg-green-500/20 text-green-300 border border-green-500/30">
                      Completed
                    </span>
                  </div>
                  <p className="text-green-200/90 text-sm leading-relaxed">
                    {success}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Enhanced Warning Message for Project Change */}
          {hasUnsavedChanges && (
            <div className="mb-4 p-4 bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/20 rounded-xl backdrop-blur-sm">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-500/20 to-orange-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <svg className="w-5 h-5 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h4 className="text-amber-400 text-sm font-semibold">Project Change Impact</h4>
                    <span className="px-2 py-0.5 text-xs rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                      Action Required
                    </span>
                  </div>
                  <p className="text-amber-200/90 text-sm leading-relaxed mb-3">
                    Switching to a different project will automatically clear any selected Epic context for this chat session.
                  </p>
                  <div className="flex items-center gap-2 text-xs text-amber-300/80">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span>You'll need to select a new Epic from the new project if needed</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Enhanced Error Display */}
          {error && (
            <div className="mb-4 p-4 bg-gradient-to-r from-red-500/10 to-rose-500/10 border border-red-500/20 rounded-xl backdrop-blur-sm">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-red-500/20 to-rose-500/20 flex items-center justify-center flex-shrink-0">
                  <svg className="w-5 h-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h4 className="text-red-400 text-sm font-semibold">Connection Error</h4>
                    <span className="px-2 py-0.5 text-xs rounded-full bg-red-500/20 text-red-300 border border-red-500/30">
                      Failed
                    </span>
                  </div>
                  <p className="text-red-200/90 text-sm leading-relaxed">
                    {error}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Loading State */}
          {loading ? (
            <div className="text-center py-8">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500"></div>
              <p className="text-gray-400 mt-2">Loading connections...</p>
            </div>
          ) : Object.keys(groupedConnections).length === 0 ? (
            /* Empty State */
            <div className="text-center py-12">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-500/20 flex items-center justify-center">
                <svg className="w-8 h-8 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                </svg>
              </div>
              <p className="text-gray-400 mb-2">No JIRA connections found</p>
              <p className="text-sm text-gray-500 mb-6">
                Connect your first JIRA project to get started
              </p>
              <button
                onClick={handleAddNewProject}
                className="px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg hover:from-purple-700 hover:to-pink-700 transition-all font-semibold"
              >
                Add JIRA Project
              </button>
            </div>
          ) : (
            /* Grouped Connections List */
            <div className="space-y-6">
              {Object.entries(groupedConnections).map(([jiraUrl, urlConnections]) => (
                <div key={jiraUrl} className="space-y-3">
                  {/* JIRA URL Header */}
                  <div className="flex items-center gap-3 pb-2 border-b border-white/10">
                    <div className="w-8 h-8 rounded bg-blue-500/20 flex items-center justify-center flex-shrink-0">
                      <svg className="w-4 h-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9v-9m0-9v9" />
                      </svg>
                    </div>
                    <div className="flex-1">
                      <h3 className="text-white font-medium text-sm">{jiraUrl}</h3>
                      <p className="text-xs text-gray-500">{urlConnections.length} project{urlConnections.length !== 1 ? 's' : ''}</p>
                    </div>
                  </div>

                  {/* Projects under this JIRA URL */}
                  <div className="space-y-2 ml-4">
                    {urlConnections.map((connection) => {
                      const isActiveInThisChat = activeProjectId === connection.id;
                      const isSelected = selectedProjectId === connection.id;
                      
                      return (
                        <div
                          key={connection.id}
                          className={`p-3 rounded-lg border transition-colors cursor-pointer ${
                            isSelected
                              ? 'bg-purple-500/20 border-purple-500/50' 
                              : isActiveInThisChat 
                                ? 'bg-green-500/10 border-green-500/30' 
                                : 'bg-[#0a0a0f] border-white/10 hover:border-white/20'
                          }`}
                          onClick={() => handleSelectProject(connection.id)}
                        >
                          <div className="flex items-start justify-between">
                            {/* Project Info */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <h4 className="text-white font-medium text-sm">{connection.custom_fields?.project_info?.name || connection.project_key}</h4>
                                <span className="text-xs text-gray-500 font-mono">({connection.project_key})</span>
                                {isActiveInThisChat && (
                                  <span className="px-2 py-0.5 text-xs rounded border bg-green-500/20 text-green-400 border-green-500/30">
                                    Currently Active
                                  </span>
                                )}
                                {isSelected && !isActiveInThisChat && (
                                  <span className="px-2 py-0.5 text-xs rounded border bg-purple-500/20 text-purple-400 border-purple-500/30">
                                    Selected
                                  </span>
                                )}
                              </div>

                              {/* Project Details */}
                              <div className="grid grid-cols-2 gap-2 text-xs text-gray-500 mt-2">
                                <div>
                                  <span className="text-gray-400">Issue Type:</span> {connection.issue_type || 'Story'}
                                </div>
                                <div>
                                  <span className="text-gray-400">Auth:</span> {connection.custom_fields?.auth_type === 'api_token' ? 'API Token' : 'OAuth'}
                                </div>
                                {connection.custom_fields?.server_info && (
                                  <>
                                    <div>
                                      <span className="text-gray-400">Version:</span> {connection.custom_fields.server_info.version}
                                    </div>
                                    <div>
                                      <span className="text-gray-400">Type:</span> {connection.custom_fields.project_info?.projectTypeKey || 'N/A'}
                                    </div>
                                  </>
                                )}
                              </div>
                            </div>

                            {/* Actions */}
                            <div className="flex items-center gap-2 ml-3">
                              {isSelected && (
                                <div className="w-5 h-5 rounded-full bg-purple-500 flex items-center justify-center">
                                  <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                  </svg>
                                </div>
                              )}
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteConnection(connection.id);
                                }}
                                disabled={deletingId === connection.id}
                                className="p-1.5 text-gray-400 hover:text-red-400 transition-colors disabled:opacity-50"
                                title="Delete connection"
                              >
                                {deletingId === connection.id ? (
                                  <div className="w-3 h-3 border border-gray-400/30 border-t-gray-400 rounded-full animate-spin"></div>
                                ) : (
                                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                  </svg>
                                )}
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Enhanced Footer */}
        <div className="bg-gradient-to-r from-[#0a0a0f] to-[#16161e] border-t border-white/10">
          {/* Status Bar */}
          <div className="px-4 py-3 border-b border-white/5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                {/* Connection Count with Badge */}
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-green-500 flex items-center justify-center">
                      <span className="text-white text-xs font-bold">{connections.length}</span>
                    </div>
                    <span className="text-xs text-gray-400">
                      {connections.length === 1 ? 'project' : 'projects'} connected
                    </span>
                  </div>
                  
                  {/* Active Project Info */}
                  {activeProjectId && (
                    <div className="flex items-center gap-2 px-2 py-1 bg-purple-500/20 rounded-full border border-purple-500/30">
                      <div className="w-1.5 h-1.5 rounded-full bg-purple-400"></div>
                      <span className="text-xs text-purple-300">
                        Active: {(() => {
                          const activeProjectInfo = getActiveProjectInfo(connections);
                          return activeProjectInfo.success ? activeProjectInfo.projectName : 'Unknown';
                        })()}
                      </span>
                    </div>
                  )}
                </div>
                
                {/* Status Indicator */}
                {hasUnsavedChanges && (
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-amber-400 animate-pulse"></div>
                    <span className="text-xs text-amber-400 font-medium">Unsaved changes</span>
                  </div>
                )}
                
                {!hasUnsavedChanges && connections.length > 0 && (
                  <div className="flex items-center gap-2">
                    <svg className="w-3 h-3 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span className="text-xs text-green-400">All changes saved</span>
                  </div>
                )}
              </div>
              
              {/* Quick Stats */}
              <div className="flex items-center gap-4 text-xs text-gray-500">
                <span>{Object.keys(groupedConnections).length} JIRA instance{Object.keys(groupedConnections).length !== 1 ? 's' : ''}</span>
              </div>
            </div>
          </div>
          
          {/* Action Bar */}
          <div className="px-4 py-4">
            <div className="flex items-center justify-between">
              {/* Left Actions */}
              <div className="flex items-center gap-3">
                <button
                  onClick={onClose}
                  className="px-4 py-2 text-gray-400 hover:text-white transition-all duration-200 text-sm font-medium rounded-lg hover:bg-white/5"
                >
                  Close
                </button>
              </div>
              
              {/* Right Actions */}
              <div className="flex items-center gap-3">
                {hasUnsavedChanges && (
                  <>
                    <button
                      onClick={handleCancelChanges}
                      className="px-4 py-2 text-gray-400 hover:text-white transition-all duration-200 text-sm font-medium rounded-lg hover:bg-white/5 border border-white/10 hover:border-white/20"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSaveChanges}
                      disabled={saving}
                      className="px-5 py-2 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-lg hover:from-green-700 hover:to-emerald-700 transition-all duration-200 font-semibold text-sm flex items-center gap-2 shadow-lg hover:shadow-green-500/25 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {saving ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                          Applying...
                        </>
                      ) : (
                        <>
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                          Apply Changes
                        </>
                      )}
                    </button>
                  </>
                )}
                
                <button
                  onClick={handleAddNewProject}
                  className="px-5 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg hover:from-purple-700 hover:to-pink-700 transition-all duration-200 font-semibold text-sm flex items-center gap-2 shadow-lg hover:shadow-purple-500/25"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Add New Project
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  // Use portal to render modal at root level, outside of sidebar
  return createPortal(
    <>
      {modalContent}
      <ConfirmationModal
        isOpen={confirmationState.isOpen}
        onClose={confirmationState.onCancel}
        onConfirm={confirmationState.onConfirm}
        title={confirmationState.title}
        message={confirmationState.message}
        confirmText={confirmationState.confirmText}
        cancelText={confirmationState.cancelText}
        type={confirmationState.type}
        icon={confirmationState.icon}
        details={confirmationState.details}
      />
    </>,
    document.body
  );
};

export default JiraProjectManagementModal;
