import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from '../../contexts/AuthContext';
import { ErrorProvider } from '../../contexts/ErrorContext';
import { TestResultsProvider } from '../../contexts/TestResultsContext';
import { LoadingProvider } from '../../contexts/LoadingContext';
import TestButton from '../../components/common/TestButton';
import TestingModal from '../../components/modals/TestingModal';
import TestResultsDetailPage from '../../pages/TestResultsDetailPage';
import TestingService from '../../services/testingService';

// Mock API responses
const mockApiResponses = {
  meteorTest: {
    success: true,
    result: {
      id: 'test-result-1',
      scenario_id: 'scenario-123',
      test_type: 'meteor',
      score: 0.75,
      test_details: { method: 'METEOR', tokens: 25 },
      generated_text: 'Given user is on login page When user enters valid credentials Then user is redirected to dashboard',
      reference_text: 'Given user is on the login page When user provides valid email and password Then system redirects to main dashboard',
      created_at: '2024-01-01T00:00:00Z'
    }
  },
  sentenceBertTest: {
    success: true,
    result: {
      id: 'test-result-2',
      scenario_id: 'scenario-123',
      test_type: 'sentence_bert',
      score: 0.85,
      test_details: { method: 'Sentence-BERT', model: 'paraphrase-multilingual-MiniLM-L12-v2' },
      generated_text: 'Given user is on login page When user enters valid credentials Then user is redirected to dashboard',
      reference_text: 'Given user is on the login page When user provides valid email and password Then system redirects to main dashboard',
      created_at: '2024-01-01T00:00:00Z'
    }
  },
  testResults: {
    success: true,
    results: []
  }
};

// Mock services
vi.mock('../../services/testingService', () => ({
  default: {
    submitTest: vi.fn(),
    getTestResults: vi.fn(),
    formatTestResult: vi.fn(),
    validateTestRequest: vi.fn(),
    formatScore: vi.fn(),
    getQualityLevel: vi.fn(),
    getTestTypeDisplayName: vi.fn(),
    getSuggestedReferences: vi.fn(),
    getLastUsedReference: vi.fn(),
    saveScenarioReference: vi.fn()
  }
}));

// Mock router
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useParams: () => ({ scenarioId: 'scenario-123' })
  };
});

// Mock contexts
const mockTestResultsContext = {
  isScenarioTested: vi.fn(),
  getTestResult: vi.fn(),
  getAllTestResults: vi.fn(() => ({})),
  addTestResult: vi.fn(),
  updateTestResult: vi.fn(),
  clearTestResults: vi.fn()
};

vi.mock('../../contexts/TestResultsContext', () => ({
  useTestResults: () => mockTestResultsContext,
  TestResultsProvider: ({ children }) => children
}));

// Test wrapper component
const TestWrapper = ({ children }) => (
  <BrowserRouter>
    <AuthProvider>
      <ErrorProvider>
        <LoadingProvider>
          <TestResultsProvider>
            {children}
          </TestResultsProvider>
        </LoadingProvider>
      </ErrorProvider>
    </AuthProvider>
  </BrowserRouter>
);

