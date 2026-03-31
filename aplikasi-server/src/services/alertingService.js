/**
 * Alerting Service
 * Handles alert generation, routing, and delivery for performance degradation
 */

import { supabaseAdmin } from '../config/supabase.js';

class AlertingService {
  constructor() {
    this.alertChannels = new Map();
    this.alertRules = new Map();
    this.alertHistory = new Map();
    this.suppressionRules = new Map();
    
    this.initializeDefaultRules();
    this.initializeChannels();
  }

  /**
   * Initialize default alerting rules
   */
  initializeDefaultRules() {
    // Performance degradation rules
    this.addAlertRule('slow_response_time', {
      condition: (metric) => metric.duration > 3000,
      severity: 'warning',
      message: 'Response time exceeded 3 seconds',
      cooldown: 300000, // 5 minutes
      channels: ['console', 'webhook']
    });

    this.addAlertRule('critical_response_time', {
      condition: (metric) => metric.duration > 5000,
      severity: 'critical',
      message: 'Response time exceeded 5 seconds',
      cooldown: 180000, // 3 minutes
      channels: ['console', 'webhook', 'email']
    });

    // Error rate rules
    this.addAlertRule('high_error_rate', {
      condition: (errorRate) => errorRate > 10,
      severity: 'critical',
      message: 'Error rate exceeded 10%',
      cooldown: 300000,
      channels: ['console', 'webhook', 'email']
    });

    this.addAlertRule('elevated_error_rate', {
      condition: (errorRate) => errorRate > 5,
      severity: 'warning',
      message: 'Error rate exceeded 5%',
      cooldown: 600000, // 10 minutes
      channels: ['console', 'webhook']
    });

    // System resource rules
    this.addAlertRule('high_memory_usage', {
      condition: (memoryPercent) => memoryPercent > 90,
      severity: 'critical',
      message: 'Memory usage exceeded 90%',
      cooldown: 300000,
      channels: ['console', 'webhook', 'email']
    });

    this.addAlertRule('elevated_memory_usage', {
      condition: (memoryPercent) => memoryPercent > 80,
      severity: 'warning',
      message: 'Memory usage exceeded 80%',
      cooldown: 600000,
      channels: ['console', 'webhook']
    });

    // Database connection rules
    this.addAlertRule('database_connection_failure', {
      condition: (error) => error.message.includes('connection'),
      severity: 'critical',
      message: 'Database connection failure detected',
      cooldown: 180000,
      channels: ['console', 'webhook', 'email']
    });

    // Service availability rules
    this.addAlertRule('service_unavailable', {
      condition: (statusCode) => statusCode >= 500,
      severity: 'critical',
      message: 'Service unavailable (5xx errors)',
      cooldown: 300000,
      channels: ['console', 'webhook', 'email']
    });
  }

