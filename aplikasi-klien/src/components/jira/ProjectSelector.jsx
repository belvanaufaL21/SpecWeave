import { useState, useEffect } from 'react';
import { useJira } from '../../contexts/JiraContext';
import UserDataService from '../../services/UserDataService';

const ProjectSelector = ({ chatId, onProjectSelected }) => {
  const { connections, loading: jiraLoading } = useJira();
  const [selectedConnection, setSelectedConnection] = useState(null);
  const [activeProject, setActiveProject] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Load active project on mount
  useEffect(() => {
    if (chatId) {
      loadActiveProject();
    }
  }, [chatId]);

  // Handle connection deletion events
  useEffect(() => {
    const handleConnectionDeleted = (event) => {
      const { connectionId, updatedConnections } = event.detail;
      console.log(`📡 [PROJECT-SELECTOR] Connection deleted: ${connectionId}`);
      
      // If the deleted connection was the selected one, clear it
      if (selectedConnection?.id === connectionId) {
        console.log(`🧹 [PROJECT-SELECTOR] Clearing selected connection: ${connectionId}`);
        setSelectedConnection(null);
        setActiveProject(null);
        
        // Notify parent component
        if (onProjectSelected) {
          onProjectSelected(null, null);
        }
      }
      
      // CRITICAL FIX: Force reload active project to ensure consistency
      if (chatId) {
        console.log(`🔄 [PROJECT-SELECTOR] Force reloading active project after deletion`);
        loadActiveProject();
      }
    };

    const handleJiraStateChanged = (event) => {
      if (event.detail?.action === 'connectionDeleted') {
        const { connectionId, updatedConnections } = event.detail;
        console.log(`📡 [PROJECT-SELECTOR] JIRA state changed - connection deleted: ${connectionId}`);
        
        // CRITICAL FIX: If the deleted connection was selected, clear it immediately
        if (selectedConnection?.id === connectionId) {
          console.log(`🧹 [PROJECT-SELECTOR] Clearing selected connection due to state change: ${connectionId}`);
          setSelectedConnection(null);
          setActiveProject(null);
          
          // Notify parent component
          if (onProjectSelected) {
            onProjectSelected(null, null);
          }
        }
        
        // Force reload active project to ensure consistency
        if (chatId) {
          console.log(`🔄 [PROJECT-SELECTOR] Force reloading active project after state change`);
          loadActiveProject();
        }
      }
    };

    const handleForceRefresh = (event) => {
      console.log(`📡 [PROJECT-SELECTOR] Force refresh triggered`);
      if (chatId) {
        console.log(`🔄 [PROJECT-SELECTOR] Force reloading active project due to refresh`);
        loadActiveProject();
      }
    };

    // Add event listeners
    window.addEventListener('jiraConnectionDeleted', handleConnectionDeleted);
    window.addEventListener('jiraStateChanged', handleJiraStateChanged);
    window.addEventListener('forceUIRefresh', handleForceRefresh);

    return () => {
      window.removeEventListener('jiraConnectionDeleted', handleConnectionDeleted);
      window.removeEventListener('jiraStateChanged', handleJiraStateChanged);
      window.removeEventListener('forceUIRefresh', handleForceRefresh);
    };
  }, [selectedConnection, chatId, onProjectSelected, loadActiveProject]);

  const loadActiveProject = async () => {
    try {
      setLoading(true);
      const result = await UserDataService.getActiveProject();
      
      if (result.success && result.data) {
        setActiveProject(result.data);
        
        // Find the connection in current connections
        const connection = connections.find(conn => conn.id === result.data.id);
        if (connection) {
          setSelectedConnection(connection);
        }
      }
    } catch (error) {
      console.error('Error loading active project:', error);
      setError('Failed to load active project');
    } finally {
      setLoading(false);
    }
  };

  const handleConnectionSelect = async (connection) => {
    if (!connection) return;
    
    try {
      setLoading(true);
      setError(null);
      
      const result = await UserDataService.setActiveProject(connection.id);
      
      if (result.success) {
        setSelectedConnection(connection);
        setActiveProject(connection);
        
        // Notify parent component
        if (onProjectSelected) {
          onProjectSelected(connection, connection);
        }

      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      console.error('❌ [PROJECT-SELECTOR] Error selecting project:', error);
      setError('Failed to select project: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleClearProject = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const result = await UserDataService.clearActiveProject();
      
      if (result.success) {
        setSelectedConnection(null);
        setActiveProject(null);
        
        // Notify parent component
        if (onProjectSelected) {
          onProjectSelected(null, null);
        }

      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      console.error('❌ [PROJECT-SELECTOR] Error clearing project:', error);
      setError('Failed to clear project: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  if (jiraLoading || loading) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 bg-white/5 border border-white/10 rounded-lg">
        <div className="w-4 h-4 border-2 border-purple-400 border-t-transparent rounded-full animate-spin" />
        <span className="text-sm text-gray-400">Loading projects...</span>
      </div>
    );
  }

  if (!connections || connections.length === 0) {
    return (
      <div className="px-3 py-2 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
        <div className="flex items-center gap-2">
          <svg className="w-4 h-4 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
          <span className="text-sm text-yellow-300">No JIRA connections available</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Current Active Project Display */}
      {activeProject && selectedConnection && (
        <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-green-500/20 flex items-center justify-center">
                <svg className="w-4 h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <div className="text-sm font-medium text-green-300">
                  Active Project: {activeProject.project_name || activeProject.project_key}
                </div>
                {activeProject.project_name && activeProject.project_name !== activeProject.project_key && (
                  <div className="text-xs text-green-400/80 font-mono">
                    ({activeProject.project_key})
                  </div>
                )}
              </div>
            </div>
            <button
              onClick={handleClearProject}
              disabled={loading}
              className="px-2 py-1 bg-red-500/20 hover:bg-red-500/30 border border-red-500/30 rounded text-xs text-red-300 transition-colors disabled:opacity-50"
              title="Clear active project"
            >
              Clear
            </button>
          </div>
        </div>
      )}

      {/* Project Selector */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-gray-300">
          Select JIRA Project for this Chat:
        </label>
        
        <select
          value={selectedConnection?.id || ''}
          onChange={(e) => {
            const connection = connections.find(conn => conn.id === e.target.value);
            if (connection) {
              handleConnectionSelect(connection);
            }
          }}
          disabled={loading}
          className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50 disabled:opacity-50"
        >
          <option value="">Choose a project...</option>
          {connections.map((connection) => (
            <option key={connection.id} value={connection.id} className="bg-gray-800">
              {connection.project_name || connection.project_key}
              {connection.project_name && connection.project_name !== connection.project_key && ` (${connection.project_key})`}
            </option>
          ))}
        </select>
      </div>

      {/* Error Display */}
      {error && (
        <div className="px-3 py-2 bg-red-500/10 border border-red-500/20 rounded-lg">
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="text-sm text-red-300">{error}</span>
          </div>
        </div>
      )}

      {/* Project Info */}
      {selectedConnection && (
        <div className="bg-white/5 border border-white/10 rounded-lg p-3">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
              </svg>
              <span className="text-sm font-medium text-blue-300">Connection Details</span>
            </div>
            
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <div className="text-gray-400">JIRA URL:</div>
                <div className="text-gray-200 truncate">{selectedConnection.jira_url}</div>
              </div>
              <div>
                <div className="text-gray-400">Project Key:</div>
                <div className="text-gray-200">{selectedConnection.project_key}</div>
              </div>
            </div>
            
            {selectedConnection.custom_fields?.project_info && (
              <div className="pt-2 border-t border-white/10">
                <div className="text-gray-400 text-xs mb-1">Project Info:</div>
                <div className="text-gray-200 text-xs">
                  {selectedConnection.custom_fields.project_info.name}
                </div>
                {selectedConnection.custom_fields.project_info.description && (
                  <div className="text-gray-400 text-xs mt-1">
                    {selectedConnection.custom_fields.project_info.description}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default ProjectSelector;