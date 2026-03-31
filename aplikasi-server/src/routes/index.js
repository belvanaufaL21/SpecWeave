import { Router } from 'express';

import gherkinRoutes from './gherkinRoutes.js';
import evaluationRoutes from './evaluationRoutes.js';
import authRoutes from './authRoutes.js';
import testRoutes from './testRoutes.js';
import testingRoutes from './testingRoutes.js';
import templateRoutes from './templateRoutes.js';
import jiraRoutes from './jiraRoutes.js';
import performanceRoutes from './performanceRoutes.js';
import activeProjectRoutes from './activeProjectRoutes.js';
import systemHealthRoutes from './systemHealth.js';

import epicRoutes from './epicRoutes.js';
import subtaskRoutes from './subtaskRoutes.js';
import referenceRoutes from './referenceRoutes.js';



const router = Router();

// Health check endpoint
router.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'SpecWeave API is running',
    version: '1.0.0',
    timestamp: new Date().toISOString()
  });
});

// Route modules
router.use('/auth', authRoutes);

// Add logging middleware for gherkin routes
router.use('/gherkin', (req, res, next) => {
  // Remove verbose route logging for cleaner output
  next();
});

router.use('/gherkin', gherkinRoutes);
router.use('/evaluation', evaluationRoutes);
router.use('/testing', testingRoutes);
router.use('/templates', templateRoutes);
router.use('/jira', jiraRoutes);
router.use('/performance', performanceRoutes);
router.use('/active-projects', activeProjectRoutes);
router.use('/system', systemHealthRoutes);

router.use('/epics', epicRoutes);
router.use('/subtasks', subtaskRoutes);
router.use('/references', referenceRoutes);


router.use('/test', testRoutes);

export default router;