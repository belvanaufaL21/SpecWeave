import { supabaseAdmin } from '../config/supabase.js';
import cacheService from './cacheService.js';
import databaseRecoveryService from './databaseRecoveryService.js';
import queryOptimizer from '../database/optimizations/queryOptimizer.js';
import bulkProcessor from '../database/optimizations/bulkProcessor.js';
import dataValidator from '../database/validators/dataValidator.js';
import databaseErrorHandler from '../database/handlers/errorHandler.js';

/**
 * Database Service
 * Provides optimized database operations with connection pooling, caching, and recovery
 */
class DatabaseService {
  constructor() {
    this.cache = cacheService;
    this.recovery = databaseRecoveryService;
    this.validator = dataValidator;
    this.errorHandler = databaseErrorHandler;
    this.queryTimeout = 30000; // 30 seconds
    this.connectionPool = {
      maxConnections: 20,
      idleTimeout: 30000,
      connectionTimeout: 5000
    };
    
    // Performance monitoring
    this.queryMetrics = {
      totalQueries: 0,
      slowQueries: 0,
      failedQueries: 0,
      averageResponseTime: 0,
      responseTimeSum: 0
    };
  }

  /**
   * Get database client with recovery
   */
  async getClient(useAdmin = true) {
    return useAdmin 
      ? await this.recovery.getAdminClient()
      : await this.recovery.getAnonClient();
  }

