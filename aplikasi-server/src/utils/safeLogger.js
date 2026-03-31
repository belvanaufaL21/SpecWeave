/**
 * Safe Logger Utility
 * Provides secure logging functionality that prevents exposure of sensitive data
 * Implements Requirements 8.2 - Safe logging without exposing sensitive data
 */
class SafeLogger {
  constructor() {
    this.sensitivePatterns = [
      // API tokens and authentication
      /Bearer\s+[A-Za-z0-9\-._~+/]+=*/g,
      /token["\s]*[:=]["\s]*[A-Za-z0-9\-._~+/]+=*/gi,
      /access_token["\s]*[:=]["\s]*[A-Za-z0-9\-._~+/]+=*/gi,
      /refresh_token["\s]*[:=]["\s]*[A-Za-z0-9\-._~+/]+=*/gi,
      
      // API keys and secrets
      /key["\s]*[:=]["\s]*[A-Za-z0-9\-._~+/]+=*/gi,
      /secret["\s]*[:=]["\s]*[A-Za-z0-9\-._~+/]+=*/gi,
      /api_key["\s]*[:=]["\s]*[A-Za-z0-9\-._~+/]+=*/gi,
      /client_secret["\s]*[:=]["\s]*[A-Za-z0-9\-._~+/]+=*/gi,
      
      // Passwords and credentials
      /password["\s]*[:=]["\s]*[^\s"]+/gi,
      /passwd["\s]*[:=]["\s]*[^\s"]+/gi,
      /credential["\s]*[:=]["\s]*[^\s"]+/gi,
      
      // Authorization headers
      /authorization["\s]*[:=]["\s]*[^\s"]+/gi,
      /cookie["\s]*[:=]["\s]*[^\s"]+/gi,
      
      // Database connection strings
      /postgres:\/\/[^@]+:[^@]+@/gi,
      /mysql:\/\/[^@]+:[^@]+@/gi,
      /mongodb:\/\/[^@]+:[^@]+@/gi,
      
      // URLs with sensitive query parameters
      /([?&])(token|key|secret|password|auth)=([^&\s]+)/gi,
      
      // Email addresses (partial masking)
      /([a-zA-Z0-9._%+-]+)@([a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g,
      
      // IP addresses (partial masking for internal IPs)
      /\b(10\.|172\.(1[6-9]|2[0-9]|3[01])\.|192\.168\.)\d{1,3}\.\d{1,3}\b/g,
      
      // Credit card numbers
      /\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/g,
      
      // Social security numbers
      /\b\d{3}-\d{2}-\d{4}\b/g,
    ];

    this.sensitiveKeys = [
      'token', 'access_token', 'refresh_token', 'id_token',
      'key', 'api_key', 'secret', 'client_secret', 'private_key',
      'password', 'passwd', 'pwd', 'pass',
      'authorization', 'auth', 'cookie', 'session',
      'credential', 'cred', 'cert', 'certificate',
      'signature', 'hash', 'salt'
    ];

    this.logLevels = {
      ERROR: 0,
      WARN: 1,
      INFO: 2,
      DEBUG: 3
    };

    this.currentLogLevel = this.getLogLevel();
  }

  /**
   * Get current log level from environment
   * @returns {number} Log level
   */
  getLogLevel() {
    const level = process.env.LOG_LEVEL?.toUpperCase() || 'INFO';
    return this.logLevels[level] ?? this.logLevels.INFO;
  }

  /**
   * Sanitize any value to remove sensitive information
   * @param {any} value - Value to sanitize
   * @returns {any} Sanitized value
   */
  sanitize(value) {
    if (value === null || value === undefined) {
      return value;
    }

    if (typeof value === 'string') {
      return this.sanitizeString(value);
    }

    if (typeof value === 'object') {
      return this.sanitizeObject(value);
    }

    if (Array.isArray(value)) {
      return value.map(item => this.sanitize(item));
    }

    return value;
  }

  /**
   * Sanitize string content
   * @param {string} str - String to sanitize
   * @returns {string} Sanitized string
   */
  sanitizeString(str) {
    let sanitized = str;

    // Apply all sensitive patterns
    this.sensitivePatterns.forEach(pattern => {
      sanitized = sanitized.replace(pattern, (match) => {
        if (match.includes('Bearer')) {
          return 'Bearer [REDACTED]';
        }
        if (match.includes('=')) {
          const [key] = match.split('=');
          return `${key}=[REDACTED]`;
        }
        if (match.includes('@')) {
          // Email masking: show first 2 chars and domain
          const [local, domain] = match.split('@');
          return `${local.substring(0, 2)}***@${domain}`;
        }
        if (match.includes('.')) {
          // IP masking: show first two octets
          const parts = match.split('.');
          return `${parts[0]}.${parts[1]}.***.***.`;
        }
        return '[REDACTED]';
      });
    });

    return sanitized;
  }

  /**
   * Sanitize object properties
   * @param {Object} obj - Object to sanitize
   * @returns {Object} Sanitized object
   */
  sanitizeObject(obj) {
    if (obj instanceof Error) {
      return this.sanitizeError(obj);
    }

    if (obj instanceof Date) {
      return obj;
    }

    const sanitized = {};

    for (const [key, value] of Object.entries(obj)) {
      const lowerKey = key.toLowerCase();
      
      // Check if key is sensitive
      if (this.sensitiveKeys.some(sensitiveKey => lowerKey.includes(sensitiveKey))) {
        sanitized[key] = '[REDACTED]';
      } else {
        sanitized[key] = this.sanitize(value);
      }
    }

    return sanitized;
  }

  /**
   * Sanitize error objects
   * @param {Error} error - Error to sanitize
   * @returns {Object} Sanitized error object
   */
  sanitizeError(error) {
    return {
      name: error.name,
      message: this.sanitizeString(error.message || ''),
      code: error.code,
      status: error.status || error.statusCode,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    };
  }

  /**
   * Create log entry with metadata
   * @param {string} level - Log level
   * @param {string} message - Log message
   * @param {any} data - Additional data
   * @param {Object} metadata - Log metadata
   * @returns {Object} Log entry
   */
  createLogEntry(level, message, data = null, metadata = {}) {
    return {
      timestamp: new Date().toISOString(),
      level: level.toUpperCase(),
      message: this.sanitizeString(message),
      data: data ? this.sanitize(data) : null,
      metadata: this.sanitize(metadata),
      environment: process.env.NODE_ENV || 'development',
      service: 'jira-service'
    };
  }

  /**
   * Check if log level should be output
   * @param {string} level - Log level to check
   * @returns {boolean} True if should log
   */
  shouldLog(level) {
    const levelValue = this.logLevels[level.toUpperCase()];
    return levelValue !== undefined && levelValue <= this.currentLogLevel;
  }

  /**
   * Format log entry for console output
   * @param {Object} logEntry - Log entry to format
   * @returns {string} Formatted log message
   */
  formatForConsole(logEntry) {
    const { timestamp, level, message, data, metadata } = logEntry;
    const time = new Date(timestamp).toLocaleTimeString();
    
    let formatted = `[${time}] ${this.getLevelIcon(level)} ${message}`;
    
    if (data) {
      formatted += `\n   Data: ${JSON.stringify(data, null, 2)}`;
    }
    
    if (metadata && Object.keys(metadata).length > 0) {
      formatted += `\n   Meta: ${JSON.stringify(metadata, null, 2)}`;
    }
    
    return formatted;
  }

  /**
   * Get icon for log level
   * @param {string} level - Log level
   * @returns {string} Level icon
   */
  getLevelIcon(level) {
    switch (level.toUpperCase()) {
      case 'ERROR': return '❌';
      case 'WARN': return '⚠️';
      case 'INFO': return 'ℹ️';
      case 'DEBUG': return '🔍';
      default: return '📝';
    }
  }

  /**
   * Log error message
   * @param {string} message - Error message
   * @param {any} data - Additional data
   * @param {Object} metadata - Log metadata
   */
  error(message, data = null, metadata = {}) {
    if (!this.shouldLog('ERROR')) return;
    
    const logEntry = this.createLogEntry('ERROR', message, data, metadata);
    console.error(this.formatForConsole(logEntry));
  }

  /**
   * Log warning message
   * @param {string} message - Warning message
   * @param {any} data - Additional data
   * @param {Object} metadata - Log metadata
   */
  warn(message, data = null, metadata = {}) {
    if (!this.shouldLog('WARN')) return;
    
    const logEntry = this.createLogEntry('WARN', message, data, metadata);
    console.warn(this.formatForConsole(logEntry));
  }

  /**
   * Log info message
   * @param {string} message - Info message
   * @param {any} data - Additional data
   * @param {Object} metadata - Log metadata
   */
  info(message, data = null, metadata = {}) {
    if (!this.shouldLog('INFO')) return;
    
    const logEntry = this.createLogEntry('INFO', message, data, metadata);
    console.log(this.formatForConsole(logEntry));
  }

  /**
   * Log debug message
   * @param {string} message - Debug message
   * @param {any} data - Additional data
   * @param {Object} metadata - Log metadata
   */
  debug(message, data = null, metadata = {}) {
    if (!this.shouldLog('DEBUG')) return;
    
    const logEntry = this.createLogEntry('DEBUG', message, data, metadata);
    console.log(this.formatForConsole(logEntry));
  }

  /**
   * Log security events with enhanced metadata
   * @param {string} event - Security event type
   * @param {string} message - Event message
   * @param {Object} data - Event data
   * @param {string} level - Log level (default: 'warn')
   */
  securityEvent(event, message, data = {}, level = 'warn') {
    const metadata = {
      event: `security_${event}`,
      component: 'security-service',
      security: true,
      timestamp: Date.now()
    };

    this[level](`[SECURITY] ${message}`, data, metadata);
  }

  /**
   * Log performance events
   * @param {string} operation - Operation name
   * @param {number} duration - Duration in milliseconds
   * @param {Object} data - Additional data
   */
  performance(operation, duration, data = {}) {
    const metadata = {
      event: 'performance',
      operation,
      duration_ms: duration,
      component: 'performance-service'
    };

    this.info(`[PERFORMANCE] ${operation} completed in ${duration}ms`, data, metadata);
  }

  /**
   * Create a timer for performance logging
   * @param {string} operation - Operation name
   * @returns {Function} Timer function to call when operation completes
   */
  timer(operation) {
    const start = Date.now();
    
    return (data = {}) => {
      const duration = Date.now() - start;
      this.performance(operation, duration, data);
      return duration;
    };
  }

  /**
   * Silent logging - only to structured logs, no console output
   * @param {string} level - Log level
   * @param {string} component - Component name
   * @param {string} message - Log message
   * @param {any} data - Additional data
   */
  silent(level, component, message, data = {}) {
    if (!this.shouldLog(level)) return;
    
    const logEntry = this.createLogEntry(level, message, data, { component });
    
    // Only store structured log, no console output
    // This would typically go to your log aggregation system
    // For now, we'll just ensure it doesn't go to console
  }
}

// Create singleton instance
const safeLogger = new SafeLogger();

export default safeLogger;