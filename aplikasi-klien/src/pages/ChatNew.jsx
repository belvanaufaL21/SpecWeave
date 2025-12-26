import { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import ChatBubble from '../components/chat/ChatBubble';
import ChatInput from '../components/chat/ChatInput';
import EpicContextDisplay from '../components/chat/EpicContextDisplay';
import EpicSelectionModal from '../components/modals/EpicSelectionModal';
import JiraSetupModal from '../components/modals/JiraSetupModal';
import TemplateModal from '../components/modals/TemplateModal';
import CompactChatHistory from '../components/chat/CompactChatHistory';
import ChatDetailPanel from '../components/chat/ChatDetailPanel';
import Logo from '../components/common/Logo';

import useChat from '../hooks/useChat';
import { useAuth } from '../contexts/AuthContext';
import { useJira } from '../contexts/JiraContext';
import { jiraService } from '../services/jiraService';
import { getEpicButtonText } from '../utils/helpers/activeProjectHelpers';

const ChatNew = () => {
  // --- HOOKS ---
  const { messages: hookMessages, isLoading, sendMessage, clearMessages, loadMessages } = useChat();
  const { user, profile, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const messagesEndRef = useRef(null);

  // --- STATE ---
  const [chats, setChats] = useState({});
  const [history, setHistory] = useState([]);
  const [activeChatId, setActiveChatId] = useState(null);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [showDetailPanel, setShowDetailPanel] = useState(true);
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);
  const [requiresEpicSelection, setRequiresEpicSelection] = useState(false);

  // --- JIRA CONTEXT ---
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
          console.log(`🎯 [EPIC-MODAL-CHATNEW] Active project found:`, {
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
        console.log(`🔧 [EPIC-MODAL-CHATNEW] Auto-setting first connection as active:`, {
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
        console.log(`⚠️ [EPIC-MODAL-CHATNEW] No JIRA connections available for chat: ${chatId}`);
      }
      
      return null;
    } catch (error) {
      console.error('Error getting active project key:', error);
      return null;
    }
  }, [activeChatId, connections]); // Dependencies: only recalculate when these change

  // Load chat data from localStorage
  useEffect(() => {
    if (hasLoaded) return;
    
    try {
      const savedChats = localStorage.getItem('specweave_chats');
      const savedHistory = localStorage.getItem('specweave_chat_history');
      const savedActiveChatId = localStorage.getItem('specweave_active_chat_id');

      const chatsData = savedChats ? JSON.parse(savedChats) : {};
      const historyData = savedHistory ? JSON.parse(savedHistory) : [];

      setChats(chatsData);
      setHistory(historyData);
      
      if (savedActiveChatId && chatsData[savedActiveChatId]) {
        setActiveChatId(savedActiveChatId);
      } else {
        setActiveChatId(null);
      }
      
      setHasLoaded(true);
    } catch (error) {
      console.error('Error loading chat data:', error);
      setChats({});
      setHistory([]);
      setHasLoaded(true);
    }
  }, [hasLoaded]);

  // Handle URL parameter for loading specific chat
  useEffect(() => {
    if (!hasLoaded) return;
    
    const urlParams = new URLSearchParams(location.search);
    const chatIdFromUrl = urlParams.get('id');
    
    if (chatIdFromUrl) {
      const chatExists = chats[chatIdFromUrl] && history.some(h => h.id.toString() === chatIdFromUrl);
      
      if (chatExists) {
        setActiveChatId(chatIdFromUrl);
      } else {
        setActiveChatId(null);
      }
      
      navigate('/chat', { replace: true });
    } else if (location.pathname === '/chat' && !activeChatId) {
      setActiveChatId(null);
    }
  }, [location.search, location.pathname, navigate, hasLoaded, chats, history, activeChatId]);

  // Load messages into hook when activeChatId changes
  useEffect(() => {
    if (activeChatId && chats[activeChatId]) {
      loadMessages(chats[activeChatId]);
    } else if (!activeChatId) {
      clearMessages();
    }
  }, [activeChatId, chats, loadMessages, clearMessages]);

  // Save chat data to localStorage
  useEffect(() => {
    if (Object.keys(chats).length > 0) {
      try {
        localStorage.setItem('specweave_chats', JSON.stringify(chats));
        window.dispatchEvent(new CustomEvent('chatHistoryUpdated'));
      } catch (error) {
        console.error('Error saving chats:', error);
      }
    }
  }, [chats]);

  useEffect(() => {
    if (history.length > 0) {
      try {
        localStorage.setItem('specweave_chat_history', JSON.stringify(history));
        window.dispatchEvent(new CustomEvent('chatHistoryUpdated'));
      } catch (error) {
        console.error('Error saving history:', error);
      }
    }
  }, [history]);

  useEffect(() => {
    try {
      if (activeChatId) {
        localStorage.setItem('specweave_active_chat_id', activeChatId);
      } else {
        localStorage.removeItem('specweave_active_chat_id');
      }
    } catch (error) {
      console.error('Error saving active chat ID:', error);
    }
  }, [activeChatId]);

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chats, activeChatId, hookMessages]);

  // Sync Messages from Hook to Local State
  useEffect(() => {
    if (activeChatId && hookMessages.length > 0) {
      setChats(prevChats => {
        const currentChatMessages = prevChats[activeChatId] || [];
        
        const newMessages = hookMessages.filter(hookMsg => 
          !currentChatMessages.some(localMsg => localMsg.id === hookMsg.id)
        );
        
        if (newMessages.length > 0) {
          return { 
            ...prevChats, 
            [activeChatId]: [...currentChatMessages, ...newMessages] 
          };
        }
        
        return prevChats;
      });
    }
  }, [hookMessages, activeChatId]);

  // Handle initial template message from Dashboard
  useEffect(() => {
    if (location.state?.initialMessage) {
      handleNewChat();
      setTimeout(() => {
        handleSendMessage(location.state.initialMessage);
      }, 100);
      
      navigate(location.pathname, { replace: true });
    }
  }, [location.state?.initialMessage]);

  // --- HANDLERS ---
  const handleSendMessage = (text) => {
    if (!activeChatId && !hasEpic) {
      setRequiresEpicSelection(true);
      openEpicModal();
      return;
    }

    let currentId = activeChatId;
    
    if (!currentId) {
      currentId = Date.now().toString();
      
      const existingNumbers = history.map(chat => {
        const match = chat.title.match(/^StoryConvert(\d+)$/);
        return match ? parseInt(match[1], 10) : 0;
      });
      const maxNumber = existingNumbers.length > 0 ? Math.max(...existingNumbers) : 0;
      const newTitle = `StoryConvert${maxNumber + 1}`;

      const newHistoryItem = { 
        id: currentId, 
        title: newTitle, 
        date: 'Just now',
        timestamp: new Date().toISOString()
      };
      
      setHistory(prev => [newHistoryItem, ...prev]);
      setActiveChatId(currentId);
    }

    const userMessage = { 
      id: Date.now().toString(), 
      role: 'user', 
      content: text, 
      createdAt: new Date() 
    };
    
    setChats(prev => ({ 
      ...prev, 
      [currentId]: [...(prev[currentId] || []), userMessage] 
    }));
    
    sendMessage(text, { epicContext: epicContext });
  };

  const handleNewChat = () => {
    setActiveChatId(null);
    clearMessages();
    localStorage.removeItem('specweave_active_chat_id');
  };

  const handleSelectChat = (id) => {
    const chatId = id.toString();
    setActiveChatId(chatId);
    const existingMessages = chats[chatId] || [];
    loadMessages(existingMessages);
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

  const handleBackToDashboard = () => {
    navigate('/dashboard');
  };

  const handleTemplates = () => {
    setIsTemplateModalOpen(true);
  };

  const handleSelectTemplate = (template) => {
    handleSendMessage(template);
  };

  const currentMessages = activeChatId ? (chats[activeChatId] || []) : hookMessages;
  const currentChatData = activeChatId ? { messages: currentMessages } : null;

  // Empty state component
  const EmptyState = ({ onExampleClick }) => {
    const examples = [
      "As a user, I want to login to the system so that I can access my account",
      "As an admin, I want to manage user permissions so that I can control access",
      "As a customer, I want to track my order so that I know when it will arrive"
    ];

    return (
      <div className="flex flex-col items-center justify-center h-full px-6 text-center">
        <div className="mb-8">
          <Logo 
            size="xl" 
            showText={false} 
            onClick={handleBackToDashboard}
          />
        </div>
        
        <h1 className="text-2xl font-bold text-white mb-4">
          Welcome to SpecWeave
        </h1>
        <p className="text-gray-400 mb-8 max-w-md">
          Transform your user stories into comprehensive Gherkin scenarios with AI assistance.
        </p>

        <div className="space-y-3 w-full max-w-lg">
          <p className="text-sm text-gray-500 mb-4">Try these examples:</p>
          {examples.map((example, index) => (
            <button
              key={index}
              onClick={() => onExampleClick(example)}
              className="w-full p-4 text-left bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl transition-all duration-200 text-sm text-gray-300 hover:text-white"
            >
              {example}
            </button>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="flex h-screen bg-[#020203] text-white overflow-hidden font-sans selection:bg-pink-500/30">
      
      {/* GLOBAL BACKGROUND */}
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] w-[50vw] h-[50vh] bg-[radial-gradient(circle_at_center,rgba(147,51,234,0.08)_0%,rgba(0,0,0,0)_70%)] blur-[100px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50vw] h-[50vh] bg-[radial-gradient(circle_at_center,rgba(236,72,153,0.08)_0%,rgba(0,0,0,0)_70%)] blur-[100px]" />
      </div>

      {/* LEFT PANEL - Chat History */}
      <div className="w-80 h-full bg-[#0a0a0f]/95 backdrop-blur-3xl border-r border-white/5 flex-shrink-0">
        <CompactChatHistory 
          onSelectChat={handleSelectChat}
          activeChatId={activeChatId}
          onNewChat={handleNewChat}
        />
      </div>

      {/* MIDDLE PANEL - Chat Interface */}
      <div className="flex-1 flex flex-col min-w-0">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/5 bg-[#020203]/80 backdrop-blur-2xl">
          <div className="flex items-center gap-4">
            <button 
              onClick={handleBackToDashboard}
              className="p-2 rounded-lg hover:bg-white/5 text-gray-400 hover:text-white transition-colors"
              title="Back to Dashboard"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
            </button>
            
            <div className="flex items-center gap-3">
              <Logo 
                size="md" 
                showText={false} 
                onClick={handleBackToDashboard}
              />
              <div>
                <h1 className="text-lg font-bold text-white">
                  {activeChatId ? (history.find(h => h.id === activeChatId)?.title || 'Chat') : 'SpecWeave'}
                </h1>
                <p className="text-xs text-gray-400">
                  {activeChatId ? 'Active conversation' : 'AI-Powered Gherkin Generator'}
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Epic Selection Button */}
            {activeChatId && (
              <button 
                onClick={handleEpicChange}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all border ${
                  epicContext 
                    ? 'bg-[#0052CC]/10 text-[#0052CC] border-[#0052CC]/30 hover:bg-[#0052CC]/20' 
                    : 'bg-white/5 text-gray-400 border-white/5 hover:bg-white/10 hover:text-white'
                }`}
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
                {hasEpic && epicContext 
                  ? getEpicButtonText(hasEpic, epicContext, connections)
                  : 'Select Epic'}
              </button>
            )}

            <button 
              onClick={handleTemplates}
              className="p-2 rounded-lg hover:bg-white/5 text-gray-400 hover:text-white transition-colors"
              title="Templates"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </button>

            <button 
              onClick={() => setShowDetailPanel(!showDetailPanel)}
              className={`p-2 rounded-lg transition-colors ${showDetailPanel ? 'bg-white/10 text-white' : 'hover:bg-white/5 text-gray-400 hover:text-white'}`}
              title="Toggle Detail Panel"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </button>
          </div>
        </div>

        {/* Epic Context Display */}
        {activeChatId && (
          <div className="px-4 py-2 border-b border-white/5">
            <EpicContextDisplay onChangeEpic={handleEpicChange} />
          </div>
        )}

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto">
          {!activeChatId || currentMessages.length === 0 ? (
            <EmptyState onExampleClick={handleSendMessage} />
          ) : (
            <div className="p-4 space-y-4">
              {currentMessages.map((message, index) => (
                <ChatBubble key={message.id || index} message={message} />
              ))}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Chat Input */}
        <div className="border-t border-white/5 p-4">
          <ChatInput 
            onSendMessage={handleSendMessage}
            isLoading={isLoading}
            disabled={!activeChatId && !hasEpic && requiresEpicSelection}
          />
        </div>
      </div>

      {/* RIGHT PANEL - Detail Panel */}
      {showDetailPanel && (
        <div className="w-80 h-full border-l border-white/5 flex-shrink-0">
          <ChatDetailPanel 
            activeChatId={activeChatId}
            chatData={currentChatData}
            epicContext={epicContext}
            onClose={() => setShowDetailPanel(false)}
          />
        </div>
      )}

      {/* MODALS */}
      <EpicSelectionModal 
        isOpen={isEpicModalOpen} 
        onClose={closeEpicModal}
        onEpicSelected={handleEpicSelected}
        selectedProjectKey={selectedProjectKey}
      />

      <JiraSetupModal
        isOpen={isJiraSetupModalOpen}
        onClose={closeJiraSetupModal}
        onComplete={handleJiraSetupComplete}
      />

      <TemplateModal
        isOpen={isTemplateModalOpen}
        onClose={() => setIsTemplateModalOpen(false)}
        onSelectTemplate={handleSelectTemplate}
      />
    </div>
  );
};

export default ChatNew;