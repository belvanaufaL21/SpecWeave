/**
 * Comprehensive Monitoring Middleware
 * Integrates all monitoring services for complete observability
 */

import monitoringService from '../services/monitoringService.js';
import alertingService from '../services/alertingService.js';
import metricsCollectionService from '../services/metricsCollectionService.js';
import { performanceMiddleware } from './performanceMiddleware.js';
import { errorMonitoringMiddleware } from './errorMonitoringMiddleware.js';

class ComprehensiveMonitoringMiddleware {
  constructor() {
    this.isInitialized = false;
    this.requestMetrics = new Map();
    this.activeRequests = new Set();
  }

  /**
   * Initialize monitoring middleware
   */
  initialize() {
    if (this.isInitialized) return;

    // Start monitoring services
    monitoringService.startMonitoring();
    metricsCollectionService.startCollection();

    this.isInitialized = true;
  }

  /**
   * Shutdown monitoring middleware
   */
  shutdown() {
    if (!this.isInitialized) return;

    // Stop monitoring services
    monitoringService.stopMonitoring();
    metricsCollectionService.stopCollection();

    this.isInitialized = false;
  }

  /**
   * Main monitoring middleware
   */
  middleware() {
    return (req, res, next) => {
      const requestId = req.requestId || `req-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const startTime = Date.now();
      const startHrTime = process.hrtime.bigint();

      // Set request ID if not already set
      req.requestId = requestId;
      req.monitoringStartTime = startTime;

      // Track active request
      this.activeRequests.add(requestId);

      // Create request context
      const requestContext = {
        id: requestId,
        method: req.method,
        path: req.path,
        route: req.route?.path,
        userAgent: req.get('User-Agent'),
        ip: req.ip,
        userId: req.user?.id,
        startTime,
        startHrTime
      };

      // Store request context
      this.requestMetrics.set(requestId, requestContext);

      // Monitor request size
      const requestSize = this.calculateRequestSize(req);
      if (requestSize > 10 * 1024 * 1024) { // 10MB
        alertingService.checkPerformanceMetric({
          duration: 0,
          metadata: { 
            type: 'large_request',
            size: requestSize,
            endpoint: `${req.method} ${req.path}`
          }
        });
      }

      // Override response methods to capture metrics
      this.wrapResponseMethods(req, res, requestContext);

      // Set timeout monitoring
      const timeoutWarning = setTimeout(() => {
        monitoringService.recordPerformanceMetric(
          `${req.method} ${req.path}`,
          Date.now() - startTime,
          { 
            type: 'long_running_request',
            requestId,
            warning: true
          }
        );
      }, 30000); // 30 seconds

      // Clear timeout on response
      res.on('finish', () => {
        clearTimeout(timeoutWarning);
      });

      next();
    };
  }

  /**
   * Wrap response methods to capture metrics
   */
  wrapResponseMethods(req, res, requestContext) {
    const originalJson = res.json;
    const originalSend = res.send;
    const originalEnd = res.end;

    // Wrap res.json
    res.json = (data) => {
      this.captureResponseMetrics(req, res, requestContext, data);
      return originalJson.call(res, data);
    };

    // Wrap res.send
    res.send = (data) => {
      this.captureResponseMetrics(req, res, requestContext, data);
      return originalSend.call(res, data);
    };

    // Wrap res.end
    res.end = (data) => {
      this.captureResponseMetrics(req, res, requestContext, data);
      return originalEnd.call(res, data);
    };

    // Handle response finish event
    res.on('finish', () => {
      this.finalizeRequestMetrics(req, res, requestContext);
    });

    // Handle response close event (client disconnect)
    res.on('close', () => {
      if (!res.finished) {
        this.handleClientDisconnect(req, res, requestContext);
      }
    });
  }

  /**
   * Capture response metrics
   */
  captureResponseMetrics(req, res, requestContext, data) {
    if (requestContext.metricsCapture) return; // Already captured
    
    const endTime = Date.now();
    const endHrTime = process.hrtime.bigint();
    const duration = endTime - requestContext.startTime;
    const precisionDuration = Number(endHrTime - requestContext.startHrTime) / 1000000; // Convert to ms

    // Calculate response size
    const responseSize = this.calculateResponseSize(data);

    // Update request context
    requestContext.endTime = endTime;
    requestContext.duration = duration;
    requestContext.precisionDuration = precisionDuration;
    requestContext.statusCode = res.statusCode;
    requestContext.responseSize = responseSize;
    requestContext.success = res.statusCode < 400;
    requestContext.metricsCapture = true;

    // Record performance metric
    monitoringService.recordPerformanceMetric(
      `${req.method} ${req.route?.path || req.path}`,
      duration,
      {
        requestId: requestContext.id,
        statusCode: res.statusCode,
        responseSize,
        requestSize: this.calculateRequestSize(req),
        userAgent: req.get('User-Agent'),
        userId: req.user?.id,
        precisionDuration
      }
    );

    // Check performance thresholds
    alertingService.checkPerformanceMetric({
      duration,
      operation: `${req.method} ${req.path}`,
      statusCode: res.statusCode,
      success: res.statusCode < 400
    });

    // Check for slow queries if this is a database-heavy endpoint
    if (this.isDatabaseHeavyEndpoint(req.path) && duration > 2000) {
      alertingService.sendAlert('slow_database_operation', {
        endpoint: `${req.method} ${req.path}`,
        duration,
        threshold: 2000
      });
    }

    // Monitor large responses
    if (responseSize > 5 * 1024 * 1024) { // 5MB
      alertingService.sendAlert('large_response', {
        endpoint: `${req.method} ${req.path}`,
        size: responseSize,
        threshold: 5 * 1024 * 1024
      });
    }
  }

  /**
   * Finalize request metrics
   */
  finalizeRequestMetrics(req, res, requestContext) {
    // Remove from active requests
    this.activeRequests.delete(requestContext.id);

    // Clean up request metrics after some time
    setTimeout(() => {
      this.requestMetrics.delete(requestContext.id);
    }, 300000); // 5 minutes

    // Log request completion only in development
    if (process.env.NODE_ENV === 'development') {
      const statusEmoji = res.statusCode < 400 ? '✅' : res.statusCode < 500 ? '⚠️' : '❌';
      console.log(
        `${statusEmoji} [${res.statusCode}] ${req.method} ${req.path} - ${requestContext.duration}ms`
      );
    }
  }

  /**
   * Handle client disconnect
   */
  handleClientDisconnect(req, res, requestContext) {
    const duration = Date.now() - requestContext.startTime;
    
    // Record as an error metric
    monitoringService.recordErrorMetric(
      new Error('Client disconnected'),
      {
        type: 'client_disconnect',
        requestId: requestContext.id,
        duration,
        endpoint: `${req.method} ${req.path}`
      }
    );

    // Remove from active requests
    this.activeRequests.delete(requestContext.id);
    this.requestMetrics.delete(requestContext.id);
  }

  /**
   * Calculate request size
   */
  calculateRequestSize(req) {
    let size = 0;
    
    // Headers size
    if (req.headers) {
      size += JSON.stringify(req.headers).length;
    }
    
    // Body size
    if (req.body) {
      size += JSON.stringify(req.body).length;
    }
    
    // Query parameters size
    if (req.query) {
      size += JSON.stringify(req.query).length;
    }
    
    return size;
  }

  /**
   * Calculate response size
   */
  calculateResponseSize(data) {
    if (!data) return 0;
    
    if (typeof data === 'string') {
      return Buffer.byteLength(data, 'utf8');
    }
    
    if (typeof data === 'object') {
      return Buffer.byteLength(JSON.stringify(data), 'utf8');
    }
    
    return 0;
  }

  /**
   * Check if endpoint is database-heavy
   */
  isDatabaseHeavyEndpoint(path) {
    const databaseHeavyPatterns = [
      '/api/test',
      '/api/evaluation',
      '/api/performance',
      '/api/templates',
      '/api/references'
    ];
    
    return databaseHeavyPatterns.some(pattern => path.startsWith(pattern));
  }

  /**
   * Get active requests
   */
  getActiveRequests() {
    return Array.from(this.activeRequests).map(requestId => {
      const context = this.requestMetrics.get(requestId);
      if (!context) return null;
      
      return {
        id: requestId,
        method: context.method,
        path: context.path,
        duration: Date.now() - context.startTime,
        userId: context.userId,
        ip: context.ip
      };
    }).filter(Boolean);
  }

  /**
   * Get request metrics summary
   */
  getRequestMetricsSummary() {
    const activeRequests = this.getActiveRequests();
    const totalRequests = this.requestMetrics.size;
    
    // Calculate average response time from recent requests
    const recentRequests = Array.from(this.requestMetrics.values())
      .filter(r => r.duration && Date.now() - r.endTime < 300000) // Last 5 minutes
      .slice(-100); // Last 100 requests
    
    const avgResponseTime = recentRequests.length > 0 
      ? recentRequests.reduce((sum, r) => sum + r.duration, 0) / recentRequests.length
      : 0;
    
    const successRate = recentRequests.length > 0
      ? (recentRequests.filter(r => r.success).length / recentRequests.length) * 100
      : 0;

    return {
      activeRequests: activeRequests.length,
      totalTrackedRequests: totalRequests,
      averageResponseTime: Math.round(avgResponseTime),
      successRate: Math.round(successRate * 100) / 100,
      recentRequestsCount: recentRequests.length,
      slowRequests: activeRequests.filter(r => r.duration > 5000).length,
      longRunningRequests: activeRequests.filter(r => r.duration > 30000).length
    };
  }

  /**
   * Health check endpoint data
   */
  getHealthCheckData() {
    const requestSummary = this.getRequestMetricsSummary();
    const systemMetrics = monitoringService.getCurrentSystemMetrics();
    
    return {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      requests: requestSummary,
      system: systemMetrics,
      monitoring: {
        isInitialized: this.isInitialized,
        servicesRunning: {
          monitoringService: monitoringService.isMonitoring,
          metricsCollection: metricsCollectionService.isCollecting
        }
      }
    };
  }
}

// Create singleton instance
const comprehensiveMonitoringMiddleware = new ComprehensiveMonitoringMiddleware();

// Export middleware function and instance
export const monitoringMiddleware = comprehensiveMonitoringMiddleware.middleware.bind(comprehensiveMonitoringMiddleware);
export const initializeMonitoring = () => comprehensiveMonitoringMiddleware.initialize();
export const shutdownMonitoring = () => comprehensiveMonitoringMiddleware.shutdown();
export const getActiveRequests = () => comprehensiveMonitoringMiddleware.getActiveRequests();
export const getRequestMetricsSummary = () => comprehensiveMonitoringMiddleware.getRequestMetricsSummary();
export const getHealthCheckData = () => comprehensiveMonitoringMiddleware.getHealthCheckData();

export default comprehensiveMonitoringMiddleware;