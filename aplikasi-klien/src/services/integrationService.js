/**
 * Integration Service - Wires together all optimization components
 * Ensures proper integration between frontend and backend improvements
 */

import cleanLogger from '../config/cleanLogging.js';

class IntegrationService {
  constructor() {
    this.initialized = false;
    this.components = new Map();
    this.healthChecks = new Map();
    this.performanceMonitor = null;
    this.globalErrorHandler = null;
    this.connectionManager = null;
    this.focusManager = null;
    this.keyboardNavigation = null;
  }

  /**
   * Load optimization components with fallbacks
   */
  async loadComponents() {
    // Load performance monitor
    try {
      const perfModule = await import('../utils/performance/performanceMonitor.js');
      this.performanceMonitor = perfModule.performanceMonitor || perfModule.default;
    } catch (error) {
      this.performanceMonitor = {
        startMonitoring: () => {}, // Silent
        onPerformanceIssue: (callback) => {},
        trackEvent: (name, data) => {},
        trackMetric: (name, data) => {},
        trackUserInteraction: (type, data) => {}
      };
    }

    // Ensure performanceMonitor has required methods
    if (!this.performanceMonitor || typeof this.performanceMonitor.startMonitoring !== 'function') {
      this.performanceMonitor = {
        startMonitoring: () => {}, // Silent
        onPerformanceIssue: (callback) => {},
        trackEvent: (name, data) => {},
        trackMetric: (name, data) => {},
        trackUserInteraction: (type, data) => {}
      };
    }

    // Load global error handler
    try {
      const errorModule = await import('../utils/errors/globalErrorHandler.js');
      this.globalErrorHandler = errorModule.globalErrorHandler || errorModule.default;
    } catch (error) {
      this.globalErrorHandler = {
        initialize: () => {}, // Silent
        handleError: (error, context) => {},
        handlePerformanceIssue: (issue) => {},
        onCriticalError: (callback) => {},
        handleHealthCheckFailure: (status) => {}
      };
    }

    // Ensure globalErrorHandler has required methods
    if (!this.globalErrorHandler || typeof this.globalErrorHandler.initialize !== 'function') {
      this.globalErrorHandler = {
        initialize: () => {}, // Silent
        handleError: (error, context) => {},
        handlePerformanceIssue: (issue) => {},
        onCriticalError: (callback) => {},
        handleHealthCheckFailure: (status) => {}
      };
    }

    // Load connection manager
    try {
      const connModule = await import('../utils/realtime/ConnectionManager.js');
      const ConnectionManager = connModule.ConnectionManager || connModule.default;
      if (ConnectionManager && typeof ConnectionManager === 'function') {
        this.connectionManager = new ConnectionManager();
      } else {
        throw new Error('ConnectionManager is not a constructor');
      }
    } catch (error) {
      this.connectionManager = {
        initialize: async () => {}, // Silent
        onConnectionChange: (callback) => {}
      };
    }

    // Ensure connectionManager has required methods
    if (!this.connectionManager || typeof this.connectionManager.initialize !== 'function') {
      this.connectionManager = {
        initialize: async () => {}, // Silent
        onConnectionChange: (callback) => {}
      };
    }

    // Load focus manager
    try {
      const focusModule = await import('../utils/accessibility/focusManager.js');
      this.focusManager = focusModule.focusManager || focusModule.default;
    } catch (error) {
      this.focusManager = {
        initialize: () => {} // Silent
      };
    }

    // Ensure focusManager has required methods
    if (!this.focusManager || typeof this.focusManager.initialize !== 'function') {
      this.focusManager = {
        initialize: () => {} // Silent
      };
    }

    // Load keyboard navigation
    try {
      const keyboardModule = await import('../utils/accessibility/keyboardNavigation.js');
      this.keyboardNavigation = keyboardModule.keyboardNavigation || keyboardModule.default;
    } catch (error) {
      this.keyboardNavigation = {
        initialize: () => {} // Silent
      };
    }

    // Ensure keyboardNavigation has required methods
    if (!this.keyboardNavigation || typeof this.keyboardNavigation.initialize !== 'function') {
      this.keyboardNavigation = {
        initialize: () => {} // Silent
      };
    }
  }

