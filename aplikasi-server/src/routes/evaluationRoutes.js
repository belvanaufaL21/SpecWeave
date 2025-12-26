import { Router } from 'express';
import {
  evaluateScenario,
  evaluateMultipleScenarios,
  getQualityAssessment,
  getPerformanceStats,
  generatePerformanceReport,
  getCurrentMetrics,
  testMeteorEvaluation
} from '../controllers/evaluationController.js';

const router = Router();

// METEOR Evaluation Routes
router.post('/meteor', evaluateScenario);
router.post('/meteor/batch', evaluateMultipleScenarios);
router.post('/test', testMeteorEvaluation);

// Quality Assessment Routes
router.get('/quality/:score', getQualityAssessment);

// Performance Monitoring Routes
router.get('/performance/stats', getPerformanceStats);
router.get('/performance/report', generatePerformanceReport);
router.get('/performance/current', getCurrentMetrics);

export default router;