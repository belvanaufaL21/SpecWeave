import { useState } from 'react';
import QualityBadge from '../common/QualityBadge';
import JiraExportCTA from '../common/JiraExportCTA';
import GeneralResponseFormatter from './GeneralResponseFormatter';
import PatternUsedModal from '../modals/PatternUsedModal';
import LimitExceededCard from '../common/LimitExceededCard';
import { useTestResults } from '../../contexts/TestResultsContext';
import { useAuth } from '../../contexts/AuthContext';
import { useResponsive } from '../../hooks/useResponsive';
import { formatTime } from '../../utils/localization';
import cleanLogger from '../../config/cleanLogging.js';

const ChatBubble = ({ message, activeChatId, onUpdateMessage }) => {
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
  
  // State untuk edit user message
  const [isEditingUserMessage, setIsEditingUserMessage] = useState(false);
  const [editedUserMessage, setEditedUserMessage] = useState(message.content);
  
  // State untuk version navigation (for messages with multiple input/output pairs)
  const [currentVersionIndex, setCurrentVersionIndex] = useState(() => {
    // Initialize with the latest version
    return message.versions ? message.versions.length - 1 : 0;
  });
  
  // Get versions array from message (array of {input, output, timestamp})
  // Each version contains both the user input and AI response
  const versions = message.versions || [{ 
    input: message.content, 
    output: null, // Will be filled by next AI message
    timestamp: message.createdAt 
  }];
  
  const hasMultipleVersions = versions.length > 1;
  const currentVersion = versions[currentVersionIndex] || versions[0];
  
  // Use current version's input for display
  const displayContent = isUser ? currentVersion.input : message.content;
  // Handler untuk save edited user message
  const handleSaveUserMessage = () => {
    if (onUpdateMessage && message.id) {
      // Get existing versions or create initial version
      const existingVersions = message.versions || [{ 
        input: message.content,
        outputMessageId: null, // Will be linked after AI responds
        timestamp: message.createdAt 
      }];
      
      // Add new version with edited input
      const newVersion = { 
        input: editedUserMessage, 
        outputMessageId: null, // Will be filled after AI responds
        timestamp: new Date(),
        isGenerating: true // Flag to show this version is generating
      };
      
      existingVersions.push(newVersion);
      
      const updatedMessage = {
        ...message,
        content: editedUserMessage,
        versions: existingVersions,
        currentVersionIndex: existingVersions.length - 1, // Point to new version
        isRegenerating: true // Flag to trigger regeneration in parent
      };
      
      console.log('≡ƒÆ╛ [CHAT-BUBBLE] Updating user message with new version:', {
        messageId: message.id,
        oldContent: message.content,
        newContent: editedUserMessage,
        versionsCount: existingVersions.length,
        newVersionIndex: existingVersions.length - 1
      });
      
      onUpdateMessage(updatedMessage);
      setIsEditingUserMessage(false);
      setCurrentVersionIndex(existingVersions.length - 1); // Set to latest version
    }
  };
  
  // Handler untuk navigate previous version (just display, no regeneration)
  const handlePreviousVersion = () => {
    if (currentVersionIndex > 0) {
      const newIndex = currentVersionIndex - 1;
      setCurrentVersionIndex(newIndex);
      
      // Dispatch event untuk update parent
      window.dispatchEvent(new CustomEvent('switchToVersion', {
        detail: {
          messageId: message.id,
          versionIndex: newIndex,
          scrollAfter: true,
          scrollToAI: null
        }
      }));
    }
  };
  
  // Handler untuk navigate next version (just display, no regeneration)
  const handleNextVersion = () => {
    if (currentVersionIndex < versions.length - 1) {
      const newIndex = currentVersionIndex + 1;
      setCurrentVersionIndex(newIndex);
      
      // Dispatch event untuk update parent
      window.dispatchEvent(new CustomEvent('switchToVersion', {
        detail: {
          messageId: message.id,
          versionIndex: newIndex,
          scrollAfter: true,
          scrollToAI: null
        }
      }));
    }
  };

  const handleCancelEditUserMessage = () => {
    setEditedUserMessage(message.content);
    setIsEditingUserMessage(false);
  };

  // Fungsi untuk membuat data gabungan (scenario asli + tambahan) untuk JIRA export
  const createCombinedScenarioData = (originalData) => {
    if (!originalData || !originalData.scenarios) return originalData;
    
    // Use development tasks from LLM response directly
    // No need to generate them on client side anymore
    return originalData;
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
            <GeneralResponseFormatter content={content} />
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
                  console.warn('≡ƒÜ¿ [CHAT-BUBBLE] Mismatch between context and hook:', {
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

            {/* Development Tasklist - From LLM */}
            {data.developmentTasks && data.developmentTasks.length > 0 && (
              <div className="mt-6">
                <div className="mb-4">
                  <h4 className="text-sm font-semibold text-white">Development Tasklist</h4>
                </div>
                
                <div className="grid grid-cols-2 gap-3">
                  {data.developmentTasks.map((task, taskIndex) => (
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
                  ))}
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
      // Jika gagal parse JSON, tampilkan sebagai general response dengan formatter
      console.log('Failed to parse JSON, rendering as general response:', e);
      return (
        <div className="space-y-3 w-full">
          <GeneralResponseFormatter content={content} />
        </div>
      );
    }
    
    // Fallback untuk content yang tidak ter-handle
    return (
      <div className="space-y-3 w-full">
        <GeneralResponseFormatter content={content} />
      </div>
    );
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
              {isUser ? (
                // User message container
                <div className={`rounded-2xl group border`}
                  style={isEditingUserMessage ? { backgroundColor: '#09090A', borderColor: 'rgba(255, 255, 255, 0.05)' } : { backgroundColor: '#160D14', borderColor: '#44273D' }}
                >
                  {isEditingUserMessage ? (
                    <div className="px-4 py-3">
                      <textarea
                        value={editedUserMessage}
                        onChange={(e) => setEditedUserMessage(e.target.value)}
                        className="w-full bg-transparent border-none rounded-lg px-3 py-2 text-sm text-white focus:outline-none resize-none leading-relaxed"
                        rows={3}
                        autoFocus
                      />
                      <div className="flex justify-end gap-2 mt-3">
                        <button
                          onClick={handleCancelEditUserMessage}
                          className="px-3 py-1.5 bg-[#09090A] border border-white/5 rounded-lg text-xs font-semibold text-white/70 transition-all hover:bg-[#0a0a0b]"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={handleSaveUserMessage}
                          className="px-3 py-1.5 bg-[#160D14] border border-[#44273D] rounded-lg text-xs font-semibold text-[#FF7AD0] transition-all hover:bg-[#1a1018]"
                        >
                          Save
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="px-4 py-3">
                      <p className="text-sm leading-relaxed" style={{ color: '#FFFFFF' }}>{displayContent}</p>
                    </div>
                  )}
                </div>
              ) : isError ? (
                // ✅ Error handling - NO wrapper untuk USAGE_LIMIT_EXCEEDED
                message.errorCode === 'USAGE_LIMIT_EXCEEDED' && message.limitData ? (
                  <LimitExceededCard
                    error={message.limitData}
                    onSwitchModel={(modelName) => {
                      window.dispatchEvent(new CustomEvent('switchModel', {
                        detail: { modelName }
                      }));
                    }}
                    onRetry={() => {
                      window.dispatchEvent(new CustomEvent('retryAfterCooldown', {
                        detail: { messageId: message.id }
                      }));
                    }}
                  />
                ) : (
                  // Generic error dengan wrapper
                  <div className="rounded-2xl bg-gradient-to-br from-red-600/20 to-red-600/20 border border-red-500/30 px-4 py-3">
                    <p className="text-sm leading-relaxed text-red-200">{message.content}</p>
                  </div>
                )
              ) : (
                // AI message container
                <div className="rounded-2xl group bg-[#020203]/60 border p-6"
                  style={{ borderColor: 'rgba(255, 255, 255, 0.05)' }}
                >
                  {renderAIContent(message.content)}
                </div>
              )}
              
              {/* Previous/Next Navigation for User Messages with Multiple Versions */}
              {isUser && hasMultipleVersions && !isEditingUserMessage && (
                <div className="flex items-center gap-2 justify-end">
                  <button
                    onClick={handlePreviousVersion}
                    disabled={currentVersionIndex === 0}
                    className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs transition-all disabled:opacity-30 disabled:cursor-not-allowed border"
                    style={{ 
                      backgroundColor: currentVersionIndex === 0 ? 'transparent' : '#160D14', 
                      borderColor: '#44273D',
                      color: currentVersionIndex === 0 ? 'rgba(255, 122, 208, 0.3)' : '#FF7AD0'
                    }}
                    title="Previous version"
                  >
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                    <span>Previous</span>
                  </button>
                  
                  <span className="text-xs" style={{ color: 'rgba(255, 255, 255, 0.5)' }}>
                    {currentVersionIndex + 1} / {versions.length}
                  </span>
                  
                  <button
                    onClick={handleNextVersion}
                    disabled={currentVersionIndex === versions.length - 1}
                    className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs transition-all disabled:opacity-30 disabled:cursor-not-allowed border"
                    style={{ 
                      backgroundColor: currentVersionIndex === versions.length - 1 ? 'transparent' : '#160D14', 
                      borderColor: '#44273D',
                      color: currentVersionIndex === versions.length - 1 ? 'rgba(255, 122, 208, 0.3)' : '#FF7AD0'
                    }}
                    title="Next version"
                  >
                    <span>Next</span>
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                </div>
              )}
              
              {/* Timestamp - Figma Design */}
              <div className={`text-xs text-gray-500 ${isUser ? 'text-right' : 'text-left'}`}>
                {formatTime(message.timestamp || message.createdAt)}
              </div>
            </div>
            
            {/* Edit Button - Outside container on the left for user messages */}
            {isUser && !isEditingUserMessage && (
              <button
                onClick={() => setIsEditingUserMessage(true)}
                className="w-8 h-8 rounded-lg border flex items-center justify-center transition-all flex-shrink-0"
                style={{ borderColor: 'rgba(255, 255, 255, 0.05)' }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#160D14';
                  e.currentTarget.style.borderColor = '#44273D';
                  const svg = e.currentTarget.querySelector('svg');
                  if (svg) svg.style.color = '#FF7AD0';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                  e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.05)';
                  const svg = e.currentTarget.querySelector('svg');
                  if (svg) svg.style.color = '#9CA3AF';
                }}
                title="Edit message"
              >
                <svg className="w-4 h-4 text-gray-400 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                </svg>
              </button>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default ChatBubble;
