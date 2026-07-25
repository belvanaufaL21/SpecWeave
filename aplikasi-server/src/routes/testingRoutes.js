import { Router } from 'express';
import {
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
  runEvaluation
} from '../controllers/testingController.js';
import {
  runSentenceBertTestSSE
} from '../controllers/testingControllerSSE.js';
import { authenticate, optionalAuth } from '../middlewares/auth.js';
import { checkUsageLimit } from '../middleware/usageLimitMiddleware.js';
import { sseMiddlewareWrapper } from '../middlewares/sseErrorHandler.js';

const router = Router();

// ⚠️ IMPORTANT: Sentence-BERT testing TIDAK menggunakan LLM
// Hanya menjalankan Python script untuk evaluasi
// Jadi TIDAK PERLU checkUsageLimit middleware

// Regular testing endpoints (non-SSE) - NO usage limit check
router.post('/sentence-bert', authenticate, runSentenceBertTest);

// SSE endpoints - NO usage limit check, hanya authenticate
router.post('/sentence-bert/stream', 
  sseMiddlewareWrapper(authenticate),
  runSentenceBertTestSSE
);

// Batch & evaluation juga tidak pakai LLM, hanya evaluasi
router.post('/batch', authenticate, runBatchTest);
router.post('/evaluation', authenticate, runEvaluation);

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