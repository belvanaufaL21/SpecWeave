import express from 'express';
import {
  getCurrentUser,
  updateProfile,
  changePassword,
  requestPasswordReset,
  refreshToken,
  signOut,
  deleteAccount,
  generateApiKey,
  getApiKeys,
  revokeApiKey,
  getActivityLog,
  getAllUsers,
  createUser,
  updateUser,
  deleteUser
} from '../controllers/authController.js';
import {
  authenticate,
  requireRole,
  rateLimitByUser,
  validateSession
} from '../middlewares/auth.js';
import { validateRequest } from '../middlewares/validation.js';
import { body, param, query } from 'express-validator';

const router = express.Router();

// =====================================================
// Public Routes (no authentication required)
// =====================================================

/**
 * @route POST /auth/password-reset
 * @desc Request password reset email
 * @access Public
 */
router.post('/password-reset',
  [
    body('email')
      .isEmail()
      .normalizeEmail()
      .withMessage('Valid email is required')
  ],
  validateRequest,
  rateLimitByUser({ maxRequests: 5, windowMs: 15 * 60 * 1000 }), // 5 requests per 15 minutes
  requestPasswordReset
);

/**
 * @route POST /auth/refresh
 * @desc Refresh authentication token
 * @access Public
 */
router.post('/refresh',
  [
    body('refresh_token')
      .notEmpty()
      .withMessage('Refresh token is required')
  ],
  validateRequest,
  refreshToken
);

// =====================================================
// Protected Routes (authentication required)
// =====================================================

/**
 * @route GET /auth/me
 * @desc Get current user profile
 * @access Private
 */
router.get('/me',
  authenticate,
  validateSession,
  getCurrentUser
);

/**
 * @route PUT /auth/profile
 * @desc Update user profile
 * @access Private
 */
router.put('/profile',
  authenticate,
  validateSession,
  [
    body('name')
      .optional()
      .isString()
      .trim()
      .isLength({ min: 1, max: 255 })
      .withMessage('Name must be between 1 and 255 characters'),
    body('avatar_url')
      .optional()
      .isURL()
      .withMessage('Avatar URL must be a valid URL'),
    body('preferences')
      .optional()
      .isObject()
      .withMessage('Preferences must be an object')
  ],
  validateRequest,
  rateLimitByUser({ maxRequests: 10, windowMs: 15 * 60 * 1000 }),
  updateProfile
);

/**
 * @route PUT /auth/password
 * @desc Change user password
 * @access Private
 */
router.put('/password',
  authenticate,
  validateSession,
  [
    body('newPassword')
      .isLength({ min: 8 })
      .withMessage('Password must be at least 8 characters long')
      .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
      .withMessage('Password must contain at least one lowercase letter, one uppercase letter, and one number')
  ],
  validateRequest,
  rateLimitByUser({ maxRequests: 3, windowMs: 15 * 60 * 1000 }),
  changePassword
);

/**
 * @route POST /auth/signout
 * @desc Sign out user
 * @access Private
 */
router.post('/signout',
  authenticate,
  signOut
);

/**
 * @route DELETE /auth/account
 * @desc Delete user account
 * @access Private
 */
router.delete('/account',
  authenticate,
  validateSession,
  [
    body('confirmation')
      .equals('DELETE_MY_ACCOUNT')
      .withMessage('Account deletion requires explicit confirmation')
  ],
  validateRequest,
  deleteAccount
);

/**
 * @route GET /auth/activity
 * @desc Get user activity log
 * @access Private
 */
router.get('/activity',
  authenticate,
  validateSession,
  [
    query('limit')
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage('Limit must be between 1 and 100'),
    query('offset')
      .optional()
      .isInt({ min: 0 })
      .withMessage('Offset must be a non-negative integer'),
    query('timeRange')
      .optional()
      .matches(/^\d+\s+(hours?|days?|weeks?|months?)$/)
      .withMessage('Time range must be in format "N days/hours/weeks/months"')
  ],
  validateRequest,
  getActivityLog
);

// =====================================================
// API Key Management Routes
// =====================================================

/**
 * @route POST /auth/api-keys
 * @desc Generate new API key
 * @access Private
 */
router.post('/api-keys',
  authenticate,
  validateSession,
  [
    body('name')
      .optional()
      .isString()
      .trim()
      .isLength({ min: 1, max: 100 })
      .withMessage('API key name must be between 1 and 100 characters'),
    body('description')
      .optional()
      .isString()
      .trim()
      .isLength({ max: 500 })
      .withMessage('Description must be less than 500 characters')
  ],
  validateRequest,
  rateLimitByUser({ maxRequests: 5, windowMs: 60 * 60 * 1000 }), // 5 API keys per hour
  generateApiKey
);

/**
 * @route GET /auth/api-keys
 * @desc Get user's API keys
 * @access Private
 */
router.get('/api-keys',
  authenticate,
  validateSession,
  getApiKeys
);

/**
 * @route DELETE /auth/api-keys/:keyId
 * @desc Revoke API key
 * @access Private
 */
router.delete('/api-keys/:keyId',
  authenticate,
  validateSession,
  [
    param('keyId')
      .isUUID()
      .withMessage('Invalid API key ID')
  ],
  validateRequest,
  revokeApiKey
);

// =====================================================
// Admin Routes
// =====================================================

/**
 * @route GET /auth/users
 * @desc Get all users (admin only)
 * @access Admin
 */
router.get('/users',
  authenticate,
  validateSession,
  requireRole('admin'),
  [
    query('limit')
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage('Limit must be between 1 and 100'),
    query('offset')
      .optional()
      .isInt({ min: 0 })
      .withMessage('Offset must be a non-negative integer'),
    query('role')
      .optional()
      .isIn(['user', 'admin'])
      .withMessage('Role must be either user or admin')
  ],
  validateRequest,
  getAllUsers
);

/**
 * @route POST /auth/users
 * @desc Create new user (admin only)
 * @access Admin
 */
router.post('/users',
  authenticate,
  validateSession,
  requireRole('admin'),
  [
    body('email')
      .isEmail()
      .normalizeEmail()
      .withMessage('Valid email is required'),
    body('password')
      .isLength({ min: 8 })
      .withMessage('Password must be at least 8 characters long'),
    body('name')
      .isString()
      .trim()
      .isLength({ min: 1, max: 255 })
      .withMessage('Name must be between 1 and 255 characters'),
    body('role')
      .optional()
      .isIn(['user', 'admin'])
      .withMessage('Role must be either user or admin')
  ],
  validateRequest,
  rateLimitByUser({ maxRequests: 10, windowMs: 60 * 60 * 1000 }),
  createUser
);

/**
 * @route PUT /auth/users/:userId
 * @desc Update user (admin only)
 * @access Admin
 */
router.put('/users/:userId',
  authenticate,
  validateSession,
  requireRole('admin'),
  [
    param('userId')
      .isUUID()
      .withMessage('Invalid user ID'),
    body('name')
      .optional()
      .isString()
      .trim()
      .isLength({ min: 1, max: 255 })
      .withMessage('Name must be between 1 and 255 characters'),
    body('role')
      .optional()
      .isIn(['user', 'admin'])
      .withMessage('Role must be either user or admin')
  ],
  validateRequest,
  updateUser
);

/**
 * @route DELETE /auth/users/:userId
 * @desc Delete user (admin only)
 * @access Admin
 */
router.delete('/users/:userId',
  authenticate,
  validateSession,
  requireRole('admin'),
  [
    param('userId')
      .isUUID()
      .withMessage('Invalid user ID')
  ],
  validateRequest,
  deleteUser
);

export default router;