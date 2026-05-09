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
import { sseMiddlewareWrapper } from '../middlewares/sseErrorHandler.js';

const router = Router();

// ⚠️ IMPORTANT: METEOR & Sentence-BERT testing TIDAK menggunakan LLM
// Mereka hanya menjalankan Python script untuk evaluasi
// Jadi TIDAK PERLU checkUsageLimit middleware

// Regular testing endpoints (non-SSE) - NO usage limit check
router.post('/meteor', authenticate, runMeteorTest);
router.post('/sentence-bert', authenticate, runSentenceBertTest);

// SSE endpoints - NO usage limit check, hanya authenticate
router.post('/meteor/stream', 
  sseMiddlewareWrapper(authenticate),
  runMeteorTestSSE
);
router.post('/sentence-bert/stream', 
  sseMiddlewareWrapper(authenticate),
  runSentenceBertTestSSE
);

// Batch & dual-evaluation juga tidak pakai LLM, hanya evaluasi
router.post('/batch', authenticate, runBatchTest);
router.post('/dual-evaluation', authenticate, runDualEvaluation);

// Results endpoints
router.get('/results/:scenarioId', authenticate, getTestResults);
router.get('/results', authenticate, getAllUserTestResults);
router.delete('/results/:testId', authenticate, deleteTestResult);

// Statistics endpoint
router.get('/statistics', authenticate, getTestStatistics);

// Scenario reference endpoints — read-only, optionalAuth aman dipertahankan
router.post('/references', optionalAuth, saveScenarioReference);
router.get('/references', optionalAuth, getScenarioReferences);
router.get('/references/last/:scenarioId', optionalAuth, getLastUsedReference);

// Cross-test data endpoint
router.get('/cross-test/:scenarioId', optionalAuth, getCrossTestData);

export default router;