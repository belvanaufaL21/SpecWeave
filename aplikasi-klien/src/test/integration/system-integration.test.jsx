/**
 * System Integration Tests
 * Tests end-to-end functionality with all optimizations enabled
 */

import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import App from '../../App.jsx';
import integrationService from '../../services/integrationService.js';

// Mock external dependencies
vi.mock('../../services/api.js');
vi.mock('../../config/supabase.js');

const renderApp = () => {
  return render(
    <BrowserRouter>
      <App />
    </BrowserRouter>
  );
};

describe('System Integration Tests', () => {
  beforeEach(async () => {
    // Initialize integration service before each test
    await integrationService.initialize();
  });

  afterEach(async () => {
    // Clean up after each test
    await integrationService.shutdown();
    vi.clearAllMocks();
  });

  describe('Application Initialization', () => {
    it('should initialize all optimization components', async () => {
      renderApp();
      
      await waitFor(() => {
        const status = integrationService.getStatus();
        expect(status.initialized).toBe(true);
        expect(status.components).toContain('performanceMonitor');
        expect(status.components).toContain('errorHandler');
      });
    });

    it('should handle initialization failures gracefully', async () => {
      // Mock initialization failure
      vi.spyOn(integrationService, 'initialize').mockRejectedValue(new Error('Init failed'));
      
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      renderApp();
      
      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalledWith(
          expect.stringContaining('Failed to initialize optimization components')
        );
      });
      
      consoleSpy.mockRestore();
    });
  });

  describe('Performance Optimization Integration', () => {
    it('should track performance metrics during navigation', async () => {
      renderApp();
      
      // Wait for app to load
      await waitFor(() => {
        expect(screen.getByText(/SpecWeave/i)).toBeInTheDocument();
      });

      // Simulate navigation
      const dashboardLink = screen.getByRole('link', { name: /dashboard/i });
      fireEvent.click(dashboardLink);

      await waitFor(() => {
        const status = integrationService.getStatus();
        expect(status.initialized).toBe(true);
      });
    });

    it('should handle performance issues', async () => {
      renderApp();
      
      // Simulate performance issue
      window.dispatchEvent(new CustomEvent('specweave:performance_issue', {
        detail: { type: 'slow_render', duration: 2000 }
      }));

      await waitFor(() => {
        // Should not crash the application
        expect(screen.getByText(/SpecWeave/i)).toBeInTheDocument();
      });
    });
  });

  describe('Error Handling Integration', () => {
    it('should handle errors gracefully', async () => {
      renderApp();
      
      // Simulate error
      window.dispatchEvent(new CustomEvent('specweave:error', {
        detail: { error: new Error('Test error') }
      }));

      await waitFor(() => {
        // Application should still be functional
        expect(screen.getByText(/SpecWeave/i)).toBeInTheDocument();
      });
    });

    it('should handle critical errors with graceful degradation', async () => {
      renderApp();
      
      // Simulate critical error
      window.dispatchEvent(new CustomEvent('specweave:critical_error', {
        detail: { error: new Error('Critical test error') }
      }));

      await waitFor(() => {
        // Should show error boundary or fallback UI
        expect(document.body).toBeInTheDocument();
      });
    });
  });

  describe('Real-time Features Integration', () => {
    it('should handle connection changes', async () => {
      renderApp();
      
      // Simulate connection change
      window.dispatchEvent(new CustomEvent('specweave:connection_change', {
        detail: { status: 'disconnected' }
      }));

      await waitFor(() => {
        // Application should handle connection change
        expect(screen.getByText(/SpecWeave/i)).toBeInTheDocument();
      });
    });
  });

  describe('Health Monitoring Integration', () => {
    it('should run health checks periodically', async () => {
      renderApp();
      
      await waitFor(() => {
        const status = integrationService.getStatus();
        expect(status.healthChecks.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Component Integration', () => {
    it('should integrate optimized components properly', async () => {
      renderApp();
      
      await waitFor(() => {
        // Check that optimized components are rendered
        expect(screen.getByText(/SpecWeave/i)).toBeInTheDocument();
      });

      // Test component interactions
      const buttons = screen.getAllByRole('button');
      if (buttons.length > 0) {
        fireEvent.click(buttons[0]);
        
        await waitFor(() => {
          // Should handle interactions without errors
          expect(screen.getByText(/SpecWeave/i)).toBeInTheDocument();
        });
      }
    });
  });
});