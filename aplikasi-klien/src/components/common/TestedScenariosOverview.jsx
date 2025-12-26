import { useNavigate } from 'react-router-dom';
import { useTestResults } from '../../contexts/TestResultsContext';
import { useEffect, useState } from 'react';

const TestedScenariosOverview = ({ activeChatId, chatMessages }) => {
  const { getAllTestResults } = useTestResults();
  const navigate = useNavigate();
  const [expandedScenarios, setExpandedScenarios] = useState(new Set());
  
  // Listen for test completion events to force re-render
  useEffect(() => {
    const handleTestCompleted = () => {
      // Component will re-render automatically due to key change in parent
    };
    
    window.addEventListener('meteorTestCompleted', handleTestCompleted);
    return () => window.removeEventListener('meteorTestCompleted', handleTestCompleted);
  }, []);
  
  // Get all test results
  const allResults = getAllTestResults();
  
  // Get test results and filter by current chat messages only
  let testResultsArray = [];
  let messageIds = [];
  
  if (chatMessages && Array.isArray(chatMessages) && chatMessages.length > 0) {
    // Get message IDs from current chat that are assistant messages
    // Look for messages that contain JSON with scenarios array
    messageIds = chatMessages
      .filter(msg => {
        // Check for both 'assistant' and 'ai' roles (useChat uses 'ai')
        if ((msg.role !== 'assistant' && msg.role !== 'ai') || !msg.id || !msg.content) return false;
        
        try {
          const data = JSON.parse(msg.content);
          return data.scenarios && Array.isArray(data.scenarios) && data.scenarios.length > 0;
        } catch {
          return false;
        }
      })
      .map(msg => msg.id);
    
    if (messageIds.length > 0) {
      // Filter test results to only include those from current chat
      testResultsArray = Object.values(allResults).filter(result => 
        messageIds.includes(result.messageId)
      );
    }
  } else {
    // No chat messages available
  }
  
  // Remove duplicates - keep only the most recent test for each scenario
  const uniqueResults = testResultsArray.reduce((acc, result) => {
    const key = `${result.messageId}-${result.scenarioIndex}`;
    
    // Only keep the most recent result for each messageId-scenarioIndex combination
    if (!acc[key] || new Date(result.timestamp) > new Date(acc[key].timestamp)) {
      acc[key] = result;
    }
    
    return acc;
  }, {});
  
  testResultsArray = Object.values(uniqueResults);
  
  // DO NOT show all results as fallback - only show results for current chat
  // Panel should be empty if no test results for current chat

  // Function to get User Story info from chat messages
  const getUserStoryInfo = (messageId) => {
    if (!chatMessages || !Array.isArray(chatMessages)) return null;
    
    const message = chatMessages.find(msg => msg.id === messageId);
    // Check for both 'assistant' and 'ai' roles
    if (!message || (message.role !== 'assistant' && message.role !== 'ai') || !message.content) return null;
    
    try {
      const data = JSON.parse(message.content);
      
      // Validate that this message actually contains scenarios
      if (!data.scenarios || !Array.isArray(data.scenarios)) {
        return null;
      }
      
      return {
        feature: data.feature || 'Unknown Feature',
        userStory: data.userStory || 'Unknown User Story',
        description: data.description || ''
      };
    } catch (error) {
      return null;
    }
  };

  // Group test results by User Story
  const groupedByUserStory = testResultsArray.reduce((acc, result) => {
    const userStoryInfo = getUserStoryInfo(result.messageId);
    
    // Create a more specific group key that includes both feature and userStory
    const groupKey = userStoryInfo 
      ? `${userStoryInfo.feature} - ${userStoryInfo.userStory}` 
      : `Unknown User Story (${result.messageId})`;
    
    if (!acc[groupKey]) {
      acc[groupKey] = {
        userStoryInfo,
        results: []
      };
    }
    acc[groupKey].results.push(result);
    return acc;
  }, {});

  const getScoreColor = (score) => {
    if (score >= 0.7) return 'text-green-400';
    if (score >= 0.5) return 'text-yellow-400';
    return 'text-red-400';
  };

  const getScoreBgColor = (score) => {
    if (score >= 0.7) return 'bg-green-500/10 border-green-500/20';
    if (score >= 0.5) return 'bg-yellow-500/10 border-yellow-500/20';
    return 'bg-red-500/10 border-red-500/20';
  };

  const getQualityLabel = (score) => {
    if (score >= 0.7) return 'Excellent';
    if (score >= 0.5) return 'Good';
    if (score >= 0.3) return 'Fair';
    return 'Poor';
  };

  const handleViewDetails = (testResult) => {
    if (testResult?.timestamp) {
      navigate(`/meteor-results/${testResult.timestamp}`);
    }
  };

  const toggleScenarioExpansion = (scenarioKey) => {
    setExpandedScenarios(prev => {
      const newSet = new Set(prev);
      if (newSet.has(scenarioKey)) {
        newSet.delete(scenarioKey);
      } else {
        newSet.add(scenarioKey);
      }
      return newSet;
    });
  };

  // Show empty state if no active chat or no test results for current chat messages
  if (!activeChatId || testResultsArray.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center p-6">
        <div className="w-16 h-16 rounded-2xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center mb-4">
          <svg className="w-8 h-8 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 002 2h2a2 2 0 002-2z" />
          </svg>
        </div>
        <h4 className="text-base font-medium text-white mb-2">
          {!activeChatId ? 'No Active Chat' : 'No Tested Scenarios'}
        </h4>
        <p className="text-sm text-gray-400 mb-4">
          {!activeChatId 
            ? 'Select a chat to see tested scenarios.'
            : 'Test scenarios in this chat to see results here.'
          }
        </p>
        <p className="text-xs text-gray-500">
          {!activeChatId 
            ? 'Start a new chat or select an existing one.'
            : 'Click the "Test" button on any scenario to get started.'
          }
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Tested Scenarios List - Grouped by User Story */}
      <div>
        <h4 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
          <svg className="w-4 h-4 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
          </svg>
          Tested Scenarios by User Story
        </h4>
        
        <div className="space-y-6">
          {Object.entries(groupedByUserStory).map(([groupKey, group], groupIndex) => (
            <div key={groupKey} className="space-y-3">
              {/* User Story Header - More Prominent */}
              <div className="bg-gradient-to-r from-blue-500/20 to-purple-500/20 border-2 border-blue-500/30 rounded-xl p-4 shadow-lg">
                <div className="flex items-start gap-3 mb-3">
                  <div className="w-8 h-8 rounded-lg bg-blue-500/40 flex items-center justify-center flex-shrink-0">
                    <svg className="w-4 h-4 text-blue-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h5 className="text-sm font-bold text-blue-300">
                        {group.userStoryInfo?.feature || `User Story ${groupIndex + 1}`}
                      </h5>
                      <span className="px-2 py-0.5 bg-blue-500/30 border border-blue-400/30 rounded-full text-[10px] font-semibold text-blue-200">
                        {group.results.length} scenario{group.results.length !== 1 ? 's' : ''} tested
                      </span>
                    </div>
                    {group.userStoryInfo?.userStory && (
                      <p className="text-xs text-gray-300 leading-relaxed italic">
                        "{group.userStoryInfo.userStory}"
                      </p>
                    )}
                  </div>
                </div>
                
                {/* Quick Stats for this User Story */}
                <div className="flex items-center gap-3 pt-3 border-t border-blue-400/20">
                  <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full bg-green-400"></div>
                    <span className="text-[10px] text-gray-400">
                      {group.results.filter(r => r.meteor_score >= 0.7).length} Excellent
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full bg-yellow-400"></div>
                    <span className="text-[10px] text-gray-400">
                      {group.results.filter(r => r.meteor_score >= 0.5 && r.meteor_score < 0.7).length} Good
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full bg-red-400"></div>
                    <span className="text-[10px] text-gray-400">
                      {group.results.filter(r => r.meteor_score < 0.5).length} Needs Work
                    </span>
                  </div>
                </div>
              </div>
              
              {/* Scenarios in this User Story - Accordion Design */}
              <div className="space-y-2 pl-4 border-l-2 border-blue-500/20">
                {group.results
                  .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
                  .map((result) => {
                    const scenarioKey = `${result.messageId}-${result.scenarioIndex}`;
                    const isExpanded = expandedScenarios.has(scenarioKey);
                    
                    return (
                      <div
                        key={result.timestamp}
                        className={`border rounded-lg overflow-hidden transition-all duration-200 ${getScoreBgColor(result.meteor_score)}`}
                      >
                        {/* Accordion Header - Clickable */}
                        <div 
                          className="p-3 cursor-pointer hover:bg-white/5 transition-colors"
                          onClick={() => toggleScenarioExpansion(scenarioKey)}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className="w-6 h-6 rounded-full bg-purple-500/20 text-purple-400 text-xs font-semibold flex items-center justify-center">
                                {result.scenarioIndex + 1}
                              </div>
                              <div>
                                <span className="text-sm font-medium text-white">
                                  Scenario {result.scenarioIndex + 1}
                                </span>
                                <div className="flex items-center gap-2 mt-1">
                                  <span className="text-xs text-gray-400">
                                    {new Date(result.timestamp).toLocaleDateString()}
                                  </span>
                                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                                    result.meteor_score >= 0.7 ? 'bg-green-500/20 text-green-400' :
                                    result.meteor_score >= 0.5 ? 'bg-yellow-500/20 text-yellow-400' :
                                    'bg-red-500/20 text-red-400'
                                  }`}>
                                    {getQualityLabel(result.meteor_score)}
                                  </span>
                                </div>
                              </div>
                            </div>
                            
                            <div className="flex items-center gap-3">
                              {/* METEOR Score */}
                              <div className={`text-xl font-bold ${getScoreColor(result.meteor_score)}`}>
                                {(result.meteor_score * 100).toFixed(1)}%
                              </div>
                              
                              {/* Expand/Collapse Icon */}
                              <svg 
                                className={`w-5 h-5 text-gray-400 transition-transform duration-200 ${
                                  isExpanded ? 'rotate-180' : ''
                                }`} 
                                fill="none" 
                                stroke="currentColor" 
                                viewBox="0 0 24 24"
                              >
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                              </svg>
                            </div>
                          </div>
                        </div>
                        
                        {/* Accordion Content - Expandable */}
                        {isExpanded && (
                          <div className="border-t border-white/10 bg-black/20">
                            {/* Metrics Grid */}
                            <div className="p-4">
                              <h4 className="text-xs font-semibold text-gray-300 mb-3 uppercase tracking-wide">
                                Detailed Metrics
                              </h4>
                              <div className="grid grid-cols-3 gap-3 mb-4">
                                <div className="text-center p-3 bg-white/5 rounded-lg border border-white/10">
                                  <div className="text-lg font-bold text-blue-400">
                                    {(result.precision * 100).toFixed(1)}%
                                  </div>
                                  <div className="text-xs text-gray-400 mt-1">Precision</div>
                                  <div className="text-xs text-gray-500 mt-1">Accuracy</div>
                                </div>
                                <div className="text-center p-3 bg-white/5 rounded-lg border border-white/10">
                                  <div className="text-lg font-bold text-green-400">
                                    {(result.recall * 100).toFixed(1)}%
                                  </div>
                                  <div className="text-xs text-gray-400 mt-1">Recall</div>
                                  <div className="text-xs text-gray-500 mt-1">Completeness</div>
                                </div>
                                <div className="text-center p-3 bg-white/5 rounded-lg border border-white/10">
                                  <div className="text-lg font-bold text-purple-400">
                                    {(result.f_score * 100).toFixed(1)}%
                                  </div>
                                  <div className="text-xs text-gray-400 mt-1">F-Score</div>
                                  <div className="text-xs text-gray-500 mt-1">Harmonic Mean</div>
                                </div>
                              </div>
                              

                              
                              {/* Action Buttons */}
                              <div className="flex gap-2">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleViewDetails(result);
                                  }}
                                  className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/30 hover:border-blue-500/50 rounded-lg text-xs font-medium text-blue-300 hover:text-blue-200 transition-all"
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                  </svg>
                                  View Full Analysis
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    // Add retest functionality here if needed
                                  }}
                                  className="px-3 py-2 bg-purple-600/20 hover:bg-purple-600/30 border border-purple-500/30 hover:border-purple-500/50 rounded-lg text-xs font-medium text-purple-300 hover:text-purple-200 transition-all"
                                  title="Run New Test"
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                  </svg>
                                </button>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
              </div>
              
              {/* Separator between User Stories */}
              {groupIndex < Object.keys(groupedByUserStory).length - 1 && (
                <div className="relative py-4">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-gray-700/50"></div>
                  </div>
                  <div className="relative flex justify-center">
                    <span className="px-3 bg-[#1a1a1a] text-xs text-gray-500">•••</span>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default TestedScenariosOverview;