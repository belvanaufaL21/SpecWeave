/**
 * Traffic Monitoring Service
 * Monitors traffic patterns and provides capacity planning insights
 */

import { supabaseAdmin } from '../config/supabase.js';
import cleanLogger from '../config/cleanLogging.js';

class TrafficMonitoringService {
  constructor() {
    this.trafficData = new Map();
    this.capacityMetrics = new Map();
    this.trafficPatterns = new Map();
    this.alertThresholds = {
      requestsPerMinute: 1000,
      concurrentUsers: 500,
      responseTimeP95: 2000,
      errorRate: 5
    };
    
    this.isMonitoring = false;
    this.monitoringInterval = null;
    
    this.initializeTrafficMonitoring();
  }

  /**
   * Initialize traffic monitoring
   */
  initializeTrafficMonitoring() {
    // Start monitoring
    this.startMonitoring();
    
    // Initialize traffic pattern analysis
    this.initializePatternAnalysis();
  }

  /**
   * Start traffic monitoring
   */
  startMonitoring() {
    if (this.isMonitoring) return;
    
    this.isMonitoring = true;
    
    // Collect traffic metrics every minute
    this.monitoringInterval = setInterval(() => {
      this.collectTrafficMetrics();
      this.analyzeTrafficPatterns();
      this.checkCapacityThresholds();
      this.cleanupOldData();
    }, 60000); // Every minute
    
    // Initial collection
    this.collectTrafficMetrics();
  }

