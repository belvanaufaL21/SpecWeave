import supabaseService from '../services/supabaseService.js';
import { AppError } from '../middlewares/errorHandler.js';

/**
 * Test Controller for database and authentication testing
 */

/**
 * Test database connection
 */
export const testDatabase = async (req, res, next) => {
  try {
    const result = await supabaseService.testConnection();
    
    res.json({
      success: true,
      message: 'Database connection test completed',
      data: result
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Test authentication (protected route)
 */
export const testAuth = async (req, res, next) => {
  try {
    if (!req.user) {
      throw new AppError('Authentication test failed - no user found', 401);
    }

    res.json({
      success: true,
      message: 'Authentication test successful',
      data: {
        user_id: req.user.id,
        email: req.user.email,
        role: req.user.profile?.role || req.user.user_metadata?.role || 'user',
        authenticated_at: new Date().toISOString()
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Test user profile operations
 */
export const testProfile = async (req, res, next) => {
  try {
    const userId = req.user.id;
    
    // Get user profile
    const profile = await supabaseService.getUserProfile(userId);
    
    res.json({
      success: true,
      message: 'Profile test successful',
      data: {
        profile,
        has_profile: !!profile
      }
    });
  } catch (error) {
    next(error);
  }
};