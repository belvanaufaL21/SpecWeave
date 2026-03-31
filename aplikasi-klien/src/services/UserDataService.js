import { supabase } from '../config/supabase.js';
import { generateUniqueChatTitle } from '../utils/helpers/chatHelpers';
import api from './api.js';
import cleanLogger from '../config/cleanLogging.js';

/**
 * Service untuk mengelola user data yang sync antar browser
 * Menggantikan localStorage untuk chat, active projects, dan epic context
 */
class UserDataService {
  
  // =====================================================
  // Chat Sessions Management
  // =====================================================
  
  /**
   * Get all chat sessions for current user
   */
  static async getChatSessions() {
    try {
      const { data, error } = await supabase
        .from('user_chat_sessions')
        .select('*')
        .eq('is_active', true)
        .order('last_message_at', { ascending: false });
      
      if (error) throw error;
      
      return { success: true, data: data || [] };
    } catch (error) {
      console.error('Error getting chat sessions:', error);
      return { success: false, error: error.message };
    }
  }
  
  /**
   * Get specific chat session
   */
  static async getChatSession(chatId) {
    try {
      const { data, error } = await supabase
        .from('user_chat_sessions')
        .select('*')
        .eq('chat_id', chatId)
        .eq('is_active', true)
        .single();
      
      if (error && error.code !== 'PGRST116') throw error;
      
      return { success: true, data: data || null };
    } catch (error) {
      console.error('Error getting chat session:', error);
      return { success: false, error: error.message };
    }
  }
  
  /**
   * Clean Unicode null characters from data to prevent database errors
   */
  static cleanUnicodeNullChars(obj) {
    if (typeof obj === 'string') {
      // Remove null characters (\u0000) from strings
      return obj.replace(/\u0000/g, '');
    }
    if (Array.isArray(obj)) {
      return obj.map(item => this.cleanUnicodeNullChars(item));
    }
    if (obj !== null && typeof obj === 'object') {
      const cleaned = {};
      for (const key in obj) {
        cleaned[key] = this.cleanUnicodeNullChars(obj[key]);
      }
      return cleaned;
    }
    return obj;
  }

