import { supabaseAdmin, supabaseClient } from '../config/supabase.js';

/**
 * Supabase Service for database operations
 * Uses admin client for server-side operations and regular client for user operations
 */
class SupabaseService {
  constructor() {
    this.admin = supabaseAdmin;
    this.client = supabaseClient;
  }

  // =====================================================
  // User Profile Operations
  // =====================================================

  async createUserProfile(userId, profileData) {
    const { data, error } = await this.admin
      .from('profiles')
      .insert({
        id: userId,
        ...profileData
      })
      .select()
      .single();

    if (error) throw new Error(`Failed to create user profile: ${error.message}`);
    return data;
  }

  async getUserProfile(userId) {
    const { data, error } = await this.admin
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
      throw new Error(`Failed to get user profile: ${error.message}`);
    }
    return data;
  }

  async updateUserProfile(userId, updates) {
    const { data, error } = await this.admin
      .from('profiles')
      .update(updates)
      .eq('id', userId)
      .select()
      .single();

    if (error) throw new Error(`Failed to update user profile: ${error.message}`);
    return data;
  }

  // =====================================================
  // Scenario Operations
  // =====================================================

  async createScenario(scenarioData) {
    const { data, error } = await this.admin
      .from('scenarios')
      .insert(scenarioData)
      .select()
      .single();

    if (error) throw new Error(`Failed to create scenario: ${error.message}`);
    return data;
  }

  async getUserScenarios(userId, options = {}) {
    const { limit = 50, offset = 0, tags, search } = options;
    
    let query = this.admin
      .from('scenarios')
      .select(`
        *,
        template:templates(name, category)
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (limit) query = query.limit(limit);
    if (offset) query = query.range(offset, offset + limit - 1);
    if (tags && tags.length > 0) {
      query = query.overlaps('tags', tags);
    }
    if (search) {
      query = query.or(`title.ilike.%${search}%,user_story.ilike.%${search}%,description.ilike.%${search}%`);
    }

    const { data, error } = await query;

    if (error) throw new Error(`Failed to get user scenarios: ${error.message}`);
    return data;
  }

  async getScenarioById(scenarioId, userId = null) {
    let query = this.admin
      .from('scenarios')
      .select(`
        *,
        template:templates(name, category),
        evaluation_metrics(*)
      `)
      .eq('id', scenarioId);

    // If userId is provided, ensure user owns the scenario or it's public
    if (userId) {
      query = query.or(`user_id.eq.${userId},is_public.eq.true`);
    }

    const { data, error } = await query.single();

    if (error) throw new Error(`Failed to get scenario: ${error.message}`);
    return data;
  }

  async updateScenario(scenarioId, userId, updates) {
    const { data, error } = await this.admin
      .from('scenarios')
      .update(updates)
      .eq('id', scenarioId)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) throw new Error(`Failed to update scenario: ${error.message}`);
    return data;
  }

  async deleteScenario(scenarioId, userId) {
    const { error } = await this.admin
      .from('scenarios')
      .delete()
      .eq('id', scenarioId)
      .eq('user_id', userId);

    if (error) throw new Error(`Failed to delete scenario: ${error.message}`);
    return true;
  }

  // =====================================================
  // Template Operations
  // =====================================================

  async getTemplates(category = null, userId = null) {
    let query = this.admin
      .from('templates')
      .select('*')
      .order('usage_count', { ascending: false });

    // Get system templates and user's own templates
    if (userId) {
      query = query.or(`is_system.eq.true,created_by.eq.${userId}`);
    } else {
      query = query.eq('is_system', true);
    }

    if (category) {
      query = query.eq('category', category);
    }

    const { data, error } = await query;

    if (error) throw new Error(`Failed to get templates: ${error.message}`);
    return data;
  }

  async createTemplate(templateData) {
    const { data, error } = await this.admin
      .from('templates')
      .insert(templateData)
      .select()
      .single();

    if (error) throw new Error(`Failed to create template: ${error.message}`);
    return data;
  }

  async updateTemplate(templateId, userId, updates) {
    const { data, error } = await this.admin
      .from('templates')
      .update(updates)
      .eq('id', templateId)
      .eq('created_by', userId)
      .eq('is_system', false)
      .select()
      .single();

    if (error) throw new Error(`Failed to update template: ${error.message}`);
    return data;
  }

  async incrementTemplateUsage(templateId) {
    const { error } = await this.admin
      .rpc('increment_template_usage', { template_id: templateId });

    if (error) throw new Error(`Failed to increment template usage: ${error.message}`);
    return true;
  }

  // =====================================================
  // JIRA Connection Operations
  // =====================================================

  async createJiraConnection(connectionData) {
    const { data, error } = await this.admin
      .from('jira_connections')
      .insert(connectionData)
      .select()
      .single();

    if (error) throw new Error(`Failed to create JIRA connection: ${error.message}`);
    return data;
  }

  async getUserJiraConnections(userId) {
    const { data, error } = await this.admin
      .from('jira_connections')
      .select('*')
      .eq('user_id', userId)
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (error) throw new Error(`Failed to get JIRA connections: ${error.message}`);
    return data;
  }

  async updateJiraConnection(connectionId, userId, updates) {
    const { data, error } = await this.admin
      .from('jira_connections')
      .update(updates)
      .eq('id', connectionId)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) throw new Error(`Failed to update JIRA connection: ${error.message}`);
    return data;
  }

  async deleteJiraConnection(connectionId, userId) {
    console.log(`🗑️ [SUPABASE] Deleting JIRA connection ${connectionId} for user ${userId}`);
    
    const { data, error } = await this.admin
      .from('jira_connections')
      .delete()
      .eq('id', connectionId)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) {
      console.error(`❌ [SUPABASE] Delete error:`, error);
      throw new Error(`Failed to delete JIRA connection: ${error.message}`);
    }

    console.log(`✅ [SUPABASE] Successfully deleted connection:`, data);
    return data;
  }

  // =====================================================
  // Evaluation Metrics Operations
  // =====================================================

  async logEvaluationMetrics(metricsData) {
    const { data, error } = await this.admin
      .from('evaluation_metrics')
      .insert(metricsData)
      .select()
      .single();

    if (error) throw new Error(`Failed to log evaluation metrics: ${error.message}`);
    return data;
  }

  async getUserEvaluationMetrics(userId, options = {}) {
    const { limit = 100, timeRange = '30 days' } = options;
    
    let query = this.admin
      .from('evaluation_metrics')
      .select('*')
      .eq('user_id', userId)
      .gte('created_at', new Date(Date.now() - this.parseTimeRange(timeRange)).toISOString())
      .order('created_at', { ascending: false });

    if (limit) query = query.limit(limit);

    const { data, error } = await query;

    if (error) throw new Error(`Failed to get evaluation metrics: ${error.message}`);
    return data;
  }

  // =====================================================
  // Performance Logs Operations
  // =====================================================

  async logPerformanceMetrics(performanceData) {
    const { data, error } = await this.admin
      .from('performance_logs')
      .insert(performanceData)
      .select()
      .single();

    if (error) throw new Error(`Failed to log performance metrics: ${error.message}`);
    return data;
  }

  async getPerformanceMetrics(options = {}) {
    const { userId, operationType, timeRange = '24 hours', limit = 1000 } = options;
    
    let query = this.admin
      .from('performance_logs')
      .select('*')
      .gte('created_at', new Date(Date.now() - this.parseTimeRange(timeRange)).toISOString())
      .order('created_at', { ascending: false });

    if (userId) query = query.eq('user_id', userId);
    if (operationType) query = query.eq('operation_type', operationType);
    if (limit) query = query.limit(limit);

    const { data, error } = await query;

    if (error) throw new Error(`Failed to get performance metrics: ${error.message}`);
    return data;
  }

  // =====================================================
  // Analytics and Statistics
  // =====================================================

  async getUserStats(userId) {
    const { data, error } = await this.admin
      .from('user_scenario_stats')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error && error.code !== 'PGRST116') {
      throw new Error(`Failed to get user stats: ${error.message}`);
    }
    return data;
  }

  async getQualityTrends(timeRange = '30 days') {
    const { data, error } = await this.admin
      .from('quality_trends')
      .select('*')
      .gte('date', new Date(Date.now() - this.parseTimeRange(timeRange)).toISOString())
      .order('date', { ascending: false });

    if (error) throw new Error(`Failed to get quality trends: ${error.message}`);
    return data;
  }

  // =====================================================
  // Utility Methods
  // =====================================================

  parseTimeRange(timeRange) {
    const units = {
      'hour': 60 * 60 * 1000,
      'hours': 60 * 60 * 1000,
      'day': 24 * 60 * 60 * 1000,
      'days': 24 * 60 * 60 * 1000,
      'week': 7 * 24 * 60 * 60 * 1000,
      'weeks': 7 * 24 * 60 * 60 * 1000,
      'month': 30 * 24 * 60 * 60 * 1000,
      'months': 30 * 24 * 60 * 60 * 1000
    };

    const match = timeRange.match(/^(\d+)\s*(\w+)$/);
    if (!match) return 24 * 60 * 60 * 1000; // Default to 24 hours

    const [, number, unit] = match;
    return parseInt(number) * (units[unit.toLowerCase()] || units.hours);
  }

  // =====================================================
  // Error Logging Operations
  // =====================================================

  async logError(errorData) {
    try {
      // For now, we'll log to performance_logs table with error type
      const { data, error } = await this.admin
        .from('performance_logs')
        .insert({
          request_id: `error_${Date.now()}`,
          operation_type: errorData.error_type || 'error',
          start_time: new Date().toISOString(),
          end_time: new Date().toISOString(),
          duration_ms: 0,
          success: false,
          error_message: errorData.details || 'Unknown error',
          metadata: {
            service: errorData.service || 'unknown',
            timestamp: errorData.timestamp || new Date().toISOString()
          }
        })
        .select()
        .single();

      if (error) throw new Error(`Failed to log error: ${error.message}`);
      return data;
    } catch (error) {
      console.error('Failed to log error to database:', error);
      return null;
    }
  }

  // Test database connection
  async testConnection() {
    try {
      const { data, error } = await this.admin
        .from('profiles')
        .select('count')
        .limit(1);

      if (error) throw error;
      return { success: true, message: 'Database connection successful' };
    } catch (error) {
      return { success: false, message: `Database connection failed: ${error.message}` };
    }
  }
}

export default new SupabaseService();