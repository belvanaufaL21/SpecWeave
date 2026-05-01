import { useState, useRef, useEffect } from 'react';
import toast from 'react-hot-toast';
import { jiraService } from '../../services/jiraService';
import { useJira } from '../../contexts/JiraContext';
import { getCurrentChatId } from '../../utils/helpers/jiraServiceHelpers';
import UserDataService from '../../services/UserDataService';
import cleanLogger from '../../config/cleanLogging.js';
import { showErrorToast, showJiraExportSuccessToast } from '../../utils/toastNotifications';

const JiraExportCTA = ({ scenarioData }) => {
  const { epicContext, hasEpic, openEpicModal } = useJira();
  const [isExporting, setIsExporting] = useState(false);
  const exportInProgressRef = useRef(false);
  const scenarioDataRef = useRef(null);
  const componentIdRef = useRef(`cta-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`);
  const isMountedRef = useRef(false);

  // Snapshot scenarioData on mount/update to prevent closure issues
  scenarioDataRef.current = scenarioData;
  
  // Track mount state to prevent StrictMode double execution
  useEffect(() => {
    if (!isMountedRef.current) {
      isMountedRef.current = true;
      console.log(`🟦 [JIRA-CTA][${componentIdRef.current}] Component mounted`);
    }
    
    return () => {
      console.log(`🟥 [JIRA-CTA][${componentIdRef.current}] Component unmounting`);
    };
  }, []);
  
  // Log component render for debugging
  console.log(`🔵 [JIRA-CTA][${componentIdRef.current}] Component rendered with:`, {
    hasScenarioData: !!scenarioData,
    feature: scenarioData?.feature?.substring(0, 30),
    userStory: scenarioData?.userStory?.substring(0, 30),
    scenarioCount: scenarioData?.scenarios?.length,
    hasDevelopmentTasks: !!scenarioData?.developmentTasks,
    isMounted: isMountedRef.current
  });

  // Handle export to JIRA
  const handleExportToJira = async () => {
    // Generate unique export ID for tracking
    const exportId = `export-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    console.log(`🔷 [JIRA-EXPORT][${componentIdRef.current}][${exportId}] Export button clicked`);
    console.log(`🔷 [JIRA-EXPORT][${componentIdRef.current}][${exportId}] Current state:`, {
      isExporting,
      exportInProgress: exportInProgressRef.current,
      isMounted: isMountedRef.current
    });
    
    // CRITICAL: Prevent double-click and React StrictMode double render
    // Check BOTH state and ref to catch all cases
    if (exportInProgressRef.current) {
      console.log(`🛑 [JIRA-EXPORT][${componentIdRef.current}][${exportId}] BLOCKED: exportInProgressRef is true`);
      return;
    }
    
    if (isExporting) {
      console.log(`🛑 [JIRA-EXPORT][${componentIdRef.current}][${exportId}] BLOCKED: isExporting is true`);
      return;
    }
    
    // Set lock IMMEDIATELY before any async operations
    exportInProgressRef.current = true;
    console.log(`🔒 [JIRA-EXPORT][${componentIdRef.current}][${exportId}] Lock acquired IMMEDIATELY`);

    // Use snapshot of scenarioData to prevent closure issues
    const dataToExport = scenarioDataRef.current;
    
    // Log data being exported for debugging
    console.log(`📤 [JIRA-EXPORT][${componentIdRef.current}][${exportId}] Starting export with data:`, {
      feature: dataToExport?.feature,
      userStory: dataToExport?.userStory?.substring(0, 50),
      scenarioCount: dataToExport?.scenarios?.length,
      timestamp: new Date().toISOString()
    });
    if (!hasEpic || !epicContext) {
      showErrorToast('No Epic selected. Please select an Epic first.');
      openEpicModal();
      return;
    }

    if (!epicContext.epicData) {
      showErrorToast('Invalid Epic context. Please select an Epic again.');
      openEpicModal();
      return;
    }

    let chatId = null;

    try {
      // Set state AFTER ref lock to ensure ref is checked first
      setIsExporting(true);
      
      console.log(`🔒 [JIRA-EXPORT][${exportId}] State set to exporting`);

      chatId = getCurrentChatId();
      const { epic, connection } = epicContext.epicData;

      // Validate required data
      if (!epic || !epic.id) {
        throw new Error('Invalid Epic data: Epic ID is missing');
      }

      if (!connection || !connection.id) {
        throw new Error('Invalid connection data: Connection ID is missing');
      }
      
      // Validate scenario data - use snapshot
      if (!dataToExport.feature && !dataToExport.userStory) {
        throw new Error('Story title is required (feature or userStory)');
      }

      // Prepare scenarios for acceptance criteria table
      const scenarios = dataToExport.scenarios ? dataToExport.scenarios.map((scenario, index) => {
        
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
      const developmentTasks = dataToExport.developmentTasks || [];
      
      // Prepare story data for JIRA (include scenarios for acceptance criteria table)
      const storyData = {
        title: dataToExport.feature || dataToExport.userStory || 'Generated User Story',
        userStory: dataToExport.userStory || dataToExport.feature || 'User Story',
        description: dataToExport.description || dataToExport.feature || 'Generated from scenario data',
        featureName: dataToExport.feature || 'Feature',
        scenarios: scenarios, // Include scenarios in storyData for the acceptance criteria table
        epic: epic,
        connection: connection
      };
      
      // Debug: Log export data
      console.log(`📋 [JIRA-EXPORT][${exportId}] Sending to API:`, {
        scenarioCount: scenarios.length,
        taskCount: developmentTasks.length,
        storyTitle: storyData.title,
        chatId: chatId
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
        console.log(`✅ [JIRA-EXPORT][${exportId}] Export successful`);
        const issueKey = result.data.userStory?.key || result.data.issueKey || 'Story';
        const issueUrl = result.data.userStory?.url || result.data.issueUrl;
        const epicName = epicContext.epicData?.epic?.name || epicContext.epicData?.epic?.key || 'Epic';
        
        // Show success notification using helper
        showJiraExportSuccessToast(issueKey, issueUrl, epicName);
      } else {
        // Handle timeout specifically
        if (result.isTimeout) {
          showErrorToast(result.error, { duration: 5000 });
        } else {
          throw new Error(result.error || 'Failed to export to JIRA');
        }
      }
    } catch (error) {
      console.error(`❌ [JIRA-EXPORT][${exportId}] Export error:`, error);
      
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
      console.log(`🔓 [JIRA-EXPORT][${exportId}] Export unlocking`);
      setIsExporting(false);
      // Keep ref locked for longer to prevent rapid re-exports
      setTimeout(() => {
        exportInProgressRef.current = false;
        console.log(`✓ [JIRA-EXPORT][${exportId}] Export fully unlocked after delay`);
      }, 2000); // Increased from 1000ms to 2000ms
    }
  };

  // Don't show if no scenario data
  if (!scenarioData || !scenarioData.scenarios) {
    return null;
  }
  
  // Don't show for user messages or messages without proper feature/userStory
  if (!scenarioData.feature && !scenarioData.userStory) {
    return null;
  }
  
  // Don't show if scenarios is empty
  if (!Array.isArray(scenarioData.scenarios) || scenarioData.scenarios.length === 0) {
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