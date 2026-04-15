import usageLimitService from '../services/usageLimitService.js';

/**
 * Usage Limit Middleware
 * 
 * Validates per-user, per-model request limits before processing LLM requests.
 * Returns 429 with alternatives when limit exceeded.
 * Attaches limit info (including provider) to req.usageLimit for controller use.
 * 
 * Requirements: 3.1, 3.2, 3.3, 3.4, 4.1, 4.2
 */

/**
 * Middleware to check usage limits before processing request.
 * 
 * Flow:
 * 1. Skip check for anonymous users (no req.user.id)
 * 2. Extract model from request body (default: 'llama-3.1-8b-instant')
 * 3. Call usageLimitService.checkLimit to validate quota
 * 4. If limit exceeded, return 429 with error details and alternatives
 * 5. If allowed, attach limit info to req.usageLimit for controller
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
export const checkUsageLimit = async (req, res, next) => {
  // Handle anonymous users - skip limit checks
  if (!req.user?.id) {
    return next();
  }

  try {
    // Extract model from request body, default to economy tier model
    const modelName = req.body.model || 'llama-3.1-8b-instant';

    // Check if user has remaining quota for this model
    const limitCheck = await usageLimitService.checkLimit(req.user.id, modelName);

    // If limit exceeded, return 429 with alternatives
    if (!limitCheck.allowed) {
      return res.status(429).json({
        success: false,
        error: {
          code: 'USAGE_LIMIT_EXCEEDED',
          message: `Batas request tercapai untuk model ${limitCheck.displayName} (${limitCheck.tier} tier: ${limitCheck.limit} request).`,
          model: limitCheck.modelName,
          displayName: limitCheck.displayName,
          tier: limitCheck.tier,
          limit: limitCheck.limit,
          used: limitCheck.used,
          alternatives: limitCheck.alternatives,
        },
      });
    }

    // Attach limit info and provider to request for use in controller
    req.usageLimit = limitCheck;
    next();
  } catch (error) {
    // Pass errors to error handling middleware
    next(error);
  }
};
