/**
 * Comprehensive Health Check Service
 * Provides detailed health checks and readiness probes for deployment monitoring
 */

import { supabaseAdmin } from '../config/supabase.js';
import databaseService from './databaseService.js';
import networkRecoveryService from './networkRecoveryService.js';
import monitoringService from './monitoringService.js';
import metricsCollectionService from './metricsCollectionService.js';
import cleanLogger from '../config/cleanLogging.js';
import healthLogger from '../utils/healthLogger.js';

class HealthCheckService {
  constructor() {
    this.healthChecks = new Map();
    this.healthHistory = new Map();
    this.deploymentMetrics = {
      startTime: Date.now(),
      version: process.env.npm_package_version || '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      deploymentId: process.env.DEPLOYMENT_ID || `deploy-${Date.now()}`,
      readinessChecks: new Map(),
      livenessChecks: new Map()
    };
    
    // Silent initialization - no logging
    this.initializeHealthChecks();
    this.startHealthMonitoring();
  }

  /**
   * Initialize health check definitions
   */
  initializeHealthChecks() {
    // Database health check
    this.addHealthCheck('database', {
      name: 'Database Connection',
      type: 'critical',
      timeout: 5000,
      check: async () => {
        const result = await databaseService.testConnection();
        return {
          healthy: result.success,
          responseTime: result.responseTime,
          details: {
            connected: result.success,
            error: result.error,
            connectionPool: databaseService.getMetrics().recovery
          }
        };
      }
    });

    // Memory health check
    this.addHealthCheck('memory', {
      name: 'Memory Usage',
      type: 'warning',
      timeout: 1000,
      check: async () => {
        const memory = process.memoryUsage();
        const percentage = (memory.heapUsed / memory.heapTotal) * 100;
        
        return {
          healthy: percentage < 97, // Relaxed from 95% to 97% for 2GB heap
          responseTime: 0,
          details: {
            heapUsed: memory.heapUsed,
            heapTotal: memory.heapTotal,
            percentage: Math.round(percentage * 100) / 100,
            rss: memory.rss,
            external: memory.external
          }
        };
      }
    });

    // Event loop health check
    this.addHealthCheck('eventLoop', {
      name: 'Event Loop Lag',
      type: 'warning',
      timeout: 2000,
      check: async () => {
        const start = process.hrtime.bigint();
        await new Promise(resolve => setImmediate(resolve));
        const lag = Number(process.hrtime.bigint() - start) / 1000000; // Convert to ms
        
        return {
          healthy: lag < 100,
          responseTime: lag,
          details: {
            lag,
            threshold: 100,
            status: lag < 50 ? 'excellent' : lag < 100 ? 'good' : 'poor'
          }
        };
      }
    });

    // Network services health check
    this.addHealthCheck('networkServices', {
      name: 'Network Services',
      type: 'critical',
      timeout: 10000,
      check: async () => {
        const servicesHealth = networkRecoveryService.getAllServicesHealth();
        const healthyCount = servicesHealth.filter(s => s.isHealthy).length;
        const totalCount = servicesHealth.length;
        
        return {
          healthy: healthyCount === totalCount || (healthyCount / totalCount) >= 0.8, // 80% threshold
          responseTime: 0,
          details: {
            healthy: healthyCount,
            total: totalCount,
            percentage: totalCount > 0 ? Math.round((healthyCount / totalCount) * 100) : 100,
            services: servicesHealth
          }
        };
      }
    });

    // Disk space health check (if available)
    this.addHealthCheck('diskSpace', {
      name: 'Disk Space',
      type: 'warning',
      timeout: 2000,
      check: async () => {
        try {
          // This is a simplified check - in production you'd use fs.statSync
          const stats = process.memoryUsage();
          
          return {
            healthy: true, // Simplified - always healthy for now
            responseTime: 0,
            details: {
              available: 'N/A',
              used: 'N/A',
              percentage: 'N/A',
              note: 'Disk space monitoring not implemented'
            }
          };
        } catch (error) {
          return {
            healthy: false,
            responseTime: 0,
            details: { error: error.message }
          };
        }
      }
    });

    // Application dependencies health check
    this.addHealthCheck('dependencies', {
      name: 'Application Dependencies',
      type: 'warning', // Changed from critical to warning
      timeout: 5000,
      check: async () => {
        const checks = [];
        
        // Check if monitoring services are running
        checks.push({
          name: 'Monitoring Service',
          healthy: monitoringService.isMonitoring,
          details: { running: monitoringService.isMonitoring }
        });
        
        checks.push({
          name: 'Metrics Collection',
          healthy: metricsCollectionService.isCollecting,
          details: { running: metricsCollectionService.isCollecting }
        });
        
        // Check environment variables
        const requiredEnvVars = ['DATABASE_URL', 'SUPABASE_URL', 'SUPABASE_ANON_KEY'];
        const missingEnvVars = requiredEnvVars.filter(envVar => !process.env[envVar]);
        
        checks.push({
          name: 'Environment Variables',
          healthy: missingEnvVars.length === 0,
          details: { 
            required: requiredEnvVars.length,
            missing: missingEnvVars,
            configured: requiredEnvVars.length - missingEnvVars.length
          }
        });
        
        const healthyChecks = checks.filter(c => c.healthy).length;
        
        return {
          healthy: healthyChecks >= 2, // At least 2 out of 3 should be healthy
          responseTime: 0,
          details: {
            checks,
            healthy: healthyChecks,
            total: checks.length,
            percentage: Math.round((healthyChecks / checks.length) * 100)
          }
        };
      }
    });

    // Performance health check
    this.addHealthCheck('performance', {
      name: 'System Performance',
      type: 'warning',
      timeout: 3000,
      check: async () => {
        const dashboardData = monitoringService.getDashboardData();
        const avgResponseTime = dashboardData.summary.averageResponseTime;
        const errorRate = dashboardData.summary.errorRate;
        
        const performanceHealthy = avgResponseTime < 2000 && errorRate < 10;
        
        return {
          healthy: performanceHealthy,
          responseTime: avgResponseTime,
          details: {
            averageResponseTime: avgResponseTime,
            errorRate,
            totalRequests: dashboardData.summary.totalRequests,
            activeAlerts: dashboardData.summary.activeAlerts,
            thresholds: {
              responseTime: 2000,
              errorRate: 10
            }
          }
        };
      }
    });
  }

