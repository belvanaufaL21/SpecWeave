/**
 * Centralized logging utility for SpecWeave application
 * Provides controlled logging with environment-based filtering
 */

const LOG_LEVELS = {
  ERROR: 0,
  WARN: 1,
  INFO: 2,
  DEBUG: 3
};

class Logger {
  constructor() {
    // Set log level based on environment
    this.logLevel = this.getLogLevel();
    this.isDevelopment = process.env.NODE_ENV === 'development';
    this.isProduction = process.env.NODE_ENV === 'production';
  }

  getLogLevel() {
    // In production, only show errors and warnings
    if (process.env.NODE_ENV === 'production') {
      return LOG_LEVELS.WARN;
    }
    
    // In development, check for custom log level
    const customLevel = localStorage.getItem('specweave_log_level');
    if (customLevel && LOG_LEVELS[customLevel.toUpperCase()] !== undefined) {
      return LOG_LEVELS[customLevel.toUpperCase()];
    }
    
    // Default to INFO in development
    return LOG_LEVELS.INFO;
  }

  shouldLog(level) {
    return level <= this.logLevel;
  }

  formatMessage(component, message, data = null) {
    const timestamp = new Date().toLocaleTimeString();
    let formattedMessage = `[${timestamp}] [${component}] ${message}`;
    
    if (data && this.isDevelopment) {
      formattedMessage += ` ${JSON.stringify(data)}`;
    }
    
    return formattedMessage;
  }

  error(component, message, error = null) {
    if (this.shouldLog(LOG_LEVELS.ERROR)) {
      const formattedMessage = this.formatMessage(component, message);
      if (error) {
        console.error(formattedMessage, error);
      } else {
        console.error(formattedMessage);
      }
    }
  }

  warn(component, message, data = null) {
    if (this.shouldLog(LOG_LEVELS.WARN)) {
      const formattedMessage = this.formatMessage(component, message, data);
      console.warn(formattedMessage);
    }
  }

  info(component, message, data = null) {
    if (this.shouldLog(LOG_LEVELS.INFO)) {
      const formattedMessage = this.formatMessage(component, message, data);
      console.log(formattedMessage);
    }
  }

  debug(component, message, data = null) {
    if (this.shouldLog(LOG_LEVELS.DEBUG)) {
      const formattedMessage = this.formatMessage(component, message, data);
      console.log(formattedMessage);
    }
  }

  // Convenience methods for common operations
  success(component, message, data = null) {
    this.info(component, `✅ ${message}`, data);
  }

  loading(component, message, data = null) {
    this.debug(component, `🔄 ${message}`, data);
  }

  // Method to set log level dynamically
  setLogLevel(level) {
    if (LOG_LEVELS[level.toUpperCase()] !== undefined) {
      this.logLevel = LOG_LEVELS[level.toUpperCase()];
      localStorage.setItem('specweave_log_level', level.toUpperCase());
      this.info('LOGGER', `Log level set to ${level.toUpperCase()}`);
    }
  }

  // Method to disable all logging (for production)
  disable() {
    this.logLevel = -1;
  }

  // Method to enable minimal logging (errors and warnings only)
  minimal() {
    this.logLevel = LOG_LEVELS.WARN;
  }
}

// Create singleton instance
const logger = new Logger();

// Export both the instance and the class
export default logger;
export { Logger, LOG_LEVELS };

// Development helper - add to window for debugging
if (process.env.NODE_ENV === 'development') {
  window.specweaveLogger = logger;
  
  console.log('💡 Use logger.setLogLevel("ERROR"|"WARN"|"INFO"|"DEBUG") to control logging');
}