  /**
   * Execute optimized query with caching, monitoring, and recovery
   * @param {string} table - Table name
   * @param {Object} options - Query options
   * @returns {Promise<Object>} Query result
   */
  async executeQuery(table, options = {}) {
    const startTime = Date.now();
    const queryId = `${table}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    return this.recovery.executeWithRecovery(async () => {
      try {
        // Check cache first if caching is enabled
        if (options.cache && options.cacheKey) {
          const cached = await this.cache.get(options.cacheKey);
          if (cached) {
            console.log(`📦 Cache hit for ${options.cacheKey}`);
            return { data: cached, fromCache: true };
          }
        }

        // Use query optimizer for better performance
        const optimizedQuery = queryOptimizer.optimizeSelect(table, options);
        
        // Execute query with timeout
        const { data, error, count } = await Promise.race([
          optimizedQuery,
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Query timeout')), this.queryTimeout)
          )
        ]);

        if (error) {
          throw error;
        }

        // Cache result if caching is enabled
        if (options.cache && options.cacheKey && data) {
          await this.cache.set(options.cacheKey, data, options.cacheTTL || 300);
        }

        // Record metrics
        const duration = Date.now() - startTime;
        this.recordQueryMetrics(duration, true);

        console.log(`🔍 Query executed: ${table} (${duration}ms)`);
        
        return { data, count, fromCache: false };
        
      } catch (error) {
        const duration = Date.now() - startTime;
        this.recordQueryMetrics(duration, false);
        
        // Handle error with comprehensive error handler
        const errorResult = this.errorHandler.handleError(error, {
          operation: 'select',
          table,
          options,
          duration
        });
        
        console.error(`❌ Query failed: ${table} (${duration}ms)`, errorResult.error);
        
        // Throw enhanced error
        const enhancedError = new Error(errorResult.error.userMessage);
        enhancedError.originalError = error;
        enhancedError.errorDetails = errorResult;
        throw enhancedError;
      }
    }, {
      type: 'select',
      table: table
    });
  }

  /**
   * Execute optimized insert operation with recovery and validation
   * @param {string} table - Table name
   * @param {Object|Array} data - Data to insert
   * @param {Object} options - Insert options
   * @returns {Promise<Object>} Insert result
   */
  async insert(table, data, options = {}) {
    const startTime = Date.now();
    
    return this.recovery.executeWithRecovery(async () => {
      try {
        // Validate data before insertion
        let validatedData = data;
        if (options.validate !== false) {
          const validationResult = Array.isArray(data) 
            ? this.validator.validateBulkData(data, table, options.validationOptions)
            : this.validator.validateData(data, table, options.validationOptions);
          
          if (!validationResult.isValid) {
            const error = new Error(`Data validation failed: ${validationResult.errors.join(', ')}`);
            error.validationErrors = validationResult.errors;
            error.validationWarnings = validationResult.warnings;
            throw error;
          }
          
          validatedData = Array.isArray(data) 
            ? validationResult.sanitizedData 
            : validationResult.sanitizedData;
          
          // Log validation warnings
          if (validationResult.warnings.length > 0) {
            console.warn(`⚠️ Data validation warnings for ${table}:`, validationResult.warnings);
          }
        }

        // Get database client
        const client = await this.getClient(options.useAdmin !== false);
        
        let query = client.from(table).insert(validatedData);
        
        if (options.select) {
          query = query.select(options.select);
        }
        
        if (options.single && !Array.isArray(validatedData)) {
          query = query.single();
        }

        const { data: result, error } = await query;
        
        if (error) {
          throw error;
        }

        // Invalidate related cache entries
        if (options.invalidateCache) {
          await this.invalidateCache(options.invalidateCache);
        }

        const duration = Date.now() - startTime;
        this.recordQueryMetrics(duration, true);
        
        console.log(`✅ Insert completed: ${table} (${duration}ms)`);
        return { data: result };
        
      } catch (error) {
        const duration = Date.now() - startTime;
        this.recordQueryMetrics(duration, false);
        
        // Handle error with comprehensive error handler
        const errorResult = this.errorHandler.handleError(error, {
          operation: 'insert',
          table,
          dataSize: Array.isArray(data) ? data.length : 1,
          duration
        });
        
        console.error(`❌ Insert failed: ${table} (${duration}ms)`, errorResult.error);
        
        // Throw enhanced error
        const enhancedError = new Error(errorResult.error.userMessage);
        enhancedError.originalError = error;
        enhancedError.errorDetails = errorResult;
        throw enhancedError;
      }
    }, {
      type: 'insert',
      table: table
    });
  }

  /**
   * Execute optimized update operation with recovery and validation
   * @param {string} table - Table name
   * @param {Object} data - Data to update
   * @param {Object} options - Update options
   * @returns {Promise<Object>} Update result
   */
  async update(table, data, options = {}) {
    const startTime = Date.now();
    
    return this.recovery.executeWithRecovery(async () => {
      try {
        // Validate data before update
        let validatedData = data;
        if (options.validate !== false) {
          const validationResult = this.validator.validateData(data, table, {
            ...options.validationOptions,
            allowPartialUpdate: true
          });
          
          if (!validationResult.isValid) {
            const error = new Error(`Data validation failed: ${validationResult.errors.join(', ')}`);
            error.validationErrors = validationResult.errors;
            error.validationWarnings = validationResult.warnings;
            throw error;
          }
          
          validatedData = validationResult.sanitizedData;
          
          // Log validation warnings
          if (validationResult.warnings.length > 0) {
            console.warn(`⚠️ Data validation warnings for ${table}:`, validationResult.warnings);
          }
        }

        // Get database client
        const client = await this.getClient(options.useAdmin !== false);
        
        let query = client.from(table).update(validatedData);
        
        // Apply filters for update
        if (options.filters) {
          options.filters.forEach(filter => {
            query = query.eq(filter.column, filter.value);
          });
        }
        
        if (options.select) {
          query = query.select(options.select);
        }
        
        if (options.single) {
          query = query.single();
        }

        const { data: result, error } = await query;
        
        if (error) {
          throw error;
        }

        // Invalidate related cache entries
        if (options.invalidateCache) {
          await this.invalidateCache(options.invalidateCache);
        }

        const duration = Date.now() - startTime;
        this.recordQueryMetrics(duration, true);
        
        console.log(`🔄 Update completed: ${table} (${duration}ms)`);
        return { data: result };
        
      } catch (error) {
        const duration = Date.now() - startTime;
        this.recordQueryMetrics(duration, false);
        
        // Handle error with comprehensive error handler
        const errorResult = this.errorHandler.handleError(error, {
          operation: 'update',
          table,
          filters: options.filters,
          duration
        });
        
        console.error(`❌ Update failed: ${table} (${duration}ms)`, errorResult.error);
        
        // Throw enhanced error
        const enhancedError = new Error(errorResult.error.userMessage);
        enhancedError.originalError = error;
        enhancedError.errorDetails = errorResult;
        throw enhancedError;
      }
    }, {
      type: 'update',
      table: table
    });
  }

  /**
   * Execute optimized delete operation with recovery
   * @param {string} table - Table name
   * @param {Object} options - Delete options
   * @returns {Promise<Object>} Delete result
   */
  async delete(table, options = {}) {
    const startTime = Date.now();
    
    return this.recovery.executeWithRecovery(async () => {
      try {
        // Get database client
        const client = await this.getClient(options.useAdmin !== false);
        
        let query = client.from(table).delete();
        
        // Apply filters for delete
        if (options.filters) {
          options.filters.forEach(filter => {
            query = query.eq(filter.column, filter.value);
          });
        }
        
        if (options.select) {
          query = query.select(options.select);
        }

        const { data: result, error } = await query;
        
        if (error) {
          throw error;
        }

        // Invalidate related cache entries
        if (options.invalidateCache) {
          await this.invalidateCache(options.invalidateCache);
        }

        const duration = Date.now() - startTime;
        this.recordQueryMetrics(duration, true);
        
        console.log(`🗑️ Delete completed: ${table} (${duration}ms)`);
        return { data: result };
        
      } catch (error) {
        const duration = Date.now() - startTime;
        this.recordQueryMetrics(duration, false);
        
        console.error(`❌ Delete failed: ${table} (${duration}ms)`, error);
        throw new Error(`Database delete failed: ${error.message}`);
      }
    }, {
      type: 'delete',
      table: table
    });
  }

  /**
   * Execute batch operations with transaction support and recovery
   * @param {Array} operations - Array of operations
   * @returns {Promise<Array>} Results array
   */
  async batch(operations) {
    const startTime = Date.now();
    
    return this.recovery.executeWithRecovery(async () => {
      const results = [];
      
      try {
        // Execute operations in sequence for now
        // TODO: Implement proper transaction support when available
        for (const operation of operations) {
          let result;
          
          switch (operation.type) {
            case 'insert':
              result = await this.insert(operation.table, operation.data, operation.options);
              break;
            case 'update':
              result = await this.update(operation.table, operation.data, operation.options);
              break;
            case 'delete':
              result = await this.delete(operation.table, operation.options);
              break;
            case 'select':
              result = await this.executeQuery(operation.table, operation.options);
              break;
            default:
              throw new Error(`Unknown operation type: ${operation.type}`);
          }
          
          results.push(result);
        }

        const duration = Date.now() - startTime;
        console.log(`📦 Batch operation completed: ${operations.length} operations (${duration}ms)`);
        
        return results;
        
      } catch (error) {
        const duration = Date.now() - startTime;
        console.error(`❌ Batch operation failed (${duration}ms)`, error);
        throw new Error(`Batch operation failed: ${error.message}`);
      }
    }, {
      type: 'batch',
      table: 'multiple'
    });
  }

  /**
   * Execute bulk operations using optimized bulk processor
   * @param {string} operation - Operation type ('insert', 'update', 'delete')
   * @param {string} table - Table name
   * @param {Array} data - Data array
   * @param {Object} options - Operation options
   * @returns {Promise<Object>} Bulk operation results
   */
  async bulkOperation(operation, table, data, options = {}) {
    const startTime = Date.now();
    
    try {
      let result;
      
      switch (operation) {
        case 'insert':
          if (table === 'test_results') {
            result = await bulkProcessor.processBulkTestResults(data, options);
          } else if (table === 'test_scenario_references') {
            result = await bulkProcessor.processBulkScenarioReferences(data, options);
          } else {
            result = await queryOptimizer.bulkInsert(table, data, options);
          }
          break;
          
        case 'update':
          if (table === 'test_results') {
            result = await bulkProcessor.processBulkTestResultUpdates(data, options);
          } else {
            result = await queryOptimizer.bulkUpdate(table, data, options);
          }
          break;
          
        case 'delete':
          if (table === 'test_results' && options.userId) {
            result = await bulkProcessor.processBulkTestResultDeletion(data, options.userId, options);
          } else {
            result = await queryOptimizer.bulkDelete(table, data, options);
          }
          break;
          
        default:
          throw new Error(`Unknown bulk operation: ${operation}`);
      }
      
      const duration = Date.now() - startTime;
      console.log(`🚀 Bulk ${operation} completed: ${table} (${duration}ms)`);
      
      return result;
      
    } catch (error) {
      const duration = Date.now() - startTime;
      console.error(`❌ Bulk ${operation} failed: ${table} (${duration}ms)`, error);
      throw error;
    }
  }

  /**
   * Execute data migration with optimized processing
   * @param {Object} migrationConfig - Migration configuration
   * @returns {Promise<Object>} Migration results
   */
  async migrateData(migrationConfig) {
    return await bulkProcessor.processDataMigration(migrationConfig);
  }

  /**
   * Execute bulk data export
   * @param {string} table - Table name
   * @param {Object} exportConfig - Export configuration
   * @returns {Promise<Array>} Exported data
   */
  async exportData(table, exportConfig = {}) {
    return await bulkProcessor.processBulkExport(table, exportConfig);
  }

  /**
   * Invalidate cache entries by pattern
   * @param {Array<string>} patterns - Cache key patterns to invalidate
   */
  async invalidateCache(patterns) {
    try {
      for (const pattern of patterns) {
        await this.cache.del(pattern);
      }
      console.log(`🧹 Cache invalidated: ${patterns.join(', ')}`);
    } catch (error) {
      console.error('Cache invalidation error:', error);
    }
  }

  /**
   * Record query performance metrics
   * @param {number} duration - Query duration in ms
   * @param {boolean} success - Whether query succeeded
   */
  recordQueryMetrics(duration, success) {
    this.queryMetrics.totalQueries++;
    this.queryMetrics.responseTimeSum += duration;
    this.queryMetrics.averageResponseTime = this.queryMetrics.responseTimeSum / this.queryMetrics.totalQueries;
    
    if (duration > 1000) { // Slow query threshold: 1 second
      this.queryMetrics.slowQueries++;
      console.warn(`🐌 Slow query detected: ${duration}ms`);
    }
    
    if (!success) {
      this.queryMetrics.failedQueries++;
    }
  }

  /**
   * Get database performance metrics including recovery status
   * @returns {Object} Performance metrics
   */
  getMetrics() {
    const recoveryStatus = this.recovery.getStatus();
    const optimizerMetrics = queryOptimizer.getMetrics();
    const bulkProcessorMetrics = bulkProcessor.getMetrics();
    const errorStatistics = this.errorHandler.getStatistics();
    
    return {
      database: {
        ...this.queryMetrics,
        successRate: this.queryMetrics.totalQueries > 0 
          ? ((this.queryMetrics.totalQueries - this.queryMetrics.failedQueries) / this.queryMetrics.totalQueries) * 100 
          : 0,
        slowQueryRate: this.queryMetrics.totalQueries > 0 
          ? (this.queryMetrics.slowQueries / this.queryMetrics.totalQueries) * 100 
          : 0
      },
      optimizer: optimizerMetrics,
      bulkProcessor: bulkProcessorMetrics,
      errorHandling: errorStatistics,
      recovery: recoveryStatus,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Graceful shutdown
   */
  async shutdown() {
    console.log('🔌 Shutting down database service...');
    
    // Shutdown recovery service
    await this.recovery.shutdown();
    
    console.log('✅ Database service shutdown complete');
  }

  /**
   * Test database connection and performance with recovery
   * @returns {Promise<Object>} Connection test result
   */
  async testConnection() {
    const startTime = Date.now();
    
    try {
      const client = await this.getClient();
      
      const { data, error } = await client
        .from('profiles')
        .select('count')
        .limit(1);
      
      if (error) {
        throw error;
      }
      
      const duration = Date.now() - startTime;
      
      return {
        success: true,
        responseTime: duration,
        message: 'Database connection successful',
        recovery: this.recovery.getStatus(),
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      
      return {
        success: false,
        responseTime: duration,
        message: 'Database connection failed',
        error: error.message,
        recovery: this.recovery.getStatus(),
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Optimize database queries by analyzing slow queries
   * @returns {Promise<Object>} Optimization recommendations
   */
  async analyzePerformance() {
    const metrics = this.getMetrics();
    const recommendations = [];
    
    if (metrics.slowQueryRate > 10) {
      recommendations.push({
        type: 'performance',
        priority: 'high',
        message: 'High slow query rate detected. Consider adding database indexes.',
        action: 'add_indexes'
      });
    }
    
    if (metrics.averageResponseTime > 500) {
      recommendations.push({
        type: 'performance',
        priority: 'medium',
        message: 'Average response time is high. Consider query optimization.',
        action: 'optimize_queries'
      });
    }
    
    if (metrics.successRate < 95) {
      recommendations.push({
        type: 'reliability',
        priority: 'high',
        message: 'Low success rate detected. Check database connectivity and error handling.',
        action: 'improve_reliability'
      });
    }
    
    // Recovery-specific recommendations
    if (!metrics.recovery.isConnected) {
      recommendations.push({
        type: 'connectivity',
        priority: 'critical',
        message: 'Database connection is down. Recovery mechanisms are active.',
        action: 'check_connection'
      });
    }
    
    if (metrics.recovery.circuitBreaker.state === 'OPEN') {
      recommendations.push({
        type: 'reliability',
        priority: 'high',
        message: 'Circuit breaker is open. Service is temporarily unavailable.',
        action: 'wait_for_recovery'
      });
    }
    
    return {
      metrics,
      recommendations,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Create optimized cache key
   * @param {string} table - Table name
   * @param {Object} params - Query parameters
   * @returns {string} Cache key
   */
  createCacheKey(table, params) {
    const key = `${table}:${JSON.stringify(params)}`;
    return this.cache.createKey('db', key);
  }

  /**
   * Reset performance metrics
   */
  resetMetrics() {
    this.queryMetrics = {
      totalQueries: 0,
      slowQueries: 0,
      failedQueries: 0,
      averageResponseTime: 0,
      responseTimeSum: 0
    };
    
    // Reset recovery service metrics
    this.recovery.reset();
  }

  /**
   * Validate data before database operations
   * @param {Object|Array} data - Data to validate
   * @param {string} table - Table name
   * @param {Object} options - Validation options
   * @returns {Promise<Object>} Validation result
   */
  async validateData(data, table, options = {}) {
    try {
      const result = Array.isArray(data)
        ? this.validator.validateBulkData(data, table, options)
        : this.validator.validateData(data, table, options);
      
      return result;
    } catch (error) {
      console.error(`❌ Data validation error for ${table}:`, error);
      throw error;
    }
  }

  /**
   * Sanitize data for safe database operations
   * @param {Object|Array} data - Data to sanitize
   * @param {string} table - Table name
   * @returns {Object|Array} Sanitized data
   */
  sanitizeData(data, table) {
    try {
      if (Array.isArray(data)) {
        return data.map(item => this.validator.sanitizeGenericData(item));
      } else {
        return this.validator.sanitizeGenericData(data);
      }
    } catch (error) {
      console.error(`❌ Data sanitization error for ${table}:`, error);
      return data; // Return original data if sanitization fails
    }
  }

  /**
   * Handle null values in database operations
   * @param {Object} data - Data object
   * @param {Object} schema - Table schema
   * @returns {Object} Data with null values handled
   */
  handleNullValues(data, schema = {}) {
    if (!data || typeof data !== 'object') {
      return data;
    }

    const handled = { ...data };

    Object.keys(handled).forEach(key => {
      const value = handled[key];
      
      // Convert empty strings to null for non-string fields
      if (value === '' && schema[key]?.type !== 'string') {
        handled[key] = null;
      }
      
      // Convert undefined to null
      if (value === undefined) {
        handled[key] = null;
      }
      
      // Handle nested objects
      if (value && typeof value === 'object' && !Array.isArray(value)) {
        handled[key] = this.handleNullValues(value, schema[key]?.properties || {});
      }
      
      // Handle arrays
      if (Array.isArray(value)) {
        handled[key] = value.map(item => 
          typeof item === 'object' ? this.handleNullValues(item) : item
        ).filter(item => item !== null && item !== undefined);
      }
    });

    return handled;
  }

  /**
   * Execute operation with comprehensive error handling and recovery
   * @param {Function} operation - Operation to execute
   * @param {Object} context - Operation context
   * @returns {Promise<*>} Operation result
   */
  async executeWithErrorHandling(operation, context = {}) {
    const startTime = Date.now();
    let retryCount = 0;
    const maxRetries = context.maxRetries || 3;

    while (retryCount <= maxRetries) {
      try {
        const result = await operation();
        
        // Record successful recovery if this was a retry
        if (retryCount > 0) {
          this.errorHandler.recordRecoveryAttempt(true);
        }
        
        return result;
        
      } catch (error) {
        const duration = Date.now() - startTime;
        
        // Handle error
        const errorResult = this.errorHandler.handleError(error, {
          ...context,
          retryCount,
          duration
        });
        
        // Check if error is retryable
        if (errorResult.recoveryStrategy.retryable && retryCount < maxRetries) {
          retryCount++;
          
          // Calculate backoff delay
          const baseDelay = errorResult.recoveryStrategy.initialDelay || 1000;
          const multiplier = errorResult.recoveryStrategy.backoffMultiplier || 2;
          const delay = baseDelay * Math.pow(multiplier, retryCount - 1);
          
          console.warn(`⚠️ Retrying operation (attempt ${retryCount}/${maxRetries}) after ${delay}ms delay`);
          
          // Wait before retry
          await new Promise(resolve => setTimeout(resolve, delay));
          
          // Record retry attempt
          this.errorHandler.recordRecoveryAttempt(false);
          
          continue;
        }
        
        // No more retries or error is not retryable
        console.error(`❌ Operation failed after ${retryCount} retries:`, errorResult.error);
        
        const enhancedError = new Error(errorResult.error.userMessage);
        enhancedError.originalError = error;
        enhancedError.errorDetails = errorResult;
        throw enhancedError;
      }
    }
  }

  /**
   * Optimize backup processes to not interfere with normal operations
   * @param {Function} backupOperation - Backup operation to execute
   * @param {Object} options - Backup options
   * @returns {Promise<*>} Backup result
   */
  async executeNonInterferingBackup(backupOperation, options = {}) {
    const startTime = Date.now();
    
    try {
      console.log('📦 Starting non-interfering backup operation...');
      
      // Check current system load
      const metrics = this.getMetrics();
      const currentLoad = metrics.database.averageResponseTime;
      
      // If system is under high load, delay backup
      if (currentLoad > 2000) { // 2 seconds threshold
        const delay = Math.min(currentLoad * 2, 30000); // Max 30 seconds delay
        console.warn(`⚠️ High system load detected (${currentLoad}ms), delaying backup by ${delay}ms`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
      
      // Execute backup with lower priority
      const backupOptions = {
        ...options,
        priority: 'low',
        batchSize: Math.min(options.batchSize || 50, 50), // Smaller batches
        delayBetweenBatches: options.delayBetweenBatches || 200 // Add delays
      };
      
      const result = await backupOperation(backupOptions);
      
      const duration = Date.now() - startTime;
      console.log(`✅ Non-interfering backup completed in ${duration}ms`);
      
      return result;
      
    } catch (error) {
      const duration = Date.now() - startTime;
      console.error(`❌ Non-interfering backup failed after ${duration}ms:`, error);
      
      // Handle backup errors gracefully
      const errorResult = this.errorHandler.handleError(error, {
        operation: 'backup',
        nonInterfering: true,
        duration
      });
      
      // For backup operations, we might want to continue normal operations
      if (options.continueOnError !== false) {
        console.warn('⚠️ Backup failed but continuing normal operations');
        return { success: false, error: errorResult.error };
      }
      
      throw error;
    }
  }
}

// Create singleton instance
const databaseService = new DatabaseService();

export default databaseService;