  /**
   * Initialize all optimization components
   */
  async initialize() {
    if (this.initialized) {
      cleanLogger.warn('INTEGRATION', 'Already initialized');
      return;
    }

    try {
      cleanLogger.startup();

      // Load components first - with individual error handling
      try {
        await this.loadComponents();
      } catch (error) {
        cleanLogger.warn('INTEGRATION', 'Component loading failed, using fallbacks', error);
      }

      // Initialize performance monitoring - non-critical
      try {
        await this.initializePerformanceMonitoring();
      } catch (error) {
        cleanLogger.warn('INTEGRATION', 'Performance monitoring init failed', error);
      }

      // Initialize error handling - non-critical
      try {
        await this.initializeErrorHandling();
      } catch (error) {
        cleanLogger.warn('INTEGRATION', 'Error handling init failed', error);
      }

      // Initialize real-time features - non-critical
      try {
        await this.initializeRealTimeFeatures();
      } catch (error) {
        cleanLogger.warn('INTEGRATION', 'Real-time features init failed', error);
      }

      // Initialize accessibility features - non-critical
      try {
        await this.initializeAccessibilityFeatures();
      } catch (error) {
        cleanLogger.warn('INTEGRATION', 'Accessibility features init failed', error);
      }

      // Initialize health checks - non-critical
      try {
        await this.initializeHealthChecks();
      } catch (error) {
        cleanLogger.warn('INTEGRATION', 'Health checks init failed', error);
      }

      // Setup integration monitoring - non-critical
      try {
        this.setupIntegrationMonitoring();
      } catch (error) {
        cleanLogger.warn('INTEGRATION', 'Integration monitoring setup failed', error);
      }

      this.initialized = true;
      cleanLogger.ready();

      // Emit initialization complete event
      try {
        window.dispatchEvent(new CustomEvent('specweave:optimization:ready', {
          detail: { timestamp: Date.now() }
        }));
      } catch (error) {
        // Ignore event dispatch errors
      }

    } catch (error) {
      // Log but don't throw - allow app to continue
      cleanLogger.warn('INTEGRATION', 'Initialization completed with errors', error);
      this.initialized = true; // Mark as initialized anyway
    }
  }

  /**
   * Initialize performance monitoring integration
   */
  async initializePerformanceMonitoring() {
    try {
      // Start performance monitoring
      this.performanceMonitor.startMonitoring();
      
      // Register component for health checks
      this.components.set('performanceMonitor', this.performanceMonitor);
      
      // Setup performance alerts
      this.performanceMonitor.onPerformanceIssue((issue) => {
        cleanLogger.warn('PERFORMANCE', 'Performance issue detected', issue);
        this.globalErrorHandler.handlePerformanceIssue(issue);
      });

      // Silent success - no logging
    } catch (error) {
      cleanLogger.error('PERFORMANCE', 'Failed to initialize performance monitoring', error);
      throw error;
    }
  }

  /**
   * Initialize error handling integration
   */
  async initializeErrorHandling() {
    try {
      // Initialize global error handler
      this.globalErrorHandler.initialize();
      
      // Register component for health checks
      this.components.set('errorHandler', this.globalErrorHandler);
      
      // Setup error recovery mechanisms
      this.globalErrorHandler.onCriticalError((error) => {
        cleanLogger.error('CRITICAL', 'Critical error detected', error);
        this.handleCriticalError(error);
      });

      // Silent success - no logging
    } catch (error) {
      cleanLogger.error('ERROR_HANDLER', 'Failed to initialize error handling', error);
      throw error;
    }
  }

  /**
   * Initialize real-time features integration
   */
  async initializeRealTimeFeatures() {
    try {
      // Initialize connection manager
      await this.connectionManager.initialize();
      
      // Register component for health checks
      this.components.set('connectionManager', this.connectionManager);
      
      // Setup connection monitoring
      this.connectionManager.onConnectionChange((status) => {
        cleanLogger.debugThrottled('CONNECTION', 'Connection status changed', status);
        this.handleConnectionChange(status);
      });

      // Silent success - no logging
    } catch (error) {
      cleanLogger.error('REALTIME', 'Failed to initialize real-time features', error);
      throw error;
    }
  }

  /**
   * Initialize accessibility features integration
   */
  async initializeAccessibilityFeatures() {
    try {
      // Initialize focus management
      this.focusManager.initialize();
      
      // Initialize keyboard navigation
      this.keyboardNavigation.initialize();
      
      // Register components for health checks
      this.components.set('focusManager', this.focusManager);
      this.components.set('keyboardNavigation', this.keyboardNavigation);

      // Silent success - no logging
    } catch (error) {
      cleanLogger.error('ACCESSIBILITY', 'Failed to initialize accessibility features', error);
      throw error;
    }
  }

