/**
 * Error Logging Service
 * Comprehensive error logging and storage system
 */

import { supabaseAdmin } from '../config/supabase.js';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs/promises';
import path from 'path';

class ErrorLoggingService {
  constructor() {
    this.logQueue = [];
    this.isProcessing = false;
    this.maxQueueSize = 1000;
    this.batchSize = 10;
    this.flushInterval = 5000; // 5 seconds
    
    this.logDirectory = path.join(process.cwd(), 'logs');
    this.ensureLogDirectory();
    this.startBatchProcessing();
  }

  /**
   * Ensure log directory exists
   */
  async ensureLogDirectory() {
    try {
      await fs.access(this.logDirectory);
    } catch {
      await fs.mkdir(this.logDirectory, { recursive: true });
    }
  }

  /**
   * Start batch processing of logs
   */
  startBatchProcessing() {
    setInterval(() => {
      if (this.logQueue.length > 0) {
        this.processBatch();
      }
    }, this.flushInterval);
  }

  /**
   * Log error to multiple destinations
   */
  async logError(errorInfo, context = {}) {
    const logEntry = this.createLogEntry(errorInfo, context);
    
    // Add to queue for batch processing
    this.addToQueue(logEntry);
    
    // For critical errors, log immediately
    if (errorInfo.severity === 'critical') {
      await this.logImmediately(logEntry);
    }
    
    return logEntry.id;
  }

  /**
   * Create standardized log entry
   */
  createLogEntry(errorInfo, context) {
    return {
      id: uuidv4(),
      timestamp: new Date().toISOString(),
      level: this.getLogLevel(errorInfo.severity),
      message: errorInfo.message,
      error: {
        name: errorInfo.name,
        message: errorInfo.message,
        stack: errorInfo.stack,
        code: errorInfo.code,
        statusCode: errorInfo.statusCode
      },
      context: {
        ...context,
        severity: errorInfo.severity,
        isOperational: errorInfo.isOperational,
        environment: process.env.NODE_ENV,
        nodeVersion: process.version,
        platform: process.platform,
        memory: process.memoryUsage(),
        uptime: process.uptime()
      },
      request: errorInfo.request || null,
      user: context.user || null,
      session: context.session || null,
      tags: this.generateTags(errorInfo, context)
    };
  }

  /**
   * Get log level from severity
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
   * Generate tags for categorization
   */
  generateTags(errorInfo, context) {
    const tags = [errorInfo.severity];
    
    if (errorInfo.name) tags.push(errorInfo.name.toLowerCase());
    if (errorInfo.code) tags.push(errorInfo.code.toLowerCase());
    if (context.component) tags.push(`component:${context.component}`);
    if (context.service) tags.push(`service:${context.service}`);
    if (errorInfo.request?.method) tags.push(`method:${errorInfo.request.method.toLowerCase()}`);
    
    return tags;
  }

  /**
   * Add log entry to queue
   */
  addToQueue(logEntry) {
    if (this.logQueue.length >= this.maxQueueSize) {
      // Remove oldest entries to make space
      this.logQueue.splice(0, this.batchSize);
    }
    
    this.logQueue.push(logEntry);
  }

