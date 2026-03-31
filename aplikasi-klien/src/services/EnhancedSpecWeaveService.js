/**
 * Enhanced SpecWeave Service - Integrates auto reference patterns with Gherkin generation
 * 
 * This service combines the original SpecWeave functionality with automatic reference pattern analysis
 */

import api from './api.js';
import cleanLogger from '../config/cleanLogging.js';
import ErrorRecovery from '../utils/errors/ErrorRecovery.js';
import { autoReferenceService } from './reference/AutoReferenceService.js';

/**
 * Enhanced SpecWeave Service Class
 */
class EnhancedSpecWeaveService {
  constructor() {
    this.useAutoReference = true; // Flag to enable/disable auto reference
  }

  /**
   * Generate Gherkin scenarios from user story with automatic reference pattern analysis
   * @param {string} userStory - The user story text
   * @param {Object} options - Generation options
   * @returns {Promise<Object>} Generation result
   */
  async generateGherkin(userStory, options = {}) {
    try {
      // Log: Starting generation
      cleanLogger.generationStart();
      
      // Log epic context
      if (options.epicContext) {
        console.log('🎯 [ENHANCED-SPECWEAVE] Epic context available:', {
          hasEpic: !!options.epicContext.epicData?.epic,
          epicKey: options.epicContext.epicData?.epic?.key,
          epicName: options.epicContext.epicData?.epic?.name,
          projectKey: options.epicContext.epicData?.connection?.project_key
        });
      } else {
        console.log('⚠️ [ENHANCED-SPECWEAVE] No epic context provided');
      }
      
      let enhancedPrompt = userStory;
      let referenceData = null;

      // Use auto reference if enabled
      if (this.useAutoReference && !options.skipAutoReference) {
        try {
          const referenceResult = await autoReferenceService.generateScenarioFromUserStory(userStory, {
            includeBackground: options.includeBackground,
            multipleScenarios: options.multipleScenarios
          });

          if (referenceResult.success) {
            enhancedPrompt = referenceResult.prompt;
            referenceData = {
              patterns: referenceResult.patterns,
              meta: referenceResult.meta
            };
          } else {
            console.warn('Reference analysis failed, using fallback:', referenceResult.error);
            if (referenceResult.fallback) {
              enhancedPrompt = referenceResult.fallback.prompt;
            }
          }
        } catch (referenceError) {
          console.warn('Reference service error, continuing without patterns:', referenceError.message);
        }
      }

      // Call the backend API with enhanced prompt
      const requestConfig = {};
      if (options.signal) {
        requestConfig.signal = options.signal;
      }
      
      const response = await api.post('/gherkin/generate', {
        userStory: enhancedPrompt,
        originalUserStory: userStory, // Keep original for tracking
        epicContext: options.epicContext, // Pass epic context to server
        options: {
          ...options,
          useAutoReference: this.useAutoReference,
          referenceData: referenceData
        }
      }, requestConfig);
      
      if (response.data.success) {
        const result = {
          success: true,
          data: {
            ...response.data.data,
            // Add reference metadata to response
            referenceInfo: referenceData ? {
              patternsUsed: referenceData.patterns.length,
              patternTypes: referenceData.patterns.map(p => p.type),
              generationType: referenceData.meta?.generationType,
              totalPatternsAnalyzed: referenceData.meta?.patternCount
            } : null
          }
        };

        // Log: Generation success
        cleanLogger.generationSuccess();
        
        return result;
      } else {
        throw new Error(response.data.error || 'Failed to generate Gherkin');
      }
    } catch (error) {
      const recovery = ErrorRecovery.handleUnexpectedError(error, 'GHERKIN_GENERATION');
      
      // Log: Generation failed
      cleanLogger.generationFailed(recovery.userMessage);
      
      return { 
        success: false, 
        error: recovery.userMessage,
        fallbackAvailable: this.useAutoReference
      };
    }
  }

  /**
   * Generate Gherkin without auto reference (fallback method)
   * @param {string} userStory - The user story text
   * @param {Object} options - Generation options
   * @returns {Promise<Object>} Generation result
   */
  async generateGherkinBasic(userStory, options = {}) {
    return this.generateGherkin(userStory, {
      ...options,
      skipAutoReference: true
    });
  }

  /**
   * Get reference pattern statistics
   * @returns {Promise<Object>} Pattern statistics
   */
  async getReferenceStats() {
    try {
      const patterns = await autoReferenceService.analyzeReferencePatterns();
      
      const stats = {
        totalPatterns: patterns.length,
        categoryPatterns: patterns.filter(p => p.type === 'category').length,
        structurePatterns: patterns.filter(p => p.type === 'structure').length,
        categories: [...new Set(patterns.filter(p => p.type === 'category').map(p => p.category))],
        averageWeight: patterns.length > 0 
          ? patterns.reduce((sum, p) => sum + (p.weight || 0), 0) / patterns.length 
          : 0,
        lastAnalyzed: new Date().toISOString()
      };

      return { success: true, data: stats };
    } catch (error) {
      const recovery = ErrorRecovery.handleUnexpectedError(error, 'ENHANCED_SPECWEAVE');
      cleanLogger.error('ENHANCED-SPECWEAVE', recovery.userMessage);
      return { success: false, error: recovery.userMessage };
    }
  }

