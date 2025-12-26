import express from 'express';
import { body, param, query } from 'express-validator';
import subtaskController from '../controllers/subtaskController.js';
import { authenticate } from '../middlewares/auth.js';

const router = express.Router();

// Apply authentication middleware to all subtask routes
router.use(authenticate);

// =====================================================
// Subtask Generation Routes
// =====================================================

/**
 * Generate subtasks from scenario
 * POST /api/subtasks/generate
 */
router.post('/generate', [
  body('scenarioId')
    .isUUID()
    .withMessage('Valid scenario ID is required'),
  body('userStoryId')
    .notEmpty()
    .withMessage('User story ID is required'),
  body('connectionId')
    .optional()
    .isUUID()
    .withMessage('Connection ID must be valid UUID if provided')
], subtaskController.generateSubtasks);

/**
 * Create subtasks for existing user story
 * POST /api/subtasks/create
 */
router.post('/create', [
  body('userStoryId')
    .notEmpty()
    .withMessage('User story ID is required'),
  body('scenarios')
    .isArray({ min: 1 })
    .withMessage('At least one scenario is required'),
  body('scenarios.*.title')
    .notEmpty()
    .withMessage('Scenario title is required'),
  body('connectionId')
    .optional()
    .isUUID()
    .withMessage('Connection ID must be valid UUID if provided')
], subtaskController.createSubtasks);

// =====================================================
// Subtask Management Routes
// =====================================================

/**
 * Update subtask status
 * PUT /api/subtasks/:subtaskId/status
 */
router.put('/:subtaskId/status', [
  param('subtaskId')
    .notEmpty()
    .withMessage('Subtask ID is required'),
  body('status')
    .isIn(['To Do', 'In Progress', 'Done', 'Blocked'])
    .withMessage('Valid status is required'),
  body('connectionId')
    .optional()
    .isUUID()
    .withMessage('Connection ID must be valid UUID if provided')
], subtaskController.updateSubtaskStatus);

/**
 * Get subtask hierarchy for user story
 * GET /api/subtasks/hierarchy/:userStoryId
 */
router.get('/hierarchy/:userStoryId', [
  param('userStoryId')
    .notEmpty()
    .withMessage('User story ID is required'),
  query('connectionId')
    .optional()
    .isUUID()
    .withMessage('Connection ID must be valid UUID if provided')
], subtaskController.getSubtaskHierarchy);

/**
 * Bulk update multiple subtasks
 * PUT /api/subtasks/bulk-update
 */
router.put('/bulk-update', [
  body('subtaskUpdates')
    .isArray({ min: 1 })
    .withMessage('At least one subtask update is required'),
  body('subtaskUpdates.*.subtask_id')
    .notEmpty()
    .withMessage('Subtask ID is required for each update'),
  body('subtaskUpdates.*.updates')
    .isObject()
    .withMessage('Updates object is required for each subtask'),
  body('connectionId')
    .optional()
    .isUUID()
    .withMessage('Connection ID must be valid UUID if provided')
], subtaskController.bulkUpdateSubtasks);

// =====================================================
// Subtask Analytics and Reporting Routes
// =====================================================

/**
 * Generate completion report for Epic
 * GET /api/subtasks/reports/completion/:epicId
 */
router.get('/reports/completion/:epicId', [
  param('epicId')
    .notEmpty()
    .withMessage('Epic ID is required'),
  query('connectionId')
    .optional()
    .isUUID()
    .withMessage('Connection ID must be valid UUID if provided')
], subtaskController.generateCompletionReport);

/**
 * Get subtask creation statistics
 * GET /api/subtasks/stats/creation
 */
router.get('/stats/creation', [
  query('days')
    .optional()
    .isInt({ min: 1, max: 365 })
    .withMessage('Days must be between 1 and 365')
], subtaskController.getSubtaskCreationStats);

// =====================================================
// Subtask Templates and Patterns Routes
// =====================================================

/**
 * Get subtask templates based on scenario patterns
 * GET /api/subtasks/templates
 */
router.get('/templates', [
  query('scenario_type')
    .optional()
    .isIn(['api_scenarios', 'ui_scenarios', 'database_scenarios', 'authentication_scenarios'])
    .withMessage('Invalid scenario type'),
  query('complexity')
    .optional()
    .isIn(['simple', 'medium', 'complex'])
    .withMessage('Invalid complexity level')
], subtaskController.getSubtaskTemplates);

export default router;