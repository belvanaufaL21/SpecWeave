/**
 * Query Optimizer for Database Operations
 * Provides optimized query patterns and bulk processing capabilities
 * Requirements: 6.1, 6.2, 6.4
 */

import { supabaseAdmin } from '../../config/supabase.js';

class QueryOptimizer {
  constructor() {
    this.batchSize = 100; // Default batch size for bulk operations
    this.queryTimeout = 30000; // 30 seconds timeout
    this.maxRetries = 3;
    
    // Query performance metrics
    this.metrics = {
      totalQueries: 0,
      optimizedQueries: 0,
      bulkOperations: 0,
      averageResponseTime: 0,
      slowQueries: 0
    };
  }

  /**
   * Optimize SELECT queries with intelligent indexing hints
   * @param {string} table - Table name
   * @param {Object} options - Query options
   * @returns {Object} Optimized query builder
   */
  optimizeSelect(table, options = {}) {
    const startTime = Date.now();
    
    try {
      let query = supabaseAdmin.from(table);
      
      // Apply optimized select columns
      if (options.select) {
        query = query.select(options.select);
      } else {
        // Use specific columns instead of * for better performance
        query = this.getOptimizedSelectColumns(table, query);
      }
      
      // Apply optimized filters with index-friendly patterns
      if (options.filters) {
        query = this.applyOptimizedFilters(query, options.filters);
      }
      
      // Apply optimized ordering
      if (options.orderBy) {
        query = this.applyOptimizedOrdering(query, options.orderBy);
      }
      
      // Apply pagination with optimized range queries
      if (options.limit || options.offset) {
        query = this.applyOptimizedPagination(query, options);
      }
      
      // Record metrics
      this.recordQueryMetrics(Date.now() - startTime, true);
      
      return query;
    } catch (error) {
      this.recordQueryMetrics(Date.now() - startTime, false);
      throw error;
    }
  }

  /**
   * Get optimized select columns for specific tables
   * @param {string} table - Table name
   * @param {Object} query - Query builder
   * @returns {Object} Query with optimized select
   */
  getOptimizedSelectColumns(table, query) {
    const columnMappings = {
      'test_results': 'id, user_id, scenario_id, test_type, score, created_at, updated_at',
      'scenario_references': 'id, user_id, reference_text, description, usage_count, created_at',
      'test_scenario_references': 'id, user_id, reference_text, description, tags, usage_count, created_at',
      'profiles': 'id, email, full_name, created_at, updated_at'
    };
    
    const columns = columnMappings[table];
    if (columns) {
      return query.select(columns);
    }
    
    return query.select('*');
  }

  /**
   * Apply optimized filters that leverage database indexes
   * @param {Object} query - Query builder
   * @param {Array} filters - Filter array
   * @returns {Object} Query with optimized filters
   */
  applyOptimizedFilters(query, filters) {
    // Sort filters to apply indexed filters first
    const sortedFilters = this.sortFiltersByIndexPriority(filters);
    
    sortedFilters.forEach(filter => {
      switch (filter.operator) {
        case 'eq':
          query = query.eq(filter.column, filter.value);
          break;
        case 'neq':
          query = query.neq(filter.column, filter.value);
          break;
        case 'gt':
          query = query.gt(filter.column, filter.value);
          break;
        case 'gte':
          query = query.gte(filter.column, filter.value);
          break;
        case 'lt':
          query = query.lt(filter.column, filter.value);
          break;
        case 'lte':
          query = query.lte(filter.column, filter.value);
          break;
        case 'like':
          query = query.like(filter.column, filter.value);
          break;
        case 'ilike':
          query = query.ilike(filter.column, filter.value);
          break;
        case 'in':
          // Optimize IN queries for large arrays
          if (Array.isArray(filter.value) && filter.value.length > 50) {
            // Split large IN queries into smaller batches
            const batches = this.chunkArray(filter.value, 50);
            const orConditions = batches.map(batch => 
              `${filter.column}.in.(${batch.join(',')})`
            ).join(',');
            query = query.or(orConditions);
          } else {
            query = query.in(filter.column, filter.value);
          }
          break;
        case 'contains':
          query = query.contains(filter.column, filter.value);
          break;
        case 'textSearch':
          // Use full-text search for text columns
          query = query.textSearch(filter.column, filter.value);
          break;
        case 'or':
          query = query.or(filter.value);
          break;
        default:
          console.warn(`Unknown filter operator: ${filter.operator}`);
      }
    });
    
    return query;
  }

