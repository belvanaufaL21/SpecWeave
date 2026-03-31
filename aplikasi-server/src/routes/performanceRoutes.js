import { Router } from 'express';
import { getPerformanceAnalytics } from '../middleware/performanceMiddleware.js';
import { authenticate } from '../middlewares/auth.js';

const router = Router();

/**
 * GET /api/performance/analytics
 * Get performance analytics for specified time range
 */
router.get('/analytics', authenticate, async (req, res) => {
  try {
    const { timeRange = '24h', userId } = req.query;
    
    // Only allow users to see their own data unless they're admin
    const targetUserId = req.user.role === 'admin' ? userId : req.user.id;
    
    console.log(`📊 [PERFORMANCE] Getting analytics for time range: ${timeRange}, user: ${targetUserId || 'all'}`);
    
    const result = await getPerformanceAnalytics(timeRange, targetUserId);
    
    if (result.success) {
      res.json({
        success: true,
        data: result.data,
        timeRange,
        userId: targetUserId
      });
    } else {
      throw new Error(result.error);
    }
  } catch (error) {
    console.error('❌ [PERFORMANCE] Error getting analytics:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get performance analytics',
      error: error.message
    });
  }
});

/**
 * GET /api/performance/health
 * Get current system health metrics
 */
router.get('/health', async (req, res) => {
  try {
    const startTime = Date.now();
    
    // Simple health check
    const health = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      response_time: Date.now() - startTime,
      version: process.env.npm_package_version || '1.0.0'
    };
    
    res.json({
      success: true,
      data: health
    });
  } catch (error) {
    console.error('❌ [PERFORMANCE] Health check failed:', error);
    res.status(500).json({
      success: false,
      message: 'Health check failed',
      error: error.message
    });
  }
});

/**
 * GET /api/performance/summary
 * Get quick performance summary
 */
router.get('/summary', authenticate, async (req, res) => {
  try {
    const { timeRange = '1h' } = req.query;
    const userId = req.user.role === 'admin' ? null : req.user.id;
    
    const result = await getPerformanceAnalytics(timeRange, userId);
    
    if (result.success) {
      // Return only summary data
      const summary = {
        total_requests: result.data.total_requests,
        success_rate: result.data.success_rate,
        average_duration: result.data.average_duration,
        performance_trend: result.data.performance_trend,
        top_errors: result.data.error_rate_by_operation.slice(0, 3)
      };
      
      res.json({
        success: true,
        data: summary,
        timeRange
      });
    } else {
      throw new Error(result.error);
    }
  } catch (error) {
    console.error('❌ [PERFORMANCE] Error getting summary:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get performance summary',
      error: error.message
    });
  }
});

export default router;