  /**
   * Refresh reference patterns cache
   * @returns {Promise<Object>} Refresh result
   */
  async refreshReferencePatterns() {
    try {
      
      autoReferenceService.clearCache();
      const patterns = await autoReferenceService.analyzeReferencePatterns();

      return { 
        success: true, 
        data: { 
          patternCount: patterns.length,
          refreshedAt: new Date().toISOString()
        } 
      };
    } catch (error) {
      const recovery = ErrorRecovery.handleUnexpectedError(error, 'ENHANCED_SPECWEAVE');
      cleanLogger.error('ENHANCED-SPECWEAVE', recovery.userMessage);
      return { success: false, error: recovery.userMessage };
    }
  }

  /**
   * Toggle auto reference feature
   * @param {boolean} enabled - Whether to enable auto reference
   */
  setAutoReferenceEnabled(enabled) {
    this.useAutoReference = enabled;
    
  }

  /**
   * Check if auto reference is enabled
   * @returns {boolean} Auto reference status
   */
  isAutoReferenceEnabled() {
    return this.useAutoReference;
  }

  // Legacy methods for backward compatibility
  
  /**
   * Authenticate with JIRA
   * @param {string} domain - JIRA domain
   * @param {string} email - User email
   * @param {string} token - API token
   * @returns {Promise<Object>} Authentication result
   */
  async authenticateJira(domain, email, token) {
    try {
      const response = await api.post('/jira/authenticate', {
        domain,
        email,
        token
      });
      
      if (response.data.success) {
        return { success: true, data: response.data.data };
      } else {
        throw new Error(response.data.error || 'Failed to authenticate with JIRA');
      }
    } catch (error) {
      const recovery = ErrorRecovery.handleJiraError(error, 'Authenticate with JIRA');
      cleanLogger.error('JIRA_AUTH', recovery.userMessage);
      return { success: false, error: recovery.userMessage };
    }
  }

  /**
   * Connect to JIRA project
   * @param {string} projectKey - JIRA project key
   * @returns {Promise<Object>} Connection result
   */
  async connectJiraProject(projectKey) {
    try {
      const response = await api.post('/jira/connect-project', {
        projectKey
      });
      
      if (response.data.success) {
        return { success: true, data: response.data.data };
      } else {
        throw new Error(response.data.error || 'Failed to connect to JIRA project');
      }
    } catch (error) {
      const recovery = ErrorRecovery.handleJiraError(error, 'Connect to JIRA project');
      cleanLogger.error('JIRA_PROJECT', recovery.userMessage);
      return { success: false, error: recovery.userMessage };
    }
  }

  /**
   * Save issue to JIRA
   * @param {Object} data - Issue data
   * @returns {Promise<Object>} Save result
   */
  async saveJiraIssue(data) {
    try {
      const response = await api.post('/jira/save-issue', data);
      
      if (response.data.success) {
        return { success: true, data: response.data.data };
      } else {
        throw new Error(response.data.error || 'Failed to save JIRA issue');
      }
    } catch (error) {
      const recovery = ErrorRecovery.handleJiraError(error, 'Save JIRA issue');
      cleanLogger.error('JIRA_SAVE', recovery.userMessage);
      return { success: false, error: recovery.userMessage };
    }
  }
}

// Create service instance
const enhancedSpecWeaveService = new EnhancedSpecWeaveService();

/**
 * Generate Gherkin scenarios from user story with auto reference patterns
 * @param {string} userStory - The user story text
 * @param {Object} options - Generation options
 * @returns {Promise<Object>} Generation result
 */
export const generateGherkin = async (userStory, options = {}) => {
  return await enhancedSpecWeaveService.generateGherkin(userStory, options);
};

/**
 * Generate Gherkin scenarios without auto reference (basic mode)
 * @param {string} userStory - The user story text
 * @param {Object} options - Generation options
 * @returns {Promise<Object>} Generation result
 */
export const generateGherkinBasic = async (userStory, options = {}) => {
  return await enhancedSpecWeaveService.generateGherkinBasic(userStory, options);
};

/**
 * Get reference pattern statistics
 * @returns {Promise<Object>} Pattern statistics
 */
export const getReferenceStats = async () => {
  return await enhancedSpecWeaveService.getReferenceStats();
};

/**
 * Refresh reference patterns cache
 * @returns {Promise<Object>} Refresh result
 */
export const refreshReferencePatterns = async () => {
  return await enhancedSpecWeaveService.refreshReferencePatterns();
};

/**
 * Toggle auto reference feature
 * @param {boolean} enabled - Whether to enable auto reference
 */
export const setAutoReferenceEnabled = (enabled) => {
  enhancedSpecWeaveService.setAutoReferenceEnabled(enabled);
};

/**
 * Check if auto reference is enabled
 * @returns {boolean} Auto reference status
 */
export const isAutoReferenceEnabled = () => {
  return enhancedSpecWeaveService.isAutoReferenceEnabled();
};

/**
 * Mock JIRA Service for backward compatibility
 * @deprecated Use JiraService instead
 */
export const jiraService = {
  authenticate: async (domain, email, token) => {
    return await enhancedSpecWeaveService.authenticateJira(domain, email, token);
  },

  connectProject: async (projectKey) => {
    return await enhancedSpecWeaveService.connectJiraProject(projectKey);
  },

  saveIssue: async (data) => {
    return await enhancedSpecWeaveService.saveJiraIssue(data);
  }
};

// Export service instance for direct use
export default enhancedSpecWeaveService;