  /**
   * Save or update chat session
   */
  static async saveChatSession(chatId, sessionData, options = {}) {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');
      
      // Clean Unicode null characters from messages to prevent database errors
      const cleanedMessages = this.cleanUnicodeNullChars(sessionData.messages || []);
      
      const chatSession = {
        user_id: user.id,
        chat_id: chatId,
        title: sessionData.title || generateUniqueChatTitle([]),
        messages: cleanedMessages,
        metadata: sessionData.metadata || {}
      };
      
      // Only update last_message_at if explicitly requested (when new messages are added)
      if (options.updateTimestamp !== false) {
        chatSession.last_message_at = new Date().toISOString();
      }
      
      const { data, error } = await supabase
        .from('user_chat_sessions')
        .upsert(chatSession, {
          onConflict: 'user_id,chat_id'
        })
        .select()
        .single();
      
      if (error) throw error;
      
      return { success: true, data };
    } catch (error) {
      console.error('Error saving chat session:', error);
      return { success: false, error: error.message };
    }
  }
  
  /**
   * Delete chat session (soft delete)
   */
  static async deleteChatSession(chatId) {
    try {
      console.log('🗑️ [USER-DATA] Deleting chat session:', chatId);
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');
      
      console.log('🗑️ [USER-DATA] User authenticated:', user.id);
      
      const { data, error } = await supabase
        .from('user_chat_sessions')
        .update({ is_active: false })
        .eq('chat_id', chatId)
        .eq('user_id', user.id) // Add user_id filter for security
        .select(); // Add select to see what was updated
      
      console.log('🗑️ [USER-DATA] Update result:', { data, error });
      
      if (error) throw error;

      return { success: true, data };
    } catch (error) {
      console.error('❌ [USER-DATA] Error deleting chat session:', error);
      return { success: false, error: error.message };
    }
  }
  
  // =====================================================
  // Active Projects Management
  // =====================================================
  
  /**
   * Get active project (global, not per-chat)
   */
  static async getActiveProject() {
    try {
      // Try API first
      const response = await api.get(`/active-projects`);
      
      if (response.data.success) {
        console.log('✅ [USER-DATA] Got active project from API:', response.data.data);
        return response.data;
      }
    } catch (error) {
      console.warn('⚠️ [USER-DATA] API failed, falling back to localStorage:', error.message);
    }
    
    // Fallback to localStorage
    try {
      // Get from localStorage (global active project)
      const activeProjectId = localStorage.getItem('activeProjectId');
      
      if (!activeProjectId) {
        console.log('📝 [USER-DATA] No active project found in localStorage');
        return { success: true, data: null };
      }
      
      // Get connections from localStorage
      const connections = JSON.parse(localStorage.getItem('jiraConnections') || '[]');
      const connection = connections.find(conn => conn.id === activeProjectId);
      
      if (!connection) {
        console.log('📝 [USER-DATA] Connection not found in localStorage for project:', activeProjectId);
        return { success: true, data: null };
      }
      
      // Return connection as active project
      console.log('✅ [USER-DATA] Got active project from localStorage:', connection);
      return { success: true, data: connection };
    } catch (error) {
      console.error('❌ [USER-DATA] Error accessing localStorage:', error);
      return { success: true, data: null };
    }
  }
  
  /**
   * Set active project (global, not per-chat)
   */
  static async setActiveProject(connectionId) {
    try {
      // CRITICAL FIX: Validate connectionId format to prevent 500 errors
      if (!connectionId || typeof connectionId !== 'string') {
        console.warn('⚠️ [USER-DATA] Invalid connectionId provided:', connectionId);
        return { success: false, error: 'Invalid connection ID' };
      }
      
      // Basic UUID format validation
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(connectionId)) {
        console.warn('⚠️ [USER-DATA] ConnectionId is not a valid UUID:', connectionId);
        return { success: false, error: 'Connection ID must be a valid UUID' };
      }
      
      // Try API first
      const response = await api.post(`/active-projects`, {
        connectionId
      });
      
      if (response.data.success) {
        // Only log in development
        if (import.meta.env.DEV) {
          cleanLogger.debug('USER-DATA', 'Set active project via API');
        }
        
        // Also update localStorage for consistency (global, not per-chat)
        localStorage.setItem('activeProjectId', connectionId);
        
        return response.data;
      }
    } catch (error) {
      cleanLogger.warn('USER-DATA', 'API failed, falling back to localStorage', error.message);
      
      // CRITICAL FIX: Don't fallback to localStorage if it's a validation error
      if (error.response?.status === 400 || error.response?.status === 422) {
        console.error('❌ [USER-DATA] Validation error, not using localStorage fallback');
        return { success: false, error: error.message };
      }
    }
    
    // Fallback to localStorage
    try {
      // Update localStorage (global active project)
      localStorage.setItem('activeProjectId', connectionId);

      // Return data in expected format
      const result = { 
        success: true, 
        data: {
          id: connectionId,
          connection_id: connectionId,
          is_active: true,
          updated_at: new Date().toISOString()
        }
      };
      
      console.log('✅ [USER-DATA] Set active project via localStorage:', result.data);
      return result;
    } catch (error) {
      console.error('❌ [USER-DATA] Error setting active project in localStorage:', error);
      return { success: false, error: error.message };
    }
  }
  
  /**
   * Get all active projects for current user
   */
  static async getActiveProjects() {
    try {
      const { data, error } = await supabase
        .from('user_active_projects')
        .select(`
          *,
          jira_connections(jira_url, project_key, project_info)
        `)
        .eq('is_active', true)
        .order('updated_at', { ascending: false });
      
      if (error) throw error;
      
      return { success: true, data: data || [] };
    } catch (error) {
      console.error('❌ [USER-DATA] Error getting active projects:', error);
      
      // Fallback to localStorage if database fails
      try {
        const activeProjects = JSON.parse(localStorage.getItem('activeProjectsPerChat') || '{}');
        const connections = JSON.parse(localStorage.getItem('jiraConnections') || '[]');
        
        const projects = Object.entries(activeProjects).map(([chatId, connectionId]) => {
          const connection = connections.find(conn => conn.id === connectionId);
          return {
            id: `local-${chatId}-${connectionId}`,
            chat_id: chatId,
            connection_id: connectionId,
            project_key: connection?.project_key || '',
            project_name: connection?.project_name || connection?.project_key || '',
            is_active: true,
            jira_connections: connection ? {
              jira_url: connection.jira_url,
              project_key: connection.project_key,
              project_info: connection.custom_fields?.project_info
            } : null
          };
        });
        
        return { success: true, data: projects };
      } catch (fallbackError) {
        return { success: false, error: error.message };
      }
    }
  }
  
  /**
   * Clear active project (global)
   */
  static async clearActiveProject() {
    try {
      // Try API first
      await api.delete(`/active-projects`);
      
      // Always clear from localStorage as well
      localStorage.removeItem('activeProjectId');

      return { success: true };
    } catch (error) {
      console.error('❌ [USER-DATA] Error clearing active project:', error);
      
      // Fallback: clear localStorage anyway
      localStorage.removeItem('activeProjectId');
      return { success: true }; // Return success even if API fails
    }
  }
  
  /**
   * Get epic context (global, not per-chat)
   */
  static async getEpicContext() {
    console.log('🔥 [USER-DATA] Getting global epic context from localStorage');
    
    try {
      // ONLY localStorage - no network calls
      const localKey = 'epic_context_global';
      const localData = localStorage.getItem(localKey);
      
      if (localData) {
        try {
          const parsed = JSON.parse(localData);
          console.log('✅ [USER-DATA] Got epic context from localStorage');
          return { success: true, data: parsed.data };
        } catch (parseError) {
          console.warn('⚠️ [USER-DATA] Failed to parse cached epic context');
        }
      }
      
      // NO FALLBACK - return null if no cache
      console.log('📝 [USER-DATA] No epic context in localStorage');
      return { success: true, data: null };
      
    } catch (error) {
      console.error('❌ [USER-DATA] Epic context error:', error);
      return { success: true, data: null }; // Always success to prevent errors
    }
  }
  
  /**
   * Set epic context (global, not per-chat)
   */
  static async setEpicContext(epicData) {
    console.log('🔥 [USER-DATA] Setting global epic context to localStorage');
    
    try {
      // ONLY localStorage - no network calls
      const localKey = 'epic_context_global';
      const contextData = {
        data: {
          epic_data: epicData,
          connection_id: epicData.connection?.id,
          project_key: epicData.connection?.project_key || '',
          is_active: true,
          jira_connections: epicData.connection,
          created_at: new Date().toISOString()
        },
        timestamp: Date.now()
      };
      
      localStorage.setItem(localKey, JSON.stringify(contextData));
      console.log('✅ [USER-DATA] Epic context saved to localStorage');
      
      return { success: true };
      
    } catch (error) {
      console.error('❌ [USER-DATA] Set epic context error:', error);
      return { success: true }; // Always success to prevent errors
    }
  }
  
  /**
   * Clear epic context (global)
   */
  static async clearEpicContext() {
    try {
      // Clear from localStorage
      const localKey = 'epic_context_global';
      localStorage.removeItem(localKey);
      
      console.log('✅ [USER-DATA] Epic context cleared from localStorage');
      return { success: true };
    } catch (error) {
      console.error('❌ [USER-DATA] Error clearing epic context:', error);
      return { success: true }; // Always success to prevent errors
    }
  }
  
  // =====================================================
  // User Settings Management
  // =====================================================
  
  /**
   * Get user setting
   */
  static async getSetting(key, defaultValue = null) {
    try {
      const { data, error } = await supabase
        .from('user_settings')
        .select('setting_value')
        .eq('setting_key', key)
        .single();
      
      if (error && error.code !== 'PGRST116') throw error;
      
      return { success: true, data: data?.setting_value || defaultValue };
    } catch (error) {
      console.error('Error getting user setting:', error);
      return { success: false, error: error.message, data: defaultValue };
    }
  }
  
  /**
   * Set user setting
   */
  static async setSetting(key, value, category = 'general') {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');
      
      const setting = {
        user_id: user.id,
        setting_key: key,
        setting_value: value,
        category
      };
      
      const { data, error } = await supabase
        .from('user_settings')
        .upsert(setting, {
          onConflict: 'user_id,setting_key'
        })
        .select()
        .single();
      
      if (error) throw error;
      
      return { success: true, data };
    } catch (error) {
      console.error('Error setting user setting:', error);
      return { success: false, error: error.message };
    }
  }
  
  /**
   * Get all settings for category
   */
  static async getSettingsByCategory(category = 'general') {
    try {
      const { data, error } = await supabase
        .from('user_settings')
        .select('*')
        .eq('category', category);
      
      if (error) throw error;
      
      // Convert to key-value object
      const settings = {};
      data.forEach(setting => {
        settings[setting.setting_key] = setting.setting_value;
      });
      
      return { success: true, data: settings };
    } catch (error) {
      console.error('Error getting settings by category:', error);
      return { success: false, error: error.message };
    }
  }
  
  // =====================================================
  // Test Results Management
  // =====================================================
  
  /**
   * Save test result to database
   */
  static async saveTestResult(testResult) {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');
      
      // Ensure meteor_score is not null - use 0 as default if no score provided
      const meteorScore = testResult.meteor_score || testResult.meteor?.score || testResult.score || 0;
      
      // Determine test_type from testResult
      const testType = testResult.test_type || testResult.testType || 'meteor';
      
      // For dual testing, we need to save the combined score or use METEOR score as primary
      const finalScore = testType === 'dual' 
        ? (testResult.meteor?.score || meteorScore)
        : meteorScore;
      
      const testData = {
        user_id: user.id,
        scenario_id: testResult.scenarioId,
        test_type: testType,
        score: finalScore,
        generated_text: testResult.generatedText || '',
        reference_text: testResult.referenceText || '',
        test_details: {
          ...testResult,
          timestamp: testResult.timestamp || new Date().toISOString()
        },
        // Optional fields for linking to chat messages
        ...(testResult.messageId && { message_id: testResult.messageId }),
        ...(testResult.scenarioIndex !== undefined && { scenario_index: testResult.scenarioIndex })
      };
      
      console.log('💾 [USER-DATA] Attempting to save test result:', {
        scenarioId: testData.scenario_id,
        testType: testData.test_type,
        score: testData.score,
        hasMessageId: !!testData.message_id,
        hasScenarioIndex: testData.scenario_index !== undefined
      });
      
      // DEPRECATED: Frontend no longer saves directly to database
      // Backend SSE endpoints (runMeteorTestSSE, runSentenceBertTestSSE) handle the save
      console.log('⚠️ [USER-DATA] Frontend save is DISABLED - backend SSE handles this');
      console.log('💾 [USER-DATA] Test result saved by backend SSE endpoints');
      
      // Return success without actually saving
      return { success: true, data: testData, message: 'Saved by backend SSE' };
      
      /* COMMENTED OUT - Backend SSE now handles saving
      const { data: upsertData, error: upsertError } = await supabase
        .from('test_results')
        .upsert(testData, {
          onConflict: 'user_id,scenario_id,test_type',
          ignoreDuplicates: false
        })
        .select()
        .single();

      if (upsertError) {
        console.error('❌ [USER-DATA] Upsert error:', upsertError);
        throw upsertError;
      }

      console.log('✅ [USER-DATA] Test result saved successfully to test_results table');
      return { success: true, data: upsertData };
      */
      
    } catch (error) {
      console.error('❌ [TEST-RESULTS] Error saving test result:', error);
      console.error('❌ [TEST-RESULTS] Failed to save to database:', error.message);
      return { success: false, error: error.message };
    }
  }
  
  /**
   * Get test result by scenario ID
   */
  static async getTestResult(scenarioId) {
    try {
      const { data, error } = await supabase
        .from('test_results')
        .select('*')
        .eq('scenario_id', scenarioId)
        .single();
      
      if (error && error.code !== 'PGRST116') throw error;
      
      return { success: true, data: data || null };
    } catch (error) {
      console.error('Error getting test result:', error);
      return { success: false, error: error.message };
    }
  }
  
  /**
   * Get all test results for current user
   */
  static async getAllTestResults() {
    try {
      const { data, error } = await supabase
        .from('test_results')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      return { success: true, data: data || [] };
    } catch (error) {
      console.error('Error getting all test results:', error);
      return { success: false, error: error.message };
    }
  }
  
  /**
   * Delete test result
   */
  static async deleteTestResult(scenarioId) {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');
      
      const { error } = await supabase
        .from('test_results')
        .delete()
        .eq('scenario_id', scenarioId)
        .eq('user_id', user.id);
      
      if (error) throw error;
      
      return { success: true };
    } catch (error) {
      console.error('Error deleting test result:', error);
      return { success: false, error: error.message };
    }
  }
  
  /**
   * Migrate chat data from localStorage to database
   */
  static async migrateChatDataFromLocalStorage() {
    try {
      
      // Get data from localStorage
      const chats = JSON.parse(localStorage.getItem('specweave_chats') || '{}');
      const history = JSON.parse(localStorage.getItem('specweave_chat_history') || '[]');
      
      if (Object.keys(chats).length === 0) {
        
        return { success: true, migrated: 0 };
      }
      
      let migrated = 0;
      
      // Migrate each chat
      for (const [chatId, chatData] of Object.entries(chats)) {
        // Find existing title from history or generate new one
        const existingHistoryItem = history.find(h => h.id === chatId);
        const fallbackTitle = existingHistoryItem?.title || generateUniqueChatTitle(history);
        
        const sessionData = {
          title: chatData.title || fallbackTitle,
          messages: chatData.messages || [],
          metadata: {
            ...chatData,
            migratedFrom: 'localStorage',
            migratedAt: new Date().toISOString()
          }
        };
        
        const result = await this.saveChatSession(chatId, sessionData);
        if (result.success) {
          migrated++;
          
        } else {
          console.error(`❌ [USER-DATA] Failed to migrate chat ${chatId}:`, result.error);
        }
      }

      return { success: true, migrated };
    } catch (error) {
      console.error('❌ [USER-DATA] Migration failed:', error);
      return { success: false, error: error.message };
    }
  }
  
  /**
   * Migrate active projects from localStorage to database
   */
  static async migrateActiveProjectsFromLocalStorage() {
    try {
      
      const activeProjects = JSON.parse(localStorage.getItem('activeProjectsPerChat') || '{}');
      
      if (Object.keys(activeProjects).length === 0) {
        
        return { success: true, migrated: 0 };
      }
      
      let migrated = 0;
      
      // Get connections to validate project IDs
      const { data: connections } = await supabase
        .from('jira_connections')
        .select('*');
      
      for (const [chatId, connectionId] of Object.entries(activeProjects)) {
        const connection = connections?.find(c => c.id === connectionId);
        
        if (connection) {
          const projectData = {
            project_key: connection.project_key,
            project_name: connection.project_name || connection.project_key
          };
          
          const result = await this.setActiveProject(connectionId);
          if (result.success) {
            migrated++;
            console.log(`✅ [USER-DATA] Migrated active project for connection ${connectionId}`);
          } else {
            console.error(`❌ [USER-DATA] Failed to migrate active project for connection ${connectionId}:`, result.error);
          }
        }
      }

      return { success: true, migrated };
    } catch (error) {
      console.error('❌ [USER-DATA] Active projects migration failed:', error);
      return { success: false, error: error.message };
    }
  }
  
  /**
   * Migrate test results from localStorage to database
   */
  static async migrateTestResultsFromLocalStorage() {
    try {
      
      const testResultsStr = localStorage.getItem('specweave_test_results');
      
      if (!testResultsStr) {
        
        return { success: true, migrated: 0 };
      }
      
      const testResults = JSON.parse(testResultsStr);
      
      if (!testResults || Object.keys(testResults).length === 0) {
        
        return { success: true, migrated: 0 };
      }
      
      let migrated = 0;
      
      for (const [scenarioId, testResult] of Object.entries(testResults)) {
        const result = await this.saveTestResult(testResult);
        
        if (result.success) {
          migrated++;
          
        } else {
          console.error(`❌ [USER-DATA] Failed to migrate test result ${scenarioId}:`, result.error);
        }
      }

      return { success: true, migrated };
    } catch (error) {
      console.error('❌ [USER-DATA] Test results migration failed:', error);
      return { success: false, error: error.message };
    }
  }
  
  // =====================================================
  // JIRA Exports Management
  // =====================================================
  
  /**
   * Save JIRA export to database
   */
  static async saveJiraExport(chatId, exportData, jiraResult = null, exportStatus = 'success', errorMessage = null) {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');
      
      const exportRecord = {
        user_id: user.id,
        chat_id: chatId,
        export_data: exportData,
        jira_story_key: jiraResult?.userStory?.key || null,
        jira_story_url: jiraResult?.userStory?.url || null,
        jira_epic_key: jiraResult?.epic?.key || exportData.epic?.key || null,
        jira_project_key: jiraResult?.project?.key || exportData.connection?.project_key || null,
        export_status: exportStatus,
        error_message: errorMessage,
        scenario_count: jiraResult?.scenarioCount || exportData.scenarios?.length || 0,
        exported_at: new Date().toISOString()
      };
      
      const { data, error } = await supabase
        .from('user_jira_exports')
        .insert(exportRecord)
        .select()
        .single();
      
      if (error) {
        // Check if table doesn't exist
        if (error.code === 'PGRST205' || error.message.includes('user_jira_exports')) {
          console.warn('⚠️ [USER-DATA] user_jira_exports table not found, skipping database save');
          return { success: false, error: 'Table not found - please run database migration' };
        }
        throw error;
      }

      return { success: true, data };
    } catch (error) {
      console.error('❌ [USER-DATA] Error saving JIRA export:', error);
      return { success: false, error: error.message };
    }
  }
  
  /**
   * Get JIRA export history for user
   */
  static async getJiraExports(chatId = null, limit = 50) {
    try {
      let query = supabase
        .from('user_jira_exports')
        .select('*')
        .order('exported_at', { ascending: false })
        .limit(limit);
      
      if (chatId) {
        query = query.eq('chat_id', chatId);
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      
      return { success: true, data: data || [] };
    } catch (error) {
      console.error('❌ [USER-DATA] Error getting JIRA exports:', error);
      return { success: false, error: error.message };
    }
  }
  
  /**
   * Get JIRA export by ID
   */
  static async getJiraExport(exportId) {
    try {
      const { data, error } = await supabase
        .from('user_jira_exports')
        .select('*')
        .eq('id', exportId)
        .single();
      
      if (error && error.code !== 'PGRST116') throw error;
      
      return { success: true, data: data || null };
    } catch (error) {
      console.error('❌ [USER-DATA] Error getting JIRA export:', error);
      return { success: false, error: error.message };
    }
  }
  
  /**
   * Update JIRA export status
   */
  static async updateJiraExportStatus(exportId, status, errorMessage = null) {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');
      
      const updateData = {
        export_status: status,
        updated_at: new Date().toISOString()
      };
      
      if (errorMessage) {
        updateData.error_message = errorMessage;
      }
      
      const { data, error } = await supabase
        .from('user_jira_exports')
        .update(updateData)
        .eq('id', exportId)
        .eq('user_id', user.id)
        .select()
        .single();
      
      if (error) throw error;
      
      return { success: true, data };
    } catch (error) {
      console.error('❌ [USER-DATA] Error updating JIRA export status:', error);
      return { success: false, error: error.message };
    }
  }
  
  /**
   * Delete JIRA export
   */
  static async deleteJiraExport(exportId) {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');
      
      const { error } = await supabase
        .from('user_jira_exports')
        .delete()
        .eq('id', exportId)
        .eq('user_id', user.id);
      
      if (error) throw error;
      
      return { success: true };
    } catch (error) {
      console.error('❌ [USER-DATA] Error deleting JIRA export:', error);
      return { success: false, error: error.message };
    }
  }
  
  /**
   * Get JIRA export statistics
   */
  static async getJiraExportStats(chatId = null) {
    try {
      let query = supabase
        .from('user_jira_exports')
        .select('export_status, scenario_count, exported_at');
      
      if (chatId) {
        query = query.eq('chat_id', chatId);
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      
      const stats = {
        total: data.length,
        successful: data.filter(exp => exp.export_status === 'success').length,
        failed: data.filter(exp => exp.export_status === 'failed').length,
        timeout: data.filter(exp => exp.export_status === 'timeout').length,
        totalScenarios: data.reduce((sum, exp) => sum + (exp.scenario_count || 0), 0),
        lastExport: data.length > 0 ? data[0].exported_at : null
      };
      
      return { success: true, data: stats };
    } catch (error) {
      console.error('❌ [USER-DATA] Error getting JIRA export stats:', error);
      return { success: false, error: error.message };
    }
  }
  
  /**
   * Migrate JIRA exports from localStorage to database (if any exist)
   */
  static async migrateJiraExportsFromLocalStorage() {
    try {
      
      const jiraExportsStr = localStorage.getItem('specweave_jira_exports');
      
      if (!jiraExportsStr) {
        
        return { success: true, migrated: 0 };
      }
      
      const jiraExports = JSON.parse(jiraExportsStr);
      
      if (!jiraExports || Object.keys(jiraExports).length === 0) {
        
        return { success: true, migrated: 0 };
      }
      
      let migrated = 0;
      
      for (const [exportId, exportData] of Object.entries(jiraExports)) {
        // Convert old format to new format
        const chatId = exportData.chatId || 'default-chat';
        const result = await this.saveJiraExport(
          chatId,
          exportData,
          exportData.jiraResult || null,
          exportData.status || 'success',
          exportData.error || null
        );
        
        if (result.success) {
          migrated++;
          
        } else {
          console.error(`❌ [USER-DATA] Failed to migrate JIRA export ${exportId}:`, result.error);
        }
      }

      return { success: true, migrated };
    } catch (error) {
      console.error('❌ [USER-DATA] JIRA exports migration failed:', error);
      return { success: false, error: error.message };
    }
  }
}

export default UserDataService;