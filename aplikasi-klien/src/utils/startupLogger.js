/**
 * Startup Logger - Clean application startup logging
 * Only logs critical errors, suppresses all success messages
 */

import cleanLogger from '../config/cleanLogging.js';

class StartupLogger {
  constructor() {
    this.startTime = Date.now();
    this.components = new Map();
  }

  // Track component initialization silently
  componentStarted(name, status = 'success') {
    this.components.set(name, { status, timestamp: Date.now() });
    // Only log failures
    if (status === 'failed') {
      cleanLogger.componentInit(name, status);
    }
  }

  // Log application ready
  applicationReady() {
    cleanLogger.ready();
  }

  // Log critical startup errors only
  criticalError(component, error) {
    cleanLogger.error('STARTUP', `Critical error in ${component}`, error);
  }

  // Suppress non-critical warnings during startup (no logging)
  suppressWarning(component, message) {
    // Completely silent - don't even log at debug level
    // Only track internally if needed for diagnostics
  }
}

const startupLogger = new StartupLogger();

export default startupLogger;