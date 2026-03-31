import databaseService from '../services/databaseService.js';

/**
 * Database Performance Monitoring Middleware
 * Tracks database operation performance and provides metrics
 */

/**
 * Middleware to monitor database performance
 */
export const databaseMonitoringMiddleware = (req, res, next) => {
  const startTime = Date.now();
  
  // Store original end method
  const originalEnd = res.end;
  
  // Override end method to capture response time
  res.end = function(...args) {
    const duration = Date.now() - startTime;
    
    // Add database metrics to response headers (for debugging)
    if (process.env.NODE_ENV === 'development') {
      const metrics = databaseService.getMetrics();
      res.setHeader('X-DB-Response-Time', duration);
      res.setHeader('X-DB-Total-Queries', metrics.totalQueries);
      res.setHeader('X-DB-Avg-Response-Time', Math.round(metrics.averageResponseTime));
      res.setHeader('X-DB-Success-Rate', Math.round(metrics.successRate));
    }
    
    // Log slow requests
    if (duration > 2000) {
      console.warn(`🐌 Slow database request: ${req.method} ${req.path} - ${duration}ms`);
    }
    
    // Call original end method
    originalEnd.apply(this, args);
  };
  
  next();
};

/**
 * Middleware to provide database health check endpoint
 */
export const databaseHealthMiddleware = async (req, res, next) => {
  if (req.path === '/health/database') {
    try {
      const connectionTest = await databaseService.testConnection();
      const metrics = databaseService.getMetrics();
      const analysis = await databaseService.analyzePerformance();
      
      const health = {
        status: connectionTest.success ? 'healthy' : 'unhealthy',
        connection: connectionTest,
        metrics,
        analysis: analysis.recommendations,
        timestamp: new Date().toISOString()
      };
      
      const statusCode = connectionTest.success ? 200 : 503;
      return res.status(statusCode).json(health);
    } catch (error) {
      return res.status(503).json({
        status: 'unhealthy',
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }
  
  next();
};

/**
 * Middleware to provide database metrics endpoint
 */
export const databaseMetricsMiddleware = (req, res, next) => {
  if (req.path === '/metrics/database') {
    const metrics = databaseService.getMetrics();
    return res.json({
      database: metrics,
      timestamp: new Date().toISOString()
    });
  }
  
  next();
};

/**
 * Error handling middleware for database operations
 */
export const databaseErrorMiddleware = (error, req, res, next) => {
  // Check if it's a database-related error
  if (error.message && error.message.includes('Database')) {
    console.error('Database error:', {
      path: req.path,
      method: req.method,
      error: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString()
    });
    
    // Return appropriate error response
    return res.status(500).json({
      error: 'Database operation failed',
      message: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error',
      timestamp: new Date().toISOString()
    });
  }
  
  next(error);
};

export default {
  databaseMonitoringMiddleware,
  databaseHealthMiddleware,
  databaseMetricsMiddleware,
  databaseErrorMiddleware
};