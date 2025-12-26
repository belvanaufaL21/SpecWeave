import express from 'express';
import { body, param } from 'express-validator';
import epicController from '../controllers/epicController.js';
import { authenticate, optionalAuth } from '../middlewares/auth.js';

const router = express.Router();

// =====================================================
// Epic Context Management Routes
// =====================================================

/**
 * Set Epic context for user session
 * POST /api/epics/context
 */
router.post('/context', authenticate, [
  body('epicId')
    .notEmpty()
    .withMessage('Epic ID is required'),
  body('epicData')
    .isObject()
    .withMessage('Epic data is required'),
  body('epicData.epic')
    .isObject()
    .withMessage('Epic information is required'),
  body('epicData.epic.id')
    .notEmpty()
    .withMessage('Epic ID is required'),
  body('epicData.epic.key')
    .notEmpty()
    .withMessage('Epic key is required'),
  body('epicData.epic.name')
    .notEmpty()
    .withMessage('Epic name is required'),
  body('epicData.connection')
    .isObject()
    .withMessage('Connection information is required'),
  body('epicData.connection.id')
    .notEmpty()
    .withMessage('Connection ID is required'),
  body('epicData.connection.project_key')
    .notEmpty()
    .withMessage('Project key is required')
], epicController.setEpicContext);

/**
 * Get current Epic context
 * GET /api/epics/context
 */
router.get('/context', optionalAuth, epicController.getEpicContext);

/**
 * Clear Epic context
 * DELETE /api/epics/context
 */
router.delete('/context', epicController.clearEpicContext);

/**
 * Validate Epic context exists
 * GET /api/epics/context/validate
 */
router.get('/context/validate', epicController.validateEpicContext);

/**
 * Get Epic context summary
 * GET /api/epics/context/summary
 */
router.get('/context/summary', epicController.getEpicContextSummary);

/**
 * Check if Epic context is required
 * GET /api/epics/context/required
 */
router.get('/context/required', epicController.checkEpicContextRequired);

/**
 * Get Epic context for scenario creation
 * GET /api/epics/context/for-scenario
 */
router.get('/context/for-scenario', epicController.getEpicContextForScenario);

// =====================================================
// Epic Context Statistics and Monitoring Routes (Admin Only)
// =====================================================

/**
 * Get Epic context statistics
 * GET /api/epics/stats
 */
router.get('/stats', epicController.getEpicStats);

/**
 * Clean up expired Epic contexts
 * POST /api/epics/cleanup
 */
router.post('/cleanup', epicController.cleanupExpiredContexts);

export default router;