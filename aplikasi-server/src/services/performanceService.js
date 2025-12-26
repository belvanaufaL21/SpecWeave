/**
 * Performance Monitoring Service
 * Tracks generation times, METEOR evaluation performance, and system metrics
 */
class PerformanceService {
  constructor() {
    this.activeTimers = new Map();
    this.performanceThreshold = parseInt(process.env.PERFORMANCE_ALERT_THRESHOLD_MS) || 2000;
    this.meteorThreshold = 500; // 500ms threshold for METEOR evaluation
  }

  /**
   * Start a performance timer for a request
   * @param {string} requestId - Unique identifier for the request
   * @param {string} operationType - Type of operation being timed
   * @returns {Object} Timer object with start time
   */
  startTimer(requestId, operationType = 'gherkin_generation') {
    const timer = {
      requestId,
      operationType,
      startTime: Date.now(),
      startHrTime: process.hrtime()
    };
    
    this.activeTimers.set(requestId, timer);
    console.log(`⏱️ Performance timer started for ${operationType} (${requestId})`);
    
    return timer;
  }

  /**
   * End a performance timer and calculate duration
   * @param {string} requestId - Request identifier
   * @returns {Object} Performance metrics
   */
  endTimer(requestId) {
    const timer = this.activeTimers.get(requestId);
    
    if (!timer) {
      console.warn(`⚠️ No timer found for request ${requestId}`);
      return null;
    }

    const endTime = Date.now();
    const endHrTime = process.hrtime(timer.startHrTime);
    
    const durationMs = endTime - timer.startTime;
    const precisionMs = (endHrTime[0] * 1000) + (endHrTime[1] / 1000000);

    const metrics = {
      requestId: timer.requestId,
      operationType: timer.operationType,
      startTime: new Date(timer.startTime).toISOString(),
      endTime: new Date(endTime).toISOString(),
      durationMs: Math.round(durationMs),
      precisionMs: Math.round(precisionMs * 100) / 100,
      success: true
    };

    // Check if performance exceeds threshold
    if (durationMs > this.performanceThreshold) {
      console.warn(`🚨 Performance alert: ${timer.operationType} took ${durationMs}ms (threshold: ${this.performanceThreshold}ms)`);
      metrics.performanceAlert = true;
    }

    // Clean up timer
    this.activeTimers.delete(requestId);
    
    console.log(`✅ Performance timer ended for ${timer.operationType}: ${durationMs}ms`);
    return metrics;
  }

  /**
   * Record a failed operation
   * @param {string} requestId - Request identifier
   * @param {Error} error - Error that occurred
   * @returns {Object} Error metrics
   */
  recordError(requestId, error) {
    const timer = this.activeTimers.get(requestId);
    const endTime = Date.now();
    
    const metrics = {
      requestId,
      operationType: timer?.operationType || 'unknown',
      startTime: timer ? new Date(timer.startTime).toISOString() : new Date(endTime).toISOString(),
      endTime: new Date(endTime).toISOString(),
      durationMs: timer ? endTime - timer.startTime : 0,
      success: false,
      error: error.message,
      errorStack: error.stack
    };

    // Clean up timer if exists
    if (timer) {
      this.activeTimers.delete(requestId);
    }

    console.error(`❌ Performance error recorded for ${metrics.operationType}: ${error.message}`);
    return metrics;
  }

  /**
   * Log performance metrics to database (placeholder for Supabase integration)
   * @param {Object} metrics - Performance metrics to log
   * @param {string} userId - User ID associated with the request
   * @returns {Promise<boolean>} Success status
   */
  async logPerformanceMetrics(metrics, userId = null) {
    try {
      // TODO: Implement Supabase logging
      // This would insert into performance_logs table
      console.log('📊 Performance metrics logged:', {
        ...metrics,
        userId
      });
      
      return true;
    } catch (error) {
      console.error('Failed to log performance metrics:', error);
      return false;
    }
  }

  /**
   * Log METEOR evaluation metrics to database
   * @param {string} scenarioId - Scenario ID
   * @param {Object} meteorMetrics - METEOR evaluation results
   * @param {string} userId - User ID
   * @returns {Promise<boolean>} Success status
   */
  async logMeteorMetrics(scenarioId, meteorMetrics, userId) {
    try {
      // TODO: Implement Supabase logging
      // This would insert into evaluation_metrics table
      const evaluationRecord = {
        scenario_id: scenarioId,
        user_id: userId,
        meteor_score: meteorMetrics.meteor_score,
        precision_score: meteorMetrics.precision,
        recall_score: meteorMetrics.recall,
        fmean_score: meteorMetrics.fmean,
        fragmentation_penalty: meteorMetrics.fragmentation_penalty,
        generation_time_ms: meteorMetrics.evaluation_time_ms,
        quality_level: meteorMetrics.quality_level,
        reference_type: 'template', // or 'previous_scenario', 'manual'
        created_at: new Date().toISOString()
      };

      console.log('📈 METEOR metrics logged:', evaluationRecord);
      return true;
    } catch (error) {
      console.error('Failed to log METEOR metrics:', error);
      return false;
    }
  }

