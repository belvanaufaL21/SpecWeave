/**
 * Legacy Simple Chat Isolation Service - Re-export Pattern
 * 
 * This file maintains backward compatibility while using the new clean architecture.
 * All functionality has been moved to the new modular ChatIsolationService.
 * 
 * @deprecated Use ChatIsolationService from './chat/ChatIsolationService.js' instead
 */

import { ChatIsolationService } from './chat/ChatIsolationService.js';

// Create service instance
const chatIsolationService = new ChatIsolationService();

/**
 * Simple Chat Isolation Class for backward compatibility
 * @deprecated Use ChatIsolationService instead
 */
class SimpleChatIsolation {
  constructor() {
    this.service = chatIsolationService;
  }

  /**
   * Get current chat ID
   * @returns {string} Chat ID
   */
  getCurrentChatId() {
    return this.service.getCurrentChatId();
  }

  /**
   * Force new chat session
   * @returns {string} New chat ID
   */
  forceNewChatSession() {
    return this.service.forceNewChatSession();
  }

  /**
   * Set active project for current chat
   * @param {string} projectId - Project ID
   * @returns {Object} Operation result
   */
  setActiveProject(projectId) {
    return this.service.setActiveProject(projectId);
  }

  /**
   * Get active project for current chat
   * @returns {string|null} Project ID
   */
  getActiveProject() {
    return this.service.getActiveProject();
  }

  /**
   * Set Epic context for current chat
   * @param {string} epicId - Epic ID
   * @param {Object} epicData - Epic data
   * @returns {Object} Operation result
   */
  setEpicContext(epicId, epicData) {
    return this.service.setEpicContext(epicId, epicData);
  }

  /**
   * Get Epic context for current chat
   * @returns {Object|null} Epic context
   */
  getEpicContext() {
    return this.service.getEpicContext();
  }

  /**
   * Get all data for debugging
   * @returns {Object} All isolation data
   */
  getAllData() {
    return this.service.getAllData();
  }

  /**
   * Clear all data
   * @returns {Object} Operation result
   */
  clearAllData() {
    return this.service.clearAllData();
  }

  /**
   * Test isolation with dummy data
   * @returns {Object} Test results
   */
  testIsolation() {
    return this.service.testIsolation();
  }
}

// Create singleton instance for backward compatibility
export const simpleChatIsolation = new SimpleChatIsolation();

// Make available globally for debugging
if (typeof window !== 'undefined') {
  window.simpleChatIsolation = simpleChatIsolation;
  console.log('🔧 [SIMPLE-ISOLATION] Legacy service available as window.simpleChatIsolation');
}

export default simpleChatIsolation;