import { supabaseAdmin, supabaseClient } from '../config/supabase.js';

/**
 * Supabase Service
 * Provides database operations using Supabase client
 */
class SupabaseService {
  constructor() {
    this.admin = supabaseAdmin;
    this.client = supabaseClient;
  }

  /**
   * Get database client for server-side operations
   * @returns {Object} Supabase admin client
   */
  getClient() {
    return this.admin;
  }

  /**
   * Test database connection
   * @returns {Promise<Object>} Connection test result
   */
  async testConnection() {
    try {
      const { data, error } = await this.admin
        .from('profiles')
        .select('count')
        .limit(1);
      
      if (error) {
        throw error;
      }
      
      return {
        success: true,
        message: 'Database connection successful',
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('Database connection test failed:', error);
      return {
        success: false,
        message: 'Database connection failed',
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  // =====================================================
  // User Profile Operations
  // =====================================================

  /**
   * Get user profile
   * @param {string} userId - User ID
   * @returns {Promise<Object>} User profile
   */
  async getUserProfile(userId) {
    try {
      const { data, error } = await this.admin
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();
      
      if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
        throw error;
      }
      
      return data;
    } catch (error) {
      console.error('Error getting user profile:', error);
      throw new Error(`Failed to get user profile: ${error.message}`);
    }
  }

  /**
   * Create user profile
   * @param {string} userId - User ID
   * @param {Object} profileData - Profile data
   * @returns {Promise<Object>} Created profile
   */
  async createUserProfile(userId, profileData) {
    try {
      const { data, error } = await this.admin
        .from('profiles')
        .insert({
          id: userId,
          ...profileData,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single();
      
      if (error) {
        throw error;
      }
      
      return data;
    } catch (error) {
      console.error('Error creating user profile:', error);
      throw new Error(`Failed to create user profile: ${error.message}`);
    }
  }

  /**
   * Update user profile
   * @param {string} userId - User ID
   * @param {Object} updates - Profile updates
   * @returns {Promise<Object>} Updated profile
   */
  async updateUserProfile(userId, updates) {
    try {
      const { data, error } = await this.admin
        .from('profiles')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', userId)
        .select()
        .single();
      
      if (error) {
        throw error;
      }
      
      return data;
    } catch (error) {
      console.error('Error updating user profile:', error);
      throw new Error(`Failed to update user profile: ${error.message}`);
    }
  }

  // =====================================================
  // JIRA Connection Operations
  // =====================================================

  /**
   * Create JIRA connection
   * @param {Object} connectionData - Connection data
   * @returns {Promise<Object>} Created connection
   */
  async createJiraConnection(userId, connectionData) {
      try {
        // VALIDATION: Check for duplicate connection
        // A duplicate is defined as same user_id, jira_url, jira_email, and project_key
        const { data: existingConnections, error: checkError } = await this.admin
          .from('jira_connections')
          .select('id, project_name, project_key')
          .eq('user_id', userId)
          .eq('jira_url', connectionData.jira_url)
          .eq('jira_email', connectionData.jira_email)
          .eq('project_key', connectionData.project_key);

        if (checkError) {
          console.error('Error checking for duplicate connection:', checkError);
          throw checkError;
        }

        // If duplicate found, throw specific error
        if (existingConnections && existingConnections.length > 0) {
          const existing = existingConnections[0];
          const projectDisplay = existing.project_name && existing.project_key
            ? `${existing.project_name} (${existing.project_key})`
            : existing.project_name || existing.project_key;
          
          throw new Error(`DUPLICATE_PROJECT:${projectDisplay}`);
        }

        const insertData = {
          user_id: userId,
          jira_url: connectionData.jira_url,
          jira_email: connectionData.jira_email,
          jira_api_token: connectionData.jira_api_token,
          project_key: connectionData.project_key,
          project_name: connectionData.project_name,
          is_active: true, // ADDED: Set new connections as active by default
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };

        // Add token expiry date if provided
        if (connectionData.token_expires_at) {
          insertData.token_expires_at = connectionData.token_expires_at;
          insertData.token_status = this._calculateTokenStatus(connectionData.token_expires_at);
        }

        const { data, error } = await this.admin
          .from('jira_connections')
          .insert(insertData)
          .select()
          .single();

        if (error) {
          throw error;
        }

        return data;
      } catch (error) {
        console.error('Error creating JIRA connection:', error);
        
        // Re-throw duplicate error as-is for special handling
        if (error.message && error.message.startsWith('DUPLICATE_PROJECT:')) {
          throw error;
        }
        
        throw new Error(`Failed to create JIRA connection: ${error.message}`);
      }
    }

  /**
   * Calculate token status based on expiry date
   * @private
   */
  _calculateTokenStatus(expiryDate) {
    if (!expiryDate) return 'unknown';
    
    const now = new Date();
    const expiry = new Date(expiryDate);
    const daysUntilExpiry = Math.ceil((expiry - now) / (1000 * 60 * 60 * 24));
    
    if (daysUntilExpiry < 0) return 'expired';
    if (daysUntilExpiry <= 7) return 'expiring_soon';
    return 'valid';
  }


  /**
   * Get user's JIRA connections
   * @param {string} userId - User ID
   * @returns {Promise<Array>} JIRA connections
   */
  async getUserJiraConnections(userId) {
    try {
      const { data, error } = await this.admin
        .from('jira_connections')
        .select('*')
        .eq('user_id', userId)
        // REMOVED: .eq('is_active', true) - Allow multiple active connections
        // All connections are now returned, regardless of is_active status
        .order('created_at', { ascending: false });
      
      if (error) {
        throw error;
      }
      
      return data || [];
    } catch (error) {
      console.error('Error getting JIRA connections:', error);
      throw new Error(`Failed to get JIRA connections: ${error.message}`);
    }
  }

  /**
   * Get single JIRA connection by ID
   * @param {string} connectionId - Connection ID
   * @returns {Promise<Object>} JIRA connection
   */
  async getJiraConnection(connectionId) {
    try {
      const { data, error } = await this.admin
        .from('jira_connections')
        .select('*')
        .eq('id', connectionId)
        .eq('is_active', true)
        .single();
      
      if (error) {
        throw error;
      }
      
      return data;
    } catch (error) {
      console.error('Error getting JIRA connection:', error);
      throw new Error(`Failed to get JIRA connection: ${error.message}`);
    }
  }

  /**
   * Get all JIRA connections (admin/testing only)
   * @returns {Promise<Array>} All JIRA connections
   */
  async getAllJiraConnections() {
    try {
      const { data, error } = await this.admin
        .from('jira_connections')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false });
      
      if (error) {
        throw error;
      }
      
      return data || [];
    } catch (error) {
      console.error('Error getting all JIRA connections:', error);
      throw new Error(`Failed to get all JIRA connections: ${error.message}`);
    }
  }

  /**
   * Update JIRA connection
   * @param {string} connectionId - Connection ID
   * @param {string} userId - User ID
   * @param {Object} updates - Connection updates
   * @returns {Promise<Object>} Updated connection
   */
  async updateJiraConnection(connectionId, userId, updates) {
    try {
      const updateData = {
        ...updates,
        updated_at: new Date().toISOString()
      };

      // Recalculate token status if expiry date is being updated
      if (updates.token_expires_at !== undefined) {
        updateData.token_status = this._calculateTokenStatus(updates.token_expires_at);
      }

      const { data, error } = await this.admin
        .from('jira_connections')
        .update(updateData)
        .eq('id', connectionId)
        .eq('user_id', userId)
        .select()
        .single();
      
      if (error) {
        throw error;
      }
      
      return data;
    } catch (error) {
      console.error('Error updating JIRA connection:', error);
      throw new Error(`Failed to update JIRA connection: ${error.message}`);
    }
  }

  /**
   * Delete JIRA connection
   * @param {string} connectionId - Connection ID
   * @param {string} userId - User ID
   * @returns {Promise<boolean>} Success status
   */
  async deleteJiraConnection(connectionId, userId) {
    try {
      const { error } = await this.admin
        .from('jira_connections')
        .delete()
        .eq('id', connectionId)
        .eq('user_id', userId);
      
      if (error) {
        throw error;
      }
      
      return true;
    } catch (error) {
      console.error('Error deleting JIRA connection:', error);
      throw new Error(`Failed to delete JIRA connection: ${error.message}`);
    }
  }

  /**
   * Clear epic context for a specific connection
   * @param {string} userId - User ID
   * @param {string} connectionId - Connection ID
   * @returns {Promise<boolean>} Success status
   */
  async clearEpicContextForConnection(userId, connectionId) {
    try {
      console.log(`🧹 [SUPABASE-SERVICE] Clearing epic context for connection ${connectionId}`);
      
      const { error } = await this.admin
        .from('user_epic_context')
        .delete()
        .eq('user_id', userId)
        .eq('connection_id', connectionId);
      
      if (error) {
        throw error;
      }
      
      console.log(`✅ [SUPABASE-SERVICE] Epic context cleared for connection ${connectionId}`);
      return true;
    } catch (error) {
      console.error('Error clearing epic context for connection:', error);
      throw new Error(`Failed to clear epic context: ${error.message}`);
    }
  }

  /**
   * Clear active projects for a specific connection
   * @param {string} userId - User ID
   * @param {string} connectionId - Connection ID
   * @returns {Promise<boolean>} Success status
   */
  async clearActiveProjectsForConnection(userId, connectionId) {
    try {
      console.log(`🧹 [SUPABASE-SERVICE] Clearing active projects for connection ${connectionId}`);
      
      const { error } = await this.admin
        .from('user_active_projects')
        .delete()
        .eq('user_id', userId)
        .eq('connection_id', connectionId);
      
      if (error) {
        throw error;
      }
      
      console.log(`✅ [SUPABASE-SERVICE] Active projects cleared for connection ${connectionId}`);
      return true;
    } catch (error) {
      console.error('Error clearing active projects for connection:', error);
      throw new Error(`Failed to clear active projects: ${error.message}`);
    }
  }

  // =====================================================
  // Template Operations
  // =====================================================

  /**
   * Get templates
   * @param {string} category - Template category
   * @param {string} userId - User ID
   * @returns {Promise<Array>} Templates
   */
  async getTemplates(category = null, userId = null) {
    try {
      let query = this.admin
        .from('templates')
        .select('*');
      
      if (category) {
        query = query.eq('category', category);
      }
      
      if (userId) {
        // Show system templates OR user's own templates
        query = query.or(`is_system.eq.true,created_by.eq.${userId}`);
      } else {
        // Show only system templates for unauthenticated users
        query = query.eq('is_system', true);
      }
      
      const { data, error } = await query.order('usage_count', { ascending: false });
      
      if (error) {
        console.error('Supabase error in getTemplates:', error);
        throw error;
      }
      
      return data || [];
    } catch (error) {
      console.error('Error getting templates:', error);
      throw new Error(`Failed to get templates: ${error.message}`);
    }
  }

  /**
   * Create template
   * @param {Object} templateData - Template data
   * @returns {Promise<Object>} Created template
   */
  async createTemplate(templateData) {
    try {
      const { data, error } = await this.admin
        .from('templates')
        .insert({
          ...templateData,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single();
      
      if (error) {
        throw error;
      }
      
      return data;
    } catch (error) {
      console.error('Error creating template:', error);
      throw new Error(`Failed to create template: ${error.message}`);
    }
  }

  /**
   * Update template
   * @param {string} templateId - Template ID
   * @param {string} userId - User ID
   * @param {Object} updates - Template updates
   * @returns {Promise<Object>} Updated template
   */
  async updateTemplate(templateId, userId, updates) {
    try {
      const { data, error } = await this.admin
        .from('templates')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', templateId)
        .eq('created_by', userId)
        .select()
        .single();
      
      if (error) {
        throw error;
      }
      
      return data;
    } catch (error) {
      console.error('Error updating template:', error);
      throw new Error(`Failed to update template: ${error.message}`);
    }
  }

  /**
   * Increment template usage
   * @param {string} templateId - Template ID
   * @returns {Promise<void>}
   */
  async incrementTemplateUsage(templateId) {
    try {
      const { error } = await this.admin
        .from('templates')
        .update({
          usage_count: this.admin.raw('usage_count + 1'),
          updated_at: new Date().toISOString()
        })
        .eq('id', templateId);
      
      if (error) {
        throw error;
      }
    } catch (error) {
      console.error('Error incrementing template usage:', error);
      // Don't throw error for usage tracking
    }
  }

  // =====================================================
  // Scenario Operations
  // =====================================================

  /**
   * Get scenario by ID
   * @param {string} scenarioId - Scenario ID
   * @param {string} userId - User ID
   * @returns {Promise<Object>} Scenario data
   */
  async getScenarioById(scenarioId, userId) {
    try {
      const { data, error } = await this.admin
        .from('scenarios')
        .select('*')
        .eq('id', scenarioId)
        .eq('user_id', userId)
        .single();
      
      if (error && error.code !== 'PGRST116') {
        throw error;
      }
      
      return data;
    } catch (error) {
      console.error('Error getting scenario:', error);
      throw new Error(`Failed to get scenario: ${error.message}`);
    }
  }

  /**
   * Create a new scenario
   * @param {Object} scenarioData - Scenario data
   * @returns {Promise<Object>} Created scenario
   */
  async createScenario(scenarioData) {
    try {
      const { data, error } = await this.admin
        .from('scenarios')
        .insert({
          ...scenarioData,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single();
      
      if (error) {
        throw error;
      }
      
      return data;
    } catch (error) {
      console.error('Error creating scenario:', error);
      throw new Error(`Failed to create scenario: ${error.message}`);
    }
  }

  /**
   * Get user scenarios with filtering and pagination
   * @param {string} userId - User ID
   * @param {Object} options - Query options
   * @returns {Promise<Array>} User scenarios
   */
  async getUserScenarios(userId, options = {}) {
    try {
      let query = this.admin
        .from('scenarios')
        .select('*')
        .eq('user_id', userId);
      
      // Apply filters
      if (options.category) {
        query = query.eq('category', options.category);
      }
      
      if (options.tags && options.tags.length > 0) {
        query = query.contains('tags', options.tags);
      }
      
      if (options.search) {
        query = query.or(`title.ilike.%${options.search}%,description.ilike.%${options.search}%`);
      }
      
      // Apply sorting
      const sortBy = options.sortBy || 'created_at';
      const sortOrder = options.sortOrder === 'asc' ? { ascending: true } : { ascending: false };
      query = query.order(sortBy, sortOrder);
      
      // Apply pagination
      if (options.limit) {
        query = query.limit(options.limit);
      }
      
      if (options.offset) {
        query = query.range(options.offset, options.offset + (options.limit || 10) - 1);
      }
      
      const { data, error } = await query;
      
      if (error) {
        throw error;
      }
      
      return data || [];
    } catch (error) {
      console.error('Error getting user scenarios:', error);
      throw new Error(`Failed to get user scenarios: ${error.message}`);
    }
  }

  /**
   * Update scenario
   * @param {string} scenarioId - Scenario ID
   * @param {string} userId - User ID
   * @param {Object} updates - Scenario updates
   * @returns {Promise<Object>} Updated scenario
   */
  async updateScenario(scenarioId, userId, updates) {
    try {
      const { data, error } = await this.admin
        .from('scenarios')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', scenarioId)
        .eq('user_id', userId)
        .select()
        .single();
      
      if (error) {
        throw error;
      }
      
      return data;
    } catch (error) {
      console.error('Error updating scenario:', error);
      throw new Error(`Failed to update scenario: ${error.message}`);
    }
  }

  // =====================================================
  // Evaluation Metrics Operations
  // =====================================================

  /**
   * Log evaluation metrics
   * @param {Object} metricsData - Evaluation metrics data
   * @returns {Promise<Object>} Logged metrics
   */
  async logEvaluationMetrics(metricsData) {
    try {
      const { data, error } = await this.admin
        .from('evaluation_metrics')
        .insert({
          ...metricsData,
          created_at: new Date().toISOString()
        })
        .select()
        .single();
      
      if (error) {
        throw error;
      }
      
      return data;
    } catch (error) {
      console.error('Error logging evaluation metrics:', error);
      throw new Error(`Failed to log evaluation metrics: ${error.message}`);
    }
  }

  // =====================================================
  // User Active Projects Operations
  // =====================================================

  /**
   * Get active project for user (global, not per-chat)
   * @param {string} userId - User ID
   * @returns {Promise<Object>} Active project data
   */
  async getActiveProject(userId) {
    try {
      const { data, error } = await this.admin
        .from('jira_connections')
        .select('*')
        .eq('user_id', userId)
        .eq('is_active', true)
        .single();
      
      if (error && error.code !== 'PGRST116') {
        throw error;
      }
      
      return data;
    } catch (error) {
      console.error('Error getting active project:', error);
      throw new Error(`Failed to get active project: ${error.message}`);
    }
  }

  /**
   * Set active project for user (supports multiple active projects)
   * @param {string} userId - User ID
   * @param {string} connectionId - Connection ID to set as active
   * @returns {Promise<Object>} Set active project result
   */
  async setActiveProject(userId, connectionId) {
    try {
      // CHANGED: No longer set all connections to inactive
      // Multiple connections can be active simultaneously
      
      // Set the selected connection to active
      const { data, error } = await this.admin
        .from('jira_connections')
        .update({ 
          is_active: true,
          updated_at: new Date().toISOString()
        })
        .eq('id', connectionId)
        .eq('user_id', userId)
        .select('*')
        .single();
      
      if (error) throw error;
      
      return data;
    } catch (error) {
      console.error('Error setting active project:', error);
      throw new Error(`Failed to set active project: ${error.message}`);
    }
  }

  /**
   * Get all active projects for user (now supports multiple)
   * @param {string} userId - User ID
   * @returns {Promise<Array>} User's active projects
   */
  async getUserActiveProjects(userId) {
    try {
      const { data, error } = await this.admin
        .from('jira_connections')
        .select('*')
        .eq('user_id', userId)
        .eq('is_active', true)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      return data || [];
    } catch (error) {
      console.error('Error getting user active projects:', error);
      return [];
    }
  }

  /**
   * Clear active project for user (clears all active projects)
   * @param {string} userId - User ID
   * @returns {Promise<boolean>} Success status
   */
  async clearActiveProject(userId) {
    try {
      const { error } = await this.admin
        .from('jira_connections')
        .update({ is_active: false })
        .eq('user_id', userId);
      
      if (error) {
        throw error;
      }
      
      return true;
    } catch (error) {
      console.error('Error clearing active project:', error);
      throw new Error(`Failed to clear active project: ${error.message}`);
    }
  }

  // =====================================================
  // Error Logging
  // =====================================================

  /**
   * Log error to database
   * @param {Object} errorData - Error data
   * @returns {Promise<void>}
   */
  async logError(errorData) {
    try {
      const { error } = await this.admin
        .from('error_logs')
        .insert({
          ...errorData,
          created_at: new Date().toISOString()
        });
      
      if (error) {
        console.error('Failed to log error to database:', error);
      }
    } catch (error) {
      console.error('Error logging to database:', error);
      // Don't throw error for logging failures
    }
  }
}

// Create singleton instance
const supabaseService = new SupabaseService();

export default supabaseService;