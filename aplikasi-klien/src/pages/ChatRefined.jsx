import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import ChatBubble from '../components/chat/ChatBubble';
import TypingIndicator from '../components/chat/TypingIndicator';
import CompactChatItem from '../components/chat/CompactChatItem';
import ChatCountIndicator from '../components/chat/ChatCountIndicator';
import FormatGuide from '../components/chat/FormatGuide';
import UserDataService from '../services/UserDataService';
import { getCurrentLLMInfo, getLLMConfig } from '../utils/helpers/llmHelpers';
import { generateUniqueId, generateUniqueChatTitle, createChatHistoryItem } from '../utils/helpers/chatHelpers';

import EpicSelectionModal from '../components/modals/EpicSelectionModal';
import JiraSetupModal from '../components/modals/JiraSetupModal';
import TemplateModal from '../components/modals/TemplateModal';
import JiraProjectManagementModal from '../components/modals/JiraProjectManagementModal';
import DualTestingModal from '../components/modals/DualTestingModal';
import MeteorReviewModal from '../components/modals/MeteorReviewModal';
import DeleteConfirmationModal from '../components/modals/DeleteConfirmationModal';
import ReferenceLibraryWithAutoSettings from '../components/common/ReferenceLibraryWithAutoSettings';
import TestedScenariosOverview from '../components/common/TestedScenariosOverview';
import MinimizableTestingPanel from '../components/common/MinimizableTestingPanel';
import Logo from '../components/common/Logo';
import ErrorBoundary from '../components/common/ErrorBoundary';

import useChat from '../hooks/useChat';
import { useAuth } from '../contexts/AuthContext';
import { useJira } from '../contexts/JiraContext';
import { TestResultsProvider, useTestResults } from '../contexts/TestResultsContext';
import { useChat as useChatContext } from '../contexts/ChatContext';
import { useResponsive } from '../hooks/useResponsive';
import { jiraService } from '../services/jiraService';
import { getEpicButtonText, getEpicContextDisplayText, getActiveProjectInfo } from '../utils/helpers/activeProjectHelpers';
import cleanLogger from '../config/cleanLogging.js';

