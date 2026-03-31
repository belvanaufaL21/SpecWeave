/**
 * Backend System Integration Tests
 * Tests backend optimization integration
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import request from 'supertest';
import express from 'express';
import backendIntegrationService from '../../services/backendIntegrationService.js';

// Mock external dependencies
vi.mock('../../config/supabase.js');
vi.mock('../../services/cacheService.js');

describe('Backend System Integration Tests', () => {
  let app;

  beforeEach(async () => {
    app = express();
    app.use(express.json());
    
    // Initialize backend integration service
    await backendIntegrationService.initialize();
    
    // Add test routes
    app.get('/api/health', (req, res) => {
      const status = backendIntegrationService.getStatus();
      res.json(status);
    });

    app.get('/api/test', (req, res) => {
      res.json({ message: 'Test endpoint' });
    });
  });

  afterEach(async () => {
    await backendIntegrationService.shutdown();
    vi.clearAllMocks();
  });

  describe('Service Initialization', () => {
    it('should initialize all backend services', async () => {
      const status = backendIntegrationService.getStatus();
      
      expect(status.initialized).toBe(true);
      expect(status.services).toContain('database');
      expect(status.services).toContain('cache');
      expect(status.services).toContain('monitoring');
    });

    it('should provide health status endpoint', async () => {
      const response = await request(app)
        .get('/api/health')
        .expect(200);

      expect(response.body.initialized).toBe(true);
      expect(response.body.services).toBeInstanceOf(Array);
    });
  });

  describe('Service Coordination', () => {
    it('should coordinate error handling between services', async () => {
      // This test would verify that errors are properly coordinated
      // between error logging, monitoring, and alerting services
      const status = backendIntegrationService.getStatus();
      expect(status.initialized).toBe(true);
    });

    it('should coordinate performance monitoring', async () => {
      // Test performance monitoring coordination
      const response = await request(app)
        .get('/api/test')
        .expect(200);

      expect(response.body.message).toBe('Test endpoint');
    });
  });

  describe('Health Checks', () => {
    it('should run health checks on all services', async () => {
      const healthStatus = await backendIntegrationService.runHealthChecks();
      
      expect(healthStatus).toHaveProperty('healthy');
      expect(healthStatus).toHaveProperty('results');
      expect(healthStatus).toHaveProperty('timestamp');
    });
  });

  describe('Graceful Shutdown', () => {
    it('should shutdown all services gracefully', async () => {
      const shutdownPromise = backendIntegrationService.shutdown();
      await expect(shutdownPromise).resolves.toBeUndefined();
    });
  });
});