/**
 * Bulk Processor for Database Operations
 * Handles large-scale data operations with optimized batching and error recovery
 * Requirements: 6.1, 6.2, 6.4
 */

import queryOptimizer from './queryOptimizer.js';
import { supabaseAdmin } from '../../config/supabase.js';

class BulkProcessor {
  constructor() {
    this.defaultBatchSize = 100;
    this.maxConcurrentBatches = 5;
    this.retryAttempts = 3;
    this.retryDelay = 1000; // 1 second
    
    // Processing metrics
    this.metrics = {
      totalOperations: 0,
      successfulOperations: 0,
      failedOperations: 0,
      totalProcessingTime: 0,
      averageBatchTime: 0
    };
  }

  /**
   * Process bulk test results insertion
   * @param {Array} testResults - Array of test result objects
   * @param {Object} options - Processing options
   * @returns {Promise<Object>} Processing results
   */
  async processBulkTestResults(testResults, options = {}) {
    const startTime = Date.now();
    
    try {
      console.log(`🔄 Starting bulk test results processing: ${testResults.length} records`);
      
      // Validate input data
      const validatedResults = this.validateTestResults(testResults);
      
      // Process in optimized batches
      const results = await queryOptimizer.bulkInsert(
        'test_results',
        validatedResults,
        {
          batchSize: options.batchSize || this.defaultBatchSize,
          select: 'id, user_id, scenario_id, test_type, score, created_at',
          retryOnFailure: true,
          throwOnError: false
        }
      );
      
      const duration = Date.now() - startTime;
      this.updateMetrics(testResults.length, results.length, duration);
      
      return {
        success: true,
        processed: results.length,
        total: testResults.length,
        duration,
        results
      };
      
    } catch (error) {
      const duration = Date.now() - startTime;
      this.updateMetrics(testResults.length, 0, duration);
      
      console.error('Bulk test results processing failed:', error);
      throw error;
    }
  }

  /**
   * Process bulk scenario references insertion
   * @param {Array} references - Array of reference objects
   * @param {Object} options - Processing options
   * @returns {Promise<Object>} Processing results
   */
  async processBulkScenarioReferences(references, options = {}) {
    const startTime = Date.now();
    
    try {
      console.log(`🔄 Starting bulk scenario references processing: ${references.length} records`);
      
      // Validate and deduplicate references
      const processedReferences = await this.processScenarioReferences(references);
      
      // Process in batches
      const results = await queryOptimizer.bulkInsert(
        'test_scenario_references',
        processedReferences,
        {
          batchSize: options.batchSize || 50, // Smaller batches for references
          select: 'id, user_id, reference_text, usage_count, created_at',
          retryOnFailure: true,
          throwOnError: false
        }
      );
      
      const duration = Date.now() - startTime;
      this.updateMetrics(references.length, results.length, duration);
      
      return {
        success: true,
        processed: results.length,
        total: references.length,
        duration,
        results
      };
      
    } catch (error) {
      const duration = Date.now() - startTime;
      this.updateMetrics(references.length, 0, duration);
      
      console.error('Bulk scenario references processing failed:', error);
      throw error;
    }
  }

  /**
   * Process bulk updates for test results
   * @param {Array} updates - Array of update objects with id and data
   * @param {Object} options - Processing options
   * @returns {Promise<Object>} Processing results
   */
  async processBulkTestResultUpdates(updates, options = {}) {
    const startTime = Date.now();
    
    try {
      console.log(`🔄 Starting bulk test result updates: ${updates.length} records`);
      
      // Validate update data
      const validatedUpdates = this.validateTestResultUpdates(updates);
      
      // Process updates in batches
      const results = await queryOptimizer.bulkUpdate(
        'test_results',
        validatedUpdates,
        {
          batchSize: options.batchSize || 50,
          select: 'id, updated_at',
          throwOnError: false
        }
      );
      
      const duration = Date.now() - startTime;
      this.updateMetrics(updates.length, results.length, duration);
      
      return {
        success: true,
        processed: results.length,
        total: updates.length,
        duration,
        results
      };
      
    } catch (error) {
      const duration = Date.now() - startTime;
      this.updateMetrics(updates.length, 0, duration);
      
      console.error('Bulk test result updates failed:', error);
      throw error;
    }
  }

  /**
   * Process bulk deletion of test results
   * @param {Array} testResultIds - Array of test result IDs
   * @param {string} userId - User ID for security
   * @param {Object} options - Processing options
   * @returns {Promise<Object>} Processing results
   */
  async processBulkTestResultDeletion(testResultIds, userId, options = {}) {
    const startTime = Date.now();
    
    try {
      console.log(`🔄 Starting bulk test result deletion: ${testResultIds.length} records`);
      
      // Validate user ownership before deletion
      const validatedIds = await this.validateTestResultOwnership(testResultIds, userId);
      
      // Process deletions in batches
      const deletedCount = await queryOptimizer.bulkDelete(
        'test_results',
        validatedIds,
        {
          batchSize: options.batchSize || this.defaultBatchSize,
          throwOnError: false
        }
      );
      
      const duration = Date.now() - startTime;
      this.updateMetrics(testResultIds.length, deletedCount, duration);
      
      return {
        success: true,
        deleted: deletedCount,
        total: testResultIds.length,
        duration
      };
      
    } catch (error) {
      const duration = Date.now() - startTime;
      this.updateMetrics(testResultIds.length, 0, duration);
      
      console.error('Bulk test result deletion failed:', error);
      throw error;
    }
  }

