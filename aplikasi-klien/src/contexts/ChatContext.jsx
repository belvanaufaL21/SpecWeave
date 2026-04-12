import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import UserDataService from '../services/UserDataService';
import { generateUniqueId, generateUniqueChatTitle, createChatHistoryItem } from '../utils/helpers/chatHelpers';

const ChatContext = createContext();

export const useChat = () => {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error('useChat must be used within a ChatProvider');
  }
  return context;
};

export const ChatProvider = ({ children }) => {
  const [chats, setChats] = useState({});
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(null);
  
  // CRITICAL FIX: Use ref to store latest chats state to avoid stale closure
  const chatsRef = useRef(chats);
  
  // Update ref whenever chats changes
  useEffect(() => {
    chatsRef.current = chats;
  }, [chats]);

  // Load initial chat data
  const loadChatData = useCallback(async (force = false) => {
    try {
      if (!force) setLoading(true);

      const result = await UserDataService.getChatSessions();
      
      if (result.success) {
        const chatsData = {};
        const historyData = [];
        
        // Convert database format to app format
        result.data.forEach(session => {
          chatsData[session.chat_id] = session.messages || [];
          historyData.push({
            id: session.chat_id,
            title: session.title || generateUniqueChatTitle(historyData),
            timestamp: session.last_message_at || session.created_at,
            messageCount: (session.messages || []).length
          });
        });
        
        // Sort history by timestamp (newest first)
        historyData.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        
        setChats(chatsData);
        setHistory(historyData);
        setLastUpdated(new Date());

      } else {
        console.error('❌ [CHAT-CONTEXT] Failed to load chat data:', result.error);
      }
    } catch (error) {
      console.error('❌ [CHAT-CONTEXT] Error loading chat data:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    loadChatData();
  }, [loadChatData]);

  // Create new chat
  const createNewChat = useCallback(async () => {
    try {
      const newChatId = generateUniqueId();
      const newTitle = generateUniqueChatTitle(history);
      const newHistoryItem = createChatHistoryItem(newChatId, newTitle);
      
      console.log('🆕 [CHAT-CONTEXT] Creating new chat:', { newChatId, newTitle });
      
      // Create empty chat session in database
      const sessionData = {
        title: newTitle,
        messages: [],
        metadata: {
          createdAt: new Date().toISOString(),
          createdFrom: 'chat_context'
        }
      };
      
      const result = await UserDataService.saveChatSession(newChatId, sessionData);
      
      if (result.success) {
        // Update local state
        const updatedHistory = [newHistoryItem, ...history];
        setHistory(updatedHistory);
        setChats(prev => ({
          ...prev,
          [newChatId]: []
        }));
        setLastUpdated(new Date());

        return { success: true, chatId: newChatId, title: newTitle };
      } else {
        throw new Error(result.error || 'Failed to create chat');
      }
    } catch (error) {
      console.error('❌ [CHAT-CONTEXT] Error creating new chat:', error);
      return { success: false, error: error.message };
    }
  }, [history]);

  // Update chat messages
  const updateChatMessages = useCallback(async (chatId, messagesOrUpdater) => {
    try {
      // CRITICAL FIX: Use ref to get latest state, not closure
      const currentMessages = chatsRef.current[chatId] || [];
      
      // Support both direct messages array and updater function
      const messages = typeof messagesOrUpdater === 'function' 
        ? messagesOrUpdater(currentMessages)
        : messagesOrUpdater;
      
      console.log('💬 [CHAT-CONTEXT] Updating chat messages:', {
        chatId,
        currentCount: currentMessages.length,
        newCount: messages.length,
        messages: messages.map(m => ({ id: m.id, role: m.role, content: m.content?.substring(0, 30) }))
      });
      
      // Check if this is actually a new message or just loading existing messages
      const hasNewMessages = messages.length > currentMessages.length;
      
      console.log('📊 [CHAT-CONTEXT] Message comparison:', {
        chatId,
        currentCount: currentMessages.length,
        newCount: messages.length,
        hasNewMessages
      });
      
      // CRITICAL FIX: Use Promise to ensure state update completes before resolving
      await new Promise((resolve) => {
        setChats(prev => {
          const updated = {
            ...prev,
            [chatId]: messages
          };
          console.log('✅ [CHAT-CONTEXT] State updated for chat:', {
            chatId,
            messageCount: updated[chatId].length,
            allChats: Object.keys(updated)
          });
          // Resolve after state update is queued
          setTimeout(resolve, 0);
          return updated;
        });
      });
      
      // Only update timestamp if there are new messages
      await new Promise((resolve) => {
        setHistory(prev => {
          const updated = prev.map(chat => 
            chat.id === chatId 
              ? { 
                  ...chat, 
                  timestamp: hasNewMessages ? new Date().toISOString() : chat.timestamp,
                  messageCount: messages.length
                }
              : chat
          );
          setTimeout(resolve, 0);
          return updated;
        });
      });
      
      setLastUpdated(new Date());
      
      console.log('💾 [CHAT-CONTEXT] Saving to database:', chatId);
      
      // Save to database asynchronously in background (don't block UI)
      // Don't await this - let it run in background
      const historyItem = history.find(h => h.id === chatId);
      const sessionData = {
        title: historyItem?.title || generateUniqueChatTitle(history),
        messages: messages,
        metadata: {
          lastUpdated: new Date().toISOString()
        }
      };
      
      // Fire and forget - save in background
      UserDataService.saveChatSession(chatId, sessionData, {
        updateTimestamp: hasNewMessages
      }).then(result => {
        if (result.success) {
          console.log('✅ [CHAT-CONTEXT] Messages saved to database for chat:', chatId);
        } else {
          console.error('❌ [CHAT-CONTEXT] Failed to save chat messages:', result.error);
        }
      }).catch(error => {
        console.error('❌ [CHAT-CONTEXT] Error saving to database:', error);
      });
      
      // Return immediately after state update, don't wait for database
      return { success: true };
    } catch (error) {
      console.error('❌ [CHAT-CONTEXT] Error updating chat messages:', error);
      return { success: false, error: error.message };
    }
  }, [history]); // Remove chats from dependencies, use ref instead

  // Rename chat
  const renameChat = useCallback(async (chatId, newTitle) => {
    try {
      if (!newTitle.trim()) return { success: false, error: 'Title cannot be empty' };
      
      console.log('✏️ [CHAT-CONTEXT] Renaming chat:', chatId, 'to:', newTitle.trim());
      
      // Update database first
      const currentChat = chats[chatId];
      if (currentChat) {
        const sessionData = {
          title: newTitle.trim(),
          messages: currentChat || [],
          metadata: {
            lastUpdated: new Date().toISOString(),
            renamed: true
          }
        };
        
        const result = await UserDataService.saveChatSession(chatId, sessionData, {
          updateTimestamp: false // Don't update timestamp when just renaming
        });
        
        if (result.success) {
          // Update local state
          setHistory(prev => 
            prev.map(chat => 
              chat.id.toString() === chatId.toString() 
                ? { ...chat, title: newTitle.trim() }
                : chat
            )
          );
          setLastUpdated(new Date());

          return { success: true };
        } else {
          throw new Error(result.error || 'Failed to rename chat');
        }
      }
      
      return { success: false, error: 'Chat not found' };
    } catch (error) {
      console.error('❌ [CHAT-CONTEXT] Error renaming chat:', error);
      return { success: false, error: error.message };
    }
  }, [chats]);

  // Delete chat
  const deleteChat = useCallback(async (chatId) => {
    try {
      console.log('🗑️ [CHAT-CONTEXT] Deleting chat:', chatId);
      
      // Delete from database first
      const result = await UserDataService.deleteChatSession(chatId);
      
      if (result.success) {
        // Update local state
        setHistory(prev => prev.filter(chat => chat.id.toString() !== chatId.toString()));
        setChats(prev => {
          const newChats = { ...prev };
          delete newChats[chatId];
          return newChats;
        });
        setLastUpdated(new Date());

        return { success: true };
      } else {
        throw new Error(result.error || 'Failed to delete chat');
      }
    } catch (error) {
      console.error('❌ [CHAT-CONTEXT] Error deleting chat:', error);
      return { success: false, error: error.message };
    }
  }, []);

  // Get chat messages
  const getChatMessages = useCallback((chatId) => {
    return chats[chatId] || [];
  }, [chats]);

  // Get recent chats (for dashboard)
  const getRecentChats = useCallback((limit = 10) => {
    return history
      .slice(0, limit)
      .map(chat => ({
        ...chat,
        messages: chats[chat.id] || [],
        messageCount: (chats[chat.id] || []).length
      }));
  }, [history, chats]);

  // Refresh data (for manual refresh)
  const refreshChatData = useCallback(() => {
    return loadChatData(true);
  }, [loadChatData]);

  const value = {
    // State
    chats,
    history,
    loading,
    lastUpdated,
    
    // Actions
    createNewChat,
    updateChatMessages,
    renameChat,
    deleteChat,
    getChatMessages,
    getRecentChats,
    refreshChatData,
    
    // Utilities
    loadChatData
  };

  return (
    <ChatContext.Provider value={value}>
      {children}
    </ChatContext.Provider>
  );
};