  /**
   * Add a health check
   */
  addHealthCheck(name, healthCheck) {
    this.healthChecks.set(name, {
      ...healthCheck,
      name,
      lastRun: 0,
      lastResult: null,
      runCount: 0,
      failureCount: 0
    });
    
    healthLogger.init(name, {
      type: healthCheck.type,
      timeout: healthCheck.timeout
    });
  }

  /**
   * Start health monitoring
   */
  startHealthMonitoring() {
    // Run health checks every 30 seconds
    setInterval(() => {
      this.runAllHealthChecks();
    }, 30000);

    // Initial health check (delayed to allow services to initialize)
    setTimeout(() => {
      this.runAllHealthChecks();
    }, 5000);
    
    // Silent - no startup message
  }

  /**
   * Run all health checks
   */
  async runAllHealthChecks() {
    const results = new Map();
    
    const promises = Array.from(this.healthChecks.entries()).map(async ([name, healthCheck]) => {
      try {
        const result = await this.runHealthCheck(name);
        results.set(name, result);
      } catch (error) {
        results.set(name, {
          name,
          healthy: false,
          responseTime: 0,
          error: error.message,
          timestamp: Date.now()
        });
      }
    });

    await Promise.allSettled(promises);
    
    // Store results in history
    this.storeHealthHistory(results);
    
    return results;
  }

