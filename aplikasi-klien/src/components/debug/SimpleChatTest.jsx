import React, { useState, useEffect } from 'react';
import { simpleChatIsolation } from '../../services/simpleChatIsolation';

const SimpleChatTest = () => {
  const [data, setData] = useState(null);
  const [testProject, setTestProject] = useState('');
  const [testEpic, setTestEpic] = useState('');

  // Load data
  const loadData = () => {
    const allData = simpleChatIsolation.getAllData();
    const currentProject = simpleChatIsolation.getActiveProject();
    const currentEpic = simpleChatIsolation.getEpicContext();
    
    setData({
      ...allData,
      currentProject,
      currentEpic,
      timestamp: new Date().toLocaleTimeString()
    });
  };

  // Auto-load on mount
  useEffect(() => {
    loadData();
  }, []);

  // Set test project
  const handleSetProject = () => {
    if (testProject.trim()) {
      simpleChatIsolation.setActiveProject(testProject.trim());
      loadData();
      setTestProject('');
    }
  };

  // Set test epic
  const handleSetEpic = () => {
    if (testEpic.trim()) {
      simpleChatIsolation.setEpicContext(testEpic.trim(), { name: testEpic.trim(), test: true });
      loadData();
      setTestEpic('');
    }
  };

  // Run auto test
  const handleAutoTest = () => {
    const result = simpleChatIsolation.testIsolation();
    setData({
      ...result,
      currentProject: simpleChatIsolation.getActiveProject(),
      currentEpic: simpleChatIsolation.getEpicContext(),
      timestamp: new Date().toLocaleTimeString()
    });
  };

  // Clear all
  const handleClearAll = () => {
    simpleChatIsolation.clearAllData();
    loadData();
  };

  // Force new chat
  const handleNewChat = () => {
    simpleChatIsolation.forceNewChatSession();
    loadData();
  };

  if (!data) {
    return <div className="p-4 text-white">Loading...</div>;
  }

  return (
    <div className="bg-[#16161e] border border-white/10 rounded-lg p-4 space-y-4 text-white">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="font-medium">Simple Chat Isolation Test</h3>
        <span className="text-xs text-gray-400">{data.timestamp}</span>
      </div>

      {/* Current Chat Info */}
      <div className="bg-[#0a0a0f] rounded p-3 space-y-2">
        <h4 className="text-sm font-medium text-blue-400">Current Chat</h4>
        <div className="text-xs space-y-1">
          <div><strong>Chat ID:</strong> <span className="font-mono text-green-400">{data.currentChatId?.slice(-20)}...</span></div>
          <div><strong>Active Project:</strong> <span className="text-purple-400">{data.currentProject || 'None'}</span></div>
          <div><strong>Active Epic:</strong> <span className="text-yellow-400">{data.currentEpic?.epicId || 'None'}</span></div>
        </div>
      </div>

      {/* All Data */}
      <div className="bg-[#0a0a0f] rounded p-3 space-y-2">
        <h4 className="text-sm font-medium text-blue-400">All Chats Data</h4>
        <div className="text-xs space-y-1">
          <div><strong>Total Chats:</strong> {data.totalChats}</div>
          <div><strong>All Projects:</strong></div>
          {Object.keys(data.allProjects).length === 0 ? (
            <div className="text-gray-500 ml-4">No projects</div>
          ) : (
            Object.entries(data.allProjects).map(([chatId, projectId]) => (
              <div key={chatId} className="ml-4 flex justify-between">
                <span className="font-mono text-gray-400">{chatId.slice(-15)}...</span>
                <span className="text-purple-400">{projectId}</span>
              </div>
            ))
          )}
          <div><strong>All Epics:</strong></div>
          {Object.keys(data.allEpics).length === 0 ? (
            <div className="text-gray-500 ml-4">No epics</div>
          ) : (
            Object.entries(data.allEpics).map(([chatId, epicData]) => (
              <div key={chatId} className="ml-4 flex justify-between">
                <span className="font-mono text-gray-400">{chatId.slice(-15)}...</span>
                <span className="text-yellow-400">{epicData.epicId}</span>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Test Controls */}
      <div className="space-y-3">
        <h4 className="text-sm font-medium text-blue-400">Test Controls</h4>
        
        {/* Set Project */}
        <div className="flex gap-2">
          <input
            type="text"
            value={testProject}
            onChange={(e) => setTestProject(e.target.value)}
            placeholder="Enter project name (e.g., SCRUM, HHH)"
            className="flex-1 px-2 py-1 text-xs bg-[#0a0a0f] border border-white/10 rounded text-white"
          />
          <button
            onClick={handleSetProject}
            className="px-3 py-1 text-xs bg-purple-600 rounded hover:bg-purple-700"
          >
            Set Project
          </button>
        </div>

        {/* Set Epic */}
        <div className="flex gap-2">
          <input
            type="text"
            value={testEpic}
            onChange={(e) => setTestEpic(e.target.value)}
            placeholder="Enter epic name (e.g., Epic-1, Epic-2)"
            className="flex-1 px-2 py-1 text-xs bg-[#0a0a0f] border border-white/10 rounded text-white"
          />
          <button
            onClick={handleSetEpic}
            className="px-3 py-1 text-xs bg-yellow-600 rounded hover:bg-yellow-700"
          >
            Set Epic
          </button>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2">
          <button
            onClick={handleAutoTest}
            className="px-3 py-1 text-xs bg-green-600 rounded hover:bg-green-700"
          >
            🧪 Auto Test
          </button>
          <button
            onClick={handleNewChat}
            className="px-3 py-1 text-xs bg-blue-600 rounded hover:bg-blue-700"
          >
            🆕 New Chat
          </button>
          <button
            onClick={loadData}
            className="px-3 py-1 text-xs bg-gray-600 rounded hover:bg-gray-700"
          >
            🔄 Refresh
          </button>
          <button
            onClick={handleClearAll}
            className="px-3 py-1 text-xs bg-red-600 rounded hover:bg-red-700"
          >
            🧹 Clear All
          </button>
        </div>
      </div>

      {/* Status */}
      <div className={`p-2 rounded text-xs ${
        data.totalChats > 1 
          ? 'bg-green-500/20 border border-green-500/30 text-green-400'
          : 'bg-yellow-500/20 border border-yellow-500/30 text-yellow-400'
      }`}>
        <strong>Status:</strong> {
          data.totalChats > 1 
            ? `✅ Isolation Working - ${data.totalChats} different chats detected`
            : '⚠️ Single chat - Open new browser tab to test isolation'
        }
      </div>

      {/* Instructions */}
      <div className="bg-blue-500/10 border border-blue-500/20 rounded p-2 text-xs text-blue-300">
        <strong>Test Steps:</strong><br/>
        1. Set a project name (e.g., "SCRUM") and click "Set Project"<br/>
        2. Set an epic name (e.g., "Epic-1") and click "Set Epic"<br/>
        3. Open a new browser tab with the same page<br/>
        4. In the new tab, set different project/epic (e.g., "HHH", "Epic-2")<br/>
        5. Switch between tabs - each should show different data<br/>
        6. Status should show "✅ Isolation Working" when multiple chats exist
      </div>
    </div>
  );
};

export default SimpleChatTest;