import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { jiraService } from '../../services/jiraService';
import { useConfirmation } from '../../hooks/useConfirmation';
import ConfirmationModal from '../common/ConfirmationModal';
import DeleteConfirmationModal from './DeleteConfirmationModal';
import projectStateManager from '../../utils/managers/ProjectStateManager.js';
import { calculateTokenStatus, getTokenStatusBadgeClasses } from '../../utils/helpers/jiraTokenHelpers';

const JiraProjectManagementModal = ({ isOpen, onClose, onAddNewProject }) => {
  const [connections, setConnections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [activeProjectPerChat, setActiveProjectPerChat] = useState({});
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [connectionToDelete, setConnectionToDelete] = useState(null);

  // Use confirmation modal hook
  const { confirmationState, showConfirmation } = useConfirmation();

  // Load connections saat modal dibuka
  useEffect(() => {
    if (isOpen) {
      loadConnections();
      // Clear previous messages when modal opens
      setError(null);
      setSuccess(null);
    }
  }, [isOpen]);

  // Deteksi active project SETELAH connections selesai dimuat
  useEffect(() => {
    if (isOpen && connections.length > 0) {
      detectActiveProject(connections);
    }
  }, [isOpen, connections]);

  // Listen for storage changes and active project updates
  useEffect(() => {
    const handleStorageChange = (e) => {
      if (e.key === 'activeProjectsPerChat' || e.key?.includes('specweave_active_project')) {
        if (connections.length > 0) {
          detectActiveProject(connections);
        }
      }
    };

    const handleActiveProjectUpdate = (e) => {
      const { chatId, projectId } = e.detail;

      setActiveProjectPerChat(prev => ({
        ...prev,
        [chatId]: projectId
      }));
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('activeProjectUpdated', handleActiveProjectUpdate);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('activeProjectUpdated', handleActiveProjectUpdate);
    };
  }, [connections]);

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

  /**
   * Deteksi project aktif dengan urutan fallback:
   * 1. Per-chat localStorage (`activeProjectsPerChat`)
   * 2. Connection dengan flag `is_active === true`
   * 3. Service `getActiveProjectForChat` (best-effort)
   */
  const detectActiveProject = async (conns) => {
    try {
      const chatId = getCurrentChatId();
      const activeProjects = JSON.parse(localStorage.getItem('activeProjectsPerChat') || '{}');
      let activeProjectId = activeProjects[chatId];

      // Validasi: pastikan project masih ada di connections
      if (activeProjectId && !conns.find(c => c.id === activeProjectId)) {
        activeProjectId = null;
      }

      // Fallback 1: cari connection dengan is_active === true
      if (!activeProjectId) {
        const globalActive = conns.find(c => c.is_active === true);
        if (globalActive) {
          activeProjectId = globalActive.id;
          // Persist ke localStorage agar konsisten dengan indicator
          const updated = { ...activeProjects, [chatId]: activeProjectId };
          localStorage.setItem('activeProjectsPerChat', JSON.stringify(updated));
        }
      }

      // Fallback 2: tanyakan ke service (best-effort)
      if (!activeProjectId) {
        try {
          const result = await jiraService.getActiveProjectForChat(chatId);
          if (result.success && result.data) {
            const candidateId = result.data.projectId;
            if (conns.find(c => c.id === candidateId)) {
              activeProjectId = candidateId;
            }
          }
        } catch (svcErr) {
          // Service call optional, lanjut tanpa error
        }
      }

      if (activeProjectId) {
        setActiveProjectPerChat(prev => ({
          ...prev,
          [chatId]: activeProjectId
        }));
        console.log('✅ [PROJECT-MODAL] Active project detected:', activeProjectId);
      } else {
        console.log('ℹ️ [PROJECT-MODAL] No active project detected');
      }
    } catch (err) {
      console.warn('Could not detect active project:', err.message);
    }
  };

  const getCurrentChatId = () => {
    // Get chat ID from URL or use default
    const currentPath = window.location.pathname;
    const pathSegments = currentPath.split('/').filter(Boolean);

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

  const handleSelectProject = async (connectionId) => {
    const chatId = getCurrentChatId();
    const currentActive = activeProjectPerChat[chatId];

    // Jika sudah aktif, tidak perlu konfirmasi
    if (connectionId === currentActive) {
      console.log('🔵 [PROJECT-MODAL] Project already active, no action needed');
      return;
    }

    // Langsung tampilkan konfirmasi
    const selectedProject = connections.find(conn => conn.id === connectionId);
    const projectName = selectedProject?.project_name || selectedProject?.project_key || 'Unknown';

    const confirmed = await showConfirmation({
      type: 'warning',
      title: 'Ganti Project JIRA',
      message: `Mengganti project aktif ke "${projectName}" akan menghapus Epic yang dipilih untuk chat ini.`,
      confirmText: 'Lanjutkan',
      cancelText: 'Batal'
    });

    if (!confirmed) {
      console.log('🚫 [PROJECT-MODAL] User cancelled project change');
      return;
    }

    // Langsung save tanpa pending state
    try {
      setLoading(true);
      setError(null);
      setSuccess(null);

      if (!selectedProject) {
        setError('Selected project not found');
        return;
      }

      console.log('🔄 [PROJECT-MODAL] Changing project to:', {
        connectionId,
        projectName,
        projectKey: selectedProject.project_key
      });

      // Set active project via ProjectStateManager
      // ProjectStateManager akan handle Epic clearing secara otomatis
      const result = await projectStateManager.setActiveProject(connectionId, selectedProject);

      if (result.success) {
        console.log('✅ [PROJECT-MODAL] Project changed successfully');

        // Update local state immediately
        setActiveProjectPerChat(prev => ({
          ...prev,
          [chatId]: connectionId
        }));

        // CRITICAL: Save to localStorage for per-chat active project
        const activeProjects = JSON.parse(localStorage.getItem('activeProjectsPerChat') || '{}');
        activeProjects[chatId] = connectionId;
        localStorage.setItem('activeProjectsPerChat', JSON.stringify(activeProjects));
        
        // CRITICAL FIX: Save timestamp to prevent race condition with cleanupInvalidActiveProjects
        // This ensures cleanup won't revert our changes for 10 seconds
        const saveTimestamp = Date.now();
        localStorage.setItem('activeProjectsPerChat_timestamp', saveTimestamp.toString());
        console.log('💾 [PROJECT-MODAL] Saved to localStorage with timestamp:', { chatId, connectionId, timestamp: saveTimestamp });

        // CRITICAL: Persist to backend API untuk update is_active flag di database
        // Ini memastikan saat refresh, backend akan return project yang benar
        try {
          await jiraService.setActiveProjectForChat(chatId, connectionId);
          console.log('💾 [PROJECT-MODAL] Saved to backend API:', { chatId, connectionId });
        } catch (apiError) {
          console.warn('⚠️ [PROJECT-MODAL] Failed to save to backend API:', apiError.message);
          // Tidak blocking, localStorage sudah tersimpan
        }

        const resolvedProjectName = result.data?.projectName || projectName;

        // Dispatch multiple events untuk memastikan semua komponen terupdate
        console.log('📢 [PROJECT-MODAL] Dispatching update events');

        // Event 1: activeProjectUpdated (untuk JIRA indicator)
        window.dispatchEvent(new CustomEvent('activeProjectUpdated', {
          detail: {
            chatId,
            projectId: connectionId,
            projectName: selectedProject.project_name || selectedProject.project_key,
            projectKey: selectedProject.project_key,
            connection: selectedProject,
            timestamp: Date.now()
          }
        }));

        // Event 2: activeProjectChanged (untuk ProjectStateManager listeners)
        window.dispatchEvent(new CustomEvent('activeProjectChanged', {
          detail: {
            projectId: connectionId,
            projectKey: selectedProject.project_key,
            projectName: resolvedProjectName,
            projectChanged: true, // Selalu true karena user memilih project berbeda
            timestamp: Date.now()
          }
        }));

        // Event 3: storage event (untuk cross-tab sync)
        window.dispatchEvent(new StorageEvent('storage', {
          key: 'activeProjectsPerChat',
          newValue: JSON.stringify(activeProjects),
          url: window.location.href
        }));

        // Force refresh JIRA context (multiple times untuk memastikan)
        if (window.jiraContext) {
          console.log('🔄 [PROJECT-MODAL] Refreshing JIRA context');

          // Refresh connections
          if (window.jiraContext.refreshConnections) {
            await window.jiraContext.refreshConnections(true);
          }

          // Selalu clear Epic context karena user memilih project lain
          if (window.jiraContext.clearEpicContext) {
            console.log('🧹 [PROJECT-MODAL] Clearing epic context due to project change');
            await window.jiraContext.clearEpicContext();
          }

          // Force refresh all
          if (window.jiraContext.refreshAll) {
            setTimeout(() => {
              window.jiraContext.refreshAll();
            }, 100);
          }
        }

        setSuccess(`Project "${resolvedProjectName}" sekarang aktif!`);

        // Close modal after short delay.
        // CATATAN: window.location.reload() sengaja DIHAPUS. Reload memaksa
        // re-init state dari sumber yang belum tentu sinkron (race antara
        // backend save dan cleanupInvalidActiveProjects di JiraContext yang
        // dapat me-revert localStorage berdasarkan flag is_active lama).
        // Event yang sudah di-dispatch di atas (activeProjectUpdated,
        // activeProjectChanged, storage) plus refreshConnections() dan
        // clearEpicContext() langsung sudah cukup untuk meng-update
        // JiraStatusIndicator, JiraContext, dan EpicSelectionModal.
        setTimeout(() => {
          onClose();
        }, 1500);

      } else {
        console.error('❌ [PROJECT-MODAL] Failed to set active project:', result.error);
        setError(result.error || 'Failed to set active project');
      }
    } catch (err) {
      console.error('❌ [PROJECT-MODAL] Project save error:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
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
                      const isSelected = activeProjectId === connection.id;

                      // Calculate token status
                      const tokenStatus = calculateTokenStatus(connection.token_expires_at);
                      const statusBadgeClasses = getTokenStatusBadgeClasses(tokenStatus.type);

                      return (
                        <div
                          key={connection.id}
                          className={`p-3 rounded-lg border transition-all cursor-pointer ${
                            isSelected
                              ? 'bg-[#160D14] border-[#44273D] ring-1 ring-[#FF7AD0]/30'
                              : 'bg-[#09090A] border-white/5 hover:bg-[#0D0D0D] hover:border-white/10'
                          }`}
                          onClick={() => handleSelectProject(connection.id)}
                        >
                          <div className="flex items-start justify-between">
                            {/* Project Info */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1 flex-wrap">
                                <h4 className="text-white font-medium text-sm">
                                  {connection.project_name || connection.project_key}
                                </h4>
                                {connection.project_name && connection.project_key && (
                                  <span className="text-xs text-gray-400 font-mono">
                                    ({connection.project_key})
                                  </span>
                                )}

                                {/* Token Status Badge */}
                                {tokenStatus.type !== 'unknown' && (
                                  <span
                                    className={statusBadgeClasses.container}
                                    title={`Token expires: ${connection.token_expires_at ? new Date(connection.token_expires_at).toLocaleDateString() : 'Unknown'}`}
                                  >
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
                              {/* Radio indicator - Enhanced with pink/purple theme */}
                              <div
                                className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all flex-shrink-0 ${
                                  isSelected
                                    ? 'bg-gradient-to-br from-[#FF7AD0]/20 to-[#FF7AD0]/10 border-[#FF7AD0] shadow-lg shadow-[#FF7AD0]/20'
                                    : 'border-white/20 hover:border-white/40'
                                }`}
                                title={isSelected ? 'Project aktif' : 'Klik untuk memilih'}
                              >
                                {isSelected && (
                                  <div className="w-3 h-3 rounded-full bg-[#FF7AD0] animate-pulse"></div>
                                )}
                              </div>

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

        {/* Footer */}
        <div className="bg-[#09090A] border-t border-white/5">
          <div className="px-4 py-4 flex justify-end">
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