  /**
   * Get performance statistics for a time period
   * @param {Date} startDate - Start date for statistics
   * @param {Date} endDate - End date for statistics
   * @returns {Promise<Object>} Performance statistics
   */
  async getPerformanceStats(startDate, endDate) {
    try {
      // TODO: Implement Supabase query
      // This would query performance_logs table
      
      // Placeholder statistics
      return {
        totalRequests: 0,
        averageGenerationTime: 0,
        averageMeteorScore: 0,
        successRate: 0,
        performanceAlerts: 0,
        qualityDistribution: {
          excellent: 0,
          good: 0,
          acceptable: 0,
          poor: 0,
          very_poor: 0
        }
      };
    } catch (error) {
      console.error('Failed to get performance stats:', error);
      throw error;
    }
  }

  /**
   * Detect performance degradation patterns
   * @returns {Promise<Array>} Array of performance issues detected
   */
  async detectPerformanceIssues() {
    try {
      const issues = [];
      
      // TODO: Implement performance analysis
      // - Check for increasing generation times
      // - Check for declining METEOR scores
      // - Check for increased error rates
      
      return issues;
    } catch (error) {
      console.error('Failed to detect performance issues:', error);
      return [];
    }
  }

  /**
   * Send performance alerts to administrators
   * @param {Object} metrics - Performance metrics that triggered alert
   * @returns {Promise<boolean>} Success status
   */
  async sendPerformanceAlert(metrics) {
    try {
      // TODO: Implement alerting system (email, Slack, etc.)
      console.warn('🚨 Performance Alert:', {
        type: 'performance_degradation',
        operationType: metrics.operationType,
        duration: metrics.durationMs,
        threshold: this.performanceThreshold,
        timestamp: metrics.endTime
      });
      
      return true;
    } catch (error) {
      console.error('Failed to send performance alert:', error);
      return false;
    }
  }

  /**
   * Generate performance report
   * @param {Date} startDate - Report start date
   * @param {Date} endDate - Report end date
   * @returns {Promise<Object>} Performance report
   */
  async generatePerformanceReport(startDate, endDate) {
    try {
      const stats = await this.getPerformanceStats(startDate, endDate);
      const issues = await this.detectPerformanceIssues();
      
      return {
        reportPeriod: {
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString()
        },
        summary: stats,
        issues: issues,
        recommendations: this.generateRecommendations(stats, issues),
        generatedAt: new Date().toISOString()
      };
    } catch (error) {
      console.error('Failed to generate performance report:', error);
      throw error;
    }
  }

  /**
   * Generate performance recommendations based on statistics
   * @param {Object} stats - Performance statistics
   * @param {Array} issues - Detected issues
   * @returns {Array} Array of recommendations
   */
  generateRecommendations(stats, issues) {
    const recommendations = [];
    
    if (stats.averageGenerationTime > this.performanceThreshold) {
      recommendations.push({
        type: 'performance',
        priority: 'high',
        message: 'Waktu generasi rata-rata melebihi threshold. Pertimbangkan optimisasi prompt atau model AI.',
        action: 'optimize_ai_service'
      });
    }
    
    if (stats.averageMeteorScore < 0.7) {
      recommendations.push({
        type: 'quality',
        priority: 'medium',
        message: 'Skor METEOR rata-rata di bawah threshold kualitas. Review template referensi dan prompt engineering.',
        action: 'improve_quality'
      });
    }
    
    if (stats.successRate < 0.95) {
      recommendations.push({
        type: 'reliability',
        priority: 'high',
        message: 'Tingkat keberhasilan rendah. Periksa koneksi API dan error handling.',
        action: 'improve_reliability'
      });
    }
    
    return recommendations;
  }

  /**
   * Get current system performance metrics
   * @returns {Object} Current performance metrics
   */
  getCurrentMetrics() {
    return {
      activeTimers: this.activeTimers.size,
      performanceThreshold: this.performanceThreshold,
      meteorThreshold: this.meteorThreshold,
      memoryUsage: process.memoryUsage(),
      uptime: process.uptime(),
      timestamp: new Date().toISOString()
    };
  }
}

export default PerformanceService;