  /**
   * Run a specific health check
   */
  async runHealthCheck(name) {
    const healthCheck = this.healthChecks.get(name);
    if (!healthCheck) {
      throw new Error(`Health check '${name}' not found`);
    }

    const timer = healthLogger.timer(name);
    const startTime = Date.now();
    
    try {
      // Run the health check with timeout
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => {
          healthLogger.timeout(name, healthCheck.timeout);
          reject(new Error('Health check timeout'));
        }, healthCheck.timeout);
      });
      
      const checkPromise = healthCheck.check();
      const result = await Promise.race([checkPromise, timeoutPromise]);
      
      const endTime = Date.now();
      const responseTime = endTime - startTime;
      
      // Update health check stats
      healthCheck.lastRun = endTime;
      healthCheck.runCount++;
      
      const wasHealthy = healthCheck.lastResult?.healthy;
      const isHealthy = result.healthy;
      
      if (!isHealthy) {
        healthCheck.failureCount++;
        
        // Only log critical failures for critical checks, and only occasionally for warnings
        if (healthCheck.type === 'critical') {
          healthLogger.critical(name, 'Health check failed', {
            responseTime,
            details: result.details,
            error: result.error
          });
        } else if (healthCheck.failureCount % 5 === 0) {
          // Only log warning failures every 5th time to reduce noise
          healthLogger.warning(name, 'Health check failed', {
            responseTime,
            details: result.details,
            error: result.error,
            failureCount: healthCheck.failureCount
          });
        }
      } else if (wasHealthy === false && isHealthy === true) {
        // Recovery detected
        healthLogger.recovery(name, 'Health check recovered', {
          responseTime,
          details: result.details
        });
      }
      
      const healthResult = {
        name: healthCheck.name,
        type: healthCheck.type,
        healthy: result.healthy,
        responseTime: result.responseTime || responseTime,
        details: result.details,
        timestamp: endTime,
        runCount: healthCheck.runCount,
        failureCount: healthCheck.failureCount,
        successRate: ((healthCheck.runCount - healthCheck.failureCount) / healthCheck.runCount) * 100
      };
      
      healthCheck.lastResult = healthResult;
      timer.end(isHealthy ? 'healthy' : 'unhealthy', {
        successRate: healthResult.successRate
      });
      
      return healthResult;
      
    } catch (error) {
      const endTime = Date.now();
      const responseTime = endTime - startTime;
      
      healthCheck.lastRun = endTime;
      healthCheck.runCount++;
      healthCheck.failureCount++;
      
      // Log error based on type - reduce noise for non-critical failures
      if (healthCheck.type === 'critical') {
        healthLogger.critical(name, `Health check error: ${error.message}`, {
          responseTime,
          error: error.message,
          stack: error.stack
        });
      } else if (healthCheck.failureCount % 5 === 0) {
        // Only log warning errors every 5th time
        healthLogger.warning(name, `Health check error: ${error.message}`, {
          responseTime,
          error: error.message,
          failureCount: healthCheck.failureCount
        });
      }
      
      const healthResult = {
        name: healthCheck.name,
        type: healthCheck.type,
        healthy: false,
        responseTime,
        error: error.message,
        timestamp: endTime,
        runCount: healthCheck.runCount,
        failureCount: healthCheck.failureCount,
        successRate: ((healthCheck.runCount - healthCheck.failureCount) / healthCheck.runCount) * 100
      };
      
      healthCheck.lastResult = healthResult;
      timer.end('error', {
        error: error.message,
        successRate: healthResult.successRate
      });
      
      return healthResult;
    }
  }

  /**
   * Store health check history
   */
  storeHealthHistory(results) {
    const timestamp = Date.now();
    const overallHealth = this.calculateOverallHealth(results);
    const historyEntry = {
      timestamp,
      results: Object.fromEntries(results),
      overallHealth
    };
    
    // Store in memory (limit to last 50 entries instead of 100)
    if (!this.healthHistory.has('global')) {
      this.healthHistory.set('global', []);
    }
    
    const history = this.healthHistory.get('global');
    const previousEntry = history[history.length - 1];
    
    // Check for status changes
    if (previousEntry && previousEntry.overallHealth.status !== overallHealth.status) {
      healthLogger.statusChange(
        previousEntry.overallHealth.status,
        overallHealth.status,
        `Critical: ${overallHealth.criticalFailures}, Warnings: ${overallHealth.warningFailures}`,
        {
          previous: previousEntry.overallHealth,
          current: overallHealth
        }
      );
    }
    
    history.push(historyEntry);
    
    // More aggressive cleanup - keep only 50 entries
    if (history.length > 50) {
      history.shift();
    }
    
    // Log summary less frequently and only for significant changes
    const shouldLogSummary = process.env.SUPPRESS_HEALTH_WARNINGS !== 'true' && (
      history.length % 20 === 0 || // Every 20th run instead of 10th
      overallHealth.status === 'critical' || // Always log critical issues
      (overallHealth.status === 'degraded' && history.length % 50 === 0) // Log degraded less frequently
    );
    
    if (shouldLogSummary) {
      healthLogger.summary(results, overallHealth);
    }
    
    // Store in database asynchronously
    this.storeHealthHistoryInDatabase(historyEntry).catch(error => {
      healthLogger.databaseError('store_history', error, {
        timestamp: historyEntry.timestamp,
        overallHealth: overallHealth.status
      });
    });
  }

  /**
   * Store health history in database
   */
  async storeHealthHistoryInDatabase(historyEntry) {
    try {
      const { error } = await supabaseAdmin
        .from('health_check_history')
        .insert({
          timestamp: new Date(historyEntry.timestamp).toISOString(),
          overall_health: historyEntry.overallHealth.healthy,
          results: historyEntry.results,
          critical_failures: historyEntry.overallHealth.criticalFailures,
          warning_failures: historyEntry.overallHealth.warningFailures,
          total_checks: historyEntry.overallHealth.totalChecks
        });

      if (error && !error.message.includes('relation "health_check_history" does not exist')) {
        throw error;
      }
    } catch (error) {
      // Silently fail if table doesn't exist, but log other errors
      if (!error.message.includes('relation "health_check_history" does not exist')) {
        healthLogger.databaseError('insert_history', error, {
          timestamp: historyEntry.timestamp
        });
        throw error;
      }
    }
  }

  /**
   * Calculate overall health
   */
  calculateOverallHealth(results) {
    const checks = Array.from(results.values());
    const criticalChecks = checks.filter(c => c.type === 'critical');
    const warningChecks = checks.filter(c => c.type === 'warning');
    
    const criticalFailures = criticalChecks.filter(c => !c.healthy).length;
    const warningFailures = warningChecks.filter(c => !c.healthy).length;
    
    // System is unhealthy if any critical check fails
    const healthy = criticalFailures === 0;
    
    return {
      healthy,
      status: healthy ? (warningFailures === 0 ? 'healthy' : 'degraded') : 'unhealthy',
      criticalFailures,
      warningFailures,
      totalChecks: checks.length,
      criticalChecks: criticalChecks.length,
      warningChecks: warningChecks.length
    };
  }

  /**
   * Get current health status
   */
  async getHealthStatus() {
    const results = await this.runAllHealthChecks();
    const overallHealth = this.calculateOverallHealth(results);
    
    return {
      healthy: overallHealth.healthy,
      status: overallHealth.status,
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: this.deploymentMetrics.version,
      environment: this.deploymentMetrics.environment,
      deploymentId: this.deploymentMetrics.deploymentId,
      checks: Object.fromEntries(results),
      summary: overallHealth
    };
  }

  /**
   * Get readiness probe status
   */
  async getReadinessStatus() {
    // Readiness checks - system is ready to serve traffic
    const criticalChecks = ['database', 'networkServices', 'dependencies'];
    const results = new Map();
    
    for (const checkName of criticalChecks) {
      const result = await this.runHealthCheck(checkName);
      results.set(checkName, result);
    }
    
    const allHealthy = Array.from(results.values()).every(r => r.healthy);
    
    return {
      ready: allHealthy,
      timestamp: new Date().toISOString(),
      checks: Object.fromEntries(results),
      message: allHealthy ? 'Service is ready' : 'Service is not ready'
    };
  }

  /**
   * Get liveness probe status
   */
  async getLivenessStatus() {
    // Liveness checks - system is alive and should not be restarted
    const livenessChecks = ['memory', 'eventLoop'];
    const results = new Map();
    
    for (const checkName of livenessChecks) {
      const result = await this.runHealthCheck(checkName);
      results.set(checkName, result);
    }
    
    // Also check if the process is responsive
    const processCheck = {
      name: 'Process Responsiveness',
      healthy: true,
      responseTime: 0,
      details: {
        pid: process.pid,
        uptime: process.uptime(),
        memoryUsage: process.memoryUsage()
      },
      timestamp: Date.now()
    };
    
    results.set('process', processCheck);
    
    const allHealthy = Array.from(results.values()).every(r => r.healthy);
    
    return {
      alive: allHealthy,
      timestamp: new Date().toISOString(),
      checks: Object.fromEntries(results),
      message: allHealthy ? 'Service is alive' : 'Service may need restart'
    };
  }

  /**
   * Get deployment metrics
   */
  getDeploymentMetrics() {
    const uptime = process.uptime();
    const startTime = new Date(this.deploymentMetrics.startTime);
    
    return {
      ...this.deploymentMetrics,
      uptime,
      startTime: startTime.toISOString(),
      currentTime: new Date().toISOString(),
      processId: process.pid,
      nodeVersion: process.version,
      platform: process.platform,
      architecture: process.arch
    };
  }

  /**
   * Get health history
   */
  getHealthHistory(limit = 50) {
    const history = this.healthHistory.get('global') || [];
    return history.slice(-limit).map(entry => ({
      timestamp: new Date(entry.timestamp).toISOString(),
      healthy: entry.overallHealth.healthy,
      status: entry.overallHealth.status,
      criticalFailures: entry.overallHealth.criticalFailures,
      warningFailures: entry.overallHealth.warningFailures,
      totalChecks: entry.overallHealth.totalChecks
    }));
  }

  /**
   * Get detailed health report
   */
  async getDetailedHealthReport() {
    const healthStatus = await this.getHealthStatus();
    const readinessStatus = await this.getReadinessStatus();
    const livenessStatus = await this.getLivenessStatus();
    const deploymentMetrics = this.getDeploymentMetrics();
    const healthHistory = this.getHealthHistory(20);
    
    return {
      overall: healthStatus,
      readiness: readinessStatus,
      liveness: livenessStatus,
      deployment: deploymentMetrics,
      history: healthHistory,
      generatedAt: new Date().toISOString()
    };
  }

  /**
   * Reset health check statistics
   */
  resetHealthCheckStats(checkName = null) {
    if (checkName) {
      const healthCheck = this.healthChecks.get(checkName);
      if (healthCheck) {
        healthCheck.runCount = 0;
        healthCheck.failureCount = 0;
        healthCheck.lastResult = null;
      }
    } else {
      this.healthChecks.forEach(healthCheck => {
        healthCheck.runCount = 0;
        healthCheck.failureCount = 0;
        healthCheck.lastResult = null;
      });
    }
  }

  /**
   * Add custom health check
   */
  addCustomHealthCheck(name, checkFunction, options = {}) {
    this.addHealthCheck(name, {
      name: options.displayName || name,
      type: options.type || 'warning',
      timeout: options.timeout || 5000,
      check: checkFunction
    });
  }

  /**
   * Remove health check
   */
  removeHealthCheck(name) {
    this.healthChecks.delete(name);
  }

  /**
   * Get health check configuration
   */
  getHealthCheckConfiguration() {
    return Array.from(this.healthChecks.entries()).map(([name, check]) => ({
      name,
      displayName: check.name,
      type: check.type,
      timeout: check.timeout,
      runCount: check.runCount,
      failureCount: check.failureCount,
      successRate: check.runCount > 0 ? 
        ((check.runCount - check.failureCount) / check.runCount) * 100 : 0,
      lastRun: check.lastRun ? new Date(check.lastRun).toISOString() : null
    }));
  }
}

// Create singleton instance
const healthCheckService = new HealthCheckService();

export default healthCheckService;