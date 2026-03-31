/**
 * Frontend Logging Configuration
 * Centralized logging configuration for clean, structured logging
 */

const LOG_LEVELS = {
  NONE: -1,
  ERROR: 0,
  WARN: 1,
  INFO: 2,
  DEBUG: 3
};

const LOG_LEVEL = import.meta.env.VITE_LOG_LEVEL || 'INFO';
const NODE_ENV = import.meta.env.MODE || 'development';
const ENABLE_CONSOLE_LOGS = import.meta.env.VITE_ENABLE_CONSOLE_LOGS !== 'false';

class Logger {
  constructor() {
    this.level = LOG_LEVELS[LOG_LEVEL.toUpperCase()] ?? LOG_LEVELS.INFO;
    this.enableConsole = ENABLE_CONSOLE_LOGS;
    this.isProduction = NODE_ENV === 'production';
  }

  shouldLog(level) {
    // If log level is NONE, don't log anything except critical
    if (this.level === LOG_LEVELS.NONE) return false;
    return LOG_LEVELS[level.toUpperCase()] <= this.level;
  }

  formatMessage(level, component, message, data = null) {
    const timestamp = new Date().toISOString();
    let formatted = `[${timestamp}] [${level.toUpperCase()}] ${component}: ${message}`;
    
    if (data && !this.isProduction) {
      formatted += ` ${JSON.stringify(data)}`;
    }
    
    return formatted;
  }

  error(component, message, data = null) {
    if (!this.shouldLog('ERROR')) return;
    
    if (this.enableConsole) {
      console.error(this.formatMessage('ERROR', component, message, data));
    }
  }

  warn(component, message, data = null) {
    if (!this.shouldLog('WARN')) return;
    
    if (this.enableConsole) {
      console.warn(this.formatMessage('WARN', component, message, data));
    }
  }

  info(component, message, data = null) {
    if (!this.shouldLog('INFO')) return;
    
    if (this.enableConsole && !this.isProduction) {
      console.log(this.formatMessage('INFO', component, message, data));
    }
  }

  debug(component, message, data = null) {
    if (!this.shouldLog('DEBUG')) return;
    
    if (this.enableConsole && !this.isProduction) {
      console.log(this.formatMessage('DEBUG', component, message, data));
    }
  }

  // Special method for critical errors that should always be logged
  critical(component, message, data = null) {
    const formatted = this.formatMessage('CRITICAL', component, message, data);
    console.error(formatted);
  }
}

const logger = new Logger();

export default logger;