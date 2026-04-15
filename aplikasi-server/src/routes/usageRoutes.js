import express from 'express';
import {
  getUserLimits,
  getUserHistory
} from '../controllers/usageController.js';
import {
  authenticate,
  validateSession
} from '../middlewares/auth.js';
import { validateRequest } from '../middlewares/validation.js';
import { query } from 'express-validator';

const router = express.Router();

// =====================================================
// Protected Routes (authentication required)
// =====================================================

/**
 * @route GET /usage/limits
 * @desc Get usage limits for all models for authenticated user
 * @access Private
 */
router.get('/limits',
  authenticate,
  validateSession,
  getUserLimits
);

/**
 * @route GET /usage/history
 * @desc Get usage history for authenticated user
 * @access Private
 */
router.get('/history',
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
    query('model')
      .optional()
      .isString()
      .trim()
      .withMessage('Model must be a string')
  ],
  validateRequest,
  getUserHistory
);

export default router;