  /**
   * Process data migration between tables
   * @param {Object} migrationConfig - Migration configuration
   * @returns {Promise<Object>} Migration results
   */
  async processDataMigration(migrationConfig) {
    const startTime = Date.now();
    
    try {
      const { 
        sourceTable, 
        targetTable, 
        transformFunction, 
        batchSize = 100,
        whereClause 
      } = migrationConfig;
      
      console.log(`🔄 Starting data migration: ${sourceTable} → ${targetTable}`);
      
      // Get total count for progress tracking
      const { count: totalCount } = await supabaseAdmin
        .from(sourceTable)
        .select('*', { count: 'exact', head: true });
      
      console.log(`📊 Total records to migrate: ${totalCount}`);
      
      let processedCount = 0;
      let offset = 0;
      const results = [];
      
      while (offset < totalCount) {
        // Fetch batch from source table
        let query = supabaseAdmin
          .from(sourceTable)
          .select('*')
          .range(offset, offset + batchSize - 1);
        
        if (whereClause) {
          query = this.applyWhereClause(query, whereClause);
        }
        
        const { data: sourceBatch, error: fetchError } = await query;
        
        if (fetchError) {
          throw fetchError;
        }
        
        if (!sourceBatch || sourceBatch.length === 0) {
          break;
        }
        
        // Transform data if transformation function provided
        const transformedBatch = transformFunction 
          ? sourceBatch.map(transformFunction)
          : sourceBatch;
        
        // Insert into target table
        const { data: insertedData, error: insertError } = await supabaseAdmin
          .from(targetTable)
          .insert(transformedBatch)
          .select('id');
        
        if (insertError) {
          console.error(`Migration batch failed at offset ${offset}:`, insertError);
          // Continue with next batch instead of failing completely
        } else {
          results.push(...(insertedData || []));
          processedCount += sourceBatch.length;
        }
        
        offset += batchSize;
        
        // Progress update
        const progress = Math.round((offset / totalCount) * 100);
        console.log(`📈 Migration progress: ${progress}% (${processedCount}/${totalCount})`);
        
        // Small delay to prevent overwhelming the database
        await this.delay(100);
      }
      
      const duration = Date.now() - startTime;
      
      console.log(`✅ Migration completed: ${processedCount}/${totalCount} records in ${duration}ms`);
      
      return {
        success: true,
        migrated: processedCount,
        total: totalCount,
        duration,
        results
      };
      
    } catch (error) {
      const duration = Date.now() - startTime;
      console.error(`❌ Data migration failed after ${duration}ms:`, error);
      throw error;
    }
  }

  /**
   * Process bulk data export
   * @param {string} table - Table name
   * @param {Object} exportConfig - Export configuration
   * @returns {Promise<Array>} Exported data
   */
  async processBulkExport(table, exportConfig = {}) {
    const startTime = Date.now();
    
    try {
      const { 
        filters, 
        select, 
        orderBy, 
        batchSize = 1000,
        maxRecords = 10000 
      } = exportConfig;
      
      console.log(`📤 Starting bulk export from ${table}`);
      
      const allData = [];
      let offset = 0;
      let hasMore = true;
      
      while (hasMore && allData.length < maxRecords) {
        const currentBatchSize = Math.min(batchSize, maxRecords - allData.length);
        
        // Build optimized query
        const query = queryOptimizer.optimizeSelect(table, {
          select,
          filters,
          orderBy,
          limit: currentBatchSize,
          offset
        });
        
        const { data: batch, error } = await query;
        
        if (error) {
          throw error;
        }
        
        if (!batch || batch.length === 0) {
          hasMore = false;
        } else {
          allData.push(...batch);
          offset += batch.length;
          
          if (batch.length < currentBatchSize) {
            hasMore = false;
          }
        }
        
        // Progress update
        console.log(`📊 Export progress: ${allData.length} records exported`);
        
        // Small delay between batches
        await this.delay(50);
      }
      
      const duration = Date.now() - startTime;
      
      console.log(`✅ Bulk export completed: ${allData.length} records in ${duration}ms`);
      
      return allData;
      
    } catch (error) {
      const duration = Date.now() - startTime;
      console.error(`❌ Bulk export failed after ${duration}ms:`, error);
      throw error;
    }
  }

