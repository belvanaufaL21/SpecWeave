import authService from '../services/authService.js';
import supabaseService from '../services/supabaseService.js';
import { AppError } from '../middlewares/errorHandler.js';

/**
 * Authentication Controller
 * Handles authentication-related endpoints
 */

/**
 * Get current user profile
 */
export const getCurrentUser = async (req, res, next) => {
  try {
    if (!req.user) {
      throw new AppError('User not authenticated', 401);
    }

    // Get user statistics
    const stats = await supabaseService.getUserStats(req.user.id);

    const response = {
      success: true,
      data: {
        user: req.user,
        stats: stats || {
          total_scenarios: 0,
          scenarios_last_30_days: 0,
          avg_meteor_score: null,
          avg_generation_time_ms: null,
          high_quality_scenarios: 0
        }
      }
    };

    res.json(response);
  } catch (error) {
    next(error);
  }
};

/**
 * Update user profile
 */
export const updateProfile = async (req, res, next) => {
  try {
    const { name, avatar_url, preferences } = req.body;
    const userId = req.user.id;

    // Validate input
    if (name && (typeof name !== 'string' || name.trim().length === 0)) {
      throw new AppError('Name must be a non-empty string', 400);
    }

    if (avatar_url && typeof avatar_url !== 'string') {
      throw new AppError('Avatar URL must be a string', 400);
    }

    if (preferences && typeof preferences !== 'object') {
      throw new AppError('Preferences must be an object', 400);
    }

    // Update profile
    const updates = {};
    if (name !== undefined) updates.name = name.trim();
    if (avatar_url !== undefined) updates.avatar_url = avatar_url;
    if (preferences !== undefined) updates.preferences = preferences;

    const updatedProfile = await authService.updateUserProfile(userId, updates);

    res.json({
      success: true,
      data: updatedProfile,
      message: 'Profile updated successfully'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Change user password
 */
export const changePassword = async (req, res, next) => {
  try {
    const { newPassword } = req.body;
    const userId = req.user.id;

    // Validate password
    if (!newPassword || typeof newPassword !== 'string') {
      throw new AppError('New password is required', 400);
    }

    if (newPassword.length < 8) {
      throw new AppError('Password must be at least 8 characters long', 400);
    }

    // Update password
    await authService.updatePassword(userId, newPassword);

    res.json({
      success: true,
      message: 'Password updated successfully'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Send password reset email
 */
export const requestPasswordReset = async (req, res, next) => {
  try {
    const { email } = req.body;

    if (!email || typeof email !== 'string') {
      throw new AppError('Email is required', 400);
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      throw new AppError('Invalid email format', 400);
    }

    await authService.sendPasswordReset(email);

    res.json({
      success: true,
      message: 'Password reset email sent successfully'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Refresh authentication token
 */
export const refreshToken = async (req, res, next) => {
  try {
    const { refresh_token } = req.body;

    if (!refresh_token) {
      throw new AppError('Refresh token is required', 400);
    }

    const sessionData = await authService.refreshSession(refresh_token);

    res.json({
      success: true,
      data: sessionData,
      message: 'Token refreshed successfully'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Sign out user
 */
export const signOut = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authService.extractToken(authHeader);

    if (token) {
      await authService.signOut(token);
    }

    res.json({
      success: true,
      message: 'Signed out successfully'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete user account
 */
export const deleteAccount = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { confirmation } = req.body;

    // Require explicit confirmation
    if (confirmation !== 'DELETE_MY_ACCOUNT') {
      throw new AppError('Account deletion requires explicit confirmation', 400);
    }

    // Delete user (this will cascade delete all related data due to foreign key constraints)
    await authService.deleteUser(userId);

    res.json({
      success: true,
      message: 'Account deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Generate API key for user
 */
export const generateApiKey = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { name, description } = req.body;

    // Generate API key
    const apiKey = authService.generateApiKey(userId);

    // In a real implementation, store the API key in the database
    // For now, just return it
    res.json({
      success: true,
      data: {
        api_key: apiKey,
        name: name || 'Default API Key',
        description: description || 'Generated API key for programmatic access',
        created_at: new Date().toISOString()
      },
      message: 'API key generated successfully'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get user's API keys
 */
export const getApiKeys = async (req, res, next) => {
  try {
    // In a real implementation, fetch from database
    // For now, return empty array
    res.json({
      success: true,
      data: [],
      message: 'API keys retrieved successfully'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Revoke API key
 */
export const revokeApiKey = async (req, res, next) => {
  try {
    const { keyId } = req.params;

    // In a real implementation, mark API key as revoked in database
    res.json({
      success: true,
      message: 'API key revoked successfully'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get user activity log
 */
export const getActivityLog = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { limit = 50, offset = 0, timeRange = '30 days' } = req.query;

    // Get performance logs for user activity
    const activityLogs = await supabaseService.getPerformanceMetrics({
      userId,
      timeRange,
      limit: parseInt(limit)
    });

    res.json({
      success: true,
      data: activityLogs,
      pagination: {
        limit: parseInt(limit),
        offset: parseInt(offset),
        total: activityLogs.length
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Admin: Get all users
 */
export const getAllUsers = async (req, res, next) => {
  try {
    const { limit = 50, offset = 0, role } = req.query;

    // This would require admin privileges
    if (!authService.hasRole(req.user, 'admin')) {
      throw new AppError('Admin privileges required', 403);
    }

    // In a real implementation, fetch users from Supabase Auth
    // For now, return placeholder
    res.json({
      success: true,
      data: [],
      pagination: {
        limit: parseInt(limit),
        offset: parseInt(offset),
        total: 0
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Admin: Create user
 */
export const createUser = async (req, res, next) => {
  try {
    const { email, password, name, role = 'user' } = req.body;

    // Require admin privileges
    if (!authService.hasRole(req.user, 'admin')) {
      throw new AppError('Admin privileges required', 403);
    }

    // Validate input
    if (!email || !password || !name) {
      throw new AppError('Email, password, and name are required', 400);
    }

    if (!['user', 'admin'].includes(role)) {
      throw new AppError('Invalid role specified', 400);
    }

    const newUser = await authService.createUser({
      email,
      password,
      name,
      role
    });

    res.status(201).json({
      success: true,
      data: newUser,
      message: 'User created successfully'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Admin: Update user
 */
export const updateUser = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const updates = req.body;

    // Require admin privileges
    if (!authService.hasRole(req.user, 'admin')) {
      throw new AppError('Admin privileges required', 403);
    }

    const updatedUser = await authService.updateUser(userId, updates);

    res.json({
      success: true,
      data: updatedUser,
      message: 'User updated successfully'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Admin: Delete user
 */
export const deleteUser = async (req, res, next) => {
  try {
    const { userId } = req.params;

    // Require admin privileges
    if (!authService.hasRole(req.user, 'admin')) {
      throw new AppError('Admin privileges required', 403);
    }

    // Prevent self-deletion
    if (userId === req.user.id) {
      throw new AppError('Cannot delete your own account', 400);
    }

    await authService.deleteUser(userId);

    res.json({
      success: true,
      message: 'User deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};