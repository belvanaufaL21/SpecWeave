import { useState, useRef } from 'react';
import toast from 'react-hot-toast';
import { jiraService } from '../../services/jiraService';
import { useJira } from '../../contexts/JiraContext';
import { getCurrentChatId } from '../../utils/helpers/jiraServiceHelpers';
import UserDataService from '../../services/UserDataService';
import cleanLogger from '../../config/cleanLogging.js';

const JiraExportCTA = ({ scenarioData }) => {
  const { epicContext, hasEpic, openEpicModal } = useJira();
  const [isExporting, setIsExporting] = useState(false);
  const exportInProgressRef = useRef(false);

  // Handle export to JIRA
  const handleExportToJira = async () => {
    // Prevent double-click and React StrictMode double render
    if (exportInProgressRef.current || isExporting) {
      console.log('🛑 [JIRA-EXPORT] Export already in progress, ignoring duplicate request');
      return;
    }

    if (!hasEpic || !epicContext) {
      toast.error('No Epic selected. Please select an Epic first.', {
        duration: 4000,
        position: 'top-right',
        style: {
          background: 'rgba(10, 10, 15, 0.95)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          color: '#fff',
          border: '1px solid rgba(239, 68, 68, 0.3)',
          borderRadius: '12px',
          boxShadow: '0 10px 40px rgba(239, 68, 68, 0.2)',
          padding: '12px'
        }
      });
      openEpicModal();
      return;
    }

    if (!epicContext.epicData) {
      toast.error('Invalid Epic context. Please select an Epic again.', {
        duration: 4000,
        position: 'top-right',
        style: {
          background: 'rgba(10, 10, 15, 0.95)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          color: '#fff',
          border: '1px solid rgba(239, 68, 68, 0.3)',
          borderRadius: '12px',
          boxShadow: '0 10px 40px rgba(239, 68, 68, 0.2)',
          padding: '12px'
        }
      });
      openEpicModal();
      return;
    }

    let exportId = null;
    const chatId = getCurrentChatId();

    try {
      // Set both state and ref to prevent concurrent exports
      setIsExporting(true);
      exportInProgressRef.current = true;

      const { epic, connection } = epicContext.epicData;

      // Validate required data
      if (!epic || !epic.id) {
        throw new Error('Invalid Epic data: Epic ID is missing');
      }

      if (!connection || !connection.id) {
        throw new Error('Invalid connection data: Connection ID is missing');
      }
      
      // Validate scenario data
      if (!scenarioData.feature && !scenarioData.userStory) {
        throw new Error('Story title is required (feature or userStory)');
      }

      // Prepare scenarios for acceptance criteria table
      const scenarios = scenarioData.scenarios ? scenarioData.scenarios.map((scenario, index) => {
        
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

      // Prepare development tasks
      const developmentTasks = scenarioData.developmentTasks || [];
      
      // Prepare story data for JIRA (include scenarios for acceptance criteria table)
      const storyData = {
        title: scenarioData.feature || scenarioData.userStory || 'Generated User Story',
        userStory: scenarioData.userStory || scenarioData.feature || 'User Story',
        description: scenarioData.description || scenarioData.feature || 'Generated from scenario data',
        featureName: scenarioData.feature || 'Feature',
        scenarios: scenarios, // Include scenarios in storyData for the acceptance criteria table
        epic: epic,
        connection: connection
      };
      
      // Debug: Log export data
      console.log('📋 [JIRA-EXPORT] Exporting to JIRA:', {
        scenarioCount: scenarios.length,
        taskCount: developmentTasks.length,
        storyTitle: storyData.title
      });
      
      // Create user story with scenarios and development tasks
      const result = await jiraService.createCompleteStory(
        connection.id,
        epic.id,
        storyData,
        scenarios,
        developmentTasks
      );

      if (result.success) {
        const issueKey = result.data.userStory?.key || result.data.issueKey || 'Story';
        const issueUrl = result.data.userStory?.url || result.data.issueUrl;
        const epicName = epicContext.epicData?.epic?.name || epicContext.epicData?.epic?.key || 'Epic';
        
        // Show simple, clean success notification
        toast.success(
          (t) => (
            <div className="flex items-center gap-3">
              {/* JIRA Logo */}
              <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center">
                <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M11.571 11.513H0a5.218 5.218 0 0 0 5.232 5.215h2.13v2.057A5.215 5.215 0 0 0 12.575 24V12.518a1.005 1.005 0 0 0-1.005-1.005zm5.723-5.756H5.736a5.215 5.215 0 0 0 5.215 5.214h2.129v2.058a5.218 5.218 0 0 0 5.215 5.214V6.758a1.001 1.001 0 0 0-1.001-1.001zM23.013 0H11.455a5.215 5.215 0 0 0 5.215 5.215h2.129v2.057A5.215 5.215 0 0 0 24 12.483V1.005A1.001 1.001 0 0 0 23.013 0z"/>
                </svg>
              </div>
              
              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-white text-base mb-1">Export Berhasil!</div>
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-gray-400">{epicName}:</span>
                  <span className="font-mono font-semibold text-purple-400">{issueKey}</span>
                </div>
              </div>
              
              {/* Arrow Link to JIRA */}
              {issueUrl && (
                <a
                  href={issueUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-shrink-0 w-8 h-8 rounded-lg bg-purple-500/20 hover:bg-purple-500/30 flex items-center justify-center transition-colors group"
                  onClick={() => toast.dismiss(t.id)}
                  title="Buka di JIRA"
                >
                  <svg className="w-4 h-4 text-purple-400 group-hover:text-purple-300 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                </a>
              )}
            </div>
          ),
          {
            duration: 5000,
            position: 'top-right',
            style: {
              background: 'rgba(10, 10, 15, 0.95)',
              backdropFilter: 'blur(16px)',
              WebkitBackdropFilter: 'blur(16px)',
              color: '#fff',
              border: '1px solid rgba(139, 92, 246, 0.3)',
              borderRadius: '12px',
              boxShadow: '0 10px 40px rgba(139, 92, 246, 0.2)',
              padding: '18px 24px',
              minWidth: '340px'
            },
            icon: null
          }
        );
      } else {
        // Handle timeout specifically
        if (result.isTimeout) {
          toast.error(result.error, {
            duration: 5000,
            position: 'top-right',
            style: {
              background: 'rgba(10, 10, 15, 0.95)',
              backdropFilter: 'blur(16px)',
              WebkitBackdropFilter: 'blur(16px)',
              color: '#fff',
              border: '1px solid rgba(234, 179, 8, 0.3)',
              borderRadius: '12px',
              boxShadow: '0 10px 40px rgba(234, 179, 8, 0.2)',
              padding: '18px 24px'
            }
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
        
        // Log validation details if available
        if (error.response.data.details) {
          console.error('Validation errors:', error.response.data.details);
          const validationErrors = error.response.data.details
            .map(err => err.msg)
            .join(', ');
          errorMessage = `Validation failed: ${validationErrors}`;
        }
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      // Add helpful context for common errors
      if (errorMessage.includes('401') || errorMessage.includes('not authenticated')) {
        errorMessage = 'Authentication failed. Please check your JIRA credentials.';
      } else if (errorMessage.includes('403') || errorMessage.includes('Permission denied')) {
        errorMessage = 'Permission denied. Please check your JIRA permissions.';
      } else if (errorMessage.includes('404') || errorMessage.includes('not found')) {
        errorMessage = 'JIRA resource not found. Please check your Epic and project settings.';
      } else if (errorMessage.includes('Field errors')) {
        errorMessage = 'JIRA field validation failed. ' + errorMessage;
      }
      
      toast.error(
        (t) => (
          <div className="flex flex-col gap-2">
            <div className="font-semibold text-white text-base">Export Gagal</div>
            <div className="text-sm text-gray-300 leading-relaxed">{errorMessage}</div>
          </div>
        ),
        {
          duration: 5000,
          position: 'top-right',
          style: {
            background: 'rgba(10, 10, 15, 0.95)',
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
            color: '#fff',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            borderRadius: '12px',
            boxShadow: '0 10px 40px rgba(239, 68, 68, 0.2)',
            padding: '18px 24px',
            minWidth: '300px'
          },
          icon: null
        }
      );
    } finally {
      setIsExporting(false);
      // Add small delay before allowing next export to prevent rapid double-clicks
      setTimeout(() => {
        exportInProgressRef.current = false;
      }, 1000);
    }
  };

  // Don't show if no scenario data
  if (!scenarioData || !scenarioData.scenarios) {
    return null;
  }

  return (
    <div className="mt-6 flex justify-end">
      {/* Export Button - Animated Loading State */}
      <button
        onClick={handleExportToJira}
        disabled={isExporting || !hasEpic || !epicContext}
        className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-medium transition-all ${
          isExporting || !hasEpic || !epicContext
            ? 'bg-gray-600/20 border border-gray-600/30 text-gray-500 cursor-not-allowed'
            : 'bg-[#120C18] hover:bg-[#1A1020] text-[#C27AFF] border border-[#2C1A43]'
        }`}
        title="Export to JIRA"
      >
        {isExporting ? (
          <>
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            <span>Exporting...</span>
          </>
        ) : (
          <>
            <span>Export ke</span>
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
              <path d="M11.571 11.513H0a5.218 5.218 0 0 0 5.232 5.215h2.13v2.057A5.215 5.215 0 0 0 12.575 24V12.518a1.005 1.005 0 0 0-1.005-1.005zm5.723-5.756H5.736a5.215 5.215 0 0 0 5.215 5.214h2.129v2.058a5.218 5.218 0 0 0 5.215 5.214V6.758a1.001 1.001 0 0 0-1.001-1.001zM23.013 0H11.455a5.215 5.215 0 0 0 5.215 5.215h2.129v2.057A5.215 5.215 0 0 0 24 12.483V1.005A1.001 1.001 0 0 0 23.013 0z"/>
            </svg>
          </>
        )}
      </button>
    </div>
  );
};

export default JiraExportCTA;