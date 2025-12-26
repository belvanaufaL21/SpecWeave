import { useState } from 'react';
import { getEpicContextDisplayText, getProjectDisplayText } from '../utils/helpers/activeProjectHelpers';

const ChatDetailPanel = ({ activeChatId, chatData, epicContext, connections, onClose }) => {
  const [expandedSections, setExpandedSections] = useState({
    general: true,
    epic: true,
    scenarios: false,
    export: false
  });

  const toggleSection = (section) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  if (!activeChatId) {
    return (
      <div className="h-full flex items-center justify-center p-6">
        <div className="text-center text-gray-500">
          <svg className="w-16 h-16 mx-auto mb-4 opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
          </svg>
          <p className="text-sm">Select a chat to view details</p>
        </div>
      </div>
    );
  }

  const messageCount = chatData?.messages?.length || 0;
  const scenarioCount = chatData?.messages?.filter(m => m.role === 'assistant')?.length || 0;

  return (
    <div className="h-full flex flex-col bg-[#0a0a0f]/50 backdrop-blur-sm">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-white/5">
        <h3 className="text-sm font-bold text-white">Chat Details</h3>
        <button 
          onClick={onClose}
          className="p-1.5 rounded-lg hover:bg-white/5 text-gray-400 hover:text-white transition-colors lg:hidden"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        
        {/* General Info Section */}
        <div className="bg-white/5 rounded-xl border border-white/5 overflow-hidden">
          <button
            onClick={() => toggleSection('general')}
            className="w-full flex items-center justify-between p-3 hover:bg-white/5 transition-colors"
          >
            <span className="text-xs font-bold text-white uppercase tracking-wider">General Info</span>
            <svg 
              className={`w-4 h-4 text-gray-400 transition-transform ${expandedSections.general ? 'rotate-180' : ''}`}
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          
          {expandedSections.general && (
            <div className="p-3 pt-0 space-y-3 text-xs">
              <div>
                <div className="text-gray-500 mb-1">Chat ID</div>
                <div className="text-white font-mono text-[10px] bg-white/5 px-2 py-1 rounded">
                  {activeChatId}
                </div>
              </div>
              
              <div>
                <div className="text-gray-500 mb-1">Messages</div>
                <div className="text-white font-semibold">{messageCount} messages</div>
              </div>
              
              <div>
                <div className="text-gray-500 mb-1">Scenarios Generated</div>
                <div className="text-white font-semibold">{scenarioCount} scenarios</div>
              </div>
              
              <div>
                <div className="text-gray-500 mb-1">Date Created</div>
                <div className="text-white">{new Date().toLocaleDateString()}</div>
              </div>
            </div>
          )}
        </div>

        {/* Epic Context Section */}
        {epicContext && (
          <div className="bg-white/5 rounded-xl border border-white/5 overflow-hidden">
            <button
              onClick={() => toggleSection('epic')}
              className="w-full flex items-center justify-between p-3 hover:bg-white/5 transition-colors"
            >
              <span className="text-xs font-bold text-white uppercase tracking-wider">Epic Context</span>
              <svg 
                className={`w-4 h-4 text-gray-400 transition-transform ${expandedSections.epic ? 'rotate-180' : ''}`}
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            
            {expandedSections.epic && (
              <div className="p-3 pt-0 space-y-3 text-xs">
                {(() => {
                  const { text, isConsistent, warning } = getEpicContextDisplayText(true, epicContext, connections);
                  
                  if (epicContext.epicData?.workWithoutEpic) {
                    return (
                      <>
                        <div>
                          <div className="text-gray-500 mb-1">Mode</div>
                          <div className="text-white">Project Mode</div>
                        </div>
                        <div>
                          <div className="text-gray-500 mb-1">Project</div>
                          <div className={`text-white font-semibold ${!isConsistent ? 'text-yellow-400' : ''}`} title={warning || undefined}>
                            {getProjectDisplayText(connections, '').trim()}
                          </div>
                          {warning && (
                            <div className="text-yellow-400 text-[10px] mt-1">⚠️ {warning}</div>
                          )}
                        </div>
                      </>
                    );
                  } else {
                    return (
                      <>
                        <div>
                          <div className="text-gray-500 mb-1">Epic Key</div>
                          <div className="text-white font-mono text-[10px] bg-white/5 px-2 py-1 rounded">
                            {epicContext.epicData?.epic?.key}
                          </div>
                        </div>
                        <div>
                          <div className="text-gray-500 mb-1">Epic Name</div>
                          <div className="text-white">{epicContext.epicData?.epic?.fields?.summary}</div>
                        </div>
                        {!isConsistent && warning && (
                          <div className="text-yellow-400 text-[10px]">⚠️ {warning}</div>
                        )}
                      </>
                    );
                  }
                })()}
                
                <div>
                  <div className="text-gray-500 mb-1">JIRA URL</div>
                  <a 
                    href={epicContext.epicData?.connection?.jira_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-400 hover:text-blue-300 text-[10px] break-all"
                  >
                    {epicContext.epicData?.connection?.jira_url}
                  </a>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Quick Actions Section */}
        <div className="bg-white/5 rounded-xl border border-white/5 overflow-hidden">
          <div className="p-3">
            <span className="text-xs font-bold text-white uppercase tracking-wider">Quick Actions</span>
          </div>
          
          <div className="p-3 pt-0 space-y-2">
            <button className="w-full flex items-center gap-2 px-3 py-2 bg-white/5 hover:bg-white/10 rounded-lg text-xs text-white transition-colors">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              Copy All Scenarios
            </button>
            
            <button className="w-full flex items-center gap-2 px-3 py-2 bg-white/5 hover:bg-white/10 rounded-lg text-xs text-white transition-colors">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Export to File
            </button>
            
            {epicContext && (
              <button className="w-full flex items-center gap-2 px-3 py-2 bg-[#0052CC]/20 hover:bg-[#0052CC]/30 border border-[#0052CC]/30 rounded-lg text-xs text-[#0052CC] transition-colors">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                </svg>
                Export to JIRA
              </button>
            )}
          </div>
        </div>

        {/* Statistics Section */}
        <div className="bg-white/5 rounded-xl border border-white/5 p-3 space-y-2">
          <span className="text-xs font-bold text-white uppercase tracking-wider">Statistics</span>
          
          <div className="grid grid-cols-2 gap-2 mt-2">
            <div className="bg-white/5 rounded-lg p-2">
              <div className="text-[10px] text-gray-500 mb-1">Avg Response</div>
              <div className="text-sm font-bold text-white">2.3s</div>
            </div>
            <div className="bg-white/5 rounded-lg p-2">
              <div className="text-[10px] text-gray-500 mb-1">Quality</div>
              <div className="text-sm font-bold text-green-400">Excellent</div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

export default ChatDetailPanel;