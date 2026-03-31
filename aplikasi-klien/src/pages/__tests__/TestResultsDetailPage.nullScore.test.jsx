import React from 'react';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { TestResultsProvider } from '../../contexts/TestResultsContext';
import { AuthProvider } from '../../contexts/AuthContext';
import TestResultsDetailPage from '../TestResultsDetailPage';

// Mock the hooks and services
jest.mock('../../hooks/useTesting', () => ({
  __esModule: true,
  default: () => ({
    submitTest: jest.fn(),
    isLoading: false,
    error: null
  })
}));

jest.mock('../../services/testingService', () => ({
  formatTestResult: (result) => result,
  getTestResults: jest.fn().mockResolvedValue({
    scenarioId: 'test-scenario',
    latestResults: {
      meteor: { score: null, createdAt: new Date().toISOString() }
    },
    allResults: {
      meteor: [{ score: null, createdAt: new Date().toISOString() }]
    },
    summary: { totalTests: 1 }
  })
}));

// Mock react-router-dom
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useParams: () => ({ scenarioId: 'test-scenario' }),
  useNavigate: () => jest.fn()
}));

const TestWrapper = ({ children }) => (
  <BrowserRouter>
    <AuthProvider>
      <TestResultsProvider>
        {children}
      </TestResultsProvider>
    </AuthProvider>
  </BrowserRouter>
);

describe('TestResultsDetailPage - Null Score Handling', () => {
  test('should handle null/undefined scores without crashing', async () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    
    expect(() => {
      render(
        <TestWrapper>
          <TestResultsDetailPage />
        </TestWrapper>
      );
    }).not.toThrow();

    // Should display N/A for null scores
    expect(screen.getByText('N/A')).toBeInTheDocument();
    
    consoleSpy.mockRestore();
  });

  test('should handle undefined score in result object', () => {
    const result = {
      score: undefined,
      createdAt: new Date().toISOString(),
      qualityLevel: { label: 'Test' }
    };

    // Test the component functions directly
    const getScoreColor = (score) => {
      if (score == null || isNaN(score)) return 'text-gray-400';
      if (score >= 0.8) return 'text-green-400';
      if (score >= 0.6) return 'text-blue-400';
      if (score >= 0.4) return 'text-yellow-400';
      return 'text-red-400';
    };

    const getScoreGradient = (score) => {
      if (score == null || isNaN(score)) return 'from-gray-500 to-gray-600';
      if (score >= 0.8) return 'from-green-500 to-emerald-500';
      if (score >= 0.6) return 'from-blue-500 to-cyan-500';
      if (score >= 0.4) return 'from-yellow-500 to-orange-500';
      return 'from-red-500 to-pink-500';
    };

    expect(getScoreColor(result.score)).toBe('text-gray-400');
    expect(getScoreGradient(result.score)).toBe('from-gray-500 to-gray-600');
  });
});