/**
 * Health Check Logger
 * Specialized logger for health check operations with clean, structured output
 */

import cleanLogger from '../config/cleanLogging.js';

class HealthLogger {
  constructor() {
    this.component = 'HEALTH-CHECK';
    this.verbose = process.env.HEALTH_CHECK_VERBOSE === 'true';
    this.suppressedErrors = new Set();
    this.silentMode = process.env.CLEAN_LOGS === 'true'; // Add silent mode
  }

  /**
   * Log health check startup
   */
  startup(message, data = null) {
    // Skip all startup messages in silent mode
    if (this.silentMode) return;
    
    if (this.verbose) {
      cleanLogger.info(this.component, `Startup: ${message}`, data);
    }
  }

  /**
   * Log critical health check failures
   */
  critical(checkName, message, data = null) {
    // Skip all critical messages in silent mode
    if (this.silentMode) return;
    
    // Only log critical failures once per check to avoid spam
    const errorKey = `${checkName}:${message}`;
    if (!this.suppressedErrors.has(errorKey)) {
      cleanLogger.critical(this.component, `Critical failure in ${checkName}: ${message}`, {
        ...data,
        check: checkName,
        severity: 'critical'
      });
      this.suppressedErrors.add(errorKey);
      
      // Clear suppression after 5 minutes
      setTimeout(() => {
        this.suppressedErrors.delete(errorKey);
      }, 5 * 60 * 1000);
    }
  }

  /**
   * Log health check warnings
   */
  warn(checkName, message, data = null) {
    if (this.verbose) {
      cleanLogger.warn(this.component, `Warning in ${checkName}: ${message}`, {
        ...data,
        check: checkName
      });
    }
  }

  /**
   * Log health check warnings (alias for warn)
   */
  warning(checkName, message, data = null) {
    this.warn(checkName, message, data);
  }

  /**
   * Log health check info
   */
  info(checkName, message, data = null) {
    if (this.verbose) {
      cleanLogger.info(this.component, `${checkName}: ${message}`, data);
    }
  }

  /**
   * Log health check debug info
   */
  debug(checkName, message, data = null) {
    if (this.verbose) {
      cleanLogger.debug(this.component, `${checkName}: ${message}`, data);
    }
  }

  /**
   * Log health check initialization
   */
  init(checkName, config = null) {
    if (this.verbose) {
      cleanLogger.debug(this.component, `Initializing ${checkName}`, config);
    }
  }

  /**
   * Log health check success
   */
  success(checkName, message, data = null) {
    if (this.verbose) {
      cleanLogger.info(this.component, `${checkName}: ${message}`, data);
    }
  }

  /**
   * Log health check recovery
   */
  recovery(checkName, message, data = null) {
    // Skip all recovery messages in silent mode
    if (this.silentMode) return;
    
    cleanLogger.info(this.component, `Recovery in ${checkName}: ${message}`, {
      ...data,
      check: checkName,
      event: 'recovery'
    });
  }

  /**
   * Log health check performance metrics
   */
  performance(checkName, duration, status, data = null) {
    if (this.verbose) {
      cleanLogger.debug(this.component, `${checkName} completed in ${duration}ms (${status})`, {
        ...data,
        check: checkName,
        duration_ms: duration,
        status
      });
    }
  }

  /**
   * Log database errors with context
   */
  databaseError(operation, error, context = {}) {
    if (this.verbose) {
      cleanLogger.error(this.component, `Database ${operation} failed: ${error.message}`, {
        ...context,
        operation,
        error: error.message
      });
    }
  }

  /**
   * Log service status changes
   */
  statusChange(from, to, reason = null, data = null) {
    // Skip all status changes in silent mode
    if (this.silentMode) return;
    
    const message = `Health status changed: ${from} → ${to}${reason ? ` (${reason})` : ''}`;
    const level = to === 'unhealthy' ? 'error' : to === 'degraded' ? 'warn' : 'info';
    
    if (level === 'error') {
      cleanLogger.error(this.component, message, { ...data, from_status: from, to_status: to, reason });
    } else if (level === 'warn') {
      cleanLogger.warn(this.component, message, { ...data, from_status: from, to_status: to, reason });
    } else {
      cleanLogger.info(this.component, message, { ...data, from_status: from, to_status: to, reason });
    }
  }

  /**
   * Log health check timeout
   */
  timeout(checkName, timeoutMs, data = null) {
    if (this.verbose) {
      cleanLogger.warn(this.component, `${checkName} timed out after ${timeoutMs}ms`, {
        ...data,
        check: checkName,
        timeout_ms: timeoutMs
      });
    }
  }

  /**
   * Log health check summary
   */
  summary(results, overallHealth) {
    // Skip all summaries in silent mode unless there are critical failures
    if (this.silentMode) {
      const criticalFailures = overallHealth.criticalFailures || 0;
      if (criticalFailures === 0) {
        return; // Skip logging if no critical failures in silent mode
      }
    }
    
    // Only log summary if there are issues or if verbose mode is enabled
    const criticalFailures = overallHealth.criticalFailures || 0;
    const warningFailures = overallHealth.warningFailures || 0;
    
    if (!this.verbose && criticalFailures === 0 && warningFailures === 0) {
      return; // Skip logging if everything is healthy and not in verbose mode
    }
    
    // Throttle warning summaries to once every 5 minutes
    if (warningFailures > 0 && criticalFailures === 0) {
      const now = Date.now();
      const lastWarningLog = this.lastWarningLog || 0;
      if (now - lastWarningLog < 5 * 60 * 1000) { // 5 minutes
        return; // Skip this warning summary
      }
      this.lastWarningLog = now;
    }
    
    const totalChecks = results.size;
    const healthyChecks = Array.from(results.values()).filter(r => r.healthy).length;
    
    const message = `Health Summary: ${healthyChecks}/${totalChecks} checks healthy` +
      (criticalFailures > 0 ? `, ${criticalFailures} critical failures` : '') +
      (warningFailures > 0 ? `, ${warningFailures} warnings` : '');
    
    const level = criticalFailures > 0 ? 'error' : warningFailures > 0 ? 'warn' : 'info';
    
    if (level === 'error') {
      cleanLogger.error(this.component, message, {
        healthy_checks: healthyChecks,
        total_checks: totalChecks,
        critical_failures: criticalFailures,
        warning_failures: warningFailures,
        overall_status: overallHealth.status
      });
    } else if (level === 'warn') {
      cleanLogger.warn(this.component, message, {
        healthy_checks: healthyChecks,
        total_checks: totalChecks,
        critical_failures: criticalFailures,
        warning_failures: warningFailures,
        overall_status: overallHealth.status
      });
    } else if (this.verbose) {
      cleanLogger.info(this.component, message, {
        healthy_checks: healthyChecks,
        total_checks: totalChecks,
        critical_failures: criticalFailures,
        warning_failures: warningFailures,
        overall_status: overallHealth.status
      });
    }
  }

  /**
   * Create a timer for health check operations
   */
  timer(checkName) {
    const startTime = Date.now();
    
    return {
      end: (status = 'completed', data = null) => {
        const duration = Date.now() - startTime;
        if (this.verbose) {
          this.performance(checkName, duration, status, data);
        }
        return duration;
      }
    };
  }
}

const healthLogger = new HealthLogger();
export default healthLogger;
