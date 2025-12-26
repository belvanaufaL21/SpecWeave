// No React import needed for this component
import { useJira } from '../../contexts/JiraContext';
import { getEpicContextDisplayText } from '../../utils/helpers/activeProjectHelpers';

const JiraQuickActions = ({ onSelectEpic, onSetupJira, className = '' }) => {
  const { 
    hasConnection, 
    hasEpic, 
    connections, 
    epicContext, 
    isLoading,
    refreshAll,
    openEpicModal,
    openJiraSetupModal
  } = useJira();

  const handleSelectEpic = () => {
    if (onSelectEpic) {
      onSelectEpic();
    } else {
      openEpicModal();
    }
  };

  const handleSetupJira = () => {
    if (onSetupJira) {
      onSetupJira();
    } else {
      openJiraSetupModal();
    }
  };

  if (isLoading) {
    return (
      <div className={`bg-gray-800/50 border border-gray-700 rounded-lg p-3 ${className}`}>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 border border-gray-400/30 border-t-gray-400 rounded-full animate-spin"></div>
          <span className="text-gray-300 text-sm">Checking JIRA status...</span>
        </div>
      </div>
    );
  }

  const getStatusColor = () => {
    if (!hasConnection) return 'red';
    if (!hasEpic) return 'yellow';
    return 'green';
  };

  const getStatusIcon = () => {
    const color = getStatusColor();
    
    if (color === 'red') {
      return (
        <svg className="w-4 h-4 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      );
    }
    
    if (color === 'yellow') {
      return (
        <svg className="w-4 h-4 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
        </svg>
      );
    }
    
    return (
      <svg className="w-4 h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
      </svg>
    );
  };

  const getStatusMessage = () => {
    if (!hasConnection) {
      return 'JIRA not connected';
    }
    if (!hasEpic) {
      return 'No Epic selected';
    }
    return 'Ready for export';
  };

  const getPrimaryAction = () => {
    if (!hasConnection) {
      return {
        label: 'Setup JIRA',
        onClick: handleSetupJira,
        className: 'bg-blue-600 hover:bg-blue-700'
      };
    }
    if (!hasEpic) {
      return {
        label: 'Select Epic',
        onClick: handleSelectEpic,
        className: 'bg-yellow-600 hover:bg-yellow-700'
      };
    }
    return {
      label: 'Change Epic',
      onClick: handleSelectEpic,
      className: 'bg-green-600 hover:bg-green-700'
    };
  };

  const primaryAction = getPrimaryAction();

  return (
    <div className={`bg-gray-800/50 border border-gray-700 rounded-lg p-3 ${className}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {getStatusIcon()}
          <div>
            <p className="text-gray-300 text-sm font-medium">JIRA Integration</p>
            <p className="text-gray-400 text-xs">{getStatusMessage()}</p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <button
            onClick={primaryAction.onClick}
            className={`px-3 py-1 text-white text-xs rounded-md transition-colors ${primaryAction.className}`}
          >
            {primaryAction.label}
          </button>
          
          <button
            onClick={refreshAll}
            className="p-1 text-gray-400 hover:text-gray-300 transition-colors"
            title="Refresh status"
          >
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
        </div>
      </div>

      {hasConnection && connections.length > 0 && (
        <div className="mt-2 text-xs text-gray-400">
          {connections.length} JIRA connection{connections.length > 1 ? 's' : ''} available
        </div>
      )}

      {hasEpic && epicContext && (
        <div className="mt-2 p-2 bg-green-500/10 rounded border border-green-500/20">
          {(() => {
            const { text, isConsistent, warning } = getEpicContextDisplayText(hasEpic, epicContext, connections);
            return (
              <div>
                <p className={`text-xs ${isConsistent ? 'text-green-300' : 'text-yellow-300'}`}>
                  <span className="font-medium">{text}</span>
                </p>
                {warning && (
                  <p className="text-yellow-400 text-[10px] mt-1">⚠️ {warning}</p>
                )}
              </div>
            );
          })()}
        </div>
      )}
    </div>
  );
};

export default JiraQuickActions;