/**
 * System Health Routes
 * Endpoints for monitoring error handling, database recovery, and system health
 */

import express from 'express';
import { asyncHandler } from '../middlewares/errorHandler.js';
import databaseService from '../services/databaseService.js';
import networkRecoveryService from '../services/networkRecoveryService.js';
import errorLoggingService from '../services/errorLoggingService.js';
import healthCheckService from '../services/healthCheckService.js';
import trafficMonitoringService from '../services/trafficMonitoringService.js';
import monitoringService from '../services/monitoringService.js';
import metricsCollectionService from '../services/metricsCollectionService.js';
import { errorStatsMiddleware } from '../middleware/errorMonitoringMiddleware.js';
import { getHealthCheckData } from '../middleware/comprehensiveMonitoringMiddleware.js';
import { getDeploymentStatus, getDeploymentReadiness, getDeploymentLiveness } from '../middleware/deploymentMonitoringMiddleware.js';

const router = express.Router();

/**
 * Get overall system health status
 */
router.get('/health', asyncHandler(async (req, res) => {
  const healthStatus = await healthCheckService.getHealthStatus();
  
  res.status(healthStatus.healthy ? 200 : 503).json({
    success: healthStatus.healthy,
    ...healthStatus
  });
}));

/**
 * Get readiness probe status (Kubernetes-style)
 */
router.get('/ready', asyncHandler(async (req, res) => {
  const readinessStatus = await healthCheckService.getReadinessStatus();
  const deploymentReadiness = await getDeploymentReadiness();
  
  const isReady = readinessStatus.ready && deploymentReadiness.ready;
  
  res.status(isReady ? 200 : 503).json({
    success: isReady,
    ready: isReady,
    healthChecks: readinessStatus,
    deployment: deploymentReadiness,
    timestamp: new Date().toISOString()
  });
}));

/**
 * Get liveness probe status (Kubernetes-style)
 */
router.get('/live', asyncHandler(async (req, res) => {
  const livenessStatus = await healthCheckService.getLivenessStatus();
  const deploymentLiveness = await getDeploymentLiveness();
  
  const isAlive = livenessStatus.alive && deploymentLiveness.alive;
  
  res.status(isAlive ? 200 : 503).json({
    success: isAlive,
    alive: isAlive,
    healthChecks: livenessStatus,
    deployment: deploymentLiveness,
    timestamp: new Date().toISOString()
  });
}));

/**
 * Get detailed health report
 */
router.get('/health/detailed', asyncHandler(async (req, res) => {
  const detailedReport = await healthCheckService.getDetailedHealthReport();
  
  res.json({
    success: true,
    data: detailedReport,
    timestamp: new Date().toISOString()
  });
}));

/**
 * Get deployment metrics
 */
router.get('/deployment', asyncHandler(async (req, res) => {
  const deploymentMetrics = healthCheckService.getDeploymentMetrics();
  const deploymentStatus = getDeploymentStatus();
  const comprehensiveData = getHealthCheckData();
  
  res.json({
    success: true,
    data: {
      ...deploymentMetrics,
      status: deploymentStatus,
      monitoring: comprehensiveData.monitoring,
      system: comprehensiveData.system
    },
    timestamp: new Date().toISOString()
  });
}));

/**
 * Get traffic monitoring dashboard
 */
router.get('/traffic', asyncHandler(async (req, res) => {
  const trafficDashboard = trafficMonitoringService.getTrafficDashboard();
  
  res.json({
    success: true,
    data: trafficDashboard,
    timestamp: new Date().toISOString()
  });
}));

/**
 * Get monitoring dashboard data
 */
router.get('/monitoring', asyncHandler(async (req, res) => {
  const dashboardData = monitoringService.getDashboardData();
  const metricsData = metricsCollectionService.getMetricsSummary();
  
  res.json({
    success: true,
    data: {
      monitoring: dashboardData,
      metrics: metricsData
    },
    timestamp: new Date().toISOString()
  });
}));

/**
 * Get detailed database health and recovery status
 */
router.get('/health/database', asyncHandler(async (req, res) => {
  const connectionTest = await databaseService.testConnection();
  const metrics = databaseService.getMetrics();
  const analysis = await databaseService.analyzePerformance();
  
  res.json({
    success: true,
    data: {
      connection: connectionTest,
      metrics,
      analysis,
      recovery: metrics.recovery
    },
    timestamp: new Date().toISOString()
  });
}));

/**
 * Get network services health status
 */
router.get('/health/network', asyncHandler(async (req, res) => {
  const servicesHealth = networkRecoveryService.getAllServicesHealth();
  const stats = networkRecoveryService.getStats();
  
  res.json({
    success: true,
    data: {
      services: servicesHealth,
      stats
    },
    timestamp: new Date().toISOString()
  });
}));

/**
 * Test specific network service
 */
