import supabaseService from './supabaseService.js';
import { v4 as uuidv4 } from 'uuid';

/**
 * Usage Limit Service
 * 
 * Manages per-user, per-model daily request limits for LLM usage.
 * Simple system: Each model has its own daily limit, auto-resets at midnight UTC.
 * 
 * Key responsibilities:
 * - Check if user can make request to a model (checkLimit)
 * - Increment usage counter with auto-reset (incrementUsage)
 * - Fetch user's usage across all models (getUserUsage)
 * - Find alternative models with remaining quota (getAlternativeModels)
 * - Record request history for analytics (recordRequest)
 */
class UsageLimitService {
  /**
   * Check if user can make request to model
   * 
   * Uses the database function get_remaining_requests which handles daily reset logic.
   * 
   * @param {string} userId - User ID
   * @param {string} modelName - Model name (e.g., 'llama-3.1-8b-instant')
   * @returns {Promise<{
   *   allowed: boolean,
   *   modelName: string,
   *   displayName: string,
   *   provider: string,
   *   dailyLimit: number,
   *   used: number,
   *   remaining: number,
   *   modelId: string,
   *   resetsAt: string,
   *   alternatives?: Array
   * }>}
   */
  async checkLimit(userId, modelName) {
    try {
      const client = supabaseService.getClient();

      // Get model info
      const { data: model, error: modelError } = await client
        .from('models')
        .select('id, name, display_name, provider, daily_limit')
        .eq('name', modelName)
        .eq('is_active', true)
        .single();

      if (modelError) {
        if (modelError.code === 'PGRST116') {
          throw new Error(`Model not found: ${modelName}`);
        }
        throw modelError;
      }

      // Get remaining requests using database function
      const { data: remainingData, error: remainingError } = await client
        .rpc('get_remaining_requests', {
          p_user_id: userId,
          p_model_id: model.id
        });

      if (remainingError) {
        throw remainingError;
      }

      const remaining = remainingData || model.daily_limit;
      const used = model.daily_limit - remaining;
      const allowed = remaining > 0;

      // Calculate next reset time (midnight UTC)
      const now = new Date();
      const tomorrow = new Date(now);
      tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
      tomorrow.setUTCHours(0, 0, 0, 0);

      const result = {
        allowed,
        modelName: model.name,
        displayName: model.display_name,
        provider: model.provider,
        dailyLimit: model.daily_limit,
        used,
        remaining,
        modelId: model.id,
        resetsAt: tomorrow.toISOString(),
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
   * Increment usage counter with auto-reset
   * 
   * Uses database function increment_usage_with_reset which handles:
   * - Auto-reset if last reset was yesterday
   * - Atomic increment
   * - Returns new count and remaining
   * 
   * @param {string} userId - User ID
   * @param {string} modelName - Model name
   * @param {string} requestId - Request ID for tracking
   * @returns {Promise<{newCount: number, remaining: number, wasReset: boolean}>}
   */
  async incrementUsage(userId, modelName, requestId) {
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
        throw modelError;
      }

      // Increment using database function (handles auto-reset)
      const { data, error } = await client
        .rpc('increment_usage_with_reset', {
          p_user_id: userId,
          p_model_id: modelData.id
        });

      if (error) {
        throw error;
      }

      // data is array with one row
      const result = data[0];

      return {
        newCount: result.new_count,
        remaining: result.remaining,
        wasReset: result.was_reset
      };
    } catch (error) {
      console.error('Error incrementing usage:', error);
      throw new Error(`Failed to increment usage: ${error.message}`);
    }
  }

  /**
   * Get usage information for all models for a user
   * 
   * Uses the user_model_usage view which includes reset status.
   * 
   * @param {string} userId - User ID
   * @returns {Promise<Array<{
   *   id: string,
   *   name: string,
   *   displayName: string,
   *   provider: string,
   *   dailyLimit: number,
   *   used: number,
   *   remaining: number,
   *   needsReset: boolean,
   *   lastResetAt: string
   * }>>}
   */
  async getUserUsage(userId) {
    try {
      const client = supabaseService.getClient();

      // Use the view for easy access
      const { data, error } = await client
        .from('user_model_usage')
        .select('*')
        .eq('user_id', userId)
        .order('daily_limit', { ascending: false });

      if (error) {
        throw error;
      }

      return data.map(row => ({
        id: row.model_id,
        name: row.model_name,
        displayName: row.display_name,
        provider: row.provider || 'unknown',
        dailyLimit: row.daily_limit,
        used: row.current_count,
        remaining: row.remaining,
        needsReset: row.needs_reset,
        lastResetAt: row.last_reset_at
      }));
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
   *   dailyLimit: number,
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
          dailyLimit: model.dailyLimit,
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