describe('METEOR and Sentence-BERT Integration Tests', () => {
  let user;

  beforeEach(() => {
    user = userEvent.setup();
    vi.clearAllMocks();
    
    // Setup default mock implementations
    TestingService.validateTestRequest.mockReturnValue({ isValid: true, errors: [] });
    TestingService.formatScore.mockImplementation((score, type) => 
      `${Math.round(score * 100)}% (${type === 'meteor' ? 'METEOR' : 'Sentence-BERT'})`
    );
    TestingService.getQualityLevel.mockImplementation((score) => ({
      label: score >= 0.8 ? 'Excellent' : score >= 0.6 ? 'Good' : 'Fair',
      color: score >= 0.8 ? 'green' : score >= 0.6 ? 'blue' : 'yellow'
    }));
    TestingService.getTestTypeDisplayName.mockImplementation((type) => 
      type === 'meteor' ? 'METEOR' : 'Sentence-BERT'
    );
    TestingService.formatTestResult.mockImplementation((apiResult) => {
      if (!apiResult?.result) return null;
      const result = apiResult.result;
      return {
        id: result.id,
        scenarioId: result.scenario_id,
        testType: result.test_type,
        score: result.score,
        details: result.test_details,
        generatedText: result.generated_text,
        referenceText: result.reference_text,
        createdAt: result.created_at,
        formattedScore: TestingService.formatScore(result.score, result.test_type),
        qualityLevel: TestingService.getQualityLevel(result.score)
      };
    });
    TestingService.getSuggestedReferences.mockResolvedValue([]);
    TestingService.getLastUsedReference.mockResolvedValue({ data: {} });
    TestingService.saveScenarioReference.mockResolvedValue({ success: true });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('End-to-End Testing Flow', () => {
    it('should complete full testing flow from Test button to results', async () => {
      // **Feature: meteor-sentence-bert-testing, Property 1: Button State Management**
      
      // Setup: Scenario not tested initially
      mockTestResultsContext.isScenarioTested.mockReturnValue(false);
      TestingService.submitTest.mockResolvedValue(mockApiResponses.meteorTest);

      // Step 1: Render TestButton - should show "Test"
      const { rerender } = render(
        <TestWrapper>
          <TestButton
            messageId="test-message"
            scenarioIndex={0}
            scenarioText="Given user is on login page When user enters valid credentials Then user is redirected to dashboard"
            activeChatId="test-chat"
          />
        </TestWrapper>
      );

      expect(screen.getByText('Test')).toBeInTheDocument();
      expect(screen.queryByText('View Details')).not.toBeInTheDocument();

      // Step 2: Click Test button - should open TestingModal
      const testButton = screen.getByText('Test');
      await user.click(testButton);

      // Render TestingModal
      rerender(
        <TestWrapper>
          <TestingModal
            isOpen={true}
            onClose={vi.fn()}
            scenarioText="Given user is on login page When user enters valid credentials Then user is redirected to dashboard"
            scenarioId="scenario-123"
            initialTab="meteor"
          />
        </TestWrapper>
      );

      // Step 3: Verify modal structure
      expect(screen.getByText('Pengujian Kualitas Skenario')).toBeInTheDocument();
      expect(screen.getByText('METEOR')).toBeInTheDocument();
      expect(screen.getByText('Sentence-BERT')).toBeInTheDocument();
      expect(screen.getByText('Perbandingan Skenario')).toBeInTheDocument();

      // Step 4: Fill reference scenario
      const referenceTextarea = screen.getByPlaceholderText(/Masukkan skenario referensi/);
      await user.type(referenceTextarea, 'Given user is on the login page When user provides valid email and password Then system redirects to main dashboard');

      // Step 5: Submit test
      const submitButton = screen.getByRole('button', { name: /Mulai Test/ });
      expect(submitButton).not.toBeDisabled();
      
      await user.click(submitButton);

      // Step 6: Verify API call
      await waitFor(() => {
        expect(TestingService.submitTest).toHaveBeenCalledWith({
          scenarioId: 'scenario-123',
          testType: 'meteor',
          generatedText: 'Given user is on login page When user enters valid credentials Then user is redirected to dashboard',
          referenceText: 'Given user is on the login page When user provides valid email and password Then system redirects to main dashboard'
        });
      });

      // Step 7: Simulate test completion and button state change
      mockTestResultsContext.isScenarioTested.mockReturnValue(true);
      mockTestResultsContext.getTestResult.mockReturnValue({
        meteor_score: 0.75,
        timestamp: '2024-01-01T00:00:00Z'
      });

      // Re-render TestButton to show new state
      rerender(
        <TestWrapper>
          <TestButton
            messageId="test-message"
            scenarioIndex={0}
            scenarioText="Given user is on login page When user enters valid credentials Then user is redirected to dashboard"
            activeChatId="test-chat"
          />
        </TestWrapper>
      );

      // Step 8: Verify button changed to "View Details"
      expect(screen.getByText('View Details')).toBeInTheDocument();
      expect(screen.queryByText('Test')).not.toBeInTheDocument();
    });

    it('should handle cross-testing scenarios (both METEOR and Sentence-BERT)', async () => {
      // **Feature: meteor-sentence-bert-testing, Property 8: Cross-Test Data Sharing**
      
      // Setup: Mock both test results
      TestingService.submitTest
        .mockResolvedValueOnce(mockApiResponses.meteorTest)
        .mockResolvedValueOnce(mockApiResponses.sentenceBertTest);
      
      TestingService.getTestResults.mockResolvedValue({
        success: true,
        results: [mockApiResponses.meteorTest.result, mockApiResponses.sentenceBertTest.result]
      });

      // Step 1: First test (METEOR)
      render(
        <TestWrapper>
          <TestingModal
            isOpen={true}
            onClose={vi.fn()}
            scenarioText="Given user is on login page When user enters valid credentials Then user is redirected to dashboard"
            scenarioId="scenario-123"
            initialTab="meteor"
          />
        </TestWrapper>
      );

      const referenceTextarea = screen.getByPlaceholderText(/Masukkan skenario referensi/);
      const referenceText = 'Given user is on the login page When user provides valid email and password Then system redirects to main dashboard';
      
      await user.type(referenceTextarea, referenceText);
      await user.click(screen.getByRole('button', { name: /Mulai Test/ }));

      await waitFor(() => {
        expect(TestingService.submitTest).toHaveBeenCalledWith(
          expect.objectContaining({
            testType: 'meteor',
            referenceText
          })
        );
      });

      // Step 2: Switch to Sentence-BERT tab
      const sentenceBertTab = screen.getByText('Sentence-BERT');
      await user.click(sentenceBertTab);

      // Step 3: Verify reference text is preserved across tabs
      expect(screen.getByDisplayValue(referenceText)).toBeInTheDocument();

      // Step 4: Submit second test
      await user.click(screen.getByRole('button', { name: /Mulai Test/ }));

      await waitFor(() => {
        expect(TestingService.submitTest).toHaveBeenCalledWith(
          expect.objectContaining({
            testType: 'sentence_bert',
            referenceText
          })
        );
      });

      // Step 5: Verify both tests used same reference text
      const calls = TestingService.submitTest.mock.calls;
      expect(calls[0][0].referenceText).toBe(calls[1][0].referenceText);
    });

    it('should display test results correctly in detail page', async () => {
      // **Feature: meteor-sentence-bert-testing, Property 6: Detail Page Conditional Display**
      
      // Setup: Mock test results
      TestingService.getTestResults.mockResolvedValue({
        success: true,
        results: [mockApiResponses.meteorTest.result]
      });

      // Render TestResultsDetailPage
      render(
        <TestWrapper>
          <TestResultsDetailPage />
        </TestWrapper>
      );

      // Wait for results to load
      await waitFor(() => {
        expect(TestingService.getTestResults).toHaveBeenCalledWith('scenario-123');
      });

      // Verify tab structure
      expect(screen.getByText('METEOR')).toBeInTheDocument();
      expect(screen.getByText('Sentence-BERT')).toBeInTheDocument();

      // Verify METEOR tab shows results (since we have METEOR test result)
      const meteorTab = screen.getByText('METEOR');
      await user.click(meteorTab);

      // Should show test results, not "Belum dilakukan pengujian"
      await waitFor(() => {
        expect(screen.queryByText('Belum dilakukan pengujian')).not.toBeInTheDocument();
      });

      // Verify Sentence-BERT tab shows empty state
      const sentenceBertTab = screen.getByText('Sentence-BERT');
      await user.click(sentenceBertTab);

      await waitFor(() => {
        expect(screen.getByText('Belum dilakukan pengujian')).toBeInTheDocument();
        expect(screen.getByText('Mulai Pengujian')).toBeInTheDocument();
      });
    });
  });

  describe('Error Scenarios and Recovery', () => {
    it('should handle API errors gracefully', async () => {
      // **Feature: meteor-sentence-bert-testing, Property 11: Error Handling Consistency**
      
      // Setup: Mock API error
      const apiError = new Error('Network error occurred');
      TestingService.submitTest.mockRejectedValue(apiError);

      render(
        <TestWrapper>
          <TestingModal
            isOpen={true}
            onClose={vi.fn()}
            scenarioText="Given user is on login page When user enters valid credentials Then user is redirected to dashboard"
            scenarioId="scenario-123"
            initialTab="meteor"
          />
        </TestWrapper>
      );

      // Fill form and submit
      const referenceTextarea = screen.getByPlaceholderText(/Masukkan skenario referensi/);
      await user.type(referenceTextarea, 'Given user is on the login page When user provides valid email and password Then system redirects to main dashboard');
      
      const submitButton = screen.getByRole('button', { name: /Mulai Test/ });
      await user.click(submitButton);

      // Verify error is displayed
      await waitFor(() => {
        expect(screen.getByText('Terjadi Kesalahan')).toBeInTheDocument();
        expect(screen.getByText(/Network error occurred/)).toBeInTheDocument();
      });

      // Verify form is still functional after error
      expect(referenceTextarea).toBeEnabled();
      expect(submitButton).not.toBeDisabled();
    });

    it('should handle validation errors', async () => {
      // **Feature: meteor-sentence-bert-testing, Property 4: Form Validation Logic**
      
      render(
        <TestWrapper>
          <TestingModal
            isOpen={true}
            onClose={vi.fn()}
            scenarioText="Given user is on login page When user enters valid credentials Then user is redirected to dashboard"
            scenarioId="scenario-123"
            initialTab="meteor"
          />
        </TestWrapper>
      );

      // Try to submit without reference text
      const submitButton = screen.getByRole('button', { name: /Mulai Test/ });
      expect(submitButton).toBeDisabled();

      // Add invalid reference text (no Gherkin keywords)
      const referenceTextarea = screen.getByPlaceholderText(/Masukkan skenario referensi/);
      await user.type(referenceTextarea, 'This is not a valid Gherkin scenario');

      // Button should be enabled but validation should fail on submit
      expect(submitButton).not.toBeDisabled();
      await user.click(submitButton);

      // Should show validation error
      await waitFor(() => {
        expect(screen.getByText(/format Gherkin/)).toBeInTheDocument();
      });

      // Clear and add valid reference text
      await user.clear(referenceTextarea);
      await user.type(referenceTextarea, 'Given user is on the login page When user provides valid email and password Then system redirects to main dashboard');

      // Error should clear
      await waitFor(() => {
        expect(screen.queryByText(/format Gherkin/)).not.toBeInTheDocument();
      });
    });

    it('should handle test results loading errors', async () => {
      // **Feature: meteor-sentence-bert-testing, Property 11: Error Handling Consistency**
      
      // Setup: Mock API error for loading results
      const loadError = new Error('Failed to load test results');
      TestingService.getTestResults.mockRejectedValue(loadError);

      render(
        <TestWrapper>
          <TestResultsDetailPage />
        </TestWrapper>
      );

      // Wait for error to be handled
      await waitFor(() => {
        expect(TestingService.getTestResults).toHaveBeenCalledWith('scenario-123');
      });

      // Should handle error gracefully - exact error display depends on implementation
      // but should not crash the component
      expect(screen.getByText('METEOR')).toBeInTheDocument();
      expect(screen.getByText('Sentence-BERT')).toBeInTheDocument();
    });

    it('should recover from interrupted tests', async () => {
      // **Feature: meteor-sentence-bert-testing, Property 3: UI State Persistence and Synchronization**
      
      // Setup: Mock interrupted test state
      const interruptedTestData = {
        scenarioId: 'scenario-123',
        testType: 'meteor',
        referenceText: 'Given user is on the login page When user provides valid email and password Then system redirects to main dashboard',
        progress: 50
      };

      // Mock localStorage or state persistence
      const mockGetFormData = vi.fn().mockReturnValue({
        referenceScenario: interruptedTestData.referenceText,
        activeTab: interruptedTestData.testType
      });

      // Mock the persistence hook
      vi.mock('../../hooks/useTestingStatePersistence', () => ({
        default: () => ({
          startTest: vi.fn(),
          updateTestProgress: vi.fn(),
          completeTest: vi.fn(),
          saveFormData: vi.fn(),
          getFormData: mockGetFormData,
          clearFormData: vi.fn(),
          saveModalState: vi.fn(),
          getModalState: vi.fn().mockReturnValue({
            activeTab: 'meteor',
            showSuggestions: false
          }),
          clearModalState: vi.fn()
        })
      }));

      render(
        <TestWrapper>
          <TestingModal
            isOpen={true}
            onClose={vi.fn()}
            scenarioText="Given user is on login page When user enters valid credentials Then user is redirected to dashboard"
            scenarioId="scenario-123"
            initialTab="meteor"
          />
        </TestWrapper>
      );

      // Should restore the interrupted state
      await waitFor(() => {
        expect(mockGetFormData).toHaveBeenCalled();
      });

      // Verify form is restored with previous data
      const referenceTextarea = screen.getByPlaceholderText(/Masukkan skenario referensi/);
      expect(referenceTextarea.value).toBe(interruptedTestData.referenceText);
    });
  });

  describe('Form Consistency Tests', () => {
    it('should maintain consistent form structure across all entry points', async () => {
      // **Feature: meteor-sentence-bert-testing, Property 2: Form Consistency Across All Entry Points**
      
      const scenarios = [
        { initialTab: 'meteor', initialReference: '' },
        { initialTab: 'sentence_bert', initialReference: '' },
        { initialTab: 'meteor', initialReference: 'Given existing reference' }
      ];

      for (const scenario of scenarios) {
        const { unmount } = render(
          <TestWrapper>
            <TestingModal
              isOpen={true}
              onClose={vi.fn()}
              scenarioText="Given user is on login page When user enters valid credentials Then user is redirected to dashboard"
              scenarioId="scenario-123"
              initialTab={scenario.initialTab}
              initialReferenceScenario={scenario.initialReference}
            />
          </TestWrapper>
        );

        // Verify consistent structure
        expect(screen.getByText('Pengujian Kualitas Skenario')).toBeInTheDocument();
        expect(screen.getByText('METEOR')).toBeInTheDocument();
        expect(screen.getByText('Sentence-BERT')).toBeInTheDocument();
        expect(screen.getByText('Perbandingan Skenario')).toBeInTheDocument();
        expect(screen.getByText('Input Skenario Referensi')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /Mulai Test/ })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /Batal/ })).toBeInTheDocument();

        // Verify initial state
        const activeTabElement = screen.getByText(scenario.initialTab === 'meteor' ? 'METEOR' : 'Sentence-BERT');
        expect(activeTabElement.closest('button')).toHaveClass(/from-.*-600/); // Active tab styling

        if (scenario.initialReference) {
          expect(screen.getByDisplayValue(scenario.initialReference)).toBeInTheDocument();
        }

        unmount();
      }
    });

    it('should preserve UI state during tab switching', async () => {
      // **Feature: meteor-sentence-bert-testing, Property 3: UI State Persistence and Synchronization**
      
      render(
        <TestWrapper>
          <TestingModal
            isOpen={true}
            onClose={vi.fn()}
            scenarioText="Given user is on login page When user enters valid credentials Then user is redirected to dashboard"
            scenarioId="scenario-123"
            initialTab="meteor"
          />
        </TestWrapper>
      );

      // Fill reference text
      const referenceTextarea = screen.getByPlaceholderText(/Masukkan skenario referensi/);
      const referenceText = 'Given user is on the login page When user provides valid email and password Then system redirects to main dashboard';
      await user.type(referenceTextarea, referenceText);

      // Switch to Sentence-BERT tab
      const sentenceBertTab = screen.getByText('Sentence-BERT');
      await user.click(sentenceBertTab);

      // Verify reference text is preserved
      expect(screen.getByDisplayValue(referenceText)).toBeInTheDocument();

      // Switch back to METEOR tab
      const meteorTab = screen.getByText('METEOR');
      await user.click(meteorTab);

      // Verify reference text is still preserved
      expect(screen.getByDisplayValue(referenceText)).toBeInTheDocument();
    });
  });

  describe('Navigation and Data Flow', () => {
    it('should navigate correctly from View Details button', async () => {
      // **Feature: meteor-sentence-bert-testing, Property 7: Navigation and Data Flow Consistency**
      
      // Setup: Scenario is tested
      mockTestResultsContext.isScenarioTested.mockReturnValue(true);
      mockTestResultsContext.getTestResult.mockReturnValue({
        meteor_score: 0.75,
        timestamp: '2024-01-01T00:00:00Z'
      });

      render(
        <TestWrapper>
          <TestButton
            messageId="test-message"
            scenarioIndex={0}
            scenarioText="Given user is on login page When user enters valid credentials Then user is redirected to dashboard"
            activeChatId="test-chat"
          />
        </TestWrapper>
      );

      // Click View Details button
      const viewDetailsButton = screen.getByText('View Details');
      await user.click(viewDetailsButton);

      // Verify navigation
      expect(mockNavigate).toHaveBeenCalledWith('/meteor-results/test-message-0');
    });

    it('should handle test method selection correctly', async () => {
      // **Feature: meteor-sentence-bert-testing, Property 5: Test Processing and Method Selection**
      
      TestingService.submitTest.mockResolvedValue(mockApiResponses.meteorTest);

      render(
        <TestWrapper>
          <TestingModal
            isOpen={true}
            onClose={vi.fn()}
            scenarioText="Given user is on login page When user enters valid credentials Then user is redirected to dashboard"
            scenarioId="scenario-123"
            initialTab="meteor"
          />
        </TestWrapper>
      );

      // Fill reference and submit METEOR test
      const referenceTextarea = screen.getByPlaceholderText(/Masukkan skenario referensi/);
      await user.type(referenceTextarea, 'Given user is on the login page When user provides valid email and password Then system redirects to main dashboard');
      
      await user.click(screen.getByRole('button', { name: /Mulai Test/ }));

      // Verify correct method was called
      await waitFor(() => {
        expect(TestingService.submitTest).toHaveBeenCalledWith(
          expect.objectContaining({
            testType: 'meteor'
          })
        );
      });

      // Switch to Sentence-BERT and test again
      TestingService.submitTest.mockClear();
      TestingService.submitTest.mockResolvedValue(mockApiResponses.sentenceBertTest);

      const sentenceBertTab = screen.getByText('Sentence-BERT');
      await user.click(sentenceBertTab);
      
      await user.click(screen.getByRole('button', { name: /Mulai Test/ }));

      // Verify correct method was called for Sentence-BERT
      await waitFor(() => {
        expect(TestingService.submitTest).toHaveBeenCalledWith(
          expect.objectContaining({
            testType: 'sentence_bert'
          })
        );
      });
    });
  });
});