/**
 * Clean Logging Configuration
 * Provides clean, minimal console output for better UX
 * Supports request ID tracing for distributed logging
 */

import logger from './logging.js';

class CleanLogger {
  constructor() {
    this.isProduction = process.env.NODE_ENV === 'production';
    this.enableStartupMessage = process.env.ENABLE_STARTUP_MESSAGE !== 'false';
  }

  /**
   * Display clean startup message
   */
  startup() {
    if (!this.enableStartupMessage || this.isProduction) return;
    
    console.log('\x1b[35m🚀 SpecWeave Server\x1b[0m');
    console.log('\x1b[90mServer starting...\x1b[0m');
  }

  /**
   * Log info message with optional request ID
   */
  info(component, message, data = null, requestId = null) {
    logger.info(component, message, data, requestId);
  }

  /**
   * Log warning message with optional request ID
   */
  warn(component, message, data = null, requestId = null) {
    logger.warn(component, message, data, requestId);
  }

  /**
   * Log error message with optional request ID
   */
  error(component, message, data = null, requestId = null) {
    logger.error(component, message, data, requestId);
  }

  /**
   * Log debug message with optional request ID
   */
  debug(component, message, data = null, requestId = null) {
    logger.debug(component, message, data, requestId);
  }

  /**
   * Log critical error (always shown) with optional request ID
   */
  critical(component, message, data = null, requestId = null) {
    logger.critical(component, message, data, requestId);
  }

  /**
   * Log cache-related messages with optional request ID
   */
  cache(component, message, data = null, requestId = null) {
    logger.debug(component, message, data, requestId);
  }

  /**
   * Log ready message
   */
  ready() {
    if (!this.enableStartupMessage || this.isProduction) return;
    console.log('\x1b[32m✓ Server ready\x1b[0m');
  }

  /**
   * Clear console
   */
  clear() {
    if (!this.isProduction && process.env.CLEAR_CONSOLE !== 'false') {
      console.clear();
    }
  }
}

const cleanLogger = new CleanLogger();

export default cleanLogger;
