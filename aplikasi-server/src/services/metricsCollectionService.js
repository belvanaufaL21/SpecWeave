/**
 * Metrics Collection Service
 * Centralized service for collecting and aggregating system metrics
 */

import { supabaseAdmin } from '../config/supabase.js';
import monitoringService from './monitoringService.js';
import alertingService from './alertingService.js';

class MetricsCollectionService {
  constructor() {
    this.collectors = new Map();
    this.aggregators = new Map();
    this.storage = new Map();
    this.isCollecting = true; // Set to true by default
    this.collectionInterval = null;
    
    this.initializeCollectors();
    this.initializeAggregators();
    
    // Auto-start collection
    this.startCollection();
  }

  /**
   * Initialize metric collectors
   */
  initializeCollectors() {
    // Performance metrics collector
    this.addCollector('performance', {
      interval: 30000, // 30 seconds
      collect: async () => {
        const metrics = await this.collectPerformanceMetrics();
        return metrics;
      }
    });

    // System metrics collector
    this.addCollector('system', {
      interval: 15000, // 15 seconds
      collect: async () => {
        const metrics = await this.collectSystemMetrics();
        return metrics;
      }
    });

    // Database metrics collector
    this.addCollector('database', {
      interval: 60000, // 1 minute
      collect: async () => {
        const metrics = await this.collectDatabaseMetrics();
        return metrics;
      }
    });

    // Application metrics collector
    this.addCollector('application', {
      interval: 45000, // 45 seconds
      collect: async () => {
        const metrics = await this.collectApplicationMetrics();
        return metrics;
      }
    });

    // Error metrics collector
    this.addCollector('errors', {
      interval: 30000, // 30 seconds
      collect: async () => {
        const metrics = await this.collectErrorMetrics();
        return metrics;
      }
    });
  }

  /**
   * Initialize metric aggregators
   */
  initializeAggregators() {
    // Performance aggregator
    this.addAggregator('performance', {
      windowSize: 300000, // 5 minutes
      aggregate: (metrics) => {
        if (metrics.length === 0) return null;

        const durations = metrics.map(m => m.duration).filter(d => d != null);
        const successCount = metrics.filter(m => m.success).length;

        return {
          count: metrics.length,
          averageDuration: durations.length > 0 ? 
            durations.reduce((sum, d) => sum + d, 0) / durations.length : 0,
          medianDuration: this.calculateMedian(durations),
          p95Duration: this.calculatePercentile(durations, 95),
          p99Duration: this.calculatePercentile(durations, 99),
          successRate: metrics.length > 0 ? (successCount / metrics.length) * 100 : 0,
          errorRate: metrics.length > 0 ? ((metrics.length - successCount) / metrics.length) * 100 : 0,
          timestamp: Date.now()
        };
      }
    });

    // System aggregator
    this.addAggregator('system', {
      windowSize: 300000, // 5 minutes
      aggregate: (metrics) => {
        if (metrics.length === 0) return null;

        const memoryMetrics = metrics.filter(m => m.type === 'memory');
        const cpuMetrics = metrics.filter(m => m.type === 'cpu');
        const eventLoopMetrics = metrics.filter(m => m.type === 'eventLoop');

        return {
          memory: this.aggregateMemoryMetrics(memoryMetrics),
          cpu: this.aggregateCpuMetrics(cpuMetrics),
          eventLoop: this.aggregateEventLoopMetrics(eventLoopMetrics),
          timestamp: Date.now()
        };
      }
    });

    // Database aggregator
    this.addAggregator('database', {
      windowSize: 600000, // 10 minutes
      aggregate: (metrics) => {
        if (metrics.length === 0) return null;

        const queryMetrics = metrics.filter(m => m.type === 'query');
        const connectionMetrics = metrics.filter(m => m.type === 'connection');

        return {
          queries: this.aggregateQueryMetrics(queryMetrics),
          connections: this.aggregateConnectionMetrics(connectionMetrics),
          timestamp: Date.now()
        };
      }
    });

    // Error aggregator
    this.addAggregator('errors', {
      windowSize: 300000, // 5 minutes
      aggregate: (metrics) => {
        if (metrics.length === 0) return null;

        const errorsByType = metrics.reduce((acc, error) => {
          acc[error.type] = (acc[error.type] || 0) + 1;
          return acc;
        }, {});

        const errorsBySeverity = metrics.reduce((acc, error) => {
          acc[error.severity] = (acc[error.severity] || 0) + 1;
          return acc;
        }, {});

        return {
          total: metrics.length,
          byType: errorsByType,
          bySeverity: errorsBySeverity,
          rate: this.calculateErrorRate(metrics),
          timestamp: Date.now()
        };
      }
    });
  }

