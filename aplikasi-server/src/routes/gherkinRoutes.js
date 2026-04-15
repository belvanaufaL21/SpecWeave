import { Router } from 'express';
import { 
  generateGherkin, 
  getHistory, 
  createJiraUserStory, 
  getJiraIntegrationStatus,
  bulkCreateJiraUserStories 
} from '../controllers/gherkinController.js';
import { optionalAuth, authenticate } from '../middlewares/auth.js';
import { validateSearch } from '../middlewares/validation.js';
import { checkUsageLimit } from '../middleware/usageLimitMiddleware.js';
import { body, param } from 'express-validator';

const router = Router();

// POST /api/gherkin/generate - Generate Gherkin from User Story
// Optional auth - works for both authenticated and anonymous users
// Usage limit middleware checks limits for authenticated users
router.post('/generate', optionalAuth, checkUsageLimit, generateGherkin);

// GET /api/gherkin/history - Get conversion history (requires authentication)
router.get('/history', authenticate, validateSearch, getHistory);

// =====================================================
// JIRA Integration Routes
// =====================================================

/**
 * Create JIRA user story from existing scenario
 * POST /api/gherkin/:scenarioId/create-jira-story
 */
router.post('/:scenarioId/create-jira-story', [
  authenticate,
  param('scenarioId')
    .isUUID()
    .withMessage('Valid scenario ID is required')
], createJiraUserStory);

/**
 * Get JIRA integration status for scenario
 * GET /api/gherkin/:scenarioId/jira-status
 */
router.get('/:scenarioId/jira-status', [
  authenticate,
  param('scenarioId')
    .isUUID()
    .withMessage('Valid scenario ID is required')
], getJiraIntegrationStatus);

/**
 * Bulk create JIRA user stories for multiple scenarios
 * POST /api/gherkin/bulk-create-jira-stories
 */
router.post('/bulk-create-jira-stories', [
  authenticate,
  body('scenarioIds')
    .isArray({ min: 1 })
    .withMessage('At least one scenario ID is required'),
  body('scenarioIds.*')
    .isUUID()
    .withMessage('All scenario IDs must be valid UUIDs')
], bulkCreateJiraUserStories);

export default router;
