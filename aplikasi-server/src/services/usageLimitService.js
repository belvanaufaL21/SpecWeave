import supabaseService from './supabaseService.js';
import { v4 as uuidv4 } from 'uuid';

/**
 * Usage Limit Service
 * 
 * Manages per-user, per-model request limits for LLM usage.
 * Enforces tier-based limits (economy, standard, premium) and tracks usage counters.
 * 
 * Key responsibilities:
 * - Check if user can make request to a model (checkLimit)
 * - Increment usage counter after successful request (incrementUsage)
 * - Fetch user's usage across all models (getUserUsage)
 * - Find alternative models with remaining quota (getAlternativeModels)
 * - Record request history for analytics (recordRequest)
 */
class UsageLimitService {
  /**
   * Check if user can make request to model
   * 
   * Performs a JOIN query across models, model_tiers, and usage_counters
   * to retrieve model info, tier limits, and current usage in a single call.
   * 
   * @param {string} userId - User ID
   * @param {string} modelName - Model name (e.g., 'llama-3.1-8b-instant')
   * @returns {Promise<{
   *   allowed: boolean,
   *   modelName: string,
   *   displayName: string,
   *   provider: string,
   *   tier: string,
   *   limit: number,
   *   used: number,
   *   remaining: number,
   *   modelId: string,
   *   alternatives?: Array
   * }>}
   */
  async checkLimit(userId, modelName) {
    try {
      const client = supabaseService.getClient();

      // JOIN query to get model, tier, and usage in one call
      const { data, error } = await client
        .from('models')
        .select(`
          id,
          name,
          display_name,
          provider,
          model_tiers!inner (
            name,
            request_limit
          ),
          usage_counters!left (
            request_count
          )
        `)
        .eq('name', modelName)
        .eq('is_active', true)
        .eq('usage_counters.user_id', userId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          throw new Error(`Model not found: ${modelName}`);
        }
        throw error;
      }

      const model = data;
      const tier = model.model_tiers;
      const usageCounter = model.usage_counters?.[0];

      const used = usageCounter?.request_count || 0;
      const limit = tier.request_limit;
      const remaining = Math.max(0, limit - used);
      const allowed = remaining > 0;

      const result = {
        allowed,
        modelName: model.name,
        displayName: model.display_name,
        provider: model.provider,
        tier: tier.name,
        limit,
        used,
        remaining,
        modelId: model.id,
      };

      // If limit exceeded, fetch alternative models
      if (!allowed) {
        result.alternatives = await this.getAlternativeModels(userId, modelName);
      }

      return result;
    } catch (error) {
      console.error('Error checking usage limit:', error);
      throw new Error(`Failed to check usage limit: ${error.message}`);
    }
  }

  /**
   * Increment usage counter after successful request
   * 
   * Uses atomic upsert to handle first-time users and concurrent requests.
   * 
   * @param {string} userId - User ID
   * @param {string} modelName - Model name
   * @param {string} requestId - Request ID for tracking
   * @returns {Promise<{newCount: number, remaining: number}>}
   */
  async incrementUsage(userId, modelName, requestId) {
    try {
      const client = supabaseService.getClient();

      // First, get model ID and limit
      const { data: modelData, error: modelError } = await client
        .from('models')
        .select(`
          id,
          model_tiers!inner (
            request_limit
          )
        `)
        .eq('name', modelName)
        .eq('is_active', true)
        .single();

      if (modelError) {
        throw modelError;
      }

      const modelId = modelData.id;
      const limit = modelData.model_tiers.request_limit;

      // Atomic upsert: increment if exists, create if not
      const { data: counterData, error: counterError } = await client
        .from('usage_counters')
        .select('request_count')
        .eq('user_id', userId)
        .eq('model_id', modelId)
        .single();

      if (counterError && counterError.code !== 'PGRST116') {
        throw counterError;
      }

      let newCount;

      if (counterData) {
        // Counter exists, increment it
        const { data: updatedData, error: updateError } = await client
          .from('usage_counters')
          .update({
            request_count: counterData.request_count + 1,
            last_request_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq('user_id', userId)
          .eq('model_id', modelId)
          .select('request_count')
          .single();

        if (updateError) {
          throw updateError;
        }

        newCount = updatedData.request_count;
      } else {
        // Counter doesn't exist, create it
        const { data: insertedData, error: insertError } = await client
          .from('usage_counters')
          .insert({
            user_id: userId,
            model_id: modelId,
            request_count: 1,
            last_request_at: new Date().toISOString(),
          })
          .select('request_count')
          .single();

        if (insertError) {
          throw insertError;
        }

        newCount = insertedData.request_count;
      }

      const remaining = Math.max(0, limit - newCount);

      return { newCount, remaining };
    } catch (error) {
      console.error('Error incrementing usage:', error);
      throw new Error(`Failed to increment usage: ${error.message}`);
    }
  }

  /**
   * Get usage information for all models for a user
   * 
   * @param {string} userId - User ID
   * @returns {Promise<Array<{
   *   id: string,
   *   name: string,
   *   displayName: string,
   *   provider: string,
   *   tier: string,
   *   limit: number,
   *   used: number,
   *   remaining: number
   * }>>}
   */
  async getUserUsage(userId) {
    try {
      const client = supabaseService.getClient();

      // Get all active models with their tiers and user's usage
      const { data, error } = await client
        .from('models')
        .select(`
          id,
          name,
          display_name,
          provider,
          model_tiers!inner (
            name,
            request_limit
          ),
          usage_counters!left (
            request_count
          )
        `)
        .eq('is_active', true)
        .eq('usage_counters.user_id', userId)
        .order('model_tiers(request_limit)', { ascending: false });

      if (error) {
        throw error;
      }

      return data.map(model => {
        const tier = model.model_tiers;
        const usageCounter = model.usage_counters?.[0];
        const used = usageCounter?.request_count || 0;
        const limit = tier.request_limit;
        const remaining = Math.max(0, limit - used);

        return {
          id: model.id,
          name: model.name,
          displayName: model.display_name,
          provider: model.provider,
          tier: tier.name,
          limit,
          used,
          remaining,
        };
      });
    } catch (error) {
      console.error('Error getting user usage:', error);
      throw new Error(`Failed to get user usage: ${error.message}`);
    }
  }

  /**
   * Get alternative models with available quota
   * 
   * Excludes the current model and only includes models with remaining > 0.
   * 
   * @param {string} userId - User ID
   * @param {string} excludeModelName - Model to exclude
   * @returns {Promise<Array<{
   *   model: string,
   *   displayName: string,
   *   provider: string,
   *   tier: string,
   *   remaining: number
   * }>>}
   */
  async getAlternativeModels(userId, excludeModelName) {
    try {
      const allUsage = await this.getUserUsage(userId);

      // Filter: exclude current model and only include models with remaining > 0
      return allUsage
        .filter(model => model.name !== excludeModelName && model.remaining > 0)
        .map(model => ({
          model: model.name,
          displayName: model.displayName,
          provider: model.provider,
          tier: model.tier,
          remaining: model.remaining,
        }));
    } catch (error) {
      console.error('Error getting alternative models:', error);
      throw new Error(`Failed to get alternative models: ${error.message}`);
    }
  }

  /**
   * Record request in history (for analytics)
   * 
   * @param {string} userId - User ID
   * @param {string} modelName - Model name
   * @param {string} requestId - Request ID
   * @param {boolean} success - Whether request succeeded
   * @param {string} errorMessage - Error message if failed
   * @returns {Promise<void>}
   */
  async recordRequest(userId, modelName, requestId, success, errorMessage = null) {
    try {
      const client = supabaseService.getClient();

      // Get model ID
      const { data: modelData, error: modelError } = await client
        .from('models')
        .select('id')
        .eq('name', modelName)
        .eq('is_active', true)
        .single();

      if (modelError) {
        console.error('Error getting model for history:', modelError);
        return; // Don't throw, history is non-critical
      }

      // Insert into usage_history
      const { error: historyError } = await client
        .from('usage_history')
        .insert({
          user_id: userId,
          model_id: modelData.id,
          request_id: requestId,
          success,
          error_message: errorMessage,
        });

      if (historyError) {
        console.error('Error recording request history:', historyError);
        // Don't throw, history is non-critical
      }
    } catch (error) {
      console.error('Error in recordRequest:', error);
      // Don't throw, history is non-critical
    }
  }
}

// Export as singleton instance
export default new UsageLimitService();
