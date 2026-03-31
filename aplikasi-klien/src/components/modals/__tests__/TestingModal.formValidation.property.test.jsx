import { render, screen, fireEvent, cleanup, waitFor, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import TestingModal from '../TestingModal';

import { LoadingProvider } from '../../../contexts/LoadingContext';
import { ErrorProvider } from '../../../contexts/ErrorContext';

// Helper to render with all required providers
const renderWithProviders = (ui, options = {}) => {
  const Wrapper = ({ children }) => (
    <ErrorProvider>
      <LoadingProvider>
        {children}
      </LoadingProvider>
    </ErrorProvider>
  );
  return render(ui, { wrapper: Wrapper, ...options });
};

/**
 * Property-Based Tests for TestingModal Form Validation
 * 
 * Feature: meteor-sentence-bert-testing, Property 4: Form Validation Logic
 * Validates: Requirements 3.2, 3.3
 */

// Mock the hooks and services
vi.mock('../../../hooks/useTesting', () => ({
  default: () => ({
    loading: false,
    error: null,
    submitTest: vi.fn().mockResolvedValue({ success: true }),
    clearError: vi.fn()
  })
}));

vi.mock('../../../hooks/useTestingStatePersistence', () => ({
  default: () => ({
    startTest: vi.fn(),
    updateTestProgress: vi.fn(),
    completeTest: vi.fn(),
    saveFormData: vi.fn(),
    getFormData: vi.fn().mockReturnValue(null),
    clearFormData: vi.fn(),
    saveModalState: vi.fn(),
    getModalState: vi.fn().mockReturnValue(null),
    clearModalState: vi.fn()
  })
}));

vi.mock('../../../services/testingService', () => ({
  default: {
    getLastUsedReference: vi.fn().mockResolvedValue({ data: { lastUsedReference: null } }),
    getSuggestedReferences: vi.fn().mockResolvedValue([]),
    saveScenarioReference: vi.fn().mockResolvedValue({ success: true })
  }
}));

// Mock framer-motion to avoid animation issues in tests
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }) => <div {...props}>{children}</div>
  },
  AnimatePresence: ({ children }) => children
}));

describe('TestingModal Form Validation Property Tests', () => {
  
  // Aggressive DOM cleanup for property-based testing
  beforeEach(() => {
    document.body.innerHTML = '';
    cleanup();
    vi.clearAllMocks();
    localStorage.clear();
  });
  
  afterEach(() => {
    cleanup();
    document.body.innerHTML = '';
  });

  /**
   * Property 4.1: Basic Validation Works
   * Simple test to verify core validation logic works
   */
  it('Property 4.1: Basic Validation Works', async () => {
    const props = {
      isOpen: true,
      onClose: vi.fn(),
      scenarioText: 'Given test When test Then test',
      scenarioId: 'test-123',
      initialTab: 'meteor',
      initialReferenceScenario: '',
      onSubmitTest: vi.fn(),
      loading: false
    };

    await act(async () => {
      renderWithProviders(<TestingModal {...props} />);
    });

    await waitFor(() => {
      expect(screen.getByText('Pengujian Kualitas Skenario')).toBeInTheDocument();
    }, { timeout: 5000 });

    const textarea = screen.getByPlaceholderText(/Masukkan skenario referensi/i);
    const submitButton = screen.getByRole('button', { name: /Mulai Test|Test/i });

    // Initially empty - should be disabled
    expect(submitButton).toBeDisabled();

    // Add content - should be enabled
    await act(async () => {
      fireEvent.change(textarea, { target: { value: 'Given test content' } });
    });
    
    // Wait for button state to update
    await waitFor(() => {
      expect(submitButton).not.toBeDisabled();
    }, { timeout: 3000 });

    // Clear content - should be disabled again
    await act(async () => {
      fireEvent.change(textarea, { target: { value: '' } });
    });
    
    await waitFor(() => {
      expect(submitButton).toBeDisabled();
    }, { timeout: 3000 });
  }, 15000);

  /**
   * Property 4.2: Whitespace Validation
   * Test that whitespace-only input keeps button disabled
   */
  it('Property 4.2: Whitespace Validation', async () => {
    const props = {
      isOpen: true,
      onClose: vi.fn(),
      scenarioText: 'Given test When test Then test',
      scenarioId: 'test-123',
      initialTab: 'meteor',
      initialReferenceScenario: '',
      onSubmitTest: vi.fn(),
      loading: false
    };

    await act(async () => {
      renderWithProviders(<TestingModal {...props} />);
    });

    await waitFor(() => {
      expect(screen.getByText('Pengujian Kualitas Skenario')).toBeInTheDocument();
    }, { timeout: 5000 });

    const textarea = screen.getByPlaceholderText(/Masukkan skenario referensi/i);
    const submitButton = screen.getByRole('button', { name: /Mulai Test|Test/i });

    // Test whitespace-only input - button should remain disabled
    const whitespaceInputs = ['   ', '\t\t', '\n\n', '  \t\n  '];
    
    for (const whitespace of whitespaceInputs) {
      await act(async () => {
        fireEvent.change(textarea, { target: { value: whitespace } });
      });
      
      // Give some time for state update
      await new Promise(resolve => setTimeout(resolve, 100));

      // Button should still be disabled for whitespace-only input
      expect(submitButton).toBeDisabled();
    }
  }, 10000);

  /**
   * Property 4.3: Non-empty Content Enables Button
   * Test that any non-whitespace content enables the button
   */
  it('Property 4.3: Non-empty Content Enables Button', async () => {
    const props = {
      isOpen: true,
      onClose: vi.fn(),
      scenarioText: 'Given test When test Then test',
      scenarioId: 'test-123',
      initialTab: 'meteor',
      initialReferenceScenario: '',
      onSubmitTest: vi.fn(),
      loading: false
    };

    await act(async () => {
      renderWithProviders(<TestingModal {...props} />);
    });

    await waitFor(() => {
      expect(screen.getByText('Pengujian Kualitas Skenario')).toBeInTheDocument();
    }, { timeout: 5000 });

    const textarea = screen.getByPlaceholderText(/Masukkan skenario referensi/i);
    const submitButton = screen.getByRole('button', { name: /Mulai Test|Test/i });

    // Test various non-empty inputs - button should be enabled
    const validInputs = ['a', 'Given', 'test content', 'Given test When test Then test'];
    
    for (const input of validInputs) {
      await act(async () => {
        fireEvent.change(textarea, { target: { value: input } });
      });
      
      await waitFor(() => {
        expect(submitButton).not.toBeDisabled();
      }, { timeout: 2000 });
    }
  }, 15000);
});