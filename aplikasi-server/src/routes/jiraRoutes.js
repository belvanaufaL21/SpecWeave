import express from 'express';
import { body, param, query } from 'express-validator';
import jiraController from '../controllers/jiraController.js';
import { authenticate, optionalAuth } from '../middlewares/auth.js';

const router = express.Router();

// =====================================================
// JIRA Connection Management Routes
// =====================================================

/**
 * Create new JIRA connection
 * POST /api/jira/connections
 */
router.post('/connections', authenticate, [
  body('jiraUrl')
    .isURL()
    .withMessage('Valid JIRA URL is required'),
  body('email')
    .isEmail()
    .withMessage('Valid email is required'),
  body('apiToken')
    .notEmpty()
    .withMessage('API token is required'),
  body('projectKey')
    .notEmpty()
    .withMessage('Project key is required'),
  body('issueType')
    .optional()
    .isString()
    .withMessage('Issue type must be a string'),
  body('customFields')
    .optional()
    .isObject()
    .withMessage('Custom fields must be an object')
], jiraController.createConnection);

/**
 * Get user's JIRA connections
 * GET /api/jira/connections
 */
router.get('/connections', optionalAuth, jiraController.getConnections);

/**
 * Delete JIRA connection
 * DELETE /api/jira/connections/:connectionId
 */
router.delete('/connections/:connectionId', authenticate, [
  param('connectionId')
    .notEmpty()
    .withMessage('Valid connection ID is required')
], jiraController.deleteConnection);

/**
 * Test JIRA connection before creating
 * POST /api/jira/test-connection
 */
router.post('/test-connection', [
  body('jiraUrl')
    .isURL()
    .withMessage('Valid JIRA URL is required'),
  body('email')
    .isEmail()
    .withMessage('Valid email is required'),
  body('apiToken')
    .notEmpty()
    .withMessage('API token is required'),
  body('projectKey')
    .notEmpty()
    .withMessage('Project key is required')
], jiraController.testNewConnection);

/**
 * Test existing JIRA connection
 * POST /api/jira/connections/:connectionId/test
 */
router.post('/connections/:connectionId/test', [
  param('connectionId')
    .notEmpty()
    .withMessage('Valid connection ID is required')
], jiraController.testConnection);

// =====================================================
// Epic Management Routes
// =====================================================

/**
 * Get available Epics from JIRA project
 * GET /api/jira/connections/:connectionId/projects/:projectKey/epics
 */
router.get('/connections/:connectionId/projects/:projectKey/epics', optionalAuth, [
  param('connectionId')
    .notEmpty()
    .withMessage('Valid connection ID is required'),
  param('projectKey')
    .notEmpty()
    .withMessage('Project key is required')
], jiraController.getProjectEpics);

/**
 * Validate Epic access and permissions
 * GET /api/jira/connections/:connectionId/epics/:epicId/validate
 */
router.get('/connections/:connectionId/epics/:epicId/validate', authenticate, [
  param('connectionId')
    .notEmpty()
    .withMessage('Valid connection ID is required'),
  param('epicId')
    .notEmpty()
    .withMessage('Epic ID is required')
], jiraController.validateEpicAccess);

/**
 * Search Epics by query
 * GET /api/jira/connections/:connectionId/projects/:projectKey/epics/search
 */
router.get('/connections/:connectionId/projects/:projectKey/epics/search', authenticate, [
  param('connectionId')
    .notEmpty()
    .withMessage('Valid connection ID is required'),
  param('projectKey')
    .notEmpty()
    .withMessage('Project key is required'),
  query('q')
    .notEmpty()
    .withMessage('Search query is required')
], jiraController.searchEpics);

// =====================================================
// User Story and Subtask Creation Routes
// =====================================================

/**
 * Create user story from Gherkin scenario
 * POST /api/jira/connections/:connectionId/epics/:epicId/user-stories
 */
