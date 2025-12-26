import { supabase } from '../config/supabase';

/**
 * Scenario Service for Supabase CRUD operations
 * Handles scenario creation, reading, updating, deletion with RLS policies
 * Includes scenario sharing, tagging, categorization, and real-time subscriptions
 */
class ScenarioService {
  /**
   * Create a new scenario
   * @param {Object} scenarioData - The scenario data
   * @returns {Promise<Object>} Created scenario
   */
  async createScenario(scenarioData) {
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user?.user) {
        throw new Error('User not authenticated');
      }

      const scenario = {
        user_id: user.user.id,
        title: scenarioData.title,
        user_story: scenarioData.userStory,
        feature_name: scenarioData.featureName,
        description: scenarioData.description,
        scenarios_json: scenarioData.scenariosJson,
        template_id: scenarioData.templateId || null,
        tags: scenarioData.tags || [],
        is_public: scenarioData.isPublic || false,
        jira_epic_id: scenarioData.jiraEpicId || null,
        jira_user_story_id: scenarioData.jiraUserStoryId || null,
        jira_subtask_ids: scenarioData.jiraSubtaskIds || [],
        meteor_score: scenarioData.meteorScore || null,
        generation_time_ms: scenarioData.generationTimeMs || null,
        quality_level: scenarioData.qualityLevel || null
      };

      const { data, error } = await supabase
        .from('scenarios')
        .insert([scenario])
        .select('*')
        .single();

      if (error) {
        throw new Error(`Failed to create scenario: ${error.message}`);
      }