  /**
   * Sort filters by index priority for optimal query execution
   * @param {Array} filters - Filter array
   * @returns {Array} Sorted filters
   */
  sortFiltersByIndexPriority(filters) {
    const indexPriority = {
      'user_id': 1,
      'scenario_id': 2,
      'test_type': 3,
      'created_at': 4,
      'score': 5
    };
    
    return filters.sort((a, b) => {
      const priorityA = indexPriority[a.column] || 10;
      const priorityB = indexPriority[b.column] || 10;
      return priorityA - priorityB;
    });
  }

  /**
   * Apply optimized ordering that leverages indexes
   * @param {Object} query - Query builder
   * @param {Array} orderBy - Order by array
   * @returns {Object} Query with optimized ordering
   */
  applyOptimizedOrdering(query, orderBy) {
    // Apply ordering in index-friendly sequence
    orderBy.forEach(order => {
      query = query.order(order.column, { 
        ascending: order.ascending !== false,
        nullsFirst: order.nullsFirst || false
      });
    });
    
    return query;
  }

  /**
   * Apply optimized pagination using efficient range queries
   * @param {Object} query - Query builder
   * @param {Object} options - Pagination options
   * @returns {Object} Query with optimized pagination
   */
  applyOptimizedPagination(query, options) {
    const limit = options.limit || 20;
    const offset = options.offset || 0;
    
    // Use range for better performance than limit/offset for large datasets
    if (offset > 1000) {
      // For large offsets, suggest cursor-based pagination
      console.warn('Large offset detected. Consider using cursor-based pagination for better performance.');
    }
    
    if (options.limit) {
      query = query.limit(limit);
    }
    
    if (options.offset) {
      query = query.range(offset, offset + limit - 1);
    }
    
    return query;
  }

  /**
   * Execute bulk insert operations with optimized batching
   * @param {string} table - Table name
   * @param {Array} data - Data array to insert
   * @param {Object} options - Insert options
   * @returns {Promise<Array>} Insert results
   */
  async bulkInsert(table, data, options = {}) {
    const startTime = Date.now();
    const batchSize = options.batchSize || this.batchSize;
    
    try {
      if (!Array.isArray(data) || data.length === 0) {
        throw new Error('Data must be a non-empty array');
      }
      
      const results = [];
      const batches = this.chunkArray(data, batchSize);
      
      console.log(`🔄 Starting bulk insert: ${data.length} records in ${batches.length} batches`);
      
      for (let i = 0; i < batches.length; i++) {
        const batch = batches[i];
        
        try {
          const { data: batchResult, error } = await supabaseAdmin
            .from(table)
            .insert(batch)
            .select(options.select || 'id');
          
          if (error) {
            throw error;
          }
          
          results.push(...(batchResult || []));
          
          console.log(`✅ Batch ${i + 1}/${batches.length} completed: ${batch.length} records`);
          
          // Add small delay between batches to prevent overwhelming the database
          if (i < batches.length - 1) {
            await this.delay(100);
          }
          
        } catch (batchError) {
          console.error(`❌ Batch ${i + 1} failed:`, batchError);
          
          // Retry failed batch with smaller size
          if (batch.length > 1 && options.retryOnFailure !== false) {
            const smallerBatches = this.chunkArray(batch, Math.ceil(batch.length / 2));
            for (const smallBatch of smallerBatches) {
              try {
                const { data: retryResult, error: retryError } = await supabaseAdmin
                  .from(table)
                  .insert(smallBatch)
                  .select(options.select || 'id');
                
                if (retryError) {
                  throw retryError;
                }
                
                results.push(...(retryResult || []));
              } catch (retryError) {
                console.error('Retry failed for batch:', retryError);
                if (options.throwOnError !== false) {
                  throw retryError;
                }
              }
            }
          } else if (options.throwOnError !== false) {
            throw batchError;
          }
        }
      }
      
      const duration = Date.now() - startTime;
      this.metrics.bulkOperations++;
      
      console.log(`🎉 Bulk insert completed: ${results.length}/${data.length} records in ${duration}ms`);
      
      return results;
      
    } catch (error) {
      const duration = Date.now() - startTime;
      console.error(`❌ Bulk insert failed after ${duration}ms:`, error);
      throw error;
    }
  }

