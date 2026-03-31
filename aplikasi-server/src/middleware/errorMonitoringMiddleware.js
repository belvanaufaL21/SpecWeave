/**
 * Error Monitoring Middleware
 * Comprehensive error monitoring and alerting system
 */

import errorHandler from '../utils/errorHandler.js';
import PerformanceService from '../services/performanceService.js';

// Create performance service instance
const performanceService = new PerformanceService();

class ErrorMonitoringService {
  constructor() {
    this.errorMetrics = {
      totalErrors: 0,
      errorsByType: new Map(),
      errorsByEndpoint: new Map(),
      errorsByUser: new Map(),
      recentErrors: [],
      alertsSent: new Set()
    };
    
    this.alertThresholds = {
      errorRate: 10, // errors per minute
      criticalErrors: 5, // critical errors per hour
      userErrors: 20, // errors per user per hour
      endpointErrors: 15 // errors per endpoint per hour
    };
    
    this.monitoringInterval = null;
    this.startMonitoring();
  }

  /**
   * Start error monitoring
   */
  startMonitoring() {
    // Clean up old data every 5 minutes
    this.monitoringInterval = setInterval(() => {
      this.cleanupOldData();
      this.checkAlertConditions();
    }, 5 * 60 * 1000);
  }

  /**
   * Stop error monitoring
   */
  stopMonitoring() {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }
  }

  /**
   * Record error occurrence
   */
  recordError(errorInfo, req) {
    const timestamp = Date.now();
    
    // Update total count
    this.errorMetrics.totalErrors++;
    
    // Update error by type
    const errorType = errorInfo.name || 'Unknown';
    this.errorMetrics.errorsByType.set(
      errorType,
      (this.errorMetrics.errorsByType.get(errorType) || 0) + 1
    );
    
    // Update error by endpoint
    if (req) {
      const endpoint = `${req.method} ${req.path}`;
      this.errorMetrics.errorsByEndpoint.set(
        endpoint,
        (this.errorMetrics.errorsByEndpoint.get(endpoint) || 0) + 1
      );
      
      // Update error by user
      if (req.user?.id) {
        this.errorMetrics.errorsByUser.set(
          req.user.id,
          (this.errorMetrics.errorsByUser.get(req.user.id) || 0) + 1
        );
      }
    }
    
    // Add to recent errors
    this.errorMetrics.recentErrors.push({
      ...errorInfo,
      timestamp,
      endpoint: req ? `${req.method} ${req.path}` : null,
      userId: req?.user?.id,
      ip: req?.ip
    });
    
    // Keep only last 1000 errors in memory
    if (this.errorMetrics.recentErrors.length > 1000) {
      this.errorMetrics.recentErrors = this.errorMetrics.recentErrors.slice(-1000);
    }
    
    // Record performance impact
    if (performanceService) {
      performanceService.recordMetric('error_occurred', {
        type: errorType,
        severity: errorInfo.severity,
        endpoint: req ? `${req.method} ${req.path}` : null,
        duration: 1
      });
    }
  }

  /**
   * Clean up old data
   */
  cleanupOldData() {
    const oneHourAgo = Date.now() - (60 * 60 * 1000);
    
    // Remove errors older than 1 hour
    this.errorMetrics.recentErrors = this.errorMetrics.recentErrors.filter(
      error => error.timestamp > oneHourAgo
    );
    
    // Clear old alerts
    this.errorMetrics.alertsSent.clear();
  }

  /**
   * Check alert conditions
   */
  checkAlertConditions() {
    const now = Date.now();
    const oneMinuteAgo = now - (60 * 1000);
    const oneHourAgo = now - (60 * 60 * 1000);
    
    // Check error rate (errors per minute)
    const recentErrors = this.errorMetrics.recentErrors.filter(
      error => error.timestamp > oneMinuteAgo
    );
    
    if (recentErrors.length >= this.alertThresholds.errorRate) {
      this.sendAlert('high_error_rate', {
        count: recentErrors.length,
        threshold: this.alertThresholds.errorRate,
        timeWindow: '1 minute'
      });
    }
    
    // Check critical errors
    const criticalErrors = this.errorMetrics.recentErrors.filter(
      error => error.timestamp > oneHourAgo && error.severity === 'critical'
    );
    
    if (criticalErrors.length >= this.alertThresholds.criticalErrors) {
      this.sendAlert('high_critical_error_rate', {
        count: criticalErrors.length,
        threshold: this.alertThresholds.criticalErrors,
        timeWindow: '1 hour'
      });
    }
    
    // Check per-user error rates
    const userErrorCounts = new Map();
    this.errorMetrics.recentErrors
      .filter(error => error.timestamp > oneHourAgo && error.userId)
      .forEach(error => {
        userErrorCounts.set(
          error.userId,
          (userErrorCounts.get(error.userId) || 0) + 1
        );
      });
    
    userErrorCounts.forEach((count, userId) => {
      if (count >= this.alertThresholds.userErrors) {
        this.sendAlert('high_user_error_rate', {
          userId,
          count,
          threshold: this.alertThresholds.userErrors,
          timeWindow: '1 hour'
        });
      }
    });
    
    // Check per-endpoint error rates
    const endpointErrorCounts = new Map();
    this.errorMetrics.recentErrors
      .filter(error => error.timestamp > oneHourAgo && error.endpoint)
      .forEach(error => {
        endpointErrorCounts.set(
          error.endpoint,
          (endpointErrorCounts.get(error.endpoint) || 0) + 1
        );
      });
    
    endpointErrorCounts.forEach((count, endpoint) => {
      if (count >= this.alertThresholds.endpointErrors) {
        this.sendAlert('high_endpoint_error_rate', {
          endpoint,
          count,
          threshold: this.alertThresholds.endpointErrors,
          timeWindow: '1 hour'
        });
      }
    });
  }

  /**
   * Send alert
   */
  sendAlert(alertType, data) {
    const alertKey = `${alertType}:${JSON.stringify(data)}`;
    
    // Prevent duplicate alerts within 1 hour
    if (this.errorMetrics.alertsSent.has(alertKey)) {
      return;
    }
    
    this.errorMetrics.alertsSent.add(alertKey);
    
    console.warn(`🚨 ERROR MONITORING ALERT [${alertType}]:`, data);
    
    // Here you would integrate with your alerting system
    // Examples: Slack, email, PagerDuty, etc.
    this.notifyAlertingSystem(alertType, data);
  }

  /**
   * Notify external alerting system
   */
  async notifyAlertingSystem(alertType, data) {
    try {
      // Example: Send to Slack webhook
      if (process.env.SLACK_WEBHOOK_URL) {
        const message = this.formatSlackMessage(alertType, data);
        await this.sendSlackAlert(message);
      }
      
      // Example: Send email alert
      if (process.env.ALERT_EMAIL) {
        const emailContent = this.formatEmailAlert(alertType, data);
        await this.sendEmailAlert(emailContent);
      }
      
    } catch (error) {
      console.error('Failed to send alert:', error);
    }
  }

  /**
   * Format Slack message
   */
  formatSlackMessage(alertType, data) {
    const emoji = alertType.includes('critical') ? '🔥' : '⚠️';
    const title = alertType.replace(/_/g, ' ').toUpperCase();
    
    return {
      text: `${emoji} ${title}`,
      attachments: [{
        color: alertType.includes('critical') ? 'danger' : 'warning',
        fields: Object.entries(data).map(([key, value]) => ({
          title: key.replace(/_/g, ' ').toUpperCase(),
          value: String(value),
          short: true
        })),
        footer: 'SpecWeave Error Monitoring',
        ts: Math.floor(Date.now() / 1000)
      }]
    };
  }

  /**
   * Format email alert
   */
  formatEmailAlert(alertType, data) {
    const title = alertType.replace(/_/g, ' ').toUpperCase();
    
    return {
      subject: `🚨 SpecWeave Alert: ${title}`,
      html: `
        <h2>🚨 SpecWeave Error Alert</h2>
        <h3>${title}</h3>
        <table border="1" cellpadding="5" cellspacing="0">
          ${Object.entries(data).map(([key, value]) => `
            <tr>
              <td><strong>${key.replace(/_/g, ' ').toUpperCase()}</strong></td>
              <td>${String(value)}</td>
            </tr>
          `).join('')}
        </table>
        <p><small>Generated at ${new Date().toISOString()}</small></p>
      `
    };
  }

  /**
   * Send Slack alert
   */
  async sendSlackAlert(message) {
    const response = await fetch(process.env.SLACK_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(message)
    });
    
    if (!response.ok) {
      throw new Error(`Slack alert failed: ${response.statusText}`);
    }
  }

  /**
   * Send email alert
   */
  async sendEmailAlert(emailContent) {
    // This would integrate with your email service
    // Example: SendGrid, AWS SES, etc.
    console.log('Email alert would be sent:', emailContent);
  }

  /**
   * Get error statistics
   */
  getErrorStats(timeWindow = 60 * 60 * 1000) {
    const cutoff = Date.now() - timeWindow;
    const recentErrors = this.errorMetrics.recentErrors.filter(
      error => error.timestamp > cutoff
    );
    
    const stats = {
      total: recentErrors.length,
      bySeverity: {},
      byType: {},
      byEndpoint: {},
      byUser: {},
      timeline: this.getErrorTimeline(recentErrors)
    };
    
    recentErrors.forEach(error => {
      // By severity
      stats.bySeverity[error.severity] = (stats.bySeverity[error.severity] || 0) + 1;
      
      // By type
      stats.byType[error.name] = (stats.byType[error.name] || 0) + 1;
      
      // By endpoint
      if (error.endpoint) {
        stats.byEndpoint[error.endpoint] = (stats.byEndpoint[error.endpoint] || 0) + 1;
      }
      
      // By user
      if (error.userId) {
        stats.byUser[error.userId] = (stats.byUser[error.userId] || 0) + 1;
      }
    });
    
    return stats;
  }

  /**
   * Get error timeline
   */
  getErrorTimeline(errors, bucketSize = 5 * 60 * 1000) {
    const timeline = {};
    const now = Date.now();
    
    errors.forEach(error => {
      const bucket = Math.floor((now - error.timestamp) / bucketSize) * bucketSize;
      timeline[bucket] = (timeline[bucket] || 0) + 1;
    });
    
    return timeline;
  }

  /**
   * Reset metrics (for testing)
   */
  resetMetrics() {
    this.errorMetrics = {
      totalErrors: 0,
      errorsByType: new Map(),
      errorsByEndpoint: new Map(),
      errorsByUser: new Map(),
      recentErrors: [],
      alertsSent: new Set()
    };
  }
}

// Create singleton instance
const errorMonitoringService = new ErrorMonitoringService();

/**
 * Error monitoring middleware
 */
export const errorMonitoringMiddleware = (err, req, res, next) => {
  // Record the error
  const errorInfo = {
    id: err.id,
    name: err.name,
    message: err.message,
    severity: err.severity || 'medium',
    statusCode: err.statusCode || 500
  };
  
  errorMonitoringService.recordError(errorInfo, req);
  
  next(err);
};

/**
 * Error stats endpoint middleware
 */
export const errorStatsMiddleware = (req, res) => {
  const timeWindow = parseInt(req.query.timeWindow) || (60 * 60 * 1000);
  const stats = errorMonitoringService.getErrorStats(timeWindow);
  
  res.json({
    success: true,
    data: stats,
    timestamp: new Date().toISOString()
  });
};

export default errorMonitoringService;