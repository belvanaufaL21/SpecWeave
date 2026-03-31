import { render, screen, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { vi } from 'vitest';
import TestButton from '../TestButton';
import { TestResultsProvider } from '../../../contexts/TestResultsContext';

// Mock the TestResultsContext
const mockTestResultsContext = {
  isScenarioTested: vi.fn(),
  getTestResult: vi.fn(),
  getAllTestResults: vi.fn(() => ({}))
};

vi.mock('../../../contexts/TestResultsContext', () => ({
  useTestResults: () => mockTestResultsContext,
  TestResultsProvider: ({ children }) => children
}));

// Mock navigate
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate
  };
});

const TestButtonWrapper = ({ children }) => (
  <BrowserRouter>
    <TestResultsProvider>
      {children}
    </TestResultsProvider>
  </BrowserRouter>
);

describe('TestButton', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders Test button when scenario is not tested', () => {
    mockTestResultsContext.isScenarioTested.mockReturnValue(false);
    
    render(
      <TestButtonWrapper>
        <TestButton
          messageId="test-message"
          scenarioIndex={0}
          scenarioText="Test scenario"
          activeChatId="test-chat"
        />
      </TestButtonWrapper>
    );

    expect(screen.getByText('Test')).toBeInTheDocument();
    expect(screen.queryByText('View Details')).not.toBeInTheDocument();
  });

  it('renders View Details button when scenario is tested', () => {
    mockTestResultsContext.isScenarioTested.mockReturnValue(true);
    mockTestResultsContext.getTestResult.mockReturnValue({
      meteor_score: 0.85,
      timestamp: '2024-01-01T00:00:00Z'
    });
    
    render(
      <TestButtonWrapper>
        <TestButton
          messageId="test-message"
          scenarioIndex={0}
          scenarioText="Test scenario"
          activeChatId="test-chat"
        />
      </TestButtonWrapper>
    );

    expect(screen.getByText('View Details')).toBeInTheDocument();
    expect(screen.queryByText('Test')).not.toBeInTheDocument();
  });

  it('calls onTestClick when Test button is clicked and scenario is not tested', () => {
    const mockOnTestClick = vi.fn();
    mockTestResultsContext.isScenarioTested.mockReturnValue(false);
    
    render(
      <TestButtonWrapper>
        <TestButton
          messageId="test-message"
          scenarioIndex={0}
          scenarioText="Test scenario"
          activeChatId="test-chat"
          onTestClick={mockOnTestClick}
        />
      </TestButtonWrapper>
    );

    fireEvent.click(screen.getByText('Test'));
    
    expect(mockOnTestClick).toHaveBeenCalledWith(
      'Test scenario',
      0,
      'test-chat',
      'test-message'
    );
  });

  it('navigates to results page when View Details button is clicked', () => {
    mockTestResultsContext.isScenarioTested.mockReturnValue(true);
    mockTestResultsContext.getTestResult.mockReturnValue({
      meteor_score: 0.85,
      timestamp: '2024-01-01T00:00:00Z'
    });
    
    render(
      <TestButtonWrapper>
        <TestButton
          messageId="test-message"
          scenarioIndex={0}
          scenarioText="Test scenario"
          activeChatId="test-chat"
        />
      </TestButtonWrapper>
    );

    fireEvent.click(screen.getByText('View Details'));
    
    expect(mockNavigate).toHaveBeenCalledWith('/meteor-results/test-message-0');
  });
});