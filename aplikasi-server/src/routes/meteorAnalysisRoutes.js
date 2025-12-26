import express from 'express';
import meteorAnalysisController from '../controllers/meteorAnalysisController.js';
import { authenticate } from '../middlewares/auth.js';

const router = express.Router();

// Apply authentication middleware to all routes
router.use(authenticate);

// METEOR Analysis routes
router.post('/detailed', meteorAnalysisController.generateDetailedAnalysis);
router.post('/suggestions', meteorAnalysisController.generateSuggestions);
router.post('/improve', meteorAnalysisController.generateImprovedScenario);

export default router;