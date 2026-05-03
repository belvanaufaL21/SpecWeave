import React, { useState, useEffect } from 'react';
import { jiraService } from '../../services/jiraService';
import { getEpicContextDisplayText, isEpicContextConsistent } from '../../utils/helpers/activeProjectHelpers';

const JiraConnectionStatus = ({ className = '', showDetails = true }) => {
  const [connectionStatus, setConnectionStatus] = useState({
    isLoading: true,
    hasConnection: false,
    connections: [],
    epicContext: null,
    error: null
  });

  useEffect(() => {
    checkConnectionStatus();
  }, []);

  const checkConnectionStatus = async () => {
    try {
      setConnectionStatus(prev => ({ ...prev, isLoading: true }));
      
      const [connectionsResult, epicResult] = await Promise.all([
        jiraService.getConnections(),
        jiraService.getEpicContext()
      ]);

      setConnectionStatus({
        isLoading: false,
        hasConnection: connectionsResult.success && connectionsResult.data.length > 0,
        connections: connectionsResult.success ? connectionsResult.data : [],
        epicContext: epicResult.success ? epicResult.data : null,
        error: null
      });
    } catch (error) {
      console.error('Error checking JIRA connection status:', error);
      setConnectionStatus({
        isLoading: false,
        hasConnection: false,
        connections: [],
        epicContext: null,
        error: error.message
      });
    }
  };

  const getStatusInfo = () => {
    if (connectionStatus.isLoading) {
      return {
        status: 'loading',
        color: 'gray',
        icon: 'loading',
        title: 'Checking JIRA Status...',
        description: 'Please wait while we check your JIRA connection'
      };
    }

    if (connectionStatus.error) {
      return {
        status: 'error',
        color: 'red',
        icon: 'error',
        title: 'Connection Error',
        description: connectionStatus.error
      };
    }

    if (!connectionStatus.hasConnection) {
      return {
        status: 'disconnected',
        color: 'red',
        icon: 'disconnected',
        title: 'JIRA Not Connected',
        description: 'Connect to JIRA to enable automatic issue creation from scenarios'
      };
    }

    if (!connectionStatus.epicContext) {
      return {
        status: 'no-epic',
        color: 'yellow',
        icon: 'warning',
        title: 'No Epic Selected',
        description: 'Select an Epic to enable scenario export to JIRA'
      };
    }

    // Check if Epic context is consistent with active project
    const isConsistent = isEpicContextConsistent(connectionStatus.epicContext, connectionStatus.connections);
    
    if (!isConsistent) {
      return {
        status: 'warning',
        color: 'yellow',
        icon: 'warning',
        title: 'Epic Context Mismatch',
        description: 'Epic is from different project than active project'
      };
    }

    return {
      status: 'ready',
      color: 'green',
      icon: 'success',
      title: 'Ready for Export',
      description: `Connected to Epic: ${connectionStatus.epicContext.epicData.epic.key}`
    };
  };

  const statusInfo = getStatusInfo();

  const getIcon = () => {
    switch (statusInfo.icon) {
      case 'loading':
        return (
          <div className="w-5 h-5 border-2 border-gray-400/30 border-t-gray-400 rounded-full animate-spin"></div>
        );
      case 'error':
        return (
          <svg className="w-5 h-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        );
      case 'disconnected':
        return (
          <svg className="w-5 h-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728L5.636 5.636m12.728 12.728L18.364 5.636M5.636 18.364l12.728-12.728" />
          </svg>
        );
      case 'warning':
        return (
          <svg className="w-5 h-5 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
        );
      case 'success':
        return (
          <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        );
      default:
        return null;
    }
  };

  const getColorClasses = () => {
    switch (statusInfo.color) {
      case 'red':
        return 'bg-red-500/10 border-red-500/20 text-red-300';
      case 'yellow':
        return 'bg-yellow-500/10 border-yellow-500/20 text-yellow-300';
      case 'green':
        return 'bg-green-500/10 border-green-500/20 text-green-300';
      case 'gray':
      default:
        return 'bg-gray-500/10 border-gray-500/20 text-gray-300';
    }
  };

  return (
    <div className={`border rounded-lg p-4 ${getColorClasses()} ${className}`}>
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 mt-0.5">
          {getIcon()}
        </div>
        
        <div className="flex-1 min-w-0">
          <h4 className="font-medium text-sm">{statusInfo.title}</h4>
          <p className="text-xs opacity-80 mt-1">{statusInfo.description}</p>
          
          {showDetails && connectionStatus.hasConnection && (
            <div className="mt-3 space-y-2">
              <div className="text-xs">
                <span className="opacity-60">Connections: </span>
                <span className="font-medium">{connectionStatus.connections.length}</span>
              </div>
              
              {connectionStatus.epicContext && (
                <div className="text-xs">
                  <span className="opacity-60">Epic: </span>
                  {(() => {
                    const { text, isConsistent, warning } = getEpicContextDisplayText(
                      true, 
                      connectionStatus.epicContext, 
                      connectionStatus.connections
                    );
                    return (
                      <span className={`font-medium ${isConsistent ? '' : 'text-yellow-300'}`} title={warning || undefined}>
                        {text}
                      </span>
                    );
                  })()}
                </div>
              )}
              
              {connectionStatus.connections.length > 0 && (
                <div className="text-xs">
                  <span className="opacity-60">Project: </span>
                  <span className="font-medium">
                    {connectionStatus.connections[0]?.project_name || connectionStatus.connections[0]?.project_key}
                    {connectionStatus.connections[0]?.project_name && connectionStatus.connections[0]?.project_key && (
                      <span className="opacity-60 ml-1 font-mono">({connectionStatus.connections[0].project_key})</span>
                    )}
                  </span>
                </div>
              )}
            </div>
          )}
        </div>
        
        <button
          onClick={checkConnectionStatus}
          className="flex-shrink-0 p-1 rounded hover:bg-white/10 transition-colors"
          title="Refresh status"
        >
          <svg className="w-4 h-4 opacity-60 hover:opacity-100" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        </button>
      </div>
    </div>
  );
};

export default JiraConnectionStatus;