  /**
   * Execute bulk update operations with optimized batching
   * @param {string} table - Table name
   * @param {Array} updates - Array of update objects with id and data
   * @param {Object} options - Update options
   * @returns {Promise<Array>} Update results
   */
  async bulkUpdate(table, updates, options = {}) {
    const startTime = Date.now();
    const batchSize = options.batchSize || Math.min(this.batchSize, 50); // Smaller batches for updates
    
    try {
      if (!Array.isArray(updates) || updates.length === 0) {
        throw new Error('Updates must be a non-empty array');
      }
      
      const results = [];
      const batches = this.chunkArray(updates, batchSize);
      
      console.log(`🔄 Starting bulk update: ${updates.length} records in ${batches.length} batches`);
      
      for (let i = 0; i < batches.length; i++) {
        const batch = batches[i];
        
        try {
          // Execute updates in parallel within batch
          const batchPromises = batch.map(async (update) => {
            const { data, error } = await supabaseAdmin
              .from(table)
              .update(update.data)
              .eq('id', update.id)
              .select(options.select || 'id');
            
            if (error) {
              throw error;
            }
            
            return data?.[0];
          });
          
          const batchResults = await Promise.all(batchPromises);
          results.push(...batchResults.filter(Boolean));
          
          console.log(`✅ Batch ${i + 1}/${batches.length} completed: ${batch.length} updates`);
          
          // Add delay between batches
          if (i < batches.length - 1) {
            await this.delay(150);
          }
          
        } catch (batchError) {
          console.error(`❌ Batch ${i + 1} failed:`, batchError);
          
          if (options.throwOnError !== false) {
            throw batchError;
          }
        }
      }
      
      const duration = Date.now() - startTime;
      this.metrics.bulkOperations++;
      
      console.log(`🎉 Bulk update completed: ${results.length}/${updates.length} records in ${duration}ms`);
      
      return results;
      
    } catch (error) {
      const duration = Date.now() - startTime;
      console.error(`❌ Bulk update failed after ${duration}ms:`, error);
      throw error;
    }
  }

  /**
   * Execute bulk delete operations with optimized batching
   * @param {string} table - Table name
   * @param {Array} ids - Array of IDs to delete
   * @param {Object} options - Delete options
   * @returns {Promise<number>} Number of deleted records
   */
  async bulkDelete(table, ids, options = {}) {
    const startTime = Date.now();
    const batchSize = options.batchSize || this.batchSize;
    
    try {
      if (!Array.isArray(ids) || ids.length === 0) {
        throw new Error('IDs must be a non-empty array');
      }
      
      let totalDeleted = 0;
      const batches = this.chunkArray(ids, batchSize);
      
      console.log(`🔄 Starting bulk delete: ${ids.length} records in ${batches.length} batches`);
      
      for (let i = 0; i < batches.length; i++) {
        const batch = batches[i];
        
        try {
          const { error, count } = await supabaseAdmin
            .from(table)
            .delete()
            .in('id', batch);
          
          if (error) {
            throw error;
          }
          
          totalDeleted += count || batch.length;
          
          console.log(`✅ Batch ${i + 1}/${batches.length} completed: ${batch.length} deletions`);
          
          // Add delay between batches
          if (i < batches.length - 1) {
            await this.delay(100);
          }
          
        } catch (batchError) {
          console.error(`❌ Batch ${i + 1} failed:`, batchError);
          
          if (options.throwOnError !== false) {
            throw batchError;
          }
        }
      }
      
      const duration = Date.now() - startTime;
      this.metrics.bulkOperations++;
      
      console.log(`🎉 Bulk delete completed: ${totalDeleted}/${ids.length} records in ${duration}ms`);
      
      return totalDeleted;
      
    } catch (error) {
      const duration = Date.now() - startTime;
      console.error(`❌ Bulk delete failed after ${duration}ms:`, error);
      throw error;
    }
  }

  /**
   * Execute optimized complex JOIN queries
   * @param {Object} joinConfig - JOIN configuration
   * @returns {Promise<Array>} Query results
   */
  async executeOptimizedJoin(joinConfig) {
    const startTime = Date.now();
    
    try {
      const { 
        mainTable, 
        joinTable, 
        joinCondition, 
        select, 
        filters, 
        orderBy, 
        limit 
      } = joinConfig;
      
      // Build optimized JOIN query
      let query = supabaseAdmin
        .from(mainTable)
        .select(select || `
          ${mainTable}.*,
          ${joinTable}!inner(*)
        `);
      
      // Apply filters
      if (filters) {
        query = this.applyOptimizedFilters(query, filters);
      }
      
      // Apply ordering
      if (orderBy) {
        query = this.applyOptimizedOrdering(query, orderBy);
      }
      
      // Apply limit
      if (limit) {
        query = query.limit(limit);
      }
      
      const { data, error } = await query;
      
      if (error) {
        throw error;
      }
      
      const duration = Date.now() - startTime;
      this.recordQueryMetrics(duration, true);
      
      console.log(`🔗 JOIN query completed in ${duration}ms: ${data?.length || 0} results`);
      
      return data || [];
      
    } catch (error) {
      const duration = Date.now() - startTime;
      this.recordQueryMetrics(duration, false);
      console.error(`❌ JOIN query failed after ${duration}ms:`, error);
      throw error;
    }
  }

