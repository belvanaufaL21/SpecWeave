/**
 * Deployment Monitoring Middleware
 * Monitors deployment health and provides deployment-specific metrics
 */

import healthCheckService from '../services/healthCheckService.js';
import trafficMonitoringService from '../services/trafficMonitoringService.js';

class DeploymentMonitoringMiddleware {
  constructor() {
    this.deploymentStartTime = Date.now();
    this.deploymentId = process.env.DEPLOYMENT_ID || `deploy-${Date.now()}`;
    this.version = process.env.npm_package_version || '1.0.0';
    this.environment = process.env.NODE_ENV || 'development';
    
    this.deploymentMetrics = {
      startTime: this.deploymentStartTime,
      deploymentId: this.deploymentId,
      version: this.version,
      environment: this.environment,
      healthChecks: {
        passed: 0,
        failed: 0,
        lastCheck: null
      },
      traffic: {
        totalRequests: 0,
        firstRequest: null,
        lastRequest: null
      },
      errors: {
        count: 0,
        firstError: null,
        lastError: null
      }
    };
    
    this.isMonitoring = false;
    this.monitoringInterval = null;
    
    this.initializeDeploymentMonitoring();
  }

  /**
   * Initialize deployment monitoring
   */
  initializeDeploymentMonitoring() {
    // Only show startup info in development with verbose logging
    if (process.env.NODE_ENV === 'development' && process.env.LOG_LEVEL === 'DEBUG') {
      console.log(`Starting deployment monitoring for ${this.deploymentId}`);
      console.log(`Version: ${this.version}, Environment: ${this.environment}`);
    }
    
    this.startMonitoring();
    this.performInitialHealthCheck();
  }

  /**
   * Start deployment monitoring
   */
  startMonitoring() {
    if (this.isMonitoring) return;
    
    this.isMonitoring = true;
    
    // Monitor deployment health every 2 minutes
    this.monitoringInterval = setInterval(() => {
      this.performDeploymentHealthCheck();
      this.updateDeploymentMetrics();
    }, 120000); // 2 minutes
  }

  /**
   * Stop deployment monitoring
   */
  stopMonitoring() {
    if (!this.isMonitoring) return;
    
    this.isMonitoring = false;
    
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }
    
