import { useState } from 'react';
import QualityBadge from '../common/QualityBadge';
import JiraExportCTA from '../common/JiraExportCTA';
import GeneralResponseFormatter from './GeneralResponseFormatter';
import PatternUsedModal from '../modals/PatternUsedModal';
import { useTestResults } from '../../contexts/TestResultsContext';
import { useAuth } from '../../contexts/AuthContext';
import { useResponsive } from '../../hooks/useResponsive';
import { formatTime } from '../../utils/localization';
import cleanLogger from '../../config/cleanLogging.js';

const ChatBubble = ({ message, activeChatId }) => {
  const isUser = message.role === 'user';
  const isError = message.role === 'error';
  const { isScenarioTested, getTestResult, getAllTestResults } = useTestResults();
  const { user, profile } = useAuth();
  const { isMobile } = useResponsive();
  
  // Get user initials from profile or user data (consistent with ProfileModal)
  const getUserInitial = () => {
    try {
      if (profile?.name && typeof profile.name === 'string' && profile.name.trim()) {
        return profile.name.trim().split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
      }
      if (user?.email && typeof user.email === 'string' && user.email.trim()) {
        return user.email.trim().slice(0, 2).toUpperCase();
      }
      return 'U';
    } catch (error) {
      return 'U';
    }
  };
  
  // State untuk menyimpan semua scenario (asli + tambahan) - hanya untuk UI sementara
  const [isPatternModalOpen, setIsPatternModalOpen] = useState(false);
  const [patternInfo, setPatternInfo] = useState({
    references: [],
    metadata: {},
    method: 'few-shot'
  });
  
  // State untuk collapse scenarios - track which scenarios are expanded
  const [expandedScenarios, setExpandedScenarios] = useState({});
  
  // State untuk track hover pada scenarios
  const [hoveredScenario, setHoveredScenario] = useState(null);
  
  // Use message content directly for display
  const displayContent = message.content;


  // Fungsi untuk membuat data gabungan (scenario asli + tambahan) untuk JIRA export
  const createCombinedScenarioData = (originalData) => {
    if (!originalData || !originalData.scenarios) return originalData;
    
    // Generate development tasks based on scenarios
    const generateDevelopmentTasks = (scenarios, feature, userStory) => {
      const tasks = [];
      
      // Clean feature name (remove "Feature" word)
      const cleanFeature = feature.replace(/feature|fitur/gi, '').trim();
      
      // Extract main subject/entity from user story
      const extractMainSubject = (story) => {
        const match = story.match(/ingin\s+(.+?)\s+agar|want\s+to\s+(.+?)\s+so/i);
        if (match) {
          return (match[1] || match[2]).trim();
        }
        return cleanFeature.toLowerCase();
      };
      
      const mainSubject = extractMainSubject(userStory);
      
      // Extract key actions from scenarios
      const extractKeyActions = (scenarios) => {
        const actions = [];
        scenarios.forEach(s => {
          const whenText = Array.isArray(s.when) ? s.when.join(' ') : s.when || '';
          const thenText = Array.isArray(s.then) ? s.then.join(' ') : s.then || '';
          const words = (whenText + ' ' + thenText).toLowerCase().split(/\s+/);
          words.forEach(word => {
            if (word.length > 5 && !['system', 'pengguna', 'aplikasi'].includes(word)) {
              actions.push(word);
            }
          });
        });
        return [...new Set(actions)].slice(0, 3);
      };
      
      const keyActions = extractKeyActions(scenarios);
      
      // Backend tasks
      tasks.push({
        role: 'BE',
        description: `Create function untuk ${mainSubject}`,
        priority: 'High',
        status: 'To Do'
      });
      
      if (keyActions.length > 0) {
        tasks.push({
          role: 'BE',
          description: `Implement logic ${keyActions[0]} untuk ${cleanFeature}`,
          priority: 'High',
          status: 'To Do'
        });
      }
      
      tasks.push({
        role: 'BE',
        description: `Add validation dan error handling untuk ${mainSubject}`,
        priority: 'Medium',
        status: 'To Do'
      });
      
      // Frontend tasks
      tasks.push({
        role: 'FE',
        description: `Development UI untuk ${cleanFeature}`,
        priority: 'High',
        status: 'To Do'
      });
      
      tasks.push({
        role: 'FE',
        description: `Integrasi ${cleanFeature} dengan backend`,
        priority: 'Medium',
        status: 'To Do'
      });
      
      // UI/UX task
      tasks.push({
        role: 'UI/UX',
        description: `Desain UI dan UX untuk ${mainSubject}`,
        priority: 'Medium',
        status: 'To Do'
      });
      
      // QA tasks
      tasks.push({
        role: 'QA',
        description: `Testing ${mainSubject} di environment development`,
        priority: 'Low',
        status: 'To Do'
      });
      
      tasks.push({
        role: 'QA',
        description: `Testing integrasi ${cleanFeature} di staging`,
        priority: 'Low',
        status: 'To Do'
      });
      
      return tasks;
    };
    
    // Add development tasks to the data
    const developmentTasks = generateDevelopmentTasks(
      originalData.scenarios, 
      originalData.feature, 
      originalData.userStory
    );
    
    return {
      ...originalData,
      developmentTasks
    };
  };

  // Fungsi render konten AI
  const renderAIContent = (content) => {
    // Handle different response types
    if (message.responseType === 'general') {
      // General LLM response (non-Connextra) - Ultra compact
      return (
        <div className="space-y-3 w-full">
          {/* Header at top */}
          <div>
            <h4 className="text-sm font-semibold text-white mb-1.5">Ingin Membuat Skenario Pengujian?</h4>
            <p className="text-sm leading-relaxed" style={{ color: 'rgba(255, 255, 255, 0.7)' }}>
              Gunakan format <strong>User Story Connextra</strong> untuk mendapatkan skenario pengujian yang terstruktur.
            </p>
          </div>

          {/* Response AI - In the middle */}
          <div className="border rounded-lg p-2.5" style={{ backgroundColor: 'transparent', borderColor: 'rgba(255, 255, 255, 0.05)' }}>
            <p className="text-sm leading-relaxed" style={{ color: 'rgba(255, 255, 255, 0.7)' }}>
              {content}
            </p>
          </div>

          {/* Format and Example - At bottom */}
          <div>
            <div className="border rounded-lg p-2 mb-2" style={{ backgroundColor: '#120C18', borderColor: '#2C1A43' }}>
              <div className="text-sm mb-1 uppercase tracking-wide" style={{ color: '#FFFFFF' }}>Format</div>
              <div className="font-mono text-sm">
                <span style={{ color: 'rgba(255, 255, 255, 0.7)' }}>Sebagai </span><span style={{ color: '#C27AFF', backgroundColor: '#120C18' }} className="px-1 rounded">[peran]</span><span style={{ color: 'rgba(255, 255, 255, 0.7)' }}>, saya ingin </span><span style={{ color: '#C27AFF', backgroundColor: '#120C18' }} className="px-1 rounded">[fitur]</span><span style={{ color: 'rgba(255, 255, 255, 0.7)' }}>, agar </span><span style={{ color: '#C27AFF', backgroundColor: '#120C18' }} className="px-1 rounded">[manfaat]</span>
              </div>
            </div>

            <div className="text-sm font-medium mb-1" style={{ color: '#C27AFF' }}>Contoh:</div>
            <div className="text-sm font-mono leading-relaxed" style={{ color: 'rgba(255, 255, 255, 0.8)' }}>
              "Sebagai customer, saya ingin login menggunakan email agar dapat mengakses dashboard pribadi saya"
            </div>
          </div>
        </div>
      );
    }

    // Gherkin response (Connextra format) - existing logic
    try {
      // Coba parse JSON
      const data = JSON.parse(content);

      if (data.feature && data.scenarios) {
        return (
          <div className="space-y-6 w-full">
            {/* Feature Header with Pattern Info Icon */}
            <div className="mb-6">
              <div className="flex items-center gap-3 mb-3">
                <h3 className="text-lg font-semibold text-white flex-1">
                  {data.feature}
                </h3>
                
                {/* References Info Icon */}
                <button
                  onClick={() => {
                    // Extract references data from message object (not from parsed content)
                    const refs = message.usedReferences || [];
                    const metadata = message.metadata || {};
                    
                    setPatternInfo({
                      references: refs,
                      metadata: metadata,
                      method: metadata.promptingMethod || 'few-shot'
                    });
                    setIsPatternModalOpen(true);
                  }}
                  className="w-8 h-8 rounded-lg border flex items-center justify-center transition-all group"
                  style={{ borderColor: 'rgba(255, 255, 255, 0.05)' }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = '#120C18';
                    e.currentTarget.style.borderColor = '#2C1A43';
                    const svg = e.currentTarget.querySelector('svg');
                    if (svg) svg.style.color = '#C27AFF';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'transparent';
                    e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.05)';
                    const svg = e.currentTarget.querySelector('svg');
                    if (svg) svg.style.color = '#9CA3AF';
                  }}
                  title="View References Used"
                >
                  <svg className="w-4 h-4 text-gray-400 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                  </svg>
                </button>
              </div>
              {data.description && (
                <p className="text-gray-400 text-sm leading-relaxed">{data.description}</p>
              )}
            </div>

            {/* User Story Card - Read Only */}
            <div className="border rounded-2xl p-4" style={{ backgroundColor: '#120C18', borderColor: '#2C1A43' }}>
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-purple-500/30 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <svg className="w-3 h-3 text-purple-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
                <div className="flex-1">
                  <div className="text-xs font-medium mb-2" style={{ color: '#C27AFF' }}>User Story</div>
                  <p className="text-sm text-gray-200 leading-relaxed italic">
                    "{data.userStory}"
                  </p>
                </div>
              </div>
            </div>

            {/* Gherkin Scenario Section - Figma Design */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-4">
                <span className="text-sm font-semibold text-white">Gherkin Scenario</span>
              </div>
              
              {data.scenarios.map((scenario, index) => {
                // Use message.id as unique identifier for each User Story
                const messageId = message.id || 'temp';
                const isTested = isScenarioTested(messageId, index);
                const testResult = getTestResult(messageId, index);
                
                // Debug logging for test results (throttled)
                cleanLogger.debugThrottled('CHAT_BUBBLE', 'Scenario test check', {
                  messageId,
                  scenarioIndex: index,
                  isTested,
                  hasTestResult: !!testResult,
                  testResult: testResult ? { timestamp: testResult.timestamp, meteor_score: testResult.meteor_score } : null,
                  scenarioTitle: scenario.title || `Scenario ${index + 1}`
                }, `scenario-check-${messageId}-${index}`, 10000); // 10 second throttle
                
                // Additional debug: Check if the scenario ID exists in test results
                const scenarioId = `${messageId}-${index}`;
                const allTestResults = getAllTestResults();
                const hasResultInContext = !!allTestResults[scenarioId];
                
                if (hasResultInContext !== isTested) {
                  console.warn('🚨 [CHAT-BUBBLE] Mismatch between context and hook:', {
                    scenarioId,
                    hasResultInContext,
                    isTested,
                    contextResult: allTestResults[scenarioId]
                  });
                }
                
                // Get test count for this scenario
                const scenarioTestCount = Object.values(allTestResults).filter(result => 
                  result.messageId === messageId && result.scenarioIndex === index
                ).length;
                
                // Check if this scenario is expanded
                const isExpanded = expandedScenarios[index] || false;
                
                return (
                  <div 
                    key={index} 
                    className="bg-gradient-to-br from-[#020203]/80 to-black/90 border rounded-2xl overflow-hidden transition-all" 
                    style={{ borderColor: hoveredScenario === index ? '#2C1A43' : 'rgba(255, 255, 255, 0.05)' }}
                    onMouseEnter={() => setHoveredScenario(index)}
                    onMouseLeave={() => setHoveredScenario(null)}
                  >
                    
                    {/* Scenario Header - Collapsible - Figma Design */}
                    <button
                      onClick={() => setExpandedScenarios(prev => ({ ...prev, [index]: !prev[index] }))}
                      className="w-full px-5 py-4 flex items-center gap-3 transition-colors"
                    >
                      {/* Number Badge */}
                      <div className="w-8 h-8 rounded-full text-sm font-bold flex items-center justify-center border flex-shrink-0" style={{ backgroundColor: '#120C18', borderColor: '#2C1A43', color: '#C27AFF' }}>
                        {index + 1}
                      </div>
                      
                      {/* Scenario Title */}
                      <div className="flex-1 text-left">
                        <h5 className="text-sm font-semibold text-white">
                          {scenario.title || `Scenario ${index + 1}`}
                        </h5>
                      </div>
                      
                      {/* Expand/Collapse Icon */}
                      <svg 
                        className={`w-5 h-5 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} 
                        fill="none" 
                        stroke="currentColor" 
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                    
                    {/* Divider */}
                    {isExpanded && <div className="h-px transition-colors" style={{ backgroundColor: hoveredScenario === index ? '#2C1A43' : 'rgba(255, 255, 255, 0.05)' }} />}
                    
                    {/* Scenario Steps - Collapsible Content - Figma Design */}
                    {isExpanded && (
                      <div className="p-5">
                        {/* Gherkin Scenario Table */}
                        <div className="rounded-xl overflow-hidden">
                          {/* Given */}
                          <div className="flex">
                            <div className="flex-shrink-0 w-20 bg-green-500/10 px-3 py-3 flex items-center justify-center">
                              <span className="text-green-400 font-semibold text-xs">Given</span>
                            </div>
                            <div className="flex-1 px-4 py-3">
                              <p className="text-gray-300 text-sm leading-relaxed">
                                {scenario.given}
                              </p>
                            </div>
                          </div>
                          
                          {/* When */}
                          <div className="flex">
                            <div className="flex-shrink-0 w-20 bg-blue-500/10 px-3 py-3 flex items-center justify-center">
                              <span className="text-blue-400 font-semibold text-xs">When</span>
                            </div>
                            <div className="flex-1 px-4 py-3">
                              <p className="text-gray-300 text-sm leading-relaxed">
                                {scenario.when}
                              </p>
                            </div>
                          </div>
                          
                          {/* Then */}
                          <div className="flex">
                            <div className="flex-shrink-0 w-20 bg-purple-500/10 px-3 py-3 flex items-center justify-center">
                              <span className="text-purple-400 font-semibold text-xs">Then</span>
                            </div>
                            <div className="flex-1 px-4 py-3">
                              <p className="text-gray-300 text-sm leading-relaxed">
                                {scenario.then}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Development Tasklist - Figma Design */}
            {data.scenarios && data.scenarios.length > 0 && (
              <div className="mt-6">
                <div className="mb-4">
                  <h4 className="text-sm font-semibold text-white">Development Tasklist</h4>
                </div>
                
                <div className="grid grid-cols-2 gap-3">
                  {(() => {
                    // Generate highly specific development tasks based on feature context
                    const generateSpecificTasks = (scenarios, feature, userStory) => {
                      const tasks = [];
                      
                      // Clean feature name (remove "Feature" word)
                      const cleanFeature = feature.replace(/feature|fitur/gi, '').trim();
                      
                      // Extract main subject/entity from user story
                      // Example: "Sebagai admin, saya ingin reset password" -> "reset password"
                      const extractMainSubject = (story) => {
                        const match = story.match(/ingin\s+(.+?)\s+agar|want\s+to\s+(.+?)\s+so/i);
                        if (match) {
                          return (match[1] || match[2]).trim();
                        }
                        // Fallback: use feature name
                        return cleanFeature.toLowerCase();
                      };
                      
                      const mainSubject = extractMainSubject(userStory);
                      
                      // Extract key actions from scenarios for more specific tasks
                      const extractKeyActions = (scenarios) => {
                        const actions = [];
                        scenarios.forEach(s => {
                          const whenText = Array.isArray(s.when) ? s.when.join(' ') : s.when || '';
                          const thenText = Array.isArray(s.then) ? s.then.join(' ') : s.then || '';
                          
                          // Extract verbs and objects
                          const words = (whenText + ' ' + thenText).toLowerCase().split(/\s+/);
                          words.forEach(word => {
                            if (word.length > 5 && !['system', 'pengguna', 'aplikasi'].includes(word)) {
                              actions.push(word);
                            }
                          });
                        });
                        return [...new Set(actions)].slice(0, 3); // Get unique top 3
                      };
                      
                      const keyActions = extractKeyActions(scenarios);
                      
                      // Backend tasks - SPECIFIC to the feature
                      tasks.push({
                        role: 'BE',
                        description: `Create function untuk ${mainSubject}`,
                        priority: 'High',
                        status: 'To Do'
                      });
                      
                      if (keyActions.length > 0) {
                        tasks.push({
                          role: 'BE',
                          description: `Implement logic ${keyActions[0]} untuk ${cleanFeature}`,
                          priority: 'High',
                          status: 'To Do'
                        });
                      }
                      
                      tasks.push({
                        role: 'BE',
                        description: `Add validation dan error handling untuk ${mainSubject}`,
                        priority: 'Medium',
                        status: 'To Do'
                      });
                      
                      // Frontend tasks - SPECIFIC to the feature
                      tasks.push({
                        role: 'FE',
                        description: `Development UI untuk ${cleanFeature}`,
                        priority: 'High',
                        status: 'To Do'
                      });
                      
                      tasks.push({
                        role: 'FE',
                        description: `Integrasi ${cleanFeature} dengan backend`,
                        priority: 'Medium',
                        status: 'To Do'
                      });
                      
                      // UI/UX task - SPECIFIC to the feature
                      tasks.push({
                        role: 'UI/UX',
                        description: `Desain UI dan UX untuk ${mainSubject}`,
                        priority: 'Medium',
                        status: 'To Do'
                      });
                      
                      // QA tasks - SPECIFIC to the feature
                      tasks.push({
                        role: 'QA',
                        description: `Testing ${mainSubject} di environment development`,
                        priority: 'Low',
                        status: 'To Do'
                      });
                      
                      tasks.push({
                        role: 'QA',
                        description: `Testing integrasi ${cleanFeature} di staging`,
                        priority: 'Low',
                        status: 'To Do'
                      });
                      
                      return tasks;
                    };
                    
                    const tasks = generateSpecificTasks(data.scenarios, data.feature, data.userStory);
                    
                    return tasks.map((task, taskIndex) => (
                      <div
                        key={taskIndex}
                        className="bg-gradient-to-br from-[#020203]/80 to-black/90 border rounded-xl p-4 transition-all"
                        style={{ borderColor: 'rgba(255, 255, 255, 0.05)' }}
                        onMouseEnter={(e) => e.currentTarget.style.borderColor = '#2C1A43'}
                        onMouseLeave={(e) => e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.05)'}
                      >
                        {/* Task Header */}
                        <div className="flex items-center gap-2 flex-wrap mb-3">
                          {/* Priority Badge */}
                          <div className={`px-2.5 py-1 rounded-lg text-xs font-semibold border bg-gradient-to-r ${
                            task.priority === 'High' 
                              ? 'from-red-500/20 to-red-600/20 border-red-500/30 text-red-400'
                              : task.priority === 'Medium'
                                ? 'from-yellow-500/20 to-yellow-600/20 border-yellow-500/30 text-yellow-400'
                                : 'from-green-500/20 to-green-600/20 border-green-500/30 text-green-400'
                          }`}>
                            {task.priority}
                          </div>

                          {/* Status Badge */}
                          <div className="px-2.5 py-1 rounded-lg text-xs font-semibold border bg-gradient-to-r from-gray-500/20 to-gray-600/20 border-gray-500/30 text-gray-400">
                            {task.status}
                          </div>
                        </div>

                        {/* Task Description with Role */}
                        <p className="text-sm text-gray-300 leading-relaxed">
                          <span className="font-semibold text-purple-400">[{task.role}]</span> {task.description}
                        </p>
                      </div>
                    ));
                  })()}
                </div>
              </div>
            )}

            {/* JIRA Export CTA - Pass combined scenario data */}
            <JiraExportCTA scenarioData={createCombinedScenarioData(data)} message={message} />

            {/* Quality Metrics */}
            {message.qualityMetrics && (
              <div className="pt-3 border-t border-white/10">
                <QualityBadge 
                  qualityMetrics={message.qualityMetrics}
                  performanceMetrics={message.performanceMetrics}
                />
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
      {/* References Used Modal */}
      <PatternUsedModal
        isOpen={isPatternModalOpen}
        onClose={() => setIsPatternModalOpen(false)}
        patternInfo={patternInfo}
      />

      <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-6`}>
        <div className={`${isUser ? (isMobile ? 'max-w-full' : 'max-w-[70%]') : 'max-w-full'} w-full`}>
          <div className={`flex items-start ${isUser ? 'gap-2' : (isMobile ? 'gap-0' : 'gap-3')} ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
            {/* Avatar - Figma Design - Hidden on mobile */}
            {!isMobile && (
              <div className={`relative w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                isUser 
                  ? 'border' 
                  : isError 
                    ? 'bg-gradient-to-br from-red-500 to-red-600' 
                    : 'border'
              }`}
              style={isUser ? { backgroundColor: '#160D14', borderColor: '#44273D' } : (!isError ? { backgroundColor: '#120C18', borderColor: '#2C1A43' } : {})}
              >
                {isUser ? (
                  <span className="text-sm font-semibold" style={{ color: '#FF7AD0' }}>{getUserInitial()}</span>
                ) : isError ? (
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                ) : (
                  <img 
                    src="/logo.png"
                    alt="SpecWeave"
                    className="w-8 h-8 rounded-lg"
                    style={{ filter: 'brightness(0) saturate(100%) invert(100%)' }}
                  />
                )}
              </div>
            )}

            {/* Message Content - Figma Design */}
            <div className="flex-1 flex flex-col gap-2">
              <div className={`rounded-2xl group ${
                isUser 
                  ? 'border' 
                  : isError 
                    ? 'bg-gradient-to-br from-red-600/20 to-red-600/20 border border-red-500/30 px-4 py-3' 
                    : 'bg-[#020203]/60 border p-6'
              }`}
              style={isUser ? { backgroundColor: '#160D14', borderColor: '#44273D' } : (!isError ? { borderColor: 'rgba(255, 255, 255, 0.05)' } : {})}
              >
                {isUser ? (
                  <div className="px-4 py-3">
                    <p className="text-sm leading-relaxed" style={{ color: '#FFFFFF' }}>{displayContent}</p>
                  </div>
                ) : (
                  renderAIContent(message.content)
                )}
              </div>
              
              {/* Timestamp - Figma Design */}
              <div className={`text-xs text-gray-500 ${isUser ? 'text-right' : 'text-left'}`}>
                {formatTime(message.timestamp || message.createdAt)}
              </div>
            </div>
            

          </div>
        </div>
      </div>
    </>
  );
};

export default ChatBubble;