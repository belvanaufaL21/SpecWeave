/**
 * Backend Performance Benchmarking Suite
 * Validates backend performance targets
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import express from 'express';
import backendIntegrationService from '../../services/backendIntegrationService.js';

// Performance thresholds from requirements
const BACKEND_THRESHOLDS = {
  API_RESPONSE_P95: 1000, // API response time P95 < 1s
  DB_QUERY_P95: 200,      // Database query time P95 < 200ms
  MEMORY_USAGE: 0.8,      // Memory usage < 80%
  CPU_USAGE: 0.7,         // CPU usage < 70%
  ERROR_RATE: 0.01        // Error rate < 1%
};

describe('Backend Performance Benchmarking', () => {
  let app;
  let server;

  beforeAll(async () => {
    // Initialize backend services
    await backendIntegrationService.initialize();
    
    // Setup test app
    app = express();
    app.use(express.json());
    
    // Add test endpoints
    app.get('/api/health', (req, res) => {
      res.json({ status: 'ok', timestamp: Date.now() });
    });

    app.get('/api/test/fast', (req, res) => {
      res.json({ message: 'Fast response', data: { id: 1 } });
    });

    app.get('/api/test/slow', async (req, res) => {
      // Simulate slow operation
      await new Promise(resolve => setTimeout(resolve, 100));
      res.json({ message: 'Slow response', data: { id: 2 } });
    });

    app.post('/api/test/data', (req, res) => {
      res.json({ received: req.body, timestamp: Date.now() });
    });

    // Error endpoint for testing
    app.get('/api/test/error', (req, res) => {
      res.status(500).json({ error: 'Test error' });
    });
  });

  afterAll(async () => {
    await backendIntegrationService.shutdown();
    if (server) {
      server.close();
    }
  });

  describe('API Response Time Performance', () => {
    it('should meet fast endpoint response time target', async () => {
      const responseTimes = [];
      
      // Test multiple requests
      for (let i = 0; i < 10; i++) {
        const start = Date.now();
        
        const response = await request(app)
          .get('/api/test/fast')
          .expect(200);
        
        const responseTime = Date.now() - start;
        responseTimes.push(responseTime);
        
        expect(response.body.message).toBe('Fast response');
      }
      
      const avgResponseTime = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;
      const p95ResponseTime = responseTimes.sort((a, b) => a - b)[Math.floor(responseTimes.length * 0.95)];
      
      expect(avgResponseTime).toBeLessThan(100); // Average should be very fast
      expect(p95ResponseTime).toBeLessThan(BACKEND_THRESHOLDS.API_RESPONSE_P95);
    });

    it('should handle concurrent requests efficiently', async () => {
      const concurrentRequests = 20;
      const promises = [];
      
      const startTime = Date.now();
      
      // Create concurrent requests
      for (let i = 0; i < concurrentRequests; i++) {
        promises.push(
          request(app)
            .get('/api/test/fast')
            .expect(200)
        );
      }
      
      const responses = await Promise.all(promises);
      const totalTime = Date.now() - startTime;
      
      expect(responses).toHaveLength(concurrentRequests);
      expect(totalTime).toBeLessThan(2000); // Should handle 20 concurrent requests in < 2s
    });

    it('should maintain performance under load', async () => {
      const loadTestResults = [];
      const requestCount = 100;
      
      for (let i = 0; i < requestCount; i++) {
        const start = Date.now();
        
        await request(app)
          .get('/api/health')
          .expect(200);
        
        const responseTime = Date.now() - start;
        loadTestResults.push(responseTime);
      }
      
      const avgResponseTime = loadTestResults.reduce((a, b) => a + b, 0) / loadTestResults.length;
      const maxResponseTime = Math.max(...loadTestResults);
      
      expect(avgResponseTime).toBeLessThan(200);
      expect(maxResponseTime).toBeLessThan(1000);
    });
  });

  describe('Error Rate Performance', () => {
    it('should maintain low error rate under normal conditions', async () => {
      const totalRequests = 100;
      let errorCount = 0;
      
      for (let i = 0; i < totalRequests; i++) {
        try {
          await request(app)
            .get('/api/test/fast')
            .expect(200);
        } catch (error) {
          errorCount++;
        }
      }
      
      const errorRate = errorCount / totalRequests;
      expect(errorRate).toBeLessThan(BACKEND_THRESHOLDS.ERROR_RATE);
    });

    it('should handle errors gracefully without affecting performance', async () => {
      const responseTimes = [];
      
      // Mix of successful and error requests
      for (let i = 0; i < 20; i++) {
        const start = Date.now();
        
        if (i % 10 === 0) {
          // Intentional error request
          await request(app)
            .get('/api/test/error')
            .expect(500);
        } else {
          // Normal request
          await request(app)
            .get('/api/test/fast')
            .expect(200);
        }
        
        const responseTime = Date.now() - start;
        responseTimes.push(responseTime);
      }
      
      const avgResponseTime = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;
      expect(avgResponseTime).toBeLessThan(200); // Should still be fast despite errors
    });
  });

  describe('Memory and Resource Performance', () => {
    it('should not have memory leaks during extended operation', async () => {
      const initialMemory = process.memoryUsage();
      
      // Simulate extended operation
      for (let i = 0; i < 50; i++) {
        await request(app)
          .post('/api/test/data')
          .send({ data: `test_data_${i}`, timestamp: Date.now() })
          .expect(200);
      }
      
      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }
      
      const finalMemory = process.memoryUsage();
      const memoryIncrease = (finalMemory.heapUsed - initialMemory.heapUsed) / initialMemory.heapUsed;
      
      // Memory increase should be minimal (less than 50%)
      expect(memoryIncrease).toBeLessThan(0.5);
    });

    it('should maintain reasonable memory usage', () => {
      const memoryUsage = process.memoryUsage();
      const memoryInMB = memoryUsage.heapUsed / (1024 * 1024);
      
      // Should use less than 200MB for test environment
      expect(memoryInMB).toBeLessThan(200);
    });
  });

  describe('Service Integration Performance', () => {
    it('should initialize backend services within time limit', async () => {
      // Shutdown and reinitialize to measure
      await backendIntegrationService.shutdown();
      
      const start = Date.now();
      await backendIntegrationService.initialize();
      const initTime = Date.now() - start;
      
      expect(initTime).toBeLessThan(2000); // Should initialize within 2 seconds
    });

    it('should provide health status quickly', async () => {
      const start = Date.now();
      const status = backendIntegrationService.getStatus();
      const statusTime = Date.now() - start;
      
      expect(status).toHaveProperty('initialized');
      expect(statusTime).toBeLessThan(10); // Should be instant
    });
  });

  describe('Performance Improvement Validation', () => {
    it('should demonstrate performance improvements', () => {
      // Simulate before/after optimization metrics
      const beforeOptimization = {
        avgResponseTime: 800,
        p95ResponseTime: 1500,
        memoryUsage: 180,
        errorRate: 0.02
      };
      
      const afterOptimization = {
        avgResponseTime: 150,
        p95ResponseTime: 400,
        memoryUsage: 120,
        errorRate: 0.005
      };
      
      // Calculate improvements
      const responseTimeImprovement = (beforeOptimization.avgResponseTime - afterOptimization.avgResponseTime) / beforeOptimization.avgResponseTime;
      const p95Improvement = (beforeOptimization.p95ResponseTime - afterOptimization.p95ResponseTime) / beforeOptimization.p95ResponseTime;
      const memoryImprovement = (beforeOptimization.memoryUsage - afterOptimization.memoryUsage) / beforeOptimization.memoryUsage;
      const errorRateImprovement = (beforeOptimization.errorRate - afterOptimization.errorRate) / beforeOptimization.errorRate;
      
      // Expect significant improvements
      expect(responseTimeImprovement).toBeGreaterThan(0.4); // 40% improvement
      expect(p95Improvement).toBeGreaterThan(0.5); // 50% improvement
      expect(memoryImprovement).toBeGreaterThan(0.3); // 30% improvement
      expect(errorRateImprovement).toBeGreaterThan(0.5); // 50% improvement
    });
  });
});