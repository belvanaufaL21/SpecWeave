/**
 * Clean Logger - Beautiful, structured logging for development
 */

class CleanLogger {
  constructor() {
    this.isCleanMode = process.env.LOG_LEVEL === 'ERROR' || process.env.CLEAN_LOGS === 'true';
    this.suppressedMessages = new Set();
    this.startTime = Date.now();
  }

  /**
   * Format timestamp
   */
  getTimestamp() {
    const now = new Date();
    return now.toLocaleTimeString('id-ID', { 
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  }

  /**
   * Get uptime string
   */
  getUptime() {
    const uptime = Date.now() - this.startTime;
    const seconds = Math.floor(uptime / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    
    if (hours > 0) {
      return `${hours}h ${minutes % 60}m`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    } else {
      return `${seconds}s`;
    }
  }

  /**
   * Success message with emoji
   */
  success(message, details = null) {
    if (this.isCleanMode) {
      console.log(`✅ ${message}`);
    } else {
      console.log(`[${this.getTimestamp()}] ✅ ${message}`, details || '');
    }
  }

  /**
   * Info message
   */
  info(message, details = null) {
    if (this.isCleanMode) {
      console.log(`ℹ️  ${message}`);
    } else {
      console.log(`[${this.getTimestamp()}] ℹ️  ${message}`, details || '');
    }
  }

  /**
   * Warning message (with suppression)
   */
  warn(message, details = null, suppressKey = null) {
    if (suppressKey && this.suppressedMessages.has(suppressKey)) {
      return; // Skip if already shown
    }

    if (this.isCleanMode) {
      console.warn(`⚠️  ${message}`);
    } else {
      console.warn(`[${this.getTimestamp()}] ⚠️  ${message}`, details || '');
    }

    if (suppressKey) {
      this.suppressedMessages.add(suppressKey);
      // Clear suppression after 5 minutes
      setTimeout(() => {
        this.suppressedMessages.delete(suppressKey);
      }, 5 * 60 * 1000);
    }
  }

  /**
   * Error message
   */
  error(message, details = null) {
    if (this.isCleanMode) {
      console.error(`❌ ${message}`);
    } else {
      console.error(`[${this.getTimestamp()}] ❌ ${message}`, details || '');
    }
  }

  /**
   * Server startup message
   */
  startup(port, environment = 'development') {
    console.log('');
    console.log('🚀 SpecWeave Server Started');
    console.log(`📍 Port: ${port}`);
    console.log(`🌐 URL: http://localhost:${port}`);
    if (environment === 'development') {
      console.log(`🔧 Environment: ${environment}`);
      console.log(`📊 Health: http://localhost:${port}/api/health`);
    }
    console.log(`⏱️  Started at: ${new Date().toLocaleString('id-ID')}`);
    console.log('');
  }

  /**
   * Service status message
   */
  service(name, status, details = null) {
    const statusEmoji = status === 'started' ? '🟢' : 
                       status === 'stopped' ? '🔴' : 
                       status === 'warning' ? '🟡' : '⚪';
    
    if (this.isCleanMode) {
      console.log(`${statusEmoji} ${name}: ${status}`);
    } else {
      console.log(`[${this.getTimestamp()}] ${statusEmoji} ${name}: ${status}`, details || '');
    }
  }

  /**
   * Database connection message
   */
  database(status, details = null) {
    if (status === 'connected') {
      this.success('Database connected');
    } else if (status === 'error') {
      this.error('Database connection failed', details);
    } else {
      this.info(`Database: ${status}`, details);
    }
  }

  /**
   * Cache status message
   */
  cache(type, status, details = null, suppressKey = null) {
    const cacheEmoji = type === 'redis' ? '🔴' : '💾';
    
    if (status === 'connected') {
      this.success(`${cacheEmoji} Cache: ${type} connected`);
    } else if (status === 'fallback') {
      // Format the message properly
      let message = `${cacheEmoji} Cache: Using ${type} (fallback)`;
      if (details && typeof details === 'string' && !details.includes('Redis error:')) {
        message = `${cacheEmoji} Cache: Using ${type} (${details})`;
      }
      this.warn(message, null, suppressKey);
    } else {
      this.info(`${cacheEmoji} Cache: ${type} ${status}`, details);
    }
  }

  /**
   * Health check message
   */
  health(status, details = null) {
    if (status === 'started') {
      this.service('Health Checks', 'started');
    } else if (status === 'warning') {
      // Only show health warnings in verbose mode
      if (!this.isCleanMode) {
        this.warn('Health check warning', details);
      }
    } else if (status === 'error') {
      this.error('Health check failed', details);
    }
  }

  /**
   * Monitoring service message
   */
  monitoring(status, details = null) {
    if (status === 'started') {
      this.service('Monitoring', 'started');
    } else if (status === 'error') {
      this.error('Monitoring service error', details);
    }
  }

  /**
   * Deprecation warning (suppressed)
   */
  deprecation(message) {
    // Suppress deprecation warnings in clean mode
    if (!this.isCleanMode) {
      console.warn(`[${this.getTimestamp()}] ⚠️  DEPRECATION: ${message}`);
    }
  }

  /**
   * Server ready message
   */
  ready() {
    console.log('🎉 Server is ready to accept connections!');
    console.log(`⏱️  Startup time: ${this.getUptime()}`);
    console.log('');
  }

  /**
   * Separator line
   */
  separator() {
    if (!this.isCleanMode) {
      console.log('─'.repeat(50));
    }
  }

  /**
   * Clear console (development only)
   */
  clear() {
    if (process.env.NODE_ENV === 'development' && this.isCleanMode) {
      console.clear();
    }
  }

  /**
   * Progress indicator
   */
  progress(message, step, total) {
    const percentage = Math.round((step / total) * 100);
    const progressBar = '█'.repeat(Math.floor(percentage / 10)) + '░'.repeat(10 - Math.floor(percentage / 10));
    
    if (this.isCleanMode) {
      console.log(`⏳ ${message} [${progressBar}] ${percentage}%`);
    } else {
      console.log(`[${this.getTimestamp()}] ⏳ ${message} [${progressBar}] ${percentage}% (${step}/${total})`);
    }
  }
}

// Create singleton instance
const cleanLogger = new CleanLogger();

export default cleanLogger;