import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { jiraService } from '../../services/jiraService';
import projectStateManager from '../../utils/managers/ProjectStateManager.js';
import {
  BUTTON_LABELS,
  PAGE_TITLES,
  FORM_LABELS,
  STATUS_MESSAGES,
  PLACEHOLDERS,
  CONFIRMATIONS,
  DESCRIPTIONS,
  EMPTY_STATES,
  EPIC_LABELS,
  formatDate,
  formatRelativeTime
} from '../../utils/localization/index.js';

/**
 * Helper konsisten dengan JiraProjectManagementModal & JiraStatusIndicator.
 * Wajib menghasilkan chatId yang sama agar membaca entry localStorage
 * `activeProjectsPerChat` yang sama.
 */
const getCurrentChatId = () => {
  const currentPath = window.location.pathname;
  const pathSegments = currentPath.split('/').filter(Boolean);

  if (currentPath.includes('/chat')) {
    const chatId = pathSegments[pathSegments.length - 1];
    return chatId && chatId !== 'chat' ? chatId : 'default-chat';
  }
  if (currentPath.includes('/dashboard')) {
    return 'dashboard-default';
  }
  return 'default-chat';
};

/**
 * Resolusi project aktif dengan urutan fallback yang sama dengan
 * JiraStatusIndicator. Ini source of truth tunggal untuk Epic modal.
 *
 * Urutan:
 *   1. Per-chat localStorage (`activeProjectsPerChat[chatId]`)
 *   2. Connection dengan flag `is_active === true`
 *   3. Connection dengan project_key cocok dengan `selectedProjectKey` prop
 *   4. Connection pertama
 */
const resolveActiveConnection = (connections, selectedProjectKey) => {
  if (!Array.isArray(connections) || connections.length === 0) return null;

  // 1. Per-chat localStorage
  try {
    const chatId = getCurrentChatId();
    const activeProjects = JSON.parse(localStorage.getItem('activeProjectsPerChat') || '{}');
    const activeProjectId = activeProjects[chatId];
    if (activeProjectId) {
      const found = connections.find(c => c && c.id === activeProjectId);
      if (found) return found;
    }
  } catch (e) {
    // localStorage parse gagal, lanjut ke fallback
  }

  // 2. is_active flag
  const globalActive = connections.find(c => c && c.is_active === true);
  if (globalActive) return globalActive;

  // 3. selectedProjectKey prop
  if (selectedProjectKey) {
    const byKey = connections.find(c => c && c.project_key === selectedProjectKey);
    if (byKey) return byKey;
  }

  // 4. fallback connection pertama
  return connections.find(c => c && c.project_key && c.jira_url) || null;
};

