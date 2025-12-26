import { useState, useEffect } from 'react';
import { jiraService } from '../../services/jiraService';
import projectStateManager from '../../utils/managers/ProjectStateManager.js';

const EpicSelectionModal = ({ isOpen, onClose, onEpicSelected, selectedProjectKey = null }) => {
  const [jiraConnections, setJiraConnections] = useState([]);
  const [selectedConnection, setSelectedConnection] = useState(null);
  const [selectedProject, setSelectedProject] = useState(selectedProjectKey);
  const [epics, setEpics] = useState([]);
  const [selectedEpic, setSelectedEpic] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [step, setStep] = useState('connection'); // 'connection' | 'epic' | 'confirm'

  // Load JIRA connections on modal open
  useEffect(() => {
    if (isOpen) {
      console.log(`🔄 [EPIC-MODAL] Modal opened with selectedProjectKey: ${selectedProjectKey}`);
      loadJiraConnectionsWithProjectManager();
      setSelectedConnection(null);
      setSelectedEpic(null);
      setError(null);
      setSearchQuery('');
    }
  }, [isOpen, selectedProjectKey]);

  // Load JIRA connections using ProjectStateManager for consistency
  const loadJiraConnectionsWithProjectManager = async () => {
    try {
      setLoading(true);
      setError(null);

      // Get current chat ID
      const currentPath = window.location.pathname;
      const chatId = currentPath.includes('/chat') ? 'default-chat' : 'dashboard-default';
      
      console.log(`🔍 [EPIC-MODAL] Loading connections for chat: ${chatId}`);
      
      // First, validate and fix any inconsistencies
      const validationResult = await projectStateManager.validateConsistency(chatId);
      if (validationResult.success && !validationResult.data.consistent) {
        console.log(`🔧 [EPIC-MODAL] Fixing inconsistencies before loading`);
        await projectStateManager.fixInconsistencies(chatId);
      }
      
      // Get active project from ProjectStateManager
      const activeProjectResult = await projectStateManager.getActiveProject(chatId);
      
      if (activeProjectResult.success) {
        const { connection, projectKey, projectName } = activeProjectResult.data;
        
        console.log(`✅ [EPIC-MODAL] Using active project from ProjectStateManager:`, {
          connectionId: connection.id,
          projectKey: projectKey,
          projectName: projectName
        });
        
        setSelectedConnection(connection);
        setSelectedProject(projectKey);
        await loadEpics(connection);
        setStep('epic');
      } else {
        // Fallback to loading all connections if no active project
        console.log(`⚠️ [EPIC-MODAL] No active project found, loading all connections`);
        await loadJiraConnectionsFallback();
      }
    } catch (err) {
      console.error('❌ [EPIC-MODAL] Error loading connections with ProjectStateManager:', err);
      setError(err.message);
      setStep('connection');
    } finally {
      setLoading(false);
    }
  };

  // Fallback method for loading connections (original logic)
  const loadJiraConnectionsFallback = async () => {
    try {
      console.log(`🔍 [EPIC-MODAL] Loading connections with fallback method`);
      
      const connectionsResult = await jiraService.getConnections();
      
      if (connectionsResult.success && connectionsResult.data && connectionsResult.data.length > 0) {
        const connections = connectionsResult.data;
        console.log(`✅ [EPIC-MODAL] Found ${connections.length} JIRA connections`);
        
        let targetConnection = null;
        
        // If selectedProject is provided, find the connection with that project key
        if (selectedProject) {
          targetConnection = connections.find(conn => conn.project_key === selectedProject);
          console.log(`🎯 [EPIC-MODAL] Looking for connection with project key: ${selectedProject}`);
          
          if (targetConnection) {
            console.log(`✅ [EPIC-MODAL] Found matching connection:`, {
              id: targetConnection.id,
              project_key: targetConnection.project_key,
              name: targetConnection.custom_fields?.project_info?.name
            });
          } else {
            console.warn(`⚠️ [EPIC-MODAL] No connection found for project key: ${selectedProject}`);
          }
        }
        
        // Fallback to first connection if no specific project or not found
        if (!targetConnection) {
          targetConnection = connections[0];
          console.log(`🔄 [EPIC-MODAL] Using fallback connection: ${targetConnection.project_key}`);
        }
        
        setSelectedConnection(targetConnection);
        await loadEpics(targetConnection);
        setStep('epic');
      } else {
        setError('No JIRA connections found. Please set up a JIRA connection first.');
        setStep('connection');
      }
    } catch (err) {
      console.error('❌ [EPIC-MODAL] Error in fallback connection loading:', err);
      setError(err.message);
      setStep('connection');
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
        selectedProject: selectedProject,
        jira_url: connection.jira_url
      });

      // Use selectedProject if available, otherwise use connection.project_key
      const targetProjectKey = selectedProject || connection.project_key;
      
      console.log(`🎯 [CLIENT-ENHANCED] Target project key: ${targetProjectKey}`);

      const result = await jiraService.getProjectEpics(connection.id, targetProjectKey);
      
      console.log(`🔍 [CLIENT-ENHANCED] Epic fetch result:`, result);
      
      if (result.success) {
        // Ensure data is always an array
        let epicsData = Array.isArray(result.data) ? result.data : [];
        
        console.log(`📊 [CLIENT-ENHANCED] Received ${epicsData.length} issues from JIRA API`);
        
        // Show all issues - let user decide what to use as Epic
        setEpics(epicsData);
        
        // Handle different response scenarios
        if (result.fallback && result.warning) {
          if (result.warning.includes('410') || result.warning.includes('Gone')) {
            setError(`JIRA API endpoint has been deprecated. Your JIRA instance may need to be updated, or the API version is no longer supported. Please contact your JIRA administrator.`);
          } else {
            setError(`Info: ${result.warning}`);
          }
        } else if (epicsData.length === 0) {
          // Show helpful message when no Epic issues found - don't set as error
          console.log(`ℹ️ [CLIENT-ENHANCED] No Epic issues found in project ${connection.project_key}`);
          // Don't set error here - let the UI handle the empty state properly
          setError(null);
        } else {
          setError(null); // Clear any previous errors
        }
      } else {
        const errorMsg = result.error || 'Failed to load Epics from JIRA';
        console.error(`❌ [CLIENT-ENHANCED] Epic fetch failed:`, errorMsg);
        
        // Provide specific error messages based on error type
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
        
        setEpics([]); // Reset to empty array on error
      }
    } catch (err) {
      const errorMsg = err.message || 'Network error while loading Epics';
      console.error('❌ [CLIENT-ENHANCED] Epic loading error:', err);
      
      // Handle network and other errors
      if (errorMsg.includes('Failed to fetch') || errorMsg.includes('Network')) {
        setError(`Network error: Cannot connect to JIRA. Please check your internet connection and JIRA server status.`);
      } else {
        setError(`Unexpected error: ${errorMsg}`);
      }
      
      setEpics([]); // Reset to empty array on error
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

      // Get current chat ID for validation
      const currentPath = window.location.pathname;
      const chatId = currentPath.includes('/chat') ? 'default-chat' : 'dashboard-default';
      
      // CRITICAL: Validate that selected connection matches active project
      console.log(`🔍 [EPIC-MODAL] Validating Epic selection consistency...`);
      const activeProjectResult = await projectStateManager.getActiveProject(chatId);
      
      if (activeProjectResult.success) {
        const activeConnectionId = activeProjectResult.data.connectionId;
        const selectedConnectionId = selectedConnection.id;
        
        if (activeConnectionId !== selectedConnectionId) {
          console.error(`❌ [EPIC-MODAL] Connection mismatch detected!`, {
            activeConnectionId,
            selectedConnectionId,
            activeProject: activeProjectResult.data.projectName,
            selectedProject: selectedConnection.custom_fields?.project_info?.name
          });
          
          setError(`Project mismatch detected! Active project is "${activeProjectResult.data.projectName}" but Epic is from "${selectedConnection.custom_fields?.project_info?.name || selectedConnection.project_key}". Please refresh and try again.`);
          return;
        }
        
        console.log(`✅ [EPIC-MODAL] Connection validation passed:`, {
          connectionId: activeConnectionId,
          projectName: activeProjectResult.data.projectName
        });
      }

      // Validate Epic access
      const validationResult = await jiraService.validateEpicAccess(
        selectedConnection.id, 
        selectedEpic.id
      );

      if (!validationResult.success) {
        setError(validationResult.error);
        return;
      }

      // Set Epic context with validated connection
      const contextResult = await jiraService.setEpicContext(selectedEpic.id, {
        epic: selectedEpic,
        connection: selectedConnection,
        validatedAt: new Date().toISOString(),
        chatId: chatId
      });

      if (contextResult.success) {
        console.log(`✅ [EPIC-MODAL] Epic context set successfully with validation`);
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

      // Get current chat ID for validation
      const currentPath = window.location.pathname;
      const chatId = currentPath.includes('/chat') ? 'default-chat' : 'dashboard-default';
      
      // CRITICAL: Validate that selected connection matches active project
      console.log(`🔍 [EPIC-MODAL] Validating project-only selection consistency...`);
      const activeProjectResult = await projectStateManager.getActiveProject(chatId);
      
      if (activeProjectResult.success) {
        const activeConnectionId = activeProjectResult.data.connectionId;
        const selectedConnectionId = selectedConnection.id;
        
        if (activeConnectionId !== selectedConnectionId) {
          console.error(`❌ [EPIC-MODAL] Connection mismatch detected in project-only mode!`, {
            activeConnectionId,
            selectedConnectionId,
            activeProject: activeProjectResult.data.projectName,
            selectedProject: selectedConnection.custom_fields?.project_info?.name
          });
          
          setError(`Project mismatch detected! Active project is "${activeProjectResult.data.projectName}" but selection is from "${selectedConnection.custom_fields?.project_info?.name || selectedConnection.project_key}". Please refresh and try again.`);
          return;
        }
        
        console.log(`✅ [EPIC-MODAL] Project-only validation passed:`, {
          connectionId: activeConnectionId,
          projectName: activeProjectResult.data.projectName
        });
      }

      // Set context without Epic but with validated connection
      const contextResult = await jiraService.setEpicContext(null, {
        epic: null,
        connection: selectedConnection,
        workWithoutEpic: true,
        validatedAt: new Date().toISOString(),
        chatId: chatId
      });

      if (contextResult.success) {
        console.log(`✅ [EPIC-MODAL] Project-only context set successfully with validation`);
        onEpicSelected({
          epic: null,
          connection: selectedConnection,
          workWithoutEpic: true
        });
        onClose();
      } else {
        setError(contextResult.error);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Filter Epics based on search - ensure epics is always an array
  const filteredEpics = (Array.isArray(epics) ? epics : []).filter(epic =>
    epic.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    epic.key.toLowerCase().includes(searchQuery.toLowerCase()) ||
    epic.summary.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Format date
  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  // Get status badge color
  const getStatusColor = (status) => {
    switch (status.toLowerCase()) {
      case 'to do': return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
      case 'in progress': return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
      case 'done': return 'bg-green-500/20 text-green-400 border-green-500/30';
      default: return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-[#16161e] border border-white/10 rounded-xl max-w-2xl w-full max-h-[80vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-white/10">
          <div>
            <h2 className="text-lg font-semibold text-white">Select Epic</h2>
            <p className="text-sm text-gray-400 mt-1">
              Choose an Epic to organize your user stories and scenarios
            </p>
            {selectedConnection && (
              <div className="flex items-center gap-2 mt-2">
                <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                <span className="text-xs text-purple-300">
                  Active: {selectedConnection.custom_fields?.project_info?.name || selectedConnection.project_key}
                </span>
              </div>
            )}
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

          {/* Step 1: No Active Project Message */}
          {step === 'connection' && (
            <div className="text-center py-12">
              <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-blue-500/20 flex items-center justify-center">
                <svg className="w-8 h-8 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-white mb-3">No Active Project Set</h3>
              <p className="text-gray-400 mb-6 max-w-md mx-auto">
                Please set an active project for this chat in JIRA Project Management first, then return here to select an Epic.
              </p>
              <div className="space-y-3">
                <button
                  onClick={onClose}
                  className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                >
                  Go to JIRA Project Management
                </button>
                <button
                  onClick={() => loadJiraConnections()}
                  className="w-full px-4 py-2 border border-gray-500/30 rounded-lg text-gray-300 hover:bg-gray-500/10 transition-colors text-sm"
                >
                  🔄 Check Again
                </button>
              </div>
            </div>
          )}

          {/* Step 2: Epic Selection */}
          {step === 'epic' && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-white">Select Epic</h3>
                {selectedConnection && (
                  <div className="text-sm text-gray-400">
                    Project: <span className="text-white font-mono">{selectedProject || selectedConnection.project_key}</span>
                  </div>
                )}
              </div>

              {/* Legacy Project Mismatch Warning */}
              {selectedConnection && selectedConnection.project_key !== selectedProject && false && (
                <div className="mb-4 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <svg className="w-4 h-4 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 18.5c-.77.833.192 2.5 1.732 2.5z" />
                    </svg>
                    <span className="text-yellow-300 text-sm font-medium">Project Mismatch</span>
                  </div>
                  <p className="text-yellow-200 text-sm mb-3">
                    Connection default: <span className="font-mono">{selectedConnection.project_key}</span><br/>
                    Selected project: <span className="font-mono">{selectedProject}</span>
                  </p>
                  <button
                    onClick={() => {
                      setSelectedProject(selectedConnection.project_key);
                      loadEpics(selectedConnection);
                    }}
                    className="text-xs px-3 py-1 bg-yellow-600/20 border border-yellow-500/30 rounded text-yellow-300 hover:bg-yellow-600/30"
                  >
                    Use Connection Default ({selectedConnection.project_key})
                  </button>
                </div>
              )}

              {/* Search */}
              <div className="mb-4">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search Epics..."
                  className="w-full px-4 py-2 bg-[#0a0a0f] border border-white/10 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-purple-500/50"
                />
              </div>

              {loading ? (
                <div className="text-center py-8">
                  <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500"></div>
                  <p className="text-gray-400 mt-2">Loading Epics...</p>
                </div>
              ) : filteredEpics.length === 0 ? (
                <div className="text-center py-6">
                  <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-500/20 flex items-center justify-center">
                    <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  {searchQuery ? (
                    <>
                      <h4 className="text-lg font-medium text-white mb-2">No Epics match your search</h4>
                      <p className="text-gray-400 mb-4">Try adjusting your search terms</p>
                      <button
                        onClick={() => setSearchQuery('')}
                        className="px-4 py-2 bg-purple-600/20 border border-purple-500/30 rounded-lg text-purple-300 hover:bg-purple-600/30 transition-colors text-sm"
                      >
                        Clear search
                      </button>
                    </>
                  ) : (
                    <>
                      <h4 className="text-lg font-medium text-white mb-4">Tidak Ada Epic</h4>
                      <p className="text-gray-400 mb-6">Project <span className="font-mono text-gray-300">{selectedConnection?.custom_fields?.project_info?.name || selectedConnection?.project_key}</span> tidak memiliki Epic issues</p>
                      
                      <div className="space-y-3">
                        <button
                          onClick={() => handleWorkWithoutEpic()}
                          className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                        >
                          Lanjutkan Tanpa Epic
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
                      className="w-full p-4 bg-[#0a0a0f] border border-white/10 rounded-lg hover:border-purple-500/50 transition-colors text-left"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="text-white font-medium truncate">{epic.name}</h4>
                            <span className="text-xs text-gray-500">({epic.key})</span>
                            {/* Show issue type badge for clarity */}
                            <span className="px-2 py-0.5 text-xs rounded border bg-purple-500/20 text-purple-400 border-purple-500/30">
                              {epic.issueType}
                            </span>
                          </div>
                          <p className="text-sm text-gray-400 line-clamp-2">{epic.summary}</p>
                        </div>
                        <span className={`px-2 py-1 text-xs rounded border ${getStatusColor(epic.status)} ml-2`}>
                          {epic.status}
                        </span>
                      </div>
                      
                      <div className="flex items-center gap-4 text-xs text-gray-500">
                        <span>Assignee: {epic.assignee}</span>
                        <span>Created: {formatDate(epic.created)}</span>
                        <span>Updated: {formatDate(epic.updated)}</span>
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
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-white">Confirm Epic Selection</h3>
                <button
                  onClick={() => setStep('epic')}
                  className="text-sm text-gray-400 hover:text-white transition-colors"
                >
                  ← Back to Epics
                </button>
              </div>

              <div className="p-4 bg-[#0a0a0f] border border-white/10 rounded-lg mb-6">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h4 className="text-white font-medium">{selectedEpic.name}</h4>
                      <span className="text-xs text-gray-500">({selectedEpic.key})</span>
                      <span className={`px-2 py-1 text-xs rounded border ${getStatusColor(selectedEpic.status)}`}>
                        {selectedEpic.status}
                      </span>
                    </div>
                    <p className="text-sm text-gray-400 mb-3">{selectedEpic.summary}</p>
                    
                    <div className="grid grid-cols-2 gap-4 text-xs text-gray-500">
                      <div>
                        <span className="text-gray-400">Assignee:</span> {selectedEpic.assignee}
                      </div>
                      <div>
                        <span className="text-gray-400">Created:</span> {formatDate(selectedEpic.created)}
                      </div>
                      <div>
                        <span className="text-gray-400">Updated:</span> {formatDate(selectedEpic.updated)}
                      </div>
                      <div>
                        <span className="text-gray-400">Project:</span> {selectedConnection?.custom_fields?.project_info?.name || selectedConnection?.project_key}
                      </div>
                      <div>
                        <span className="text-gray-400">Issue Type:</span> {selectedEpic.issueType}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg mb-6">
                <div className="flex items-start gap-3">
                  <svg className="w-5 h-5 text-blue-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div>
                    <h5 className="text-blue-400 font-medium text-sm mb-1">Epic Context</h5>
                    <p className="text-blue-300 text-sm">
                      All user stories and scenarios created in this chat session will be linked to this Epic. 
                      You can change the Epic selection later if needed.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        {step === 'confirm' && (
          <div className="flex items-center justify-end gap-3 p-6 border-t border-white/10">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirmEpic}
              disabled={loading}
              className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {loading && (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
              )}
              Confirm Epic Selection
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default EpicSelectionModal;