      return { success: true, data };
    } catch (error) {
      console.error('Error creating scenario:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get scenarios for the current user with filtering and pagination
   * @param {Object} options - Query options
   * @returns {Promise<Object>} Scenarios with pagination info
   */
  async getUserScenarios(options = {}) {
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user?.user) {
        throw new Error('User not authenticated');
      }

      const {
        page = 1,
        limit = 10,
        search = '',
        tags = [],
        qualityLevel = null,
        sortBy = 'created_at',
        sortOrder = 'desc',
        includePublic = false
      } = options;

      let query = supabase
        .from('scenarios')
        .select(`
          *,
          template:templates(id, name, category)
        `, { count: 'exact' });

      // Filter by user or public scenarios
      if (includePublic) {
        query = query.or(`user_id.eq.${user.user.id},is_public.eq.true`);
      } else {
        query = query.eq('user_id', user.user.id);
      }

      // Search filter
      if (search) {
        query = query.or(`title.ilike.%${search}%,user_story.ilike.%${search}%,feature_name.ilike.%${search}%`);
      }

      // Tags filter
      if (tags.length > 0) {
        query = query.overlaps('tags', tags);
      }

      // Quality level filter
      if (qualityLevel) {
        query = query.eq('quality_level', qualityLevel);
      }

      // Sorting
      query = query.order(sortBy, { ascending: sortOrder === 'asc' });

      // Pagination
      const from = (page - 1) * limit;
      const to = from + limit - 1;
      query = query.range(from, to);

      const { data, error, count } = await query;

      if (error) {
        throw new Error(`Failed to fetch scenarios: ${error.message}`);
      }

      const totalPages = Math.ceil(count / limit);

      return {
        success: true,
        data: {
          scenarios: data || [],
          pagination: {
            page,
            limit,
            total: count,
            totalPages,
            hasNext: page < totalPages,
            hasPrev: page > 1
          }
        }
      };
    } catch (error) {
      console.error('Error fetching scenarios:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get a single scenario by ID
   * @param {string} scenarioId - The scenario ID
   * @returns {Promise<Object>} Scenario data
   */
  async getScenarioById(scenarioId) {
    try {
      const { data, error } = await supabase
        .from('scenarios')
        .select(`
          *,
          template:templates(id, name, category),
          user:profiles(id, name, avatar_url)
        `)
        .eq('id', scenarioId)
        .single();

      if (error) {
        throw new Error(`Failed to fetch scenario: ${error.message}`);
      }

      return { success: true, data };
    } catch (error) {
      console.error('Error fetching scenario:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Update a scenario
   * @param {string} scenarioId - The scenario ID
   * @param {Object} updates - The updates to apply
   * @returns {Promise<Object>} Updated scenario
   */
  async updateScenario(scenarioId, updates) {
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user?.user) {
        throw new Error('User not authenticated');
      }

      // Remove undefined values and prepare update object
      const cleanUpdates = Object.fromEntries(
        Object.entries(updates).filter(([_, value]) => value !== undefined)
      );

      const { data, error } = await supabase
        .from('scenarios')
        .update(cleanUpdates)
        .eq('id', scenarioId)
        .eq('user_id', user.user.id) // Ensure user owns the scenario
        .select('*')
        .single();

      if (error) {
        throw new Error(`Failed to update scenario: ${error.message}`);
      }

      return { success: true, data };
    } catch (error) {
      console.error('Error updating scenario:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Delete a scenario
   * @param {string} scenarioId - The scenario ID
   * @returns {Promise<Object>} Success status
   */
  async deleteScenario(scenarioId) {
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user?.user) {
        throw new Error('User not authenticated');
      }

      const { error } = await supabase
        .from('scenarios')
        .delete()
        .eq('id', scenarioId)
        .eq('user_id', user.user.id); // Ensure user owns the scenario

      if (error) {
        throw new Error(`Failed to delete scenario: ${error.message}`);
      }

      return { success: true };
    } catch (error) {
      console.error('Error deleting scenario:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Share a scenario (make it public or private)
   * @param {string} scenarioId - The scenario ID
   * @param {boolean} isPublic - Whether to make the scenario public
   * @returns {Promise<Object>} Updated scenario
   */
  async shareScenario(scenarioId, isPublic) {
    try {
      return await this.updateScenario(scenarioId, { is_public: isPublic });
    } catch (error) {
      console.error('Error sharing scenario:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Add tags to a scenario
   * @param {string} scenarioId - The scenario ID
   * @param {Array<string>} newTags - Tags to add
   * @returns {Promise<Object>} Updated scenario
   */
  async addTags(scenarioId, newTags) {
    try {
      // First get current tags
      const { data: scenario } = await this.getScenarioById(scenarioId);
      if (!scenario.success) {
        throw new Error('Scenario not found');
      }

      const currentTags = scenario.data.tags || [];
      const uniqueTags = [...new Set([...currentTags, ...newTags])];

      return await this.updateScenario(scenarioId, { tags: uniqueTags });
    } catch (error) {
      console.error('Error adding tags:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Remove tags from a scenario
   * @param {string} scenarioId - The scenario ID
   * @param {Array<string>} tagsToRemove - Tags to remove
   * @returns {Promise<Object>} Updated scenario
   */
  async removeTags(scenarioId, tagsToRemove) {
    try {
      // First get current tags
      const { data: scenario } = await this.getScenarioById(scenarioId);
      if (!scenario.success) {
        throw new Error('Scenario not found');
      }

      const currentTags = scenario.data.tags || [];
      const filteredTags = currentTags.filter(tag => !tagsToRemove.includes(tag));

      return await this.updateScenario(scenarioId, { tags: filteredTags });
    } catch (error) {
      console.error('Error removing tags:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get all unique tags for the current user
   * @returns {Promise<Object>} Array of unique tags
   */
  async getUserTags() {
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user?.user) {
        throw new Error('User not authenticated');
      }

      const { data, error } = await supabase
        .from('scenarios')
        .select('tags')
        .eq('user_id', user.user.id);

      if (error) {
        throw new Error(`Failed to fetch tags: ${error.message}`);
      }

      // Flatten and deduplicate tags
      const allTags = data.reduce((acc, scenario) => {
        if (scenario.tags) {
          acc.push(...scenario.tags);
        }
        return acc;
      }, []);

      const uniqueTags = [...new Set(allTags)].sort();

      return { success: true, data: uniqueTags };
    } catch (error) {
      console.error('Error fetching tags:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get user scenario statistics
   * @returns {Promise<Object>} User statistics
   */
  async getUserStats() {
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user?.user) {
        throw new Error('User not authenticated');
      }

      const { data, error } = await supabase
        .from('user_scenario_stats')
        .select('*')
        .eq('user_id', user.user.id)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
        throw new Error(`Failed to fetch stats: ${error.message}`);
      }

      // Return default stats if no data found
      const stats = data || {
        total_scenarios: 0,
        scenarios_last_30_days: 0,
        avg_meteor_score: null,
        avg_generation_time_ms: null,
        high_quality_scenarios: 0
      };

      return { success: true, data: stats };
    } catch (error) {
      console.error('Error fetching user stats:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Subscribe to real-time scenario updates
   * @param {Function} callback - Callback function for updates
   * @returns {Object} Subscription object
   */
  subscribeToScenarios(callback) {
    try {
      const subscription = supabase
        .channel('scenarios_changes')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'scenarios'
          },
          (payload) => {
            callback(payload);
          }
        )
        .subscribe();

      return {
        subscription,
        unsubscribe: () => {
          supabase.removeChannel(subscription);
        }
      };
    } catch (error) {
      console.error('Error setting up real-time subscription:', error);
      return null;
    }
  }

  /**
   * Search scenarios with advanced filtering
   * @param {Object} searchOptions - Advanced search options
   * @returns {Promise<Object>} Search results
   */
  async searchScenarios(searchOptions = {}) {
    try {
      const {
        query = '',
        tags = [],
        qualityLevels = [],
        dateFrom = null,
        dateTo = null,
        hasJiraIntegration = null,
        templateIds = [],
        includePublic = false,
        page = 1,
        limit = 10
      } = searchOptions;

      const { data: user } = await supabase.auth.getUser();
      if (!user?.user) {
        throw new Error('User not authenticated');
      }

      let supabaseQuery = supabase
        .from('scenarios')
        .select(`
          *,
          template:templates(id, name, category)
        `, { count: 'exact' });

      // User filter
      if (includePublic) {
        supabaseQuery = supabaseQuery.or(`user_id.eq.${user.user.id},is_public.eq.true`);
      } else {
        supabaseQuery = supabaseQuery.eq('user_id', user.user.id);
      }

      // Text search
      if (query) {
        supabaseQuery = supabaseQuery.or(`title.ilike.%${query}%,user_story.ilike.%${query}%,feature_name.ilike.%${query}%,description.ilike.%${query}%`);
      }

      // Tags filter
      if (tags.length > 0) {
        supabaseQuery = supabaseQuery.overlaps('tags', tags);
      }

      // Quality levels filter
      if (qualityLevels.length > 0) {
        supabaseQuery = supabaseQuery.in('quality_level', qualityLevels);
      }

      // Date range filter
      if (dateFrom) {
        supabaseQuery = supabaseQuery.gte('created_at', dateFrom);
      }
      if (dateTo) {
        supabaseQuery = supabaseQuery.lte('created_at', dateTo);
      }

      // JIRA integration filter
      if (hasJiraIntegration !== null) {
        if (hasJiraIntegration) {
          supabaseQuery = supabaseQuery.not('jira_epic_id', 'is', null);
        } else {
          supabaseQuery = supabaseQuery.is('jira_epic_id', null);
        }
      }

      // Template filter
      if (templateIds.length > 0) {
        supabaseQuery = supabaseQuery.in('template_id', templateIds);
      }

      // Pagination
      const from = (page - 1) * limit;
      const to = from + limit - 1;
      supabaseQuery = supabaseQuery.range(from, to);

      // Default sorting by creation date
      supabaseQuery = supabaseQuery.order('created_at', { ascending: false });

      const { data, error, count } = await supabaseQuery;

      if (error) {
        throw new Error(`Search failed: ${error.message}`);
      }

      const totalPages = Math.ceil(count / limit);

      return {
        success: true,
        data: {
          scenarios: data || [],
          pagination: {
            page,
            limit,
            total: count,
            totalPages,
            hasNext: page < totalPages,
            hasPrev: page > 1
          }
        }
      };
    } catch (error) {
      console.error('Error searching scenarios:', error);
      return { success: false, error: error.message };
    }
  }
}

// Export singleton instance
export const scenarioService = new ScenarioService();
export default scenarioService;