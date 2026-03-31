/**
 * Enhanced Backend Error Handler
 * Centralized error handling for Express.js with performance monitoring
 */

import { v4 as uuidv4 } from 'uuid';
import { supabaseAdmin } from '../config/supabase.js';

/**
 * Custom error classes
 */
export class AppError extends Error {
  constructor(message, statusCode = 500, code = null, details = null) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    this.isOperational = true;
    this.timestamp = new Date().toISOString();
    this.id = uuidv4();
    
    Error.captureStackTrace(this, this.constructor);
  }

  toJSON() {
    return {
      id: this.id,
      name: this.name,
      message: this.message,
      statusCode: this.statusCode,
      code: this.code,
      details: this.details,
      timestamp: this.timestamp,
      stack: process.env.NODE_ENV === 'development' ? this.stack : undefined
    };
  }
}

export class ValidationError extends AppError {
  constructor(message, field = null, value = null) {
    super(message, 400, 'VALIDATION_ERROR', { field, value });
    this.name = 'ValidationError';
  }
}

export class NotFoundError extends AppError {
  constructor(resource = 'Resource') {
    super(`${resource} not found`, 404, 'NOT_FOUND');
    this.name = 'NotFoundError';
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'Unauthorized access') {
    super(message, 401, 'UNAUTHORIZED');
    this.name = 'UnauthorizedError';
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'Forbidden access') {
    super(message, 403, 'FORBIDDEN');
    this.name = 'ForbiddenError';
  }
}

export class ConflictError extends AppError {
  constructor(message = 'Resource conflict') {
    super(message, 409, 'CONFLICT');
    this.name = 'ConflictError';
  }
}

export class RateLimitError extends AppError {
  constructor(message = 'Rate limit exceeded') {
    super(message, 429, 'RATE_LIMIT_EXCEEDED');
    this.name = 'RateLimitError';
  }
}

/**
 * Error Handler Class
 */
class ErrorHandler {
  constructor() {
    this.errorCounts = new Map();
    this.errorPatterns = new Map();
    this.alertThresholds = {
      error_rate: 10, // errors per minute
      critical_errors: 5, // critical errors per hour
      memory_usage: 0.9 // 90% memory usage
    };
  }

  /**
   * Handle application errors
   */
  handleError(error, req = null, res = null) {
    const errorInfo = this.createErrorInfo(error, req);
    
    // Log error
    this.logError(errorInfo);
    
    // Track error patterns
    this.trackErrorPattern(errorInfo);
    
    // Check for alerts
    this.checkAlerts(errorInfo);
    
    // Store error for analysis
    this.storeError(errorInfo);
    
    // Send response if res is provided
    if (res && !res.headersSent) {
      this.sendErrorResponse(res, errorInfo);
    }
    
    return errorInfo;
  }

  /**
   * Create standardized error information
   */
  createErrorInfo(error, req = null) {
    const timestamp = new Date().toISOString();
    const errorId = error.id || uuidv4();
    
    return {
      id: errorId,
      timestamp,
      name: error.name || 'Error',
      message: error.message || 'Unknown error',
      stack: error.stack,
      statusCode: error.statusCode || 500,
      code: error.code,
      details: error.details,
      isOperational: error.isOperational || false,
      severity: this.determineSeverity(error),
      request: req ? {
        method: req.method,
        url: req.url,
        path: req.path,
        query: req.query,
        params: req.params,
        headers: this.sanitizeHeaders(req.headers),
        userAgent: req.get('User-Agent'),
        ip: req.ip,
        userId: req.user?.id,
        requestId: req.requestId
      } : null,
      environment: {
        nodeEnv: process.env.NODE_ENV,
        nodeVersion: process.version,
        platform: process.platform,
        memory: process.memoryUsage(),
        uptime: process.uptime()
      }
    };
  }

  /**
   * Determine error severity
   */
  determineSeverity(error) {
    if (error.statusCode >= 500) return 'critical';
    if (error.statusCode >= 400) return 'high';
    if (error.name === 'ValidationError') return 'medium';
    return 'low';
  }

  /**
   * Sanitize request headers (remove sensitive data)
   */
  sanitizeHeaders(headers) {
    const sanitized = { ...headers };
    const sensitiveHeaders = ['authorization', 'cookie', 'x-api-key', 'x-auth-token'];
    
    sensitiveHeaders.forEach(header => {
      if (sanitized[header]) {
        sanitized[header] = '[REDACTED]';
      }
    });
    
    return sanitized;
  }

  /**
   * Log error to console and external services
   */
  logError(errorInfo) {
    const logLevel = this.getLogLevel(errorInfo.severity);
    
    if (process.env.NODE_ENV === 'development') {
      console.group(`🚨 ${logLevel.toUpperCase()} ERROR [${errorInfo.severity}]`);
      console.error('ID:', errorInfo.id);
      console.error('Message:', errorInfo.message);
      console.error('Code:', errorInfo.code);
      if (errorInfo.request) {
        console.error('Request:', `${errorInfo.request.method} ${errorInfo.request.url}`);
        console.error('User:', errorInfo.request.userId || 'Anonymous');
      }
      if (errorInfo.stack) {
        console.error('Stack:', errorInfo.stack);
      }
      console.groupEnd();
    } else {
      // Production logging (structured)
      console.log(JSON.stringify({
        level: logLevel,
        message: errorInfo.message,
        error: errorInfo,
        timestamp: errorInfo.timestamp
      }));
    }
  }

  /**
   * Get log level based on severity
   */
  getLogLevel(severity) {
    switch (severity) {
      case 'critical': return 'error';
      case 'high': return 'error';
      case 'medium': return 'warn';
      case 'low': return 'info';
      default: return 'error';
    }
  }

