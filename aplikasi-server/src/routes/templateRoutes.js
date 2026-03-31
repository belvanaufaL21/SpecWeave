import { Router } from 'express';
import { authenticate } from '../middlewares/auth.js';
import { validateTemplate, validateTemplateUpdate } from '../middlewares/validation.js';
import {
  getTemplates,
  getSystemTemplates,
  getTemplateById,
  createTemplate,
  updateTemplate,
  deleteTemplate,
  applyTemplate,
  getTemplateCategories,
  getTemplateStats,
  setupDefaultTemplates
} from '../controllers/templateController.js';

const router = Router();

// Public routes (no authentication required)
router.get('/categories', getTemplateCategories);
router.get('/system', getSystemTemplates); // New public endpoint for system templates
router.post('/setup-defaults', setupDefaultTemplates); // Setup endpoint

// Protected routes (authentication required)
router.get('/', authenticate, getTemplates);
router.get('/stats', authenticate, getTemplateStats);
router.get('/:templateId', authenticate, getTemplateById);
router.post('/', authenticate, validateTemplate, createTemplate);
router.put('/:templateId', authenticate, validateTemplateUpdate, updateTemplate);
router.delete('/:templateId', authenticate, deleteTemplate);

// Template application
router.post('/:templateId/apply', authenticate, applyTemplate);

export default router;