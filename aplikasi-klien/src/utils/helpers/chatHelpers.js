import { CHAT_PATTERNS } from '../constants/chatConstants';

/**
 * Generate unique chat title berdasarkan history yang ada
 * @param {Array} existingHistory - Array history chat yang sudah ada
 * @returns {string} - Title chat yang unik
 */
export const generateUniqueChatTitle = (existingHistory = []) => {
  const existingNumbers = existingHistory.map(chat => {
    const match = chat.title.match(CHAT_PATTERNS.TITLE_REGEX);
    return match ? parseInt(match[1], 10) : 0;
  });
  
  const maxNumber = existingNumbers.length > 0 ? Math.max(...existingNumbers) : 0;
  return `${CHAT_PATTERNS.TITLE_PREFIX}${maxNumber + 1}`;
};

/**
 * Create new chat history item
 * @param {string} chatId - ID chat
 * @param {string} title - Title chat
 * @returns {Object} - History item object
 */
export const createChatHistoryItem = (chatId, title) => ({
  id: chatId,
  title,
  date: 'Just now',
  timestamp: new Date().toISOString()
});

/**
 * Create new message object
 * @param {string} content - Isi pesan
 * @param {string} role - Role pengirim (user/assistant)
 * @returns {Object} - Message object
 */
export const createMessage = (content, role = 'user') => ({
  id: Date.now().toString(),
  role,
  content,
  createdAt: new Date()
});

/**
 * Generate unique ID untuk chat atau message
 * @returns {string} - Unique ID
 */
export const generateUniqueId = () => Date.now().toString();

/**
 * Check apakah chat ID valid dan ada dalam chats
 * @param {string} chatId - ID chat yang akan dicek
 * @param {Object} chats - Object berisi semua chat
 * @param {Array} history - Array history chat
 * @returns {boolean} - True jika chat valid
 */
export const isChatValid = (chatId, chats, history) => {
  if (!chatId) return false;
  return chats[chatId] && history.some(h => h.id.toString() === chatId.toString());
};

/**
 * Filter messages baru dari hook yang belum ada di local state
 * @param {Array} hookMessages - Messages dari hook
 * @param {Array} localMessages - Messages dari local state
 * @returns {Array} - Array messages baru
 */
export const getNewMessages = (hookMessages = [], localMessages = []) => {
  return hookMessages.filter(hookMsg => 
    !localMessages.some(localMsg => localMsg.id === hookMsg.id)
  );
};

/**
 * Safe JSON parse dengan fallback
 * @param {string} jsonString - String JSON yang akan di-parse
 * @param {*} fallback - Fallback value jika parsing gagal
 * @returns {*} - Parsed object atau fallback
 */
export const safeJsonParse = (jsonString, fallback = null) => {
  try {
    return jsonString ? JSON.parse(jsonString) : fallback;
  } catch (error) {
    console.error('Error parsing JSON:', error);
    return fallback;
  }
};

/**
 * Safe JSON stringify
 * @param {*} data - Data yang akan di-stringify
 * @returns {string|null} - JSON string atau null jika gagal
 */
export const safeJsonStringify = (data) => {
  try {
    return JSON.stringify(data);
  } catch (error) {
    console.error('Error stringifying JSON:', error);
    return null;
  }
};