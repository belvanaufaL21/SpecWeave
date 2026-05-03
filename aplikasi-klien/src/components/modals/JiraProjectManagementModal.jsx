import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { jiraService } from '../../services/jiraService';
import { useConfirmation } from '../../hooks/useConfirmation';
import ConfirmationModal from '../common/ConfirmationModal';
import DeleteConfirmationModal from './DeleteConfirmationModal';
import projectStateManager from '../../utils/managers/ProjectStateManager.js';
import { getActiveProjectInfo } from '../../utils/helpers/activeProjectHelpers';
import { calculateTokenStatus, getTokenStatusBadgeClasses } from '../../utils/helpers/jiraTokenHelpers';

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
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [connectionToDelete, setConnectionToDelete] = useState(null);

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
        
        loadActiveProjectContext();
      }
    };

    const handleActiveProjectUpdate = (e) => {
      
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
    
    setPendingActiveProject(connectionId);
    const chatId = getCurrentChatId();
    const currentActive = activeProjectPerChat[chatId];

    const hasChanges = connectionId !== currentActive;
    setHasUnsavedChanges(hasChanges);

  };

  const handleSaveChanges = async () => {
    if (!pendingActiveProject) {
      console.warn('🚫 [PROJECT-MODAL] No pending project to save');
      return;
    }
    
    const chatId = getCurrentChatId();
    const currentActive = activeProjectPerChat[chatId];

    // Show modern confirmation if project is changing and there might be Epic context
    if (pendingActiveProject !== currentActive) {
      const selectedProject = connections.find(conn => conn.id === pendingActiveProject);
      const projectName = selectedProject?.project_name || selectedProject?.project_key || 'Unknown';
      const projectDisplayName = selectedProject?.project_key && selectedProject?.project_name
        ? `${projectName} (${selectedProject.project_key})` 
        : projectName;

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
      const result = await projectStateManager.setActiveProject(pendingActiveProject, selectedProject);

      if (result.success) {
        // Update local state immediately (global active project)
        setActiveProjectPerChat({ global: pendingActiveProject });
        
        setHasUnsavedChanges(false);
        
        const projectName = result.data.projectName;
        const projectChanged = result.data.projectChanged;
        setSuccess(`Project "${projectName}" is now active globally!`);

        // ENHANCED: Close modal immediately after successful save
        console.log('🚪 [PROJECT-MODAL] Closing modal immediately after successful save');
        onClose();
        
        // Continue background processes without blocking modal close
        if (projectChanged) {
          
          // Wait for Epic context clear confirmation in background (non-blocking)
          const clearConfirmationPromise = new Promise((resolve) => {
            const timeout = setTimeout(() => {
              console.warn('⚠️ [PROJECT-MODAL] Epic clear confirmation timeout (background)');
              resolve();
            }, 2000);
            
            const handleClearConfirmation = (event) => {
              
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
    const projectName = connection?.project_name || connection?.project_key || 'this project';
    const projectDisplayName = connection?.project_key && connection?.project_name
      ? `${projectName} (${connection.project_key})`
      : projectName;
    
    setConnectionToDelete({ id: connectionId, name: projectDisplayName, connection });
    setIsDeleteModalOpen(true);
  };

  const confirmDeleteConnection = async () => {
    if (!connectionToDelete) return;

    const { id: connectionId, connection } = connectionToDelete;
    
    // Get project name from connection object
    const projectName = connection?.custom_fields?.project_info?.name || 
                       connection?.project_name || 
                       connection?.project_key || 
                       'Unknown Project';

    try {
      setDeletingId(connectionId);
      setError(null);
      
      console.log(`🎯 [PROJECT-MODAL] Starting smooth delete for: ${connectionId}`);
      
      // SMOOTH DELETE: Use JiraContext deleteConnection if available
      if (window.jiraContext && window.jiraContext.deleteConnection) {
        console.log('🎯 [PROJECT-MODAL] Using JiraContext smooth delete');
        
        const result = await window.jiraContext.deleteConnection(connectionId);
        
        if (result.success) {
          console.log('✅ [PROJECT-MODAL] Smooth delete successful');
          
          // Update local state immediately (optimistic update)
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
          }
          
          setSuccess(`Connection to "${projectName}" removed successfully`);
          
          // Close modal after short delay for smooth UX
          setTimeout(() => {
            onClose();
          }, 1500);
          
        } else {
          console.error('❌ [PROJECT-MODAL] Smooth delete failed:', result.error);
          setError(result.error || 'Failed to delete connection');
        }
        
      } else {
        // FALLBACK: Use original jiraService method
        console.log('🔄 [PROJECT-MODAL] Fallback to jiraService delete');
        
        const result = await jiraService.deleteConnection(connectionId);
        
        if (result.success) {
          console.log(`✅ [PROJECT-MODAL] Connection deleted successfully: ${connectionId}`);
          
          // Remove from local state immediately
          setConnections(prev => {
            const updated = prev.filter(conn => conn.id !== connectionId);
            console.log(`🔄 [PROJECT-MODAL] Updated local connections count: ${updated.length}`);
            return updated;
          });
          
          // Clear from active project if it was the active one
          const chatId = getCurrentChatId();
          const currentActive = activeProjectPerChat[chatId];
          if (currentActive === connectionId) {
            console.log(`🧹 [PROJECT-MODAL] Clearing active project for chat: ${chatId}`);
            setActiveProjectPerChat(prev => ({
              ...prev,
              [chatId]: null
            }));
            setPendingActiveProject(null);
            
            // Clear from localStorage
            await jiraService.setActiveProjectForChat(chatId, null);
          }
          
          // Dispatch events for other components
          window.dispatchEvent(new CustomEvent('jiraConnectionDeleted', {
            detail: { 
              connectionId, 
              projectName: projectName,
              updatedConnections: connections.filter(conn => conn.id !== connectionId),
              timestamp: Date.now()
            }
          }));
          
          setSuccess(`Connection to "${projectName}" deleted successfully`);
          
          // Auto-hide success message and close modal
          setTimeout(() => {
            setSuccess(null);
            onClose();
          }, 2000);
          
        } else {
          console.error(`❌ [PROJECT-MODAL] Delete failed:`, result.error);
          setError(result.error || 'Failed to delete connection');
        }
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
      <div className="bg-[#09090A] border border-white/5 rounded-xl w-full max-w-2xl max-h-[80vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-white/5">
          <div>
            <h2 className="text-lg font-semibold text-white">JIRA Project Management</h2>
            <p className="text-sm text-gray-400 mt-1">
              Kelola project JIRA yang terhubung
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
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-[#0D0D0D] flex items-center justify-center">
                <svg className="w-8 h-8 text-white/50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                </svg>
              </div>
              <p className="text-gray-400 mb-2">Tidak ada koneksi JIRA</p>
              <p className="text-sm text-gray-500">
                Hubungkan project JIRA pertama Anda untuk memulai
              </p>
            </div>
          ) : (
            /* Grouped Connections List */
            <div className="space-y-6">
              {Object.entries(groupedConnections).map(([jiraUrl, urlConnections]) => (
                <div key={jiraUrl} className="space-y-3">
                  {/* JIRA URL Header */}
                  <div className="flex items-center gap-3 pb-2 border-b border-white/5">
                    <div className="w-8 h-8 rounded bg-[#160D14] border border-[#44273D] flex items-center justify-center flex-shrink-0">
                      <svg className="w-3.5 h-3.5 text-white" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M11.571 11.513H0a5.218 5.218 0 0 0 5.232 5.215h2.13v2.057A5.215 5.215 0 0 0 12.575 24V12.518a1.005 1.005 0 0 0-1.005-1.005zm5.723-5.756H5.736a5.215 5.215 0 0 0 5.215 5.214h2.129v2.058a5.218 5.218 0 0 0 5.215 5.214V6.758a1.001 1.001 0 0 0-1.001-1.001zM23.013 0H11.455a5.215 5.215 0 0 0 5.215 5.215h2.129v2.057A5.215 5.215 0 0 0 24 12.483V1.005A1.001 1.001 0 0 0 23.013 0z"/>
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
                      
                      // Calculate token status
                      const tokenStatus = calculateTokenStatus(connection.token_expires_at);
                      const statusBadgeClasses = getTokenStatusBadgeClasses(tokenStatus.type);
                      
                      return (
                        <div
                          key={connection.id}
                          className={`p-3 rounded-lg border transition-colors cursor-pointer ${
                            isSelected
                              ? 'bg-[#09090A] border-purple-500/50' 
                              : isActiveInThisChat 
                                ? 'bg-[#09090A] border-green-500/30' 
                                : 'bg-[#09090A] border-white/5 hover:bg-[#0D0D0D] hover:border-white/5'
                          }`}
                          onClick={() => handleSelectProject(connection.id)}
                        >
                          <div className="flex items-start justify-between">
                            {/* Project Info */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1 flex-wrap">
                                <h4 className="text-white font-medium text-sm">{connection.project_name || connection.project_key}</h4>
                                {connection.project_name && connection.project_key && (
                                  <span className="text-xs text-gray-400 font-mono">({connection.project_key})</span>
                                )}
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
                                {/* Token Status Badge */}
                                {tokenStatus.type !== 'unknown' && (
                                  <span className={statusBadgeClasses.container} title={`Token expires: ${connection.token_expires_at ? new Date(connection.token_expires_at).toLocaleDateString() : 'Unknown'}`}>
                                    <span className={statusBadgeClasses.icon}>{tokenStatus.icon}</span>
                                    <span>{tokenStatus.label}</span>
                                  </span>
                                )}
                              </div>

                              {/* Project Details */}
                              <div className="grid grid-cols-2 gap-2 text-xs text-gray-500 mt-2">
                                <div>
                                  <span className="text-gray-400">Issue Type:</span> {connection.issue_type || 'Story'}
                                </div>
                                <div>
                                  <span className="text-gray-400">Auth:</span> API Token
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
                                className="p-1.5 transition-colors disabled:opacity-50"
                                style={{ color: deletingId === connection.id ? '#9ca3af' : '#EE4038' }}
                                onMouseEnter={(e) => {
                                  if (deletingId !== connection.id) {
                                    e.currentTarget.style.color = '#f1554d';
                                  }
                                }}
                                onMouseLeave={(e) => {
                                  if (deletingId !== connection.id) {
                                    e.currentTarget.style.color = '#EE4038';
                                  }
                                }}
                                title="Delete connection"
                              >
                                {deletingId === connection.id ? (
                                  <div className="w-4 h-4 border border-gray-400/30 border-t-gray-400 rounded-full animate-spin"></div>
                                ) : (
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
        <div className="bg-[#09090A] border-t border-white/5">
          {/* Action Bar */}
          <div className="px-4 py-4">
            <div className="flex items-center justify-between">
              {/* Left Actions - Empty now */}
              <div className="flex items-center gap-3">
              </div>
              
              {/* Right Actions */}
              <div className="flex items-center gap-3">
                {hasUnsavedChanges && (
                  <>
                    <button
                      onClick={handleCancelChanges}
                      className="px-4 py-2 text-gray-400 hover:text-white transition-all duration-200 text-sm font-medium rounded-lg hover:bg-white/5 border border-white/5 hover:border-white/20"
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
                  className="px-5 py-2 bg-[#160D14] border border-[#44273D] text-[#FF7AD0] rounded-lg hover:bg-[#1a1016] transition-all duration-200 text-sm flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Tambah Project
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
      <DeleteConfirmationModal
        isOpen={isDeleteModalOpen}
        onClose={() => {
          setIsDeleteModalOpen(false);
          setConnectionToDelete(null);
        }}
        onConfirm={confirmDeleteConnection}
        title="Hapus Koneksi JIRA"
        message="Apakah Anda yakin ingin menghapus koneksi ini? Semua Epic context yang tersimpan untuk project ini akan hilang."
        itemName={connectionToDelete?.name}
        confirmText="Hapus"
        cancelText="Batal"
      />
    </>,
    document.body
  );
};

export default JiraProjectManagementModal;
