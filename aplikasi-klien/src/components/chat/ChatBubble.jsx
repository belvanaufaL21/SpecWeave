import QualityBadge from '../common/QualityBadge';
import JiraExportCTA from '../common/JiraExportCTA';
import MeteorAnalysisReport from '../common/MeteorAnalysisReport';
import { useTestResults } from '../../contexts/TestResultsContext';

const ChatBubble = ({ message, activeChatId }) => {
  const isUser = message.role === 'user';
  const isError = message.role === 'error';
  const { isScenarioTested, getTestResult, getAllTestResults } = useTestResults();

  // Fungsi render konten AI
  const renderAIContent = (content) => {
    try {
      // Coba parse JSON
      const data = JSON.parse(content);

      if (data.feature && data.scenarios) {
        return (
          <div className="space-y-4 w-full">
            {/* Feature Header - Clean */}
            <div className="pb-3 border-b border-white/10">
              <h3 className="text-lg font-semibold text-white mb-1">{data.feature}</h3>
              {data.description && (
                <p className="text-gray-400 text-sm">{data.description}</p>
              )}
            </div>

            {/* User Story - Modern Card */}
            <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-6 h-6 rounded-full bg-blue-500/20 flex items-center justify-center">
                  <svg className="w-3 h-3 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
                <span className="text-sm font-medium text-blue-400">User Story</span>
              </div>
              <p className="text-sm text-gray-200 leading-relaxed">"{data.userStory}"</p>
            </div>

            {/* Scenarios - Clean Layout */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-6 h-6 rounded-full bg-green-500/20 flex items-center justify-center">
                  <svg className="w-3 h-3 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <span className="text-sm font-medium text-green-400">Acceptance Criteria</span>
              </div>
              
              {data.scenarios.map((scenario, index) => {
                // Use message.id as unique identifier for each User Story
                const messageId = message.id || 'temp';
                const isTested = isScenarioTested(messageId, index);
                const testResult = getTestResult(messageId, index);
                
                // Get test count for this scenario
                const allResults = getAllTestResults();
                const scenarioTestCount = Object.values(allResults).filter(result => 
                  result.messageId === messageId && result.scenarioIndex === index
                ).length;
                
                return (
                  <div key={index} className="bg-white/5 border border-white/10 rounded-lg overflow-hidden">
                    {/* Scenario Header with Test/Review Button */}
                    <div className="bg-white/5 px-4 py-3 border-b border-white/10">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-6 h-6 rounded-full bg-purple-500/20 text-purple-400 text-xs font-semibold flex items-center justify-center">
                            {index + 1}
                          </div>
                          <h5 className="text-sm font-medium text-white">
                            {scenario.title || `Scenario ${index + 1}`}
                          </h5>
                          {isTested && (
                            <div className="flex items-center gap-1 px-2 py-1 bg-green-500/20 border border-green-500/30 rounded-full">
                              <svg className="w-3 h-3 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                              </svg>
                              <span className="text-xs text-green-400 font-medium">
                                Tested {scenarioTestCount > 1 ? `(${scenarioTestCount}x)` : ''}
                              </span>
                            </div>
                          )}
                        </div>
                        
                        {/* Test/Review Button */}
                        <button
                          onClick={() => {
                            if (isTested) {
                              // Show review modal or expand results
                              if (window.openMeteorReviewModal) {
                                window.openMeteorReviewModal(scenario, index, testResult);
                              }
                            } else {
                              // Open test modal
                              if (window.openMeteorTestModal) {
                                window.openMeteorTestModal(scenario, index, messageId);
                              }
                            }
                          }}
                          className={`flex items-center gap-1.5 px-3 py-1.5 border rounded-lg text-xs font-medium transition-all duration-200 ${
                            isTested
                              ? 'bg-blue-600/20 hover:bg-blue-600/30 border-blue-500/30 hover:border-blue-500/50 text-blue-300 hover:text-blue-200'
                              : 'bg-purple-600/20 hover:bg-purple-600/30 border-purple-500/30 hover:border-purple-500/50 text-purple-300 hover:text-purple-200'
                          }`}
                          title={isTested ? "Review METEOR Results" : "Test with METEOR"}
                        >
                          {isTested ? (
                            <>
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                              </svg>
                              Review
                            </>
                          ) : (
                            <>
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 002 2h2a2 2 0 002-2z" />
                              </svg>
                              Test
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                    
                    {/* Scenario Steps - Table Format */}
                    <div className="p-4">
                      <div className="bg-gray-900/30 border border-gray-700/30 rounded-lg overflow-hidden">
                        <table className="w-full">
                          <tbody>
                            <tr className="border-b border-gray-700/30">
                              <td className="px-4 py-3 bg-green-500/10 border-r border-gray-700/30 w-20">
                                <span className="text-green-400 font-mono text-xs font-semibold">GIVEN</span>
                              </td>
                              <td className="px-4 py-3 text-gray-200 text-sm leading-relaxed">
                                {scenario.given}
                              </td>
                            </tr>
                            <tr className="border-b border-gray-700/30">
                              <td className="px-4 py-3 bg-blue-500/10 border-r border-gray-700/30 w-20">
                                <span className="text-blue-400 font-mono text-xs font-semibold">WHEN</span>
                              </td>
                              <td className="px-4 py-3 text-gray-200 text-sm leading-relaxed">
                                {scenario.when}
                              </td>
                            </tr>
                            <tr>
                              <td className="px-4 py-3 bg-purple-500/10 border-r border-gray-700/30 w-20">
                                <span className="text-purple-400 font-mono text-xs font-semibold">THEN</span>
                              </td>
                              <td className="px-4 py-3 text-gray-200 text-sm leading-relaxed">
                                {scenario.then}
                              </td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                      
                      {/* Show test results if tested */}
                      {isTested && testResult && (
                        <div className="mt-3 p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <svg className="w-4 h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                              <span className="text-sm font-medium text-green-400">
                                Latest METEOR Test Results
                                {scenarioTestCount > 1 && (
                                  <span className="text-xs text-gray-400 ml-1">({scenarioTestCount} tests total)</span>
                                )}
                              </span>
                            </div>
                            <span className="text-xs text-gray-400">
                              {new Date(testResult.timestamp).toLocaleString()}
                            </span>
                          </div>
                          <div className="grid grid-cols-4 gap-3">
                            <div className="text-center">
                              <div className={`text-lg font-bold ${
                                testResult.meteor_score >= 0.7 ? 'text-green-400' :
                                testResult.meteor_score >= 0.5 ? 'text-yellow-400' : 'text-red-400'
                              }`}>
                                {(testResult.meteor_score * 100).toFixed(1)}%
                              </div>
                              <div className="text-xs text-gray-400">METEOR</div>
                            </div>
                            <div className="text-center">
                              <div className="text-lg font-bold text-blue-400">
                                {(testResult.precision * 100).toFixed(1)}%
                              </div>
                              <div className="text-xs text-gray-400">Precision</div>
                            </div>
                            <div className="text-center">
                              <div className="text-lg font-bold text-purple-400">
                                {(testResult.recall * 100).toFixed(1)}%
                              </div>
                              <div className="text-xs text-gray-400">Recall</div>
                            </div>
                            <div className="text-center">
                              <div className="text-lg font-bold text-yellow-400">
                                {(testResult.f_score * 100).toFixed(1)}%
                              </div>
                              <div className="text-xs text-gray-400">F-Score</div>
                            </div>
                          </div>
                          {scenarioTestCount > 1 && (
                            <div className="mt-2 text-xs text-gray-500 text-center">
                              Click "Review" to see all {scenarioTestCount} test results and run new tests
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* JIRA Export CTA */}
            <JiraExportCTA scenarioData={data} message={message} />

            {/* Quality Metrics */}
            {message.qualityMetrics && (
              <div className="pt-3 border-t border-white/10">
                <QualityBadge 
                  qualityMetrics={message.qualityMetrics}
                  performanceMetrics={message.performanceMetrics}
                />

                {message.qualityMetrics?.groundTruthReference && (
                  <div className="mt-3">
                    <MeteorAnalysisReport
                      groundTruthText={message.qualityMetrics.groundTruthReference.gherkin_scenario}
                      generatedText={data.scenarios.map(s => 
                        `Given ${s.given}\nWhen ${s.when}\nThen ${s.then}`
                      ).join('\n\n')}
                      meteorMetrics={message.qualityMetrics}
                      onAnalysisRequest={async () => {
                        return `Analisis sedang dalam pengembangan. Skor METEOR ${(message.qualityMetrics.meteorScore * 100).toFixed(1)}% menunjukkan ${
                          message.qualityMetrics.meteorScore >= 0.8 ? 'kualitas sangat baik' :
                          message.qualityMetrics.meteorScore >= 0.6 ? 'kualitas cukup baik namun masih ada ruang perbaikan' :
                          'kualitas yang perlu ditingkatkan secara signifikan'
                        }.`;
                      }}
                    />
                  </div>
                )}
              </div>
            )}
          </div>
        );
      }
    } catch (e) {
      // Jika gagal parse JSON, tampilkan text biasa
      return <p className="text-sm whitespace-pre-wrap leading-relaxed text-gray-200">{content}</p>;
    }
    return <p className="text-sm whitespace-pre-wrap leading-relaxed text-gray-200">{content}</p>;
  };

  return (
    <>
      <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-6`}>
        <div className={`${isUser ? 'max-w-[70%]' : 'max-w-full'} w-full`}>
          <div className={`flex items-start gap-4 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
            {/* Avatar - Clean & Modern */}
            <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
              isUser 
                ? 'bg-white/10' 
                : isError 
                  ? 'bg-red-500/20 border border-red-500/30' 
                  : 'bg-white/10'
            }`}>
              {isUser ? (
                <span className="text-white text-sm font-medium">U</span>
              ) : isError ? (
                <svg className="w-5 h-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              ) : (
                <span className="text-white text-sm font-medium">AI</span>
              )}
            </div>

            {/* Message Content - Clean Design */}
            <div className={`rounded-2xl overflow-hidden ${
              isUser 
                ? 'bg-white/10 text-white px-4 py-3' 
                : isError 
                  ? 'bg-red-500/10 border border-red-500/20 text-red-200 px-4 py-3' 
                  : 'bg-white/5 border border-white/10 text-gray-100 p-6'
            } ${isUser ? 'max-w-md' : 'flex-1'}`}>
              {isUser ? (
                <p className="text-sm leading-relaxed">{message.content}</p>
              ) : (
                renderAIContent(message.content)
              )}
            </div>
          </div>
          
          {/* Timestamp - Subtle */}
          <p className={`text-xs text-gray-500 mt-2 ${isUser ? 'text-right pr-14' : 'pl-14'}`}>
            {new Date(message.timestamp || message.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
          </p>
        </div>
      </div>
    </>
  );
};

export default ChatBubble;