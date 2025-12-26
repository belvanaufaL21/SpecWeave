import { Router } from 'express';
import { authenticate } from '../middlewares/auth.js';
import { validateTemplate, validateTemplateUpdate } from '../middlewares/validation.js';
import {
  getTemplates,
  getTemplateById,
  createTemplate,
  updateTemplate,
  deleteTemplate,
  applyTemplate,
  getTemplateCategories,
  getTemplateStats
} from '../controllers/templateController.js';

const router = Router();

// Public routes (no authentication required for system templates)
router.get('/categories', getTemplateCategories);

// Protected routes (authentication required)
router.use(authenticate);

// Template CRUD operations
router.get('/', getTemplates);
router.get('/stats', getTemplateStats);
router.get('/:templateId', getTemplateById);
router.post('/', validateTemplate, createTemplate);
router.put('/:templateId', validateTemplateUpdate, updateTemplate);
router.delete('/:templateId', deleteTemplate);

// Template application
router.post('/:templateId/apply', applyTemplate);

export default router;