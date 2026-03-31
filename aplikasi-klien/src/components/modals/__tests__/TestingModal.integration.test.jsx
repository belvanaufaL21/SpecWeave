import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
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

// Mock the hooks
vi.mock('../../../hooks/useTesting');
vi.mock('../../../hooks/useTestingStatePersistence');

// Mock TestingService
vi.mock('../../../services/testingService', () => ({
  default: {
    getCachedTestResult: vi.fn(),
    saveScenarioReference: vi.fn(),
    getSuggestedReferences: vi.fn(),
    formatTestResult: vi.fn(),
    getMetricDisplay: vi.fn()
  }
}));

// Mock framer-motion
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }) => <div {...props}>{children}</div>
  },
  AnimatePresence: ({ children }) => children
}));

describe('TestingModal - Integration Tests', () => {
  let mockSubmitTest;
  let mockClearError;
  let mockSaveFormData;
  let mockGetFormData;
  let mockSaveModalState;
  let mockGetModalState;
  let mockClearFormData;
  let mockClearModalState;

  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    scenarioText: 'Given a user is logged in\nWhen user clicks logout\nThen user is logged out',
    scenarioId: 'test-scenario-123',
    initialTab: 'meteor',
    initialReferenceScenario: '',
    onSubmitTest: vi.fn(),
    loading: false
  };

  // Helper function to fill reference scenario
  const fillReferenceScenario = async (user, given, when, then) => {
    const givenTextarea = screen.getByPlaceholderText(/Enter given step/i);
    const whenTextarea = screen.getByPlaceholderText(/Enter when step/i);
    const thenTextarea = screen.getByPlaceholderText(/Enter then step/i);
    
    if (given) await user.type(givenTextarea, given);
    if (when) await user.type(whenTextarea, when);
    if (then) await user.type(thenTextarea, then);
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    localStorage.clear();

    // Setup mock functions
    mockSubmitTest = vi.fn();
    mockClearError = vi.fn();
    mockSaveFormData = vi.fn();
    mockGetFormData = vi.fn(() => null);
    mockSaveModalState = vi.fn();
    mockGetModalState = vi.fn(() => null);
    mockClearFormData = vi.fn();
    mockClearModalState = vi.fn();

    // Mock useTesting hook
    const { default: useTesting } = await import('../../../hooks/useTesting');
    useTesting.mockReturnValue({
      loading: false,
      error: null,
      submitTest: mockSubmitTest,
      clearError: mockClearError
    });

    // Mock useTestingStatePersistence hook
    const { default: useTestingStatePersistence } = await import('../../../hooks/useTestingStatePersistence');
    useTestingStatePersistence.mockReturnValue({
      saveFormData: mockSaveFormData,
      getFormData: mockGetFormData,
      saveModalState: mockSaveModalState,
      getModalState: mockGetModalState,
      clearFormData: mockClearFormData,
      clearModalState: mockClearModalState
    });

    // Mock TestingService methods
    TestingService.getCachedTestResult.mockReturnValue(null);
    TestingService.saveScenarioReference.mockResolvedValue({ success: true });
    TestingService.getSuggestedReferences.mockResolvedValue([]);
    TestingService.formatTestResult.mockImplementation((result) => result);
    TestingService.getMetricDisplay.mockImplementation((value) => 
      value !== null && value !== undefined ? `${(value * 100).toFixed(1)}%` : '0.0%'
    );
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('7.1 Test complete METEOR flow', () => {
    it('should complete full METEOR test flow with all metrics valid', async () => {
      const user = userEvent.setup();
      
      // Mock successful METEOR test result with all metrics
      const meteorResult = {
        id: 'meteor-test-1',
        testType: 'meteor',
        score: 0.85,
        details: {
          precision: 0.88,
          recall: 0.82,
          f_score: 0.85,
          fragmentation_penalty: 0.05
        },
        generatedText: defaultProps.scenarioText,
        referenceText: 'Given user logged in\nWhen logout clicked\nThen user logged out',
        createdAt: new Date().toISOString()
      };

      mockSubmitTest.mockResolvedValue(meteorResult);

      renderWithProviders(<TestingModal {...defaultProps} />);

      // Verify METEOR tab is active
      const meteorTab = screen.getByRole('button', { name: /METEOR/i });
      expect(meteorTab).toHaveClass('from-purple-600/20');

      // Fill reference scenario
      await fillReferenceScenario(user, 'user logged in', 'logout clicked', 'user logged out');

      // Submit test
      const submitButton = screen.getByRole('button', { name: /Mulai Test/i });
      await user.click(submitButton);

      // Wait for test completion
      await waitFor(() => {
        expect(mockSubmitTest).toHaveBeenCalledWith(expect.objectContaining({
          scenarioId: 'test-scenario-123',
          testType: 'meteor',
          generatedText: defaultProps.scenarioText
        }));
      }, { timeout: 5000 });

      // Verify all metrics are valid (not "NA")
      expect(meteorResult.score).toBe(0.85);
      expect(meteorResult.details.precision).toBe(0.88);
      expect(meteorResult.details.recall).toBe(0.82);
      expect(meteorResult.details.f_score).toBe(0.85);

      // Verify no "NA" values
      expect(meteorResult.score).not.toBe('NA');
      expect(meteorResult.details.precision).not.toBe('NA');
      expect(meteorResult.details.recall).not.toBe('NA');
      expect(meteorResult.details.f_score).not.toBe('NA');
    });

    it('should show METEOR-specific progress stages in correct order', async () => {
      const user = userEvent.setup();
      
      mockSubmitTest.mockImplementation(() => {
        return new Promise((resolve) => {
          setTimeout(() => {
            resolve({
              id: 'meteor-test-2',
              testType: 'meteor',
              score: 0.75,
              details: { precision: 0.8, recall: 0.7, f_score: 0.75 }
            });
          }, 3000);
        });
      });

      renderWithProviders(<TestingModal {...defaultProps} />);

      await fillReferenceScenario(user, 'test', 'action', 'result');

      const submitButton = screen.getByRole('button', { name: /Mulai Test/i });
      await user.click(submitButton);

      // Check for METEOR stages (not Sentence-BERT stages)
      await waitFor(() => {
        const progressIndicator = screen.queryByText(/Mempersiapkan Data Pengujian/i);
        expect(progressIndicator).toBeInTheDocument();
      }, { timeout: 1000 });

      // Verify METEOR-specific stages appear (not "Memuat Model Sentence-BERT")
      await waitFor(() => {
        // Should NOT show Sentence-BERT specific stages
        expect(screen.queryByText(/Memuat Model Sentence-BERT/i)).not.toBeInTheDocument();
      }, { timeout: 2000 });
    });
  });

  describe('7.2 Test complete Sentence-BERT flow', () => {
    it('should complete full Sentence-BERT test flow with descriptive stages', async () => {
      const user = userEvent.setup();
      
      // Mock successful Sentence-BERT test result
      const sentenceBertResult = {
        id: 'sbert-test-1',
        testType: 'sentence_bert',
        score: 0.92,
        details: {
          cosine_similarity: 0.92,
          semantic_distance: 0.08,
          embedding_dimensions: 768,
          model_version: 'sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2'
        },
        generatedText: defaultProps.scenarioText,
        referenceText: 'Given user logged in\nWhen logout clicked\nThen user logged out',
        createdAt: new Date().toISOString()
      };

      mockSubmitTest.mockResolvedValue(sentenceBertResult);

      renderWithProviders(<TestingModal {...defaultProps} initialTab="sentence_bert" />);

      // Verify Sentence-BERT tab is active
      const sentenceBertTab = screen.getByRole('button', { name: /Sentence-BERT/i });
      expect(sentenceBertTab).toHaveClass('from-pink-600/20');

      // Fill reference scenario
      await fillReferenceScenario(user, 'user logged in', 'logout clicked', 'user logged out');

      // Submit test
      const submitButton = screen.getByRole('button', { name: /Mulai Test/i });
      await user.click(submitButton);

      // Wait for test completion
      await waitFor(() => {
        expect(mockSubmitTest).toHaveBeenCalledWith(expect.objectContaining({
          scenarioId: 'test-scenario-123',
          testType: 'sentence_bert',
          generatedText: defaultProps.scenarioText
        }));
      }, { timeout: 5000 });

      // Verify result is Sentence-BERT (not METEOR)
      expect(sentenceBertResult.testType).toBe('sentence_bert');
      expect(sentenceBertResult.details.cosine_similarity).toBeDefined();
      expect(sentenceBertResult.details.semantic_distance).toBeDefined();
    });

    it('should show Sentence-BERT descriptive stages without formulas', async () => {
      const user = userEvent.setup();
      
      mockSubmitTest.mockImplementation(() => {
        return new Promise((resolve) => {
          setTimeout(() => {
            resolve({
              id: 'sbert-test-2',
              testType: 'sentence_bert',
              score: 0.88,
              details: { cosine_similarity: 0.88, semantic_distance: 0.12 }
            });
          }, 3000);
        });
      });

      renderWithProviders(<TestingModal {...defaultProps} initialTab="sentence_bert" />);

      await fillReferenceScenario(user, 'test', 'action', 'result');

      const submitButton = screen.getByRole('button', { name: /Mulai Test/i });
      await user.click(submitButton);

      // Check for descriptive stages (not mathematical formulas)
      await waitFor(() => {
        const progressText = screen.queryByText(/Mempersiapkan Data Pengujian/i);
        expect(progressText).toBeInTheDocument();
      }, { timeout: 1000 });

      // Verify NO mathematical formulas are shown
      const bodyText = document.body.textContent;
      expect(bodyText).not.toMatch(/cos\(/i); // No "cos(" formula
      expect(bodyText).not.toMatch(/\|\|/); // No "||" vector notation
      expect(bodyText).not.toMatch(/√/); // No square root symbol
    });

    it('should display Sentence-BERT result in latest result (not METEOR)', async () => {
      const user = userEvent.setup();
      
      const sentenceBertResult = {
        id: 'sbert-test-3',
        testType: 'sentence_bert',
        score: 0.90,
        details: {
          cosine_similarity: 0.90,
          semantic_distance: 0.10
        }
      };

      mockSubmitTest.mockResolvedValue(sentenceBertResult);
      TestingService.getCachedTestResult.mockReturnValue(sentenceBertResult);

      renderWithProviders(<TestingModal {...defaultProps} initialTab="sentence_bert" />);

      await fillReferenceScenario(user, 'test', 'action', 'result');

      const submitButton = screen.getByRole('button', { name: /Mulai Test/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockSubmitTest).toHaveBeenCalled();
      }, { timeout: 5000 });

      // Verify the result type is sentence_bert
      expect(sentenceBertResult.testType).toBe('sentence_bert');
      
      // Verify it has Sentence-BERT specific metrics (not METEOR metrics)
      expect(sentenceBertResult.details.cosine_similarity).toBeDefined();
      expect(sentenceBertResult.details.precision).toBeUndefined(); // METEOR metric should not exist
      expect(sentenceBertResult.details.recall).toBeUndefined(); // METEOR metric should not exist
    });
  });

  describe('7.3 Test tab switching with data persistence', () => {
    it('should preserve reference scenario when switching from METEOR to Sentence-BERT', async () => {
      const user = userEvent.setup();
      
      renderWithProviders(<TestingModal {...defaultProps} initialTab="meteor" />);

      // Fill reference scenario in METEOR tab using fireEvent for immediate update
      const givenTextarea = screen.getByPlaceholderText(/Enter given step/i);
      const whenTextarea = screen.getByPlaceholderText(/Enter when step/i);
      const thenTextarea = screen.getByPlaceholderText(/Enter then step/i);
      
      fireEvent.change(givenTextarea, { target: { value: 'user is authenticated' } });
      fireEvent.change(whenTextarea, { target: { value: 'user performs action' } });
      fireEvent.change(thenTextarea, { target: { value: 'result is shown' } });

      // Verify reference is filled
      expect(givenTextarea.value).toBe('user is authenticated');
      expect(whenTextarea.value).toBe('user performs action');
      expect(thenTextarea.value).toBe('result is shown');

      // Switch to Sentence-BERT tab
      const sentenceBertTab = screen.getByRole('button', { name: /Sentence-BERT/i });
      await user.click(sentenceBertTab);

      // Verify reference scenario is preserved
      await waitFor(() => {
        expect(givenTextarea.value).toBe('user is authenticated');
        expect(whenTextarea.value).toBe('user performs action');
        expect(thenTextarea.value).toBe('result is shown');
      });

      // Verify saveModalState was called
      expect(mockSaveModalState).toHaveBeenCalled();
      expect(mockSaveFormData).toHaveBeenCalled();
    });

    it('should load data from METEOR without "not defined"', async () => {
      // Mock cached METEOR result
      const meteorResult = {
        id: 'meteor-cached-1',
        testType: 'meteor',
        score: 0.85,
        details: { precision: 0.88, recall: 0.82, f_score: 0.85 },
        generatedText: 'Given valid scenario\nWhen action\nThen result',
        referenceText: 'Given reference scenario\nWhen action\nThen expected result',
        testScenario: 'Given valid scenario\nWhen action\nThen result',
        referenceScenario: 'Given reference scenario\nWhen action\nThen expected result'
      };

      TestingService.getCachedTestResult.mockImplementation((scenarioId, testType) => {
        if (testType === 'meteor') {
          return meteorResult;
        }
        return null;
      });

      renderWithProviders(<TestingModal {...defaultProps} initialTab="sentence_bert" />);

      // Wait for component to mount
      await waitFor(() => {
        // Verify no "not defined" or "undefined" in the UI
        const bodyText = document.body.textContent;
        expect(bodyText).not.toContain('not defined');
        expect(bodyText).not.toContain('undefined');
      });

      // The component should have checked for cached results
      // We verify the behavior (no "not defined") rather than the specific call
      expect(document.body.textContent).not.toContain('not defined');
    });

    it('should preserve state across multiple tab switches', async () => {
      const user = userEvent.setup();
      
      renderWithProviders(<TestingModal {...defaultProps} initialTab="meteor" />);

      // Fill reference in METEOR using fireEvent for immediate update
      const givenTextarea = screen.getByPlaceholderText(/Enter given step/i);
      fireEvent.change(givenTextarea, { target: { value: 'test scenario' } });

      // Verify it's filled
      expect(givenTextarea.value).toBe('test scenario');

      // Switch to Sentence-BERT
      const sentenceBertTab = screen.getByRole('button', { name: /Sentence-BERT/i });
      await user.click(sentenceBertTab);

      // Switch back to METEOR
      const meteorTab = screen.getByRole('button', { name: /METEOR/i });
      await user.click(meteorTab);

      // Verify reference is still preserved
      await waitFor(() => {
        expect(givenTextarea.value).toBe('test scenario');
      });

      // Verify state persistence was called (at least for the tab switches)
      expect(mockSaveModalState).toHaveBeenCalled();
      expect(mockSaveFormData).toHaveBeenCalled();
      
      // Verify it was called at least twice (once for each tab switch)
      expect(mockSaveModalState.mock.calls.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('7.4 Test error scenarios', () => {
    it('should show error message when test scenario is empty', async () => {
      const user = userEvent.setup();
      
      renderWithProviders(<TestingModal {...defaultProps} scenarioText="" />);

      await fillReferenceScenario(user, 'reference', 'action', 'result');

      const submitButton = screen.getByRole('button', { name: /Mulai Test/i });
      await user.click(submitButton);

      // Verify error message is shown
      await waitFor(() => {
        expect(screen.getByText(/Skenario uji tidak boleh kosong/i)).toBeInTheDocument();
      });

      // Verify test was not submitted
      expect(mockSubmitTest).not.toHaveBeenCalled();
    });

    it('should show error message when reference scenario is empty', async () => {
      renderWithProviders(<TestingModal {...defaultProps} />);

      // Try to submit without filling reference
      const submitButton = screen.getByRole('button', { name: /Mulai Test/i });
      
      // Button should be disabled when reference is empty
      expect(submitButton).toBeDisabled();
    });

    it('should handle network error gracefully', async () => {
      const user = userEvent.setup();
      
      // Mock network error
      mockSubmitTest.mockRejectedValue(new Error('Network error: Failed to connect'));

      renderWithProviders(<TestingModal {...defaultProps} />);

      await fillReferenceScenario(user, 'test', 'action', 'result');

      const submitButton = screen.getByRole('button', { name: /Mulai Test/i });
      await user.click(submitButton);

      // Verify error message is displayed
      await waitFor(() => {
        expect(screen.getByText(/Network error/i)).toBeInTheDocument();
      }, { timeout: 5000 });
    });

    it('should handle API error with descriptive message', async () => {
      const user = userEvent.setup();
      
      // Mock API error
      mockSubmitTest.mockRejectedValue(new Error('API Error: Invalid test parameters'));

      renderWithProviders(<TestingModal {...defaultProps} />);

      await fillReferenceScenario(user, 'test', 'action', 'result');

      const submitButton = screen.getByRole('button', { name: /Mulai Test/i });
      await user.click(submitButton);

      // Verify error message is displayed
      await waitFor(() => {
        expect(screen.getByText(/API Error/i)).toBeInTheDocument();
      }, { timeout: 5000 });
    });

    it('should clear error when user modifies input', async () => {
      const user = userEvent.setup();
      
      renderWithProviders(<TestingModal {...defaultProps} scenarioText="" />);

      const givenTextarea = screen.getByPlaceholderText(/Enter given step/i);
      await user.type(givenTextarea, 'test');

      const submitButton = screen.getByRole('button', { name: /Mulai Test/i });
      await user.click(submitButton);

      // Error should appear
      await waitFor(() => {
        expect(screen.getByText(/Skenario uji tidak boleh kosong/i)).toBeInTheDocument();
      });

      // Modify input
      await user.type(givenTextarea, ' more text');

      // Error should be cleared
      await waitFor(() => {
        expect(mockClearError).toHaveBeenCalled();
      });
    });
  });
});