const EpicSelectionModal = ({ isOpen, onClose, onEpicSelected, selectedProjectKey = null }) => {
  const [jiraConnections, setJiraConnections] = useState([]);
  const [selectedConnection, setSelectedConnection] = useState(null);
  const [selectedProject, setSelectedProject] = useState(selectedProjectKey);
  const [epics, setEpics] = useState([]);
  const [selectedEpic, setSelectedEpic] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [step, setStep] = useState('loading'); // 'loading' | 'connection' | 'epic' | 'confirm'
  const [isLoadingEpics, setIsLoadingEpics] = useState(false); // Guard untuk prevent infinite loop

  // Load JIRA connections on modal open
  useEffect(() => {
    if (isOpen) {
      console.log('🔄 [EPIC-MODAL] Modal opened, loading connections...');
      setStep('loading');
      setSelectedEpic(null);
      setError(null);
      setSearchQuery('');
      loadActiveConnectionAndEpics();
    }
  }, [isOpen, selectedProjectKey]);

  // Listen for active project changes — reload saat project diganti dari modal lain
  useEffect(() => {
    const handleActiveProjectChange = (event) => {
      console.log('🔔 [EPIC-MODAL] Active project changed:', event.detail);
      
      // GUARD: Jangan reload jika sedang loading atau modal tidak terbuka
      if (!isOpen || isLoadingEpics) {
        console.log('⏭️ [EPIC-MODAL] Skipping reload (modal closed or already loading)');
        return;
      }

      // GUARD: Jika projectId sama dengan selectedConnection, skip reload
      if (selectedConnection && event.detail?.projectId === selectedConnection.id) {
        console.log('⏭️ [EPIC-MODAL] Skipping reload (same project)');
        return;
      }

      console.log('🔄 [EPIC-MODAL] Reloading due to external project change');
      loadActiveConnectionAndEpics();
    };

    window.addEventListener('activeProjectChanged', handleActiveProjectChange);
    window.addEventListener('activeProjectUpdated', handleActiveProjectChange);

    return () => {
      window.removeEventListener('activeProjectChanged', handleActiveProjectChange);
      window.removeEventListener('activeProjectUpdated', handleActiveProjectChange);
    };
  }, [isOpen, isLoadingEpics, selectedConnection]);

  /**
   * Load active connection menggunakan source of truth yang sama dengan
   * JiraStatusIndicator dan JiraProjectManagementModal.
   *
   * Mengganti `loadJiraConnectionsWithProjectManager` lama yang membaca dari
   * `projectStateManager.getActiveProject()` — yang ternyata tidak ter-sync
   * dengan localStorage saat user ganti project.
   */
  const loadActiveConnectionAndEpics = async () => {
    // GUARD: Prevent concurrent loads
    if (isLoadingEpics) {
      console.log('⏭️ [EPIC-MODAL] Already loading, skipping...');
      return;
    }

    try {
      setIsLoadingEpics(true);
      setLoading(true);
      setError(null);

      const connectionsResult = await jiraService.getConnections();

      if (!connectionsResult.success || !connectionsResult.data || connectionsResult.data.length === 0) {
        setError('No JIRA connections found. Please set up a JIRA connection first.');
        setStep('connection');
        return;
      }

      const allConnections = connectionsResult.data;
      setJiraConnections(allConnections);

      const targetConnection = resolveActiveConnection(allConnections, selectedProjectKey);

      if (!targetConnection) {
        setError('No active JIRA project found. Please select a project first.');
        setStep('connection');
        return;
      }

      console.log('✅ [EPIC-MODAL] Active connection resolved:', {
        id: targetConnection.id,
        project_key: targetConnection.project_key,
        project_name: targetConnection.project_name,
        source: 'localStorage / is_active'
      });

      // PENTING: Jangan panggil setActiveProject di sini!
      // Ini akan men-trigger event activeProjectChanged yang menyebabkan infinite loop.
      // ProjectStateManager sudah di-update oleh JiraProjectManagementModal.
      // Epic modal hanya perlu MEMBACA state, bukan MENULIS.

      setSelectedConnection(targetConnection);
      setSelectedProject(targetConnection.project_key);

      await loadEpics(targetConnection);
      setStep('epic');
    } catch (err) {
      console.error('❌ [EPIC-MODAL] Error loading connections:', err);
      setError(err.message || 'Failed to load JIRA connections');
      setStep('connection');
    } finally {
      setLoading(false);
      setIsLoadingEpics(false);
    }
  };

  // Load Epics for selected connection - Enhanced version with better error handling
  const loadEpics = async (connection) => {
    try {
      setLoading(true);
      setError(null);

      // Validate connection object
      if (!connection || !connection.id || !connection.project_key) {
        console.error('❌ [CLIENT-ENHANCED] Invalid connection object:', connection);
        setError('Invalid JIRA connection. Please select a valid connection.');
        setLoading(false);
        return;
      }

      console.log(`🔍 [CLIENT-ENHANCED] Loading Epics for connection:`, {
        id: connection.id,
        project_key: connection.project_key,
        jira_url: connection.jira_url
      });

      // Selalu pakai project_key dari connection yang sudah di-resolve.
      // Tidak lagi pakai selectedProject yang bisa stale.
      const targetProjectKey = connection.project_key;

      const result = await jiraService.getProjectEpics(connection.id, targetProjectKey);

      if (result.success) {
        let epicsData = Array.isArray(result.data) ? result.data : [];
        setEpics(epicsData);

        if (result.fallback && result.warning) {
          if (result.warning.includes('410') || result.warning.includes('Gone')) {
            setError(`JIRA API endpoint has been deprecated. Your JIRA instance may need to be updated, or the API version is no longer supported. Please contact your JIRA administrator.`);
          } else {
            setError(`Info: ${result.warning}`);
          }
        } else if (epicsData.length === 0) {
          console.log('ℹ️ [CLIENT-ENHANCED] No Epic issues found in project', {
            projectKey: targetProjectKey,
            projectName: connection.custom_fields?.project_info?.name
          });
          setError(null);
        } else {
          setError(null);
        }
      } else {
        const errorMsg = result.error || 'Failed to load Epics from JIRA';
        console.error(`❌ [CLIENT-ENHANCED] Epic fetch failed:`, errorMsg);

        if (errorMsg.includes('410') || errorMsg.includes('Gone')) {
          setError(`JIRA API endpoint is deprecated. Your JIRA instance may need to be updated. Please contact your JIRA administrator or try updating your JIRA connection.`);
        } else if (errorMsg.includes('401') || errorMsg.includes('Unauthorized')) {
          setError(`JIRA authentication failed. Please check your JIRA credentials and try reconnecting.`);
        } else if (errorMsg.includes('403') || errorMsg.includes('Forbidden')) {
          setError(`Access denied to JIRA project. Please check your JIRA permissions for project ${connection.project_key}.`);
        } else if (errorMsg.includes('404') || errorMsg.includes('Not Found')) {
          setError(`JIRA project ${connection.project_key} not found. Please verify the project key is correct.`);
        } else {
          setError(`Failed to connect to JIRA: ${errorMsg}`);
        }

        setEpics([]);
      }
    } catch (err) {
      const errorMsg = err.message || 'Network error while loading Epics';
      console.error('❌ [CLIENT-ENHANCED] Epic loading error:', err);

      if (errorMsg.includes('Failed to fetch') || errorMsg.includes('Network')) {
        setError(`Network error: Cannot connect to JIRA. Please check your internet connection and JIRA server status.`);
      } else {
        setError(`Unexpected error: ${errorMsg}`);
      }

      setEpics([]);
    } finally {
      setLoading(false);
    }
  };

  // Handle Epic selection
  const handleEpicSelect = (epic) => {
    setSelectedEpic(epic);
    setStep('confirm');
  };

  // Handle Epic confirmation
  const handleConfirmEpic = async () => {
    try {
      setLoading(true);
      setError(null);

      // Normalize epic data to ensure all required fields exist
      const normalizedEpic = {
        id: selectedEpic.id,
        key: selectedEpic.key,
        name: selectedEpic.name || selectedEpic.summary || selectedEpic.key,
        summary: selectedEpic.summary || selectedEpic.name || selectedEpic.key,
        ...selectedEpic // Keep other fields
      };

      console.log('📤 [EPIC-MODAL] Sending epic context:', {
        epicId: normalizedEpic.id,
        epicKey: normalizedEpic.key,
        epicName: normalizedEpic.name,
        connectionId: selectedConnection.id,
        projectKey: selectedConnection.project_key
      });

      const contextResult = await jiraService.setEpicContext(normalizedEpic.id, {
        epic: normalizedEpic,
        connection: selectedConnection,
        validatedAt: new Date().toISOString()
      });

      if (contextResult.success) {
        onEpicSelected({
          epic: selectedEpic,
          connection: selectedConnection
        });
        onClose();
      } else {
        setError(contextResult.error);
      }
    } catch (err) {
      console.error('❌ [EPIC-MODAL] Epic confirmation error:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Handle working without Epic
  const handleWorkWithoutEpic = async () => {
    try {
      setLoading(true);
      setError(null);

      console.log('📤 [EPIC-MODAL] Sending workWithoutEpic context:', {
        workWithoutEpic: true,
        connectionId: selectedConnection.id,
        projectKey: selectedConnection.project_key
      });

      const contextResult = await jiraService.setEpicContext(null, {
        epic: null,
        connection: selectedConnection,
        workWithoutEpic: true,
        validatedAt: new Date().toISOString()
      });

      if (contextResult.success) {
        console.log('✅ [EPIC-MODAL] Working without Epic, context set');
        onEpicSelected({
          epic: null,
          connection: selectedConnection,
          workWithoutEpic: true
        });
        onClose();
      } else {
        setError(contextResult.error || 'Failed to set context');
      }
    } catch (err) {
      console.error('❌ [EPIC-MODAL] Error in handleWorkWithoutEpic:', err);
      setError(err.message || 'An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  // Filter Epics based on search - ensure epics is always an array with safe property access
  const filteredEpics = (Array.isArray(epics) ? epics : []).filter(epic => {
    if (!epic) return false;
    const query = searchQuery.toLowerCase();
    const name = (epic.name || '').toLowerCase();
    const key = (epic.key || '').toLowerCase();
    const summary = (epic.summary || '').toLowerCase();
    return name.includes(query) || key.includes(query) || summary.includes(query);
  });

  // Get status badge color
  const getStatusColor = (status) => {
    return 'bg-[#0d0d0d] text-white/50 border-white/5';
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        <motion.div
          className="bg-[#09090A] border border-white/5 rounded-xl max-w-3xl w-full max-h-[85vh] overflow-hidden shadow-2xl"
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-white/5">
            <div>
              <h2 className="text-xl font-semibold text-white">{PAGE_TITLES.SELECT_EPIC}</h2>
              <p className="text-sm text-gray-400 mt-1">
                {DESCRIPTIONS.SELECT_EPIC_DESCRIPTION}
              </p>
              {selectedConnection && (
                <motion.div
                  className="inline-flex items-center gap-2 mt-3 px-3 py-2 bg-[#120C18] border border-[#2C1A43] rounded-lg w-fit"
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                >
                  <div className="w-2 h-2 bg-purple-500 rounded-full animate-pulse flex-shrink-0"></div>
                  <span className="text-xs text-[#C27AFF] font-medium whitespace-nowrap">
                    Active Project: {selectedConnection.project_name || selectedConnection.project_key}
                  </span>
                  {selectedConnection.project_name && selectedConnection.project_key && (
                    <span className="text-xs text-white/70 whitespace-nowrap">
                      ({selectedConnection.project_key})
                    </span>
                  )}
                  {/* URL hanya ditampilkan pada layar medium ke atas */}
                  <span className="hidden md:inline text-xs text-white/70 whitespace-nowrap">
                    • {selectedConnection.jira_url}
                  </span>
                </motion.div>
              )}
            </div>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-white transition-colors rounded-lg hover:bg-white/5"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[60vh]">
          {/* Error Display - Only show for actual errors, not empty Epic state */}
          {error && filteredEpics.length > 0 && (
            <div className="mb-4 p-4 bg-red-500/20 border border-red-500/30 rounded-lg">
              <div className="flex items-start gap-3">
                <svg className="w-5 h-5 text-red-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
                <div className="flex-1">
                  <h4 className="text-red-400 font-medium text-sm mb-1">Connection Issue</h4>
                  <div className="text-red-300 text-sm whitespace-pre-line">
                    {error}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Connection Error Display - Only for actual connection errors */}
          {error && step === 'epic' && filteredEpics.length === 0 && !error.includes('No Epic issues found') && (
            <div className="mb-4 p-4 bg-red-500/20 border border-red-500/30 rounded-lg">
              <div className="flex items-start gap-3">
                <svg className="w-5 h-5 text-red-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
                <div className="flex-1">
                  <h4 className="text-red-400 font-medium text-sm mb-1">Connection Issue</h4>
                  <div className="text-red-300 text-sm whitespace-pre-line">
                    {error}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Initial loading state */}
          {step === 'loading' && (
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-10 w-10 border-4 border-purple-500/20 border-t-purple-500 mb-4"></div>
              <p className="text-gray-400">Memuat koneksi JIRA...</p>
            </div>
          )}

          {/* Step 1: No Active Project Message */}
          {step === 'connection' && !loading && (
            <div className="text-center py-12">
              <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-[#0d0d0d] flex items-center justify-center">
                <svg className="w-8 h-8 text-white/50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-white mb-3">{EMPTY_STATES.NO_ACTIVE_PROJECT}</h3>
              <p className="text-gray-400 mb-6 max-w-md mx-auto">
                {EMPTY_STATES.NO_ACTIVE_PROJECT_DESC}
              </p>
            </div>
          )}

          {/* Loading state for connection step */}
          {step === 'connection' && loading && (
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-10 w-10 border-4 border-purple-500/20 border-t-purple-500 mb-4"></div>
              <p className="text-gray-400">Memuat koneksi JIRA...</p>
            </div>
          )}

          {/* Step 2: Epic Selection */}
          {step === 'epic' && (
            <div>
              {/* Search */}
              <div className="mb-4">
                <div className="relative">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder={PLACEHOLDERS.SEARCH_EPICS}
                    className="w-full px-4 py-3 pl-10 bg-[#0d0d0d] border border-white/5 rounded-lg text-white/30 placeholder-white/30 focus:outline-none focus:border-purple-500/50"
                  />
                  <svg className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  )}
                </div>
                {searchQuery && (
                  <p className="text-xs text-gray-500 mt-2">
                    {EPIC_LABELS.SHOWING_RESULTS} {filteredEpics.length} {EPIC_LABELS.OF_TOTAL} {epics.length} {EPIC_LABELS.EPIC_PLURAL}
                  </p>
                )}
              </div>

              {loading ? (
                <div className="text-center py-10">
                  <div className="inline-flex flex-col items-center gap-4 mb-4">
                    <div className="relative">
                      <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-purple-500/20 border-t-purple-500"></div>
                      <div className="absolute inset-0 flex items-center justify-center">
                        <svg className="w-6 h-6 text-white/50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                        </svg>
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="text-white font-medium mb-1">
                        Memuat Epic dari JIRA
                      </div>
                      <div className="text-gray-400 text-sm">
                        {selectedConnection ?
                          `Project: ${selectedConnection.project_name || selectedConnection.project_key}` :
                          'Menghubungkan ke JIRA...'
                        }
                      </div>
                    </div>
                  </div>
                  <div className="w-full max-w-xs mx-auto bg-gray-700/20 rounded-full h-1.5 overflow-hidden">
                    <div className="bg-gradient-to-r from-purple-500 to-blue-500 h-1.5 rounded-full animate-pulse" style={{width: '70%'}}></div>
                  </div>
                </div>
              ) : filteredEpics.length === 0 ? (
                <div className="text-center py-8">
                  <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-[#0d0d0d] flex items-center justify-center">
                    {/* Epic Icon - Lightning bolt (Jira Epic icon) */}
                    <svg className="w-10 h-10 text-white/50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                  </div>
                  {searchQuery ? (
                    <>
                      <h4 className="text-xl font-semibold text-white mb-2">{EMPTY_STATES.NO_MATCHING_EPICS}</h4>
                      <p className="text-gray-400 mb-6">{EMPTY_STATES.NO_MATCHING_EPICS_DESC}</p>
                      <button
                        onClick={() => setSearchQuery('')}
                        className="px-4 py-2 bg-purple-600/20 border border-purple-500/30 rounded-lg text-purple-300 hover:bg-purple-600/30 transition-colors text-sm"
                      >
                        {BUTTON_LABELS.CLEAR_SEARCH}
                      </button>
                    </>
                  ) : (
                    <>
                      <h4 className="text-xl font-semibold text-white mb-3">Tidak Ada Epic di Project</h4>
                      <p className="text-gray-400 mb-2">
                        Project <span className="font-semibold text-white">{selectedConnection?.project_name || selectedConnection?.project_key}</span> belum memiliki Epic.
                      </p>
                      <p className="text-gray-500 text-sm mb-6">
                        Buat Epic di JIRA terlebih dahulu, atau lanjutkan tanpa Epic.
                      </p>

                      <div className="space-y-3">
                        <button
                          onClick={() => handleWorkWithoutEpic()}
                          className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                        >
                          {BUTTON_LABELS.CONTINUE_WITHOUT_EPIC}
                        </button>
                        <button
                          onClick={() => window.open(selectedConnection?.jira_url, '_blank')}
                          className="w-full px-6 py-3 bg-gray-700/50 border border-gray-600/50 text-gray-300 rounded-lg hover:bg-gray-700 transition-colors font-medium"
                        >
                          Buka JIRA untuk Membuat Epic
                        </button>
                      </div>
                    </>
                  )}
                </div>
              ) : (
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {filteredEpics.map((epic) => (
                    <button
                      key={epic.id}
                      onClick={() => handleEpicSelect(epic)}
                      className="w-full p-4 bg-[#09090A] border border-white/5 rounded-lg hover:bg-[#0d0d0d] hover:border-white/5 transition-all duration-75 text-left group"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="text-white font-medium truncate group-hover:text-purple-200 transition-colors">{epic.summary}</h4>
                            {/* Show issue type badge for clarity */}
                            <span className="px-2 py-0.5 text-xs rounded border bg-purple-500/20 text-purple-400 border-purple-500/30">
                              {epic.issueType}
                            </span>
                          </div>
                          <span className="text-xs text-gray-500 font-mono">{epic.key}</span>
                        </div>
                        <div className="flex flex-col items-end gap-2 ml-3">
                          <span className={`px-2 py-1 text-xs rounded border ${getStatusColor(epic.status)}`}>
                            {epic.status}
                          </span>
                          <svg className="w-4 h-4 text-gray-500 group-hover:text-purple-400 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </div>
                      </div>

                      <div className="flex items-center justify-between text-xs text-gray-500 pt-2 border-t border-white/5">
                        <div className="flex items-center gap-4">
                          <span>{EPIC_LABELS.EPIC_ASSIGNEE}: {epic.assignee}</span>
                          <span>{EPIC_LABELS.EPIC_CREATED}: {formatDate(epic.created)}</span>
                        </div>
                        <span>{EPIC_LABELS.EPIC_UPDATED}: {formatDate(epic.updated)}</span>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Step 3: Confirmation */}
          {step === 'confirm' && selectedEpic && (
            <div>
              <div className="p-4 bg-[#09090A] border border-white/5 rounded-lg mb-6">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h4 className="text-white font-medium">{selectedEpic.name}</h4>
                      <span className="text-xs text-gray-500 font-mono">({selectedEpic.key})</span>
                      <span className={`px-2 py-1 text-xs rounded border ${getStatusColor(selectedEpic.status)}`}>
                        {selectedEpic.status}
                      </span>
                    </div>
                    <p className="text-sm text-gray-400 mb-3">{selectedEpic.summary}</p>

                    <div className="grid grid-cols-2 gap-4 text-xs text-gray-500">
                      <div>
                        <span className="text-gray-400">{EPIC_LABELS.EPIC_ASSIGNEE}:</span> {selectedEpic.assignee}
                      </div>
                      <div>
                        <span className="text-gray-400">{EPIC_LABELS.EPIC_CREATED}:</span> {formatDate(selectedEpic.created)}
                      </div>
                      <div>
                        <span className="text-gray-400">{EPIC_LABELS.EPIC_UPDATED}:</span> {formatDate(selectedEpic.updated)}
                      </div>
                      <div>
                        <span className="text-gray-400">{EPIC_LABELS.EPIC_PROJECT}:</span> {selectedConnection?.project_name || selectedConnection?.project_key}
                        {selectedConnection?.project_name && selectedConnection.project_key && (
                          <span className="text-gray-500 ml-1 font-mono">({selectedConnection.project_key})</span>
                        )}
                      </div>
                      <div>
                        <span className="text-gray-400">{EPIC_LABELS.EPIC_ISSUE_TYPE}:</span> {selectedEpic.issueType}
                      </div>
                    </div>
                  </div>
                </div>
              </div>


            </div>
          )}
        </div>

        {/* Footer */}
        {step === 'confirm' && (
          <div className="flex items-center justify-end gap-3 p-6 border-t border-white/5">
            <button
              onClick={() => setStep('epic')}
              className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
            >
              {BUTTON_LABELS.CANCEL}
            </button>
            <button
              onClick={handleConfirmEpic}
              disabled={loading}
              className="px-6 py-2 bg-[#120C18] border border-[#2C1A43] text-[#C27AFF] rounded-lg hover:bg-[#1a1020] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {loading && (
                <div className="w-4 h-4 border-2 border-[#C27AFF]/30 border-t-[#C27AFF] rounded-full animate-spin"></div>
              )}
              Konfirmasi Epic
            </button>
          </div>
        )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default EpicSelectionModal;