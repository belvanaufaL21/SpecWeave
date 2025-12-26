import express from 'express';
import { referenceController } from '../controllers/referenceController.js';
import { optionalAuth } from '../middlewares/auth.js';

const router = express.Router();

// Apply optional authentication middleware to all routes
// This allows the system to work in offline mode without authentication
router.use(optionalAuth);

// Reference CRUD operations
router.get('/', referenceController.getReferences);
router.post('/', referenceController.createReference);
router.put('/:id', referenceController.updateReference);
router.delete('/:id', referenceController.deleteReference);

// Usage tracking
router.post('/:id/usage', referenceController.incrementUsage);

// Statistics
router.get('/statistics', referenceController.getStatistics);

export default router;