import React from 'react';
import Logo from '../common/Logo';
import JiraStatusIndicator from '../common/JiraStatusIndicator';
import SidebarProfileDropdown from '../common/SidebarProfileDropdown';

const NavigationButton = ({ onClick, icon, label, className = "" }) => (
  <button
    onClick={onClick}
    className={`w-full flex items-center gap-3 px-4 py-3 text-muted hover:text-primary hover:bg-glass rounded-xl transition-all duration-200 group ${className}`}
  >
    <svg className="w-4 h-4 opacity-70 group-hover:opacity-100" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      {icon}
    </svg>
    <span className="text-sm font-medium">{label}</span>
  </button>
);

const ChatHistoryItem = ({ 
  chat, 
  isActive, 
  onSelect, 
  onMenuToggle, 
  showMenu 
}) => (
  <div 
    key={chat.id} 
    onClick={() => onSelect(chat.id)} 
    className={`group relative flex items-center gap-3 px-4 py-3 rounded-xl cursor-pointer transition-all duration-200 ${
      isActive 
        ? 'bg-glass text-primary shadow-inner' 
        : 'text-muted hover:bg-glass hover:text-secondary'
    }`}
  >
    <svg 
      className={`w-3.5 h-3.5 shrink-0 ${
        isActive ? 'text-accent' : 'opacity-40 group-hover:opacity-70'
      }`} 
      fill="none" 
      stroke="currentColor" 
      viewBox="0 0 24 24"
    >
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
    </svg>
    <div className="flex-1 min-w-0 pr-6">
      <p className="text-[13px] truncate font-medium leading-snug">{chat.title}</p>
    </div>
    <div className={`absolute right-2 top-1/2 -translate-y-1/2 ${showMenu ? 'block' : 'hidden group-hover:block'}`}>
      <button 
        onClick={onMenuToggle} 
        className="p-1.5 rounded-lg hover:bg-glass text-muted hover:text-primary transition-colors"
      >
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 12h.01M12 12h.01M19 12h.01M6 12a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0z" />
        </svg>
      </button>
    </div>
  </div>
);

const ChatSidebar = ({
  isVisible,
  isPinned,
  history,
  activeChatId,
  openMenuId,
  onTogglePin,
  onNewChat,
  onSelectChat,
  onMenuToggle,
  onBackToDashboard,
  onTemplates,
  onJiraSetup,
  onSignOut,
  onOpenUserGuide,
  onMouseLeave
}) => {
  return (
    <aside 
      onMouseLeave={onMouseLeave}
      className={`
        fixed top-0 left-0 h-full z-40 flex flex-col
        bg-secondary/95 backdrop-blur-3xl border-r border-secondary shadow-[10px_0_40px_var(--shadow-primary)]
        transition-transform duration-300 cubic-bezier(0.2, 0, 0, 1)
        ${isVisible ? 'translate-x-0' : '-translate-x-full'}
      `}
      style={{ width: '280px' }}
    >
      <div className="p-5 flex flex-col h-full w-full">
        {/* Header */}
        <div className="flex items-center justify-between mb-8 pl-1">
          <Logo 
            size="md" 
            showText={true} 
            onClick={onBackToDashboard}
          />
          <button 
            onClick={onTogglePin}
            className={`p-2 rounded-lg transition-all duration-300 group/pin border ${
              isPinned 
                ? 'bg-white/10 text-white border-white/10 shadow-sm' 
                : 'bg-transparent text-gray-500 border-transparent hover:bg-white/5 hover:text-gray-300'
            }`}
            title={isPinned ? "Unpin Sidebar" : "Pin Sidebar"}
          >
            {isPinned ? (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
              </svg>
            ) : (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            )}
          </button>
        </div>

        {/* Navigation Section */}
        <div className="space-y-1 mb-6">
          <NavigationButton
            onClick={onBackToDashboard}
            icon={<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z" />}
            label="Dashboard"
          />
          
          <NavigationButton
            onClick={onTemplates}
            icon={<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />}
            label="Templates"
          />

          {/* JIRA Connection Status */}
          <div className="w-full flex items-center gap-3 px-4 py-3">
            <svg className="w-4 h-4 text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
            </svg>
            <div className="flex-1">
              <JiraStatusIndicator 
                onSetupJira={onJiraSetup}
                compact={true}
              />
            </div>
          </div>
        </div>

        {/* New Chat Button */}
        <button 
          onClick={onNewChat} 
          className="w-full flex items-center justify-center gap-3 px-5 py-4 gradient-primary/10 hover:gradient-primary/20 text-primary rounded-2xl transition-all duration-300 border border-accent/20 hover:border-accent/40 group active:scale-[0.98] shadow-lg hover:shadow-purple-500/10"
        >
          <svg className="w-5 h-5 text-accent group-hover:text-purple-300 transition-colors group-hover:rotate-90 duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          <span className="text-sm font-bold tracking-wide">New Chat</span>
        </button>

        {/* Chat History */}
        <div className="flex-1 overflow-y-auto -mx-2 px-2 mt-8 space-y-1 scrollbar-none">
          {history.length > 0 && (
            <h3 className="px-4 text-[10px] font-bold text-subtle uppercase tracking-widest mb-3">
              Recent
            </h3>
          )}
          {history.map((chat) => (
            <ChatHistoryItem
              key={chat.id}
              chat={chat}
              isActive={activeChatId === chat.id}
              onSelect={onSelectChat}
              onMenuToggle={(e) => onMenuToggle(e, chat.id)}
              showMenu={openMenuId === chat.id}
            />
          ))}
        </div>

        {/* Profile Section */}
        <div className="pt-4 mt-2 border-t border-secondary space-y-2">
          <SidebarProfileDropdown 
            onSignOut={onSignOut}
            onOpenUserGuide={onOpenUserGuide}
          />
        </div>
      </div>
    </aside>
  );
};

export default ChatSidebar;