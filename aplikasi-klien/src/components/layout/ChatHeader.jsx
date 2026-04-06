import React from 'react';
import { getEpicButtonText } from '../utils/helpers/activeProjectHelpers';
import { useResponsive } from '../../hooks/useResponsive';

const EpicButton = ({ epicContext, hasEpic, onClick, connections }) => {
  const { isMobile } = useResponsive();
  
  return (
    <button 
      onClick={onClick}
      className={`
        flex items-center gap-2 px-3 py-1.5 rounded-lg text-[11px] font-bold tracking-wide transition-all duration-300 border
        ${epicContext 
          ? 'bg-[#0052CC]/10 text-[#0052CC] border-[#0052CC]/30 hover:bg-[#0052CC]/20 shadow-[0_0_10px_rgba(0,82,204,0.2)]' 
          : 'bg-white/5 text-gray-400 border-white/5 hover:bg-white/10 hover:text-white'
        }
      `}
      title={isMobile ? getEpicButtonText(hasEpic, epicContext, connections) : undefined}
    >
      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
      </svg>
      {!isMobile && getEpicButtonText(hasEpic, epicContext, connections)}
    </button>
  );
};

const ChatOptionsMenu = ({ isOpen, onRename, onDelete }) => (
  <div className="absolute right-0 top-10 w-40 bg-tertiary/95 border border-primary rounded-xl shadow-2xl z-50 overflow-hidden py-1.5 ring-1 ring-black/50 backdrop-blur-xl animate-in fade-in zoom-in-95 duration-100 origin-top-right">
    <button 
      onClick={onRename} 
      className="w-full text-left px-4 py-2.5 text-xs text-secondary hover:bg-glass hover:text-primary flex items-center gap-2.5 transition-colors"
    >
      <svg className="w-3.5 h-3.5 opacity-70" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
      </svg>
      Rename
    </button>
    <div className="h-px bg-secondary my-1 mx-2"></div>
    <button 
      onClick={onDelete} 
      className="w-full text-left px-4 py-2.5 text-xs text-error hover:bg-red-900/10 hover:text-error-light flex items-center gap-2.5 transition-colors"
    >
      <svg className="w-3.5 h-3.5 opacity-70" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
      </svg>
      Delete
    </button>
  </div>
);

const ChatHeader = ({
  isPinned,
  activeChatId,
  history,
  epicContext,
  hasEpic,
  connections,
  isHeaderMenuOpen,
  onToggleSidebar,
  onEpicChange,
  onToggleHeaderMenu,
  onRename,
  onDelete,
  onTemplateClick,
  onJiraClick
}) => {
  const { isMobile } = useResponsive();
  const currentChatTitle = activeChatId 
    ? (history.find(h => h.id === activeChatId)?.title || 'New Session')
    : 'Ready to weave scenarios';

  return (
    <div className="sticky top-0 z-30 px-4 sm:px-6 py-3 flex items-center justify-between bg-primary/80 backdrop-blur-2xl border-b border-secondary">
      <div className="flex items-center gap-2 sm:gap-6">
        {!isPinned && (
          <button 
            onClick={onToggleSidebar} 
            className="text-muted hover:text-primary transition-colors p-2 rounded-xl hover:bg-glass" 
            title="Open Sidebar"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 6h16M4 12h16M4 18h7" />
            </svg>
          </button>
        )}
        
        {/* GROQ Header Section - Hidden on mobile */}
        {!isMobile && (
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl gradient-secondary flex items-center justify-center shadow-2xl shadow-purple-500/25">
                <svg className="w-5 h-5 text-primary" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2L14.5 9.5L22 12L14.5 14.5L12 22L9.5 14.5L2 12L9.5 9.5L12 2Z" />
                </svg>
              </div>

              <div>
                <div className="flex items-center gap-3">
                  <h1 className="text-lg font-bold gradient-text-secondary tracking-wide">
                    Groq Llama 3.1
                  </h1>

                  <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-success/10 border border-success/20">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-success"></span>
                    </span>
                    <span className="text-xs font-bold text-success tracking-wider uppercase">Connected</span>
                  </div>
                </div>

                <p className="text-sm text-muted mt-1 font-medium">
                  {currentChatTitle}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
      
      <div className="flex items-center gap-2">
        {/* Template Button - Icon only on mobile */}
        {onTemplateClick && (
          <button
            onClick={onTemplateClick}
            className="p-2 rounded-lg text-gray-400 hover:text-white transition-colors hover:bg-white/5"
            title="Templates"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </button>
        )}

        {/* JIRA Connection Button - Icon only on mobile */}
        {onJiraClick && (
          <button
            onClick={onJiraClick}
            className="p-2 rounded-lg text-gray-400 hover:text-white transition-colors hover:bg-white/5"
            title="JIRA Connection"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
            </svg>
          </button>
        )}

        {/* Epic Selection Button */}
        {activeChatId && (
          <EpicButton
            epicContext={epicContext}
            hasEpic={hasEpic}
            connections={connections}
            onClick={onEpicChange}
          />
        )}

        {/* Chat Options Menu */}
        {activeChatId && (
          <div className="relative">
            <button 
              onClick={onToggleHeaderMenu}
              className={`p-2 rounded-lg transition-colors ${
                isHeaderMenuOpen ? 'bg-glass text-primary' : 'text-muted hover:text-primary hover:bg-glass'
              }`}
              title="Chat Options"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
              </svg>
            </button>

            {isHeaderMenuOpen && (
              <ChatOptionsMenu
                isOpen={isHeaderMenuOpen}
                onRename={() => onRename(null, activeChatId)}
                onDelete={() => onDelete(null)}
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ChatHeader;