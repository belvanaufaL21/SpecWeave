/**
 * Logging Configuration
 * Centralized logging configuration for clean, structured logging
 * Outputs to stdout/stderr for Docker logging driver compatibility
 */

const LOG_LEVELS = {
  ERROR: 0,
  WARN: 1,
  INFO: 2,
  DEBUG: 3
};

const LOG_LEVEL = process.env.LOG_LEVEL || 'INFO';
const NODE_ENV = process.env.NODE_ENV || 'development';
const ENABLE_CONSOLE_LOGS = process.env.ENABLE_CONSOLE_LOGS !== 'false';

class Logger {
  constructor() {
    this.level = LOG_LEVELS[LOG_LEVEL.toUpperCase()] || LOG_LEVELS.INFO;
    this.enableConsole = ENABLE_CONSOLE_LOGS;
    this.isProduction = NODE_ENV === 'production';
  }

  shouldLog(level) {
    return LOG_LEVELS[level.toUpperCase()] <= this.level;
  }

  /**
   * Format message as structured JSON for production or plain text for development
   */
  formatMessage(level, component, message, data = null, requestId = null) {
    const timestamp = new Date().toISOString();
    
    if (this.isProduction) {
      // Structured JSON logging for production (Docker-friendly)
      const logEntry = {
        timestamp,
        level: level.toUpperCase(),
        component,
        message,
        ...(requestId && { requestId }),
        ...(data && { data }),
        environment: NODE_ENV
      };
      return JSON.stringify(logEntry);
    } else {
      // Human-readable format for development
      let formatted = `[${timestamp}] [${level.toUpperCase()}] ${component}: ${message}`;
      
      if (requestId) {
        formatted += ` [RequestID: ${requestId}]`;
      }
      
      if (data) {
        formatted += ` ${JSON.stringify(data)}`;
      }
      
      return formatted;
    }
  }

  error(component, message, data = null, requestId = null) {
    if (!this.shouldLog('ERROR')) return;
    
    if (this.enableConsole) {
      // Output to stderr for errors
      console.error(this.formatMessage('ERROR', component, message, data, requestId));
    }
  }

  warn(component, message, data = null, requestId = null) {
    if (!this.shouldLog('WARN')) return;
    
    if (this.enableConsole) {
      // Output to stderr for warnings
      console.warn(this.formatMessage('WARN', component, message, data, requestId));
    }
  }

  info(component, message, data = null, requestId = null) {
    if (!this.shouldLog('INFO')) return;
    
    if (this.enableConsole) {
      // Output to stdout for info
      console.log(this.formatMessage('INFO', component, message, data, requestId));
    }
  }

  debug(component, message, data = null, requestId = null) {
    if (!this.shouldLog('DEBUG')) return;
    
    if (this.enableConsole && !this.isProduction) {
      // Output to stdout for debug (only in development)
      console.log(this.formatMessage('DEBUG', component, message, data, requestId));
    }
  }

  // Special method for critical errors that should always be logged
  critical(component, message, data = null, requestId = null) {
    const formatted = this.formatMessage('CRITICAL', component, message, data, requestId);
    // Always output to stderr for critical errors
    console.error(formatted);
  }
}

const logger = new Logger();

export default logger;