  /**
   * Validate test results data
   * @param {Array} testResults - Test results to validate
   * @returns {Array} Validated test results
   */
  validateTestResults(testResults) {
    return testResults.filter(result => {
      // Basic validation
      if (!result.user_id || !result.scenario_id || !result.test_type) {
        console.warn('Invalid test result: missing required fields', result);
        return false;
      }
      
      if (!['meteor', 'sentence_bert'].includes(result.test_type)) {
        console.warn('Invalid test result: invalid test_type', result);
        return false;
      }
      
      if (typeof result.score !== 'number' || result.score < 0 || result.score > 1) {
        console.warn('Invalid test result: invalid score', result);
        return false;
      }
      
      return true;
    }).map(result => ({
      ...result,
      created_at: result.created_at || new Date().toISOString(),
      updated_at: result.updated_at || new Date().toISOString()
    }));
  }

  /**
   * Process and deduplicate scenario references
   * @param {Array} references - References to process
   * @returns {Array} Processed references
   */
  async processScenarioReferences(references) {
    // Group by user_id and reference_text to handle duplicates
    const referenceMap = new Map();
    
    references.forEach(ref => {
      const key = `${ref.user_id}:${ref.reference_text}`;
      
      if (referenceMap.has(key)) {
        // Merge tags and increment usage count
        const existing = referenceMap.get(key);
        existing.usage_count = (existing.usage_count || 1) + 1;
        existing.tags = [...new Set([...(existing.tags || []), ...(ref.tags || [])])];
      } else {
        referenceMap.set(key, {
          ...ref,
          usage_count: ref.usage_count || 1,
          created_at: ref.created_at || new Date().toISOString(),
          updated_at: ref.updated_at || new Date().toISOString()
        });
      }
    });
    
    return Array.from(referenceMap.values());
  }

  /**
   * Validate test result updates
   * @param {Array} updates - Updates to validate
   * @returns {Array} Validated updates
   */
  validateTestResultUpdates(updates) {
    return updates.filter(update => {
      if (!update.id || !update.data) {
        console.warn('Invalid update: missing id or data', update);
        return false;
      }
      
      return true;
    }).map(update => ({
      ...update,
      data: {
        ...update.data,
        updated_at: new Date().toISOString()
      }
    }));
  }

  /**
   * Validate test result ownership before deletion
   * @param {Array} testResultIds - Test result IDs
   * @param {string} userId - User ID
   * @returns {Promise<Array>} Validated IDs
   */
  async validateTestResultOwnership(testResultIds, userId) {
    const { data: ownedResults, error } = await supabaseAdmin
      .from('test_results')
      .select('id')
      .in('id', testResultIds)
      .eq('user_id', userId);
    
    if (error) {
      throw error;
    }
    
    const ownedIds = ownedResults.map(result => result.id);
    
    if (ownedIds.length !== testResultIds.length) {
      console.warn(`User ${userId} attempted to delete ${testResultIds.length} records but only owns ${ownedIds.length}`);
    }
    
    return ownedIds;
  }

  /**
   * Apply where clause to query
   * @param {Object} query - Query builder
   * @param {Object} whereClause - Where conditions
   * @returns {Object} Query with where clause
   */
  applyWhereClause(query, whereClause) {
    Object.entries(whereClause).forEach(([column, value]) => {
      if (Array.isArray(value)) {
        query = query.in(column, value);
      } else {
        query = query.eq(column, value);
      }
    });
    
    return query;
  }

  /**
   * Utility function to add delay
   * @param {number} ms - Milliseconds to delay
   * @returns {Promise} Delay promise
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Update processing metrics
   * @param {number} total - Total records processed
   * @param {number} successful - Successful records
   * @param {number} duration - Processing duration
   */
  updateMetrics(total, successful, duration) {
    this.metrics.totalOperations += total;
    this.metrics.successfulOperations += successful;
    this.metrics.failedOperations += (total - successful);
    this.metrics.totalProcessingTime += duration;
    
    // Update average batch time
    const batchCount = Math.ceil(this.metrics.totalOperations / this.defaultBatchSize);
    this.metrics.averageBatchTime = this.metrics.totalProcessingTime / Math.max(batchCount, 1);
  }

  /**
   * Get bulk processor metrics
   * @returns {Object} Processing metrics
   */
  getMetrics() {
    return {
      ...this.metrics,
      successRate: this.metrics.totalOperations > 0 
        ? (this.metrics.successfulOperations / this.metrics.totalOperations) * 100 
        : 0,
      averageProcessingTime: this.metrics.totalOperations > 0 
        ? this.metrics.totalProcessingTime / this.metrics.totalOperations 
        : 0
    };
  }

  /**
   * Reset processing metrics
   */
  resetMetrics() {
    this.metrics = {
      totalOperations: 0,
      successfulOperations: 0,
      failedOperations: 0,
      totalProcessingTime: 0,
      averageBatchTime: 0
    };
  }
}

// Create singleton instance
const bulkProcessor = new BulkProcessor();

export default bulkProcessor;