router.post('/health/network/:serviceName/test', asyncHandler(async (req, res) => {
  const { serviceName } = req.params;
  
  // Define test functions for different services
  const testFunctions = {
    supabase: async () => {
      const client = await databaseService.getClient();
      await client.from('profiles').select('count').limit(1);
    },
    'python-ml': async () => {
      // Test Python ML service
      const response = await fetch('http://localhost:8000/health', {
        method: 'GET',
        timeout: 5000
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
    },
    jira: async () => {
      // Test JIRA connectivity (if configured)
      if (process.env.JIRA_BASE_URL) {
        const response = await fetch(`${process.env.JIRA_BASE_URL}/rest/api/2/serverInfo`, {
          timeout: 5000
        });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
      } else {
        throw new Error('JIRA not configured');
      }
    }
  };
  
  const testFn = testFunctions[serviceName];
  if (!testFn) {
    return res.status(400).json({
      success: false,
      error: `Unknown service: ${serviceName}`
    });
  }
  
  const result = await networkRecoveryService.testService(serviceName, testFn);
  
  res.json({
    success: true,
    data: result,
    timestamp: new Date().toISOString()
  });
}));

/**
 * Reset network service health (for recovery)
 */
router.post('/health/network/:serviceName/reset', asyncHandler(async (req, res) => {
  const { serviceName } = req.params;
  
  networkRecoveryService.resetServiceHealth(serviceName);
  
  res.json({
    success: true,
    message: `Health status reset for ${serviceName}`,
    timestamp: new Date().toISOString()
  });
}));

/**
 * Get error statistics
 */
router.get('/errors/stats', errorStatsMiddleware);

/**
 * Get error logs with filtering
 */
router.get('/errors/logs', asyncHandler(async (req, res) => {
  const {
    level,
    severity,
    errorName,
    startDate,
    endDate,
    userId,
    limit = 50
  } = req.query;
  
  const filters = {
    level,
    severity,
    errorName,
    startDate,
    endDate,
    userId,
    limit: parseInt(limit)
  };
  
  // Remove undefined values
  Object.keys(filters).forEach(key => {
    if (filters[key] === undefined) {
      delete filters[key];
    }
  });
  
  const logs = await errorLoggingService.queryLogs(filters);
  
  res.json({
    success: true,
    data: logs,
    count: logs.length,
    filters,
    timestamp: new Date().toISOString()
  });
}));

/**
 * Get error statistics from logging service
 */
router.get('/errors/statistics', asyncHandler(async (req, res) => {
  const { timeWindow = '24 hours' } = req.query;
  
  const stats = await errorLoggingService.getErrorStats(timeWindow);
  
  res.json({
    success: true,
    data: stats,
    timeWindow,
    timestamp: new Date().toISOString()
  });
}));

/**
 * Export error logs
 */
router.get('/errors/export', asyncHandler(async (req, res) => {
  const {
    format = 'json',
    level,
    severity,
    startDate,
    endDate,
    limit = 1000
  } = req.query;
  
  const filters = {
    level,
    severity,
    startDate,
    endDate,
    limit: parseInt(limit)
  };
  
  // Remove undefined values
  Object.keys(filters).forEach(key => {
    if (filters[key] === undefined) {
      delete filters[key];
    }
  });
  
  const exportData = await errorLoggingService.exportLogs(filters, format);
  
  if (!exportData) {
    return res.status(500).json({
      success: false,
      error: 'Failed to export logs'
    });
  }
  
  const filename = `error-logs-${new Date().toISOString().split('T')[0]}.${format}`;
  
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.setHeader('Content-Type', format === 'csv' ? 'text/csv' : 'application/json');
  
  res.send(exportData);
}));

/**
 * Clean up old error logs
 */
router.post('/errors/cleanup', asyncHandler(async (req, res) => {
  const { retentionDays = 30 } = req.body;
  
  await errorLoggingService.cleanupOldLogs(retentionDays);
  
  res.json({
    success: true,
    message: `Cleaned up error logs older than ${retentionDays} days`,
    timestamp: new Date().toISOString()
  });
}));

/**
 * Force database reconnection
 */
router.post('/recovery/database/reconnect', asyncHandler(async (req, res) => {
  const dbService = databaseService.recovery;
  
  // Reset connection state
  dbService.reset();
  
  // Test connection
  const connectionTest = await databaseService.testConnection();
  
  res.json({
    success: true,
    data: {
      reconnected: connectionTest.success,
      connectionTest,
      status: dbService.getStatus()
    },
    timestamp: new Date().toISOString()
  });
}));

/**
 * Get system metrics summary
 */
router.get('/metrics', asyncHandler(async (req, res) => {
  const dbMetrics = databaseService.getMetrics();
  const networkStats = networkRecoveryService.getStats();
  const errorStats = await errorLoggingService.getErrorStats('1 hour');
  
  res.json({
    success: true,
    data: {
      database: {
        totalQueries: dbMetrics.totalQueries,
        successRate: dbMetrics.successRate,
        averageResponseTime: dbMetrics.averageResponseTime,
        slowQueryRate: dbMetrics.slowQueryRate,
        isConnected: dbMetrics.recovery.isConnected,
        circuitBreakerState: dbMetrics.recovery.circuitBreaker.state
      },
      network: {
        totalServices: networkStats.totalServices,
        healthyServices: networkStats.healthyServices,
        openCircuitBreakers: networkStats.openCircuitBreakers,
        averageResponseTime: networkStats.averageResponseTime,
        totalRequests: networkStats.totalRequests
      },
      errors: {
        total: errorStats.total,
        byLevel: errorStats.byLevel,
        bySeverity: errorStats.bySeverity,
        timeline: errorStats.timeline
      }
    },
    timestamp: new Date().toISOString()
  });
}));

export default router;