  /**
   * Stop traffic monitoring
   */
  stopMonitoring() {
    if (!this.isMonitoring) return;
    
    this.isMonitoring = false;
    
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }
  }

  /**
   * Record traffic event
   */
  recordTrafficEvent(eventType, data) {
    const timestamp = Date.now();
    const minute = Math.floor(timestamp / 60000) * 60000; // Round to minute
    
    if (!this.trafficData.has(minute)) {
      this.trafficData.set(minute, {
        timestamp: minute,
        requests: 0,
        uniqueUsers: new Set(),
        endpoints: new Map(),
        userAgents: new Map(),
        responseTypes: new Map(),
        responseTimes: [],
        errors: 0,
        bytes: {
          sent: 0,
          received: 0
        }
      });
    }
    
    const minuteData = this.trafficData.get(minute);
    
    switch (eventType) {
      case 'request':
        this.recordRequest(minuteData, data);
        break;
      case 'response':
        this.recordResponse(minuteData, data);
        break;
      case 'error':
        this.recordError(minuteData, data);
        break;
    }
  }

  /**
   * Record request event
   */
  recordRequest(minuteData, data) {
    minuteData.requests++;
    
    // Track unique users
    if (data.userId) {
      minuteData.uniqueUsers.add(data.userId);
    }
    
    // Track endpoints
    const endpoint = `${data.method} ${data.path}`;
    minuteData.endpoints.set(endpoint, (minuteData.endpoints.get(endpoint) || 0) + 1);
    
    // Track user agents
    if (data.userAgent) {
      const userAgent = this.parseUserAgent(data.userAgent);
      minuteData.userAgents.set(userAgent, (minuteData.userAgents.get(userAgent) || 0) + 1);
    }
    
    // Track request size
    if (data.requestSize) {
      minuteData.bytes.received += data.requestSize;
    }
  }

  /**
   * Record response event
   */
  recordResponse(minuteData, data) {
    // Track response times
    if (data.responseTime) {
      minuteData.responseTimes.push(data.responseTime);
    }
    
    // Track response types
    const statusCategory = this.getStatusCategory(data.statusCode);
    minuteData.responseTypes.set(statusCategory, (minuteData.responseTypes.get(statusCategory) || 0) + 1);
    
    // Track response size
    if (data.responseSize) {
      minuteData.bytes.sent += data.responseSize;
    }
  }

  /**
   * Record error event
   */
  recordError(minuteData, data) {
    minuteData.errors++;
  }

  /**
   * Collect traffic metrics from database
   */
  async collectTrafficMetrics() {
    try {
      const oneHourAgo = new Date(Date.now() - 3600000).toISOString();
      
      // Get performance logs from last hour
      const { data: performanceLogs, error } = await supabaseAdmin
        .from('performance_logs')
        .select('*')
        .gte('created_at', oneHourAgo)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      // Process logs into traffic data
      performanceLogs.forEach(log => {
        const timestamp = new Date(log.created_at).getTime();
        const minute = Math.floor(timestamp / 60000) * 60000;
        
        if (!this.trafficData.has(minute)) {
          this.trafficData.set(minute, {
            timestamp: minute,
            requests: 0,
            uniqueUsers: new Set(),
            endpoints: new Map(),
            userAgents: new Map(),
            responseTypes: new Map(),
            responseTimes: [],
            errors: 0,
            bytes: { sent: 0, received: 0 }
          });
        }
        
        const minuteData = this.trafficData.get(minute);
        
        // Record request data
        this.recordRequest(minuteData, {
          userId: log.user_id,
          method: log.operation_type?.split(' ')[0],
          path: log.operation_type?.split(' ')[1],
          userAgent: log.metadata?.user_agent,
          requestSize: log.metadata?.body_size || 0
        });
        
        // Record response data
        this.recordResponse(minuteData, {
          responseTime: log.duration_ms,
          statusCode: log.metadata?.status_code || (log.success ? 200 : 500),
          responseSize: log.metadata?.response_size || 0
        });
        
        // Record errors
        if (!log.success) {
          this.recordError(minuteData, {});
        }
      });
      
    } catch (error) {
      console.error('Error collecting traffic metrics:', error);
    }
  }

  /**
   * Initialize pattern analysis
   */
  initializePatternAnalysis() {
    // Analyze patterns every 5 minutes
    setInterval(() => {
      this.analyzeHourlyPatterns();
      this.analyzeDailyPatterns();
      this.analyzeWeeklyPatterns();
    }, 300000); // 5 minutes
  }

  /**
   * Analyze traffic patterns
   */
  analyzeTrafficPatterns() {
    const now = Date.now();
    const oneHourAgo = now - 3600000;
    
    // Get last hour's data
    const hourlyData = Array.from(this.trafficData.values())
      .filter(data => data.timestamp >= oneHourAgo)
      .sort((a, b) => a.timestamp - b.timestamp);
    
    if (hourlyData.length === 0) return;
    
    // Calculate metrics
    const totalRequests = hourlyData.reduce((sum, data) => sum + data.requests, 0);
    const totalUniqueUsers = new Set();
    const allResponseTimes = [];
    const totalErrors = hourlyData.reduce((sum, data) => sum + data.errors, 0);
    
    hourlyData.forEach(data => {
      data.uniqueUsers.forEach(user => totalUniqueUsers.add(user));
      allResponseTimes.push(...data.responseTimes);
    });
    
    // Store pattern analysis
    const patternKey = `hourly-${Math.floor(now / 3600000)}`;
    this.trafficPatterns.set(patternKey, {
      timestamp: now,
      period: 'hourly',
      metrics: {
        totalRequests,
        requestsPerMinute: totalRequests / 60,
        uniqueUsers: totalUniqueUsers.size,
        averageResponseTime: allResponseTimes.length > 0 ? 
          allResponseTimes.reduce((sum, time) => sum + time, 0) / allResponseTimes.length : 0,
        p95ResponseTime: this.calculatePercentile(allResponseTimes, 95),
        errorRate: totalRequests > 0 ? (totalErrors / totalRequests) * 100 : 0,
        peakMinute: this.findPeakMinute(hourlyData),
        topEndpoints: this.getTopEndpoints(hourlyData),
        userAgentDistribution: this.getUserAgentDistribution(hourlyData)
      }
    });
  }

  /**
   * Analyze hourly patterns
   */
  analyzeHourlyPatterns() {
    const now = Date.now();
    const twentyFourHoursAgo = now - 24 * 3600000;
    
    // Get hourly patterns from last 24 hours
    const hourlyPatterns = Array.from(this.trafficPatterns.values())
      .filter(pattern => pattern.period === 'hourly' && pattern.timestamp >= twentyFourHoursAgo)
      .sort((a, b) => a.timestamp - b.timestamp);
    
    if (hourlyPatterns.length < 12) return; // Need at least 12 hours of data
    
    // Analyze patterns
    const hourlyAnalysis = {
      timestamp: now,
      period: 'daily',
      patterns: {
        peakHours: this.identifyPeakHours(hourlyPatterns),
        lowTrafficHours: this.identifyLowTrafficHours(hourlyPatterns),
        averageRequestsPerHour: hourlyPatterns.reduce((sum, p) => sum + p.metrics.totalRequests, 0) / hourlyPatterns.length,
        trafficTrend: this.calculateTrafficTrend(hourlyPatterns),
        performanceTrend: this.calculatePerformanceTrend(hourlyPatterns)
      }
    };
    
    this.trafficPatterns.set(`daily-${Math.floor(now / (24 * 3600000))}`, hourlyAnalysis);
  }

  /**
   * Analyze daily patterns
   */
  analyzeDailyPatterns() {
    // Similar to hourly but for weekly patterns
    // Implementation would analyze daily patterns over weeks
  }

  /**
   * Analyze weekly patterns
   */
  analyzeWeeklyPatterns() {
    // Implementation would analyze weekly patterns over months
  }

  /**
   * Check capacity thresholds
   */
  checkCapacityThresholds() {
    const currentMetrics = this.getCurrentTrafficMetrics();
    
    // Check requests per minute
    if (currentMetrics.requestsPerMinute > this.alertThresholds.requestsPerMinute) {
      this.sendCapacityAlert('high_request_rate', {
        current: currentMetrics.requestsPerMinute,
        threshold: this.alertThresholds.requestsPerMinute
      });
    }
    
    // Check concurrent users
    if (currentMetrics.concurrentUsers > this.alertThresholds.concurrentUsers) {
      this.sendCapacityAlert('high_concurrent_users', {
        current: currentMetrics.concurrentUsers,
        threshold: this.alertThresholds.concurrentUsers
      });
    }
    
    // Check response time
    if (currentMetrics.p95ResponseTime > this.alertThresholds.responseTimeP95) {
      this.sendCapacityAlert('high_response_time', {
        current: currentMetrics.p95ResponseTime,
        threshold: this.alertThresholds.responseTimeP95
      });
    }
    
    // Check error rate
    if (currentMetrics.errorRate > this.alertThresholds.errorRate) {
      this.sendCapacityAlert('high_error_rate', {
        current: currentMetrics.errorRate,
        threshold: this.alertThresholds.errorRate
      });
    }
  }

  /**
   * Send capacity alert
   */
  sendCapacityAlert(alertType, data) {
    // Only log capacity alerts in debug mode or if they're critical
    if (process.env.LOG_LEVEL === 'DEBUG' || data.current > data.threshold * 2) {
      cleanLogger.warn('TRAFFIC-MONITORING', `Capacity alert: ${alertType}`, data);
    }
    
    // Here you would integrate with your alerting system
    // For now, just log critical alerts only
  }

  /**
   * Get current traffic metrics
   */
  getCurrentTrafficMetrics() {
    const now = Date.now();
    const fiveMinutesAgo = now - 300000;
    
    // Get last 5 minutes of data
    const recentData = Array.from(this.trafficData.values())
      .filter(data => data.timestamp >= fiveMinutesAgo);
    
    if (recentData.length === 0) {
      return {
        requestsPerMinute: 0,
        concurrentUsers: 0,
        averageResponseTime: 0,
        p95ResponseTime: 0,
        errorRate: 0
      };
    }
    
    const totalRequests = recentData.reduce((sum, data) => sum + data.requests, 0);
    const uniqueUsers = new Set();
    const allResponseTimes = [];
    const totalErrors = recentData.reduce((sum, data) => sum + data.errors, 0);
    
    recentData.forEach(data => {
      data.uniqueUsers.forEach(user => uniqueUsers.add(user));
      allResponseTimes.push(...data.responseTimes);
    });
    
    return {
      requestsPerMinute: totalRequests / 5, // Average over 5 minutes
      concurrentUsers: uniqueUsers.size,
      averageResponseTime: allResponseTimes.length > 0 ? 
        allResponseTimes.reduce((sum, time) => sum + time, 0) / allResponseTimes.length : 0,
      p95ResponseTime: this.calculatePercentile(allResponseTimes, 95),
      errorRate: totalRequests > 0 ? (totalErrors / totalRequests) * 100 : 0
    };
  }

  /**
   * Get traffic dashboard data
   */
  getTrafficDashboard() {
    const currentMetrics = this.getCurrentTrafficMetrics();
    const recentPatterns = this.getRecentPatterns();
    const capacityInsights = this.getCapacityInsights();
    
    return {
      current: currentMetrics,
      patterns: recentPatterns,
      capacity: capacityInsights,
      thresholds: this.alertThresholds,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Get recent patterns
   */
  getRecentPatterns() {
    const now = Date.now();
    const twentyFourHoursAgo = now - 24 * 3600000;
    
    return Array.from(this.trafficPatterns.values())
      .filter(pattern => pattern.timestamp >= twentyFourHoursAgo)
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, 24); // Last 24 patterns
  }

  /**
   * Get capacity insights
   */
  getCapacityInsights() {
    const currentMetrics = this.getCurrentTrafficMetrics();
    const patterns = this.getRecentPatterns();
    
    // Calculate capacity utilization
    const capacityUtilization = {
      requests: (currentMetrics.requestsPerMinute / this.alertThresholds.requestsPerMinute) * 100,
      users: (currentMetrics.concurrentUsers / this.alertThresholds.concurrentUsers) * 100,
      responseTime: (currentMetrics.p95ResponseTime / this.alertThresholds.responseTimeP95) * 100,
      errorRate: (currentMetrics.errorRate / this.alertThresholds.errorRate) * 100
    };
    
    // Predict capacity needs
    const predictions = this.predictCapacityNeeds(patterns);
    
    return {
      utilization: capacityUtilization,
      predictions,
      recommendations: this.generateCapacityRecommendations(capacityUtilization, predictions)
    };
  }

  /**
   * Predict capacity needs
   */
  predictCapacityNeeds(patterns) {
    if (patterns.length < 12) {
      return {
        confidence: 'low',
        message: 'Insufficient data for predictions'
      };
    }
    
    // Simple trend analysis
    const hourlyPatterns = patterns.filter(p => p.period === 'hourly').slice(0, 12);
    const requestTrend = this.calculateTrend(hourlyPatterns.map(p => p.metrics.totalRequests));
    const userTrend = this.calculateTrend(hourlyPatterns.map(p => p.metrics.uniqueUsers));
    
    return {
      confidence: 'medium',
      trends: {
        requests: requestTrend,
        users: userTrend
      },
      projections: {
        nextHour: {
          requests: Math.max(0, hourlyPatterns[0].metrics.totalRequests + requestTrend),
          users: Math.max(0, hourlyPatterns[0].metrics.uniqueUsers + userTrend)
        },
        nextDay: {
          requests: Math.max(0, hourlyPatterns[0].metrics.totalRequests + (requestTrend * 24)),
          users: Math.max(0, hourlyPatterns[0].metrics.uniqueUsers + (userTrend * 24))
        }
      }
    };
  }

  /**
   * Generate capacity recommendations
   */
  generateCapacityRecommendations(utilization, predictions) {
    const recommendations = [];
    
    // High utilization warnings
    Object.entries(utilization).forEach(([metric, percentage]) => {
      if (percentage > 80) {
        recommendations.push({
          type: 'warning',
          metric,
          message: `${metric} utilization is at ${percentage.toFixed(1)}% - consider scaling up`,
          priority: percentage > 90 ? 'high' : 'medium'
        });
      }
    });
    
    // Trend-based recommendations
    if (predictions.confidence !== 'low') {
      if (predictions.trends.requests > 0) {
        recommendations.push({
          type: 'info',
          metric: 'requests',
          message: 'Request volume is trending upward - monitor capacity closely',
          priority: 'low'
        });
      }
      
      if (predictions.trends.users > 0) {
        recommendations.push({
          type: 'info',
          metric: 'users',
          message: 'User growth detected - consider user experience optimizations',
          priority: 'low'
        });
      }
    }
    
    return recommendations;
  }

  /**
   * Helper methods
   */
  parseUserAgent(userAgent) {
    // Simplified user agent parsing
    if (userAgent.includes('Chrome')) return 'Chrome';
    if (userAgent.includes('Firefox')) return 'Firefox';
    if (userAgent.includes('Safari')) return 'Safari';
    if (userAgent.includes('Edge')) return 'Edge';
    return 'Other';
  }

  getStatusCategory(statusCode) {
    if (statusCode < 300) return '2xx';
    if (statusCode < 400) return '3xx';
    if (statusCode < 500) return '4xx';
    return '5xx';
  }

  calculatePercentile(values, percentile) {
    if (values.length === 0) return 0;
    
    const sorted = values.sort((a, b) => a - b);
    const index = Math.ceil((percentile / 100) * sorted.length) - 1;
    
    return sorted[Math.max(0, index)];
  }

  findPeakMinute(hourlyData) {
    return hourlyData.reduce((peak, current) => 
      current.requests > peak.requests ? current : peak
    );
  }

  getTopEndpoints(hourlyData) {
    const endpointCounts = new Map();
    
    hourlyData.forEach(data => {
      data.endpoints.forEach((count, endpoint) => {
        endpointCounts.set(endpoint, (endpointCounts.get(endpoint) || 0) + count);
      });
    });
    
    return Array.from(endpointCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([endpoint, count]) => ({ endpoint, count }));
  }

  getUserAgentDistribution(hourlyData) {
    const userAgentCounts = new Map();
    
    hourlyData.forEach(data => {
      data.userAgents.forEach((count, userAgent) => {
        userAgentCounts.set(userAgent, (userAgentCounts.get(userAgent) || 0) + count);
      });
    });
    
    return Object.fromEntries(userAgentCounts);
  }

  identifyPeakHours(hourlyPatterns) {
    const avgRequests = hourlyPatterns.reduce((sum, p) => sum + p.metrics.totalRequests, 0) / hourlyPatterns.length;
    
    return hourlyPatterns
      .filter(p => p.metrics.totalRequests > avgRequests * 1.5)
      .map(p => ({
        hour: new Date(p.timestamp).getHours(),
        requests: p.metrics.totalRequests
      }));
  }

  identifyLowTrafficHours(hourlyPatterns) {
    const avgRequests = hourlyPatterns.reduce((sum, p) => sum + p.metrics.totalRequests, 0) / hourlyPatterns.length;
    
    return hourlyPatterns
      .filter(p => p.metrics.totalRequests < avgRequests * 0.5)
      .map(p => ({
        hour: new Date(p.timestamp).getHours(),
        requests: p.metrics.totalRequests
      }));
  }

  calculateTrafficTrend(patterns) {
    const requests = patterns.map(p => p.metrics.totalRequests);
    return this.calculateTrend(requests);
  }

  calculatePerformanceTrend(patterns) {
    const responseTimes = patterns.map(p => p.metrics.averageResponseTime);
    return this.calculateTrend(responseTimes);
  }

  calculateTrend(values) {
    if (values.length < 2) return 0;
    
    const n = values.length;
    const sumX = (n * (n - 1)) / 2;
    const sumY = values.reduce((sum, val) => sum + val, 0);
    const sumXY = values.reduce((sum, val, index) => sum + (index * val), 0);
    const sumXX = (n * (n - 1) * (2 * n - 1)) / 6;
    
    return (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
  }

  cleanupOldData() {
    const twentyFourHoursAgo = Date.now() - 24 * 3600000;
    
    // Clean traffic data
    for (const [timestamp, data] of this.trafficData.entries()) {
      if (timestamp < twentyFourHoursAgo) {
        this.trafficData.delete(timestamp);
      }
    }
    
    // Clean pattern data
    for (const [key, pattern] of this.trafficPatterns.entries()) {
      if (pattern.timestamp < twentyFourHoursAgo) {
        this.trafficPatterns.delete(key);
      }
    }
  }
}

// Create singleton instance
const trafficMonitoringService = new TrafficMonitoringService();

export default trafficMonitoringService;
