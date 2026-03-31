/**
 * Comprehensive Monitoring Service
 * Centralized monitoring infrastructure for performance, errors, and system health
 */

import { supabaseAdmin } from '../config/supabase.js';
import errorHandler from '../utils/errorHandler.js';

class MonitoringService {
  constructor() {
    this.metrics = {
      performance: new Map(),
      errors: new Map(),
      system: new Map(),
      alerts: new Map()
    };
    
    this.thresholds = {
      responseTime: {
        warning: 1000,  // 1 second
        critical: 3000  // 3 seconds
      },
      errorRate: {
        warning: 5,     // 5% error rate
        critical: 10    // 10% error rate
      },
      memoryUsage: {
        warning: 80,    // 80% memory usage
        critical: 90    // 90% memory usage
      },
      cpuUsage: {
        warning: 70,    // 70% CPU usage
        critical: 85    // 85% CPU usage
      }
    };
    
    this.alertCooldown = new Map(); // Prevent alert spam
    this.isMonitoring = true; // Set to true by default
    this.monitoringInterval = null;
    
    // Auto-start monitoring
    this.startMonitoring();
  }

  /**
   * Start monitoring system
   */
  startMonitoring() {
    if (this.isMonitoring && this.monitoringInterval) return;
    
    this.isMonitoring = true;
    
    // Only log in debug mode
    if (process.env.LOG_LEVEL === 'DEBUG') {
      console.log('🔍 [MONITORING] Starting comprehensive monitoring system...');
    }
    
    // Start periodic system health checks
    this.monitoringInterval = setInterval(() => {
      this.collectSystemMetrics();
      this.checkAlertConditions();
      this.cleanupOldMetrics();
    }, 30000); // Every 30 seconds
    
    // Start memory monitoring
    this.startMemoryMonitoring();
    
    // Start process monitoring
    this.startProcessMonitoring();
  }