const ChatRefined = () => {
  // --- HOOKS ---
  const { messages: hookMessages, isLoading, currentChatId: hookChatId, loadingChats, isChatLoading, isAnyLoading, sendMessage, clearMessages, loadMessages } = useChat();
  const { user, profile, signOut } = useAuth();
  const { addTestResult, getAllTestResults } = useTestResults();
  const { isMobile } = useResponsive();
  
  // Get current AI model info
  const llmInfo = getCurrentLLMInfo();
  const llmConfig = getLLMConfig();
  const availableModels = llmConfig.availableModels.filter(m => m.isAvailable);
  
  // --- CHAT CONTEXT ---
  const { 
    chats: contextChats, 
    history: contextHistory, 
    updateChatMessages, 
    renameChat: contextRenameChat,
    deleteChat: contextDeleteChat,
    createNewChat: contextCreateNewChat,
    getChatMessages,
    lastUpdated
  } = useChatContext();
  
  const navigate = useNavigate();
  const location = useLocation();
  const messagesEndRef = useRef(null);

  // --- STATE ---
  const [activeChatId, setActiveChatId] = useState(null);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);
  const [isReferenceLibraryOpen, setIsReferenceLibraryOpen] = useState(false);
  const [isJiraProjectModalOpen, setIsJiraProjectModalOpen] = useState(false);
  const [requiresEpicSelection, setRequiresEpicSelection] = useState(false);
  const [isDualModeTestModalOpen, setIsDualModeTestModalOpen] = useState(false);
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
  const [isMeteorPanelOpen, setIsMeteorPanelOpen] = useState(true); // Always open
  const [isTestingScenarioPanelOpen, setIsTestingScenarioPanelOpen] = useState(false); // Testing Scenario panel toggle
  const [meteorPanelRefresh, setMeteorPanelRefresh] = useState(0);
  const [sidebarForceUpdate, setSidebarForceUpdate] = useState(0);
  const [input, setInput] = useState(''); // For welcome state input (kondisi 1)
  const [inputBottom, setInputBottom] = useState(''); // For bottom input (kondisi 2)
  const [showFormatGuide, setShowFormatGuide] = useState(false); // For format guide modal
  const [showAIDropdown, setShowAIDropdown] = useState(false); // For AI model dropdown
  
  // CRITICAL FIX: Track pending messages per chat to prevent loss during navigation
  const [pendingMessages, setPendingMessages] = useState({}); // { chatId: [messages] }
  
  // CRITICAL FIX: Sync pending messages with context when context updates
  useEffect(() => {
    // When contextChats updates, check if any pending messages are now in context
    Object.keys(pendingMessages).forEach(chatId => {
      const contextMessages = contextChats[chatId] || [];
      const pending = pendingMessages[chatId] || [];
      
      // Check if all pending messages are now in context
      const allPendingInContext = pending.every(pendingMsg => 
        contextMessages.some(contextMsg => contextMsg.id === pendingMsg.id)
      );
      
      if (allPendingInContext && pending.length > 0) {
        console.log('✅ [CHAT-REFINED] All pending messages now in context, clearing pending for chat:', chatId);
        setPendingMessages(prev => {
          const updated = { ...prev };
          delete updated[chatId];
          return updated;
        });
      }
    });
  }, [contextChats, pendingMessages]);

  // Memoize scenarioId to prevent unnecessary re-renders
  const memoizedScenarioId = useMemo(() => {
    return selectedScenario ? `${selectedScenario.messageId}-${selectedScenarioIndex}` : null;
  }, [selectedScenario?.messageId, selectedScenarioIndex]);
  
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

  // --- DEBOUNCED FUNCTIONS ---
  // Debounced setActiveProject to prevent infinite API calls
  const setActiveProjectDebounced = useCallback(
    (() => {
      let timeoutId;
      const pendingCalls = new Map(); // Use Map to track timestamps
      
      return (chatId, connectionId, projectData) => {
        // Create a unique key for this call
        const callKey = `${chatId}-${connectionId}`;
        
        // Check if this exact call was made recently (within 1 second)
        const now = Date.now();
        const lastCall = pendingCalls.get(callKey);
        
        if (lastCall && (now - lastCall) < 1000) {
          cleanLogger.debugThrottled('CHAT', `Skipping recent duplicate setActiveProject call for ${callKey}`, null, `skip-${callKey}`);
          return Promise.resolve({ success: true, cached: true });
        }
        
        // Clear any existing timeout
        if (timeoutId) {
          clearTimeout(timeoutId);
        }
        
        // Record this call timestamp
        pendingCalls.set(callKey, now);
        
        return new Promise((resolve, reject) => {
          timeoutId = setTimeout(async () => {
            try {
              cleanLogger.debugThrottled('CHAT', `Executing debounced setActiveProject for ${callKey}`, null, `exec-${callKey}`);
              const result = await UserDataService.setActiveProject(connectionId);
              
              // Clean up old entries (older than 5 seconds)
              const cutoff = Date.now() - 5000;
              for (const [key, timestamp] of pendingCalls.entries()) {
                if (timestamp < cutoff) {
                  pendingCalls.delete(key);
                }
              }
              
              resolve(result);
            } catch (error) {
              pendingCalls.delete(callKey);
              reject(error);
            }
          }, 100); // Reduced debounce time to 100ms
        });
      };
    })(),
    []
  );

  // Use context data instead of loading from database
  useEffect(() => {
    // Context handles loading, just mark as loaded when context data is available
    if (contextHistory.length >= 0) { // >= 0 to handle empty arrays
      setHasLoaded(true);
    }
  }, [contextHistory]);

  // Setup global function for METEOR test modal
  useEffect(() => {
    window.openMeteorTestModal = (scenarioText, scenarioIndex, chatId = null, messageId = null) => {
      const finalChatId = chatId || activeChatId;
      const finalMessageId = messageId || activeChatId;
      
      cleanLogger.debug('METEOR', 'Opening METEOR test modal', {
        scenarioText,
        scenarioIndex,
        chatId: finalChatId,
        messageId: finalMessageId
      });
      
      setSelectedScenario({ 
        text: scenarioText,
        chatId: finalChatId,
        messageId: finalMessageId 
      });
      setSelectedScenarioIndex(scenarioIndex);
      setIsDualModeTestModalOpen(true);
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
      // User navigated to specific chat ID
      const chatExists = contextChats[chatIdFromUrl] && contextHistory.some(h => h.id.toString() === chatIdFromUrl);
      
      if (chatExists) {
        setActiveChatId(chatIdFromUrl);
        // Keep the URL parameter for proper navigation
      } else {
        // Chat doesn't exist, redirect to main chat page
        setActiveChatId(null);
        navigate('/chat', { replace: true });
      }
    } else if (location.pathname === '/chat') {
      // User navigated to /chat without ID (regular navigation or New Chat button)
      // ALWAYS clear activeChatId to show LLM interface
      cleanLogger.chatOperation('No chat ID in URL, showing LLM interface');
      setActiveChatId(null);
    }
  }, [location.search, location.pathname, navigate, hasLoaded, contextChats, contextHistory]);

  // Load messages into hook when activeChatId changes (for display only)
  useEffect(() => {
    if (activeChatId && contextChats[activeChatId]) {
      // Only log in development and throttle to reduce noise
      if (import.meta.env.DEV) {
        console.log('📥 [CHAT-REFINED] Loading messages for display:', {
          activeChatId,
          messageCount: contextChats[activeChatId].length,
          messages: contextChats[activeChatId].map(m => ({ id: m.id, role: m.role }))
        });
      }
      
      // CRITICAL FIX: Merge with pending messages before loading
      const contextMessages = contextChats[activeChatId] || [];
      const pending = pendingMessages[activeChatId] || [];
      
      const messageMap = new Map();
      contextMessages.forEach(msg => messageMap.set(msg.id, msg));
      pending.forEach(msg => messageMap.set(msg.id, msg));
      
      const mergedMessages = Array.from(messageMap.values()).sort((a, b) => {
        const timeA = new Date(a.createdAt || a.timestamp || 0).getTime();
        const timeB = new Date(b.createdAt || b.timestamp || 0).getTime();
        return timeA - timeB;
      });
      
      if (import.meta.env.DEV) {
        console.log('📦 [CHAT-REFINED] Loading merged messages:', {
          activeChatId,
          contextCount: contextMessages.length,
          pendingCount: pending.length,
          mergedCount: mergedMessages.length
        });
      }
      
      loadMessages(mergedMessages);
    } else if (!activeChatId) {
      // CRITICAL FIX: Only clear if we're explicitly navigating away from all chats
      // Don't clear if we're just switching between chats
      const hasMessages = hookMessages.length > 0;
      if (hasMessages) {
        if (import.meta.env.DEV) {
          console.log('🗑️ [CHAT-REFINED] Clearing messages - no active chat');
        }
        clearMessages();
      }
    }
    // CRITICAL FIX: Remove hookMessages.length from dependencies to prevent infinite loops
    // Add pendingMessages to dependencies to re-load when pending changes
  }, [activeChatId, contextChats, pendingMessages, loadMessages, clearMessages, hookMessages.length]);

  // Context handles saving, no need for manual save useEffect

  // History is now saved as part of chat sessions in database
  // No separate localStorage needed

  // Active chat ID is now managed in component state only
  // No localStorage needed for active chat

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [contextChats, activeChatId, hookMessages]);

  // NOTE: Removed message sync effects - messages now saved directly to context via callback

  // NOTE: Removed lazy save useEffect - now saving immediately in handleNewChat
  // Save new chat to database when created
  // useEffect(() => {
  //   if (activeChatId && chats[activeChatId] && chats[activeChatId].length === 0) {
  //     // This is a new empty chat, save it to database
  //     const chatTitle = history.find(h => h.id === activeChatId)?.title || 'New Chat';
  //     
  //     const sessionData = {
  //       title: chatTitle,
  //       messages: [],
  //       metadata: {
  //         createdAt: new Date().toISOString(),
  //         createdFrom: 'new_chat_button'
  //       }
  //     };
  //     
  //     UserDataService.saveChatSession(activeChatId, sessionData).then(result => {
  //       if (result.success) {
  //         
  //       } else {
  //         console.error('❌ [CHAT-REFINED] Failed to save new chat:', result.error);
  //       }
  //     });
  //   }
  // }, [activeChatId, chats, history]);

  // Handle keyboard shortcuts
  useEffect(() => {
    // Removed Ctrl+M shortcut since panel is always open
  }, [activeChatId, isMeteorPanelOpen]);

  // State to force selectedProjectKey recalculation when active project changes
  const [activeProjectUpdateTrigger, setActiveProjectUpdateTrigger] = useState(0);

  // Listen for active project changes to update selectedProjectKey - FIXED: Reduce excessive triggers
  useEffect(() => {
    const handleActiveProjectChange = () => {
      cleanLogger.debugThrottled('CHAT', 'Active project change detected - debouncing update', null, 'active-project-change', 5000);
      // FIXED: Debounce this update to prevent excessive triggers
      setTimeout(() => {
        setActiveProjectUpdateTrigger(prev => prev + 1);
        setSidebarForceUpdate(prev => prev + 1);
      }, 100);
    };

    // CRITICAL: Listen for project changes that should clear Epic context
    const handleProjectChanged = (event) => {
      
      if (event.detail?.projectChanged) {
        
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
    
    // Handle JIRA connection deletion events with smooth UX
    const handleConnectionDeleted = (event) => {
      cleanLogger.jiraOperation('Connection deleted - smooth update');
      
      const { connectionId, updatedConnections } = event.detail;
      
      // Show smooth feedback
      if (window.toast) {
        window.toast.success('Project connection updated', {
          duration: 2000,
          position: 'bottom-right'
        });
      }
      
      // Force sidebar update to reflect changes
      setSidebarForceUpdate(prev => prev + 1);
      setActiveProjectUpdateTrigger(prev => prev + 1);
    };

    // SMOOTH CONNECTION UPDATE handler
    const handleConnectionsUpdated = (event) => {
      cleanLogger.debugThrottled('JIRA', 'Connections updated smoothly', null, 'connections-updated', 3000);
      
      const { connections, hasConnection, action, deletedConnectionId } = event.detail;
      
      if (action === 'delete') {
        cleanLogger.jiraOperation(`Connection deleted: ${deletedConnectionId}`);
        
        // Show smooth feedback
        if (window.toast) {
          window.toast.success('Project connection updated', {
            duration: 2000,
            position: 'bottom-right'
          });
        }
      }
      
      // Force UI updates
      setSidebarForceUpdate(prev => prev + 1);
      setActiveProjectUpdateTrigger(prev => prev + 1);
    };

    const handleJiraStateChanged = (event) => {
      if (event.detail?.action === 'connectionDeleted') {
        const { connectionId, updatedConnections } = event.detail;
        cleanLogger.jiraOperation(`JIRA state changed - connection deleted: ${connectionId}`);
        
        // Check if deleted connection was active for current chat
        const activeProjects = JSON.parse(localStorage.getItem('activeProjectsPerChat') || '{}');
        const activeProjectId = activeProjects[activeChatId];
        
        if (activeProjectId === connectionId) {
          cleanLogger.debug('CHAT', `Clearing active project due to state change for chat ${activeChatId}: ${connectionId}`);
          
          // Clear active project from localStorage
          const updatedActiveProjects = { ...activeProjects };
          delete updatedActiveProjects[activeChatId];
          localStorage.setItem('activeProjectsPerChat', JSON.stringify(updatedActiveProjects));
        }
        
        // Force sidebar update to reflect changes
        cleanLogger.debugThrottled('CHAT', 'Force updating sidebar due to state change', null, 'sidebar-update', 2000);
        setSidebarForceUpdate(prev => prev + 1);
        
        // CRITICAL FIX: Force epic context clear and UI refresh
        cleanLogger.debugThrottled('CHAT', 'Force clearing epic context due to state change', null, 'epic-clear', 2000);
        if (clearEpicContext) {
          clearEpicContext().catch(error => {
            console.warn('Failed to clear epic context:', error);
          });
        }
        
        // FIXED: Single UI update instead of multiple delayed updates
        setActiveProjectUpdateTrigger(prev => prev + 1);
        
        // REMOVED: Excessive delayed updates that cause infinite loops
        // setTimeout(() => {
        //   console.log(`🔄 [CHAT-REFINED] Secondary UI refresh after JIRA state change`);
        //   setSidebarForceUpdate(prev => prev + 1);
        //   setActiveProjectUpdateTrigger(prev => prev + 1);
        // }, 100);
        
        // REMOVED: Final refresh that causes more loops
        // setTimeout(() => {
        //   console.log(`🔄 [CHAT-REFINED] Final UI refresh after JIRA state change`);
        //   setSidebarForceUpdate(prev => prev + 1);
        //   setActiveProjectUpdateTrigger(prev => prev + 1);
        // }, 500);
      }
    };

    const handleForceRefresh = (event) => {
      cleanLogger.debugThrottled('CHAT', 'Force refresh triggered', null, 'force-refresh', 5000);
      setSidebarForceUpdate(prev => prev + 1);
      
      // FIXED: Single update instead of multiple
      setActiveProjectUpdateTrigger(prev => prev + 1);
    };

    // Add JIRA deletion event listeners
    window.addEventListener('jiraConnectionDeleted', handleConnectionDeleted);
    window.addEventListener('jiraConnectionsUpdated', handleConnectionsUpdated);
    window.addEventListener('jiraStateChanged', handleJiraStateChanged);
    window.addEventListener('forceUIRefresh', handleForceRefresh);
    
    // Add epic context clear listener
    const handleEpicContextClear = () => {
      cleanLogger.debugThrottled('CHAT', 'Epic context clear event received', null, 'epic-context-clear', 3000);
      setActiveProjectUpdateTrigger(prev => prev + 1);
    };
    
    window.addEventListener('forceEpicContextClear', handleEpicContextClear);
    window.addEventListener('epicContextCleared', handleEpicContextClear);
    
    return () => {
      window.removeEventListener('storage', handleActiveProjectChange);
      window.removeEventListener('activeProjectChanged', handleActiveProjectChange);
      window.removeEventListener('activeProjectChanged', handleProjectChanged);
      window.removeEventListener('jiraConnectionDeleted', handleConnectionDeleted);
      window.removeEventListener('jiraConnectionsUpdated', handleConnectionsUpdated);
      window.removeEventListener('jiraStateChanged', handleJiraStateChanged);
      window.removeEventListener('forceUIRefresh', handleForceRefresh);
      window.removeEventListener('forceEpicContextClear', handleEpicContextClear);
      window.removeEventListener('epicContextCleared', handleEpicContextClear);
    };
  }, [clearEpicContext]);

  // Handle initial template message from Dashboard
  useEffect(() => {
    if (location.state?.initialMessage) {
      // Instead of sending immediately, just populate the input field
      setInput(location.state.initialMessage);
      
      // Clear the state to prevent re-triggering
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location.state?.initialMessage]);

  // Close dropdown when sidebar is closed or user clicks outside
  useEffect(() => {
    // Close dropdown when sidebar is closed
    if (!isSidebarVisible && dropdownChatId) {
      setDropdownChatId(null);
    }
  }, [isSidebarVisible, dropdownChatId]);

  // Close dropdown when clicking outside
  useEffect(() => {
    if (!dropdownChatId) return;

    const handleClickOutside = (event) => {
      // Check if click is outside the dropdown menu and button
      const dropdownMenu = document.querySelector('.fixed.z-\\[9999\\]');
      const menuButton = document.getElementById(`menu-button-${dropdownChatId}`);
      
      if (dropdownMenu && !dropdownMenu.contains(event.target) && 
          menuButton && !menuButton.contains(event.target)) {
        setDropdownChatId(null);
      }
    };

    // Add event listener with a small delay to avoid immediate closing
    setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside);
    }, 0);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [dropdownChatId]);

  // --- HANDLERS ---
  const handleSendMessage = async (text) => {
    console.log('🚀 [CHAT-REFINED] handleSendMessage called:', {
      text: text?.substring(0, 50),
      activeChatId,
      hasEpic
    });
    
    if (!activeChatId && !hasEpic) {
      setRequiresEpicSelection(true);
      openEpicModal();
      return;
    }

    let currentId = activeChatId;
    let isNewChat = false;
    
    if (!currentId) {
      console.log('🆕 [CHAT-REFINED] Creating new chat...');
      // Create new chat using context
      const result = await contextCreateNewChat();
      
      if (result.success) {
        currentId = result.chatId;
        setActiveChatId(currentId);
        
        console.log('✅ [CHAT-REFINED] New chat created:', currentId);
        
        // CRITICAL: Navigate to the new chat URL to show conversation
        navigate(`/chat?id=${currentId}`, { replace: true });
      } else {
        console.error('❌ [CHAT-REFINED] Failed to create new chat:', result.error);
        return;
      }
    }

    console.log('🤖 [CHAT-REFINED] Sending message to AI...');
    
    // CRITICAL FIX: Don't save user message here - useChat will handle it
    // Just send directly to AI with callback
    sendMessage(text, { 
      epicContext: epicContext,
      chatId: currentId,
      onMessageReceived: async (message, chatId) => {
        console.log('💾 [CHAT-REFINED] Message received (user or AI):', {
          chatId,
          messageId: message.id,
          messageRole: message.role
        });
        
        // CRITICAL FIX: Use updateChatMessages with a function that gets current messages
        // This avoids stale closure issues
        await updateChatMessages(chatId, (currentMessages) => {
          console.log('📊 [CHAT-REFINED] Current messages in update function:', {
            chatId,
            messageCount: currentMessages.length,
            messages: currentMessages.map(m => ({ id: m.id, role: m.role }))
          });
          
          // Check if message already exists (prevent duplicates)
          const messageExists = currentMessages.some(m => m.id === message.id);
          
          if (messageExists) {
            console.log('⚠️ [CHAT-REFINED] Message already exists, skipping:', message.id);
            return currentMessages; // Return unchanged
          }
          
          // Add new message
          const updatedMessages = [...currentMessages, message];
          
          console.log('💾 [CHAT-REFINED] Adding message to context:', {
            chatId,
            newMessageCount: updatedMessages.length,
            messages: updatedMessages.map(m => ({ id: m.id, role: m.role }))
          });
          
          return updatedMessages;
        });
        
        console.log('✅ [CHAT-REFINED] Message saved to context');
        
        // Clear pending messages after AI response is saved
        if (message.role === 'ai') {
          setPendingMessages(prev => {
            const updated = { ...prev };
            delete updated[chatId];
            console.log('🧹 [CHAT-REFINED] Cleared pending messages for chat:', chatId);
            return updated;
          });
        }
      }
    });
  };

  const handleNewChat = () => {
    // Navigate to welcome state (no chat ID) to show LLM interface
    cleanLogger.chatOperation('Navigating to welcome state');
    
    // CRITICAL: Clear current active chat FIRST before navigation
    setActiveChatId(null);
    clearMessages();
    
    // Force clear any existing chat state to prevent race conditions
    setTimeout(() => {
      // Navigate to clean chat page without ID to show welcome state
      navigate('/chat', { replace: true });
    }, 50); // Small delay to ensure state is cleared
  };

  const handleSelectChat = (id) => {
    const chatId = id.toString();
    
    console.log('🔄 [CHAT-REFINED] Selecting chat:', {
      chatId,
      currentActiveChatId: activeChatId,
      contextMessagesCount: (contextChats[chatId] || []).length,
      pendingMessagesCount: (pendingMessages[chatId] || []).length,
      allPendingChats: Object.keys(pendingMessages)
    });
    
    setActiveChatId(chatId);
    
    // CRITICAL FIX: Merge context messages with pending messages
    const contextMessages = contextChats[chatId] || [];
    const pending = pendingMessages[chatId] || [];
    
    console.log('📦 [CHAT-REFINED] Merging messages for chat:', {
      chatId,
      contextMessages: contextMessages.map(m => ({ id: m.id, role: m.role })),
      pendingMessages: pending.map(m => ({ id: m.id, role: m.role }))
    });
    
    // Merge and deduplicate
    const messageMap = new Map();
    contextMessages.forEach(msg => messageMap.set(msg.id, msg));
    pending.forEach(msg => messageMap.set(msg.id, msg));
    
    const mergedMessages = Array.from(messageMap.values()).sort((a, b) => {
      const timeA = new Date(a.createdAt || a.timestamp || 0).getTime();
      const timeB = new Date(b.createdAt || b.timestamp || 0).getTime();
      return timeA - timeB;
    });
    
    console.log('✅ [CHAT-REFINED] Merged messages:', {
      chatId,
      totalCount: mergedMessages.length,
      messages: mergedMessages.map(m => ({ id: m.id, role: m.role }))
    });
    
    loadMessages(mergedMessages);
    
    // Navigate to the selected chat URL
    navigate(`/chat?id=${chatId}`, { replace: true });
  };

  const handleEpicSelected = async (epicData) => {
    // CRITICAL: Clear blocking flags when user actually selects an Epic
    cleanLogger.debug('EPIC', 'Epic selected, clearing blocking flags', epicData);
    
    // Clear all blocking flags since user is legitimately selecting an Epic
    localStorage.removeItem('epic_user_cleared');
    sessionStorage.removeItem('epic_context_blocked');
    localStorage.removeItem('epic_context_cleared_at');
    localStorage.removeItem('epic_force_clear_time');

    await setEpicContextGlobal(epicData);
    setRequiresEpicSelection(false);
    
    // Force UI refresh to show selected epic
    setActiveProjectUpdateTrigger(prev => prev + 1);
    setSidebarForceUpdate(prev => prev + 1);
    
    cleanLogger.debug('EPIC', 'Epic context set successfully', {
      hasEpic,
      epicName: epicData?.epic?.name,
      epicKey: epicData?.epic?.key
    });
  };

  // Debug: Monitor epic context changes
  useEffect(() => {
    cleanLogger.debugThrottled('EPIC', 'Epic context state changed', {
      hasEpic,
      epicName: epicContext?.epicData?.epic?.name,
      epicKey: epicContext?.epicData?.epic?.key,
      epicId: epicContext?.epicData?.epic?.id
    }, 'epic-state-change', 2000);
  }, [hasEpic, epicContext]);

  const generateContextualScenarios = (userStory, feature, existingScenarios) => {
    // Analyze user story to determine domain and generate relevant scenarios
    const userStoryLower = userStory.toLowerCase();
    const featureLower = feature.toLowerCase();
    
    // Base scenarios that work for most cases
    let scenarios = [];
    
    // Authentication/Login related scenarios
    if (userStoryLower.includes('login') || userStoryLower.includes('masuk') || userStoryLower.includes('autentikasi')) {
      scenarios = [
        {
          title: "Edge Case - Multiple Login Attempts",
          given: "pengguna telah gagal login 2 kali berturut-turut",
          when: "pengguna mencoba login untuk ketiga kalinya dengan kredensial yang salah",
          then: "sistem mengaktifkan captcha dan memberikan delay 30 detik sebelum percobaan berikutnya"
        },
        {
          title: "Negative Scenario - Account Locked",
          given: "akun pengguna telah dikunci karena terlalu banyak percobaan login yang gagal",
          when: "pengguna mencoba login dengan kredensial yang benar",
          then: "sistem menampilkan pesan bahwa akun dikunci dan memberikan opsi untuk reset password"
        },
        {
          title: "Alternative Flow - Social Login Fallback",
          given: "pengguna mencoba login dengan Google tetapi layanan Google sedang down",
          when: "pengguna klik tombol 'Login dengan Google'",
          then: "sistem menampilkan pesan error dan menyarankan login dengan email/password"
        }
      ];
    }
    // E-commerce/Shopping related scenarios
    else if (userStoryLower.includes('beli') || userStoryLower.includes('keranjang') || userStoryLower.includes('checkout') || userStoryLower.includes('pembayaran')) {
      scenarios = [
        {
          title: "Edge Case - Stock Habis Saat Checkout",
          given: "pengguna memiliki produk di keranjang dan melanjutkan ke checkout",
          when: "pengguna mengkonfirmasi pembayaran tetapi stok produk habis di detik terakhir",
          then: "sistem membatalkan transaksi, mengembalikan dana, dan memberikan notifikasi dengan rekomendasi produk serupa"
        },
        {
          title: "Negative Scenario - Payment Gateway Error",
          given: "pengguna telah mengisi semua data pembayaran dengan benar",
          when: "payment gateway mengalami error saat memproses pembayaran",
          then: "sistem menampilkan pesan error yang jelas dan menyimpan data keranjang untuk percobaan ulang"
        },
        {
          title: "Alternative Flow - Expired Session",
          given: "pengguna telah mengisi keranjang belanja dan idle selama 30 menit",
          when: "pengguna mencoba melanjutkan ke checkout",
          then: "sistem meminta login ulang dan mempertahankan isi keranjang setelah login berhasil"
        }
      ];
    }
    // Dashboard/Data related scenarios
    else if (userStoryLower.includes('dashboard') || userStoryLower.includes('data') || userStoryLower.includes('laporan') || userStoryLower.includes('statistik')) {
      scenarios = [
        {
          title: "Edge Case - Large Dataset Loading",
          given: "pengguna memiliki data yang sangat besar (>10,000 records)",
          when: "pengguna membuka dashboard atau laporan",
          then: "sistem menampilkan data secara bertahap dengan pagination dan loading indicator yang informatif"
        },
        {
          title: "Negative Scenario - No Data Available",
          given: "pengguna baru pertama kali mengakses dashboard dan belum memiliki data apapun",
          when: "pengguna membuka halaman dashboard",
          then: "sistem menampilkan empty state yang informatif dengan panduan cara menambahkan data pertama"
        },
        {
          title: "Alternative Flow - Offline Mode",
          given: "pengguna sedang melihat dashboard dan koneksi internet terputus",
          when: "pengguna mencoba refresh atau navigasi ke halaman lain",
          then: "sistem menampilkan data yang ter-cache dan memberikan indikator bahwa sedang offline"
        }
      ];
    }
    // Generic scenarios for other cases
    else {
      scenarios = [
        {
          title: "Edge Case - Sistem Overload",
          given: "sistem sedang mengalami beban tinggi dengan banyak pengguna aktif",
          when: "pengguna mencoba mengakses fitur utama",
          then: "sistem menampilkan loading indicator dan tetap responsif dengan waktu tunggu maksimal 10 detik"
        },
        {
          title: "Negative Scenario - Akses Tidak Valid",
          given: "pengguna tidak memiliki permission yang diperlukan untuk fitur ini",
          when: "pengguna mencoba mengakses fitur",
          then: "sistem menampilkan pesan error yang jelas dan mengarahkan ke halaman yang sesuai"
        },
        {
          title: "Alternative Flow - Koneksi Terputus",
          given: "pengguna sedang menggunakan fitur dan koneksi internet terputus",
          when: "pengguna melakukan aksi yang memerlukan koneksi",
          then: "sistem menyimpan data sementara dan memberikan notifikasi untuk mencoba lagi ketika koneksi pulih"
        }
      ];
    }
    
    return scenarios;
  };

  // Handler untuk update message dengan scenario tambahan
  const handleUpdateMessage = async (updatedMessage) => {
    try {
      
      if (!activeChatId) {
        console.error('❌ [CHAT-REFINED] No active chat ID for message update');
        return;
      }
      
      // Get current messages for this chat
      const currentMessages = getChatMessages(activeChatId) || [];
      
      // Simply update the message in the array
      const updatedMessages = currentMessages.map(msg => 
        msg.id === updatedMessage.id ? updatedMessage : msg
      );
      
      await updateChatMessages(activeChatId, updatedMessages);
    } catch (error) {
      console.error('❌ [CHAT-REFINED] Failed to update message:', error);
      toast.error('Gagal menyimpan perubahan');
    }
  };

  const handleEpicChange = () => {
    openEpicModal();
  };

  // CRITICAL: Force Epic context clear when needed
  const handleForceEpicClear = async () => {
    
    try {
      // 1. Clear Epic context via JiraContext clearEpicContext method (this clears from server too)
      if (clearEpicContext) {
        await clearEpicContext();
        
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

      // 6. Verify clearing worked
      setTimeout(() => {
        const remainingEpic = localStorage.getItem('specweave_epic_context');
        const userClearFlag = localStorage.getItem('epic_user_cleared');
        const sessionBlockFlag = sessionStorage.getItem('epic_context_blocked');

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

  const handleSelectTemplate = async (templateContent) => {

    if (!templateContent || typeof templateContent !== 'string' || templateContent.trim().length === 0) {
      console.error('❌ [CHAT-REFINED] Invalid template content:', templateContent);
      return;
    }
    
    // Close template modal first
    setIsTemplateModalOpen(false);
    
    // Check if there are existing messages to determine which input to populate
    const currentMessages = activeChatId ? (contextChats[activeChatId] || []) : [];
    
    if (currentMessages.length > 0) {
      // If there are messages, populate the bottom input
      setInputBottom(templateContent);
    } else {
      // If no messages (welcome state), populate the top input
      setInput(templateContent);
    }
    
    console.log('✅ [CHAT-REFINED] Template inserted into input field:', templateContent.substring(0, 50) + '...');
  };

  // Chat management handlers
  const handleRenameChat = async (chatId, newTitle) => {
    if (!newTitle.trim()) return;
    
    try {
      console.log('✏️ [CHAT-REFINED] Renaming chat:', chatId, 'to:', newTitle.trim());
      
      const result = await contextRenameChat(chatId, newTitle.trim());
      
      if (result.success) {
        
      } else {
        console.error('❌ [CHAT-REFINED] Failed to rename chat:', result.error);
      }
    } catch (error) {
      console.error('❌ [CHAT-REFINED] Error renaming chat:', error);
    } finally {
      setEditingChatId(null);
      setEditingTitle('');
    }
  };

  const handleDeleteChat = (chatId) => {
    console.log('🗑️ [CHAT-REFINED] handleDeleteChat called with chatId:', chatId);
    console.log('🗑️ [CHAT-REFINED] contextHistory:', contextHistory);
    
    if (!contextHistory || !Array.isArray(contextHistory)) {
      console.error('❌ [CHAT-REFINED] contextHistory is not an array:', contextHistory);
      return;
    }
    
    const chat = contextHistory.find(h => h.id.toString() === chatId.toString());
    console.log('🗑️ [CHAT-REFINED] Found chat:', chat);
    
    setChatToDelete({ id: chatId, title: chat?.title || 'Untitled Chat' });
    setIsDeleteModalOpen(true);
  };

  const confirmDeleteChat = async () => {
    if (!chatToDelete) return;
    
    try {
      const chatIdStr = chatToDelete.id.toString();
      console.log('🗑️ [CHAT-REFINED] Deleting chat:', chatIdStr);
      
      const result = await contextDeleteChat(chatIdStr);
      
      if (result.success) {
        
        // If deleting active chat, clear it
        if (activeChatId === chatIdStr) {
          setActiveChatId(null);
          clearMessages();
        }
      } else {
        console.error('❌ [CHAT-REFINED] Failed to delete chat:', result.error);
      }
    } catch (error) {
      console.error('❌ [CHAT-REFINED] Error deleting chat:', error);
    } finally {
      // Close modal and reset state
      setIsDeleteModalOpen(false);
      setChatToDelete(null);
    }
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
    // Panel always open, no toggle needed
    return;
  };

  // Memoize selected project key to avoid repeated computation - FIXED: Remove circular dependency + throttled logging
  const selectedProjectKey = useMemo(() => {
    // Get active project for current chat
    try {
      const chatId = activeChatId || 'default-chat';
      const activeProjects = JSON.parse(localStorage.getItem('activeProjectsPerChat') || '{}');
      const activeProjectId = activeProjects[chatId];
      
      // FIXED: Throttle logging to prevent spam (max 1 log per 2 seconds)
      const now = Date.now();
      const lastLogKey = `selectedProjectKey-${chatId}`;
      const lastLogTime = window[lastLogKey] || 0;
      
      if (now - lastLogTime > 2000) { // 2 second throttle
        cleanLogger.debugThrottled('CHAT', `Calculating selectedProjectKey for chat ${chatId}`, {
          activeProjectId,
          connectionsCount: connections?.length || 0,
          updateTrigger: activeProjectUpdateTrigger,
          hasEpic,
          epicContextExists: !!epicContext
        }, lastLogKey);
        window[lastLogKey] = now;
      }
      
      // CRITICAL FIX: Validate that activeProjectId still exists in connections
      if (activeProjectId && connections && connections.length > 0) {
        const activeProject = connections.find(conn => conn?.id === activeProjectId);
        if (activeProject) {
          // FIXED: Throttle this log too
          if (now - lastLogTime > 2000) {
            cleanLogger.debugThrottled('EPIC', `Active project found`, {
              connectionId: activeProjectId,
              projectKey: activeProject?.project_key,
              projectName: activeProject?.custom_fields?.project_info?.name
            }, `epic-active-${chatId}`);
          }
          return activeProject?.project_key || null;
        } else {
          // Active project ID exists but connection is gone - clear it
          cleanLogger.debugThrottled('CHAT', `Active project ID ${activeProjectId} no longer exists, clearing...`, null, `clear-stale-${chatId}`);
          
          // Clear stale data immediately
          const activeProjects = JSON.parse(localStorage.getItem('activeProjectsPerChat') || '{}');
          delete activeProjects[chatId];
          localStorage.setItem('activeProjectsPerChat', JSON.stringify(activeProjects));
          
          // Clear from database too (fire and forget)
          UserDataService.clearActiveProject(chatId).catch(error => {
            cleanLogger.warn('CHAT', 'Could not clear stale active project from database', error.message);
          });
          
          // Don't auto-set here, let the next render cycle handle it
          return null;
        }
      }
      
      // CRITICAL FIX: If no connections available, clear any stale active project data
      if (connections && connections.length === 0) {
        const activeProjects = JSON.parse(localStorage.getItem('activeProjectsPerChat') || '{}');
        if (activeProjects[chatId]) {
          cleanLogger.debugThrottled('CHAT', `No connections available, clearing stale active project for chat: ${chatId}`, null, `no-connections-${chatId}`);
          
          // Clear from localStorage
          const updatedActiveProjects = { ...activeProjects };
          delete updatedActiveProjects[chatId];
          localStorage.setItem('activeProjectsPerChat', JSON.stringify(updatedActiveProjects));
          
          // Clear from database (fire and forget)
          UserDataService.clearActiveProject(chatId).catch(error => {
            cleanLogger.warn('CHAT', 'Could not clear active project from database', error.message);
          });
        }
        return null;
      }
      
      // Auto-set first connection as active if no active project is set
      // CRITICAL FIX: Only do this if we have connections and no active project
      if (!activeProjectId && connections && connections.length > 0) {
        const firstConnection = connections[0];
        
        // FIXED: Throttle this log too
        if (now - lastLogTime > 2000) {
          console.log(`🔧 [EPIC-MODAL] Auto-setting first connection as active:`, {
            connectionId: firstConnection.id,
            projectKey: firstConnection.project_key,
            projectName: firstConnection.custom_fields?.project_info?.name
          });
        }
        
        // Set as active project using UserDataService (saves to database)
        const projectData = {
          project_key: firstConnection.project_key,
          project_name: firstConnection.custom_fields?.project_info?.name || firstConnection.project_key
        };
        
        // FIXED: Use setTimeout to avoid circular dependency in useMemo
        setTimeout(() => {
          setActiveProjectDebounced(chatId, firstConnection.id, projectData)
            .then(result => {
              if (result.success) {
                // Only log in development
                if (import.meta.env.DEV) {
                  cleanLogger.debug('CHAT-REFINED', 'Active project saved to database');
                }
                // REMOVED: Don't trigger update from inside useMemo - causes infinite loop
                // setActiveProjectUpdateTrigger(prev => prev + 1);
              } else {
                cleanLogger.error('CHAT-REFINED', 'Failed to save active project to database', result.error);
                // Only fallback to localStorage if it's not a validation error or duplicate call
                if (!result.error?.includes('UUID') && 
                    !result.error?.includes('validation') && 
                    !result.error?.includes('Duplicate call')) {
                  jiraService.setActiveProjectForChat(chatId, firstConnection.id);
                  // REMOVED: Don't trigger update from inside useMemo
                  // setActiveProjectUpdateTrigger(prev => prev + 1);
                }
              }
            })
            .catch(error => {
              console.error('❌ [CHAT-REFINED] Error saving active project:', error);
              // Only fallback if it's not a validation error
              if (!error.message?.includes('UUID') && !error.message?.includes('validation')) {
                jiraService.setActiveProjectForChat(chatId, firstConnection.id);
                // REMOVED: Don't trigger update from inside useMemo
                // setActiveProjectUpdateTrigger(prev => prev + 1);
              }
            });
        }, 0);
        
        // Return the project key immediately for UI consistency
        return firstConnection.project_key;
      }
      
      return null;
    } catch (error) {
      console.error('Error getting active project key:', error);
      return null;
    }
  }, [activeChatId, connections, activeProjectUpdateTrigger, hasEpic, epicContext, setActiveProjectDebounced]); // FIXED: Keep dependencies but remove circular updates

  // CRITICAL FIX: Merge pending messages with context messages
  // This ensures messages being generated are not lost when user navigates away
  const allMessages = useMemo(() => {
    if (!activeChatId) return [];
    
    const contextMessages = contextChats[activeChatId] || [];
    const pending = pendingMessages[activeChatId] || [];
    
    console.log('🔍 [CHAT-REFINED] allMessages calculation:', {
      activeChatId,
      contextMessagesCount: contextMessages.length,
      pendingMessagesCount: pending.length,
      contextMessages: contextMessages.map(m => ({ id: m.id, role: m.role, content: m.content?.substring(0, 50) })),
      pendingMessages: pending.map(m => ({ id: m.id, role: m.role, content: m.content?.substring(0, 50) }))
    });
    
    // Merge and deduplicate by message ID
    const messageMap = new Map();
    
    // Add context messages first
    contextMessages.forEach(msg => {
      messageMap.set(msg.id, msg);
    });
    
    // Add pending messages (will override if same ID)
    pending.forEach(msg => {
      messageMap.set(msg.id, msg);
    });
    
    const merged = Array.from(messageMap.values()).sort((a, b) => {
      const timeA = new Date(a.createdAt || a.timestamp || 0).getTime();
      const timeB = new Date(b.createdAt || b.timestamp || 0).getTime();
      return timeA - timeB;
    });
    
    console.log('✅ [CHAT-REFINED] Merged messages:', {
      totalCount: merged.length,
      messages: merged.map(m => ({ id: m.id, role: m.role, content: m.content?.substring(0, 50) }))
    });
    
    return merged;
  }, [activeChatId, contextChats, pendingMessages]);
  
  // Get all messages to display
  const getDisplayedMessages = () => {
    return allMessages;
  };
  
  const displayedMessages = getDisplayedMessages();

  // Filter chats based on search
  const filteredHistory = contextHistory.filter(chat => 
    chat.title && chat.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Format time helper
  const formatTime = (timestamp) => {
    if (!timestamp) return 'unknown';
    
    const date = new Date(timestamp);
    const now = new Date();
    const diffInMs = now - date;
    const diffInMinutes = diffInMs / (1000 * 60);
    const diffInHours = diffInMs / (1000 * 60 * 60);
    
    if (diffInMinutes < 1) return 'now';
    if (diffInMinutes < 60) return `${Math.floor(diffInMinutes)}m`;
    if (diffInHours < 24) return `${Math.floor(diffInHours)}h`;
    
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) return `${diffInDays}d`;
    
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  // Get message preview - show first user message (user story)
  const getMessagePreview = useCallback((chatId) => {
    // CRITICAL FIX: Merge context messages with pending messages
    const contextMessages = contextChats[chatId] || [];
    const pending = pendingMessages[chatId] || [];
    
    // Merge and deduplicate
    const messageMap = new Map();
    contextMessages.forEach(msg => messageMap.set(msg.id, msg));
    pending.forEach(msg => messageMap.set(msg.id, msg));
    
    const allChatMessages = Array.from(messageMap.values()).sort((a, b) => {
      const timeA = new Date(a.createdAt || a.timestamp || 0).getTime();
      const timeB = new Date(b.createdAt || b.timestamp || 0).getTime();
      return timeA - timeB;
    });
    
    // Find first user message (user story input)
    const firstUserMessage = allChatMessages.find(msg => msg.role === 'user');
    
    if (!firstUserMessage) return 'No messages yet';
    
    // FIXED: Add null/undefined check for content
    const content = firstUserMessage.content || '';
    if (!content) return 'Empty message';
    
    const preview = content
      .replace(/```[\s\S]*?```/g, '[Code]')
      .replace(/\*\*(.*?)\*\*/g, '$1')
      .replace(/\n/g, ' ')
      .trim();
    
    return preview.length > 50 ? preview.substring(0, 50) + '...' : preview;
  }, [contextChats, pendingMessages]);

  return (
    <div className="flex h-screen bg-[#020203] text-white overflow-hidden relative">
      
      {/* GLOBAL BACKGROUND */}
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] w-[50vw] h-[50vh] bg-[radial-gradient(circle_at_center,rgba(147,51,234,0.08)_0%,rgba(0,0,0,0)_70%)] blur-[100px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50vw] h-[50vh] bg-[radial-gradient(circle_at_center,rgba(236,72,153,0.08)_0%,rgba(0,0,0,0)_70%)] blur-[100px]" />
      </div>
      
      {/* TRIGGER ZONE */}
      {!isPinned && !isMobile && (
        <div 
            onMouseEnter={handleTriggerEnter}
            className="fixed top-0 left-0 w-5 h-full z-50 bg-transparent" 
        />
      )}

      {/* Mobile Overlay */}
      {isMobile && isSidebarVisible && (
        <div 
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-30"
          onClick={() => setIsHovered(false)}
        />
      )}

      {/* LEFT SIDEBAR - Collapsible Design */}
      <aside 
        onMouseLeave={() => !isPinned && !isMobile && setIsHovered(false)}
        className={`
            fixed top-0 left-0 h-full z-40 flex flex-col
            bg-[#0f0f14] border-r border-white/5 shadow-[10px_0_40px_rgba(0,0,0,0.5)]
            transition-transform duration-300 cubic-bezier(0.2, 0, 0, 1)
            ${isSidebarVisible ? 'translate-x-0' : '-translate-x-full'}
        `}
        style={{ width: isMobile ? '100%' : '280px' }}
      >
        
        {/* Header Section */}
        <div className="p-5 border-b border-white/5" style={{ backgroundColor: '#09090A' }}>
          <div className="flex items-center justify-between mb-5">
            <Logo 
              size="lg" 
              showText={false} 
              textClassName="text-lg font-semibold" 
            />
            <button 
                onClick={handleToggleSidebar}
                className="p-2 rounded-lg transition-all duration-300 group/pin border text-white"
                style={{ backgroundColor: 'transparent', borderColor: 'rgba(255, 255, 255, 0.05)' }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#0D0D0D';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                }}
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
            className="w-full flex items-center justify-start gap-3 p-3.5 rounded-xl transition-all duration-300 text-sm font-medium border"
            style={{ 
              backgroundColor: 'transparent', 
              borderColor: 'transparent',
              color: '#FFFFFF'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#0D0D0D';
              e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.05)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
              e.currentTarget.style.borderColor = 'transparent';
            }}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            New Chat
          </button>

          {/* Reference Library Button */}
          <button
            onClick={() => setIsReferenceLibraryOpen(true)}
            className="w-full flex items-center justify-start gap-3 p-3.5 rounded-xl transition-all duration-300 text-sm font-medium border mt-2"
            style={{ 
              backgroundColor: 'transparent', 
              borderColor: 'transparent',
              color: '#FFFFFF'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#0D0D0D';
              e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.05)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
              e.currentTarget.style.borderColor = 'transparent';
            }}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
            Reference Library
          </button>
        </div>



        {/* Recent Chats Section */}
        <div className="flex-1 flex flex-col min-h-0" style={{ backgroundColor: '#09090A' }}>
          <div className="px-5 pt-5 pb-3">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-gray-300">Recent Chats</h3>
              <span className="text-xs text-gray-500 px-2.5 py-1 rounded-md border" style={{ backgroundColor: '#0D0D0D', borderColor: 'rgba(255, 255, 255, 0.05)' }}>
                {filteredHistory.length}
              </span>
            </div>
          </div>

          {/* Chat List */}
          <div className="flex-1 overflow-y-auto px-5 pb-4 scroll-smooth">
            <>
              <ChatCountIndicator 
                filteredCount={filteredHistory.length}
                totalCount={history.length}
                searchQuery={searchQuery}
                showThreshold={10}
              />
              
              <div className="space-y-1.5 max-h-full">
                {filteredHistory.map((chat) => {
                  const isActive = activeChatId === chat.id.toString();
                  const isEditing = editingChatId === chat.id.toString();
                  const isDropdownOpen = dropdownChatId === chat.id.toString();
                  
                  return (
                    <CompactChatItem
                      key={chat.id}
                      chat={chat}
                      isActive={isActive}
                      isEditing={isEditing}
                      isDropdownOpen={isDropdownOpen}
                      editingTitle={editingTitle}
                      onSelect={handleSelectChat}
                      onToggleDropdown={handleToggleDropdown}
                      onStartRename={handleStartRename}
                      onRenameChat={handleRenameChat}
                      onCancelRename={handleCancelRename}
                      onDeleteChat={handleDeleteChat}
                      setEditingTitle={setEditingTitle}
                      formatTime={formatTime}
                      getMessagePreview={getMessagePreview}
                    />
                  );
                })}
              </div>
            </>
          </div>
        </div>

        {/* User Profile */}
        <div className="p-5 border-t border-white/5" style={{ backgroundColor: '#09090A' }}>
          <button
            onClick={() => navigate('/profile')}
            className="w-full flex items-center gap-3 p-3 rounded-xl transition-all border"
            style={{ backgroundColor: 'transparent', borderColor: 'rgba(255, 255, 255, 0.05)' }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#0D0D0D';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
            }}
          >
            <div className="w-8 h-8 rounded-lg flex items-center justify-center border" style={{ backgroundColor: '#160D14', borderColor: '#44273D' }}>
              <span className="text-xs font-semibold" style={{ color: '#FF7AD0' }}>
                {(() => {
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
                })()}
              </span>
            </div>
            <div className="flex-1 min-w-0 text-left">
              <p className="text-sm font-medium text-white truncate">
                {profile?.name || user?.email?.split('@')[0] || 'User'}
              </p>
              <p className="text-xs text-gray-400">View Profile</p>
            </div>
            <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </aside>

      {/* MAIN CHAT AREA - Clean & Modern */}
      <main 
        className={`
            flex-1 flex flex-col h-screen relative z-10 w-full min-w-0 
            transition-all duration-300 ease-in-out
            ${isPinned && !isMobile ? 'pl-[280px]' : 'pl-0'} 
            ${isMeteorPanelOpen ? 'min-w-0' : ''}
        `}
      >
        
        {/* Chat Header - Clean & Minimal */}
        <div className="px-6 py-4 bg-transparent flex items-center h-[73px]">
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-3">
              {!isPinned && (
                <button 
                  onClick={handleToggleSidebar} 
                  className="text-gray-300 hover:text-white transition-colors p-2.5 rounded-xl border" 
                  style={{ borderColor: 'rgba(255, 255, 255, 0.05)' }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#0d0d0d'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                  title="Open Sidebar"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h7" />
                  </svg>
                </button>
              )}
              
              {/* Template Button - Kiri */}
              <button
                onClick={handleTemplates}
                className="flex items-center gap-2 px-3.5 py-2 border rounded-lg transition-all"
                style={{ borderColor: 'rgba(255, 255, 255, 0.05)' }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#0d0d0d'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                title={isMobile ? "Pilih Template" : undefined}
              >
                <svg className="w-4 h-4" style={{ color: '#FFFFFF' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                {!isMobile && <span className="text-sm">Pilih Template</span>}
              </button>
            </div>

            {/* JIRA & Epic Buttons - Kanan */}
            <div className="flex items-center gap-3">
              {/* JIRA Project Button */}
              <button
                key={`jira-header-${sidebarForceUpdate}`}
                onClick={handleJiraProjects}
                className="flex items-center gap-2 px-3.5 py-2 border rounded-lg transition-all"
                style={{ borderColor: 'rgba(255, 255, 255, 0.05)' }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#0d0d0d'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                title={isMobile ? (hasConnection 
                  ? (() => {
                      const activeProjectInfo = getActiveProjectInfo(connections);
                      return activeProjectInfo.success ? activeProjectInfo.projectName : 'ProjectDL2';
                    })()
                  : 'No Project') : undefined}
              >
                {/* JIRA Logo - Blue when connected, Red when not */}
                <svg className={`w-4 h-4 ${hasConnection ? 'text-blue-500' : 'text-red-500'}`} viewBox="0 0 24 24" fill="currentColor">
                  <path d="M11.571 11.513H0a5.218 5.218 0 0 0 5.232 5.215h2.13v2.057A5.215 5.215 0 0 0 12.575 24V12.518a1.005 1.005 0 0 0-1.005-1.005zm5.723-5.756H5.736a5.215 5.215 0 0 0 5.215 5.214h2.129v2.058a5.218 5.218 0 0 0 5.215 5.214V6.758a1.001 1.001 0 0 0-1.001-1.001zM23.013 0H11.455a5.215 5.215 0 0 0 5.215 5.215h2.129v2.057A5.215 5.215 0 0 0 24 12.483V1.005A1.001 1.001 0 0 0 23.013 0z"/>
                </svg>
                {!isMobile && (
                  <span className="text-sm">
                    {hasConnection 
                      ? (() => {
                          const activeProjectInfo = getActiveProjectInfo(connections);
                          return activeProjectInfo.success ? activeProjectInfo.projectName : 'ProjectDL2';
                        })()
                      : 'No Project'
                    }
                  </span>
                )}
                {/* Connection Indicator - Blue when connected, Red when not */}
                {!isMobile && <div className={`w-2 h-2 rounded-full ${hasConnection ? 'bg-blue-500' : 'bg-red-500'}`}></div>}
              </button>

              {/* Epic Button */}
              <button
                onClick={handleEpicChange}
                className="flex items-center gap-2 px-3.5 py-2 border rounded-lg transition-all"
                style={{ borderColor: 'rgba(255, 255, 255, 0.05)' }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#0d0d0d'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                title={isMobile ? (hasEpic && epicContext 
                  ? (epicContext.epicData?.epic?.name || epicContext.epicData?.epic?.key || 'Select Epic')
                  : 'No Epic') : undefined}
              >
                {/* Epic Lightning Icon - Purple when selected, Red when not */}
                <svg className={`w-4 h-4 ${hasEpic && epicContext ? 'text-purple-500' : 'text-red-500'}`} viewBox="0 0 24 24" fill="currentColor">
                  <path d="M13 2L3 14h8l-1 8 10-12h-8l1-8z"/>
                </svg>
                {!isMobile && (
                  <span className="text-sm">
                    {hasEpic && epicContext 
                      ? (epicContext.epicData?.epic?.name || epicContext.epicData?.epic?.key || 'Select Epic')
                      : 'No Epic'
                    }
                  </span>
                )}
                {/* Connection Indicator - Purple when selected, Red when not */}
                {!isMobile && <div className={`w-2 h-2 rounded-full ${hasEpic && epicContext ? 'bg-purple-500' : 'bg-red-500'}`}></div>}
              </button>

              {/* Testing Scenario Button - Show only when panel is closed on desktop */}
              {(isMobile || !isTestingScenarioPanelOpen) && (
                <button
                  onClick={() => setIsTestingScenarioPanelOpen(!isTestingScenarioPanelOpen)}
                  className="flex items-center gap-2 px-3.5 py-2 border rounded-lg transition-all"
                  style={{ borderColor: 'rgba(255, 255, 255, 0.05)' }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#0d0d0d'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                  title="Testing Scenario"
                >
                  <svg className="w-4 h-4" style={{ color: '#FFFFFF' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                  </svg>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Messages Area - Clean Layout */}
        <div className="flex-1 overflow-y-auto">
          {allMessages.length === 0 ? (
            // Empty State - Show when no messages (with centered ChatInput like Landing)
            <div className="flex flex-col items-center justify-center h-full px-8 py-8 text-center">
              {/* Welcome Message */}
              <h2 className="text-4xl font-bold text-white mb-3">
                Yahalo, {profile?.name?.split(' ')[0] || 'Yuka'}!
              </h2>
              <p className="text-gray-400 mb-10 max-w-md">
                Mau konversi User story Anda menjadi Scenario Gherkin?
              </p>

              {/* Centered Chat Input - Same as Landing Page */}
              <div className="w-full max-w-4xl mb-10">
                <div className="backdrop-blur-lg rounded-2xl border p-6 shadow-2xl" style={{ backgroundColor: '#09090A', borderColor: 'rgba(255, 255, 255, 0.05)' }}>
                  <textarea
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        if (input.trim() && !(loadingChats[activeChatId])) {
                          handleSendMessage(input.trim());
                          setInput('');
                        }
                      }
                    }}
                    onFocus={() => {
                      console.log('🎯 [INPUT-FOCUS] Welcome screen input focused:', {
                        activeChatId,
                        loadingChats,
                        isDisabled: loadingChats[activeChatId],
                        allLoadingChats: JSON.stringify(loadingChats)
                      });
                    }}
                    placeholder="Masukkan user story Anda..."
                    className={`w-full bg-transparent text-white placeholder-gray-500 resize-none outline-none text-base focus:outline-none ${isMobile ? 'min-h-[80px]' : 'min-h-[120px]'}`}
                    disabled={loadingChats[activeChatId]}
                  />
                  
                  <div className="flex items-center justify-between mt-6 flex-wrap gap-4">
                    <div className="flex items-center gap-4 flex-wrap">
                      <button
                        onClick={() => setShowFormatGuide(!showFormatGuide)}
                        className="flex items-center gap-2 px-4 py-2 rounded-lg transition-colors text-sm border"
                        style={{ backgroundColor: '#09090A', borderColor: 'rgba(255, 255, 255, 0.05)' }}
                        title={isMobile ? "Format Guide" : undefined}
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                        </svg>
                        {!isMobile && "Format Guide"}
                      </button>
                      
                      <button
                        onClick={() => {
                          setInput("As a [role], I want [feature], so that [benefit]");
                          setShowFormatGuide(false);
                        }}
                        className="flex items-center gap-2 px-4 py-2 rounded-lg transition-colors text-sm border"
                        style={{ backgroundColor: '#09090A', borderColor: 'rgba(255, 255, 255, 0.05)' }}
                        title={isMobile ? "Use Format" : undefined}
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                        </svg>
                        {!isMobile && "Use Format"}
                      </button>
                    </div>

                    <div className="flex items-center gap-4">
                      <div className="relative">
                        <button
                          onClick={() => setShowAIDropdown(!showAIDropdown)}
                          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm border transition-colors hover:border-white/10"
                          style={{ backgroundColor: '#09090A', borderColor: 'rgba(255, 255, 255, 0.05)' }}
                          title={isMobile ? llmInfo.shortName : undefined}
                        >
                          <div className="w-5 h-5 rounded bg-transparent flex items-center justify-center text-[10px] font-bold">
                            {llmInfo.icon}
                          </div>
                          {!isMobile && <span className="text-gray-300">{llmInfo.shortName}</span>}
                          <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        </button>

                        {/* Dropdown Menu */}
                        {showAIDropdown && (
                          <div 
                            className="absolute top-full mt-2 right-0 rounded-lg border shadow-xl z-50 min-w-[250px]"
                            style={{ backgroundColor: '#09090A', borderColor: 'rgba(255, 255, 255, 0.05)' }}
                          >
                            {availableModels.length > 1 ? (
                              <div className="py-2">
                                {availableModels.map((model) => (
                                  <button
                                    key={model.id}
                                    className="w-full px-4 py-3 text-left hover:bg-white/5 transition-colors flex items-start gap-3"
                                    onClick={() => {
                                      // TODO: Implement model switching
                                      toast.success(`Switched to ${model.name}`);
                                      setShowAIDropdown(false);
                                    }}
                                  >
                                    <div className="text-lg">{llmInfo.icon}</div>
                                    <div className="flex-1">
                                      <div className="text-sm font-medium text-white">{model.name}</div>
                                      <div className="text-xs text-gray-400 mt-1">{model.description}</div>
                                    </div>
                                    {model.isDefault && (
                                      <div className="text-xs px-2 py-1 rounded" style={{ backgroundColor: '#120C18', color: '#C27AFF' }}>
                                        Active
                                      </div>
                                    )}
                                  </button>
                                ))}
                              </div>
                            ) : (
                              <div className="px-4 py-3 text-sm text-gray-400">
                                Belum ada model lain yang tersedia
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                      
                      <button
                        onClick={() => {
                          if (input.trim() && !(loadingChats[activeChatId])) {
                            handleSendMessage(input.trim());
                            setInput('');
                          }
                        }}
                        disabled={!input.trim() || loadingChats[activeChatId]}
                        className={`px-6 py-2 rounded-lg font-semibold transition-all duration-300 flex items-center gap-2 border ${
                          input.trim() && !(loadingChats[activeChatId])
                            ? 'border-[#2C1A43]'
                            : 'border-white/5'
                        }`}
                        style={{
                          backgroundColor: input.trim() && !(loadingChats[activeChatId]) ? '#120C18' : '#0D0D0D'
                        }}
                      >
                        {loadingChats[activeChatId] ? (
                          <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <svg 
                            className="w-5 h-5" 
                            fill="none" 
                            stroke="currentColor" 
                            viewBox="0 0 24 24"
                            style={{ color: input.trim() && !(loadingChats[activeChatId]) ? '#C27AFF' : 'rgba(255, 255, 255, 0.3)' }}
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
                          </svg>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Example Stories */}
              <div className="w-full max-w-2xl space-y-3">
                <div 
                  onClick={() => setInput("Sebagai pengguna, saya ingin login menggunakan email dan password agar dapat mengakses dashboard aplikasi.")}
                  className="p-5 bg-[#09090A] border border-white/5 rounded-xl text-left hover:bg-[#0d0d0d] transition-all cursor-pointer"
                >
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-medium">Login Sistem</h3>
                    <span className="text-xs px-2.5 py-1 bg-[#120C18] border border-[#2C1A43] text-[#C27AFF] rounded-md">Authentication</span>
                  </div>
                  <p className={`text-sm text-gray-400 leading-relaxed ${isMobile ? 'line-clamp-2' : ''}`}>
                    Sebagai pengguna, saya ingin login menggunakan email dan password agar dapat mengakses dashboard aplikasi.
                  </p>
                </div>

                <div 
                  onClick={() => setInput("Sebagai pengguna, saya ingin mengedit profil saya (nama, email, foto) agar informasi akun saya selalu terkini.")}
                  className="p-5 bg-[#09090A] border border-white/5 rounded-xl text-left hover:bg-[#0d0d0d] transition-all cursor-pointer"
                >
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-medium">User Profile Management</h3>
                    <span className="text-xs px-2.5 py-1 bg-[#160D14] border border-[#44273D] text-[#FF7AD0] rounded-md">User Management</span>
                  </div>
                  <p className={`text-sm text-gray-400 leading-relaxed ${isMobile ? 'line-clamp-2' : ''}`}>
                    Sebagai pengguna, saya ingin mengedit profil saya (nama, email, foto) agar informasi akun saya selalu terkini.
                  </p>
                </div>

                <div 
                  onClick={() => setInput("Sebagai customer, saya ingin melihat katalog produk dengan filter kategori agar dapat menemukan produk yang saya butuhkan.")}
                  className="p-5 bg-[#09090A] border border-white/5 rounded-xl text-left hover:bg-[#0d0d0d] transition-all cursor-pointer"
                >
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-medium">Product Catalog</h3>
                    <span className="text-xs px-2.5 py-1 bg-[#120C18] border border-[#2C1A43] text-[#C27AFF] rounded-md">E-Commerce</span>
                  </div>
                  <p className={`text-sm text-gray-400 leading-relaxed ${isMobile ? 'line-clamp-2' : ''}`}>
                    Sebagai customer, saya ingin melihat katalog produk dengan filter kategori agar dapat menemukan produk yang saya butuhkan.
                  </p>
                </div>
              </div>
            </div>
          ) : (
            // Messages - Clean & Spacious
            <div className="max-w-4xl mx-auto px-6 py-8">
              <div className="space-y-8">
                {displayedMessages.map((message, index) => (
                  <ChatBubble 
                    key={`${message.id || index}-${meteorPanelRefresh}`} 
                    message={message} 
                    activeChatId={activeChatId}
                  />
                ))}
                {isChatLoading(activeChatId) && <TypingIndicator />}
                <div ref={messagesEndRef} />
              </div>
            </div>
          )}
        </div>

        {/* Chat Input - Bottom (only show when there are messages) - Same as condition 1 but shorter */}
        {allMessages.length > 0 && (
          <div>
            <div className="max-w-4xl mx-auto px-6 py-3">
              <div className="backdrop-blur-lg rounded-2xl border p-5 shadow-2xl" style={{ backgroundColor: '#09090A', borderColor: 'rgba(255, 255, 255, 0.05)' }}>
                <textarea
                  value={inputBottom}
                  onChange={(e) => setInputBottom(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      if (inputBottom.trim() && !(loadingChats[activeChatId])) {
                        handleSendMessage(inputBottom.trim());
                        setInputBottom('');
                      }
                    }
                  }}
                  onFocus={() => {
                    console.log('🎯 [INPUT-FOCUS] Bottom input focused:', {
                      activeChatId,
                      loadingChats,
                      isDisabled: loadingChats[activeChatId],
                      allLoadingChats: JSON.stringify(loadingChats)
                    });
                  }}
                  placeholder="Masukkan user story Anda..."
                  className="w-full bg-transparent text-white placeholder-gray-500 resize-none outline-none min-h-[40px] text-base focus:outline-none"
                  disabled={loadingChats[activeChatId]}
                />
                
                <div className="flex items-center justify-between mt-4 flex-wrap gap-4">
                  <div className="flex items-center gap-4 flex-wrap">
                    <button
                      onClick={() => setShowFormatGuide(!showFormatGuide)}
                      className="flex items-center gap-2 px-4 py-2 rounded-lg transition-colors text-sm border"
                      style={{ backgroundColor: '#09090A', borderColor: 'rgba(255, 255, 255, 0.05)' }}
                      title={isMobile ? "Format Guide" : undefined}
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                      </svg>
                      {!isMobile && "Format Guide"}
                    </button>
                    
                    <button
                      onClick={() => {
                        setInputBottom("As a [role], I want [feature], so that [benefit]");
                        setShowFormatGuide(false);
                      }}
                      className="flex items-center gap-2 px-4 py-2 rounded-lg transition-colors text-sm border"
                      style={{ backgroundColor: '#09090A', borderColor: 'rgba(255, 255, 255, 0.05)' }}
                      title={isMobile ? "Use Format" : undefined}
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                      </svg>
                      {!isMobile && "Use Format"}
                    </button>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="relative">
                      <button
                        onClick={() => setShowAIDropdown(!showAIDropdown)}
                        className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm border transition-colors hover:border-white/10"
                        style={{ backgroundColor: '#09090A', borderColor: 'rgba(255, 255, 255, 0.05)' }}
                        title={isMobile ? llmInfo.shortName : undefined}
                      >
                        <div className="w-5 h-5 rounded bg-transparent flex items-center justify-center text-[10px] font-bold">
                          {llmInfo.icon}
                        </div>
                        {!isMobile && <span className="text-gray-300">{llmInfo.shortName}</span>}
                        <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>

                      {/* Dropdown Menu */}
                      {showAIDropdown && (
                        <div 
                          className="absolute bottom-full mb-2 right-0 rounded-lg border shadow-xl z-50 min-w-[250px]"
                          style={{ backgroundColor: '#09090A', borderColor: 'rgba(255, 255, 255, 0.05)' }}
                        >
                          {availableModels.length > 1 ? (
                            <div className="py-2">
                              {availableModels.map((model) => (
                                <button
                                  key={model.id}
                                  className="w-full px-4 py-3 text-left hover:bg-white/5 transition-colors flex items-start gap-3"
                                  onClick={() => {
                                    // TODO: Implement model switching
                                    toast.success(`Switched to ${model.name}`);
                                    setShowAIDropdown(false);
                                  }}
                                >
                                  <div className="text-lg">{llmInfo.icon}</div>
                                  <div className="flex-1">
                                    <div className="text-sm font-medium text-white">{model.name}</div>
                                    <div className="text-xs text-gray-400 mt-1">{model.description}</div>
                                  </div>
                                  {model.isDefault && (
                                    <div className="text-xs px-2 py-1 rounded" style={{ backgroundColor: '#120C18', color: '#C27AFF' }}>
                                      Active
                                    </div>
                                  )}
                                </button>
                              ))}
                            </div>
                          ) : (
                            <div className="px-4 py-3 text-sm text-gray-400">
                              Belum ada model lain yang tersedia
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                    
                    <button
                      onClick={() => {
                        if (inputBottom.trim() && !(loadingChats[activeChatId])) {
                          handleSendMessage(inputBottom.trim());
                          setInputBottom('');
                        }
                      }}
                      disabled={!inputBottom.trim() || loadingChats[activeChatId]}
                      className={`px-6 py-2 rounded-lg font-semibold transition-all duration-300 flex items-center gap-2 border ${
                        inputBottom.trim() && !(loadingChats[activeChatId])
                          ? 'border-[#2C1A43]'
                          : 'border-white/5'
                      }`}
                      style={{
                        backgroundColor: inputBottom.trim() && !(loadingChats[activeChatId]) ? '#120C18' : '#0D0D0D'
                      }}
                    >
                      {loadingChats[activeChatId] ? (
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <svg 
                          className="w-5 h-5" 
                          fill="none" 
                          stroke="currentColor" 
                          viewBox="0 0 24 24"
                          style={{ color: inputBottom.trim() && !(loadingChats[activeChatId]) ? '#C27AFF' : 'rgba(255, 255, 255, 0.3)' }}
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
                        </svg>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* RIGHT PANEL - METEOR Testing (Responsive) */}
      <MinimizableTestingPanel
        activeChatId={activeChatId}
        chatMessages={allMessages}
        isOpen={isTestingScenarioPanelOpen}
        onToggle={() => setIsTestingScenarioPanelOpen(!isTestingScenarioPanelOpen)}
      />

      {/* MODALS */}
      <FormatGuide
        isVisible={showFormatGuide}
        onClose={() => setShowFormatGuide(false)}
        onInsertTemplate={(template) => {
          if (template) {
            setInput(template);
          } else {
            setInput("As a [role], I want [feature], so that [benefit]");
          }
          setShowFormatGuide(false);
        }}
      />

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

      <ReferenceLibraryWithAutoSettings
        isOpen={isReferenceLibraryOpen}
        onClose={() => setIsReferenceLibraryOpen(false)}
      />

      <DeleteConfirmationModal
        isOpen={isDeleteModalOpen}
        onClose={() => {
          setIsDeleteModalOpen(false);
          setChatToDelete(null);
        }}
        onConfirm={confirmDeleteChat}
        title="Hapus chat"
        message="Apakah Anda yakin ingin menghapus chat ini? Semua pesan dan riwayat percakapan akan dihapus secara permanen."
        itemName={chatToDelete?.title}
        confirmText="Hapus"
        cancelText="Batal"
        isDangerous={true}
      />

      <ErrorBoundary fallbackMessage="Failed to load dual evaluation testing modal">
        <DualTestingModal
          isOpen={isDualModeTestModalOpen}
          onClose={() => {
            setIsDualModeTestModalOpen(false);
            setSelectedScenario(null);
            setSelectedScenarioIndex(null);
          }}
          scenarioText={selectedScenario?.text || ''}
          scenarioId={memoizedScenarioId}
          onSubmitTest={async (results) => {
            // Check if results are valid
            if (!results) {
              console.error('❌ [CHAT-REFINED] Test results are null or undefined');
              return;
            }
            
            console.log('✅ [CHAT-REFINED] Dual evaluation completed:', results);
            
            // Save test results
            if (selectedScenario && selectedScenarioIndex !== null) {
              // Use the chatId from the scenario for navigation
              const chatId = selectedScenario.chatId;
              // Use the messageId from the scenario for test result identification
              const messageId = selectedScenario.messageId;
              
              console.log('🔍 [CHAT-REFINED] Test completion data:', {
                messageId,
                chatId,
                scenarioIndex: selectedScenarioIndex,
                selectedScenario,
                meteorScore: results.meteor?.score,
                sentenceBertScore: results.sentence_bert?.score
              });
              
              if (!chatId || !messageId) {
                console.error('❌ [CHAT-REFINED] chatId or messageId is missing from selectedScenario:', selectedScenario);
                return;
              }
              
              // CRITICAL FIX: Save as ONE combined result instead of two separate saves
              // This prevents overwriting and ensures button updates correctly
              const combinedResult = {
                messageId: messageId,
                chatId: chatId,
                scenarioIndex: selectedScenarioIndex,
                timestamp: results.timestamp || new Date().toISOString(),
                generatedText: results.generatedText,
                referenceText: results.referenceText,
                // Include both test results in one object
                meteor: results.meteor || null,
                sentence_bert: results.sentence_bert || null,
                // Use METEOR score as primary score for sorting/filtering
                meteor_score: results.meteor?.score || 0,
                test_type: 'dual', // Mark as dual evaluation
                testType: 'dual'
              };
              
              console.log('💾 [CHAT-REFINED] Saving combined dual result:', combinedResult);
              await addTestResult(messageId, selectedScenarioIndex, combinedResult);
              
              // CRITICAL: Force immediate UI update for button state change
              // Use multiple strategies to ensure button updates
              
              // Strategy 1: Immediate event dispatch
              window.dispatchEvent(new CustomEvent('meteorTestCompleted', {
                detail: { messageId, scenarioIndex: selectedScenarioIndex }
              }));
              
              // Strategy 2: Force re-render with minimal delay
              setTimeout(() => {
                setMeteorPanelRefresh(prev => prev + 1);
                setSidebarForceUpdate(prev => prev + 1);
              }, 50); // Reduced from 200ms to 50ms
              
              // Strategy 3: Additional event after short delay to catch any missed updates
              setTimeout(() => {
                window.dispatchEvent(new CustomEvent('testResultsUpdated'));
              }, 100);
              
              // Close modal
              setIsDualModeTestModalOpen(false);
              setSelectedScenario(null);
              setSelectedScenarioIndex(null);
            } else {
              console.error('❌ [CHAT-REFINED] Cannot save test results - missing scenario or index:', {
                hasSelectedScenario: !!selectedScenario,
                selectedScenarioIndex
              });
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