  /**
   * Track error patterns for analysis
   */
  trackErrorPattern(errorInfo) {
    const patternKey = `${errorInfo.name}:${errorInfo.code}`;
    const now = Date.now();
    
    if (!this.errorPatterns.has(patternKey)) {
      this.errorPatterns.set(patternKey, {
        count: 0,
        firstSeen: now,
        lastSeen: now,
        occurrences: []
      });
    }
    
    const pattern = this.errorPatterns.get(patternKey);
    pattern.count++;
    pattern.lastSeen = now;
    pattern.occurrences.push(now);
    
    // Keep only last 100 occurrences
    if (pattern.occurrences.length > 100) {
      pattern.occurrences = pattern.occurrences.slice(-100);
    }
  }

  /**
   * Check for alert conditions
   */
  checkAlerts(errorInfo) {
    // Check error rate
    const recentErrors = this.getRecentErrors(60000); // 1 minute
    if (recentErrors.length >= this.alertThresholds.error_rate) {
      this.sendAlert('high_error_rate', {
        count: recentErrors.length,
        timeWindow: '1 minute',
        threshold: this.alertThresholds.error_rate
      });
    }
    
    // Check critical errors
    if (errorInfo.severity === 'critical') {
      const recentCritical = this.getRecentErrors(3600000, 'critical'); // 1 hour
      if (recentCritical.length >= this.alertThresholds.critical_errors) {
        this.sendAlert('high_critical_error_rate', {
          count: recentCritical.length,
          timeWindow: '1 hour',
          threshold: this.alertThresholds.critical_errors
        });
      }
    }
    
    // Check memory usage
    const memoryUsage = process.memoryUsage();
    const memoryUsageRatio = memoryUsage.heapUsed / memoryUsage.heapTotal;
    if (memoryUsageRatio >= this.alertThresholds.memory_usage) {
      this.sendAlert('high_memory_usage', {
        usage: memoryUsageRatio,
        threshold: this.alertThresholds.memory_usage,
        memoryUsage
      });
    }
  }

  /**
   * Get recent errors from memory
   */
  getRecentErrors(timeWindow, severity = null) {
    const now = Date.now();
    const cutoff = now - timeWindow;
    
    return Array.from(this.errorPatterns.values())
      .flatMap(pattern => pattern.occurrences)
      .filter(timestamp => timestamp >= cutoff)
      .filter(error => !severity || error.severity === severity);
  }

  /**
   * Send alert (implement based on your alerting system)
   */
  sendAlert(type, data) {
    console.warn(`🚨 ALERT [${type}]:`, data);
    
    // Implement your alerting logic here
    // Examples: Slack webhook, email, PagerDuty, etc.
  }

  /**
   * Store error for analysis
   */
  async storeError(errorInfo) {
    try {
      // Store in database for analysis
      await supabaseAdmin
        .from('error_logs')
        .insert({
          id: errorInfo.id,
          timestamp: errorInfo.timestamp,
          name: errorInfo.name,
          message: errorInfo.message,
          stack: errorInfo.stack,
          status_code: errorInfo.statusCode,
          code: errorInfo.code,
          severity: errorInfo.severity,
          is_operational: errorInfo.isOperational,
          request_data: errorInfo.request,
          environment_data: errorInfo.environment,
          details: errorInfo.details
        });
    } catch (storageError) {
      console.error('Failed to store error:', storageError);
    }
  }

  /**
   * Send error response to client
   */
  sendErrorResponse(res, errorInfo) {
    const isDevelopment = process.env.NODE_ENV === 'development';
    
    const response = {
      error: {
        id: errorInfo.id,
        message: errorInfo.message,
        code: errorInfo.code,
        timestamp: errorInfo.timestamp
      }
    };
    
    // Include additional details in development
    if (isDevelopment) {
      response.error.details = errorInfo.details;
      response.error.stack = errorInfo.stack;
    }
    
    res.status(errorInfo.statusCode).json(response);
  }

  /**
   * Express error handling middleware
   */
  middleware() {
    return (error, req, res, next) => {
      this.handleError(error, req, res);
    };
  }

  /**
   * Async error wrapper for route handlers
   */
  asyncHandler(fn) {
    return (req, res, next) => {
      Promise.resolve(fn(req, res, next)).catch(next);
    };
  }

  /**
   * Get error statistics
   */
  getErrorStats(timeWindow = 24 * 60 * 60 * 1000) {
    const now = Date.now();
    const cutoff = now - timeWindow;
    
    const stats = {
      totalPatterns: this.errorPatterns.size,
      recentErrors: 0,
      bySeverity: {},
      byType: {},
      topErrors: []
    };
    
    this.errorPatterns.forEach((pattern, key) => {
      const recentOccurrences = pattern.occurrences.filter(t => t >= cutoff);
      stats.recentErrors += recentOccurrences.length;
      
      if (recentOccurrences.length > 0) {
        const [name] = key.split(':');
        stats.byType[name] = (stats.byType[name] || 0) + recentOccurrences.length;
        
        stats.topErrors.push({
          pattern: key,
          count: recentOccurrences.length,
          firstSeen: pattern.firstSeen,
          lastSeen: pattern.lastSeen
        });
      }
    });
    
    stats.topErrors.sort((a, b) => b.count - a.count);
    stats.topErrors = stats.topErrors.slice(0, 10);
    
    return stats;
  }

  /**
   * Clear error patterns (for testing or maintenance)
   */
  clearErrorPatterns() {
    this.errorPatterns.clear();
  }
}

// Create singleton instance
const errorHandler = new ErrorHandler();

export default errorHandler;