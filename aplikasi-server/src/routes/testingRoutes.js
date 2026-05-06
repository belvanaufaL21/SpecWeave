import { Router } from 'express';
import {
  runMeteorTest,
  runSentenceBertTest,
  getTestResults,
  getAllUserTestResults,
  deleteTestResult,
  getTestStatistics,
  runBatchTest,
  saveScenarioReference,
  getScenarioReferences,
  getLastUsedReference,
  getCrossTestData,
  runDualEvaluation
} from '../controllers/testingController.js';
import {
  runMeteorTestSSE,
  runSentenceBertTestSSE
} from '../controllers/testingControllerSSE.js';
import { authenticate, optionalAuth } from '../middlewares/auth.js';
import { checkUsageLimit } from '../middleware/usageLimitMiddleware.js';

const router = Router();

// Use optional authentication for testing endpoints to allow development/testing
// Individual test endpoints - these can work without auth for testing purposes
// Add usage limit middleware to prevent abuse
router.post('/meteor', optionalAuth, checkUsageLimit, runMeteorTest);
router.post('/sentence-bert', optionalAuth, checkUsageLimit, runSentenceBertTest);

// SSE endpoints for real-time progress (REQUIRE authentication)
router.post('/meteor/stream', authenticate, checkUsageLimit, runMeteorTestSSE);
router.post('/sentence-bert/stream', authenticate, checkUsageLimit, runSentenceBertTestSSE);

// Batch testing endpoint
router.post('/batch', optionalAuth, checkUsageLimit, runBatchTest);

// NEW: Dual evaluation endpoint - runs both METEOR and Sentence-BERT simultaneously
router.post('/dual-evaluation', optionalAuth, checkUsageLimit, runDualEvaluation);

// Results endpoints - require auth since they're user-specific
router.get('/results/:scenarioId', authenticate, getTestResults);
router.get('/results', authenticate, getAllUserTestResults);
router.delete('/results/:testId', authenticate, deleteTestResult);

// Statistics endpoint - require auth
router.get('/statistics', authenticate, getTestStatistics);

// Scenario reference endpoints - use optional auth for flexibility
router.post('/references', optionalAuth, saveScenarioReference);
router.get('/references', optionalAuth, getScenarioReferences);
router.get('/references/last/:scenarioId', optionalAuth, getLastUsedReference);

// Cross-test data endpoint - use optional auth
router.get('/cross-test/:scenarioId', optionalAuth, getCrossTestData);

export default router;