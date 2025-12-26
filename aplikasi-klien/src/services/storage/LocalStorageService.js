import { 
  STORAGE_KEYS, 
  CHAT_EVENTS 
} from '../../utils/constants/chatConstants';
import { 
  safeJsonParse, 
  safeJsonStringify 
} from '../../utils/helpers/chatHelpers';

/**
 * Service untuk mengelola localStorage operations
 */
class LocalStorageService {
  /**
   * Get item dari localStorage dengan safe parsing
   * @param {string} key - Storage key
   * @param {*} fallback - Fallback value jika tidak ada atau error
   * @returns {*} - Parsed value atau fallback
   */
  static getItem(key, fallback = null) {
    try {
      const item = localStorage.getItem(key);
      return safeJsonParse(item, fallback);
    } catch (error) {
      console.error(`Error getting item from localStorage (${key}):`, error);
      return fallback;
    }
  }

  /**
   * Set item ke localStorage dengan safe stringify
   * @param {string} key - Storage key
   * @param {*} value - Value yang akan disimpan
   * @returns {boolean} - Success status
   */
  static setItem(key, value) {
    try {
      const jsonString = safeJsonStringify(value);
      if (jsonString !== null) {
        localStorage.setItem(key, jsonString);
        return true;
      }
      return false;
    } catch (error) {
      console.error(`Error setting item to localStorage (${key}):`, error);
      return false;
    }
  }

  /**
   * Remove item dari localStorage
   * @param {string} key - Storage key
   * @returns {boolean} - Success status
   */
  static removeItem(key) {
    try {
      localStorage.removeItem(key);
      return true;
    } catch (error) {
      console.error(`Error removing item from localStorage (${key}):`, error);
      return false;
    }
  }

  /**
   * Clear semua items dari localStorage
   * @returns {boolean} - Success status
   */
  static clear() {
    try {
      localStorage.clear();
      return true;
    } catch (error) {
      console.error('Error clearing localStorage:', error);
      return false;
    }
  }

  /**
   * Dispatch custom event untuk notify komponen lain
   * @param {string} eventName - Nama event
   * @param {*} detail - Detail data untuk event
   */
  static dispatchEvent(eventName, detail = null) {
    try {
      const event = detail 
        ? new CustomEvent(eventName, { detail })
        : new CustomEvent(eventName);
      window.dispatchEvent(event);
    } catch (error) {
      console.error(`Error dispatching event (${eventName}):`, error);
    }
  }

  // Chat-specific methods
  
  /**
   * Get chat data dari localStorage
   * @returns {Object} - Object berisi chats, history, dan activeChatId
   */
  static getChatData() {
    return {
      chats: this.getItem(STORAGE_KEYS.CHATS, {}),
      history: this.getItem(STORAGE_KEYS.HISTORY, []),
      activeChatId: localStorage.getItem(STORAGE_KEYS.ACTIVE_CHAT_ID)
    };
  }

  /**
   * Save chat data ke localStorage
   * @param {Object} chats - Chat messages data
   * @param {Array} history - Chat history data
   * @param {string|null} activeChatId - Active chat ID
   * @returns {boolean} - Success status
   */
  static saveChatData(chats, history, activeChatId) {
    try {
      let success = true;

      // Save chats jika tidak kosong
      if (Object.keys(chats).length > 0) {
        success = success && this.setItem(STORAGE_KEYS.CHATS, chats);
      }

      // Save history jika tidak kosong
      if (history.length > 0) {
        success = success && this.setItem(STORAGE_KEYS.HISTORY, history);
      }

      // Save atau remove active chat ID
      if (activeChatId) {
        localStorage.setItem(STORAGE_KEYS.ACTIVE_CHAT_ID, activeChatId);
      } else {
        this.removeItem(STORAGE_KEYS.ACTIVE_CHAT_ID);
      }

      // Dispatch update event
      if (success) {
        this.dispatchEvent(CHAT_EVENTS.HISTORY_UPDATED);
      }

      return success;
    } catch (error) {
      console.error('Error saving chat data:', error);
      return false;
    }
  }

  /**
   * Clear semua chat data
   * @returns {boolean} - Success status
   */
  static clearChatData() {
    try {
      const success = (
        this.removeItem(STORAGE_KEYS.CHATS) &&
        this.removeItem(STORAGE_KEYS.HISTORY) &&
        this.removeItem(STORAGE_KEYS.ACTIVE_CHAT_ID)
      );

      if (success) {
        this.dispatchEvent(CHAT_EVENTS.HISTORY_UPDATED);
      }

      return success;
    } catch (error) {
      console.error('Error clearing chat data:', error);
      return false;
    }
  }
}

export default LocalStorageService;