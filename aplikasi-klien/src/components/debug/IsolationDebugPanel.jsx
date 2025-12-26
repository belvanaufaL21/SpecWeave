import React, { useState, useEffect } from 'react';
import { jiraService } from '../../services/jiraService';
import AutoIsolationTest from './AutoIsolationTest';
import SimpleChatTest from './SimpleChatTest';

const IsolationDebugPanel = () => {
  const [debugData, setDebugData] = useState(null);
  const [isVisible, setIsVisible] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [activeTab, setActiveTab] = useState('simple'); // Start with simple test

  // Auto refresh every 2 seconds when enabled
  useEffect(() => {
    let interval;
    if (autoRefresh && activeTab === 'monitor') {
      interval = setInterval(() => {
        loadDebugData();
      }, 2000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [autoRefresh, activeTab]);

  // Load debug data
  const loadDebugData = async () => {
    try {
      const isolationState = jiraService.debugIsolationState();
      const allProjects = jiraService.getAllActiveProjects();
      const allEpics = jiraService.getAllEpicContexts();
      
      setDebugData({
        isolationState,
        allProjects: allProjects.data || {},
        allEpics: allEpics.data || {},
        timestamp: new Date().toLocaleTimeString()
      });
    } catch (error) {
      console.error('Error loading debug data:', error);
    }
  };

  // Initial load
  useEffect(() => {
    if (isVisible && activeTab === 'monitor') {
      loadDebugData();
    }
  }, [isVisible, activeTab]);

  // Clear all data
  const handleClearAll = () => {
    const result = jiraService.clearAllIsolationData();
    console.log('Clear result:', result);
    loadDebugData();
    alert(`Cleared ${result.clearedEpicContexts || 0} Epic contexts and all project data`);
  };

  // Test isolation
  const handleTestIsolation = () => {
    const testProjectId = `test-project-${Date.now()}`;
    jiraService.testIsolation(testProjectId);
    loadDebugData();
  };

  if (!isVisible) {
    return (
      <div className="fixed bottom-4 right-4 z-50">
        <button
          onClick={() => setIsVisible(true)}
          className="px-3 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 transition-colors shadow-lg"
          title="Open Isolation Debug Panel"
        >
          🔍 Debug Isolation
        </button>
      </div>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 w-96 max-h-[500px] bg-[#16161e] border border-white/10 rounded-lg shadow-xl">
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-white/10">
        <div className="flex items-center gap-2">
          <h3 className="text-white font-medium text-sm">Isolation Debug</h3>
          {activeTab === 'monitor' && debugData?.timestamp && (
            <span className="text-xs text-gray-400">
              {debugData.timestamp}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {activeTab === 'monitor' && (
            <>
              <button
                onClick={() => setAutoRefresh(!autoRefresh)}
                className={`px-2 py-1 text-xs rounded ${
                  autoRefresh 
                    ? 'bg-green-600 text-white' 
                    : 'bg-gray-600 text-gray-300'
                }`}
                title="Auto refresh every 2s"
              >
                {autoRefresh ? '⏸️' : '▶️'}
              </button>
              <button
                onClick={loadDebugData}
                className="px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700"
                title="Refresh now"
              >
                🔄
              </button>
            </>
          )}
          <button
            onClick={() => setIsVisible(false)}
            className="text-gray-400 hover:text-white"
          >
            ✕
          </button>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex border-b border-white/10">
        <button
          onClick={() => setActiveTab('simple')}
          className={`flex-1 px-3 py-2 text-xs ${
            activeTab === 'simple' 
              ? 'bg-green-600 text-white' 
              : 'text-gray-400 hover:text-white'
          }`}
        >
          🎯 Simple Test
        </button>
        <button
          onClick={() => setActiveTab('test')}
          className={`flex-1 px-3 py-2 text-xs ${
            activeTab === 'test' 
              ? 'bg-blue-600 text-white' 
              : 'text-gray-400 hover:text-white'
          }`}
        >
          🧪 Auto Test
        </button>
        <button
          onClick={() => setActiveTab('monitor')}
          className={`flex-1 px-3 py-2 text-xs ${
            activeTab === 'monitor' 
              ? 'bg-blue-600 text-white' 
              : 'text-gray-400 hover:text-white'
          }`}
        >
          📊 Monitor
        </button>
      </div>

      {/* Content */}
      <div className="max-h-96 overflow-y-auto">
        {activeTab === 'simple' ? (
          <div className="p-3">
            <SimpleChatTest />
          </div>
        ) : activeTab === 'test' ? (
          <div className="p-3">
            <AutoIsolationTest />
          </div>
        ) : (
          <div className="p-3 space-y-3">
            {/* Current Chat Info */}
            {debugData?.isolationState && (
              <div className="bg-[#0a0a0f] rounded p-2">
                <h4 className="text-white text-xs font-medium mb-2">Current Chat</h4>
                <div className="space-y-1 text-xs">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Chat ID:</span>
                    <span className="text-green-400 font-mono text-[10px]">
                      {debugData.isolationState.currentChatId?.slice(-12)}...
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Window:</span>
                    <span className="text-blue-400 font-mono text-[10px]">
                      {debugData.isolationState.windowName?.slice(-12)}...
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Project:</span>
                    <span className="text-purple-400 text-[10px]">
                      {debugData.isolationState.currentChatProject || 'None'}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* All Active Projects */}
            <div className="bg-[#0a0a0f] rounded p-2">
              <h4 className="text-white text-xs font-medium mb-2">
                All Active Projects ({Object.keys(debugData?.allProjects || {}).length})
              </h4>
              {Object.keys(debugData?.allProjects || {}).length === 0 ? (
                <p className="text-gray-500 text-xs">No active projects</p>
              ) : (
                <div className="space-y-1">
                  {Object.entries(debugData?.allProjects || {}).map(([chatId, projectId]) => (
                    <div key={chatId} className="flex justify-between text-xs">
                      <span className="text-gray-400 font-mono">
                        {chatId.slice(-8)}...
                      </span>
                      <span className="text-purple-400">
                        {projectId?.slice(-8)}...
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* All Epic Contexts */}
            <div className="bg-[#0a0a0f] rounded p-2">
              <h4 className="text-white text-xs font-medium mb-2">
                All Epic Contexts ({Object.keys(debugData?.allEpics || {}).length})
              </h4>
              {Object.keys(debugData?.allEpics || {}).length === 0 ? (
                <p className="text-gray-500 text-xs">No Epic contexts</p>
              ) : (
                <div className="space-y-1">
                  {Object.entries(debugData?.allEpics || {}).map(([chatId, epicData]) => (
                    <div key={chatId} className="text-xs">
                      <div className="flex justify-between">
                        <span className="text-gray-400 font-mono">
                          {chatId.slice(-8)}...
                        </span>
                        <span className="text-green-400">
                          {epicData?.epicId ? 'Has Epic' : 'No Epic'}
                        </span>
                      </div>
                      {epicData?.epicData?.epic?.name && (
                        <div className="text-[10px] text-gray-500 ml-2">
                          {epicData.epicData.epic.name.slice(0, 20)}...
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Isolation Status */}
            <div className="bg-[#0a0a0f] rounded p-2">
              <h4 className="text-white text-xs font-medium mb-2">Isolation Status</h4>
              <div className="space-y-1 text-xs">
                <div className="flex justify-between">
                  <span className="text-gray-400">Total Chats:</span>
                  <span className="text-white">
                    {Math.max(
                      Object.keys(debugData?.allProjects || {}).length,
                      Object.keys(debugData?.allEpics || {}).length
                    )}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Isolation:</span>
                  <span className={`${
                    Object.keys(debugData?.allProjects || {}).length > 1 ||
                    Object.keys(debugData?.allEpics || {}).length > 1
                      ? 'text-green-400' 
                      : 'text-yellow-400'
                  }`}>
                    {Object.keys(debugData?.allProjects || {}).length > 1 ||
                     Object.keys(debugData?.allEpics || {}).length > 1
                      ? 'Working ✅' 
                      : 'Single Chat'}
                  </span>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-2">
              <button
                onClick={handleTestIsolation}
                className="flex-1 px-2 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700"
              >
                Test Isolation
              </button>
              <button
                onClick={handleClearAll}
                className="flex-1 px-2 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700"
              >
                Clear All
              </button>
            </div>

            {/* Instructions */}
            <div className="bg-blue-500/10 border border-blue-500/20 rounded p-2">
              <p className="text-blue-300 text-[10px] leading-relaxed">
                <strong>Test Steps:</strong><br/>
                1. Set different projects in different tabs<br/>
                2. Watch "Total Chats" increase<br/>
                3. Each tab should show different data<br/>
                4. "Isolation: Working ✅" = Success!
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default IsolationDebugPanel;