  /**
   * Add metric collector
   */
  addCollector(name, collector) {
    this.collectors.set(name, {
      ...collector,
      name,
      lastRun: 0,
      isRunning: false
    });
  }

  /**
   * Add metric aggregator
   */
  addAggregator(name, aggregator) {
    this.aggregators.set(name, {
      ...aggregator,
      name,
      buffer: [],
      lastAggregation: 0
    });
  }

  /**
   * Start metrics collection
   */
  startCollection() {
    if (this.isCollecting && this.collectionInterval) return;

    this.isCollecting = true;
    
    // Only log in debug mode
    if (process.env.LOG_LEVEL === 'DEBUG') {
      console.log('📊 [METRICS] Starting metrics collection...');
    }

    // Start collection loop
    this.collectionInterval = setInterval(() => {
      this.runCollectors();
      this.runAggregators();
      this.cleanupOldMetrics();
    }, 10000); // Run every 10 seconds

    // Initial collection
    this.runCollectors();
  }

  /**
   * Stop metrics collection
   */
  stopCollection() {
    if (!this.isCollecting) return;

    this.isCollecting = false;
    console.log('📊 [METRICS] Stopping metrics collection...');

    if (this.collectionInterval) {
      clearInterval(this.collectionInterval);
      this.collectionInterval = null;
    }
  }

  /**
   * Run all collectors
   */
  async runCollectors() {
    // Skip all collection in clean mode
    if (process.env.CLEAN_LOGS === 'true') {
      return;
    }
    
    const promises = Array.from(this.collectors.entries()).map(async ([name, collector]) => {
      const now = Date.now();
      
      // Check if it's time to run this collector
      if (now - collector.lastRun < collector.interval || collector.isRunning) {
        return;
      }

      collector.isRunning = true;
      collector.lastRun = now;

      try {
        const metrics = await collector.collect();
        if (metrics) {
          this.storeMetrics(name, metrics);
          this.feedToAggregators(name, metrics);
        }
      } catch (error) {
        console.error(`Error running collector ${name}:`, error);
        monitoringService.recordErrorMetric(error, { collector: name });
      } finally {
        collector.isRunning = false;
      }
    });

    await Promise.allSettled(promises);
  }

  /**
   * Run all aggregators
   */
  runAggregators() {
    this.aggregators.forEach((aggregator, name) => {
      const now = Date.now();
      
      // Check if it's time to aggregate
      if (now - aggregator.lastAggregation < aggregator.windowSize) {
        return;
      }

      try {
        const aggregatedData = aggregator.aggregate(aggregator.buffer);
        if (aggregatedData) {
          this.storeAggregatedMetrics(name, aggregatedData);
          this.checkAggregatedMetrics(name, aggregatedData);
        }

        // Clear buffer and update timestamp
        aggregator.buffer = [];
        aggregator.lastAggregation = now;

      } catch (error) {
        console.error(`Error running aggregator ${name}:`, error);
      }
    });
  }

  /**
   * Store raw metrics
   */
  storeMetrics(collectorName, metrics) {
    const key = `${collectorName}-${Date.now()}`;
    this.storage.set(key, {
      collector: collectorName,
      metrics,
      timestamp: Date.now(),
      type: 'raw'
    });

    // Limit storage size
    if (this.storage.size > 10000) {
      const oldestKey = this.storage.keys().next().value;
      this.storage.delete(oldestKey);
    }
  }

  /**
   * Store aggregated metrics
   */
  storeAggregatedMetrics(aggregatorName, data) {
    const key = `${aggregatorName}-aggregated-${Date.now()}`;
    this.storage.set(key, {
      aggregator: aggregatorName,
      data,
      timestamp: Date.now(),
      type: 'aggregated'
    });
  }

