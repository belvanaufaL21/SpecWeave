import usageLimitService from '../services/usageLimitService.js';
import supabaseService from '../services/supabaseService.js';
import { AppError } from '../middlewares/errorHandler.js';

/**
 * Usage Controller
 * Handles usage limit and history endpoints
 */

/**
 * Get usage limits for all models for authenticated user
 * GET /api/usage/limits
 */
export const getUserLimits = async (req, res, next) => {
  try {
    if (!req.user) {
      throw new AppError('User not authenticated', 401);
    }

    const models = await usageLimitService.getUserUsage(req.user.id);

    res.json({
      success: true,
      data: {
        models
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get usage history for authenticated user
 * GET /api/usage/history
 * Query params: limit, offset, model (optional filter)
 */
export const getUserHistory = async (req, res, next) => {
  try {
    if (!req.user) {
      throw new AppError('User not authenticated', 401);
    }

    const { limit = 50, offset = 0, model } = req.query;
    const userId = req.user.id;

    // Parse pagination params
    const limitInt = parseInt(limit);
    const offsetInt = parseInt(offset);

    if (isNaN(limitInt) || limitInt < 1 || limitInt > 100) {
      throw new AppError('Limit must be between 1 and 100', 400);
    }

    if (isNaN(offsetInt) || offsetInt < 0) {
      throw new AppError('Offset must be a non-negative integer', 400);
    }

    const client = supabaseService.getClient();

    // Build query
    let query = client
      .from('usage_history')
      .select(`
        id,
        request_id,
        success,
        error_message,
        created_at,
        models!inner (
          name,
          display_name
        )
      `, { count: 'exact' })
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .range(offsetInt, offsetInt + limitInt - 1);

    // Apply model filter if provided
    if (model) {
      query = query.eq('models.name', model);
    }

    const { data, error, count } = await query;

    if (error) {
      throw error;
    }

    // Transform data to match expected format
    const history = data.map(record => ({
      id: record.id,
      model: record.models.name,
      displayName: record.models.display_name,
      success: record.success,
      errorMessage: record.error_message,
      requestId: record.request_id,
      createdAt: record.created_at
    }));

    res.json({
      success: true,
      data: {
        history,
        total: count || 0,
        limit: limitInt,
        offset: offsetInt
      }
    });
  } catch (error) {
    next(error);
  }
};
