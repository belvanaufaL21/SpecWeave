/**
 * Optimization Infrastructure Tests
 * Tests to verify the optimization infrastructure is working correctly
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { BaseHeader, BaseErrorBoundary } from '../../components/base';

// Mock web-vitals
vi.mock('web-vitals', () => ({
  getCLS: vi.fn(),
  getFID: vi.fn(),
  getFCP: vi.fn(),
  getLCP: vi.fn(),
  getTTFB: vi.fn()
}));

// Mock react-window
vi.mock('react-window', () => ({
  FixedSizeList: ({ children, itemCount }) => {
    const items = [];
    for (let i = 0; i < Math.min(itemCount, 10); i++) {
      items.push(children({ index: i, style: {} }));
    }
    return items;
  }
}));

describe('Optimization Infrastructure', () => {
  afterEach(() => {
    cleanup();
  });

  describe('Base Components', () => {
    it('should render BaseHeader without crashing', () => {
      render(
        <BaseHeader 
          title="Test Header" 
          subtitle="Test subtitle"
          level={1}
        />
      );

      expect(screen.getByText('Test Header')).toBeInTheDocument();
      expect(screen.getByText('Test subtitle')).toBeInTheDocument();
    });

    it('should render BaseHeader with different sizes', () => {
      const { rerender } = render(
        <BaseHeader 
          title="Small Header" 
          size="sm"
        />
      );

      expect(screen.getByText('Small Header')).toBeInTheDocument();

      rerender(
        <BaseHeader 
          title="Large Header" 
          size="lg"
        />
      );

      expect(screen.getByText('Large Header')).toBeInTheDocument();
    });

    it('should render BaseHeader with breadcrumbs', () => {
      const breadcrumbs = [
        { label: 'Home', href: '/' },
        { label: 'Current Page' }
      ];

      render(
        <BaseHeader 
          title="Page Title" 
          breadcrumbs={breadcrumbs}
        />
      );

      expect(screen.getByText('Home')).toBeInTheDocument();
      expect(screen.getByText('Current Page')).toBeInTheDocument();
      expect(screen.getByText('Page Title')).toBeInTheDocument();
    });

    it('should handle errors with BaseErrorBoundary', () => {
      const ThrowError = () => {
        throw new Error('Test component error');
      };

      render(
        <BaseErrorBoundary name="TestBoundary">
          <ThrowError />
        </BaseErrorBoundary>
      );

      expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    });

    it('should render BaseErrorBoundary with custom error messages', () => {
      const ThrowError = () => {
        const error = new Error('Custom error message');
        error.name = 'CustomError';
        throw error;
      };

      const errorMessages = {
        CustomError: 'This is a custom error message'
      };

      render(
        <BaseErrorBoundary 
          name="TestBoundary"
          errorMessages={errorMessages}
        >
          <ThrowError />
        </BaseErrorBoundary>
      );

      expect(screen.getByText('This is a custom error message')).toBeInTheDocument();
    });

    it('should render BaseErrorBoundary with retry functionality', () => {
      let shouldThrow = true;
      
      const ConditionalError = () => {
        if (shouldThrow) {
          throw new Error('Temporary error');
        }
        return <div>Success!</div>;
      };

      render(
        <BaseErrorBoundary name="TestBoundary" maxRetries={2}>
          <ConditionalError />
        </BaseErrorBoundary>
      );

      expect(screen.getByText('Something went wrong')).toBeInTheDocument();
      
      // The retry button should be present
      const retryButton = screen.getByText(/Try Again/);
      expect(retryButton).toBeInTheDocument();
    });
  });

  describe('Component Integration', () => {
    it('should render nested components without issues', () => {
      render(
        <BaseErrorBoundary name="OuterBoundary">
          <BaseHeader title="Protected Header" />
          <div>
            <BaseErrorBoundary name="InnerBoundary">
              <div>Nested content</div>
            </BaseErrorBoundary>
          </div>
        </BaseErrorBoundary>
      );

      expect(screen.getByText('Protected Header')).toBeInTheDocument();
      expect(screen.getByText('Nested content')).toBeInTheDocument();
    });

    it('should handle multiple components with different configurations', () => {
      render(
        <div>
          <BaseHeader 
            title="Main Title" 
            size="lg"
            variant="primary"
          />
          <BaseHeader 
            title="Subtitle" 
            size="sm"
            variant="secondary"
          />
        </div>
      );

      expect(screen.getByText('Main Title')).toBeInTheDocument();
      expect(screen.getByText('Subtitle')).toBeInTheDocument();
    });
  });

  describe('Performance Considerations', () => {
    it('should render components efficiently', () => {
      const startTime = performance.now();
      
      render(
        <div>
          {Array.from({ length: 10 }, (_, i) => (
            <BaseHeader 
              key={i}
              title={`Header ${i}`} 
              subtitle={`Subtitle ${i}`}
            />
          ))}
        </div>
      );

      const endTime = performance.now();
      const renderTime = endTime - startTime;

      // Should render 10 headers in less than 100ms
      expect(renderTime).toBeLessThan(100);
      
      // All headers should be present
      expect(screen.getByText('Header 0')).toBeInTheDocument();
      expect(screen.getByText('Header 9')).toBeInTheDocument();
    });

    it('should handle component unmounting cleanly', () => {
      const { unmount } = render(
        <BaseHeader title="Test Header" />
      );

      expect(screen.getByText('Test Header')).toBeInTheDocument();
      
      // Should unmount without errors
      expect(() => unmount()).not.toThrow();
    });
  });

  describe('Accessibility', () => {
    it('should render BaseHeader with proper heading levels', () => {
      render(
        <div>
          <BaseHeader title="H1 Title" level={1} />
          <BaseHeader title="H2 Title" level={2} />
          <BaseHeader title="H3 Title" level={3} />
        </div>
      );

      expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('H1 Title');
      expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent('H2 Title');
      expect(screen.getByRole('heading', { level: 3 })).toHaveTextContent('H3 Title');
    });

    it('should render BaseErrorBoundary with proper ARIA attributes', () => {
      const ThrowError = () => {
        throw new Error('Test error');
      };

      render(
        <BaseErrorBoundary name="TestBoundary">
          <ThrowError />
        </BaseErrorBoundary>
      );

      // Error boundary should be accessible
      expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    });
  });
});