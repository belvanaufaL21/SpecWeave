import epicService from '../services/epicService.js';
import jiraService from '../services/jiraService.js';
import { validationResult } from 'express-validator';

/**
 * Epic Controller
 * Handles Epic context management and Epic-related operations
 */
class EpicController {

  // =====================================================
  // Epic Context Management
  // =====================================================

  /**
   * Set Epic context for user session
   * POST /api/epics/context
   */
  async setEpicContext(req, res) {
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

      // Check if user is authenticated
      if (!req.user || !req.user.id) {
        return res.status(401).json({
          success: false,
          error: 'User not authenticated'
        });
      }

      const userId = req.user.id;
      const { epicId, epicData } = req.body;

      // Validate Epic data structure
      if (!epicService.validateEpicData(epicData)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid Epic data structure'
        });
      }

      // Validate Epic access before setting context (only if Epic is provided)
      const { epic, connection, workWithoutEpic } = epicData;
      
      // Skip Epic validation if working without Epic
      if (!workWithoutEpic && epic && epic.id) {
        const epicValidation = await jiraService.validateEpicAccess(
          connection.id, 
          epic.id, 
          userId
        );

        if (!epicValidation || !epicValidation.hasAccess) {
          return res.status(403).json({
            success: false,
            error: 'User does not have access to this Epic'
          });
        }
      }

      // Set Epic context
      const result = await epicService.setEpicContext(userId, epicId, epicData);

      res.json({
        success: true,
        data: result.data,
        message: 'Epic context set successfully'
      });
    } catch (error) {
      console.error('Error setting Epic context:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to set Epic context'
      });
    }
  }

  /**
   * Get current Epic context
   * GET /api/epics/context
   */
  async getEpicContext(req, res) {
    try {
      // If user is not authenticated, return null context
      if (!req.user) {
        return res.json({
          success: true,
          data: null
        });
      }

      const userId = req.user.id;
      const result = await epicService.getEpicContext(userId);

      res.json({
        success: true,
        data: result.data
      });
    } catch (error) {
      console.error('Error getting Epic context:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to get Epic context'
      });
    }
  }

  /**
   * Clear Epic context
   * DELETE /api/epics/context
   */
  async clearEpicContext(req, res) {
    try {
      // Enhanced error handling for user authentication
      if (!req.user) {
        console.log('🔍 [EPIC-CLEAR] No user object in request - returning success');
        return res.json({
          success: true,
          message: 'Epic context cleared successfully (no user session)'
        });
      }

      if (!req.user.id) {
        console.log('🔍 [EPIC-CLEAR] No user ID in request - returning success');
        return res.json({
          success: true,
          message: 'Epic context cleared successfully (no user ID)'
        });
      }

      const userId = req.user.id;
      console.log('🧹 [EPIC-CLEAR] Clearing Epic context for user:', userId);
      
      await epicService.clearEpicContext(userId);

      console.log('✅ [EPIC-CLEAR] Epic context cleared successfully for user:', userId);
      res.json({
        success: true,
        message: 'Epic context cleared successfully'
      });
    } catch (error) {
      console.error('❌ [EPIC-CLEAR] Error clearing Epic context:', error);
      
      // Always return success for clearing operations to prevent UI blocking
      res.json({
        success: true,
        message: 'Epic context cleared (with warnings)',
        warning: error.message
      });
    }
  }

  /**
   * Validate Epic context exists
   * GET /api/epics/context/validate
   */
  async validateEpicContext(req, res) {
    try {
      // If user is not authenticated, return invalid context
      if (!req.user || !req.user.id) {
        return res.json({
          success: true,
          data: {
            hasValidContext: false
          }
        });
      }

      const userId = req.user.id;
      const isValid = await epicService.validateEpicContext(userId);

      res.json({
        success: true,
        data: {
          hasValidContext: isValid
        }
      });
    } catch (error) {
      console.error('Error validating Epic context:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to validate Epic context'
      });
    }
  }

  /**
   * Get Epic context summary
   * GET /api/epics/context/summary
   */
  async getEpicContextSummary(req, res) {
    try {
      // If user is not authenticated, return empty summary
      if (!req.user || !req.user.id) {
        return res.json({
          success: true,
          data: null
        });
      }

      const userId = req.user.id;
      const summary = await epicService.getEpicContextSummary(userId);

      res.json({
        success: true,
        data: summary
      });
    } catch (error) {
      console.error('Error getting Epic context summary:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to get Epic context summary'
      });
    }
  }

  // =====================================================
  // Epic Requirements Validation
  // =====================================================

  /**
   * Middleware to require Epic context for certain operations
   * Can be used as middleware for routes that require Epic context
   */
  async requireEpicContext(req, res, next) {
    try {
      // Check if user is authenticated
      if (!req.user || !req.user.id) {
        return res.status(401).json({
          success: false,
          error: 'User not authenticated'
        });
      }

      const userId = req.user.id;
      const isValid = await epicService.validateEpicContext(userId);

      if (!isValid) {
        return res.status(400).json({
          success: false,
          error: 'Epic context required',
          code: 'EPIC_CONTEXT_REQUIRED',
          message: 'Please select an Epic before performing this operation'
        });
      }

      // Add Epic context to request for use in subsequent handlers
      const contextResult = await epicService.getEpicContext(userId);
      if (contextResult.success && contextResult.data) {
        req.epicContext = contextResult.data;
      }

      next();
    } catch (error) {
      console.error('Error in requireEpicContext middleware:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to validate Epic context'
      });
    }
  }

  /**
   * Check if Epic context is required for scenario generation
   * GET /api/epics/context/required
   */
  async checkEpicContextRequired(req, res) {
    try {
      // This endpoint can be used by frontend to determine if Epic selection is required
      // For now, we'll make it configurable
      const epicRequired = process.env.REQUIRE_EPIC_CONTEXT !== 'false';

      res.json({
        success: true,
        data: {
          epicRequired,
          message: epicRequired 
            ? 'Epic selection is required before generating scenarios'
            : 'Epic selection is optional'
        }
      });
    } catch (error) {
      console.error('Error checking Epic context requirement:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to check Epic context requirement'
      });
    }
  }

  // =====================================================
  // Epic Context Statistics and Monitoring
  // =====================================================

  /**
   * Get Epic context statistics (admin only)
   * GET /api/epics/stats
   */
  async getEpicStats(req, res) {
    try {
      // Check if user is authenticated
      if (!req.user || !req.user.id) {
        return res.status(401).json({
          success: false,
          error: 'User not authenticated'
        });
      }

      // Check if user is admin
      if (req.user.role !== 'admin') {
        return res.status(403).json({
          success: false,
          error: 'Admin access required'
        });
      }

      const stats = epicService.getContextStats();
      
      res.json({
        success: true,
        data: stats
      });
    } catch (error) {
      console.error('Error getting Epic stats:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to get Epic stats'
      });
    }
  }

  /**
   * Clean up expired Epic contexts (admin only)
   * POST /api/epics/cleanup
   */
  async cleanupExpiredContexts(req, res) {
    try {
      // Check if user is authenticated
      if (!req.user || !req.user.id) {
        return res.status(401).json({
          success: false,
          error: 'User not authenticated'
        });
      }

      // Check if user is admin
      if (req.user.role !== 'admin') {
        return res.status(403).json({
          success: false,
          error: 'Admin access required'
        });
      }

      const cleanedCount = await epicService.cleanupExpiredContexts();
      
      res.json({
        success: true,
        data: {
          cleanedCount
        },
        message: `Cleaned up ${cleanedCount} expired Epic contexts`
      });
    } catch (error) {
      console.error('Error cleaning up Epic contexts:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to cleanup Epic contexts'
      });
    }
  }

  // =====================================================
  // Epic Context Integration with Scenarios
  // =====================================================

  /**
   * Get Epic context for scenario creation
   * This method is used when creating scenarios to ensure they're linked to the correct Epic
   * GET /api/epics/context/for-scenario
   */
  async getEpicContextForScenario(req, res) {
    try {
      // Check if user is authenticated
      if (!req.user || !req.user.id) {
        return res.status(401).json({
          success: false,
          error: 'User not authenticated'
        });
      }

      const userId = req.user.id;
      const result = await epicService.getEpicContext(userId);

      if (!result.success || !result.data) {
        return res.status(400).json({
          success: false,
          error: 'No Epic context found',
          code: 'NO_EPIC_CONTEXT',
          message: 'Please select an Epic before creating scenarios'
        });
      }

      // Return Epic context with additional metadata for scenario creation
      const epicData = result.data.epicData;
      
      res.json({
        success: true,
        data: {
          epic: epicData.epic,
          connection: epicData.connection,
          contextId: result.data.epicId,
          timestamp: result.data.timestamp,
          metadata: {
            canCreateUserStories: true,
            canCreateSubtasks: true,
            projectKey: epicData.connection.project_key,
            issueType: epicData.connection.issue_type || 'Story'
          }
        }
      });
    } catch (error) {
      console.error('Error getting Epic context for scenario:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to get Epic context for scenario'
      });
    }
  }
}

export default new EpicController();