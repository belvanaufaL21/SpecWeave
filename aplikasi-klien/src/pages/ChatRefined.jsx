import { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import ChatBubble from '../components/chat/ChatBubble';
import ChatInput from '../components/chat/ChatInput';

import EpicSelectionModal from '../components/modals/EpicSelectionModal';
import JiraSetupModal from '../components/modals/JiraSetupModal';
import TemplateModal from '../components/modals/TemplateModal';
import JiraProjectManagementModal from '../components/modals/JiraProjectManagementModal';
import MeteorTestModal from '../components/modals/MeteorTestModal';
import MeteorReviewModal from '../components/modals/MeteorReviewModal';
import DeleteConfirmationModal from '../components/modals/DeleteConfirmationModal';
import TestedScenariosOverview from '../components/common/TestedScenariosOverview';
import Logo from '../components/common/Logo';
import ErrorBoundary from '../components/common/ErrorBoundary';


import useChat from '../hooks/useChat';
import { useAuth } from '../contexts/AuthContext';
import { useJira } from '../contexts/JiraContext';
import { TestResultsProvider, useTestResults } from '../contexts/TestResultsContext';
import { jiraService } from '../services/jiraService';
import { getEpicButtonText, getEpicContextDisplayText, getActiveProjectInfo } from '../utils/helpers/activeProjectHelpers';

const ChatRefined = () => {
  // --- HOOKS ---
  const { messages: hookMessages, isLoading, sendMessage, clearMessages, loadMessages } = useChat();
  const { user, profile, signOut } = useAuth();
  const { addTestResult, getAllTestResults } = useTestResults();
  const navigate = useNavigate();
  const location = useLocation();
  const messagesEndRef = useRef(null);

  // --- STATE ---
  const [chats, setChats] = useState({});
  const [history, setHistory] = useState([]);
  const [activeChatId, setActiveChatId] = useState(null);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);
  const [isJiraProjectModalOpen, setIsJiraProjectModalOpen] = useState(false);
  const [requiresEpicSelection, setRequiresEpicSelection] = useState(false);
  const [isMeteorTestModalOpen, setIsMeteorTestModalOpen] = useState(false);
  const [isMeteorReviewModalOpen, setIsMeteorReviewModalOpen] = useState(false);
  const [selectedScenario, setSelectedScenario] = useState(null);
  const [selectedScenarioIndex, setSelectedScenarioIndex] = useState(null);
  const [selectedTestResult, setSelectedTestResult] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [editingChatId, setEditingChatId] = useState(null);
  const [editingTitle, setEditingTitle] = useState('');
  const [dropdownChatId, setDropdownChatId] = useState(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [chatToDelete, setChatToDelete] = useState(null);
  const [isMeteorPanelOpen, setIsMeteorPanelOpen] = useState(() => {
    try {
      const saved = localStorage.getItem('specweave_meteor_panel_open');
      return saved ? JSON.parse(saved) : false;
    } catch {
      return false;
    }
  });
  const [meteorPanelRefresh, setMeteorPanelRefresh] = useState(0);
  const [sidebarForceUpdate, setSidebarForceUpdate] = useState(0);
  
  // Sidebar state - same as Dashboard
  const [isHovered, setIsHovered] = useState(false);
  const [isPinned, setIsPinned] = useState(false);
  const [ignoreHover, setIgnoreHover] = useState(false);

  // Sidebar tetap terbuka jika di-Pin ATAU di-Hover
  const isSidebarVisible = isPinned || (isHovered && !ignoreHover);

  // --- JIRA CONTEXT ---
  const { 
    epicContext, 
    hasEpic, 
    isEpicModalOpen, 
    isJiraSetupModalOpen,
    setEpicContext: setEpicContextGlobal,
    clearEpicContext,
    openEpicModal,
    closeEpicModal,
    openJiraSetupModal,
    closeJiraSetupModal,
    connections,
    hasConnection
  } = useJira();

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

  // Setup global function for METEOR test modal
  useEffect(() => {
    window.openMeteorTestModal = (scenario, scenarioIndex, messageId = null) => {
      const finalMessageId = messageId || activeChatId;
      setSelectedScenario({ ...scenario, messageId: finalMessageId });
      setSelectedScenarioIndex(scenarioIndex);
      setIsMeteorTestModalOpen(true);
    };

    window.openMeteorReviewModal = (scenario, scenarioIndex, testResult) => {
      setSelectedScenario(scenario);
      setSelectedScenarioIndex(scenarioIndex);
      setSelectedTestResult(testResult);
      setIsMeteorReviewModalOpen(true);
    };

    return () => {
      delete window.openMeteorTestModal;
      delete window.openMeteorReviewModal;
    };
  }, [activeChatId]);

  // Handle URL parameter for loading specific chat
  useEffect(() => {
    if (!hasLoaded) return;
    
    const urlParams = new URLSearchParams(location.search);
    const chatIdFromUrl = urlParams.get('id');
    
    if (chatIdFromUrl) {
      const chatExists = chats[chatIdFromUrl] && history.some(h => h.id.toString() === chatIdFromUrl);
      
      if (chatExists) {
        setActiveChatId(chatIdFromUrl);
        // Don't navigate away from the URL parameter - keep it for proper back navigation
        // navigate('/chat', { replace: true }); // REMOVED: This was causing the issue
      } else {
        setActiveChatId(null);
        // Only navigate away if chat doesn't exist
        navigate('/chat', { replace: true });
      }
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

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (event) => {
      // Toggle METEOR panel with Ctrl/Cmd + M
      if ((event.ctrlKey || event.metaKey) && event.key === 'm' && activeChatId) {
        event.preventDefault();
        handleToggleMeteorPanel();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeChatId, isMeteorPanelOpen]);

  // State to force selectedProjectKey recalculation when active project changes
  const [activeProjectUpdateTrigger, setActiveProjectUpdateTrigger] = useState(0);

  // Listen for active project changes to update selectedProjectKey
  useEffect(() => {
    const handleActiveProjectChange = () => {
      console.log('🔄 [CHAT-REFINED] Active project changed, updating selectedProjectKey');
      setActiveProjectUpdateTrigger(prev => prev + 1);
      setSidebarForceUpdate(prev => prev + 1);
    };

    // CRITICAL: Listen for project changes that should clear Epic context
    const handleProjectChanged = (event) => {
      console.log('🔄 [CHAT-REFINED] Project changed event received:', event.detail);
      
      if (event.detail?.projectChanged) {
        console.log('🔄 [CHAT-REFINED] Project changed, forcing Epic context clear');
        
        // Force Epic context to clear by calling the clearEpicContext method
        if (clearEpicContext) {
          clearEpicContext().catch(error => {
            console.warn('Failed to clear Epic context:', error);
          });
        }
        
        // Update UI triggers
        setActiveProjectUpdateTrigger(prev => prev + 1);
        setSidebarForceUpdate(prev => prev + 1);
      }
    };

    // Listen for storage changes (active project updates)
    window.addEventListener('storage', handleActiveProjectChange);
    
    // Listen for custom events from project management modal
    window.addEventListener('activeProjectChanged', handleActiveProjectChange);
    window.addEventListener('activeProjectChanged', handleProjectChanged);
    
    return () => {
      window.removeEventListener('storage', handleActiveProjectChange);
      window.removeEventListener('activeProjectChanged', handleActiveProjectChange);
      window.removeEventListener('activeProjectChanged', handleProjectChanged);
    };
  }, [clearEpicContext]);

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
    // CRITICAL: Clear blocking flags when user actually selects an Epic
    console.log('🎯 [CHAT-REFINED] User selected Epic, clearing blocking flags');
    
    // Clear all blocking flags since user is legitimately selecting an Epic
    localStorage.removeItem('epic_user_cleared');
    sessionStorage.removeItem('epic_context_blocked');
    localStorage.removeItem('epic_context_cleared_at');
    localStorage.removeItem('epic_force_clear_time');
    
    console.log('✅ [CHAT-REFINED] Epic blocking flags cleared - user selection allowed');
    
    await setEpicContextGlobal(epicData);
    setRequiresEpicSelection(false);
    
    console.log('✅ [CHAT-REFINED] Epic context set successfully');
  };

  const handleEpicChange = () => {
    openEpicModal();
  };

  // CRITICAL: Force Epic context clear when needed
  const handleForceEpicClear = async () => {
    console.log('🧹 [CHAT-REFINED] Force clearing Epic context');
    
    try {
      // 1. Clear Epic context via JiraContext clearEpicContext method (this clears from server too)
      if (clearEpicContext) {
        await clearEpicContext();
        console.log('✅ [CHAT-REFINED] JiraContext clearEpicContext completed (server + local)');
      }
      
      // 2. Also clear storage directly to ensure it's gone
      const epicKeys = [
        'specweave_epic_context',
        'epic_context_cleared_at',
        'epic_force_clear_time'
      ];
      
      epicKeys.forEach(key => {
        localStorage.removeItem(key);
        sessionStorage.removeItem(key);
      });
      
      // 3. Set ENHANCED blocking with multiple flags and extended duration
      const clearTimestamp = Date.now();
      
      // Extended blocking timestamps (5 minutes)
      localStorage.setItem('epic_context_cleared_at', clearTimestamp.toString());
      localStorage.setItem('epic_force_clear_time', clearTimestamp.toString());
      
      // User explicit clear flag (permanent until user selects Epic again)
      localStorage.setItem('epic_user_cleared', 'true');
      
      // Session blocking flag (blocks for entire browser session)
      sessionStorage.setItem('epic_context_blocked', 'true');
      
      console.log('🚫 [CHAT-REFINED] Epic context blocked with ENHANCED protection:');
      console.log('   - Time-based blocking: 5 minutes');
      console.log('   - User clear flag: permanent');
      console.log('   - Session blocking: until browser session ends');
      console.log('   - Server restoration blocked until:', new Date(clearTimestamp + 300000).toLocaleTimeString());
      
      // 4. Dispatch clearing events
      window.dispatchEvent(new CustomEvent('forceEpicContextClear'));
      window.dispatchEvent(new CustomEvent('epicContextCleared', {
        detail: { chatId: 'default-chat', timestamp: clearTimestamp }
      }));
      window.dispatchEvent(new CustomEvent('epicContextReset', {
        detail: { chatId: 'default-chat', timestamp: clearTimestamp }
      }));
      
      // 5. Force UI update
      setActiveProjectUpdateTrigger(prev => prev + 1);
      setSidebarForceUpdate(prev => prev + 1);
      
      console.log('✅ [CHAT-REFINED] Epic context force cleared with ENHANCED blocking');
      
      // 6. Verify clearing worked
      setTimeout(() => {
        const remainingEpic = localStorage.getItem('specweave_epic_context');
        const userClearFlag = localStorage.getItem('epic_user_cleared');
        const sessionBlockFlag = sessionStorage.getItem('epic_context_blocked');
        
        console.log('🔍 [CHAT-REFINED] Epic context after ENHANCED clear:');
        console.log('   Epic context in storage:', !!remainingEpic);
        console.log('   hasEpic state:', hasEpic);
        console.log('   epicContext state:', !!epicContext);
        console.log('   User clear flag:', userClearFlag);
        console.log('   Session block flag:', sessionBlockFlag);
        console.log('   Blocking expires:', new Date(clearTimestamp + 300000).toLocaleTimeString());
      }, 500);
      
    } catch (error) {
      console.error('❌ [CHAT-REFINED] Error during force clear:', error);
    }
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

  const handleOpenTemplates = () => {
    setIsTemplateModalOpen(true);
  };

  const handleJiraProjects = () => {
    setIsJiraProjectModalOpen(true);
  };

  const handleJiraSetup = () => {
    openJiraSetupModal();
  };

  const handleAddNewProject = () => {
    setIsJiraProjectModalOpen(false);
    openJiraSetupModal();
  };

  // Navigation handler for dashboard
  const handleNavigateToDashboard = () => {
    navigate('/dashboard');
  };

  const handleSelectTemplate = (template) => {
    handleSendMessage(template);
  };

  // Chat management handlers
  const handleRenameChat = (chatId, newTitle) => {
    if (!newTitle.trim()) return;
    
    setHistory(prev => 
      prev.map(chat => 
        chat.id.toString() === chatId.toString() 
          ? { ...chat, title: newTitle.trim() }
          : chat
      )
    );
    setEditingChatId(null);
    setEditingTitle('');
  };

  const handleDeleteChat = (chatId) => {
    const chat = history.find(h => h.id.toString() === chatId.toString());
    setChatToDelete({ id: chatId, title: chat?.title || 'Untitled Chat' });
    setIsDeleteModalOpen(true);
  };

  const confirmDeleteChat = () => {
    if (!chatToDelete) return;
    
    const chatIdStr = chatToDelete.id.toString();
    
    // Remove from history
    setHistory(prev => prev.filter(chat => chat.id.toString() !== chatIdStr));
    
    // Remove from chats data
    setChats(prev => {
      const newChats = { ...prev };
      delete newChats[chatIdStr];
      return newChats;
    });
    
    // If deleting active chat, clear it
    if (activeChatId === chatIdStr) {
      setActiveChatId(null);
      clearMessages();
      localStorage.removeItem('specweave_active_chat_id');
    }

    // Close modal and reset state
    setIsDeleteModalOpen(false);
    setChatToDelete(null);
  };

  const handleStartRename = (chatId, currentTitle) => {
    setEditingChatId(chatId);
    setEditingTitle(currentTitle);
  };

  const handleCancelRename = () => {
    setEditingChatId(null);
    setEditingTitle('');
  };

  const handleToggleDropdown = (chatId) => {
    setDropdownChatId(dropdownChatId === chatId ? null : chatId);
  };

  const handleCloseDropdown = () => {
    setDropdownChatId(null);
  };

  const handleToggleSidebar = () => {
    if (isPinned) {
        setIsPinned(false);
        setIsHovered(false); 
        setIgnoreHover(true);
        setTimeout(() => setIgnoreHover(false), 600); 
    } else {
        setIsPinned(true);
    }
  };

  const handleTriggerEnter = () => {
      if (!isPinned && !ignoreHover) {
          setIsHovered(true);
      }
  };

  const handleToggleMeteorPanel = () => {
    const newState = !isMeteorPanelOpen;
    setIsMeteorPanelOpen(newState);
    try {
      localStorage.setItem('specweave_meteor_panel_open', JSON.stringify(newState));
    } catch (error) {
      console.error('Error saving METEOR panel state:', error);
    }
  };

  // Memoize selected project key to avoid repeated computation
  const selectedProjectKey = useMemo(() => {
    // Get active project for current chat
    try {
      const chatId = activeChatId || 'default-chat';
      const activeProjects = JSON.parse(localStorage.getItem('activeProjectsPerChat') || '{}');
      const activeProjectId = activeProjects[chatId];
      
      console.log(`🔍 [CHAT-REFINED] Calculating selectedProjectKey for chat ${chatId}:`, {
        activeProjectId,
        connectionsCount: connections?.length || 0,
        updateTrigger: activeProjectUpdateTrigger,
        hasEpic,
        epicContextExists: !!epicContext
      });
      
      if (activeProjectId && connections) {
        const activeProject = connections.find(conn => conn?.id === activeProjectId);
        if (activeProject) {
          console.log(`🎯 [EPIC-MODAL] Active project found:`, {
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
        console.log(`🔧 [EPIC-MODAL] Auto-setting first connection as active:`, {
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
        console.log(`⚠️ [EPIC-MODAL] No JIRA connections available for chat: ${chatId}`);
      }
      
      return null;
    } catch (error) {
      console.error('Error getting active project key:', error);
      return null;
    }
  }, [activeChatId, connections, activeProjectUpdateTrigger, hasEpic, epicContext]); // Added hasEpic and epicContext to dependencies

  const currentMessages = activeChatId ? (chats[activeChatId] || []) : hookMessages;

  // Filter chats based on search
  const filteredHistory = history.filter(chat => 
    chat.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Format time helper
  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInHours = (now - date) / (1000 * 60 * 60);
    
    if (diffInHours < 1) return 'now';
    if (diffInHours < 24) return `${Math.floor(diffInHours)}h`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  // Get message preview
  const getMessagePreview = (chatId) => {
    const chatMessages = chats[chatId] || [];
    const lastMessage = chatMessages[chatMessages.length - 1];
    if (!lastMessage) return 'No messages yet';
    
    // FIXED: Add null/undefined check for content
    const content = lastMessage.content || '';
    if (!content) return 'Empty message';
    
    const preview = content
      .replace(/```[\s\S]*?```/g, '[Code]')
      .replace(/\*\*(.*?)\*\*/g, '$1')
      .replace(/\n/g, ' ')
      .trim();
    
    return preview.length > 50 ? preview.substring(0, 50) + '...' : preview;
  };

  return (
    <div className="flex h-screen bg-[#0f0f0f] text-white overflow-hidden relative">
      
      {/* TRIGGER ZONE */}
      {!isPinned && (
        <div 
            onMouseEnter={handleTriggerEnter}
            className="fixed top-0 left-0 w-5 h-full z-50 bg-transparent" 
        />
      )}

      {/* LEFT SIDEBAR - Collapsible Design */}
      <aside 
        onMouseLeave={() => !isPinned && setIsHovered(false)}
        className={`
            fixed top-0 left-0 h-full z-40 flex flex-col
            bg-[#1a1a1a] border-r border-gray-800/50 shadow-[10px_0_40px_rgba(0,0,0,0.5)]
            transition-transform duration-300 cubic-bezier(0.2, 0, 0, 1)
            ${isSidebarVisible ? 'translate-x-0' : '-translate-x-full'}
        `}
        style={{ width: '280px' }}
      >
        
        {/* Header Section */}
        <div className="p-6 border-b border-gray-800/30">
          <div className="flex items-center justify-between mb-6">
            <Logo 
              size="sm" 
              showText={true} 
              textClassName="text-lg font-semibold" 
              subtitle="AI-Powered Testing" 
              onClick={handleNavigateToDashboard}
            />
            <button 
                onClick={handleToggleSidebar}
                className={`p-2 rounded-lg transition-all duration-300 group/pin border ${isPinned ? 'bg-white/10 text-white border-white/10 shadow-sm' : 'bg-transparent text-gray-500 border-transparent hover:bg-white/5 hover:text-gray-300'}`}
                title={isPinned ? "Unpin Sidebar" : "Pin Sidebar"}
            >
                {isPinned ? (
                     <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" /></svg>
                ) : (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
                )}
            </button>
          </div>

          {/* New Chat Button */}
          <button
            onClick={handleNewChat}
            className="w-full flex items-center justify-center gap-3 p-4 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 rounded-xl transition-all duration-300 text-sm font-medium shadow-lg hover:shadow-purple-500/25 hover:-translate-y-0.5"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            New Chat
          </button>
        </div>

        {/* Quick Actions Section */}
        <div className="p-6 border-b border-gray-800/30">
          <h3 className="text-sm font-semibold text-gray-300 mb-4">Quick Actions</h3>
          <div className="space-y-3">
            {/* Templates Card */}
            <button
              onClick={handleTemplates}
              className="w-full group p-4 bg-gray-800/30 hover:bg-gray-800/50 border border-gray-700/30 hover:border-gray-600/50 rounded-xl transition-all duration-300 text-left hover:shadow-lg hover:-translate-y-0.5"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-blue-500/20 border border-blue-500/30 flex items-center justify-center group-hover:bg-blue-500/30 transition-colors">
                  <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <div className="flex-1">
                  <h4 className="text-sm font-medium text-white group-hover:text-blue-300 transition-colors">Templates</h4>
                  <p className="text-xs text-gray-400">Pre-built user stories</p>
                </div>
              </div>
            </button>

            {/* JIRA Integration Card */}
            <button
              key={`jira-projects-${sidebarForceUpdate}`}
              onClick={hasConnection ? handleJiraProjects : handleJiraSetup}
              className="w-full group p-4 bg-gray-800/30 hover:bg-gray-800/50 border border-gray-700/30 hover:border-gray-600/50 rounded-xl transition-all duration-300 text-left hover:shadow-lg hover:-translate-y-0.5"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-green-500/20 border border-green-500/30 flex items-center justify-center group-hover:bg-green-500/30 transition-colors">
                  <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                  </svg>
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h4 className="text-sm font-medium text-white group-hover:text-green-300 transition-colors">JIRA Projects</h4>
                    {hasConnection && (
                      <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                    )}
                  </div>
                  <p className="text-xs text-gray-400">
                    {hasConnection 
                      ? (() => {
                          // Use helper function for consistent project display
                          const activeProjectInfo = getActiveProjectInfo(connections);
                          if (activeProjectInfo.success) {
                            return activeProjectInfo.projectName;
                          }
                          
                          // Fallback to connection count
                          return `${connections?.length || 0} connected`;
                        })()
                      : 'Setup integration'
                    }
                  </p>
                </div>
              </div>
            </button>

            {/* Epic Context Card */}
            <button
              onClick={handleEpicChange}
              className={`w-full group p-4 border rounded-xl transition-all duration-300 text-left hover:shadow-lg hover:-translate-y-0.5 ${
                epicContext 
                  ? 'bg-purple-600/20 border-purple-500/30 hover:bg-purple-600/30 hover:border-purple-500/50' 
                  : 'bg-gray-800/30 hover:bg-gray-800/50 border-gray-700/30 hover:border-gray-600/50'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center transition-colors ${
                  epicContext
                    ? 'bg-purple-500/30 border border-purple-500/50'
                    : 'bg-purple-500/20 border border-purple-500/30 group-hover:bg-purple-500/30'
                }`}>
                  <svg className="w-5 h-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                  </svg>
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h4 className="text-sm font-medium text-white group-hover:text-purple-300 transition-colors">Epic Context</h4>
                    {hasEpic && epicContext && (
                      <div className="w-2 h-2 bg-purple-400 rounded-full animate-pulse"></div>
                    )}
                  </div>
                  <p className="text-xs text-gray-400 truncate">
                    {getEpicButtonText(hasEpic, epicContext, connections)}
                  </p>
                </div>
              </div>
            </button>
          </div>
        </div>

        {/* Recent Chats Section */}
        <div className="flex-1 flex flex-col min-h-0">
          <div className="p-6 pb-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-gray-300">Recent Chats</h3>
              <span className="text-xs text-gray-500 bg-gray-800/50 px-2 py-1 rounded-full">
                {filteredHistory.length}
              </span>
            </div>
            
            {/* Search */}
            <div className="relative">
              <svg className="absolute left-4 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                placeholder="Search conversations..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-4 py-3 bg-gray-800/30 border border-gray-700/30 rounded-xl text-sm text-white placeholder-gray-500 focus:outline-none focus:border-purple-500/50 focus:bg-gray-800/50 transition-all duration-200"
              />
            </div>
          </div>

          {/* Chat List */}
          <div className="flex-1 overflow-y-auto px-4 pb-4">
            {filteredHistory.length === 0 ? (
              <div className="p-6 text-center">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-800/30 border border-gray-700/30 flex items-center justify-center">
                  <svg className="w-8 h-8 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                  </svg>
                </div>
                <h4 className="text-sm font-medium text-gray-300 mb-1">No conversations found</h4>
                <p className="text-xs text-gray-500">Start a new chat to begin</p>
              </div>
            ) : (
              <div className="space-y-2">
                {filteredHistory.map((chat) => {
                  const isActive = activeChatId === chat.id.toString();
                  const isEditing = editingChatId === chat.id.toString();
                  const isDropdownOpen = dropdownChatId === chat.id.toString();
                  
                  return (
                    <div
                      key={chat.id}
                      className={`group relative p-4 rounded-xl transition-all duration-200 cursor-pointer ${
                        isActive 
                          ? 'bg-gradient-to-r from-purple-600/20 to-blue-600/20 border border-purple-500/30 shadow-lg' 
                          : 'bg-gray-800/20 hover:bg-gray-800/40 border border-gray-700/20 hover:border-gray-600/30 hover:shadow-md'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        {/* Avatar */}
                        <div className={`flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center ${
                          isActive 
                            ? 'bg-gradient-to-br from-purple-500 to-blue-500 shadow-lg' 
                            : 'bg-gradient-to-br from-gray-600 to-gray-700'
                        }`}>
                          <span className="text-sm font-semibold text-white">
                            {chat.title.charAt(0)}
                          </span>
                        </div>

                        {/* Content */}
                        <div 
                          className="flex-1 min-w-0"
                          onClick={() => !isEditing && !isDropdownOpen && handleSelectChat(chat.id)}
                        >
                          <div className="flex items-center justify-between mb-1">
                            {isEditing ? (
                              <input
                                type="text"
                                value={editingTitle}
                                onChange={(e) => setEditingTitle(e.target.value)}
                                onBlur={() => handleRenameChat(chat.id, editingTitle)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    handleRenameChat(chat.id, editingTitle);
                                  } else if (e.key === 'Escape') {
                                    handleCancelRename();
                                  }
                                }}
                                className="text-sm font-medium text-white bg-gray-700/50 border border-gray-600 rounded-lg px-3 py-1 w-full focus:outline-none focus:border-purple-500"
                                autoFocus
                              />
                            ) : (
                              <>
                                <h3 className={`text-sm font-medium truncate pr-2 ${
                                  isActive ? 'text-white' : 'text-gray-200 group-hover:text-white'
                                }`}>
                                  {chat.title}
                                </h3>
                                <span className="text-xs text-gray-500 flex-shrink-0">
                                  {formatTime(chat.timestamp)}
                                </span>
                              </>
                            )}
                          </div>
                          
                          {!isEditing && (
                            <p className={`text-xs truncate ${
                              isActive ? 'text-gray-300' : 'text-gray-400'
                            }`}>
                              {getMessagePreview(chat.id)}
                            </p>
                          )}
                        </div>

                        {/* Dropdown Menu */}
                        {!isEditing && (
                          <div className="relative">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleToggleDropdown(chat.id);
                              }}
                              className="p-2 rounded-lg hover:bg-gray-700/50 text-gray-400 hover:text-white transition-colors opacity-0 group-hover:opacity-100"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                              </svg>
                            </button>

                            {isDropdownOpen && (
                              <>
                                <div className="fixed inset-0 z-10" onClick={handleCloseDropdown} />
                                <div className="absolute right-0 top-10 z-20 bg-[#16161e]/95 backdrop-blur-xl border border-gray-700/50 rounded-xl shadow-2xl py-2 min-w-[140px]">
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleStartRename(chat.id, chat.title);
                                      handleCloseDropdown();
                                    }}
                                    className="w-full px-4 py-2 text-left text-sm text-gray-300 hover:bg-gray-700/50 hover:text-white transition-colors flex items-center gap-3"
                                  >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                    </svg>
                                    Rename
                                  </button>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleDeleteChat(chat.id);
                                      handleCloseDropdown();
                                    }}
                                    className="w-full px-4 py-2 text-left text-sm text-gray-300 hover:bg-red-600/20 hover:text-red-400 transition-colors flex items-center gap-3"
                                  >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                    </svg>
                                    Delete
                                  </button>
                                </div>
                              </>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Active indicator */}
                      {isActive && (
                        <div className="absolute left-0 top-1/2 transform -translate-y-1/2 w-1 h-8 bg-gradient-to-b from-purple-500 to-blue-500 rounded-r-full"></div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* User Profile */}
        <div className="p-6 border-t border-gray-800/30">
          <div className="flex items-center gap-3 p-3 bg-gray-800/30 rounded-xl">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
              <span className="text-sm font-semibold text-white">
                {profile?.name?.charAt(0) || user?.email?.charAt(0) || 'U'}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">
                {profile?.name || user?.email?.split('@')[0] || 'User'}
              </p>
              <p className="text-xs text-gray-400">Online</p>
            </div>
            <button 
              onClick={handleSignOut}
              className="p-2 rounded-lg hover:bg-gray-700/50 text-gray-400 hover:text-white transition-colors"
              title="Sign Out"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            </button>
          </div>
        </div>
      </aside>

      {/* MAIN CHAT AREA - Clean & Modern */}
      <main 
        className={`
            flex-1 flex flex-col h-screen relative z-10 w-full min-w-0 
            transition-all duration-300 ease-in-out
            ${isPinned ? 'pl-[280px]' : 'pl-0'} 
            ${isMeteorPanelOpen ? 'min-w-0' : ''}
        `}
      >
        
        {/* Chat Header - Clean & Minimal */}
        <div className="px-6 py-4 border-b border-gray-800/30 bg-[#0f0f0f]">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-6">
              {!isPinned && (
                <button 
                  onClick={handleToggleSidebar} 
                  className="text-gray-300 hover:text-white transition-colors p-2.5 rounded-xl hover:bg-white/10 bg-white/5 border border-white/10" 
                  title="Open Sidebar"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h7" />
                  </svg>
                </button>
              )}
              
              {activeChatId ? (
                <>
                  <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center">
                    <svg className="w-5 h-5 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                    </svg>
                  </div>
                  <div>
                    <h1 className="text-lg font-semibold text-white">
                      {history.find(h => h.id === activeChatId)?.title || 'New Chat'}
                    </h1>
                    {epicContext && (
                      <p className="text-sm text-gray-400">
                        {(() => {
                          const { text, warning } = getEpicContextDisplayText(hasEpic, epicContext, connections);
                          return (
                            <span className={warning ? 'text-yellow-400' : ''} title={warning || undefined}>
                              {text}
                            </span>
                          );
                        })()}
                      </p>
                    )}
                  </div>
                </>
              ) : (
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-green-500/20 to-blue-500/20 border border-green-500/30 flex items-center justify-center">
                    <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                    </svg>
                  </div>
                  <div>
                    <h1 className="text-lg font-semibold text-white">Groq Llama 3.1</h1>
                    <p className="text-sm text-gray-400">AI Language Model</p>
                  </div>
                </div>
              )}
            </div>

            {/* METEOR Panel Toggle - Clean Button */}
            {activeChatId && (
              <button
                onClick={handleToggleMeteorPanel}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  isMeteorPanelOpen
                    ? 'bg-green-500/20 text-green-400 hover:bg-green-500/30'
                    : 'bg-white/10 text-gray-300 hover:bg-white/15 hover:text-white'
                }`}
                title="Toggle METEOR Testing Panel (Ctrl+M)"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 002 2h2a2 2 0 002-2z" />
                </svg>
                <span>Testing</span>
                {!isMeteorPanelOpen && currentMessages.filter(msg => msg.role === 'assistant' && msg.content.includes('Scenario:')).length > 0 && (
                  <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                )}
              </button>
            )}
          </div>
        </div>

        {/* Messages Area - Clean Layout */}
        <div className="flex-1 overflow-y-auto">
          {!activeChatId || currentMessages.length === 0 ? (
            // Empty State - Clean Logo Only
            <div className="flex flex-col items-center justify-center h-full px-8 text-center">
              {/* Logo Only - No Text */}
              <div className="mb-8">
                <Logo 
                  size="xl" 
                  showText={false} 
                  onClick={handleNavigateToDashboard}
                />
              </div>
              
              {/* Welcome Message */}
              <h2 className="text-2xl font-semibold text-white mb-3">
                {activeChatId ? 'Start the conversation' : 'Welcome to SpecWeave'}
              </h2>
              <p className="text-gray-400 mb-8 max-w-md">
                {activeChatId 
                  ? 'Send a message to begin generating Gherkin scenarios.'
                  : 'Transform your user stories into comprehensive Gherkin scenarios with intelligent AI assistance and quality assessment.'
                }
              </p>

              {/* Template Cards - Modern Design */}
              {!activeChatId && (
                <div className="w-full max-w-2xl space-y-3">
                  {[
                    {
                      title: "Login System",
                      text: "Sebagai pengguna, saya ingin login menggunakan email dan password agar dapat mengakses dashboard aplikasi.",
                      icon: "🔐",
                      category: "Authentication"
                    },
                    {
                      title: "User Management", 
                      text: "Sebagai admin, saya ingin mengelola hak akses pengguna agar dapat mengontrol keamanan sistem.",
                      icon: "👥",
                      category: "Administration"
                    },
                    {
                      title: "Order Tracking",
                      text: "Sebagai customer, saya ingin melacak status pesanan saya agar dapat mengetahui progress pengiriman.",
                      icon: "📦",
                      category: "E-commerce"
                    }
                  ].map((example, index) => (
                    <button
                      key={index}
                      onClick={() => handleSendMessage(example.text)}
                      className="group w-full p-5 text-left bg-gradient-to-r from-white/5 to-white/10 hover:from-purple-500/10 hover:to-pink-500/10 border border-white/10 hover:border-purple-500/30 rounded-2xl transition-all duration-300 shadow-lg hover:shadow-purple-500/10"
                    >
                      <div className="flex items-start gap-4">
                        {/* Icon */}
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-white/10 to-white/5 border border-white/10 flex items-center justify-center text-2xl group-hover:scale-105 transition-transform duration-300">
                          {example.icon}
                        </div>
                        
                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-2">
                            <h3 className="text-lg font-semibold text-white group-hover:text-purple-300 transition-colors">
                              {example.title}
                            </h3>
                            <span className="px-2 py-0.5 bg-purple-500/20 text-purple-300 text-xs rounded-full border border-purple-500/30">
                              {example.category}
                            </span>
                          </div>
                          <p className="text-sm text-gray-400 group-hover:text-gray-300 transition-colors leading-relaxed">
                            {example.text}
                          </p>
                        </div>
                        
                        {/* Arrow Icon */}
                        <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center group-hover:bg-purple-500/20 group-hover:border-purple-500/30 transition-all duration-300">
                          <svg className="w-4 h-4 text-gray-400 group-hover:text-purple-300 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </div>
                      </div>
                    </button>
                  ))}
                  
                  {/* Browse More Templates Button */}
                  <div className="pt-4">
                    <button
                      onClick={handleOpenTemplates}
                      className="w-full p-4 bg-gradient-to-r from-blue-600/20 to-purple-600/20 hover:from-blue-600/30 hover:to-purple-600/30 border border-blue-500/30 hover:border-purple-500/40 rounded-xl transition-all duration-300 text-center group"
                    >
                      <div className="flex items-center justify-center gap-3">
                        <svg className="w-5 h-5 text-blue-400 group-hover:text-purple-400 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                        </svg>
                        <span className="text-sm font-medium text-blue-300 group-hover:text-purple-300 transition-colors">
                          Browse More Templates
                        </span>
                        <span className="px-2 py-0.5 bg-blue-500/20 text-blue-300 text-xs rounded-full border border-blue-500/30 group-hover:bg-purple-500/20 group-hover:text-purple-300 group-hover:border-purple-500/30 transition-all">
                          8+ Available
                        </span>
                      </div>
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            // Messages - Clean & Spacious
            <div className="max-w-4xl mx-auto px-6 py-6">
              <div className="space-y-6">
                {currentMessages.map((message, index) => (
                  <ChatBubble key={message.id || index} message={message} activeChatId={activeChatId} />
                ))}
                <div ref={messagesEndRef} />
              </div>
            </div>
          )}
        </div>

        {/* Chat Input - Modern Design */}
        <div className="border-t border-gray-800/30 bg-[#0f0f0f]">
          <div className="max-w-4xl mx-auto px-6 py-4">
            <ChatInput 
              onSendMessage={handleSendMessage}
              isLoading={isLoading}
              disabled={!activeChatId && !hasEpic && requiresEpicSelection}
            />
          </div>
        </div>
      </main>

      {/* RIGHT PANEL - METEOR Testing (Clean Design) */}
      {isMeteorPanelOpen && (
        <div className="w-80 xl:w-96 bg-[#1a1a1a] border-l border-gray-800/30 flex flex-col flex-shrink-0 transition-all duration-300">
          <div className="p-6 border-b border-gray-800/30">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-white">METEOR Testing</h3>
                <p className="text-sm text-gray-400 mt-1">
                  {activeChatId ? 'Current chat scenarios' : 'Select a chat to view tests'}
                </p>
              </div>
              <button
                onClick={handleToggleMeteorPanel}
                className="p-2 rounded-lg hover:bg-gray-800/50 text-gray-400 hover:text-white transition-colors"
                title="Close METEOR Panel"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
          
          <div className="flex-1 overflow-y-auto p-6">
            <TestedScenariosOverview 
              key={meteorPanelRefresh}
              activeChatId={activeChatId} 
              chatMessages={currentMessages}
            />
          </div>
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

      <JiraProjectManagementModal
        isOpen={isJiraProjectModalOpen}
        onClose={() => setIsJiraProjectModalOpen(false)}
        onAddNewProject={handleAddNewProject}
      />

      <TemplateModal
        isOpen={isTemplateModalOpen}
        onClose={() => setIsTemplateModalOpen(false)}
        onSelectTemplate={handleSelectTemplate}
      />

      <DeleteConfirmationModal
        isOpen={isDeleteModalOpen}
        onClose={() => {
          setIsDeleteModalOpen(false);
          setChatToDelete(null);
        }}
        onConfirm={confirmDeleteChat}
        title="Delete Chat"
        message="Are you sure you want to delete this chat? All messages and conversation history will be permanently removed."
        itemName={chatToDelete?.title}
        confirmText="Delete Chat"
        cancelText="Keep Chat"
        isDangerous={true}
      />

      <ErrorBoundary fallbackMessage="Failed to load METEOR testing modal">
        <MeteorTestModal
          isOpen={isMeteorTestModalOpen}
          onClose={() => {
            setIsMeteorTestModalOpen(false);
            setSelectedScenario(null);
            setSelectedScenarioIndex(null);
          }}
          scenario={selectedScenario}
          scenarioIndex={selectedScenarioIndex}
          onTestComplete={(result) => {
            // Save test result
            if (selectedScenario && selectedScenarioIndex !== null) {
              // Use the messageId from the scenario (which should be set correctly now)
              const messageId = selectedScenario.messageId;
              
              if (!messageId) {
                console.error('messageId is missing from selectedScenario:', selectedScenario);
                return;
              }
              
              // Add the messageId to the result for consistency
              const resultWithMessageId = {
                ...result,
                messageId: messageId,
                scenarioIndex: selectedScenarioIndex
              };
              
              addTestResult(messageId, selectedScenarioIndex, resultWithMessageId);
              
              // Force re-render of TestedScenariosOverview by triggering a state update
              setTimeout(() => {
                setMeteorPanelRefresh(prev => prev + 1);
                window.dispatchEvent(new CustomEvent('meteorTestCompleted'));
              }, 200);
            } else {
              console.error('Cannot save test result - missing scenario or index');
            }
          }}
        />
      </ErrorBoundary>

      <ErrorBoundary fallbackMessage="Failed to load METEOR review modal">
        <MeteorReviewModal
          isOpen={isMeteorReviewModalOpen}
          onClose={() => {
            setIsMeteorReviewModalOpen(false);
            setSelectedScenario(null);
            setSelectedScenarioIndex(null);
            setSelectedTestResult(null);
          }}
          scenario={selectedScenario}
          scenarioIndex={selectedScenarioIndex}
          testResult={selectedTestResult}
        />
      </ErrorBoundary>
    </div>
  );
};

export default ChatRefined;