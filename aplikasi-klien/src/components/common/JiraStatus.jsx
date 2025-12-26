import React from 'react';
import { useJiraSetup } from '../../hooks/useJiraSetup';

const JiraStatus = ({ className = '' }) => {
  const { hasJiraConnection, loading, fetchError, openSetupModal, retryLoadConnections } = useJiraSetup();

  if (loading) {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
        <span className="text-xs text-blue-400">Checking JIRA connection...</span>
      </div>
    );
  }

  if (fetchError) {
    return (
      <button
        onClick={retryLoadConnections}
        className={`flex items-center gap-2 hover:opacity-80 transition-opacity ${className}`}
        title="Failed to check JIRA connection - Click to retry"
      >
        <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
        <span className="text-xs text-orange-400">JIRA Check Failed</span>
      </button>
    );
  }

  return (
    <button
      onClick={openSetupModal}
      className={`flex items-center gap-2 hover:opacity-80 transition-opacity ${className}`}
      title={hasJiraConnection ? 'JIRA Connected - Click to manage settings' : 'JIRA not connected - Click to setup integration'}
    >
      <div className={`w-2 h-2 rounded-full ${
        hasJiraConnection ? 'bg-green-500' : 'bg-red-500'
      }`}></div>
      <span className={`text-xs ${
        hasJiraConnection ? 'text-green-400' : 'text-red-400'
      }`}>
        {hasJiraConnection ? 'JIRA Connected' : 'JIRA Not Connected'}
      </span>
    </button>
  );
};

export default JiraStatus;