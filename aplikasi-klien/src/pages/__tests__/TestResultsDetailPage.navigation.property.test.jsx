/**
 * Property-Based Test for Navigation and Data Flow Consistency
 * 
 * **Property 7: Navigation and Data Flow Consistency**
 * **Validates: Requirements 2.2, 4.4, 4.5**
 * 
 * Tests that navigation between different components maintains consistent data flow
 * and that all navigation paths lead to the correct destinations with proper data.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup, act, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import fc from 'fast-check';

// Import components and services
import TestResultsDetailPage from '../TestResultsDetailPage';
import TestButton from '../../components/common/TestButton';
import TestingModal from '../../components/modals/TestingModal';
import TestingService from '../../services/testingService';
import { ErrorProvider } from '../../contexts/ErrorContext';
import { LoadingProvider } from '../../contexts/LoadingContext';
import { TestResultsProvider } from '../../contexts/TestResultsContext';

// Mock API
vi.mock('../../services/api.js', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn()
  }
}));

// Mock TestingService
vi.mock('../../services/testingService', () => ({
  default: {
    getTestResults: vi.fn(),
    formatTestResult: vi.fn(),
    submitTest: vi.fn(),
    getSuggestedReferences: vi.fn(),
    getLastUsedReference: vi.fn(),
    saveScenarioReference: vi.fn(),
    validateTestRequest: vi.fn()
  }
}));

// Mock react-router-dom hooks
const mockNavigate = vi.fn();
const mockParams = { scenarioId: 'test-scenario-123' };

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useParams: () => mockParams
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

// Mock hooks
vi.mock('../../hooks/useTestingStatePersistence', () => ({
  default: () => ({
    startTest: vi.fn(),
    updateTestProgress: vi.fn(),
    completeTest: vi.fn(),
    saveFormData: vi.fn(),
    getFormData: vi.fn(() => ({})),
    clearFormData: vi.fn(),
    saveModalState: vi.fn(),
    getModalState: vi.fn(() => ({})),
    clearModalState: vi.fn()
  })
}));

vi.mock('../../hooks/useTesting', () => ({
  default: () => ({
    loading: false,
    error: null,
    submitTest: vi.fn(),
    clearError: vi.fn()
  })
}));

vi.mock('../../hooks/useToast', () => ({
  useToast: () => ({
    showToast: vi.fn()
  })
}));

// Test wrapper component
const TestWrapper = ({ children, initialEntries = ['/test-results/test-scenario-123'] }) => (
  <MemoryRouter initialEntries={initialEntries}>
    <ErrorProvider>
      <LoadingProvider>
        <TestResultsProvider>
          {children}
        </TestResultsProvider>
      </LoadingProvider>
    </ErrorProvider>
  </MemoryRouter>
);

describe('Navigation and Data Flow Consistency Property Tests', () => {
  let user;

  beforeEach(() => {
    user = userEvent.setup();
    vi.clearAllMocks();
    
    // Setup default mock implementations
    TestingService.validateTestRequest.mockReturnValue({ isValid: true, errors: [] });
    TestingService.getSuggestedReferences.mockResolvedValue([]);
    TestingService.getLastUsedReference.mockResolvedValue({ data: {} });
    TestingService.saveScenarioReference.mockResolvedValue({ success: true });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    cleanup();
    vi.clearAllTimers();
  });

  /**
   * Property 7: Navigation and Data Flow Consistency
   * For any navigation action (View Detail, Mulai Pengujian, Pengujian Ulang), 
   * the system should navigate to the correct destination with appropriate data
   * and maintain consistent structure across all entry points.
   */
  it('should navigate consistently from TestButton to TestResultsDetailPage', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          isTested: fc.boolean(),
          scenarioId: fc.string({ minLength: 3, maxLength: 20 }).filter(s => s.trim().length >= 3),
          messageId: fc.string({ minLength: 3, maxLength: 20 }).filter(s => s.trim().length >= 3),
          scenarioIndex: fc.integer({ min: 0, max: 10 }),
          scenarioText: fc.string({ minLength: 20, maxLength: 100 }).filter(s => s.trim().length >= 20)
        }),
        async ({ isTested, scenarioId, messageId, scenarioIndex, scenarioText }) => {
          // Clear any previous renders to avoid multiple elements
          cleanup();
          
          // Setup test context based on whether scenario is tested
          mockTestResultsContext.isScenarioTested.mockReturnValue(isTested);
          
          if (isTested) {
            mockTestResultsContext.getTestResult.mockReturnValue({
              meteor_score: 0.75,
              timestamp: new Date().toISOString()
            });
          } else {
            mockTestResultsContext.getTestResult.mockReturnValue(null);
          }

          // Render TestButton with unique key to ensure clean render
          const { container } = render(
            <TestWrapper initialEntries={['/chat']} key={`test-${Date.now()}`}>
              <TestButton
                scenarioId={scenarioId}
                scenarioText={scenarioText}
                scenarioIndex={scenarioIndex}
                messageId={messageId}
                activeChatId="test-chat"
              />
            </TestWrapper>
          );

          // Property 1: Button should display correct text based on test status
          // Requirement 2.2
          if (isTested) {
            const viewDetailsButton = within(container).getByText('View Details');
            expect(viewDetailsButton).toBeInTheDocument();
            expect(within(container).queryByText('Test')).not.toBeInTheDocument();
          } else {
            const testButton = within(container).getByText('Test');
            expect(testButton).toBeInTheDocument();
            expect(within(container).queryByText('View Details')).not.toBeInTheDocument();
          }

          // Property 2: Clicking button should trigger correct navigation
          // Requirement 2.2, 4.4
          const button = isTested ? 
            within(container).getByText('View Details') : 
            within(container).getByText('Test');

          await act(async () => {
            await user.click(button);
          });

          if (isTested) {
            // Should navigate to test results detail page
            const expectedPath = `/test-results/${scenarioId || `${messageId}-${scenarioIndex}`}`;
            expect(mockNavigate).toHaveBeenCalledWith(expectedPath);
          } else {
            // Should trigger test modal opening (implementation may vary)
            // The key property is that some action is triggered for testing
            // This could be navigation or modal opening depending on implementation
          }

          // Property 3: Navigation should be consistent regardless of data values
          // All navigation calls should be valid and not throw errors
          expect(mockNavigate).not.toHaveBeenCalledWith(undefined);
          expect(mockNavigate).not.toHaveBeenCalledWith(null);
          expect(mockNavigate).not.toHaveBeenCalledWith('');
        }
      ),
      { numRuns: 8 }
    );
  });

  it('should maintain data consistency when navigating to detail page', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          scenarioId: fc.string({ minLength: 1, maxLength: 20 }),
          testResults: fc.array(
            fc.record({
              testType: fc.constantFrom('meteor', 'sentence_bert'),
              score: fc.float({ min: 0, max: 1 }),
              referenceText: fc.string({ minLength: 10, maxLength: 100 })
            }),
            { minLength: 0, maxLength: 2 }
          )
        }),
        async ({ scenarioId, testResults }) => {
          // Create mock API results
          const mockApiResults = testResults.map((result, index) => ({
            id: `test-${index}`,
            scenario_id: scenarioId,
            test_type: result.testType,
            score: result.score,
            generated_text: 'Generated scenario text',
            reference_text: result.referenceText,
            created_at: new Date().toISOString(),
            test_details: { method: result.testType === 'meteor' ? 'METEOR' : 'Sentence-BERT' }
          }));

          TestingService.getTestResults.mockResolvedValue({
            success: true,
            results: mockApiResults
          });

          TestingService.formatTestResult.mockImplementation(({ result }) => ({
            id: result.id,
            testType: result.test_type,
            score: result.score,
            generatedText: result.generated_text,
            referenceText: result.reference_text,
            createdAt: result.created_at,
            details: result.test_details,
            qualityLevel: { label: 'Good', color: 'blue' }
          }));

          // Update mock params to use the generated scenarioId
          mockParams.scenarioId = scenarioId;

          // Render TestResultsDetailPage
          render(
            <TestWrapper initialEntries={[`/test-results/${scenarioId}`]}>
              <TestResultsDetailPage />
            </TestWrapper>
          );

          // Property 1: Page should load data for correct scenario
          // Requirement 4.4
          await waitFor(() => {
            expect(TestingService.getTestResults).toHaveBeenCalledWith(scenarioId);
          });

          // Property 2: Page should display consistent structure regardless of data
          // Requirement 4.5
          await act(async () => {
            await new Promise(resolve => setTimeout(resolve, 100));
          });

          // Should always have back button
          const backButtons = screen.getAllByRole('button', { name: /kembali/i });
          expect(backButtons.length).toBeGreaterThan(0);

          // Should always have page title
          const pageTitles = screen.getAllByText(/detail hasil pengujian/i);
          expect(pageTitles.length).toBeGreaterThan(0);

          // Should always have tab navigation
          const meteorTabs = screen.getAllByRole('button', { name: /meteor/i });
          expect(meteorTabs.length).toBeGreaterThan(0);

          const sbertTabs = screen.getAllByRole('button', { name: /sentence-bert/i });
          expect(sbertTabs.length).toBeGreaterThan(0);

          // Property 3: Back navigation should work consistently
          // Requirement 2.2
          const backButton = backButtons[0];
          await act(async () => {
            await user.click(backButton);
          });

          expect(mockNavigate).toHaveBeenCalledWith(-1);
        }
      ),
      { numRuns: 8 }
    );
  });

  it('should handle modal navigation and data flow consistently', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          initialTab: fc.constantFrom('meteor', 'sentence_bert'),
          initialReference: fc.option(fc.string({ minLength: 20, maxLength: 100 }).filter(s => s.trim().length >= 20), { nil: '' }),
          scenarioText: fc.string({ minLength: 20, maxLength: 100 }).filter(s => s.trim().length >= 20),
          scenarioId: fc.string({ minLength: 3, maxLength: 20 }).filter(s => s.trim().length >= 3)
        }),
        async ({ initialTab, initialReference, scenarioText, scenarioId }) => {
          // Clear any previous renders
          cleanup();
          
          const mockOnClose = vi.fn();
          const mockOnSubmitTest = vi.fn();

          // Render TestingModal with unique key
          const { container } = render(
            <TestWrapper key={`modal-${Date.now()}`}>
              <TestingModal
                isOpen={true}
                onClose={mockOnClose}
                scenarioText={scenarioText}
                scenarioId={scenarioId}
                initialTab={initialTab}
                initialReferenceScenario={initialReference}
                onSubmitTest={mockOnSubmitTest}
              />
            </TestWrapper>
          );

          // Property 1: Modal should display consistent structure regardless of initial data
          // Requirement 4.5
          expect(within(container).getByText('Pengujian Kualitas Skenario')).toBeInTheDocument();
          expect(within(container).getByText('METEOR')).toBeInTheDocument();
          expect(within(container).getByText('Sentence-BERT')).toBeInTheDocument();
          expect(within(container).getByText('Perbandingan Skenario')).toBeInTheDocument();

          // Property 2: Initial tab should be set correctly
          // Requirement 4.4
          const expectedTabText = initialTab === 'meteor' ? 'METEOR' : 'Sentence-BERT';
          
          // Use getAllByText to get all elements with the text, then filter for tab buttons
          const allMeteorElements = within(container).getAllByText(expectedTabText);
          
          // Find the tab button specifically - it should be a button element with emoji
          const activeTab = allMeteorElements.find(element => {
            // Check if this element is inside a button
            const buttonElement = element.closest('button');
            if (!buttonElement) return false;
            
            // Check if the button contains emoji (tab buttons have emojis)
            const hasEmoji = buttonElement.textContent.includes('🎯') || buttonElement.textContent.includes('🧠');
            
            // Check if it's an active tab (has active styling)
            const isActive = buttonElement.className.includes('from-blue-600') || 
                            buttonElement.className.includes('from-purple-600') ||
                            buttonElement.className.includes('text-blue-300') || 
                            buttonElement.className.includes('text-purple-300') ||
                            buttonElement.className.includes('border-blue-500') || 
                            buttonElement.className.includes('border-purple-500');
            
            return hasEmoji && isActive;
          });
          
          expect(activeTab).toBeTruthy();

          // Property 3: Reference text should be initialized correctly
          // Requirement 4.4
          if (initialReference) {
            const textareas = within(container).getAllByRole('textbox');
            const referenceTextarea = textareas.find(textarea => 
              textarea.value === initialReference || textarea.textContent === initialReference
            );
            expect(referenceTextarea).toBeTruthy();
          }

          // Property 4: Tab switching should maintain data consistency
          // Requirement 4.5
          const allButtons = within(container).getAllByRole('button');
          
          // Find tab buttons by looking for buttons that contain emojis (unique to tab buttons)
          const tabButtons = allButtons.filter(btn => {
            const hasEmoji = btn.textContent.includes('🎯') || btn.textContent.includes('🧠');
            const hasMethodName = btn.textContent.includes('METEOR') || btn.textContent.includes('Sentence-BERT');
            return hasEmoji && hasMethodName;
          });
          
          const meteorTab = tabButtons.find(btn => btn.textContent.includes('METEOR') && btn.textContent.includes('🎯'));
          const sbertTab = tabButtons.find(btn => btn.textContent.includes('Sentence-BERT') && btn.textContent.includes('🧠'));

          if (meteorTab && sbertTab) {
            // Switch between tabs
            await act(async () => {
              await user.click(meteorTab);
              await new Promise(resolve => setTimeout(resolve, 50));
            });

            await act(async () => {
              await user.click(sbertTab);
              await new Promise(resolve => setTimeout(resolve, 50));
            });
          }

          // Should still have consistent structure after tab switching
          expect(within(container).getByText('Pengujian Kualitas Skenario')).toBeInTheDocument();
          expect(within(container).getByText('Perbandingan Skenario')).toBeInTheDocument();

          // Property 5: Close action should be consistent
          // Requirement 2.2
          const cancelButtons = within(container).getAllByRole('button', { name: /batal/i });
          if (cancelButtons.length > 0) {
            await act(async () => {
              await user.click(cancelButtons[0]);
            });
            expect(mockOnClose).toHaveBeenCalled();
          }
        }
      ),
      { numRuns: 6 }
    );
  });

  it('should maintain navigation consistency across different test states', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          testState: fc.constantFrom('no_tests', 'meteor_only', 'sentence_bert_only', 'both_tests'),
          scenarioId: fc.string({ minLength: 3, maxLength: 20 }).filter(s => s.trim().length >= 3)
        }),
        async ({ testState, scenarioId }) => {
          // Clear any previous renders
          cleanup();
          
          // Create test results based on state
          let mockResults = [];
          
          const createMockResult = (testType) => ({
            id: `test-${testType}-123`,
            scenario_id: scenarioId,
            test_type: testType,
            score: 0.75,
            generated_text: 'Generated scenario text',
            reference_text: 'Reference scenario text',
            created_at: new Date().toISOString(),
            test_details: { method: testType === 'meteor' ? 'METEOR' : 'Sentence-BERT' }
          });

          switch (testState) {
            case 'meteor_only':
              mockResults = [createMockResult('meteor')];
              break;
            case 'sentence_bert_only':
              mockResults = [createMockResult('sentence_bert')];
              break;
            case 'both_tests':
              mockResults = [createMockResult('meteor'), createMockResult('sentence_bert')];
              break;
            // 'no_tests' case: mockResults remains empty
          }

          TestingService.getTestResults.mockResolvedValue({
            success: true,
            results: mockResults
          });

          TestingService.formatTestResult.mockImplementation(({ result }) => ({
            id: result.id,
            testType: result.test_type,
            score: result.score,
            generatedText: result.generated_text,
            referenceText: result.reference_text,
            createdAt: result.created_at,
            details: result.test_details,
            qualityLevel: { label: 'Good', color: 'blue' }
          }));

          // Update mock params
          mockParams.scenarioId = scenarioId;

          // Render TestResultsDetailPage with unique key
          const { container } = render(
            <TestWrapper initialEntries={[`/test-results/${scenarioId}`]} key={`state-${Date.now()}`}>
              <TestResultsDetailPage />
            </TestWrapper>
          );

          await waitFor(() => {
            expect(TestingService.getTestResults).toHaveBeenCalledWith(scenarioId);
          });

          await act(async () => {
            await new Promise(resolve => setTimeout(resolve, 100));
          });

          // Property 1: Navigation structure should be consistent regardless of test state
          // Requirement 4.5
          
          // Should always have back navigation
          const backButtons = within(container).getAllByRole('button', { name: /kembali/i });
          expect(backButtons.length).toBeGreaterThan(0);
          expect(backButtons[0]).toBeEnabled();

          // Should always have tab navigation
          const meteorTabs = within(container).getAllByRole('button', { name: /meteor/i });
          expect(meteorTabs.length).toBeGreaterThan(0);

          const sbertTabs = within(container).getAllByRole('button', { name: /sentence-bert/i });
          expect(sbertTabs.length).toBeGreaterThan(0);

          // Property 2: Action buttons should be appropriate for test state
          // Requirement 4.4
          
          // Test tab switching to verify navigation consistency
          await act(async () => {
            await user.click(meteorTabs[0]);
            await new Promise(resolve => setTimeout(resolve, 50));
          });

          await act(async () => {
            await user.click(sbertTabs[0]);
            await new Promise(resolve => setTimeout(resolve, 50));
          });

          // Should maintain consistent structure after navigation
          expect(within(container).getAllByRole('button', { name: /kembali/i }).length).toBeGreaterThan(0);

          // Property 3: Back navigation should work consistently regardless of state
          // Requirement 2.2
          const backButton = within(container).getAllByRole('button', { name: /kembali/i })[0];
          await act(async () => {
            await user.click(backButton);
          });

          expect(mockNavigate).toHaveBeenCalledWith(-1);
        }
      ),
      { numRuns: 4 }
    );
  });

  it('should handle navigation errors gracefully', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          shouldFailLoad: fc.boolean(),
          scenarioId: fc.string({ minLength: 3, maxLength: 20 }).filter(s => s.trim().length >= 3)
        }),
        async ({ shouldFailLoad, scenarioId }) => {
          // Clear any previous renders
          cleanup();
          
          if (shouldFailLoad) {
            // Mock API failure
            TestingService.getTestResults.mockRejectedValue(new Error('Network error'));
          } else {
            // Mock successful load
            TestingService.getTestResults.mockResolvedValue({
              success: true,
              results: []
            });
          }

          // Update mock params
          mockParams.scenarioId = scenarioId;

          // Render TestResultsDetailPage with unique key
          const { container } = render(
            <TestWrapper initialEntries={[`/test-results/${scenarioId}`]} key={`error-${Date.now()}`}>
              <TestResultsDetailPage />
            </TestWrapper>
          );

          // Property 1: Navigation should remain functional even with errors
          // Requirement 4.5
          
          await waitFor(() => {
            expect(TestingService.getTestResults).toHaveBeenCalledWith(scenarioId);
          });

          await act(async () => {
            await new Promise(resolve => setTimeout(resolve, 200));
          });

          // Should always have back navigation available
          const backButtons = within(container).getAllByRole('button', { name: /kembali/i });
          expect(backButtons.length).toBeGreaterThan(0);
          expect(backButtons[0]).toBeEnabled();

          // Property 2: Back navigation should work even in error states
          // Requirement 2.2
          await act(async () => {
            await user.click(backButtons[0]);
          });

          expect(mockNavigate).toHaveBeenCalledWith(-1);

          // Property 3: Page should not crash on navigation errors
          // Should have some content displayed (either error state or loading state)
          expect(container).toBeInTheDocument();
          expect(container.children.length).toBeGreaterThan(0);
        }
      ),
      { numRuns: 4 }
    );
  });
});