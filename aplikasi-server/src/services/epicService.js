import supabaseService from './supabaseService.js';

/**
 * Epic Service for managing Epic context and session state
 * Handles Epic selection, validation, and context management
 */
class EpicService {
  constructor() {
    // In-memory storage for Epic contexts (in production, use Redis)
    this.epicContexts = new Map();
  }

  // =====================================================
  // Epic Context Management
  // =====================================================

  /**
   * Set Epic context for a user session
   * @param {string} userId - User ID
   * @param {string|null} epicId - Epic ID (null when working without Epic)
   * @param {Object} epicData - Epic data to store (can contain workWithoutEpic flag)
   * @returns {Promise<Object>} Success result
   */
  async setEpicContext(userId, epicId, epicData) {
    try {
      // Ensure Epic has name field if it exists
      if (epicData && epicData.epic && !epicData.workWithoutEpic) {
        // If Epic doesn't have name, use summary or key as fallback
        if (!epicData.epic.name) {
          epicData.epic.name = epicData.epic.summary || epicData.epic.key || 'Unknown Epic';
          console.log(`🔧 [EPIC-SERVICE] Added missing name field: "${epicData.epic.name}"`);
        }
        
        // Also ensure summary exists
        if (!epicData.epic.summary) {
          epicData.epic.summary = epicData.epic.name || epicData.epic.key || 'No summary';
        }
        
        console.log(`✅ [EPIC-SERVICE] Epic data validated:`, {
          id: epicData.epic.id,
          key: epicData.epic.key,
          name: epicData.epic.name,
          summary: epicData.epic.summary
        });
      }
      
      const contextKey = `${userId}:epic_context`;
      const context = {
        epicId,
        epicData,
        userId,
        timestamp: Date.now(),
        expiresAt: Date.now() + (24 * 60 * 60 * 1000) // 24 hours
      };

      // Store in memory (in production, use Redis with TTL)
      this.epicContexts.set(contextKey, context);

      // Also store in database for persistence
      await this.storeEpicContextInDB(userId, context);

      return {
        success: true,
        data: context
      };
    } catch (error) {
      console.error('Error setting Epic context:', error);
      throw new Error(`Failed to set Epic context: ${error.message}`);
    }
  }

  /**
   * Get Epic context for a user
   * @param {string} userId - User ID
   * @returns {Promise<Object>} Epic context
   */
  async getEpicContext(userId) {
    try {
      const contextKey = `${userId}:epic_context`;
      
      // Try to get from memory first
      let context = this.epicContexts.get(contextKey);
      
      // If not in memory, try to get from database
      if (!context) {
        context = await this.getEpicContextFromDB(userId);
        if (context) {
          this.epicContexts.set(contextKey, context);
        }
      }

      // Check if context is expired
      if (context && context.expiresAt < Date.now()) {
        await this.clearEpicContext(userId);
        return { success: true, data: null };
      }

      return {
        success: true,
        data: context
      };
    } catch (error) {
      console.error('Error getting Epic context:', error);
      throw new Error(`Failed to get Epic context: ${error.message}`);
    }
  }

  /**
   * Clear Epic context for a user
   * @param {string} userId - User ID
   * @returns {Promise<Object>} Success result
   */
  async clearEpicContext(userId) {
    try {
      const contextKey = `${userId}:epic_context`;
      
      // Remove from memory
      this.epicContexts.delete(contextKey);
      
      // Remove from database
      await this.clearEpicContextFromDB(userId);

      return { success: true };
    } catch (error) {
      console.error('Error clearing Epic context:', error);
      throw new Error(`Failed to clear Epic context: ${error.message}`);
    }
  }

  /**
   * Validate Epic context exists and is valid
   * @param {string} userId - User ID
   * @returns {Promise<boolean>} Validation result
   */
  async validateEpicContext(userId) {
    try {
      const result = await this.getEpicContext(userId);
      return result.success && result.data !== null;
    } catch (error) {
      console.error('Error validating Epic context:', error);
      return false;
    }
  }

  // =====================================================
  // Database Operations
  // =====================================================

  /**
   * Store Epic context in database for persistence
   * @param {string} userId - User ID
   * @param {Object} context - Epic context data
   * @returns {Promise<void>}
   */
  async storeEpicContextInDB(userId, context) {
    try {
      // Use user preferences table to store Epic context
      const preferences = {
        epic_context: {
          epicId: context.epicId,
          epicData: context.epicData,
          timestamp: context.timestamp,
          expiresAt: context.expiresAt
        }
      };

      // Get existing user profile
      const existingProfile = await supabaseService.getUserProfile(userId);
      
      if (existingProfile) {
        // Update existing preferences
        const updatedPreferences = {
          ...existingProfile.preferences,
          ...preferences
        };
        
        await supabaseService.updateUserProfile(userId, {
          preferences: updatedPreferences
        });
      } else {
        // Create new profile with preferences
        await supabaseService.createUserProfile(userId, {
          preferences
        });
      }
    } catch (error) {
      console.error('Error storing Epic context in DB:', error);
      // Don't throw error here as it's not critical
    }
  }

