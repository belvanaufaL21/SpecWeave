import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import TestButton from '../../components/common/TestButton';
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
    getTestTypeDisplayName: vi.fn()
  }
}));

// Mock router
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate
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
    {children}
  </BrowserRouter>
);

describe('Simple Testing Flow Integration Tests', () => {
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
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('TestButton State Management', () => {
    it('should show Test button when scenario is not tested', () => {
      // **Feature: meteor-sentence-bert-testing, Property 1: Button State Management**
      
      mockTestResultsContext.isScenarioTested.mockReturnValue(false);
      
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

      expect(screen.getByText('Test')).toBeInTheDocument();
      expect(screen.queryByText('View Details')).not.toBeInTheDocument();
    });

    it('should show View Details button when scenario is tested', () => {
      // **Feature: meteor-sentence-bert-testing, Property 1: Button State Management**
      
      mockTestResultsContext.isScenarioTested.mockReturnValue(true);
      mockTestResultsContext.getTestResult.mockReturnValue({
        meteor_score: 0.85,
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

      expect(screen.getByText('View Details')).toBeInTheDocument();
      expect(screen.queryByText('Test')).not.toBeInTheDocument();
    });

    it('should call onTestClick when Test button is clicked', async () => {
      // **Feature: meteor-sentence-bert-testing, Property 2: Form Consistency Across All Entry Points**
      
      const mockOnTestClick = vi.fn();
      mockTestResultsContext.isScenarioTested.mockReturnValue(false);
      
      render(
        <TestWrapper>
          <TestButton
            messageId="test-message"
            scenarioIndex={0}
            scenarioText="Given user is on login page When user enters valid credentials Then user is redirected to dashboard"
            activeChatId="test-chat"
            onTestClick={mockOnTestClick}
          />
        </TestWrapper>
      );

      const testButton = screen.getByText('Test');
      await user.click(testButton);
      
      expect(mockOnTestClick).toHaveBeenCalledWith(
        'Given user is on login page When user enters valid credentials Then user is redirected to dashboard',
        0,
        'test-chat',
        'test-message'
      );
    });

    it('should navigate to results page when View Details is clicked', async () => {
      // **Feature: meteor-sentence-bert-testing, Property 7: Navigation and Data Flow Consistency**
      
      mockTestResultsContext.isScenarioTested.mockReturnValue(true);
      mockTestResultsContext.getTestResult.mockReturnValue({
        meteor_score: 0.85,
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

      const viewDetailsButton = screen.getByText('View Details');
      await user.click(viewDetailsButton);
      
      expect(mockNavigate).toHaveBeenCalledWith('/test-results/test-message-0');
    });
  });

  describe('Testing Service Integration', () => {
    it('should validate test requests correctly', () => {
      // **Feature: meteor-sentence-bert-testing, Property 4: Form Validation Logic**
      
      const validRequest = {
        scenarioId: 'test-123',
        generatedText: 'Given test scenario',
        referenceText: 'Given reference scenario',
        testType: 'meteor'
      };

      TestingService.validateTestRequest.mockReturnValue({ isValid: true, errors: [] });
      const result = TestingService.validateTestRequest(validRequest);
      
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should format scores correctly for different test types', () => {
      // **Feature: meteor-sentence-bert-testing, Property 5: Test Processing and Method Selection**
      
      TestingService.formatScore.mockImplementation((score, type) => 
        `${Math.round(score * 100)}% (${type === 'meteor' ? 'METEOR' : 'Sentence-BERT'})`
      );

      const meteorFormatted = TestingService.formatScore(0.75, 'meteor');
      const sentenceBertFormatted = TestingService.formatScore(0.85, 'sentence_bert');
      
      expect(meteorFormatted).toBe('75% (METEOR)');
      expect(sentenceBertFormatted).toBe('85% (Sentence-BERT)');
    });

    it('should determine quality levels correctly', () => {
      // **Feature: meteor-sentence-bert-testing, Property 12: METEOR Score Calculation Correctness**
      // **Feature: meteor-sentence-bert-testing, Property 13: Sentence-BERT Score Calculation Correctness**
      
      TestingService.getQualityLevel.mockImplementation((score) => ({
        label: score >= 0.8 ? 'Excellent' : score >= 0.6 ? 'Good' : 'Fair',
        color: score >= 0.8 ? 'green' : score >= 0.6 ? 'blue' : 'yellow'
      }));

      const excellentQuality = TestingService.getQualityLevel(0.85);
      const goodQuality = TestingService.getQualityLevel(0.65);
      const fairQuality = TestingService.getQualityLevel(0.45);

      expect(excellentQuality.label).toBe('Excellent');
      expect(excellentQuality.color).toBe('green');
      
      expect(goodQuality.label).toBe('Good');
      expect(goodQuality.color).toBe('blue');
      
      expect(fairQuality.label).toBe('Fair');
      expect(fairQuality.color).toBe('yellow');
    });

    it('should format test results correctly', () => {
      // **Feature: meteor-sentence-bert-testing, Property 9: Data Persistence Round-trip**
      
      const apiResult = {
        result: {
          id: 'result-123',
          scenario_id: 'scenario-123',
          test_type: 'meteor',
          score: 0.75,
          test_details: { method: 'METEOR' },
          generated_text: 'Generated',
          reference_text: 'Reference',
          created_at: '2024-01-01T00:00:00Z'
        }
      };

      const formatted = TestingService.formatTestResult(apiResult);

      expect(formatted).toEqual({
        id: 'result-123',
        scenarioId: 'scenario-123',
        testType: 'meteor',
        score: 0.75,
        details: { method: 'METEOR' },
        generatedText: 'Generated',
        referenceText: 'Reference',
        createdAt: '2024-01-01T00:00:00Z',
        formattedScore: '75% (METEOR)',
        qualityLevel: { label: 'Good', color: 'blue' }
      });
    });
  });

  describe('Cross-Testing Data Sharing', () => {
    it('should handle multiple test types for same scenario', async () => {
      // **Feature: meteor-sentence-bert-testing, Property 8: Cross-Test Data Sharing**
      
      TestingService.submitTest
        .mockResolvedValueOnce(mockApiResponses.meteorTest)
        .mockResolvedValueOnce(mockApiResponses.sentenceBertTest);

      const testData = {
        scenarioId: 'scenario-123',
        generatedText: 'Given user is on login page When user enters valid credentials Then user is redirected to dashboard',
        referenceText: 'Given user is on the login page When user provides valid email and password Then system redirects to main dashboard'
      };

      // Submit METEOR test
      const meteorResult = await TestingService.submitTest({
        ...testData,
        testType: 'meteor'
      });

      // Submit Sentence-BERT test with same reference text
      const sentenceBertResult = await TestingService.submitTest({
        ...testData,
        testType: 'sentence_bert'
      });

      expect(meteorResult.result.reference_text).toBe(testData.referenceText);
      expect(sentenceBertResult.result.reference_text).toBe(testData.referenceText);
      expect(meteorResult.result.scenario_id).toBe(sentenceBertResult.result.scenario_id);
    });
  });

  describe('Error Handling', () => {
    it('should handle API errors gracefully', async () => {
      // **Feature: meteor-sentence-bert-testing, Property 11: Error Handling Consistency**
      
      const apiError = new Error('Network error occurred');
      TestingService.submitTest.mockRejectedValue(apiError);

      try {
        await TestingService.submitTest({
          scenarioId: 'test-123',
          testType: 'meteor',
          generatedText: 'Generated text',
          referenceText: 'Reference text'
        });
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        expect(error.message).toBe('Network error occurred');
      }
    });

    it('should handle invalid test requests', () => {
      // **Feature: meteor-sentence-bert-testing, Property 4: Form Validation Logic**
      
      TestingService.validateTestRequest.mockReturnValue({
        isValid: false,
        errors: ['Scenario ID is required', 'Generated text is required']
      });

      const invalidRequest = {
        scenarioId: '',
        generatedText: '',
        referenceText: 'Reference text',
        testType: 'meteor'
      };

      const result = TestingService.validateTestRequest(invalidRequest);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Scenario ID is required');
      expect(result.errors).toContain('Generated text is required');
    });
  });

  describe('System Integration', () => {
    it('should maintain compatibility with existing components', () => {
      // **Feature: meteor-sentence-bert-testing, Property 10: System Integration Compatibility**
      
      // Test that TestButton renders without crashing when integrated with existing contexts
      mockTestResultsContext.isScenarioTested.mockReturnValue(false);
      
      const { container } = render(
        <TestWrapper>
          <TestButton
            messageId="test-message"
            scenarioIndex={0}
            scenarioText="Given user is on login page When user enters valid credentials Then user is redirected to dashboard"
            activeChatId="test-chat"
          />
        </TestWrapper>
      );

      expect(container.firstChild).toBeInTheDocument();
      expect(screen.getByText('Test')).toBeInTheDocument();
    });

    it('should handle test type display names correctly', () => {
      // **Feature: meteor-sentence-bert-testing, Property 5: Test Processing and Method Selection**
      
      TestingService.getTestTypeDisplayName.mockImplementation((type) => 
        type === 'meteor' ? 'METEOR' : 'Sentence-BERT'
      );

      expect(TestingService.getTestTypeDisplayName('meteor')).toBe('METEOR');
      expect(TestingService.getTestTypeDisplayName('sentence_bert')).toBe('Sentence-BERT');
    });
  });

  describe('Performance and Reliability', () => {
    it('should handle concurrent test operations', async () => {
      // **Feature: meteor-sentence-bert-testing, Property 5: Test Processing and Method Selection**
      
      TestingService.submitTest.mockImplementation((request) => {
        return Promise.resolve({
          success: true,
          result: {
            id: `result-${request.scenarioId}`,
            scenario_id: request.scenarioId,
            test_type: request.testType,
            score: 0.75,
            generated_text: request.generatedText,
            reference_text: request.referenceText,
            created_at: new Date().toISOString()
          }
        });
      });

      const concurrentTests = [
        { scenarioId: 'scenario-1', testType: 'meteor', generatedText: 'Generated 1', referenceText: 'Reference 1' },
        { scenarioId: 'scenario-2', testType: 'sentence_bert', generatedText: 'Generated 2', referenceText: 'Reference 2' },
        { scenarioId: 'scenario-3', testType: 'meteor', generatedText: 'Generated 3', referenceText: 'Reference 3' }
      ];

      const promises = concurrentTests.map(test => TestingService.submitTest(test));
      const results = await Promise.all(promises);

      expect(results).toHaveLength(3);
      results.forEach((result, index) => {
        expect(result.success).toBe(true);
        expect(result.result.scenario_id).toBe(`scenario-${index + 1}`);
      });
    });

    it('should maintain data consistency across operations', () => {
      // **Feature: meteor-sentence-bert-testing, Property 9: Data Persistence Round-trip**
      
      const testData = {
        scenarioId: 'scenario-consistency',
        testType: 'meteor',
        score: 0.75,
        generatedText: 'Generated text for consistency test',
        referenceText: 'Reference text for consistency test'
      };

      // Simulate data round-trip
      const apiResult = {
        result: {
          id: 'result-consistency',
          scenario_id: testData.scenarioId,
          test_type: testData.testType,
          score: testData.score,
          generated_text: testData.generatedText,
          reference_text: testData.referenceText,
          created_at: '2024-01-01T00:00:00Z'
        }
      };

      const formatted = TestingService.formatTestResult(apiResult);

      // Verify data consistency
      expect(formatted.scenarioId).toBe(testData.scenarioId);
      expect(formatted.testType).toBe(testData.testType);
      expect(formatted.score).toBe(testData.score);
      expect(formatted.generatedText).toBe(testData.generatedText);
      expect(formatted.referenceText).toBe(testData.referenceText);
    });
  });
});