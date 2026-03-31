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
  // epicId can be null for workWithoutEpic mode
  body('epicId')
    .optional({ nullable: true }),
  
  // epicData is always required
  body('epicData')
    .isObject()
    .withMessage('Epic data is required'),
  
  // Connection is always required
  body('epicData.connection')
    .isObject()
    .withMessage('Connection information is required'),
  body('epicData.connection.id')
    .notEmpty()
    .withMessage('Connection ID is required'),
  body('epicData.connection.project_key')
    .notEmpty()
    .withMessage('Project key is required'),
  
  // Epic fields are only required if NOT working without epic
  body('epicData.epic')
    .if(body('epicData.workWithoutEpic').not().equals(true))
    .isObject()
    .withMessage('Epic information is required when not working without epic'),
  body('epicData.epic.id')
    .if(body('epicData.workWithoutEpic').not().equals(true))
    .notEmpty()
    .withMessage('Epic ID is required when not working without epic'),
  body('epicData.epic.key')
    .if(body('epicData.workWithoutEpic').not().equals(true))
    .notEmpty()
    .withMessage('Epic key is required when not working without epic'),
  // Note: epic.name is optional - can be derived from summary or key
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