  /**
   * Stop monitoring system
   */
  stopMonitoring() {
    if (!this.isMonitoring) return;
    
    this.isMonitoring = false;
    console.log('🔍 [MONITORING] Stopping monitoring system...');
    
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }
  }

  /**
   * Record performance metric
   */
  recordPerformanceMetric(operation, duration, metadata = {}) {
    const timestamp = Date.now();
    const metric = {
      operation,
      duration,
      timestamp,
      metadata,
      severity: this.calculateSeverity('performance', duration)
    };
    
    this.metrics.performance.set(`${operation}-${timestamp}`, metric);
    
    // Store in database asynchronously
    this.storePerformanceMetric(metric).catch(error => {
      console.error('Failed to store performance metric:', error);
    });
    
    // Check for performance degradation
    this.checkPerformanceDegradation(operation, duration);
  }

  /**
   * Record error metric
   */
  recordErrorMetric(error, context = {}) {
    const timestamp = Date.now();
    const metric = {
      name: error.name,
      message: error.message,
      stack: error.stack,
      timestamp,
      context,
      severity: error.severity || 'medium'
    };
    
    this.metrics.errors.set(`${error.name}-${timestamp}`, metric);
    
    // Store in database asynchronously (silent fail)
    this.storeErrorMetric(metric).catch(() => {
      // Silent fail - don't spam console
    });
    
    // Check for error rate spikes
    this.checkErrorRateSpike();
  }

  /**
   * Record system metric
   */
  recordSystemMetric(type, value, metadata = {}) {
    const timestamp = Date.now();
    const metric = {
      type,
      value,
      timestamp,
      metadata,
      severity: this.calculateSeverity(type, value)
    };
    
    this.metrics.system.set(`${type}-${timestamp}`, metric);
    
    // Check system health thresholds
    this.checkSystemThresholds(type, value);
  }

  /**
   * Collect system metrics
   */
  collectSystemMetrics() {
    try {
      // Memory usage
      const memoryUsage = process.memoryUsage();
      this.recordSystemMetric('memory_heap_used', memoryUsage.heapUsed);
      this.recordSystemMetric('memory_heap_total', memoryUsage.heapTotal);
      this.recordSystemMetric('memory_rss', memoryUsage.rss);
      
      // CPU usage (approximation)
      const cpuUsage = process.cpuUsage();
      this.recordSystemMetric('cpu_user', cpuUsage.user);
      this.recordSystemMetric('cpu_system', cpuUsage.system);
      
      // Event loop lag
      const start = process.hrtime.bigint();
      setImmediate(() => {
        const lag = Number(process.hrtime.bigint() - start) / 1000000; // Convert to ms
        this.recordSystemMetric('event_loop_lag', lag);
      });
      
      // Active handles and requests
      this.recordSystemMetric('active_handles', process._getActiveHandles().length);
      this.recordSystemMetric('active_requests', process._getActiveRequests().length);
      
    } catch (error) {
      console.error('Error collecting system metrics:', error);
    }
  }

  /**
   * Start memory monitoring
   */
  startMemoryMonitoring() {
    // Monitor for memory leaks
    let previousHeapUsed = 0;
    
    setInterval(() => {
      const currentHeapUsed = process.memoryUsage().heapUsed;
      const heapGrowth = currentHeapUsed - previousHeapUsed;
      
      if (heapGrowth > 50 * 1024 * 1024) { // 50MB growth
        this.sendAlert('memory_growth', {
          growth: heapGrowth,
          current: currentHeapUsed,
          previous: previousHeapUsed
        });
      }
      
      previousHeapUsed = currentHeapUsed;
    }, 60000); // Check every minute
  }

  /**
   * Start process monitoring
   */
  startProcessMonitoring() {
    // Monitor uncaught exceptions
    process.on('uncaughtException', (error) => {
      this.recordErrorMetric(error, { type: 'uncaught_exception' });
      this.sendAlert('uncaught_exception', { error: error.message });
    });
    
    // Monitor unhandled rejections
    process.on('unhandledRejection', (reason, promise) => {
      this.recordErrorMetric(new Error(reason), { 
        type: 'unhandled_rejection',
        promise: promise.toString()
      });
      this.sendAlert('unhandled_rejection', { reason });
    });
    
    // Monitor process warnings
    process.on('warning', (warning) => {
      this.recordSystemMetric('process_warning', 1, {
        name: warning.name,
        message: warning.message
      });
    });
  }

  /**
   * Calculate severity based on metric type and value
   */
  calculateSeverity(type, value) {
    switch (type) {
      case 'performance':
        if (value > this.thresholds.responseTime.critical) return 'critical';
        if (value > this.thresholds.responseTime.warning) return 'warning';
        return 'info';
        
      case 'memory_heap_used':
        const memoryPercent = (value / process.memoryUsage().heapTotal) * 100;
        if (memoryPercent > this.thresholds.memoryUsage.critical) return 'critical';
        if (memoryPercent > this.thresholds.memoryUsage.warning) return 'warning';
        return 'info';
        
      case 'event_loop_lag':
        if (value > 100) return 'critical';
        if (value > 50) return 'warning';
        return 'info';
        
      default:
        return 'info';
    }
  }

  /**
   * Check performance degradation
   */
  checkPerformanceDegradation(operation, duration) {
    const recentMetrics = Array.from(this.metrics.performance.values())
      .filter(m => m.operation === operation && Date.now() - m.timestamp < 300000) // Last 5 minutes
      .sort((a, b) => b.timestamp - a.timestamp);
    
    if (recentMetrics.length >= 5) {
      const avgDuration = recentMetrics.reduce((sum, m) => sum + m.duration, 0) / recentMetrics.length;
      
      if (avgDuration > this.thresholds.responseTime.warning) {
        this.sendAlert('performance_degradation', {
          operation,
          averageDuration: avgDuration,
          threshold: this.thresholds.responseTime.warning,
          sampleSize: recentMetrics.length
        });
      }
    }
  }

  /**
   * Check error rate spike
   */
  checkErrorRateSpike() {
    const now = Date.now();
    const fiveMinutesAgo = now - 300000;
    
    const recentErrors = Array.from(this.metrics.errors.values())
      .filter(e => e.timestamp > fiveMinutesAgo);
    
    const recentPerformance = Array.from(this.metrics.performance.values())
      .filter(p => p.timestamp > fiveMinutesAgo);
    
    const totalRequests = recentPerformance.length;
    const errorRate = totalRequests > 0 ? (recentErrors.length / totalRequests) * 100 : 0;
    
    if (errorRate > this.thresholds.errorRate.critical) {
      this.sendAlert('high_error_rate', {
        errorRate,
        errors: recentErrors.length,
        totalRequests,
        threshold: this.thresholds.errorRate.critical
      });
    }
  }

  /**
   * Check system thresholds
   */
  checkSystemThresholds(type, value) {
    // Skip all system threshold alerts in clean mode
    if (process.env.CLEAN_LOGS === 'true') {
      return;
    }
    
    let threshold, alertType;
    
    switch (type) {
      case 'memory_heap_used':
        const memoryPercent = (value / process.memoryUsage().heapTotal) * 100;
        if (memoryPercent > this.thresholds.memoryUsage.critical) {
          threshold = this.thresholds.memoryUsage.critical;
          alertType = 'high_memory_usage';
        }
        break;
        
      case 'event_loop_lag':
        if (value > 100) {
          threshold = 100;
          alertType = 'high_event_loop_lag';
        }
        break;
    }
    
    if (alertType) {
      this.sendAlert(alertType, { value, threshold, type });
    }
  }

  /**
   * Check alert conditions
   */
  checkAlertConditions() {
    // Check for sustained high resource usage
    this.checkSustainedHighUsage();
    
    // Check for error patterns
    this.checkErrorPatterns();
    
    // Check for performance trends
    this.checkPerformanceTrends();
  }

  /**
   * Check sustained high usage
   */
  checkSustainedHighUsage() {
    const fiveMinutesAgo = Date.now() - 300000;
    
    // Check memory usage trend
    const memoryMetrics = Array.from(this.metrics.system.values())
      .filter(m => m.type === 'memory_heap_used' && m.timestamp > fiveMinutesAgo)
      .sort((a, b) => a.timestamp - b.timestamp);
    
    if (memoryMetrics.length >= 5) {
      const highUsageCount = memoryMetrics.filter(m => 
        (m.value / process.memoryUsage().heapTotal) * 100 > this.thresholds.memoryUsage.warning
      ).length;
      
      if (highUsageCount / memoryMetrics.length > 0.8) { // 80% of samples
        this.sendAlert('sustained_high_memory', {
          duration: '5 minutes',
          highUsagePercentage: (highUsageCount / memoryMetrics.length) * 100
        });
      }
    }
  }

  /**
   * Check error patterns
   */
  checkErrorPatterns() {
    const oneHourAgo = Date.now() - 3600000;
    const recentErrors = Array.from(this.metrics.errors.values())
      .filter(e => e.timestamp > oneHourAgo);
    
    // Group errors by type
    const errorsByType = recentErrors.reduce((acc, error) => {
      acc[error.name] = (acc[error.name] || 0) + 1;
      return acc;
    }, {});
    
    // Check for error spikes
    Object.entries(errorsByType).forEach(([errorType, count]) => {
      if (count >= 10) { // 10 or more of the same error in an hour
        this.sendAlert('error_pattern_detected', {
          errorType,
          count,
          timeWindow: '1 hour'
        });
      }
    });
  }

  /**
   * Check performance trends
   */
  checkPerformanceTrends() {
    const oneHourAgo = Date.now() - 3600000;
    const recentMetrics = Array.from(this.metrics.performance.values())
      .filter(m => m.timestamp > oneHourAgo)
      .sort((a, b) => a.timestamp - b.timestamp);
    
    if (recentMetrics.length >= 20) {
      const midpoint = Math.floor(recentMetrics.length / 2);
      const firstHalf = recentMetrics.slice(0, midpoint);
      const secondHalf = recentMetrics.slice(midpoint);
      
      const firstHalfAvg = firstHalf.reduce((sum, m) => sum + m.duration, 0) / firstHalf.length;
      const secondHalfAvg = secondHalf.reduce((sum, m) => sum + m.duration, 0) / secondHalf.length;
      
      const degradation = ((secondHalfAvg - firstHalfAvg) / firstHalfAvg) * 100;
      
      if (degradation > 50) { // 50% performance degradation
        this.sendAlert('performance_trend_degradation', {
          degradation: `${degradation.toFixed(2)}%`,
          firstHalfAvg,
          secondHalfAvg,
          timeWindow: '1 hour'
        });
      }
    }
  }

  /**
   * Send alert with cooldown
   */
  sendAlert(alertType, data) {
    // Skip all alerts in clean mode
    if (process.env.CLEAN_LOGS === 'true') {
      return;
    }
    
    const alertKey = `${alertType}:${JSON.stringify(data)}`;
    const now = Date.now();
    const cooldownPeriod = 300000; // 5 minutes
    
    // Check cooldown
    if (this.alertCooldown.has(alertKey)) {
      const lastAlert = this.alertCooldown.get(alertKey);
      if (now - lastAlert < cooldownPeriod) {
        return; // Skip alert due to cooldown
      }
    }
    
    this.alertCooldown.set(alertKey, now);
    
    // Store alert
    const alert = {
      type: alertType,
      data,
      timestamp: now,
      severity: this.getAlertSeverity(alertType)
    };
    
    this.metrics.alerts.set(alertKey, alert);
    
    // Log alert
    console.warn(`🚨 [MONITORING ALERT] ${alertType.toUpperCase()}:`, data);
    
    // Send to external systems
    this.sendExternalAlert(alert);
  }

  /**
   * Get alert severity
   */
  getAlertSeverity(alertType) {
    const criticalAlerts = [
      'uncaught_exception',
      'high_error_rate',
      'high_memory_usage',
      'performance_trend_degradation'
    ];
    
    return criticalAlerts.includes(alertType) ? 'critical' : 'warning';
  }

  /**
   * Send external alert
   */
  async sendExternalAlert(alert) {
    try {
      // Store alert in database
      await this.storeAlert(alert);
      
      // Send to webhook if configured
      if (process.env.MONITORING_WEBHOOK_URL) {
        await this.sendWebhookAlert(alert);
      }
      
      // Send email if configured
      if (process.env.ALERT_EMAIL) {
        await this.sendEmailAlert(alert);
      }
      
    } catch (error) {
      console.error('Failed to send external alert:', error);
    }
  }

  /**
   * Store performance metric in database
   */
  async storePerformanceMetric(metric) {
    try {
      const { error } = await supabaseAdmin
        .from('performance_logs')
        .insert({
          request_id: `monitoring-${Date.now()}`,
          user_id: null,
          operation_type: metric.operation,
          start_time: new Date(metric.timestamp).toISOString(),
          end_time: new Date(metric.timestamp + metric.duration).toISOString(),
          duration_ms: metric.duration,
          success: metric.severity !== 'critical',
          error_message: metric.severity === 'critical' ? 'Performance threshold exceeded' : null,
          metadata: {
            severity: metric.severity,
            ...metric.metadata
          }
        });
      
      if (error) throw error;
    } catch (error) {
      console.error('Failed to store performance metric:', error);
    }
  }

  /**
   * Store error metric in database
   */
  async storeErrorMetric(metric) {
    // Skip if error logs table is disabled
    if (process.env.SKIP_ERROR_LOGS_TABLE === 'true') {
      return;
    }

    try {
      const { error } = await supabaseAdmin
        .from('error_logs')
        .insert({
          error_type: metric.name,
          error_message: metric.message,
          stack_trace: metric.stack,
          severity: metric.severity,
          context: metric.context,
          user_id: metric.context.userId || null,
          endpoint: metric.context.endpoint || null,
          created_at: new Date(metric.timestamp).toISOString()
        });
      
      if (error) throw error;
    } catch (error) {
      // Silent fail - don't spam console
    }
  }

  /**
   * Store alert in database
   */
  async storeAlert(alert) {
    // Skip database storage in clean mode or if table doesn't exist
    if (process.env.CLEAN_LOGS === 'true' || process.env.SKIP_MONITORING_ALERTS_TABLE === 'true') {
      return;
    }
    
    try {
      const { error } = await supabaseAdmin
        .from('monitoring_alerts')
        .insert({
          alert_type: alert.type,
          severity: alert.severity,
          data: alert.data,
          created_at: new Date(alert.timestamp).toISOString()
        });
      
      if (error && !error.message.includes('relation "monitoring_alerts" does not exist')) {
        throw error;
      }
    } catch (error) {
      // Silently skip if table doesn't exist or in clean mode
    }
  }

  /**
   * Send webhook alert
   */
  async sendWebhookAlert(alert) {
    try {
      const response = await fetch(process.env.MONITORING_WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: `🚨 SpecWeave Alert: ${alert.type.replace(/_/g, ' ').toUpperCase()}`,
          severity: alert.severity,
          data: alert.data,
          timestamp: new Date(alert.timestamp).toISOString()
        })
      });
      
      if (!response.ok) {
        throw new Error(`Webhook failed: ${response.statusText}`);
      }
    } catch (error) {
      console.error('Failed to send webhook alert:', error);
    }
  }

  /**
   * Send email alert
   */
  async sendEmailAlert(alert) {
    // This would integrate with your email service
    console.log('Email alert would be sent:', {
      to: process.env.ALERT_EMAIL,
      subject: `🚨 SpecWeave Alert: ${alert.type.replace(/_/g, ' ').toUpperCase()}`,
      body: JSON.stringify(alert, null, 2)
    });
  }

  /**
   * Clean up old metrics
   */
  cleanupOldMetrics() {
    const oneHourAgo = Date.now() - 3600000;
    
    // Clean performance metrics
    for (const [key, metric] of this.metrics.performance.entries()) {
      if (metric.timestamp < oneHourAgo) {
        this.metrics.performance.delete(key);
      }
    }
    
    // Clean error metrics
    for (const [key, metric] of this.metrics.errors.entries()) {
      if (metric.timestamp < oneHourAgo) {
        this.metrics.errors.delete(key);
      }
    }
    
    // Clean system metrics
    for (const [key, metric] of this.metrics.system.entries()) {
      if (metric.timestamp < oneHourAgo) {
        this.metrics.system.delete(key);
      }
    }
    
    // Clean alert cooldowns
    for (const [key, timestamp] of this.alertCooldown.entries()) {
      if (Date.now() - timestamp > 300000) { // 5 minutes
        this.alertCooldown.delete(key);
      }
    }
  }

  /**
   * Get monitoring dashboard data
   */
  getDashboardData() {
    const now = Date.now();
    const oneHourAgo = now - 3600000;
    
    // Get recent metrics
    const recentPerformance = Array.from(this.metrics.performance.values())
      .filter(m => m.timestamp > oneHourAgo);
    
    const recentErrors = Array.from(this.metrics.errors.values())
      .filter(m => m.timestamp > oneHourAgo);
    
    const recentSystem = Array.from(this.metrics.system.values())
      .filter(m => m.timestamp > oneHourAgo);
    
    const recentAlerts = Array.from(this.metrics.alerts.values())
      .filter(m => m.timestamp > oneHourAgo);
    
    return {
      summary: {
        totalRequests: recentPerformance.length,
        totalErrors: recentErrors.length,
        errorRate: recentPerformance.length > 0 ? 
          (recentErrors.length / recentPerformance.length) * 100 : 0,
        averageResponseTime: recentPerformance.length > 0 ?
          recentPerformance.reduce((sum, m) => sum + m.duration, 0) / recentPerformance.length : 0,
        activeAlerts: recentAlerts.filter(a => a.severity === 'critical').length
      },
      performance: {
        metrics: recentPerformance.slice(-50), // Last 50 requests
        trends: this.calculatePerformanceTrends(recentPerformance)
      },
      errors: {
        metrics: recentErrors.slice(-20), // Last 20 errors
        byType: this.groupErrorsByType(recentErrors)
      },
      system: {
        current: this.getCurrentSystemMetrics(),
        trends: this.calculateSystemTrends(recentSystem)
      },
      alerts: recentAlerts.slice(-10) // Last 10 alerts
    };
  }

  /**
   * Calculate performance trends
   */
  calculatePerformanceTrends(metrics) {
    if (metrics.length < 10) return null;
    
    const sorted = metrics.sort((a, b) => a.timestamp - b.timestamp);
    const midpoint = Math.floor(sorted.length / 2);
    
    const firstHalf = sorted.slice(0, midpoint);
    const secondHalf = sorted.slice(midpoint);
    
    const firstAvg = firstHalf.reduce((sum, m) => sum + m.duration, 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((sum, m) => sum + m.duration, 0) / secondHalf.length;
    
    const change = ((secondAvg - firstAvg) / firstAvg) * 100;
    
    return {
      trend: change > 10 ? 'degrading' : change < -10 ? 'improving' : 'stable',
      change: change.toFixed(2)
    };
  }

  /**
   * Group errors by type
   */
  groupErrorsByType(errors) {
    return errors.reduce((acc, error) => {
      acc[error.name] = (acc[error.name] || 0) + 1;
      return acc;
    }, {});
  }

  /**
   * Get current system metrics
   */
  getCurrentSystemMetrics() {
    const memory = process.memoryUsage();
    return {
      memoryUsage: {
        heapUsed: memory.heapUsed,
        heapTotal: memory.heapTotal,
        percentage: (memory.heapUsed / memory.heapTotal) * 100
      },
      uptime: process.uptime(),
      activeHandles: process._getActiveHandles().length,
      activeRequests: process._getActiveRequests().length
    };
  }

  /**
   * Calculate system trends
   */
  calculateSystemTrends(metrics) {
    const memoryMetrics = metrics.filter(m => m.type === 'memory_heap_used');
    
    if (memoryMetrics.length < 5) return null;
    
    const sorted = memoryMetrics.sort((a, b) => a.timestamp - b.timestamp);
    const trend = sorted[sorted.length - 1].value - sorted[0].value;
    
    return {
      memory: {
        trend: trend > 0 ? 'increasing' : trend < 0 ? 'decreasing' : 'stable',
        change: trend
      }
    };
  }
}

// Create singleton instance
const monitoringService = new MonitoringService();

export default monitoringService;