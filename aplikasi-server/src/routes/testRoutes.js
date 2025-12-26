import express from 'express';
import { testDatabase, testAuth, testProfile } from '../controllers/testController.js';
import { authenticate } from '../middlewares/auth.js';

const router = express.Router();

/**
 * @route GET /test/database
 * @desc Test database connection
 * @access Public
 */
router.get('/database', testDatabase);

/**
 * @route GET /test/auth
 * @desc Test authentication
 * @access Private
 */
router.get('/auth', authenticate, testAuth);

/**
 * @route GET /test/profile
 * @desc Test user profile operations
 * @access Private
 */
router.get('/profile', authenticate, testProfile);

export default router;