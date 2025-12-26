import React, { useState, useEffect } from 'react';
import { jiraService } from '../../services/jiraService';

const AutoIsolationTest = () => {
  const [testResults, setTestResults] = useState(null);
  const [isRunning, setIsRunning] = useState(false);

  // Run automatic isolation test
  const runIsolationTest = async () => {
    setIsRunning(true);
    const results = {
      timestamp: new Date().toLocaleTimeString(),
      tests: []
    };

    try {
      // Test 1: Chat ID Generation
      const chatId1 = jiraService.getCurrentChatId();
      const chatId2 = jiraService.generateNewChatSession();
      const chatId3 = jiraService.getCurrentChatId();
      
      results.tests.push({
        name: 'Chat ID Generation',
        status: chatId1 !== chatId2 && chatId2 === chatId3 ? 'PASS' : 'FAIL',
        details: `Generated: ${chatId1.slice(-12)}... → ${chatId2.slice(-12)}...`,
        expected: 'Different IDs generated, current ID updated',
        actual: chatId1 !== chatId2 ? 'IDs are different ✅' : 'IDs are same ❌'
      });

      // Test 2: Project Storage Isolation
      const testProjectA = `test-project-a-${Date.now()}`;
      const testProjectB = `test-project-b-${Date.now()}`;
      
      await jiraService.setActiveProjectForChat(chatId3, testProjectA);
      const storedProject = await jiraService.getActiveProjectForChat(chatId3);
      
      results.tests.push({
        name: 'Project Storage',
        status: storedProject.success && storedProject.data.projectId === testProjectA ? 'PASS' : 'FAIL',
        details: `Stored: ${testProjectA.slice(-12)}..., Retrieved: ${storedProject.data?.projectId?.slice(-12)}...`,
        expected: 'Project stored and retrieved correctly',
        actual: storedProject.success ? 'Storage working ✅' : 'Storage failed ❌'
      });

      // Test 3: Epic Context Isolation
      const testEpicData = {
        epicId: `test-epic-${Date.now()}`,
        epicData: { test: true, timestamp: Date.now() }
      };
      
      await jiraService.setEpicContext(testEpicData.epicId, testEpicData.epicData);
      const storedEpic = await jiraService.getEpicContext();
      
      results.tests.push({
        name: 'Epic Context Storage',
        status: storedEpic.success && storedEpic.data?.epicId === testEpicData.epicId ? 'PASS' : 'FAIL',
        details: `Stored: ${testEpicData.epicId.slice(-12)}..., Retrieved: ${storedEpic.data?.epicId?.slice(-12)}...`,
        expected: 'Epic context stored and retrieved correctly',
        actual: storedEpic.success ? 'Epic storage working ✅' : 'Epic storage failed ❌'
      });

      // Test 4: Multi-Chat Simulation
      const allProjects = jiraService.getAllActiveProjects();
      const allEpics = jiraService.getAllEpicContexts();
      
      results.tests.push({
        name: 'Multi-Chat Data',
        status: Object.keys(allProjects.data || {}).length > 0 && Object.keys(allEpics.data || {}).length > 0 ? 'PASS' : 'FAIL',
        details: `Projects: ${Object.keys(allProjects.data || {}).length}, Epics: ${Object.keys(allEpics.data || {}).length}`,
        expected: 'Multiple chat data stored separately',
        actual: `${Object.keys(allProjects.data || {}).length} project(s), ${Object.keys(allEpics.data || {}).length} epic(s)`
      });

      // Test 5: Window Name Persistence
      const windowName = window.name;
      results.tests.push({
        name: 'Window Name',
        status: windowName && windowName.startsWith('specweave-window-') ? 'PASS' : 'FAIL',
        details: `Window name: ${windowName?.slice(-20)}...`,
        expected: 'Window name set and persistent',
        actual: windowName ? 'Window name exists ✅' : 'No window name ❌'
      });

      // Overall assessment
      const passedTests = results.tests.filter(t => t.status === 'PASS').length;
      const totalTests = results.tests.length;
      
      results.overall = {
        status: passedTests === totalTests ? 'ALL_PASS' : passedTests > totalTests / 2 ? 'MOSTLY_PASS' : 'FAIL',
        score: `${passedTests}/${totalTests}`,
        message: passedTests === totalTests 
          ? 'All isolation tests passed! ✅' 
          : passedTests > totalTests / 2 
            ? 'Most tests passed, some issues detected ⚠️'
            : 'Multiple test failures, isolation not working ❌'
      };

    } catch (error) {
      results.error = error.message;
      results.overall = {
        status: 'ERROR',
        score: '0/0',
        message: `Test error: ${error.message}`
      };
    }

    setTestResults(results);
    setIsRunning(false);
  };

  // Auto-run test on component mount
  useEffect(() => {
    runIsolationTest();
  }, []);

  if (!testResults) {
    return (
      <div className="bg-[#16161e] border border-white/10 rounded-lg p-4">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-700 rounded mb-2"></div>
          <div className="h-3 bg-gray-700 rounded w-2/3"></div>
        </div>
      </div>
    );
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'PASS': case 'ALL_PASS': return 'text-green-400';
      case 'MOSTLY_PASS': return 'text-yellow-400';
      case 'FAIL': case 'ERROR': return 'text-red-400';
      default: return 'text-gray-400';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'PASS': return '✅';
      case 'FAIL': return '❌';
      case 'ERROR': return '⚠️';
      default: return '⏳';
    }
  };

  return (
    <div className="bg-[#16161e] border border-white/10 rounded-lg p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-white font-medium">Isolation Test Results</h3>
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-400">{testResults.timestamp}</span>
          <button
            onClick={runIsolationTest}
            disabled={isRunning}
            className="px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
          >
            {isRunning ? '⏳' : '🔄'} Re-test
          </button>
        </div>
      </div>

      {/* Overall Status */}
      <div className={`p-3 rounded border ${
        testResults.overall?.status === 'ALL_PASS' 
          ? 'bg-green-500/10 border-green-500/20' 
          : testResults.overall?.status === 'MOSTLY_PASS'
            ? 'bg-yellow-500/10 border-yellow-500/20'
            : 'bg-red-500/10 border-red-500/20'
      }`}>
        <div className="flex items-center gap-2 mb-1">
          <span className={`font-medium ${getStatusColor(testResults.overall?.status)}`}>
            Overall: {testResults.overall?.score}
          </span>
          <span className="text-sm">
            {getStatusIcon(testResults.overall?.status)}
          </span>
        </div>
        <p className={`text-sm ${getStatusColor(testResults.overall?.status)}`}>
          {testResults.overall?.message}
        </p>
      </div>

      {/* Individual Tests */}
      <div className="space-y-2">
        <h4 className="text-white text-sm font-medium">Test Details:</h4>
        {testResults.tests.map((test, index) => (
          <div key={index} className="bg-[#0a0a0f] rounded p-2">
            <div className="flex items-center justify-between mb-1">
              <span className="text-white text-sm">{test.name}</span>
              <span className={`text-sm ${getStatusColor(test.status)}`}>
                {getStatusIcon(test.status)} {test.status}
              </span>
            </div>
            <div className="text-xs text-gray-400 space-y-1">
              <div><strong>Details:</strong> {test.details}</div>
              <div><strong>Result:</strong> {test.actual}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Error Display */}
      {testResults.error && (
        <div className="bg-red-500/10 border border-red-500/20 rounded p-2">
          <p className="text-red-400 text-sm">
            <strong>Error:</strong> {testResults.error}
          </p>
        </div>
      )}

      {/* Instructions */}
      <div className="bg-blue-500/10 border border-blue-500/20 rounded p-2">
        <p className="text-blue-300 text-xs">
          <strong>Next Steps:</strong> Open a new browser tab and run this test again. 
          You should see different Chat IDs and isolated data storage.
        </p>
      </div>
    </div>
  );
};

export default AutoIsolationTest;