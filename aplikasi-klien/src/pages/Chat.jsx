import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

// Components
import ChatBubble from '../components/chat/ChatBubble';
import ChatInput from '../components/chat/ChatInput';
import EpicContextDisplay from '../components/chat/EpicContextDisplay';
import EpicSelectionModal from '../components/modals/EpicSelectionModal';
import UserGuideModal from '../components/modals/UserGuideModal';
import JiraSetupModal from '../components/modals/JiraSetupModal';
import TemplateModal from '../components/modals/TemplateModal';

// Layout Components
import ChatSidebar from '../components/layout/ChatSidebar';
import ChatHeader from '../components/layout/ChatHeader';

// UI Components
import EmptyState from '../components/ui/EmptyState';

// Hooks
import useChat from '../hooks/useChat';
import useChatManagement from '../hooks/business/useChatManagement';
import useSidebarState from '../hooks/ui/useSidebarState';

// Contexts
import { useAuth } from '../contexts/AuthContext';
import { useJira } from '../contexts/JiraContext';

// Services
import { jiraService } from '../services/jiraService';

const Chat = () => {
  // Hooks
  const { messages: hookMessages, isLoading, sendMessage, clearMessages, loadMessages } = useChat();
  const { user, profile, signOut } = useAuth();
  const { 
    epicContext, 
    hasEpic, 
    isEpicModalOpen, 
    isJiraSetupModalOpen,
    setEpicContext: setEpicContextGlobal,
    openEpicModal,
    closeEpicModal,
    openJiraSetupModal,
    closeJiraSetupModal,
    connections
  } = useJira();
  
  const navigate = useNavigate();
  const location = useLocation();
  const messagesEndRef = useRef(null);

  // Custom hooks
  const {
    chats,
    history,
    activeChatId,
    hasLoaded,
    createNewChat,
    selectChat,
    deleteChat,
    updateChatMessages
  } = useChatManagement();

  const {
    isPinned,
    openMenuId,
    sidebarMenuPos,
    isSidebarVisible,
    toggleSidebarPin,
    handleTriggerEnter,
    handleSidebarLeave,
    toggleSidebarMenu,
    closeAllMenus
  } = useSidebarState();

  // Local state
  const [requiresEpicSelection, setRequiresEpicSelection] = useState(false);
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);
  const [isUserGuideModalOpen, setIsUserGuideModalOpen] = useState(false);
  const [isHeaderMenuOpen, setIsHeaderMenuOpen] = useState(false);

  // Memoize selected project key to avoid repeated computation
  const selectedProjectKey = useMemo(() => {
    // Get active project for current chat
    try {
      const chatId = activeChatId || 'default-chat';
      const activeProjects = JSON.parse(localStorage.getItem('activeProjectsPerChat') || '{}');
      const activeProjectId = activeProjects[chatId];
      
      if (activeProjectId && connections) {
        const activeProject = connections.find(conn => conn?.id === activeProjectId);
        if (activeProject) {
          console.log(`🎯 [EPIC-MODAL-CHAT] Active project found:`, {
            connectionId: activeProjectId,
            projectKey: activeProject?.project_key,
            projectName: activeProject?.custom_fields?.project_info?.name
          });
          return activeProject?.project_key || null;
        }
      }
      
      // Auto-set first connection as active if no active project is set
      if (!activeProjectId && connections && connections.length > 0) {
        const firstConnection = connections[0];
        console.log(`🔧 [EPIC-MODAL-CHAT] Auto-setting first connection as active:`, {
          connectionId: firstConnection.id,
          projectKey: firstConnection.project_key,
          projectName: firstConnection.custom_fields?.project_info?.name
        });
        
        // Set as active project
        jiraService.setActiveProjectForChat(chatId, firstConnection.id);
        
        return firstConnection.project_key;
      }
      
      // Only log once when no active project is found and no connections available
      if (connections && connections.length === 0) {
        console.log(`⚠️ [EPIC-MODAL-CHAT] No JIRA connections available for chat: ${chatId}`);
      }
      
      return null;
    } catch (error) {
      console.error('Error getting active project key:', error);
      return null;
    }
  }, [activeChatId, connections]); // Dependencies: only recalculate when these change

  // Auto-scroll effect
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chats, activeChatId, hookMessages]);

  // Handle click outside untuk close menu
  useEffect(() => {
    const handleClickOutside = () => {
      closeAllMenus();
      setIsHeaderMenuOpen(false);
    };
    
    const handleScroll = () => {
      if (openMenuId) closeAllMenus();
    };

    window.addEventListener('click', handleClickOutside);
    window.addEventListener('scroll', handleScroll, true);

    return () => {
      window.removeEventListener('click', handleClickOutside);
      window.removeEventListener('scroll', handleScroll, true);
    };
  }, [openMenuId, closeAllMenus]);

  // Sync messages dari hook ke chat management
  useEffect(() => {
    if (activeChatId && hookMessages.length > 0) {
      const currentChatMessages = chats[activeChatId] || [];
      const newMessages = hookMessages.filter(hookMsg => 
        !currentChatMessages.some(localMsg => localMsg.id === hookMsg.id)
      );
      
      if (newMessages.length > 0) {
        updateChatMessages(activeChatId, [...currentChatMessages, ...newMessages]);
      }
    }
  }, [hookMessages, activeChatId, chats, updateChatMessages]);

  // Load messages ke hook saat active chat berubah
  useEffect(() => {
    if (activeChatId && chats[activeChatId]) {
      loadMessages(chats[activeChatId]);
    } else if (!activeChatId) {
      clearMessages();
    }
  }, [activeChatId, chats, loadMessages, clearMessages]);

  // Handle initial template message dari Dashboard
  useEffect(() => {
    if (location.state?.initialMessage) {
      handleNewChat();
      setTimeout(() => {
        handleSendMessage(location.state.initialMessage);
      }, 100);
      navigate(location.pathname, { replace: true });
    }
  }, [location.state?.initialMessage]);

  // Event Handlers
  const handleSendMessage = (text) => {
    if (!activeChatId && !hasEpic) {
      setRequiresEpicSelection(true);
      openEpicModal();
      return;
    }

    let currentId = activeChatId;
    
    if (!currentId) {
      currentId = createNewChat();
    }

    const userMessage = { 
      id: Date.now().toString(), 
      role: 'user', 
      content: text, 
      createdAt: new Date() 
    };
    
    const currentMessages = chats[currentId] || [];
    updateChatMessages(currentId, [...currentMessages, userMessage]);
    
    sendMessage(text, { epicContext });
  };

  const handleNewChat = () => {
    createNewChat();
    clearMessages();
  };

  const handleSelectChat = (id) => {
    selectChat(id);
    const existingMessages = chats[id] || [];
    loadMessages(existingMessages);
  };

  const handleDelete = (e, id) => {
    if (e) e.stopPropagation();
    const targetId = id || activeChatId;
    
    if (!targetId) return;

    deleteChat(targetId);
    closeAllMenus();
    setIsHeaderMenuOpen(false);

    if (activeChatId === targetId) {
      clearMessages();
    }
  };

  const handleRename = (e, id) => {
    if (e) e.stopPropagation();
    // TODO: Implement rename functionality
    closeAllMenus();
    setIsHeaderMenuOpen(false);
  };

  const handleEpicSelected = async (epicData) => {
    await setEpicContextGlobal(epicData);
    setRequiresEpicSelection(false);
  };

  const handleEpicChange = () => {
    openEpicModal();
  };

  const handleJiraSetup = () => {
    openJiraSetupModal();
  };

  const handleJiraSetupComplete = () => {
    closeJiraSetupModal();
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  const handleOpenUserGuide = () => {
    setIsUserGuideModalOpen(true);
  };

  const handleCloseUserGuide = () => {
    setIsUserGuideModalOpen(false);
  };

  const handleBackToDashboard = () => {
    navigate('/dashboard');
  };

  const handleTemplates = () => {
    setIsTemplateModalOpen(true);
  };

  const handleSelectTemplate = (template) => {
    handleSendMessage(template);
  };

  const toggleHeaderMenu = (e) => {
    e.stopPropagation();
    setIsHeaderMenuOpen(!isHeaderMenuOpen);
  };

  const currentMessages = activeChatId ? (chats[activeChatId] || []) : hookMessages;

  return (
    <div className="flex h-screen bg-primary text-primary overflow-hidden font-sans selection:bg-pink-500/30 relative">
      
      {/* Global Background */}
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] w-[50vw] h-[50vh] bg-[radial-gradient(circle_at_center,var(--purple-primary)_0%,rgba(0,0,0,0)_70%)] opacity-8 blur-[100px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50vw] h-[50vh] bg-[radial-gradient(circle_at_center,var(--pink-primary)_0%,rgba(0,0,0,0)_70%)] opacity-8 blur-[100px]" />
      </div>

      {/* Trigger Zone */}
      {!isPinned && (
        <div 
          onMouseEnter={handleTriggerEnter}
          className="fixed top-0 left-0 w-5 h-full z-50 bg-transparent" 
        />
      )}

      {/* Sidebar */}
      <ChatSidebar
        isVisible={isSidebarVisible}
        isPinned={isPinned}
        history={history}
        activeChatId={activeChatId}
        openMenuId={openMenuId}
        onTogglePin={toggleSidebarPin}
        onNewChat={handleNewChat}
        onSelectChat={handleSelectChat}
        onMenuToggle={toggleSidebarMenu}
        onBackToDashboard={handleBackToDashboard}
        onTemplates={handleTemplates}
        onJiraSetup={handleJiraSetup}
        onSignOut={handleSignOut}
        onOpenUserGuide={handleOpenUserGuide}
        onMouseLeave={handleSidebarLeave}
      />

      {/* Sidebar Menu Popup */}
      {openMenuId && (
        <div 
          onMouseLeave={closeAllMenus} 
          className="fixed z-[60] w-36 bg-tertiary border border-primary rounded-xl shadow-2xl overflow-hidden py-1.5 animate-in fade-in zoom-in-95 duration-100 ring-1 ring-black/50"
          style={{ top: sidebarMenuPos.y, left: sidebarMenuPos.x }}
        >
          <button 
            onClick={(e) => handleRename(e, openMenuId)} 
            className="w-full text-left px-3.5 py-2 text-[11px] text-secondary hover:bg-glass hover:text-primary transition-colors flex items-center gap-2"
          >
            <svg className="w-3 h-3 opacity-70" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
            Rename
          </button>
          <div className="h-px bg-secondary my-1 mx-2"></div>
          <button 
            onClick={(e) => handleDelete(e, openMenuId)} 
            className="w-full text-left px-3.5 py-2 text-[11px] text-error hover:bg-red-900/10 hover:text-error-light transition-colors flex items-center gap-2"
          >
            <svg className="w-3 h-3 opacity-70" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
            Delete
          </button>
        </div>
      )}

      {/* Main Content */}
      <main 
        className={`
          flex-1 flex flex-col h-full relative z-10 w-full min-w-0 
          transition-all duration-300 ease-in-out
          ${isPinned ? 'pl-[280px]' : 'pl-0'} 
        `}
      >
        
        {/* Header */}
        <ChatHeader
          isPinned={isPinned}
          activeChatId={activeChatId}
          history={history}
          epicContext={epicContext}
          hasEpic={hasEpic}
          isHeaderMenuOpen={isHeaderMenuOpen}
          onToggleSidebar={toggleSidebarPin}
          onEpicChange={handleEpicChange}
          onToggleHeaderMenu={toggleHeaderMenu}
          onRename={handleRename}
          onDelete={handleDelete}
        />

        {/* Epic Context Display */}
        {activeChatId && (
          <div className="px-3 sm:px-4 py-2">
            <div className="max-w-3xl mx-auto">
              <EpicContextDisplay onChangeEpic={handleEpicChange} />
            </div>
          </div>
        )}

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden px-3 sm:px-4 py-3 relative z-10 scrollbar-thin scrollbar-thumb-white/5 scrollbar-track-transparent chat-container">
          <div className="max-w-4xl mx-auto min-h-full flex flex-col w-full">
            {!activeChatId || currentMessages.length === 0 ? (
              <div className="flex-1 flex flex-col justify-center pb-10">
                <EmptyState onExampleClick={handleSendMessage} />
              </div>
            ) : (
              <>
                <div className="space-y-8 pb-4">
                  {currentMessages.map((message, idx) => (
                    <ChatBubble key={idx} message={message} />
                  ))}
                </div>
                {isLoading && (
                  <div className="flex justify-start mb-4 animate-fade-in">
                    <div className="flex items-start gap-4">
                      <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center shadow-lg shadow-purple-500/20 mt-1">
                        <div className="w-1.5 h-1.5 bg-white rounded-full animate-pulse"/>
                      </div>
                      <span className="text-xs text-gray-500 mt-2 ml-1">Thinking...</span>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </>
            )}
          </div>
        </div>

        {/* Input Area */}
        <div className="relative z-20 pb-4 px-3 sm:px-4 pt-3 bg-gradient-to-t from-primary via-primary/95 to-transparent overflow-x-hidden">
          <div className="max-w-4xl mx-auto w-full">
            <ChatInput onSend={handleSendMessage} isLoading={isLoading} />
          </div>
        </div>
      </main>

      {/* Modals */}
      <EpicSelectionModal 
        isOpen={isEpicModalOpen} 
        onClose={() => {
          closeEpicModal();
          setRequiresEpicSelection(false);
        }} 
        onEpicSelected={handleEpicSelected}
        selectedProjectKey={selectedProjectKey}
      />

      <JiraSetupModal 
        isOpen={isJiraSetupModalOpen} 
        onClose={closeJiraSetupModal}
        onSkip={closeJiraSetupModal}
        onComplete={handleJiraSetupComplete}
      />

      <TemplateModal 
        isOpen={isTemplateModalOpen} 
        onClose={() => setIsTemplateModalOpen(false)}
        onSelectTemplate={handleSelectTemplate}
      />

      <UserGuideModal 
        isOpen={isUserGuideModalOpen} 
        onClose={handleCloseUserGuide}
      />
    </div>
  );
};

export default Chat;