  /**
   * Execute aggregation queries with optimization
   * @param {string} table - Table name
   * @param {Object} aggregationConfig - Aggregation configuration
   * @returns {Promise<Object>} Aggregation results
   */
  async executeAggregation(table, aggregationConfig) {
    const startTime = Date.now();
    
    try {
      const { groupBy, aggregates, filters, having } = aggregationConfig;
      
      // Use database views for common aggregations when possible
      if (table === 'test_results' && this.isCommonAggregation(aggregationConfig)) {
        return await this.executeCommonAggregation(aggregationConfig);
      }
      
      // Build aggregation query
      let selectClause = '';
      if (groupBy) {
        selectClause += groupBy.join(', ') + ', ';
      }
      
      if (aggregates) {
        const aggregateClause = aggregates.map(agg => 
          `${agg.function}(${agg.column}) as ${agg.alias || agg.function + '_' + agg.column}`
        ).join(', ');
        selectClause += aggregateClause;
      }
      
      let query = supabaseAdmin
        .from(table)
        .select(selectClause);
      
      // Apply filters
      if (filters) {
        query = this.applyOptimizedFilters(query, filters);
      }
      
      const { data, error } = await query;
      
      if (error) {
        throw error;
      }
      
      const duration = Date.now() - startTime;
      this.recordQueryMetrics(duration, true);
      
      console.log(`📊 Aggregation query completed in ${duration}ms`);
      
      return data || [];
      
    } catch (error) {
      const duration = Date.now() - startTime;
      this.recordQueryMetrics(duration, false);
      console.error(`❌ Aggregation query failed after ${duration}ms:`, error);
      throw error;
    }
  }

  /**
   * Check if aggregation can use pre-built views
   * @param {Object} config - Aggregation configuration
   * @returns {boolean} Whether it's a common aggregation
   */
  isCommonAggregation(config) {
    // Check for user statistics aggregation pattern
    return config.groupBy?.includes('user_id') && 
           config.aggregates?.some(agg => agg.function === 'count');
  }

  /**
   * Execute common aggregations using optimized views
   * @param {Object} config - Aggregation configuration
   * @returns {Promise<Array>} Results from optimized view
   */
  async executeCommonAggregation(config) {
    const { data, error } = await supabaseAdmin
      .from('user_test_statistics')
      .select('*');
    
    if (error) {
      throw error;
    }
    
    return data || [];
  }

  /**
   * Utility function to chunk arrays for batch processing
   * @param {Array} array - Array to chunk
   * @param {number} size - Chunk size
   * @returns {Array} Array of chunks
   */
  chunkArray(array, size) {
    const chunks = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }

  /**
   * Utility function to add delay between operations
   * @param {number} ms - Milliseconds to delay
   * @returns {Promise} Delay promise
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Record query performance metrics
   * @param {number} duration - Query duration in ms
   * @param {boolean} success - Whether query succeeded
   */
  recordQueryMetrics(duration, success) {
    this.metrics.totalQueries++;
    
    if (success) {
      this.metrics.optimizedQueries++;
    }
    
    if (duration > 1000) {
      this.metrics.slowQueries++;
    }
    
    // Update average response time
    this.metrics.averageResponseTime = 
      (this.metrics.averageResponseTime * (this.metrics.totalQueries - 1) + duration) / 
      this.metrics.totalQueries;
  }

  /**
   * Get query optimizer performance metrics
   * @returns {Object} Performance metrics
   */
  getMetrics() {
    return {
      ...this.metrics,
      optimizationRate: this.metrics.totalQueries > 0 
        ? (this.metrics.optimizedQueries / this.metrics.totalQueries) * 100 
        : 0,
      slowQueryRate: this.metrics.totalQueries > 0 
        ? (this.metrics.slowQueries / this.metrics.totalQueries) * 100 
        : 0
    };
  }

  /**
   * Reset performance metrics
   */
  resetMetrics() {
    this.metrics = {
      totalQueries: 0,
      optimizedQueries: 0,
      bulkOperations: 0,
      averageResponseTime: 0,
      slowQueries: 0
    };
  }
}

// Create singleton instance
const queryOptimizer = new QueryOptimizer();

export default queryOptimizer;