  /**
   * Feed metrics to aggregators
   */
  feedToAggregators(collectorName, metrics) {
    // Feed to matching aggregators
    const aggregator = this.aggregators.get(collectorName);
    if (aggregator) {
      if (Array.isArray(metrics)) {
        aggregator.buffer.push(...metrics);
      } else {
        aggregator.buffer.push(metrics);
      }

      // Limit buffer size
      if (aggregator.buffer.length > 1000) {
        aggregator.buffer = aggregator.buffer.slice(-1000);
      }
    }
  }

  /**
   * Check aggregated metrics for alerts
   */
  checkAggregatedMetrics(aggregatorName, data) {
    switch (aggregatorName) {
      case 'performance':
        if (data.averageDuration > 2000) {
          alertingService.checkPerformanceMetric({ duration: data.averageDuration });
        }
        if (data.errorRate > 5) {
          alertingService.checkErrorRate(data.errorRate, { source: 'aggregated' });
        }
        break;

      case 'system':
        if (data.memory && data.memory.percentage > 80) {
          alertingService.checkSystemMetrics({ memoryPercent: data.memory.percentage });
        }
        break;

      case 'errors':
        if (data.rate > 10) {
          alertingService.checkErrorRate(data.rate, { source: 'aggregated' });
        }
        break;
    }
  }

