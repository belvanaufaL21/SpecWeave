import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
  STORAGE_KEYS, 
  CHAT_EVENTS, 
  DEFAULTS 
} from '../../utils/constants/chatConstants';
import {
  generateUniqueChatTitle,
  createChatHistoryItem,
  generateUniqueId,
  isChatValid,
  safeJsonParse,
  safeJsonStringify
} from '../../utils/helpers/chatHelpers';

/**
 * Custom hook untuk mengelola state dan logic chat
 */
const useChatManagement = () => {
  const navigate = useNavigate();
  const location = useLocation();

  // State management
  const [chats, setChats] = useState({});
  const [history, setHistory] = useState([]);
  const [activeChatId, setActiveChatId] = useState(null);
  const [hasLoaded, setHasLoaded] = useState(false);

  /**
   * Load chat data dari localStorage
   */
  const loadChatData = useCallback(() => {
    if (hasLoaded) return;
    
    try {
      const savedChats = localStorage.getItem(STORAGE_KEYS.CHATS);
      const savedHistory = localStorage.getItem(STORAGE_KEYS.HISTORY);
      const savedActiveChatId = localStorage.getItem(STORAGE_KEYS.ACTIVE_CHAT_ID);

      const chatsData = safeJsonParse(savedChats, DEFAULTS.EMPTY_OBJECT);
      const historyData = safeJsonParse(savedHistory, DEFAULTS.EMPTY_ARRAY);

      setChats(chatsData);
      setHistory(historyData);
      
      // Set active chat hanya jika chat tersebut ada
      if (savedActiveChatId && chatsData[savedActiveChatId]) {
        setActiveChatId(savedActiveChatId);
      } else {
        setActiveChatId(null);
      }
      
      setHasLoaded(true);
    } catch (error) {
      console.error('Error loading chat data from localStorage:', error);
      setChats(DEFAULTS.EMPTY_OBJECT);
      setHistory(DEFAULTS.EMPTY_ARRAY);
      setHasLoaded(true);
    }
  }, [hasLoaded]);

  /**
   * Save chat data ke localStorage
   */
  const saveChatData = useCallback((chatsData, historyData, activeId) => {
    try {
      if (Object.keys(chatsData).length > 0) {
        const chatsJson = safeJsonStringify(chatsData);
        if (chatsJson) localStorage.setItem(STORAGE_KEYS.CHATS, chatsJson);
      }
      
      if (historyData.length > 0) {
        const historyJson = safeJsonStringify(historyData);
        if (historyJson) localStorage.setItem(STORAGE_KEYS.HISTORY, historyJson);
      }
      
      if (activeId) {
        localStorage.setItem(STORAGE_KEYS.ACTIVE_CHAT_ID, activeId);
      } else {
        localStorage.removeItem(STORAGE_KEYS.ACTIVE_CHAT_ID);
      }
      
      // Dispatch event untuk notify komponen lain
      window.dispatchEvent(new CustomEvent(CHAT_EVENTS.HISTORY_UPDATED));
    } catch (error) {
      console.error('Error saving chat data to localStorage:', error);
    }
  }, []);

  /**
   * Buat chat baru
   */
  const createNewChat = useCallback(() => {
    const newChatId = generateUniqueId();
    const newTitle = generateUniqueChatTitle(history);
    const newHistoryItem = createChatHistoryItem(newChatId, newTitle);
    
    const updatedHistory = [newHistoryItem, ...history];
    setHistory(updatedHistory);
    setActiveChatId(newChatId);
    
    saveChatData(chats, updatedHistory, newChatId);
    
    return newChatId;
  }, [history, chats, saveChatData]);

  /**
   * Pilih chat yang sudah ada
   */
  const selectChat = useCallback((chatId) => {
    const stringId = chatId.toString();
    setActiveChatId(stringId);
    saveChatData(chats, history, stringId);
  }, [chats, history, saveChatData]);

  /**
   * Hapus chat
   */
  const deleteChat = useCallback((chatId) => {
    const targetId = chatId || activeChatId;
    if (!targetId) return;

    const updatedHistory = history.filter(h => h.id.toString() !== targetId.toString());
    const updatedChats = { ...chats };
    delete updatedChats[targetId];

    setHistory(updatedHistory);
    setChats(updatedChats);

    if (activeChatId === targetId) {
      setActiveChatId(null);
      saveChatData(updatedChats, updatedHistory, null);
    } else {
      saveChatData(updatedChats, updatedHistory, activeChatId);
    }
  }, [activeChatId, history, chats, saveChatData]);

  /**
   * Update pesan dalam chat
   */
  const updateChatMessages = useCallback((chatId, messages) => {
    const updatedChats = {
      ...chats,
      [chatId]: messages
    };
    setChats(updatedChats);
    saveChatData(updatedChats, history, activeChatId);
  }, [chats, history, activeChatId, saveChatData]);

  /**
   * Handle URL parameter untuk load chat tertentu
   */
  const handleUrlChatLoad = useCallback(() => {
    if (!hasLoaded) return;
    
    const urlParams = new URLSearchParams(location.search);
    const chatIdFromUrl = urlParams.get('id');
    
    if (chatIdFromUrl) {
      const chatExists = isChatValid(chatIdFromUrl, chats, history);
      
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

  /**
   * Clear semua chat
   */
  const clearAllChats = useCallback(() => {
    setChats(DEFAULTS.EMPTY_OBJECT);
    setHistory(DEFAULTS.EMPTY_ARRAY);
    setActiveChatId(null);
    
    localStorage.removeItem(STORAGE_KEYS.CHATS);
    localStorage.removeItem(STORAGE_KEYS.HISTORY);
    localStorage.removeItem(STORAGE_KEYS.ACTIVE_CHAT_ID);
    
    window.dispatchEvent(new CustomEvent(CHAT_EVENTS.HISTORY_UPDATED));
  }, []);

  // Load data saat mount
  useEffect(() => {
    loadChatData();
  }, [loadChatData]);

  // Handle URL changes
  useEffect(() => {
    handleUrlChatLoad();
  }, [handleUrlChatLoad]);

  return {
    // State
    chats,
    history,
    activeChatId,
    hasLoaded,
    
    // Actions
    createNewChat,
    selectChat,
    deleteChat,
    updateChatMessages,
    clearAllChats
  };
};

export default useChatManagement;