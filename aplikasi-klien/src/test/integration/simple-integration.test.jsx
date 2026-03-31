/**
 * Simple Integration Test
 * Tests basic integration functionality
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import integrationService from '../../services/integrationService.js';

describe('Simple Integration Tests', () => {
  beforeEach(async () => {
    // Reset integration service
    if (integrationService.initialized) {
      await integrationService.shutdown();
    }
  });

  afterEach(async () => {
    // Clean up after each test
    if (integrationService.initialized) {
      await integrationService.shutdown();
    }
  });

  describe('Integration Service', () => {
    it('should initialize successfully with fallbacks', async () => {
      await integrationService.initialize();
      
      const status = integrationService.getStatus();
      expect(status.initialized).toBe(true);
      expect(status.components).toBeInstanceOf(Array);
    });

    it('should handle shutdown gracefully', async () => {
      await integrationService.initialize();
      await integrationService.shutdown();
      
      const status = integrationService.getStatus();
      expect(status.initialized).toBe(false);
    });

    it('should provide status information', () => {
      const status = integrationService.getStatus();
      expect(status).toHaveProperty('initialized');
      expect(status).toHaveProperty('components');
      expect(status).toHaveProperty('timestamp');
    });
  });
});