  /**
   * Initialize alert channels
   */
  initializeChannels() {
    // Console channel
    this.addAlertChannel('console', {
      send: (alert) => {
        const emoji = alert.severity === 'critical' ? '🔥' : '⚠️';
        console.warn(`${emoji} [ALERT] ${alert.rule}: ${alert.message}`, alert.data);
      }
    });

    // Webhook channel
    this.addAlertChannel('webhook', {
      send: async (alert) => {
        if (!process.env.ALERT_WEBHOOK_URL) return;
        
        try {
          const response = await fetch(process.env.ALERT_WEBHOOK_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              text: `${alert.severity === 'critical' ? '🔥' : '⚠️'} SpecWeave Alert`,
              attachments: [{
                color: alert.severity === 'critical' ? 'danger' : 'warning',
                title: alert.rule.replace(/_/g, ' ').toUpperCase(),
                text: alert.message,
                fields: Object.entries(alert.data || {}).map(([key, value]) => ({
                  title: key.replace(/_/g, ' ').toUpperCase(),
                  value: String(value),
                  short: true
                })),
                footer: 'SpecWeave Monitoring',
                ts: Math.floor(alert.timestamp / 1000)
              }]
            })
          });

          if (!response.ok) {
            throw new Error(`Webhook failed: ${response.statusText}`);
          }
        } catch (error) {
          console.error('Failed to send webhook alert:', error);
        }
      }
    });

    // Email channel
    this.addAlertChannel('email', {
      send: async (alert) => {
        if (!process.env.ALERT_EMAIL) return;
        
        try {
          // This would integrate with your email service
          const emailData = {
            to: process.env.ALERT_EMAIL,
            subject: `🚨 SpecWeave Alert: ${alert.rule.replace(/_/g, ' ').toUpperCase()}`,
            html: this.formatEmailAlert(alert)
          };
          
          console.log('Email alert would be sent:', emailData);
          // await emailService.send(emailData);
        } catch (error) {
          console.error('Failed to send email alert:', error);
        }
      }
    });

    // Database channel (for alert history)
    this.addAlertChannel('database', {
      send: async (alert) => {
        try {
          const { error } = await supabaseAdmin
            .from('monitoring_alerts')
            .insert({
              alert_rule: alert.rule,
              severity: alert.severity,
              message: alert.message,
              data: alert.data,
              created_at: new Date(alert.timestamp).toISOString()
            });

          if (error && !error.message.includes('relation "monitoring_alerts" does not exist')) {
            throw error;
          }
        } catch (error) {
          console.error('Failed to store alert in database:', error);
        }
      }
    });
  }

  /**
   * Add alert rule
   */
  addAlertRule(name, rule) {
    this.alertRules.set(name, {
      ...rule,
      name,
      createdAt: Date.now()
    });
  }

  /**
   * Add alert channel
   */
  addAlertChannel(name, channel) {
    this.alertChannels.set(name, {
      ...channel,
      name,
      createdAt: Date.now()
    });
  }

  /**
   * Check performance metric against rules
   */
  checkPerformanceMetric(metric) {
    // Check response time rules
    if (metric.duration) {
      this.evaluateRule('slow_response_time', metric.duration, metric);
      this.evaluateRule('critical_response_time', metric.duration, metric);
    }
  }

  /**
   * Check error rate against rules
   */
  checkErrorRate(errorRate, context = {}) {
    this.evaluateRule('high_error_rate', errorRate, context);
    this.evaluateRule('elevated_error_rate', errorRate, context);
  }

  /**
   * Check system metrics against rules
   */
  checkSystemMetrics(metrics) {
    if (metrics.memoryPercent) {
      this.evaluateRule('high_memory_usage', metrics.memoryPercent, metrics);
      this.evaluateRule('elevated_memory_usage', metrics.memoryPercent, metrics);
    }
  }

  /**
   * Check error against rules
   */
  checkError(error, context = {}) {
    this.evaluateRule('database_connection_failure', error, { error, ...context });
    
    if (context.statusCode) {
      this.evaluateRule('service_unavailable', context.statusCode, { error, ...context });
    }
  }

  /**
   * Evaluate a specific rule
   */
  evaluateRule(ruleName, value, context = {}) {
    const rule = this.alertRules.get(ruleName);
    if (!rule) return;

    try {
      // Check if rule condition is met
      if (!rule.condition(value)) return;

      // Check suppression rules
      if (this.isAlertSuppressed(ruleName, context)) return;

      // Check cooldown
      if (this.isInCooldown(ruleName)) return;

      // Create and send alert
      const alert = {
        id: `${ruleName}-${Date.now()}`,
        rule: ruleName,
        severity: rule.severity,
        message: rule.message,
        data: context,
        timestamp: Date.now()
      };

      this.sendAlert(alert, rule.channels);
      this.recordAlertHistory(alert);
      this.setCooldown(ruleName, rule.cooldown);

    } catch (error) {
      console.error(`Error evaluating rule ${ruleName}:`, error);
    }
  }

  /**
   * Send alert to specified channels
   */
  async sendAlert(alert, channels = ['console']) {
    const promises = channels.map(async (channelName) => {
      const channel = this.alertChannels.get(channelName);
      if (!channel) {
        console.warn(`Alert channel '${channelName}' not found`);
        return;
      }

      try {
        await channel.send(alert);
      } catch (error) {
        console.error(`Failed to send alert via ${channelName}:`, error);
      }
    });

    // Always send to database for history
    const dbChannel = this.alertChannels.get('database');
    if (dbChannel) {
      promises.push(dbChannel.send(alert));
    }

    await Promise.allSettled(promises);
  }

  /**
   * Check if alert is suppressed
   */
  isAlertSuppressed(ruleName, context) {
    const suppressionKey = `${ruleName}:${JSON.stringify(context)}`;
    const suppression = this.suppressionRules.get(suppressionKey);
    
    if (!suppression) return false;
    
    return Date.now() < suppression.until;
  }

  /**
   * Check if rule is in cooldown
   */
  isInCooldown(ruleName) {
    const history = this.alertHistory.get(ruleName);
    if (!history || history.length === 0) return false;

    const lastAlert = history[history.length - 1];
    const rule = this.alertRules.get(ruleName);
    
    return Date.now() - lastAlert.timestamp < rule.cooldown;
  }

  /**
   * Set cooldown for rule
   */
  setCooldown(ruleName, duration) {
    // Cooldown is implicitly handled by alert history and rule cooldown settings
    // This method exists for explicit cooldown management if needed
  }

  /**
   * Record alert in history
   */
  recordAlertHistory(alert) {
    if (!this.alertHistory.has(alert.rule)) {
      this.alertHistory.set(alert.rule, []);
    }

    const history = this.alertHistory.get(alert.rule);
    history.push(alert);

    // Keep only last 100 alerts per rule
    if (history.length > 100) {
      history.splice(0, history.length - 100);
    }
  }

  /**
   * Suppress alerts for a rule
   */
  suppressAlerts(ruleName, duration, context = {}) {
    const suppressionKey = `${ruleName}:${JSON.stringify(context)}`;
    this.suppressionRules.set(suppressionKey, {
      until: Date.now() + duration,
      reason: 'Manual suppression'
    });
  }

  /**
   * Format email alert
   */
  formatEmailAlert(alert) {
    return `
      <html>
        <body>
          <h2>🚨 SpecWeave System Alert</h2>
          <div style="background-color: ${alert.severity === 'critical' ? '#ffebee' : '#fff3e0'}; padding: 15px; border-radius: 5px; margin: 10px 0;">
            <h3 style="color: ${alert.severity === 'critical' ? '#d32f2f' : '#f57c00'}; margin: 0 0 10px 0;">
              ${alert.rule.replace(/_/g, ' ').toUpperCase()}
            </h3>
            <p><strong>Severity:</strong> ${alert.severity.toUpperCase()}</p>
            <p><strong>Message:</strong> ${alert.message}</p>
            <p><strong>Time:</strong> ${new Date(alert.timestamp).toISOString()}</p>
          </div>
          
          ${alert.data && Object.keys(alert.data).length > 0 ? `
            <h4>Alert Data:</h4>
            <table border="1" cellpadding="5" cellspacing="0" style="border-collapse: collapse;">
              ${Object.entries(alert.data).map(([key, value]) => `
                <tr>
                  <td><strong>${key.replace(/_/g, ' ').toUpperCase()}</strong></td>
                  <td>${String(value)}</td>
                </tr>
              `).join('')}
            </table>
          ` : ''}
          
          <hr style="margin: 20px 0;">
          <p style="color: #666; font-size: 12px;">
            This alert was generated by SpecWeave Monitoring System.<br>
            To suppress similar alerts, contact your system administrator.
          </p>
        </body>
      </html>
    `;
  }

  /**
   * Get alert statistics
   */
  getAlertStats(timeWindow = 3600000) { // 1 hour default
    const cutoff = Date.now() - timeWindow;
    const stats = {
      total: 0,
      bySeverity: { critical: 0, warning: 0, info: 0 },
      byRule: {},
      recentAlerts: []
    };

    this.alertHistory.forEach((alerts, ruleName) => {
      const recentAlerts = alerts.filter(alert => alert.timestamp > cutoff);
      
      recentAlerts.forEach(alert => {
        stats.total++;
        stats.bySeverity[alert.severity]++;
        stats.byRule[ruleName] = (stats.byRule[ruleName] || 0) + 1;
        stats.recentAlerts.push(alert);
      });
    });

    // Sort recent alerts by timestamp (newest first)
    stats.recentAlerts.sort((a, b) => b.timestamp - a.timestamp);
    stats.recentAlerts = stats.recentAlerts.slice(0, 50); // Limit to 50 most recent

    return stats;
  }

  /**
   * Get alert rules configuration
   */
  getAlertRules() {
    return Array.from(this.alertRules.entries()).map(([name, rule]) => ({
      name,
      severity: rule.severity,
      message: rule.message,
      channels: rule.channels,
      cooldown: rule.cooldown
    }));
  }

  /**
   * Update alert rule
   */
  updateAlertRule(name, updates) {
    const existingRule = this.alertRules.get(name);
    if (!existingRule) {
      throw new Error(`Alert rule '${name}' not found`);
    }

    this.alertRules.set(name, {
      ...existingRule,
      ...updates,
      updatedAt: Date.now()
    });
  }

  /**
   * Delete alert rule
   */
  deleteAlertRule(name) {
    this.alertRules.delete(name);
    this.alertHistory.delete(name);
  }

  /**
   * Test alert rule
   */
  async testAlertRule(ruleName, testValue, testContext = {}) {
    const rule = this.alertRules.get(ruleName);
    if (!rule) {
      throw new Error(`Alert rule '${ruleName}' not found`);
    }

    // Temporarily disable cooldown for testing
    const originalCooldown = rule.cooldown;
    rule.cooldown = 0;

    try {
      this.evaluateRule(ruleName, testValue, { ...testContext, test: true });
      return { success: true, message: 'Test alert sent successfully' };
    } catch (error) {
      return { success: false, error: error.message };
    } finally {
      // Restore original cooldown
      rule.cooldown = originalCooldown;
    }
  }

  /**
   * Clear alert history
   */
  clearAlertHistory(ruleName = null) {
    if (ruleName) {
      this.alertHistory.delete(ruleName);
    } else {
      this.alertHistory.clear();
    }
  }
}

// Create singleton instance
const alertingService = new AlertingService();

export default alertingService;