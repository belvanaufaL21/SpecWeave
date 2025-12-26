import { useState, useEffect } from 'react';
import { jiraService } from '../../services/jiraService';
import { useJira } from '../../contexts/JiraContext';
import { getActiveProjectInfo } from '../../utils/helpers/activeProjectHelpers';

const EpicContextDisplay = ({ onChangeEpic }) => {
  const [loading, setLoading] = useState(true);
  const [activeProject, setActiveProject] = useState(null);
  const [connections, setConnections] = useState([]); // Add connections state
  const [forceRender, setForceRender] = useState(0); // Force re-render counter

  // Use JiraContext for Epic management
  const { epicContext, clearEpicContext: clearEpicContextGlobal, forceEpicContextClear } = useJira();

  // Load Epic context on component mount
  useEffect(() => {
    loadActiveProject();
    loadConnections(); // Load connections for helper functions
    setLoading(false); // Epic context comes from JiraContext now
    
    // Optimized frequency check for project changes (every 8 seconds instead of 5)
    const interval = setInterval(checkForProjectChanges, 8000);
    
    // Listen for force Epic context events
    const handleForceEpicClear = () => {
      console.log('🔄 [EPIC-DISPLAY] Force Epic clear event received');
      if (onChangeEpic) {
        onChangeEpic(null);
      }
      // Force re-render
      setForceRender(prev => prev + 1);
    };
    
    const handleForceEpicRefresh = () => {
      console.log('🔄 [EPIC-DISPLAY] Force Epic refresh event received');
      // Reload active project to ensure sync
      loadActiveProject();
      // Force re-render
      setForceRender(prev => prev + 1);
    };
    
    // ENHANCED: Additional event listeners for Epic context reset
    const handleEpicContextReset = () => {
      console.log('🔄 [EPIC-DISPLAY] Epic context reset event received');
      if (onChangeEpic) {
        onChangeEpic(null);
      }
      // Force re-render
      setForceRender(prev => prev + 1);
    };
    
    const handleEpicContextCleared = () => {
      console.log('🔄 [EPIC-DISPLAY] Epic context cleared event received');
      if (onChangeEpic) {
        onChangeEpic(null);
      }
      // Force re-render
      setForceRender(prev => prev + 1);
    };
    
    window.addEventListener('forceEpicContextClear', handleForceEpicClear);
    window.addEventListener('forceEpicContextRefresh', handleForceEpicRefresh);
    window.addEventListener('epicContextReset', handleEpicContextReset);
    window.addEventListener('epicContextCleared', handleEpicContextCleared);
    
    return () => {
      clearInterval(interval);
      window.removeEventListener('forceEpicContextClear', handleForceEpicClear);
      window.removeEventListener('forceEpicContextRefresh', handleForceEpicRefresh);
      window.removeEventListener('epicContextReset', handleEpicContextReset);
      window.removeEventListener('epicContextCleared', handleEpicContextCleared);
    };
  }, []);

  // Balanced project change check (optimized with reasonable throttling)
  const checkForProjectChanges = async () => {
    try {
      // Skip check if Epic was recently force cleared (extended to 10 seconds)
      const lastClearTime = localStorage.getItem('epic_force_clear_time');
      if (lastClearTime && Date.now() - parseInt(lastClearTime) < 10000) {
        return;
      }
      
      // Balanced project check with 3-second timeout
      const currentActiveProject = await Promise.race([
        jiraService.getActiveConnectionForCurrentChat(),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Project check timeout')), 1500) // Reduced from 3000
        )
      ]);
      
      if (currentActiveProject.success) {
        const newProjectId = currentActiveProject.data.id;
        
        // If we have an active project and it changed
        if (activeProject && activeProject.id !== newProjectId) {
          console.log('🔄 [PROJECT-CHANGE] SMOOTH EPIC CLEAR');
          
          // OPTIMIZED: Single Epic clear operation
          try {
            forceEpicContextClear();
            
            // Update local state immediately
            setActiveProject(currentActiveProject.data);
            
            // Notify parent immediately
            if (onChangeEpic) {
              onChangeEpic(null);
            }
            
            // Single re-render trigger
            setForceRender(prev => prev + 1);
            
            console.log('✅ [PROJECT-CHANGE] SMOOTH EPIC CLEAR COMPLETED');
          } catch (clearError) {
            console.warn('Project change clear warning:', clearError.message);
          }
          
        } else if (!activeProject) {
          // First time setting active project
          setActiveProject(currentActiveProject.data);
        }
      }
    } catch (error) {
      // Balanced error handling - only log significant errors
      if (!error.message.includes('timeout') && !error.message.includes('Network Error')) {
        console.warn('Project change check warning:', error.message);
      }
    }
  };

  // Load current Epic context (removed - now comes from JiraContext)

  // Load active project for current chat
  const loadActiveProject = async () => {
    try {
      const result = await jiraService.getActiveConnectionForCurrentChat();
      if (result.success) {
        setActiveProject(result.data);
      } else {
        setActiveProject(null);
      }
    } catch (error) {
      console.error('Error loading active project:', error);
      setActiveProject(null);
    }
  };

  // Load connections for helper functions
  const loadConnections = async () => {
    try {
      const result = await jiraService.getConnections();
      if (result.success) {
        setConnections(result.data || []);
      } else {
        setConnections([]);
      }
    } catch (error) {
      console.error('Error loading connections:', error);
      setConnections([]);
    }
  };

  // Handle Epic context clear
  const handleClearEpic = async () => {
    try {
      await clearEpicContextGlobal(); // Use JiraContext method
      if (onChangeEpic) {
        onChangeEpic(null);
      }
    } catch (error) {
      console.error('Error clearing Epic context:', error);
    }
  };

  // Get status badge color
  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'to do': return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
      case 'in progress': return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
      case 'done': return 'bg-green-500/20 text-green-400 border-green-500/30';
      default: return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
    }
  };

  if (loading) {
    return (
      <div className="bg-[#16161e] border border-white/10 rounded-lg p-3">
        <div className="animate-pulse flex items-center gap-3">
          <div className="w-8 h-8 bg-gray-700 rounded"></div>
          <div className="flex-1">
            <div className="h-4 bg-gray-700 rounded mb-1"></div>
            <div className="h-3 bg-gray-700 rounded w-2/3"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!epicContext) {
    console.log('🎨 [EPIC-RENDER] Rendering NO EPIC state, activeProject:', activeProject?.custom_fields?.project_info?.name || activeProject?.project_key, 'forceRender:', forceRender);
    
    // Use helper function for consistent project display
    const activeProjectInfo = getActiveProjectInfo(connections);
    
    return (
      <div key={`no-epic-${forceRender}`} className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-3">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded bg-yellow-500/20 flex items-center justify-center">
            <svg className="w-4 h-4 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <div className="flex-1">
            <p className="text-yellow-400 text-sm font-medium">No Epic Selected</p>
            <p className="text-yellow-300 text-xs">Select an Epic to organize your user stories</p>
            {activeProjectInfo.success && (
              <p className="text-yellow-300 text-xs mt-1">
                Current project: {activeProjectInfo.projectName}
              </p>
            )}
          </div>
          <button
            onClick={() => onChangeEpic && onChangeEpic()}
            className="px-3 py-1 text-xs bg-yellow-600 text-white rounded hover:bg-yellow-700 transition-colors"
          >
            Select Epic
          </button>
        </div>
      </div>
    );
  }

  const { epicData } = epicContext;
  const epic = epicData?.epic;
  const connection = epicData?.connection;
  const workWithoutEpic = epicData?.workWithoutEpic;

  console.log('🎨 [EPIC-RENDER] Rendering EPIC state:', {
    epic: epic?.name,
    epicKey: epic?.key,
    epicProject: connection?.project_key,
    activeProject: activeProject?.project_key,
    workWithoutEpic,
    forceRender,
    fullEpicData: epic, // Add full epic data for debugging
    epicNameExists: !!epic?.name,
    epicKeyExists: !!epic?.key,
    epicNameValue: epic?.name,
    epicKeyValue: epic?.key,
    epicNameType: typeof epic?.name,
    epicKeyType: typeof epic?.key,
    epicNameLength: epic?.name?.length,
    epicKeyLength: epic?.key?.length,
    epicDataKeys: epic ? Object.keys(epic) : [],
    fullEpicContext: epicContext
  });

  return (
    <div key={`epic-${forceRender}`} className="bg-gradient-to-r from-purple-500/10 to-pink-500/10 border border-purple-500/20 rounded-lg p-3">
      <div className="flex items-center gap-3">
        {/* Icon */}
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
          workWithoutEpic 
            ? 'bg-gradient-to-br from-blue-500/20 to-cyan-500/20' 
            : 'bg-gradient-to-br from-purple-500/20 to-pink-500/20'
        }`}>
          <svg className={`w-5 h-5 ${workWithoutEpic ? 'text-blue-400' : 'text-purple-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            {workWithoutEpic ? (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            )}
          </svg>
        </div>

        {/* Context Info */}
        <div className="flex-1 min-w-0">
          {workWithoutEpic ? (
            <>
              <div className="flex items-center gap-2 mb-1">
                <h4 className="text-white text-base font-semibold">Epic Context</h4>
                <div className="w-2 h-2 rounded-full bg-blue-400"></div>
              </div>
              <p className="text-gray-300 text-sm">
                Working without Epic - Project: {(() => {
                  // Use helper function for consistent project display
                  const activeProjectInfo = getActiveProjectInfo(connections);
                  return activeProjectInfo.success ? activeProjectInfo.projectName : (connection?.custom_fields?.project_info?.name || connection?.project_key);
                })()}
              </p>
            </>
          ) : (
            <>
              <div className="flex items-center gap-2 mb-1">
                <h4 className="text-white text-base font-semibold">Epic Context</h4>
                <div className="w-2 h-2 rounded-full bg-purple-400"></div>
              </div>
              <div className="text-gray-300 text-sm">
                <div>
                  <span>Epic: </span>
                  <span className="text-purple-300 font-medium">
                    {/* Always show the most meaningful information */}
                    {epic?.name && epic.name !== epic?.key 
                      ? epic.name 
                      : epic?.summary && epic.summary !== epic?.key
                        ? epic.summary
                        : epic?.key || 'Unknown Epic'
                    }
                  </span>
                  {/* Always show key in parentheses for reference, unless it's the same as the displayed name */}
                  {epic?.key && (
                    (epic?.name && epic.name !== epic.key) || 
                    (epic?.summary && epic.summary !== epic.key && epic.summary !== epic?.name)
                  ) && (
                    <span className="text-gray-500 text-xs ml-2">({epic.key})</span>
                  )}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => onChangeEpic && onChangeEpic()}
            className="p-1.5 text-gray-400 hover:text-white transition-colors"
            title={workWithoutEpic ? "Select Epic" : "Change Epic"}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
};

export default EpicContextDisplay;