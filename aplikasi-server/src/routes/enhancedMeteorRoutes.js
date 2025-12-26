import express from 'express';
import enhancedMeteorController from '../controllers/enhancedMeteorController.js';
import { authenticate, optionalAuth } from '../middlewares/auth.js';

const router = express.Router();

// Validation endpoint (no auth required for basic validation)
router.post('/validate-gherkin', enhancedMeteorController.validateGherkin);

// Evaluation endpoint (optional auth - works better with auth for storage)
router.post('/evaluate-detailed', optionalAuth, enhancedMeteorController.evaluateDetailed);

// Configuration endpoints (auth required)
router.get('/configuration', authenticate, enhancedMeteorController.getConfiguration);
router.put('/configuration', authenticate, enhancedMeteorController.updateConfiguration);

// Test history endpoints (auth required)
router.get('/test-history', authenticate, enhancedMeteorController.getTestHistory);
router.get('/export-results', authenticate, enhancedMeteorController.exportResults);

// Reference library endpoints (auth required)
router.get('/references', authenticate, enhancedMeteorController.getReferences);
router.post('/references', authenticate, enhancedMeteorController.createReference);
router.put('/references/:id', authenticate, enhancedMeteorController.updateReference);
router.delete('/references/:id', authenticate, enhancedMeteorController.deleteReference);

export default router;