/**
 * Unit tests for Progress Indicator Components
 * Validates: Requirements 11.4, 11.5
 */

import { render, screen } from '@testing-library/react';
import { describe, test, expect } from 'vitest';
import {
  LinearProgress,
  CircularProgress,
  StepProgress,
  SpinnerProgress,
  AdaptiveProgress
} from '../ProgressIndicator';
import { LoadingProvider, LOADING_TYPES } from '../../../contexts/LoadingContext';

// Test wrapper for components that need LoadingProvider
const wrapper = ({ children }) => <LoadingProvider>{children}</LoadingProvider>;

describe('Progress Indicator Components', () => {
  describe('LinearProgress', () => {
    test('renders without crashing', () => {
      const { container } = render(<LinearProgress />);
      expect(container.firstChild).toBeInTheDocument();
    });

    test('shows percentage when enabled', () => {
      render(<LinearProgress value={75} showPercentage={true} />);
      expect(screen.getByText('75%')).toBeInTheDocument();
    });

    test('handles zero value', () => {
      const { container } = render(<LinearProgress value={0} />);
      expect(container.firstChild).toBeInTheDocument();
    });

    test('handles maximum value', () => {
      const { container } = render(<LinearProgress value={100} />);
      expect(container.firstChild).toBeInTheDocument();
    });
  });

  describe('CircularProgress', () => {
    test('renders without crashing', () => {
      const { container } = render(<CircularProgress />);
      const svg = container.querySelector('svg');
      expect(svg).toBeInTheDocument();
    });

    test('shows percentage when enabled', () => {
      render(<CircularProgress value={60} showPercentage={true} />);
      expect(screen.getByText('60%')).toBeInTheDocument();
    });

    test('renders with different sizes', () => {
      const { container } = render(<CircularProgress size="lg" />);
      const svg = container.querySelector('svg');
      expect(svg).toHaveAttribute('width', '48');
    });
  });

  describe('StepProgress', () => {
    const mockSteps = [
      { title: 'Step 1', description: 'First step' },
      { title: 'Step 2', description: 'Second step' },
      { title: 'Step 3', description: 'Third step' }
    ];

    test('renders without crashing', () => {
      const { container } = render(<StepProgress steps={mockSteps} currentStep={1} />);
      expect(container.firstChild).toBeInTheDocument();
    });

    test('renders all steps', () => {
      render(<StepProgress steps={mockSteps} currentStep={1} />);
      expect(screen.getByText('Step 1')).toBeInTheDocument();
      expect(screen.getByText('Step 2')).toBeInTheDocument();
      expect(screen.getByText('Step 3')).toBeInTheDocument();
    });

    test('displays step descriptions', () => {
      render(<StepProgress steps={mockSteps} currentStep={0} />);
      expect(screen.getByText('First step')).toBeInTheDocument();
    });
  });

  describe('SpinnerProgress', () => {
    test('renders without crashing', () => {
      const { container } = render(<SpinnerProgress />);
      expect(container.firstChild).toBeInTheDocument();
    });

    test('has spinning animation', () => {
      const { container } = render(<SpinnerProgress />);
      expect(container.firstChild).toHaveClass('animate-spin');
    });

    test('applies different sizes', () => {
      const { container } = render(<SpinnerProgress size="lg" />);
      expect(container.firstChild).toHaveClass('w-8', 'h-8');
    });
  });

  describe('AdaptiveProgress', () => {
    test('renders nothing when loading is false', () => {
      const { container } = render(
        <AdaptiveProgress loadingType={LOADING_TYPES.GLOBAL} />,
        { wrapper }
      );
      expect(container.firstChild).toBeNull();
    });
  });
});