  /**
   * Collect performance metrics
   */
  async collectPerformanceMetrics() {
    try {
      // Skip database collection if table doesn't exist
      if (process.env.SKIP_PERFORMANCE_LOGS_TABLE === 'true') {
        return [];
      }

      const { data, error } = await supabaseAdmin
        .from('performance_logs')
        .select('*')
        .gte('created_at', new Date(Date.now() - 300000).toISOString()) // Last 5 minutes
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) {
        // If table doesn't exist, skip silently
        if (error.message.includes('Could not find the table')) {
          return [];
        }
        throw error;
      }

      return data.map(log => ({
        operation: log.operation_type,
        duration: log.duration_ms,
        success: log.success,
        timestamp: new Date(log.created_at).getTime(),
        userId: log.user_id,
        metadata: log.metadata
      }));

    } catch (error) {
      // Silently skip performance collection if database issues
      return [];
    }
  }

  /**
   * Collect system metrics
   */
  async collectSystemMetrics() {
    const metrics = [];

    try {
      // Memory metrics
      const memory = process.memoryUsage();
      metrics.push({
        type: 'memory',
        heapUsed: memory.heapUsed,
        heapTotal: memory.heapTotal,
        percentage: (memory.heapUsed / memory.heapTotal) * 100,
        rss: memory.rss,
        external: memory.external,
        timestamp: Date.now()
      });

      // CPU metrics
      const cpuUsage = process.cpuUsage();
      metrics.push({
        type: 'cpu',
        user: cpuUsage.user,
        system: cpuUsage.system,
        timestamp: Date.now()
      });

      // Event loop metrics
      const start = process.hrtime.bigint();
      await new Promise(resolve => setImmediate(resolve));
      const lag = Number(process.hrtime.bigint() - start) / 1000000;

      metrics.push({
        type: 'eventLoop',
        lag,
        timestamp: Date.now()
      });

      // Process metrics
      metrics.push({
        type: 'process',
        uptime: process.uptime(),
        activeHandles: process._getActiveHandles().length,
        activeRequests: process._getActiveRequests().length,
        timestamp: Date.now()
      });

    } catch (error) {
      console.error('Error collecting system metrics:', error);
    }

    return metrics;
  }

  /**
   * Collect database metrics
   */
  async collectDatabaseMetrics() {
    const metrics = [];

    try {
      // Query performance metrics
      const queryStart = Date.now();
      const { data: testQuery, error } = await supabaseAdmin
        .from('performance_logs')
        .select('count')
        .limit(1);

      const queryDuration = Date.now() - queryStart;

      if (!error) {
        metrics.push({
          type: 'query',
          operation: 'test_query',
          duration: queryDuration,
          success: true,
          timestamp: Date.now()
        });
      } else {
        metrics.push({
          type: 'query',
          operation: 'test_query',
          duration: queryDuration,
          success: false,
          error: error.message,
          timestamp: Date.now()
        });
      }

      // Connection pool metrics (if available)
      // This would depend on your database connection pool implementation

    } catch (error) {
      console.error('Error collecting database metrics:', error);
      metrics.push({
        type: 'query',
        operation: 'test_query',
        duration: 0,
        success: false,
        error: error.message,
        timestamp: Date.now()
      });
    }

    return metrics;
  }

  /**
   * Collect application metrics
   */
  async collectApplicationMetrics() {
    const metrics = [];

    try {
      // Skip database collection if table doesn't exist
      if (process.env.SKIP_ERROR_LOGS_TABLE !== 'true') {
        // Get recent error logs
        const { data: errorLogs, error } = await supabaseAdmin
          .from('error_logs')
          .select('*')
          .gte('created_at', new Date(Date.now() - 300000).toISOString()) // Last 5 minutes
          .order('created_at', { ascending: false })
          .limit(50);

        if (!error && errorLogs) {
          errorLogs.forEach(log => {
            metrics.push({
              type: 'application_error',
              errorType: log.error_type,
              severity: log.severity,
              endpoint: log.endpoint,
              userId: log.user_id,
              timestamp: new Date(log.created_at).getTime()
            });
          });
        }
      }

      // Application-specific metrics
      metrics.push({
        type: 'application_health',
        status: 'healthy',
        version: process.env.npm_package_version || '1.0.0',
        environment: process.env.NODE_ENV || 'development',
        timestamp: Date.now()
      });

    } catch (error) {
      // Silently skip application metrics collection if database issues
    }

    return metrics;
  }

  /**
   * Collect error metrics
   */
  async collectErrorMetrics() {
    try {
      // Skip database collection if table doesn't exist
      if (process.env.SKIP_ERROR_LOGS_TABLE === 'true') {
        return [];
      }

      const { data, error } = await supabaseAdmin
        .from('error_logs')
        .select('*')
        .gte('created_at', new Date(Date.now() - 300000).toISOString()) // Last 5 minutes
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) {
        // If table doesn't exist, skip silently
        if (error.message.includes('Could not find the table')) {
          return [];
        }
        throw error;
      }

      return data.map(log => ({
        type: log.error_type,
        severity: log.severity,
        message: log.error_message,
        endpoint: log.endpoint,
        userId: log.user_id,
        timestamp: new Date(log.created_at).getTime()
      }));

    } catch (error) {
      // Silently skip error collection if database issues
      return [];
    }
  }

  /**
   * Aggregate memory metrics
   */
  aggregateMemoryMetrics(metrics) {
    if (metrics.length === 0) return null;

    const heapUsed = metrics.map(m => m.heapUsed).filter(v => v != null);
    const percentages = metrics.map(m => m.percentage).filter(v => v != null);

    return {
      averageHeapUsed: heapUsed.length > 0 ? heapUsed.reduce((sum, v) => sum + v, 0) / heapUsed.length : 0,
      maxHeapUsed: heapUsed.length > 0 ? Math.max(...heapUsed) : 0,
      averagePercentage: percentages.length > 0 ? percentages.reduce((sum, v) => sum + v, 0) / percentages.length : 0,
      maxPercentage: percentages.length > 0 ? Math.max(...percentages) : 0
    };
  }

  /**
   * Aggregate CPU metrics
   */
  aggregateCpuMetrics(metrics) {
    if (metrics.length === 0) return null;

    const userTimes = metrics.map(m => m.user).filter(v => v != null);
    const systemTimes = metrics.map(m => m.system).filter(v => v != null);

    return {
      averageUser: userTimes.length > 0 ? userTimes.reduce((sum, v) => sum + v, 0) / userTimes.length : 0,
      averageSystem: systemTimes.length > 0 ? systemTimes.reduce((sum, v) => sum + v, 0) / systemTimes.length : 0
    };
  }

  /**
   * Aggregate event loop metrics
   */
  aggregateEventLoopMetrics(metrics) {
    if (metrics.length === 0) return null;

    const lags = metrics.map(m => m.lag).filter(v => v != null);

    return {
      averageLag: lags.length > 0 ? lags.reduce((sum, v) => sum + v, 0) / lags.length : 0,
      maxLag: lags.length > 0 ? Math.max(...lags) : 0,
      p95Lag: this.calculatePercentile(lags, 95)
    };
  }

  /**
   * Aggregate query metrics
   */
  aggregateQueryMetrics(metrics) {
    if (metrics.length === 0) return null;

    const durations = metrics.map(m => m.duration).filter(v => v != null);
    const successCount = metrics.filter(m => m.success).length;

    return {
      count: metrics.length,
      averageDuration: durations.length > 0 ? durations.reduce((sum, v) => sum + v, 0) / durations.length : 0,
      maxDuration: durations.length > 0 ? Math.max(...durations) : 0,
      successRate: metrics.length > 0 ? (successCount / metrics.length) * 100 : 0
    };
  }

  /**
   * Aggregate connection metrics
   */
  aggregateConnectionMetrics(metrics) {
    if (metrics.length === 0) return null;

    return {
      count: metrics.length,
      active: metrics.filter(m => m.status === 'active').length,
      idle: metrics.filter(m => m.status === 'idle').length
    };
  }

  /**
   * Calculate error rate
   */
  calculateErrorRate(errors) {
    const now = Date.now();
    const fiveMinutesAgo = now - 300000;
    
    const recentErrors = errors.filter(e => e.timestamp > fiveMinutesAgo);
    
    // This is a simplified calculation
    // In a real scenario, you'd compare against total requests
    return recentErrors.length;
  }

  /**
   * Calculate median
   */
  calculateMedian(values) {
    if (values.length === 0) return 0;
    
    const sorted = values.sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    
    return sorted.length % 2 !== 0 
      ? sorted[mid] 
      : (sorted[mid - 1] + sorted[mid]) / 2;
  }

  /**
   * Calculate percentile
   */
  calculatePercentile(values, percentile) {
    if (values.length === 0) return 0;
    
    const sorted = values.sort((a, b) => a - b);
    const index = Math.ceil((percentile / 100) * sorted.length) - 1;
    
    return sorted[Math.max(0, index)];
  }

  /**
   * Clean up old metrics
   */
  cleanupOldMetrics() {
    const oneHourAgo = Date.now() - 3600000;
    
    for (const [key, metric] of this.storage.entries()) {
      if (metric.timestamp < oneHourAgo) {
        this.storage.delete(key);
      }
    }
  }

  /**
   * Get metrics summary
   */
  getMetricsSummary() {
    const summary = {
      collectors: {},
      aggregators: {},
      storage: {
        totalMetrics: this.storage.size,
        rawMetrics: 0,
        aggregatedMetrics: 0
      }
    };

    // Collector status
    this.collectors.forEach((collector, name) => {
      summary.collectors[name] = {
        lastRun: collector.lastRun,
        interval: collector.interval,
        isRunning: collector.isRunning
      };
    });

    // Aggregator status
    this.aggregators.forEach((aggregator, name) => {
      summary.aggregators[name] = {
        bufferSize: aggregator.buffer.length,
        lastAggregation: aggregator.lastAggregation,
        windowSize: aggregator.windowSize
      };
    });

    // Storage breakdown
    this.storage.forEach((metric) => {
      if (metric.type === 'raw') {
        summary.storage.rawMetrics++;
      } else if (metric.type === 'aggregated') {
        summary.storage.aggregatedMetrics++;
      }
    });

    return summary;
  }

  /**
   * Get recent metrics
   */
  getRecentMetrics(collectorName, limit = 50) {
    const metrics = Array.from(this.storage.values())
      .filter(m => m.collector === collectorName && m.type === 'raw')
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, limit);

    return metrics.map(m => m.metrics);
  }

  /**
   * Get aggregated data
   */
  getAggregatedData(aggregatorName, limit = 20) {
    const data = Array.from(this.storage.values())
      .filter(m => m.aggregator === aggregatorName && m.type === 'aggregated')
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, limit);

    return data.map(d => d.data);
  }
}

// Create singleton instance
const metricsCollectionService = new MetricsCollectionService();

export default metricsCollectionService;