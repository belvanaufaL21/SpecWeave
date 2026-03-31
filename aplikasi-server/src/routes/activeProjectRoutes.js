import express from 'express';
import { body, validationResult } from 'express-validator';
import { authenticate } from '../middlewares/auth.js';
import supabaseService from '../services/supabaseService.js';

const router = express.Router();

/**
 * Get active project for user (global, not per-chat)
 * GET /api/active-projects
 */
router.get('/', authenticate, async (req, res) => {
  try {
    const userId = req.user.id;

    const activeProject = await supabaseService.getActiveProject(userId);
    
    res.json({
      success: true,
      data: activeProject
    });
  } catch (error) {
    console.error('Error getting active project:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Set active project for user (global, not per-chat)
 * POST /api/active-projects
 */
router.post('/', authenticate, [
  body('connectionId').isUUID().withMessage('Valid connection ID is required')
], async (req, res) => {
  try {
    // Check validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { connectionId } = req.body;
    const userId = req.user.id;

    const result = await supabaseService.setActiveProject(userId, connectionId);
    
    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Error setting active project:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Clear active project for user
 * DELETE /api/active-projects
 */
router.delete('/', authenticate, async (req, res) => {
  try {
    const userId = req.user.id;

    await supabaseService.clearActiveProject(userId);
    
    res.json({
      success: true,
      message: 'Active project cleared successfully'
    });
  } catch (error) {
    console.error('Error clearing active project:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Backward compatibility: Support old per-chat endpoints
router.get('/:chatId', authenticate, async (req, res) => {
  try {
    const userId = req.user.id;
    const activeProject = await supabaseService.getActiveProject(userId);
    
    res.json({
      success: true,
      data: activeProject
    });
  } catch (error) {
    console.error('Error getting active project:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

router.post('/:chatId', authenticate, [
  body('connectionId').isUUID().withMessage('Valid connection ID is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { connectionId } = req.body;
    const userId = req.user.id;

    const result = await supabaseService.setActiveProject(userId, connectionId);
    
    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Error setting active project:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

export default router;