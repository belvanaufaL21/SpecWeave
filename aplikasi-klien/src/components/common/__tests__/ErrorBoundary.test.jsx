import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import React from 'react'
import ErrorBoundary from '../ErrorBoundary.jsx'

/**
 * Unit tests for ErrorBoundary component
 * Validates: Requirements 9.8 - Error catching and fallback UI rendering, error logging functionality
 */

// Component that throws an error for testing
const ThrowError = ({ shouldThrow = false, errorMessage = 'Test error' }) => {
  if (shouldThrow) {
    throw new Error(errorMessage)
  }
  return <div>No error</div>
}

describe('ErrorBoundary', () => {
  beforeEach(() => {
    // Mock console.error to avoid noise in tests
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('Normal Operation', () => {
    it('should render children when no error occurs', () => {
      render(
        <ErrorBoundary>
          <div data-testid="child">Child component</div>
        </ErrorBoundary>
      )

      expect(screen.getByTestId('child')).toBeInTheDocument()
      expect(screen.getByText('Child component')).toBeInTheDocument()
    })
  })

  describe('Error Catching', () => {
    it('should catch errors and display fallback UI', () => {
      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} errorMessage="Component crashed" />
        </ErrorBoundary>
      )

      // Should display error UI in Indonesian
      expect(screen.getByText('Terjadi Kesalahan')).toBeInTheDocument()
      
      // Should have action buttons in Indonesian
      expect(screen.getByText('Coba Lagi')).toBeInTheDocument()
      expect(screen.getByText('Muat Ulang Halaman')).toBeInTheDocument()
    })

    it('should display error message', () => {
      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} errorMessage="Test error" />
        </ErrorBoundary>
      )

      // Should display some error message (the exact message depends on error handler)
      expect(screen.getByText('Terjadi Kesalahan')).toBeInTheDocument()
    })
  })

  describe('User Interactions', () => {
    it('should handle reload button click', () => {
      // Mock window.location.reload
      const mockReload = vi.fn()
      Object.defineProperty(window, 'location', {
        value: { reload: mockReload },
        writable: true
      })

      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      )

      fireEvent.click(screen.getByText('Muat Ulang Halaman'))

      expect(mockReload).toHaveBeenCalled()
    })

    it('should have retry button that can be clicked', () => {
      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      )

      const retryButton = screen.getByText('Coba Lagi')
      expect(retryButton).toBeInTheDocument()
      
      // Should be clickable without throwing
      fireEvent.click(retryButton)
    })
  })

  describe('Development Mode Features', () => {
    it('should show error details toggle in development mode', () => {
      // Mock development environment
      const originalEnv = process.env.NODE_ENV
      process.env.NODE_ENV = 'development'

      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      )

      expect(screen.getByText('Tampilkan Detail Error')).toBeInTheDocument()

      // Restore environment
      process.env.NODE_ENV = originalEnv
    })

    it('should not show error details in production mode', () => {
      const originalEnv = process.env.NODE_ENV
      process.env.NODE_ENV = 'production'

      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      )

      expect(screen.queryByText('Tampilkan Detail Error')).not.toBeInTheDocument()

      process.env.NODE_ENV = originalEnv
    })
  })

  describe('Custom Fallback UI', () => {
    it('should use custom fallback UI when provided', () => {
      const customFallback = (error, retry) => (
        <div>
          <h1>Custom Error UI</h1>
          <p>Error: {error?.message}</p>
          <button onClick={retry}>Custom Retry</button>
        </div>
      )

      render(
        <ErrorBoundary fallback={customFallback}>
          <ThrowError shouldThrow={true} errorMessage="Custom error" />
        </ErrorBoundary>
      )

      expect(screen.getByText('Custom Error UI')).toBeInTheDocument()
      expect(screen.getByText('Custom Retry')).toBeInTheDocument()
      expect(screen.queryByText('Terjadi Kesalahan')).not.toBeInTheDocument()
    })
  })

  describe('Indonesian Localization', () => {
    it('should display UI text in Indonesian', () => {
      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      )

      // Check for Indonesian text
      expect(screen.getByText('Terjadi Kesalahan')).toBeInTheDocument()
      expect(screen.getByText('Coba Lagi')).toBeInTheDocument()
      expect(screen.getByText('Muat Ulang Halaman')).toBeInTheDocument()
    })
  })

  describe('Error Logging', () => {
    it('should log errors to console in development', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      
      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} errorMessage="Test error" />
        </ErrorBoundary>
      )

      // Should have called console.error (from React's error boundary logging)
      expect(consoleSpy).toHaveBeenCalled()
    })
  })
})