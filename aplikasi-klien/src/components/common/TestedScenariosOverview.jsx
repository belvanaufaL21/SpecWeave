import { useEffect, useState } from 'react';
import TestButton from './TestButton';

const TestedScenariosOverview = ({ activeChatId, chatMessages }) => {
  const [currentUserStoryPage, setCurrentUserStoryPage] = useState(1);
  
  // Listen for activeChatId changes to reset pagination
  useEffect(() => {
    setCurrentUserStoryPage(1);
  }, [activeChatId]);
  
  // Get scenarios from chat messages for display
  const getScenariosFromMessages = () => {
    if (!chatMessages || !Array.isArray(chatMessages)) return [];
    
    const scenariosData = [];
    
    chatMessages.forEach(msg => {
      if ((msg.role === 'assistant' || msg.role === 'ai') && msg.content) {
        try {
          const data = JSON.parse(msg.content);
          if (data.scenarios && Array.isArray(data.scenarios) && data.scenarios.length > 0) {
            scenariosData.push({
              messageId: msg.id,
              feature: data.feature || 'Unknown Feature',
              userStory: data.userStory || 'Unknown User Story',
              description: data.description || '',
              scenarios: data.scenarios
            });
          }
        } catch (error) {
          // Not a JSON message, skip
        }
      }
    });
    
    return scenariosData;
  };

  const scenariosData = getScenariosFromMessages();
  const hasScenarios = scenariosData.length > 0;

  // Show empty state if no active chat or no scenarios generated
  if (!activeChatId || !hasScenarios) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center px-4">
        <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center mb-4">
          <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        </div>
        <p className="text-sm font-medium text-gray-300 mb-2">Belum ada scenario</p>
        <p className="text-xs text-gray-500 leading-relaxed">
          Generate scenario dari user story untuk melihat preview di sini
        </p>
      </div>
    );
  }

  // Pagination for User Stories
  const totalUserStoryPages = scenariosData.length;
  const currentUserStoryData = scenariosData[currentUserStoryPage - 1];

  const handlePrevUserStory = () => {
    if (currentUserStoryPage > 1) {
      setCurrentUserStoryPage(currentUserStoryPage - 1);
    }
  };

  const handleNextUserStory = () => {
    if (currentUserStoryPage < totalUserStoryPages) {
      setCurrentUserStoryPage(currentUserStoryPage + 1);
    }
  };

  const handleUserStoryPageClick = (page) => {
    setCurrentUserStoryPage(page);
  };

  if (!currentUserStoryData) {
    return null;
  }

  return (
    <div className="space-y-4">
      {/* Feature & User Story Header */}
      <div className="border rounded-xl p-4" style={{ backgroundColor: '#09090A', borderColor: 'rgba(255, 255, 255, 0.05)' }}>
        <h4 className="text-sm font-semibold text-white mb-2">{currentUserStoryData.feature}</h4>
        <p className="text-xs text-gray-400 leading-relaxed">{currentUserStoryData.userStory}</p>
      </div>

      {/* Scenarios List */}
      <div className="space-y-3">
        {currentUserStoryData.scenarios.map((scenario, index) => {
          // Build gherkin text from scenario parts
          const buildGherkinText = (scenario) => {
            if (scenario.gherkin) return scenario.gherkin;
            
            // Build from given, when, then
            const parts = [];
            if (scenario.given) {
              const givenText = Array.isArray(scenario.given) ? scenario.given.join('\nAnd ') : scenario.given;
              parts.push(`Given ${givenText}`);
            }
            if (scenario.when) {
              const whenText = Array.isArray(scenario.when) ? scenario.when.join('\nAnd ') : scenario.when;
              parts.push(`When ${whenText}`);
            }
            if (scenario.then) {
              const thenText = Array.isArray(scenario.then) ? scenario.then.join('\nAnd ') : scenario.then;
              parts.push(`Then ${thenText}`);
            }
            return parts.join('\n');
          };
          
          const gherkinText = buildGherkinText(scenario);
          
          return (
            <div
              key={index}
              className="border rounded-xl p-3 transition-all"
              style={{ 
                borderColor: 'rgba(255, 255, 255, 0.05)',
                backgroundColor: '#09090A'
              }}
            >
              <div className="flex items-center gap-3">
                {/* Number Badge */}
                <div className="w-8 h-8 rounded-full text-sm font-bold flex items-center justify-center border flex-shrink-0" style={{ backgroundColor: '#09090A', borderColor: 'rgba(255, 255, 255, 0.1)', color: '#C27AFF' }}>
                  {index + 1}
                </div>

                {/* Scenario Info */}
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-semibold mb-1" style={{ color: '#FFFFFF', opacity: 0.7 }}>
                    {scenario.type || 'Happy Path'}
                  </div>
                  <div className="text-sm text-gray-300 truncate">
                    {scenario.title}
                  </div>
                </div>

                {/* Action Button - Use TestButton component for proper state management */}
                <TestButton
                  scenarioId={`${currentUserStoryData.messageId}-${index}`}
                  scenarioText={gherkinText}
                  scenarioTitle={scenario.title} // Add scenario title
                  scenarioIndex={index}
                  messageId={currentUserStoryData.messageId}
                  activeChatId={activeChatId}
                  onTestClick={(scenarioText, scenarioIndex, chatId, msgId, scenarioTitle) => {
                    if (window.openMeteorTestModal) {
                      console.log('🧪 [TESTING-SCENARIO] Opening test modal:', {
                        scenarioIndex,
                        scenarioTitle,
                        gherkinText: scenarioText,
                        chatId,
                        messageId: msgId
                      });
                      window.openMeteorTestModal(scenarioText, scenarioIndex, chatId, msgId, scenarioTitle);
                    }
                  }}
                  size="sm"
                  className="flex-shrink-0"
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* User Story Pagination */}
      {totalUserStoryPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-4">
          {/* Previous Button */}
          <button 
            onClick={handlePrevUserStory}
            disabled={currentUserStoryPage === 1}
            className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all border ${
              currentUserStoryPage === 1 
                ? 'text-gray-600 cursor-not-allowed' 
                : 'text-gray-400'
            }`}
            style={{ borderColor: 'rgba(255, 255, 255, 0.05)' }}
            onMouseEnter={(e) => {
              if (currentUserStoryPage !== 1) {
                e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
              }
            }}
            onMouseLeave={(e) => {
              if (currentUserStoryPage !== 1) {
                e.currentTarget.style.backgroundColor = 'transparent';
              }
            }}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>

          {/* Page Numbers */}
          <div className="flex items-center gap-2">
            {[...Array(Math.min(totalUserStoryPages, 3))].map((_, i) => {
              const pageNum = i + 1;
              const isActive = currentUserStoryPage === pageNum;
              
              return (
                <button
                  key={pageNum}
                  onClick={() => handleUserStoryPageClick(pageNum)}
                  className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all border ${
                    isActive
                      ? ''
                      : 'text-gray-400'
                  }`}
                  style={isActive 
                    ? { backgroundColor: '#09090A', borderColor: 'rgba(255, 255, 255, 0.1)', color: '#C27AFF' }
                    : { borderColor: 'rgba(255, 255, 255, 0.05)' }
                  }
                  onMouseEnter={(e) => {
                    if (!isActive) {
                      e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isActive) {
                      e.currentTarget.style.backgroundColor = 'transparent';
                    }
                  }}
                >
                  <span className="text-sm font-semibold">{pageNum}</span>
                </button>
              );
            })}
          </div>

          {/* Next Button */}
          <button 
            onClick={handleNextUserStory}
            disabled={currentUserStoryPage === totalUserStoryPages}
            className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all border ${
              currentUserStoryPage === totalUserStoryPages 
                ? 'text-gray-600 cursor-not-allowed' 
                : 'text-gray-400'
            }`}
            style={{ borderColor: 'rgba(255, 255, 255, 0.05)' }}
            onMouseEnter={(e) => {
              if (currentUserStoryPage !== totalUserStoryPages) {
                e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
              }
            }}
            onMouseLeave={(e) => {
              if (currentUserStoryPage !== totalUserStoryPages) {
                e.currentTarget.style.backgroundColor = 'transparent';
              }
            }}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      )}
    </div>
  );
};

export default TestedScenariosOverview;