router.post('/connections/:connectionId/epics/:epicId/user-stories', authenticate, [
  param('connectionId')
    .notEmpty()
    .withMessage('Valid connection ID is required'),
  param('epicId')
    .notEmpty()
    .withMessage('Epic ID is required'),
  body('title')
    .notEmpty()
    .withMessage('Story title is required'),
  body('userStory')
    .notEmpty()
    .withMessage('User story content is required'),
  body('scenarios')
    .optional()
    .isArray()
    .withMessage('Scenarios must be an array'),
  body('featureName')
    .optional()
    .isString()
    .withMessage('Feature name must be a string'),
  body('description')
    .optional()
    .isString()
    .withMessage('Description must be a string')
], jiraController.createUserStory);

/**
 * Create subtasks from Gherkin scenarios
 * POST /api/jira/connections/:connectionId/user-stories/:userStoryId/subtasks
 */
router.post('/connections/:connectionId/user-stories/:userStoryId/subtasks', authenticate, [
  param('connectionId')
    .notEmpty()
    .withMessage('Valid connection ID is required'),
  param('userStoryId')
    .notEmpty()
    .withMessage('User story ID is required'),
  body('scenarios')
    .isArray({ min: 1 })
    .withMessage('At least one scenario is required'),
  body('scenarios.*.title')
    .notEmpty()
    .withMessage('Scenario title is required'),
  body('scenarios.*.given')
    .optional()
    .isArray()
    .withMessage('Given steps must be an array'),
  body('scenarios.*.when')
    .optional()
    .isArray()
    .withMessage('When steps must be an array'),
  body('scenarios.*.then')
    .optional()
    .isArray()
    .withMessage('Then steps must be an array')
], jiraController.createSubtasks);

/**
 * Create complete JIRA structure (user story + subtasks)
 * POST /api/jira/connections/:connectionId/epics/:epicId/complete-story
 */
router.post('/connections/:connectionId/epics/:epicId/complete-story', authenticate, [
  param('connectionId')
    .notEmpty()
    .withMessage('Valid connection ID is required'),
  param('epicId')
    .notEmpty()
    .withMessage('Epic ID is required'),
  body('storyData')
    .isObject()
    .withMessage('Story data is required'),
  body('storyData.title')
    .notEmpty()
    .withMessage('Story title is required'),
  body('storyData.userStory')
    .notEmpty()
    .withMessage('User story content is required'),
  body('scenarios')
    .optional()
    .isArray()
    .withMessage('Scenarios must be an array')
], jiraController.createCompleteStory);

// =====================================================
// OAuth Routes
// =====================================================

/**
 * Check if OAuth is available/configured
 * GET /api/jira/oauth/available
 */
router.get('/oauth/available', jiraController.checkOAuthAvailable);

/**
 * Start JIRA OAuth flow
 * POST /api/jira/oauth/start
 */
router.post('/oauth/start', [
  body('jiraUrl')
    .optional()
    .isURL()
    .withMessage('Valid JIRA URL is required'),
  body('projectKey')
    .optional()
    .notEmpty()
    .withMessage('Project key is required')
], jiraController.startOAuthFlow);

/**
 * Handle JIRA OAuth callback
 * POST /api/jira/oauth/callback
 */
router.post('/oauth/callback', [
  body('oauth_token')
    .notEmpty()
    .withMessage('OAuth token is required'),
  body('oauth_verifier')
    .notEmpty()
    .withMessage('OAuth verifier is required')
], jiraController.completeOAuthFlow);

// =====================================================
// Error Handling and Fallback Routes
// =====================================================



/**
 * Handle JIRA integration errors with fallback options
 * POST /api/jira/handle-error
 */
router.post('/handle-error', [
  body('error')
    .notEmpty()
    .withMessage('Error information is required'),
  body('context')
    .optional()
    .isObject()
    .withMessage('Context must be an object'),
  body('scenarioData')
    .optional()
    .isObject()
    .withMessage('Scenario data must be an object')
], jiraController.handleIntegrationError);

/**
 * Retry failed JIRA operations
 * POST /api/jira/retry
 */
router.post('/retry', [
  body('operationType')
    .isIn(['createUserStory', 'createSubtasks'])
    .withMessage('Valid operation type is required'),
  body('operationData')
    .isObject()
    .withMessage('Operation data is required')
], jiraController.retryOperation);

export default router;