  /**
   * Process batch of log entries
   */
  async processBatch() {
    if (this.isProcessing || this.logQueue.length === 0) return;
    
    this.isProcessing = true;
    
    try {
      const batch = this.logQueue.splice(0, this.batchSize);
      await Promise.all([
        this.logToDatabase(batch),
        this.logToFile(batch),
        this.logToConsole(batch)
      ]);
    } catch (error) {
      console.error('Error processing log batch:', error);
      // Put failed entries back in queue
      this.logQueue.unshift(...batch);
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Log immediately for critical errors
   */
  async logImmediately(logEntry) {
    try {
      await Promise.all([
        this.logToDatabase([logEntry]),
        this.logToFile([logEntry]),
        this.logToConsole([logEntry])
      ]);
    } catch (error) {
      console.error('Error logging critical error:', error);
    }
  }

  /**
   * Log to database
   */
  async logToDatabase(logEntries) {
    // Skip database logging if disabled
    if (process.env.SKIP_ERROR_LOGS_TABLE === 'true') {
      return;
    }

    try {
      const dbEntries = logEntries.map(entry => ({
        id: entry.id,
        timestamp: entry.timestamp,
        level: entry.level,
        message: entry.message,
        error_name: entry.error.name,
        error_message: entry.error.message,
        error_stack: entry.error.stack,
        error_code: entry.error.code,
        status_code: entry.error.statusCode,
        severity: entry.context.severity,
        is_operational: entry.context.isOperational,
        request_data: entry.request,
        user_data: entry.user,
        session_data: entry.session,
        context_data: entry.context,
        tags: entry.tags,
        environment: entry.context.environment
      }));

      const { error } = await supabaseAdmin
        .from('error_logs')
        .insert(dbEntries);

      if (error) {
        // Silent fail - don't spam console
      }
    } catch (error) {
      // Silent fail - don't spam console
    }
  }

  /**
   * Log to file
   */
  async logToFile(logEntries) {
    try {
      const date = new Date().toISOString().split('T')[0];
      const logFile = path.join(this.logDirectory, `error-${date}.log`);
      
      const logLines = logEntries.map(entry => 
        JSON.stringify(entry) + '\n'
      ).join('');
      
      await fs.appendFile(logFile, logLines);
    } catch (error) {
      console.error('File logging failed:', error);
    }
  }

  /**
   * Log to console
   */
  logToConsole(logEntries) {
    logEntries.forEach(entry => {
      const logMethod = entry.level === 'error' ? console.error :
                       entry.level === 'warn' ? console.warn :
                       console.log;
      
      if (process.env.NODE_ENV === 'development') {
        logMethod(`[${entry.timestamp}] ${entry.level.toUpperCase()}: ${entry.message}`);
        if (entry.error.stack) {
          console.error(entry.error.stack);
        }
      } else {
        logMethod(JSON.stringify({
          timestamp: entry.timestamp,
          level: entry.level,
          message: entry.message,
          errorId: entry.id,
          tags: entry.tags
        }));
      }
    });
  }

  /**
   * Query error logs
   */
  async queryLogs(filters = {}) {
    try {
      let query = supabaseAdmin
        .from('error_logs')
        .select('*')
        .order('timestamp', { ascending: false });

      // Apply filters
      if (filters.level) {
        query = query.eq('level', filters.level);
      }
      
      if (filters.severity) {
        query = query.eq('severity', filters.severity);
      }
      
      if (filters.errorName) {
        query = query.eq('error_name', filters.errorName);
      }
      
      if (filters.startDate) {
        query = query.gte('timestamp', filters.startDate);
      }
      
      if (filters.endDate) {
        query = query.lte('timestamp', filters.endDate);
      }
      
      if (filters.userId) {
        query = query.contains('user_data', { id: filters.userId });
      }
      
      if (filters.limit) {
        query = query.limit(filters.limit);
      }

      const { data, error } = await query;
      
      if (error) {
        throw error;
      }
      
      return data;
    } catch (error) {
      console.error('Error querying logs:', error);
      return [];
    }
  }

  /**
   * Get error statistics
   */
  async getErrorStats(timeWindow = '24 hours') {
    try {
      const startDate = new Date();
      
      switch (timeWindow) {
        case '1 hour':
          startDate.setHours(startDate.getHours() - 1);
          break;
        case '24 hours':
          startDate.setDate(startDate.getDate() - 1);
          break;
        case '7 days':
          startDate.setDate(startDate.getDate() - 7);
          break;
        case '30 days':
          startDate.setDate(startDate.getDate() - 30);
          break;
      }

      const { data, error } = await supabaseAdmin
        .from('error_logs')
        .select('level, severity, error_name, timestamp')
        .gte('timestamp', startDate.toISOString());

      if (error) {
        throw error;
      }

      const stats = {
        total: data.length,
        byLevel: {},
        bySeverity: {},
        byErrorName: {},
        timeline: {}
      };

      data.forEach(log => {
        // By level
        stats.byLevel[log.level] = (stats.byLevel[log.level] || 0) + 1;
        
        // By severity
        stats.bySeverity[log.severity] = (stats.bySeverity[log.severity] || 0) + 1;
        
        // By error name
        stats.byErrorName[log.error_name] = (stats.byErrorName[log.error_name] || 0) + 1;
        
        // Timeline (by hour)
        const hour = new Date(log.timestamp).toISOString().slice(0, 13);
        stats.timeline[hour] = (stats.timeline[hour] || 0) + 1;
      });

      return stats;
    } catch (error) {
      console.error('Error getting stats:', error);
      return {
        total: 0,
        byLevel: {},
        bySeverity: {},
        byErrorName: {},
        timeline: {}
      };
    }
  }

  /**
   * Clean up old logs
   */
  async cleanupOldLogs(retentionDays = 30) {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

      // Clean database logs
      const { error: dbError } = await supabaseAdmin
        .from('error_logs')
        .delete()
        .lt('timestamp', cutoffDate.toISOString());

      if (dbError) {
        console.error('Database cleanup error:', dbError);
      }

      // Clean file logs
      const files = await fs.readdir(this.logDirectory);
      const logFiles = files.filter(file => file.startsWith('error-') && file.endsWith('.log'));
      
      for (const file of logFiles) {
        const filePath = path.join(this.logDirectory, file);
        const stats = await fs.stat(filePath);
        
        if (stats.mtime < cutoffDate) {
          await fs.unlink(filePath);
          console.log(`Cleaned up old log file: ${file}`);
        }
      }
    } catch (error) {
      console.error('Error cleaning up logs:', error);
    }
  }

  /**
   * Export logs
   */
  async exportLogs(filters = {}, format = 'json') {
    try {
      const logs = await this.queryLogs(filters);
      
      if (format === 'csv') {
        return this.convertToCSV(logs);
      }
      
      return JSON.stringify(logs, null, 2);
    } catch (error) {
      console.error('Error exporting logs:', error);
      return null;
    }
  }

  /**
   * Convert logs to CSV format
   */
  convertToCSV(logs) {
    if (logs.length === 0) return '';
    
    const headers = [
      'timestamp', 'level', 'severity', 'error_name', 
      'error_message', 'status_code', 'is_operational'
    ];
    
    const csvRows = [headers.join(',')];
    
    logs.forEach(log => {
      const row = headers.map(header => {
        const value = log[header] || '';
        return `"${String(value).replace(/"/g, '""')}"`;
      });
      csvRows.push(row.join(','));
    });
    
    return csvRows.join('\n');
  }

  /**
   * Flush remaining logs (for graceful shutdown)
   */
  async flush() {
    if (this.logQueue.length > 0) {
      await this.processBatch();
    }
  }
}

// Create singleton instance
const errorLoggingService = new ErrorLoggingService();

export default errorLoggingService;