  /**
   * Get Epic context from database
   * @param {string} userId - User ID
   * @returns {Promise<Object|null>} Epic context or null
   */
  async getEpicContextFromDB(userId) {
    try {
      const profile = await supabaseService.getUserProfile(userId);
      
      if (profile && profile.preferences && profile.preferences.epic_context) {
        const context = profile.preferences.epic_context;
        
        // Check if context is expired
        if (context.expiresAt && context.expiresAt < Date.now()) {
          await this.clearEpicContextFromDB(userId);
          return null;
        }
        
        // Ensure Epic has name field if it exists (for backward compatibility)
        if (context.epicData && context.epicData.epic && !context.epicData.workWithoutEpic) {
          if (!context.epicData.epic.name) {
            context.epicData.epic.name = context.epicData.epic.summary || context.epicData.epic.key || 'Unknown Epic';
            console.log(`🔧 [EPIC-SERVICE] Fixed missing name field from DB: "${context.epicData.epic.name}"`);
          }
          
          if (!context.epicData.epic.summary) {
            context.epicData.epic.summary = context.epicData.epic.name || context.epicData.epic.key || 'No summary';
          }
        }
        
        return context;
      }
      
      return null;
    } catch (error) {
      console.error('Error getting Epic context from DB:', error);
      return null;
    }
  }

  /**
   * Clear Epic context from database
   * @param {string} userId - User ID
   * @returns {Promise<void>}
   */
  async clearEpicContextFromDB(userId) {
    try {
      const profile = await supabaseService.getUserProfile(userId);
      
      if (profile && profile.preferences) {
        const updatedPreferences = { ...profile.preferences };
        delete updatedPreferences.epic_context;
        
        await supabaseService.updateUserProfile(userId, {
          preferences: updatedPreferences
        });
      }
    } catch (error) {
      console.error('Error clearing Epic context from DB:', error);
      // Don't throw error here as it's not critical
    }
  }

  // =====================================================
  // Epic Context Validation
  // =====================================================

  /**
   * Validate Epic context data structure
   * @param {Object} epicData - Epic data to validate
   * @returns {boolean} Validation result
   */
  validateEpicData(epicData) {
    if (!epicData || typeof epicData !== 'object') {
      return false;
    }

    const { epic, connection, workWithoutEpic } = epicData;

    // If working without Epic, only validate connection
    if (workWithoutEpic === true) {
      // Validate connection data
      if (!connection || !connection.id || !connection.project_key) {
        return false;
      }
      return true;
    }

    // Validate Epic data (when Epic is required)
    if (!epic || !epic.id || !epic.key || !epic.name) {
      return false;
    }

    // Validate connection data
    if (!connection || !connection.id || !connection.project_key) {
      return false;
    }

    return true;
  }

  /**
   * Get Epic context summary for logging/monitoring
   * @param {string} userId - User ID
   * @returns {Promise<Object>} Epic context summary
   */
  async getEpicContextSummary(userId) {
    try {
      const result = await this.getEpicContext(userId);
      
      if (!result.success || !result.data) {
        return {
          hasContext: false,
          epicId: null,
          epicKey: null,
          projectKey: null
        };
      }

      const { epicData } = result.data;
      
      return {
        hasContext: true,
        epicId: epicData?.epic?.id || null,
        epicKey: epicData?.epic?.key || null,
        epicName: epicData?.epic?.name || null,
        projectKey: epicData?.connection?.project_key || null,
        timestamp: result.data.timestamp
      };
    } catch (error) {
      console.error('Error getting Epic context summary:', error);
      return {
        hasContext: false,
        error: error.message
      };
    }
  }

  // =====================================================
  // Cleanup and Maintenance
  // =====================================================

  /**
   * Clean up expired Epic contexts
   * @returns {Promise<number>} Number of contexts cleaned up
   */
  async cleanupExpiredContexts() {
    try {
      let cleanedCount = 0;
      const now = Date.now();

      // Clean up memory contexts
      for (const [key, context] of this.epicContexts.entries()) {
        if (context.expiresAt < now) {
          this.epicContexts.delete(key);
          cleanedCount++;
        }
      }

      console.log(`Cleaned up ${cleanedCount} expired Epic contexts`);
      return cleanedCount;
    } catch (error) {
      console.error('Error cleaning up expired contexts:', error);
      return 0;
    }
  }

  /**
   * Get Epic context statistics
   * @returns {Object} Context statistics
   */
  getContextStats() {
    const totalContexts = this.epicContexts.size;
    const now = Date.now();
    let activeContexts = 0;
    let expiredContexts = 0;

    for (const context of this.epicContexts.values()) {
      if (context.expiresAt > now) {
        activeContexts++;
      } else {
        expiredContexts++;
      }
    }

    return {
      total: totalContexts,
      active: activeContexts,
      expired: expiredContexts
    };
  }
}

export default new EpicService();