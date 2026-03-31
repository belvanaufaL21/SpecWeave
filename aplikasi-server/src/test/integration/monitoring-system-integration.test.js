/**
 * Monitoring System Integration Tests
 * Tests the comprehensive monitoring and observability system
 */

import request from 'supertest';
import { jest } from '@jest/globals';

// Mock the app setup
const mockApp = {
  get: jest.fn(),
  use: jest.fn(),
  listen: jest.fn()
};

describe('Monitoring System Integration', () => {
  let monitoringService;
  let healthCheckService;
  let trafficMonitoringService;
  let metricsCollectionService;

  beforeAll(async () => {
    // Import services after mocking
    const { default: monitoring } = await import('../../services/monitoringService.js');
    const { default: healthCheck } = await import('../../services/healthCheckService.js');
    const { default: trafficMonitoring } = await import('../../services/trafficMonitoringService.js');
    const { default: metricsCollection } = await import('../../services/metricsCollectionService.js');

    monitoringService = monitoring;
    healthCheckService = healthCheck;
    trafficMonitoringService = trafficMonitoring;
    metricsCollectionService = metricsCollection;
  });

  afterAll(async () => {
    // Clean up services
    if (monitoringService) {
      monitoringService.stopMonitoring();
    }
    if (trafficMonitoringService) {
      trafficMonitoringService.stopMonitoring();
    }
    if (metricsCollectionService) {
      metricsCollectionService.stopCollection();
    }
  });

  describe('Monitoring Service', () => {
    test('should start monitoring successfully', () => {
      expect(() => {
        monitoringService.startMonitoring();
      }).not.toThrow();
      
      expect(monitoringService.isMonitoring).toBe(true);
    });

    test('should record performance metrics', () => {
      const operation = 'test-operation';
      const duration = 150;
      const metadata = { test: true };

      expect(() => {
        monitoringService.recordPerformanceMetric(operation, duration, metadata);
      }).not.toThrow();
    });

    test('should record error metrics', () => {
      const error = new Error('Test error');
      const context = { endpoint: '/test' };

      expect(() => {
        monitoringService.recordErrorMetric(error, context);
      }).not.toThrow();
    });

    test('should get dashboard data', () => {
      const dashboardData = monitoringService.getDashboardData();
      
      expect(dashboardData).toHaveProperty('summary');
      expect(dashboardData).toHaveProperty('performance');
      expect(dashboardData).toHaveProperty('errors');
      expect(dashboardData).toHaveProperty('system');
      expect(dashboardData).toHaveProperty('alerts');
    });
  });

  describe('Health Check Service', () => {
    test('should get health status', async () => {
      const healthStatus = await healthCheckService.getHealthStatus();
      
      expect(healthStatus).toHaveProperty('healthy');
      expect(healthStatus).toHaveProperty('status');
      expect(healthStatus).toHaveProperty('timestamp');
      expect(healthStatus).toHaveProperty('checks');
      expect(healthStatus).toHaveProperty('summary');
    });

    test('should get readiness status', async () => {
      const readinessStatus = await healthCheckService.getReadinessStatus();
      
      expect(readinessStatus).toHaveProperty('ready');
      expect(readinessStatus).toHaveProperty('timestamp');
      expect(readinessStatus).toHaveProperty('checks');
      expect(readinessStatus).toHaveProperty('message');
    });

    test('should get liveness status', async () => {
      const livenessStatus = await healthCheckService.getLivenessStatus();
      
      expect(livenessStatus).toHaveProperty('alive');
      expect(livenessStatus).toHaveProperty('timestamp');
      expect(livenessStatus).toHaveProperty('checks');
      expect(livenessStatus).toHaveProperty('message');
    });

    test('should get deployment metrics', () => {
      const deploymentMetrics = healthCheckService.getDeploymentMetrics();
      
      expect(deploymentMetrics).toHaveProperty('deploymentId');
      expect(deploymentMetrics).toHaveProperty('version');
      expect(deploymentMetrics).toHaveProperty('environment');
      expect(deploymentMetrics).toHaveProperty('uptime');
      expect(deploymentMetrics).toHaveProperty('startTime');
    });

    test('should get detailed health report', async () => {
      const detailedReport = await healthCheckService.getDetailedHealthReport();
      
      expect(detailedReport).toHaveProperty('overall');
      expect(detailedReport).toHaveProperty('readiness');
      expect(detailedReport).toHaveProperty('liveness');
      expect(detailedReport).toHaveProperty('deployment');
      expect(detailedReport).toHaveProperty('history');
      expect(detailedReport).toHaveProperty('generatedAt');
    });
  });

  describe('Traffic Monitoring Service', () => {
    test('should start traffic monitoring successfully', () => {
      expect(() => {
        trafficMonitoringService.startMonitoring();
      }).not.toThrow();
      
      expect(trafficMonitoringService.isMonitoring).toBe(true);
    });

    test('should record traffic events', () => {
      const requestData = {
        method: 'GET',
        path: '/test',
        userId: 'user123',
        userAgent: 'Test Agent',
        requestSize: 100
      };

      expect(() => {
        trafficMonitoringService.recordTrafficEvent('request', requestData);
      }).not.toThrow();

      const responseData = {
        responseTime: 150,
        statusCode: 200,
        responseSize: 500
      };

      expect(() => {
        trafficMonitoringService.recordTrafficEvent('response', responseData);
      }).not.toThrow();
    });

    test('should get current traffic metrics', () => {
      const currentMetrics = trafficMonitoringService.getCurrentTrafficMetrics();
      
      expect(currentMetrics).toHaveProperty('requestsPerMinute');
      expect(currentMetrics).toHaveProperty('concurrentUsers');
      expect(currentMetrics).toHaveProperty('averageResponseTime');
      expect(currentMetrics).toHaveProperty('p95ResponseTime');
      expect(currentMetrics).toHaveProperty('errorRate');
    });

    test('should get traffic dashboard', () => {
      const dashboard = trafficMonitoringService.getTrafficDashboard();
      
      expect(dashboard).toHaveProperty('current');
      expect(dashboard).toHaveProperty('patterns');
      expect(dashboard).toHaveProperty('capacity');
      expect(dashboard).toHaveProperty('thresholds');
      expect(dashboard).toHaveProperty('timestamp');
    });
  });

  describe('Metrics Collection Service', () => {
    test('should start metrics collection successfully', () => {
      expect(() => {
        metricsCollectionService.startCollection();
      }).not.toThrow();
      
      expect(metricsCollectionService.isCollecting).toBe(true);
    });

    test('should get metrics summary', () => {
      const summary = metricsCollectionService.getMetricsSummary();
      
      expect(summary).toHaveProperty('collectors');
      expect(summary).toHaveProperty('aggregators');
      expect(summary).toHaveProperty('storage');
    });

    test('should add custom collector', () => {
      const testCollector = {
        interval: 10000,
        collect: async () => ({ test: 'data' })
      };

      expect(() => {
        metricsCollectionService.addCollector('test', testCollector);
      }).not.toThrow();
    });

    test('should add custom aggregator', () => {
      const testAggregator = {
        windowSize: 60000,
        aggregate: (metrics) => ({ count: metrics.length })
      };

      expect(() => {
        metricsCollectionService.addAggregator('test', testAggregator);
      }).not.toThrow();
    });
  });

  describe('Integration Tests', () => {
    test('should handle monitoring workflow end-to-end', async () => {
      // Start all services
      monitoringService.startMonitoring();
      trafficMonitoringService.startMonitoring();
      metricsCollectionService.startCollection();

      // Record some metrics
      monitoringService.recordPerformanceMetric('test-operation', 200, { test: true });
      trafficMonitoringService.recordTrafficEvent('request', {
        method: 'GET',
        path: '/test',
        userId: 'user123'
      });

      // Wait a bit for processing
      await new Promise(resolve => setTimeout(resolve, 100));

      // Get dashboard data
      const dashboardData = monitoringService.getDashboardData();
      const healthStatus = await healthCheckService.getHealthStatus();
      const trafficDashboard = trafficMonitoringService.getTrafficDashboard();

      // Verify data is available
      expect(dashboardData.summary).toBeDefined();
      expect(healthStatus.healthy).toBeDefined();
      expect(trafficDashboard.current).toBeDefined();
    });

    test('should handle error scenarios gracefully', async () => {
      // Test error recording
      const testError = new Error('Test integration error');
      
      expect(() => {
        monitoringService.recordErrorMetric(testError, { test: true });
      }).not.toThrow();

      // Test traffic error recording
      expect(() => {
        trafficMonitoringService.recordTrafficEvent('error', {
          statusCode: 500,
          endpoint: 'GET /test'
        });
      }).not.toThrow();

      // Verify error metrics are recorded
      const dashboardData = monitoringService.getDashboardData();
      expect(dashboardData.errors.metrics.length).toBeGreaterThan(0);
    });

    test('should provide consistent data across services', async () => {
      // Record metrics in multiple services
      monitoringService.recordPerformanceMetric('consistency-test', 300);
      trafficMonitoringService.recordTrafficEvent('request', {
        method: 'POST',
        path: '/consistency-test'
      });

      // Get data from all services
      const monitoringData = monitoringService.getDashboardData();
      const healthData = await healthCheckService.getHealthStatus();
      const trafficData = trafficMonitoringService.getTrafficDashboard();
      const metricsData = metricsCollectionService.getMetricsSummary();

      // Verify all services are providing data
      expect(monitoringData).toBeDefined();
      expect(healthData).toBeDefined();
      expect(trafficData).toBeDefined();
      expect(metricsData).toBeDefined();

      // Verify timestamps are recent (within last minute)
      const now = Date.now();
      const oneMinuteAgo = now - 60000;
      
      if (healthData.timestamp) {
        const healthTimestamp = new Date(healthData.timestamp).getTime();
        expect(healthTimestamp).toBeGreaterThan(oneMinuteAgo);
      }
      
      if (trafficData.timestamp) {
        const trafficTimestamp = new Date(trafficData.timestamp).getTime();
        expect(trafficTimestamp).toBeGreaterThan(oneMinuteAgo);
      }
    });
  });

  describe('Performance Tests', () => {
    test('should handle high volume of metrics efficiently', () => {
      const startTime = Date.now();
      
      // Record 1000 metrics
      for (let i = 0; i < 1000; i++) {
        monitoringService.recordPerformanceMetric(`operation-${i}`, Math.random() * 1000);
      }
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      // Should complete within reasonable time (less than 1 second)
      expect(duration).toBeLessThan(1000);
    });

    test('should handle concurrent metric recording', async () => {
      const promises = [];
      
      // Create 100 concurrent metric recordings
      for (let i = 0; i < 100; i++) {
        promises.push(
          Promise.resolve().then(() => {
            monitoringService.recordPerformanceMetric(`concurrent-${i}`, Math.random() * 500);
            trafficMonitoringService.recordTrafficEvent('request', {
              method: 'GET',
              path: `/concurrent-${i}`
            });
          })
        );
      }
      
      // Wait for all to complete
      await Promise.all(promises);
      
      // Verify system is still responsive
      const dashboardData = monitoringService.getDashboardData();
      expect(dashboardData).toBeDefined();
    });
  });
});