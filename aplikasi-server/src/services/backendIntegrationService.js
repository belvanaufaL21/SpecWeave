/**
 * Backend Integration Service - Coordinates all backend optimizations
 */

import monitoringService from './monitoringService.js';
import cacheService from './cacheService.js';
import databaseService from './databaseService.js';
import healthCheckService from './healthCheckService.js';
import errorLoggingService from './errorLoggingService.js';
import alertingService from './alertingService.js';
import cleanLogger from '../config/cleanLogging.js';

class BackendIntegrationService {
  constructor() {
    this.initialized = false;
    this.services = new Map();
    this.healthChecks = new Map();
  }

  /**
   * Initialize all backend optimization services
   */
  async initialize() {
    if (this.initialized) {
      return;
    }

    try {
      // Initialize core services
      await this.initializeCoreServices();

      // Initialize monitoring
      await this.initializeMonitoring();

      // Initialize health checks
      await this.initializeHealthChecks();

      // Setup service coordination
      this.setupServiceCoordination();

      this.initialized = true;
      cleanLogger.success('Backend optimization services initialized');

    } catch (error) {
      cleanLogger.error('Failed to initialize backend services', error.message);
      throw error;
    }
  }

  /**
   * Initialize core optimization services
   */
  async initializeCoreServices() {
    // Register database service (already initialized)
    this.services.set('database', databaseService);

    // Register cache service (already initialized)
    this.services.set('cache', cacheService);

    // Register error logging service (already initialized)
    this.services.set('errorLogging', errorLoggingService);
  }
  /**
   * Initialize monitoring services
   */
  async initializeMonitoring() {
    // Register monitoring service (already initialized)
    this.services.set('monitoring', monitoringService);

    // Register health check service (already initialized)
    this.services.set('healthCheck', healthCheckService);

    // Register alerting service (already initialized)
    this.services.set('alerting', alertingService);
  }

  /**
   * Initialize health checks for all services
   */
  async initializeHealthChecks() {
    for (const [name, service] of this.services) {
      if (service.healthCheck) {
        this.healthChecks.set(name, service.healthCheck.bind(service));
      }
    }

    // Start periodic health checks
    this.startHealthCheckInterval();
  }

  /**
   * Setup coordination between services
   */
  setupServiceCoordination() {
    // Setup error handling coordination
    this.setupErrorCoordination();
    
    // Setup performance monitoring coordination
    this.setupPerformanceCoordination();
    
    // Setup cache coordination
    this.setupCacheCoordination();
  }

  /**
   * Setup error handling coordination
   */
  setupErrorCoordination() {
    // Services are already initialized and working independently
    // Error coordination happens through middleware and direct service calls
  }

  /**
   * Setup performance monitoring coordination
   */
  setupPerformanceCoordination() {
    // Performance monitoring happens through middleware
    // Alerting is handled by the alerting service directly
  }

  /**
   * Setup cache coordination
   */
  setupCacheCoordination() {
    // Cache invalidation is handled directly in database operations
    // No additional coordination needed
  }

  /**
   * Start periodic health checks
   */
  startHealthCheckInterval() {
    setInterval(async () => {
      const healthStatus = await this.runHealthChecks();
      
      if (!healthStatus.healthy) {
        console.warn('Backend health check failed:', healthStatus);
        alertingService.sendHealthAlert(healthStatus);
      }
    }, 60000); // Every minute
  }

  /**
   * Run health checks on all services
   */
  async runHealthChecks() {
    const results = {};
    let healthy = true;

    for (const [name, healthCheck] of this.healthChecks) {
      try {
        const result = await healthCheck();
        results[name] = result;
        if (!result.healthy) {
          healthy = false;
        }
      } catch (error) {
        results[name] = { healthy: false, error: error.message };
        healthy = false;
      }
    }

    return { healthy, results, timestamp: Date.now() };
  }

  /**
   * Get integration status
   */
  getStatus() {
    return {
      initialized: this.initialized,
      services: Array.from(this.services.keys()),
      healthChecks: Array.from(this.healthChecks.keys()),
      timestamp: Date.now()
    };
  }

  /**
   * Shutdown all services gracefully
   */
  async shutdown() {
    console.log('🔄 Shutting down backend services...');

    try {
      const serviceNames = Array.from(this.services.keys()).reverse();
      
      for (const name of serviceNames) {
        const service = this.services.get(name);
        if (service.shutdown) {
          await service.shutdown();
          console.log(`✅ ${name} service shutdown complete`);
        }
      }

      this.initialized = false;
      console.log('✅ All backend services shutdown complete');

    } catch (error) {
      console.error('❌ Error during backend shutdown:', error);
      throw error;
    }
  }
}

// Create singleton instance
const backendIntegrationService = new BackendIntegrationService();

export default backendIntegrationService;