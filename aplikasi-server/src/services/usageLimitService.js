import supabaseService from './supabaseService.js';
import { v4 as uuidv4 } from 'uuid';

/**
 * Usage Limit Service
 * 
 * Manages per-user, per-model request limits with 24-hour cooldown system.
 * Reset hanya terjadi 24 jam setelah last_reset_at, bukan tengah malam UTC.
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
   * @param {string} userId - User ID
   * @param {string} modelName - Model name (e.g., 'llama-3.1-8b-instant')
   * @returns {Promise<Object>}
   */
  async checkLimit(userId, modelName) {
    try {
      const client = supabaseService.getClient();

      // PENGECEKAN PROVIDER & LIMIT MODEL: Ambil info model dari database
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

      // PENGECEKAN PROVIDER & LIMIT MODEL: Ambil sisa request via database function (handle 24-hour cooldown)
      const { data: remainingData, error: remainingError } = await client
        .rpc('get_remaining_requests', {
          p_user_id: userId,
          p_model_id: model.id
        });

      if (remainingError) {
        throw remainingError;
      }

      const remaining = remainingData ?? model.daily_limit;
      const used = model.daily_limit - remaining;
      const allowed = remaining > 0;

      // PENGECEKAN PROVIDER & LIMIT MODEL: Hitung kapan cooldown berakhir (last_reset_at + 24 jam)
      let resetsAt = null;
      if (!allowed) {
        const { data: counter } = await client
          .from('usage_counters')
          .select('last_reset_at')
          .eq('user_id', userId)
          .eq('model_id', model.id)
          .single();

        if (counter?.last_reset_at) {
          const resetTime = new Date(counter.last_reset_at);
          resetTime.setHours(resetTime.getHours() + 24);
          resetsAt = resetTime.toISOString();
        }
      }

      const result = {
        allowed,
        modelName: model.name,
        displayName: model.display_name,
        provider: model.provider,
        dailyLimit: model.daily_limit,
        limit: model.daily_limit,
        used,
        remaining,
        modelId: model.id,
        resetsAt,
      };

      // PENGECEKAN PROVIDER & LIMIT MODEL: Jika limit habis, ambil daftar model alternatif
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
   * Increment usage counter dengan double-check defensif.
   * 
   * Walaupun middleware sudah memeriksa limit, kita re-check di sini untuk
   * mencegah race condition dan menjamin counter tidak melebihi daily_limit.
   */
  async incrementUsage(userId, modelName, requestId) {
    try {
      const client = supabaseService.getClient();

      // Get model info
      const { data: modelData, error: modelError } = await client
        .from('models')
        .select('id, daily_limit, display_name')
        .eq('name', modelName)
        .eq('is_active', true)
        .single();

      if (modelError) {
        throw modelError;
      }

      // ✅ Double-check: pastikan masih ada quota sebelum increment
      const { data: remainingData, error: remainingError } = await client
        .rpc('get_remaining_requests', {
          p_user_id: userId,
          p_model_id: modelData.id
        });

      if (remainingError) {
        throw remainingError;
      }

      const remaining = remainingData ?? modelData.daily_limit;

      if (remaining <= 0) {
        const err = new Error(`Limit habis untuk model ${modelData.display_name}. Tunggu cooldown 24 jam.`);
        err.code = 'USAGE_LIMIT_EXCEEDED';
        throw err;
      }

      // Increment via database function (handles 24-hour cooldown reset)
      const { data, error } = await client
        .rpc('increment_usage_with_reset', {
          p_user_id: userId,
          p_model_id: modelData.id
        });

      if (error) {
        throw error;
      }

      const result = data[0];

      return {
        newCount: result.new_count,
        remaining: result.remaining,
        wasReset: result.was_reset
      };
    } catch (error) {
      console.error('Error incrementing usage:', error);
      throw error; // ✅ propagate original error (jangan wrap kalau ada code USAGE_LIMIT_EXCEEDED)
    }
  }

  /**
   * Get usage information for all models for a user
   */
  async getUserUsage(userId) {
    try {
      const client = supabaseService.getClient();

      const { data, error } = await client
        .from('user_model_usage')
        .select('*')
        .eq('user_id', userId)
        .order('daily_limit', { ascending: false });

      if (error) {
        throw error;
      }

      return data.map(row => {
        // ✅ Jika needs_reset = true, remaining seharusnya = daily_limit penuh
        // (cooldown sudah berakhir, request berikutnya akan trigger reset).
        const effectiveRemaining = row.needs_reset 
          ? row.daily_limit 
          : row.remaining;
        const effectiveUsed = row.needs_reset ? 0 : row.current_count;

        return {
          id: row.model_id,
          name: row.model_name,
          displayName: row.display_name,
          provider: row.provider || 'unknown',
          dailyLimit: row.daily_limit,
          limit: row.daily_limit,
          used: effectiveUsed,
          remaining: effectiveRemaining,
          needsReset: row.needs_reset,
          lastResetAt: row.last_reset_at,
          resetsAt: row.resets_at,
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
