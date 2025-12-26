import { useState } from 'react';
import { jiraService } from '../../services/jiraService';
import { useJira } from '../../contexts/JiraContext';
import { getProjectDisplayText, getEpicContextDisplayText } from '../../utils/helpers/activeProjectHelpers';

const JiraExportCTA = ({ scenarioData }) => {
  const { epicContext, hasEpic, openEpicModal, connections } = useJira();
  const [isExporting, setIsExporting] = useState(false);
  const [exportStatus, setExportStatus] = useState(null);
  const [showDetails, setShowDetails] = useState(false);
  const [exportProgress, setExportProgress] = useState('');

  // Handle export to JIRA
  const handleExportToJira = async () => {
    console.log('🔍 Starting JIRA export...');
    console.log('🔍 Epic context:', epicContext);
    console.log('🔍 Scenario data:', scenarioData);

    if (!hasEpic || !epicContext) {
      setExportStatus({
        type: 'error',
        message: 'No Epic selected. Please select an Epic first.'
      });
      openEpicModal();
      return;
    }

    if (!epicContext.epicData) {
      setExportStatus({
        type: 'error',
        message: 'Invalid Epic context. Please select an Epic again.'
      });
      openEpicModal();
      return;
    }

    try {
      setIsExporting(true);
      setExportProgress('Preparing export data...');
      setExportStatus({
        type: 'info',
        message: 'Creating user story with acceptance criteria table in JIRA...'
      });

      const { epic, connection } = epicContext.epicData;
      
      console.log('🔍 Epic data:', epic);
      console.log('🔍 Connection data:', connection);

      // Validate required data
      if (!epic || !epic.id) {
        throw new Error('Invalid Epic data: Epic ID is missing');
      }

      if (!connection || !connection.id) {
        throw new Error('Invalid connection data: Connection ID is missing');
      }
      
      console.log('🔍 Original scenario data:', scenarioData);

      // Prepare scenarios for acceptance criteria table
      const scenarios = scenarioData.scenarios ? scenarioData.scenarios.map((scenario, index) => {
        console.log(`🔍 Processing scenario ${index + 1}:`, scenario);
        
        // Ensure each step is an array and filter out empty steps
        const given = scenario.given ? 
          (Array.isArray(scenario.given) ? scenario.given : [scenario.given]) : [];
        const when = scenario.when ? 
          (Array.isArray(scenario.when) ? scenario.when : [scenario.when]) : [];
        const then = scenario.then ? 
          (Array.isArray(scenario.then) ? scenario.then : [scenario.then]) : [];
        
        return {
          title: scenario.title || `Scenario ${index + 1}`,
          given: given.filter(step => step && step.trim()),
          when: when.filter(step => step && step.trim()),
          then: then.filter(step => step && step.trim())
        };
      }) : [];

      // Prepare story data for JIRA (include scenarios in storyData)
      const storyData = {
        title: scenarioData.feature || 'Generated User Story',
        userStory: scenarioData.userStory || scenarioData.feature || 'User Story',
        description: scenarioData.description || 'Generated from scenario data',
        featureName: scenarioData.feature || 'Feature',
        scenarios: scenarios // Include scenarios in storyData for the table
      };

      console.log('🔍 Prepared story data for JIRA:', JSON.stringify(storyData, null, 2));

      setExportProgress('Sending to JIRA...');
      
      // Create user story with scenarios in acceptance criteria table
      const result = await jiraService.createCompleteStory(
        connection.id,
        epic.id,
        storyData,
        [] // No separate scenarios needed - they're in storyData.scenarios
      );

      if (result.success) {
        const scenarioCount = result.data.scenarioCount || 0;
        const message = scenarioCount > 0 
          ? `Successfully exported to JIRA! User story created with ${scenarioCount} scenarios in acceptance criteria.`
          : 'Successfully exported to JIRA!';
          
        setExportStatus({
          type: 'success',
          message: message,
          data: result.data
        });
      } else {
        // Handle timeout specifically
        if (result.isTimeout) {
          setExportStatus({
            type: 'warning',
            message: result.error,
            data: null
          });
        } else {
          throw new Error(result.error || 'Failed to export to JIRA');
        }
      }
    } catch (error) {
      console.error('Export error:', error);
      
      let errorMessage = 'Failed to export to JIRA';
      
      // Extract more specific error messages
      if (error.response?.data?.error) {
        errorMessage = error.response.data.error;
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      // Add helpful context for common errors
      if (errorMessage.includes('401')) {
        errorMessage = 'Authentication failed. Please check your JIRA credentials.';
      } else if (errorMessage.includes('403')) {
        errorMessage = 'Permission denied. Please check your JIRA permissions.';
      } else if (errorMessage.includes('404')) {
        errorMessage = 'JIRA resource not found. Please check your Epic and project settings.';
      } else if (errorMessage.includes('Field errors')) {
        errorMessage = 'JIRA field validation failed. ' + errorMessage;
      }
      
      setExportStatus({
        type: 'error',
        message: errorMessage
      });
    } finally {
      setIsExporting(false);
      setExportProgress('');
    }
  };

  // Don't show if no scenario data
  if (!scenarioData || !scenarioData.scenarios) {
    return null;
  }

  return (
    <div className="border-t border-white/10 pt-4">
      {/* Epic Context Info */}
      {hasEpic && epicContext && (
        <div className="mb-3 p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
          <div className="flex items-center gap-2 mb-1">
            <svg className="w-4 h-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <span className="text-blue-400 text-xs font-medium">Ready to Export</span>
          </div>
          <p className="text-xs text-blue-300">
            {(() => {
              const { text, isConsistent, warning } = getEpicContextDisplayText(hasEpic, epicContext, connections);
              return (
                <span className={isConsistent ? '' : 'text-yellow-300'} title={warning || undefined}>
                  {text}
                </span>
              );
            })()}
          </p>
          <p className="text-xs text-blue-300/80">
            {getProjectDisplayText(connections)}
          </p>
        </div>
      )}

      {/* Export Status */}
      {exportStatus && (
        <div className={`mb-3 p-3 rounded-lg border ${
          exportStatus.type === 'success' 
            ? 'bg-green-500/10 border-green-500/20 text-green-300' 
            : exportStatus.type === 'warning'
            ? 'bg-yellow-500/10 border-yellow-500/20 text-yellow-300'
            : exportStatus.type === 'info'
            ? 'bg-blue-500/10 border-blue-500/20 text-blue-300'
            : 'bg-red-500/10 border-red-500/20 text-red-300'
        }`}>
          <div className="flex items-center gap-2 mb-1">
            {exportStatus.type === 'success' ? (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            ) : exportStatus.type === 'warning' ? (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            ) : exportStatus.type === 'info' ? (
              <div className="w-3 h-3 border border-blue-400/30 border-t-blue-400 rounded-full animate-spin"></div>
            ) : (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            )}
            <span className="text-xs font-medium">{exportStatus.message}</span>
          </div>
          
          {exportStatus.type === 'success' && exportStatus.data && (
            <div className="mt-2">
              <button
                onClick={() => setShowDetails(!showDetails)}
                className="text-xs text-green-400 hover:text-green-300 underline"
              >
                {showDetails ? 'Hide Details' : 'Show Details'}
              </button>
              
              {showDetails && (
                <div className="mt-2 p-2 bg-green-500/5 rounded border border-green-500/10">
                  <p className="text-xs text-green-300 mb-1">
                    <strong>User Story:</strong> 
                    <a 
                      href={exportStatus.data.userStory?.url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="ml-1 text-green-400 hover:text-green-300 underline"
                    >
                      {exportStatus.data.userStory?.key}
                    </a>
                  </p>
                  
                  {exportStatus.data.scenarioCount > 0 && (
                    <p className="text-xs text-green-300/80">
                      Contains {exportStatus.data.scenarioCount} scenarios in acceptance criteria table
                    </p>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Export Button */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
          </svg>
          <span className="text-xs text-gray-400">Export to JIRA</span>
        </div>

        <div className="flex flex-col items-end gap-1">
          {isExporting && exportProgress && (
            <div className="text-xs text-gray-400 animate-pulse">
              {exportProgress}
            </div>
          )}
          
          <button
            onClick={handleExportToJira}
            disabled={isExporting || !hasEpic}
            className={`
              px-4 py-2 rounded-lg text-xs font-medium transition-all duration-200
              ${hasEpic 
                ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-600/20 hover:shadow-blue-600/30' 
                : 'bg-gray-600 text-gray-300 cursor-not-allowed'
              }
              ${isExporting ? 'opacity-50 cursor-not-allowed' : ''}
              flex items-center gap-2
            `}
          >
            {isExporting ? (
              <>
                <div className="w-3 h-3 border border-white/30 border-t-white rounded-full animate-spin"></div>
                Exporting...
              </>
            ) : (
              <>
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
                Export to JIRA
              </>
            )}
          </button>
        </div>
      </div>

      {/* Help Text */}
      {!hasEpic && (
        <p className="text-xs text-gray-500 mt-2">
          Select an Epic first to enable JIRA export
        </p>
      )}
    </div>
  );
};

export default JiraExportCTA;