  /**
   * Initialize health checks for all components
   */
  async initializeHealthChecks() {
    try {
      // Setup health checks for each component
      for (const [name, component] of this.components) {
        if (component.healthCheck) {
          this.healthChecks.set(name, component.healthCheck.bind(component));
        }
      }

      // Start periodic health checks
      this.startHealthCheckInterval();

      // Silent success - no logging
    } catch (error) {
      cleanLogger.error('HEALTH', 'Failed to initialize health checks', error);
      throw error;
    }
  }

  /**
   * Setup integration monitoring
   */
  setupIntegrationMonitoring() {
    // Monitor component interactions
    this.monitorComponentInteractions();
    
    // Monitor system resources
    this.monitorSystemResources();
    
    // Monitor user experience metrics
    this.monitorUserExperience();
  }

  /**
   * Monitor interactions between components
   */
  monitorComponentInteractions() {
    // Track component communication
    const originalDispatchEvent = window.dispatchEvent;
    window.dispatchEvent = (event) => {
      if (event.type.startsWith('specweave:')) {
        this.performanceMonitor.trackEvent('component_interaction', {
          type: event.type,
          timestamp: Date.now()
        });
      }
      return originalDispatchEvent.call(window, event);
    };
  }

  /**
   * Monitor system resources
   */
  monitorSystemResources() {
    if ('memory' in performance) {
      setInterval(() => {
        const memInfo = performance.memory;
        this.performanceMonitor.trackMetric('memory_usage', {
          used: memInfo.usedJSHeapSize,
          total: memInfo.totalJSHeapSize,
          limit: memInfo.jsHeapSizeLimit
        });
      }, 30000); // Every 30 seconds
    }
  }

  /**
   * Monitor user experience metrics
   */
  monitorUserExperience() {
    // Track user interactions
    ['click', 'keydown', 'scroll'].forEach(eventType => {
      document.addEventListener(eventType, (event) => {
        this.performanceMonitor.trackUserInteraction(eventType, {
          timestamp: Date.now(),
          target: event.target.tagName
        });
      }, { passive: true });
    });
  }

  /**
   * Start periodic health checks
   */
  startHealthCheckInterval() {
    setInterval(async () => {
      const healthStatus = await this.runHealthChecks();
      
      // Only log health check failures at debug level to avoid noise
      if (!healthStatus.healthy && cleanLogger.shouldLog('DEBUG')) {
        cleanLogger.debug('HEALTH', 'Health check failed', healthStatus);
        this.globalErrorHandler.handleHealthCheckFailure(healthStatus);
      }
    }, 60000); // Every minute
  }

  /**
   * Run health checks on all components
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
   * Handle critical errors
   */
  handleCriticalError(error) {
    // Attempt graceful degradation
    cleanLogger.warn('CRITICAL', 'Attempting graceful degradation for critical error');
    
    // Notify user
    window.dispatchEvent(new CustomEvent('specweave:critical_error', {
      detail: { error, timestamp: Date.now() }
    }));
  }

  /**
   * Handle connection changes
   */
  handleConnectionChange(status) {
    // Update UI based on connection status
    window.dispatchEvent(new CustomEvent('specweave:connection_change', {
      detail: { status, timestamp: Date.now() }
    }));
  }

  /**
   * Get integration status
   */
  getStatus() {
    return {
      initialized: this.initialized,
      components: Array.from(this.components.keys()),
      healthChecks: Array.from(this.healthChecks.keys()),
      timestamp: Date.now()
    };
  }

  /**
   * Shutdown all components gracefully
   */
  async shutdown() {
    cleanLogger.info('INTEGRATION', 'Shutting down optimization components...');

    try {
      // Shutdown components in reverse order
      const componentNames = Array.from(this.components.keys()).reverse();
      
      for (const name of componentNames) {
        const component = this.components.get(name);
        if (component.shutdown) {
          await component.shutdown();
          cleanLogger.debug('SHUTDOWN', `${name} shutdown complete`);
        }
      }

      this.initialized = false;
      cleanLogger.success('INTEGRATION', 'All optimization components shutdown complete');

    } catch (error) {
      cleanLogger.error('SHUTDOWN', 'Error during shutdown', error);
      throw error;
    }
  }
}

// Create singleton instance
const integrationService = new IntegrationService();

export default integrationService;