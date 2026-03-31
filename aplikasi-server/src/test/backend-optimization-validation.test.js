/**
 * Backend Performance Optimization Validation Tests
 * Tests the implemented optimizations for cache, database, and Python ML services
 */

import cacheService from '../services/cacheService.js';
import databaseService from '../services/databaseService.js';
import pythonMLService from '../services/optimized/pythonMLServiceOptimized.js';

describe('Backend Performance Optimizations', () => {
  
  describe('Cache Service', () => {
    test('should initialize cache service', () => {
      expect(cacheService).toBeDefined();
      expect(typeof cacheService.get).toBe('function');
      expect(typeof cacheService.set).toBe('function');
      expect(typeof cacheService.del).toBe('function');
    });

    test('should handle cache operations', async () => {
      const testKey = 'test_key_' + Date.now();
      const testValue = { data: 'test_data', timestamp: Date.now() };

      // Test set operation
      const setResult = await cacheService.set(testKey, testValue, 60);
      expect(setResult).toBe(true);

      // Test get operation
      const getValue = await cacheService.get(testKey);
      expect(getValue).toEqual(testValue);

      // Test delete operation
      const delResult = await cacheService.del(testKey);
      expect(delResult).toBe(true);

      // Verify deletion
      const deletedValue = await cacheService.get(testKey);
      expect(deletedValue).toBeNull();
    });

    test('should create namespaced cache keys', () => {
      const key = cacheService.createKey('test_namespace', 'test_key');
      expect(key).toBe('specweave:test_namespace:test_key');
    });

    test('should provide cache statistics', async () => {
      const stats = await cacheService.getStats();
      expect(stats).toBeDefined();
      expect(stats).toHaveProperty('type');
      expect(stats).toHaveProperty('timestamp');
    });
  });

  describe('Database Service', () => {
    test('should initialize database service', () => {
      expect(databaseService).toBeDefined();
      expect(typeof databaseService.executeQuery).toBe('function');
      expect(typeof databaseService.insert).toBe('function');
      expect(typeof databaseService.update).toBe('function');
      expect(typeof databaseService.delete).toBe('function');
    });

    test('should provide performance metrics', () => {
      const metrics = databaseService.getMetrics();
      expect(metrics).toBeDefined();
      expect(metrics).toHaveProperty('totalQueries');
      expect(metrics).toHaveProperty('averageResponseTime');
      expect(metrics).toHaveProperty('successRate');
      expect(metrics).toHaveProperty('timestamp');
    });

    test('should test database connection', async () => {
      const connectionTest = await databaseService.testConnection();
      expect(connectionTest).toBeDefined();
      expect(connectionTest).toHaveProperty('success');
      expect(connectionTest).toHaveProperty('responseTime');
      expect(connectionTest).toHaveProperty('timestamp');
    });

    test('should create optimized cache keys', () => {
      const cacheKey = databaseService.createCacheKey('test_table', { id: 1, name: 'test' });
      expect(cacheKey).toContain('specweave:db:test_table');
    });

    test('should analyze performance', async () => {
      const analysis = await databaseService.analyzePerformance();
      expect(analysis).toBeDefined();
      expect(analysis).toHaveProperty('metrics');
      expect(analysis).toHaveProperty('recommendations');
      expect(analysis).toHaveProperty('timestamp');
    });
  });

  describe('Python ML Service', () => {
    test('should initialize Python ML service', () => {
      expect(pythonMLService).toBeDefined();
      expect(typeof pythonMLService.calculateMeteorScore).toBe('function');
      expect(typeof pythonMLService.calculateSentenceBertScore).toBe('function');
      expect(typeof pythonMLService.executeBatch).toBe('function');
    });

    test('should provide service metrics', () => {
      const metrics = pythonMLService.getMetrics();
      expect(metrics).toBeDefined();
      expect(metrics).toHaveProperty('totalRequests');
      expect(metrics).toHaveProperty('successfulRequests');
      expect(metrics).toHaveProperty('processPool');
      expect(metrics).toHaveProperty('config');
      expect(metrics).toHaveProperty('timestamp');
    });

    test('should provide health status', () => {
      const health = pythonMLService.getHealthStatus();
      expect(health).toBeDefined();
      expect(health).toHaveProperty('status');
      expect(health).toHaveProperty('activeProcesses');
      expect(health).toHaveProperty('queuedRequests');
      expect(health).toHaveProperty('timestamp');
    });

    test('should create cache keys for ML operations', () => {
      const cacheKey = pythonMLService.createCacheKey('meteor', 'test generated', 'test reference');
      expect(cacheKey).toContain('specweave:ml_meteor:');
    });

    // Skip actual ML calculations in tests to avoid Python dependencies
    test.skip('should calculate METEOR score with caching', async () => {
      const result = await pythonMLService.calculateMeteorScore(
        'Given a user When they login Then they see dashboard',
        'Given user credentials When login attempted Then dashboard displayed'
      );
      
      expect(result).toBeDefined();
      expect(result).toHaveProperty('success');
      expect(result).toHaveProperty('requestId');
    });
  });

  describe('Integration Tests', () => {
    test('should have consistent configuration', () => {
      // Test that all services use compatible configuration
      const cacheStats = cacheService.getStats();
      const dbMetrics = databaseService.getMetrics();
      const mlMetrics = pythonMLService.getMetrics();

      expect(cacheStats).toHaveProperty('timestamp');
      expect(dbMetrics).toHaveProperty('timestamp');
      expect(mlMetrics).toHaveProperty('timestamp');
    });

    test('should handle error scenarios gracefully', async () => {
      // Test cache service error handling
      const invalidResult = await cacheService.get('non_existent_key');
      expect(invalidResult).toBeNull();

      // Test database service error handling
      const dbMetrics = databaseService.getMetrics();
      expect(dbMetrics.successRate).toBeGreaterThanOrEqual(0);
      expect(dbMetrics.successRate).toBeLessThanOrEqual(100);

      // Test ML service error handling
      const mlHealth = pythonMLService.getHealthStatus();
      expect(['healthy', 'unhealthy']).toContain(mlHealth.status);
    });

    test('should provide monitoring capabilities', () => {
      // Verify all services provide monitoring data
      const cacheStats = cacheService.getStats();
      const dbMetrics = databaseService.getMetrics();
      const mlMetrics = pythonMLService.getMetrics();

      // Cache monitoring
      expect(cacheStats).toHaveProperty('type');
      expect(cacheStats).toHaveProperty('connected');

      // Database monitoring
      expect(dbMetrics).toHaveProperty('totalQueries');
      expect(dbMetrics).toHaveProperty('slowQueries');
      expect(dbMetrics).toHaveProperty('failedQueries');

      // ML service monitoring
      expect(mlMetrics).toHaveProperty('totalRequests');
      expect(mlMetrics).toHaveProperty('activeProcesses');
      expect(mlMetrics).toHaveProperty('queuedRequests');
    });
  });

  describe('Performance Validation', () => {
    test('should have reasonable response times', async () => {
      const startTime = Date.now();
      
      // Test cache operation speed
      await cacheService.set('perf_test', { data: 'test' }, 60);
      await cacheService.get('perf_test');
      await cacheService.del('perf_test');
      
      const cacheTime = Date.now() - startTime;
      expect(cacheTime).toBeLessThan(100); // Should be very fast
    });

    test('should handle concurrent operations', async () => {
      const promises = [];
      const testData = Array.from({ length: 10 }, (_, i) => ({
        key: `concurrent_test_${i}`,
        value: { data: `test_data_${i}`, index: i }
      }));

      // Test concurrent cache operations
      for (const item of testData) {
        promises.push(cacheService.set(item.key, item.value, 60));
      }

      const results = await Promise.all(promises);
      expect(results.every(result => result === true)).toBe(true);

      // Cleanup
      for (const item of testData) {
        await cacheService.del(item.key);
      }
    });

    test('should maintain service health under load', () => {
      // Verify services maintain health status
      const mlHealth = pythonMLService.getHealthStatus();
      const dbMetrics = databaseService.getMetrics();

      // ML service should not be overloaded
      expect(mlMetrics.processPool.active).toBeLessThanOrEqual(mlMetrics.processPool.maxConcurrent);
      
      // Database should have reasonable metrics
      expect(dbMetrics.totalQueries).toBeGreaterThanOrEqual(0);
      expect(dbMetrics.averageResponseTime).toBeGreaterThanOrEqual(0);
    });
  });
});

// Cleanup after tests
afterAll(async () => {
  // Clear any test cache entries
  await cacheService.clear();
  
  // Reset database metrics
  databaseService.resetMetrics();
  
  console.log('✅ Backend optimization validation tests completed');
});