    if (process.env.NODE_ENV === 'development') {
      console.log(`Stopped deployment monitoring for ${this.deploymentId}`);
    }
  }

  /**
   * Perform initial health check
   */
  async performInitialHealthCheck() {
    // Only show in verbose mode
    if (process.env.LOG_LEVEL === 'DEBUG') {
      console.log('Performing initial health check...');
    }
    
    try {
      const healthStatus = await healthCheckService.getHealthStatus();
      
      if (healthStatus.healthy) {
        // Only log success in production or when explicitly requested
        if (process.env.NODE_ENV === 'production' || process.env.LOG_LEVEL === 'DEBUG') {
          console.log('✅ [DEPLOYMENT] Initial health check passed');
        }
        this.deploymentMetrics.healthChecks.passed++;
      } else {
        if (process.env.LOG_LEVEL === 'DEBUG') {
          console.warn('Initial health check failed');
        }
        this.deploymentMetrics.healthChecks.failed++;
      }
      
      this.deploymentMetrics.healthChecks.lastCheck = Date.now();
      
    } catch (error) {
      console.error('❌ [DEPLOYMENT] Initial health check error:', error);
      this.deploymentMetrics.healthChecks.failed++;
      this.deploymentMetrics.healthChecks.lastCheck = Date.now();
    }
  }

  /**
   * Perform deployment health check
   */
  async performDeploymentHealthCheck() {
    // Skip health check logging in clean mode
    if (process.env.CLEAN_LOGS === 'true') {
      try {
        const healthStatus = await healthCheckService.getHealthStatus();
        const readinessStatus = await healthCheckService.getReadinessStatus();
        
        if (healthStatus.healthy && readinessStatus.ready) {
          this.deploymentMetrics.healthChecks.passed++;
        } else {
          this.deploymentMetrics.healthChecks.failed++;
        }
        
        this.deploymentMetrics.healthChecks.lastCheck = Date.now();
      } catch (error) {
        this.deploymentMetrics.healthChecks.failed++;
        this.deploymentMetrics.healthChecks.lastCheck = Date.now();
      }
      return;
    }
    
    try {
      const healthStatus = await healthCheckService.getHealthStatus();
      const readinessStatus = await healthCheckService.getReadinessStatus();
      
      if (healthStatus.healthy && readinessStatus.ready) {
        this.deploymentMetrics.healthChecks.passed++;
        
        // Only log in debug mode to reduce noise
        if (process.env.LOG_LEVEL === 'DEBUG') {
          console.log(`Health check passed (${this.getUptime()})`);
        }
      } else {
        this.deploymentMetrics.healthChecks.failed++;
        if (process.env.LOG_LEVEL === 'DEBUG') {
          console.warn(`Health check failed - Healthy: ${healthStatus.healthy}, Ready: ${readinessStatus.ready}`);
        }
      }
      
      this.deploymentMetrics.healthChecks.lastCheck = Date.now();
      
    } catch (error) {
      this.deploymentMetrics.healthChecks.failed++;
      this.deploymentMetrics.healthChecks.lastCheck = Date.now();
      console.error('❌ [DEPLOYMENT] Health check error:', error);
    }
  }

  /**
   * Update deployment metrics
   */
  updateDeploymentMetrics() {
    // Get current traffic metrics
    const trafficMetrics = trafficMonitoringService.getCurrentTrafficMetrics();
    
    // Update traffic totals (this is simplified - in production you'd track cumulative)
    this.deploymentMetrics.traffic.totalRequests += trafficMetrics.requestsPerMinute * 2; // 2 minutes
    
    if (!this.deploymentMetrics.traffic.firstRequest && trafficMetrics.requestsPerMinute > 0) {
      this.deploymentMetrics.traffic.firstRequest = Date.now();
    }
    
    if (trafficMetrics.requestsPerMinute > 0) {
      this.deploymentMetrics.traffic.lastRequest = Date.now();
    }
  }

  /**
   * Record deployment error
   */
  recordDeploymentError(error, context = {}) {
    this.deploymentMetrics.errors.count++;
    
    if (!this.deploymentMetrics.errors.firstError) {
      this.deploymentMetrics.errors.firstError = Date.now();
    }
    
    this.deploymentMetrics.errors.lastError = Date.now();
    
    console.error(`❌ [DEPLOYMENT] Error recorded:`, {
      deploymentId: this.deploymentId,
      error: error.message,
      context,
      errorCount: this.deploymentMetrics.errors.count
    });
  }

  /**
   * Record deployment request
   */
  recordDeploymentRequest(req, res) {
    this.deploymentMetrics.traffic.totalRequests++;
    
    if (!this.deploymentMetrics.traffic.firstRequest) {
      this.deploymentMetrics.traffic.firstRequest = Date.now();
    }
    
    this.deploymentMetrics.traffic.lastRequest = Date.now();
    
    // Record traffic event in traffic monitoring service
    trafficMonitoringService.recordTrafficEvent('request', {
      method: req.method,
      path: req.path,
      userId: req.user?.id,
      userAgent: req.get('User-Agent'),
      requestSize: this.calculateRequestSize(req)
    });
  }

  /**
   * Record deployment response
   */
  recordDeploymentResponse(req, res, responseTime, responseSize) {
    // Record traffic event in traffic monitoring service
    trafficMonitoringService.recordTrafficEvent('response', {
      responseTime,
      statusCode: res.statusCode,
      responseSize
    });
    
    // Record error if response indicates failure
    if (res.statusCode >= 500) {
      trafficMonitoringService.recordTrafficEvent('error', {
        statusCode: res.statusCode,
        endpoint: `${req.method} ${req.path}`
      });
    }
  }

  /**
   * Get deployment status
   */
  getDeploymentStatus() {
    const uptime = Date.now() - this.deploymentStartTime;
    const healthCheckSuccessRate = this.deploymentMetrics.healthChecks.passed + this.deploymentMetrics.healthChecks.failed > 0
      ? (this.deploymentMetrics.healthChecks.passed / (this.deploymentMetrics.healthChecks.passed + this.deploymentMetrics.healthChecks.failed)) * 100
      : 0;
    
    return {
      deploymentId: this.deploymentId,
      version: this.version,
      environment: this.environment,
      status: this.calculateDeploymentStatus(),
      uptime,
      startTime: new Date(this.deploymentStartTime).toISOString(),
      metrics: {
        ...this.deploymentMetrics,
        healthCheckSuccessRate,
        errorRate: this.deploymentMetrics.traffic.totalRequests > 0 
          ? (this.deploymentMetrics.errors.count / this.deploymentMetrics.traffic.totalRequests) * 100 
          : 0
      },
      timestamps: {
        firstRequest: this.deploymentMetrics.traffic.firstRequest 
          ? new Date(this.deploymentMetrics.traffic.firstRequest).toISOString() 
          : null,
        lastRequest: this.deploymentMetrics.traffic.lastRequest 
          ? new Date(this.deploymentMetrics.traffic.lastRequest).toISOString() 
          : null,
        firstError: this.deploymentMetrics.errors.firstError 
          ? new Date(this.deploymentMetrics.errors.firstError).toISOString() 
          : null,
        lastError: this.deploymentMetrics.errors.lastError 
          ? new Date(this.deploymentMetrics.errors.lastError).toISOString() 
          : null,
        lastHealthCheck: this.deploymentMetrics.healthChecks.lastCheck 
          ? new Date(this.deploymentMetrics.healthChecks.lastCheck).toISOString() 
          : null
      }
    };
  }

  /**
   * Calculate deployment status
   */
  calculateDeploymentStatus() {
    const uptime = Date.now() - this.deploymentStartTime;
    const totalHealthChecks = this.deploymentMetrics.healthChecks.passed + this.deploymentMetrics.healthChecks.failed;
    const healthCheckSuccessRate = totalHealthChecks > 0 
      ? (this.deploymentMetrics.healthChecks.passed / totalHealthChecks) * 100 
      : 0;
    
    // Deployment is considered healthy if:
    // 1. It's been running for at least 5 minutes
    // 2. Health check success rate is above 80%
    // 3. Error rate is below 10%
    
    if (uptime < 300000) { // Less than 5 minutes
      return 'starting';
    }
    
    if (totalHealthChecks === 0) {
      return 'unknown';
    }
    
    if (healthCheckSuccessRate >= 90) {
      return 'healthy';
    }
    
    if (healthCheckSuccessRate >= 70) {
      return 'degraded';
    }
    
    return 'unhealthy';
  }

  /**
   * Get deployment readiness
   */
  async getDeploymentReadiness() {
    try {
      const readinessStatus = await healthCheckService.getReadinessStatus();
      const deploymentStatus = this.getDeploymentStatus();
      
      const isReady = readinessStatus.ready && 
                     deploymentStatus.status !== 'unhealthy' &&
                     deploymentStatus.status !== 'starting';
      
      return {
        ready: isReady,
        deploymentStatus: deploymentStatus.status,
        healthChecks: readinessStatus,
        deployment: deploymentStatus,
        timestamp: new Date().toISOString()
      };
      
    } catch (error) {
      return {
        ready: false,
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Get deployment liveness
   */
  async getDeploymentLiveness() {
    try {
      const livenessStatus = await healthCheckService.getLivenessStatus();
      const deploymentStatus = this.getDeploymentStatus();
      
      const isAlive = livenessStatus.alive && 
                     deploymentStatus.status !== 'unhealthy';
      
      return {
        alive: isAlive,
        deploymentStatus: deploymentStatus.status,
        healthChecks: livenessStatus,
        deployment: deploymentStatus,
        timestamp: new Date().toISOString()
      };
      
    } catch (error) {
      return {
        alive: false,
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Get uptime string
   */
  getUptime() {
    const uptime = Date.now() - this.deploymentStartTime;
    const hours = Math.floor(uptime / 3600000);
    const minutes = Math.floor((uptime % 3600000) / 60000);
    const seconds = Math.floor((uptime % 60000) / 1000);
    
    return `${hours}h ${minutes}m ${seconds}s`;
  }

  /**
   * Calculate request size
   */
  calculateRequestSize(req) {
    let size = 0;
    
    if (req.headers) {
      size += JSON.stringify(req.headers).length;
    }
    
    if (req.body) {
      size += JSON.stringify(req.body).length;
    }
    
    if (req.query) {
      size += JSON.stringify(req.query).length;
    }
    
    return size;
  }

  /**
   * Middleware function
   */
  middleware() {
    return (req, res, next) => {
      // Record request
      this.recordDeploymentRequest(req, res);
      
      // Capture response metrics
      const startTime = Date.now();
      
      const originalJson = res.json;
      const originalSend = res.send;
      
      res.json = (data) => {
        const responseTime = Date.now() - startTime;
        const responseSize = data ? JSON.stringify(data).length : 0;
        this.recordDeploymentResponse(req, res, responseTime, responseSize);
        return originalJson.call(res, data);
      };
      
      res.send = (data) => {
        const responseTime = Date.now() - startTime;
        const responseSize = data ? data.length : 0;
        this.recordDeploymentResponse(req, res, responseTime, responseSize);
        return originalSend.call(res, data);
      };
      
      next();
    };
  }
}

// Create singleton instance
const deploymentMonitoringMiddleware = new DeploymentMonitoringMiddleware();

// Export middleware function and utilities
export const deploymentMiddleware = deploymentMonitoringMiddleware.middleware.bind(deploymentMonitoringMiddleware);
export const getDeploymentStatus = () => deploymentMonitoringMiddleware.getDeploymentStatus();
export const getDeploymentReadiness = () => deploymentMonitoringMiddleware.getDeploymentReadiness();
export const getDeploymentLiveness = () => deploymentMonitoringMiddleware.getDeploymentLiveness();
export const recordDeploymentError = (error, context) => deploymentMonitoringMiddleware.recordDeploymentError(error, context);

export default deploymentMonitoringMiddleware;