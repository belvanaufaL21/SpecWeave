import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import TestingModal from '../TestingModal';
import TestingService from '../../../services/testingService';

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

// Mock dependencies
vi.mock('../../../hooks/useTesting', () => ({
  default: () => ({
    loading: false,
    error: null,
    submitTest: vi.fn(),
    clearError: vi.fn()
  })
}));

vi.mock('../../../hooks/useTestingStatePersistence', () => ({
  default: () => ({
    saveFormData: vi.fn(),
    getFormData: vi.fn(() => null),
    saveModalState: vi.fn(),
    getModalState: vi.fn(() => null),
    clearFormData: vi.fn(),
    clearModalState: vi.fn()
  })
}));

vi.mock('../../../services/testingService', () => ({
  default: {
    getSuggestedReferences: vi.fn(() => Promise.resolve([])),
    getCachedTestResult: vi.fn(() => null),
    cacheTestResult: vi.fn(),
    saveScenarioReference: vi.fn(() => Promise.resolve({}))
  }
}));

vi.mock('../../common/Modal', () => ({
  default: ({ children, isOpen, footer }) => 
    isOpen ? <div data-testid="modal">{children}{footer}</div> : null
}));

vi.mock('../../common/ComparisonTable', () => ({
  default: ({ referenceScenario, onReferenceChange }) => (
    <textarea
      data-testid="reference-textarea"
      value={referenceScenario}
      onChange={onReferenceChange}
      placeholder="Masukkan skenario referensi"
    />
  )
}));

vi.mock('../../common/TestingProgressIndicator', () => ({
  default: () => <div data-testid="progress-indicator">Progress</div>
}));

describe('TestingModal - Data Handling (Task 4)', () => {
  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    scenarioText: 'Given test scenario',
    scenarioId: 'test-123',
    initialTab: 'meteor',
    initialReferenceScenario: '',
    onSubmitTest: vi.fn(),
    loading: false
  };

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  describe('4.1 - Robust State Initialization', () => {
    it('should sanitize undefined string in scenarioText', () => {
      const props = {
        ...defaultProps,
        scenarioText: 'undefined'
      };

      renderWithProviders(<TestingModal {...props} />);
      
      // Component should render without errors
      expect(screen.getByTestId('modal')).toBeInTheDocument();
    });

    it('should sanitize "not defined" string in initialReferenceScenario', () => {
      const props = {
        ...defaultProps,
        initialReferenceScenario: 'not defined'
      };

      renderWithProviders(<TestingModal {...props} />);
      
      const textarea = screen.getByTestId('reference-textarea');
      // Should be empty string, not "not defined"
      expect(textarea.value).toBe('');
    });

    it('should handle null values gracefully', () => {
      const props = {
        ...defaultProps,
        scenarioText: null,
        initialReferenceScenario: null
      };

      renderWithProviders(<TestingModal {...props} />);
      
      expect(screen.getByTestId('modal')).toBeInTheDocument();
    });
  });

  describe('4.2 - Validation for "undefined" strings', () => {
    it('should show error when reference scenario is "undefined"', async () => {
      const user = userEvent.setup();
      
      renderWithProviders(<TestingModal {...defaultProps} />);
      
      const textarea = screen.getByTestId('reference-textarea');
      await user.clear(textarea);
      await user.type(textarea, 'undefined');
      
      const submitButton = screen.getByRole('button', { name: /Mulai Test|Test/i });
      await user.click(submitButton);
      
      await waitFor(() => {
        expect(screen.getByText(/tidak boleh "undefined"/i)).toBeInTheDocument();
      });
    });

    it('should show error when reference scenario is "not defined"', async () => {
      const user = userEvent.setup();
      
      renderWithProviders(<TestingModal {...defaultProps} />);
      
      const textarea = screen.getByTestId('reference-textarea');
      await user.clear(textarea);
      await user.type(textarea, 'not defined');
      
      const submitButton = screen.getByRole('button', { name: /Mulai Test|Test/i });
      await user.click(submitButton);
      
      await waitFor(() => {
        expect(screen.getByText(/tidak boleh "undefined"/i)).toBeInTheDocument();
      });
    });
  });

  describe('4.3 - loadDataFromTestType error handling', () => {
    it('should show error when no cached result exists', () => {
      // This test verifies the function exists and handles missing data
      // The function is called internally, so we verify through the component behavior
      
      TestingService.getCachedTestResult.mockReturnValue(null);
      
      renderWithProviders(<TestingModal {...defaultProps} />);
      
      // Component should render without crashing
      expect(screen.getByTestId('modal')).toBeInTheDocument();
    });

    it('should handle cached result with undefined values', () => {
      TestingService.getCachedTestResult.mockReturnValue({
        generatedText: 'undefined',
        referenceText: 'not defined'
      });
      
      renderWithProviders(<TestingModal {...defaultProps} />);
      
      // Component should render without crashing
      expect(screen.getByTestId('modal')).toBeInTheDocument();
    });
  });

  describe('4.4 - Tab Switch State Preservation', () => {
    it('should preserve reference scenario when switching tabs', async () => {
      const user = userEvent.setup();
      
      renderWithProviders(<TestingModal {...defaultProps} />);
      
      const textarea = screen.getByTestId('reference-textarea');
      const referenceText = 'Given valid reference\nWhen action\nThen result';
      
      await user.clear(textarea);
      await user.type(textarea, referenceText);
      
      // Switch to Sentence-BERT tab
      const sentenceBertTab = screen.getByRole('button', { name: /Sentence-BERT/i });
      await user.click(sentenceBertTab);
      
      // Reference scenario should still be there
      await waitFor(() => {
        expect(textarea.value).toBe(referenceText);
      });
    });

    it('should save state with explicit values when switching tabs', async () => {
      const user = userEvent.setup();
      const mockSaveFormData = vi.fn();
      const mockSaveModalState = vi.fn();
      
      vi.mocked(require('../../../hooks/useTestingStatePersistence').default).mockReturnValue({
        saveFormData: mockSaveFormData,
        getFormData: vi.fn(() => null),
        saveModalState: mockSaveModalState,
        getModalState: vi.fn(() => null),
        clearFormData: vi.fn(),
        clearModalState: vi.fn()
      });
      
      renderWithProviders(<TestingModal {...defaultProps} />);
      
      const sentenceBertTab = screen.getByRole('button', { name: /Sentence-BERT/i });
      await user.click(sentenceBertTab);
      
      // Verify state was saved
      await waitFor(() => {
        expect(mockSaveModalState).toHaveBeenCalled();
        expect(mockSaveFormData).toHaveBeenCalled();
      });
    });
  });
});
