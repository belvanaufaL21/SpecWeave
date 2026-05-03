import { useState } from 'react';
import { useJira } from '../../contexts/JiraContext';
import { getEpicContextDisplayText, isEpicContextConsistent } from '../../utils/helpers/activeProjectHelpers';

const EpicInfoBanner = ({ onSelectEpic, className = '' }) => {
  const { 
    epicContext, 
    hasEpic, 
    isLoadingEpic, 
    clearEpicContext,
    openEpicModal,
    connections
  } = useJira();
  
  const [isExpanded, setIsExpanded] = useState(false);

  const handleSelectEpic = () => {
    if (onSelectEpic) {
      onSelectEpic();
    } else {
      openEpicModal();
    }
  };

  const handleClearEpic = async () => {
    try {
      await clearEpicContext();
    } catch (error) {
      console.error('Error clearing Epic context:', error);
    }
  };

  if (isLoadingEpic) {
    return (
      <div className={`bg-blue-500/10 border border-blue-500/20 rounded-lg p-3 ${className}`}>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 border border-blue-400/30 border-t-blue-400 rounded-full animate-spin"></div>
          <span className="text-blue-300 text-sm">Loading Epic context...</span>
        </div>
      </div>
    );
  }

  if (!hasEpic || !epicContext) {
    return (
      <div className={`bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-3 ${className}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
            <span className="text-yellow-300 text-sm font-medium">No Epic Selected</span>
          </div>
          <button
            onClick={handleSelectEpic}
            className="px-3 py-1 bg-yellow-600 hover:bg-yellow-700 text-white text-xs rounded-md transition-colors"
          >
            Select Epic
          </button>
        </div>
        <p className="text-yellow-300/80 text-xs mt-1">
          Select an Epic to enable JIRA export for generated scenarios
        </p>
      </div>
    );
  }

  const { epic, connection } = epicContext?.epicData || {};
  
  // Check if Epic context is consistent with active project
  const isConsistent = isEpicContextConsistent(epicContext, connections);
  const { text, warning } = getEpicContextDisplayText(hasEpic, epicContext, connections);

  return (
    <div className={`${isConsistent ? 'bg-green-500/10 border-green-500/20' : 'bg-yellow-500/10 border-yellow-500/20'} border rounded-lg p-3 ${className}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <svg className={`w-4 h-4 ${isConsistent ? 'text-green-400' : 'text-yellow-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <span className={`text-sm font-medium ${isConsistent ? 'text-green-300' : 'text-yellow-300'}`}>
            {isConsistent ? 'Epic Connected' : 'Epic Context Warning'}
          </span>
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className={`text-xs underline ${isConsistent ? 'text-green-400 hover:text-green-300' : 'text-yellow-400 hover:text-yellow-300'}`}
          >
            {isExpanded ? 'Hide Details' : 'Show Details'}
          </button>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleSelectEpic}
            className="px-2 py-1 bg-green-600 hover:bg-green-700 text-white text-xs rounded-md transition-colors"
          >
            Change
          </button>
          <button
            onClick={handleClearEpic}
            className="px-2 py-1 bg-red-600 hover:bg-red-700 text-white text-xs rounded-md transition-colors"
          >
            Clear
          </button>
        </div>
      </div>

      <div className="mt-2">
        <p className={`text-sm ${isConsistent ? 'text-green-300' : 'text-yellow-300'}`}>
          <span className="font-medium">{text}</span>
        </p>
        {warning && (
          <p className="text-yellow-400 text-xs mt-1">⚠️ {warning}</p>
        )}
        {isConsistent && epic && (
          <p className="text-green-300/70 text-xs">
            Status: {epic.status || 'Unknown'}
          </p>
        )}
      </div>

      {isExpanded && (
        <div className="mt-3 p-2 bg-green-500/5 rounded border border-green-500/10">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
            <div>
              <p className="text-green-300 font-medium mb-1">Epic Details:</p>
              <p className="text-green-300/80">Key: {epic.key}</p>
              <p className="text-green-300/80">Status: {epic.status || 'Unknown'}</p>
              <p className="text-green-300/80">Assignee: {epic.assignee || 'Unassigned'}</p>
            </div>
            <div>
              <p className="text-green-300 font-medium mb-1">Connection:</p>
              <p className="text-green-300/80">
                Project: {connection?.project_name || connection?.project_key}
                {connection?.project_name && connection?.project_key && (
                  <span className="text-green-300/60 ml-1 font-mono">({connection.project_key})</span>
                )}
              </p>
              <p className="text-green-300/80">Issue Type: {connection.issue_type || 'Story'}</p>
              <a 
                href={`${connection.jira_url}/browse/${epic.key}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-green-400 hover:text-green-300 underline"
              >
                View in JIRA →
              </a>
            </div>
          </div>
        </div>
      )}

      <div className="mt-2 flex items-center gap-1">
        <svg className="w-3 h-3 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
        <span className="text-green-300/80 text-xs">
          Ready to export scenarios to JIRA
        </span>
      </div>
    </div>
  );
};

export default EpicInfoBanner;