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

// ✅ FIX: endpoint yang konsumsi LLM HARUS pakai `authenticate` (bukan optionalAuth).
// Dengan optionalAuth, user tanpa token akan lolos middleware checkUsageLimit
// karena req.user.id kosong → limit bisa di-bypass dengan tidak login.
router.post('/meteor', authenticate, checkUsageLimit, runMeteorTest);
router.post('/sentence-bert', authenticate, checkUsageLimit, runSentenceBertTest);

// SSE endpoints — sudah benar pakai authenticate
router.post('/meteor/stream', authenticate, checkUsageLimit, runMeteorTestSSE);
router.post('/sentence-bert/stream', authenticate, checkUsageLimit, runSentenceBertTestSSE);

// Batch & dual-evaluation juga harus authenticate
router.post('/batch', authenticate, checkUsageLimit, runBatchTest);
router.post('/dual-evaluation', authenticate, checkUsageLimit, runDualEvaluation);

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