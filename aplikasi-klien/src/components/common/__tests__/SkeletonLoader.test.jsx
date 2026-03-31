/**
 * Unit tests for Skeleton Loading Components
 * Validates: Requirements 11.4, 11.5
 */

import { render } from '@testing-library/react';
import { describe, test, expect } from 'vitest';
import SkeletonLoader, {
  TextSkeleton,
  CardSkeleton,
  ChatMessageSkeleton,
  ChatHistorySkeleton,
  TemplateSkeleton,
  JiraProjectSkeleton,
  StatsSkeleton,
  ListSkeleton,
  FormSkeleton
} from '../SkeletonLoader';

describe('SkeletonLoader Components', () => {
  describe('SkeletonLoader', () => {
    test('renders without crashing', () => {
      const { container } = render(<SkeletonLoader />);
      expect(container.firstChild).toBeInTheDocument();
    });

    test('applies custom className', () => {
      const { container } = render(<SkeletonLoader className="custom-class" />);
      expect(container.firstChild).toHaveClass('custom-class');
    });

    test('renders with different variants', () => {
      const { container } = render(<SkeletonLoader variant="light" />);
      expect(container.firstChild).toHaveClass('bg-white/5');
    });
  });

  describe('TextSkeleton', () => {
    test('renders without crashing', () => {
      const { container } = render(<TextSkeleton />);
      expect(container.firstChild).toBeInTheDocument();
    });

    test('applies custom className', () => {
      const { container } = render(<TextSkeleton className="custom-text" />);
      expect(container.firstChild).toHaveClass('custom-text');
    });
  });

  describe('CardSkeleton', () => {
    test('renders without crashing', () => {
      const { container } = render(<CardSkeleton />);
      expect(container.firstChild).toBeInTheDocument();
    });

    test('has card styling', () => {
      const { container } = render(<CardSkeleton />);
      expect(container.firstChild).toHaveClass('bg-white/5', 'border', 'rounded-xl');
    });
  });

  describe('ChatMessageSkeleton', () => {
    test('renders without crashing', () => {
      const { container } = render(<ChatMessageSkeleton />);
      expect(container.firstChild).toBeInTheDocument();
    });

    test('applies user alignment', () => {
      const { container } = render(<ChatMessageSkeleton isUser={true} />);
      expect(container.firstChild).toHaveClass('justify-end');
    });

    test('applies AI alignment', () => {
      const { container } = render(<ChatMessageSkeleton isUser={false} />);
      expect(container.firstChild).toHaveClass('justify-start');
    });
  });

  describe('ChatHistorySkeleton', () => {
    test('renders without crashing', () => {
      const { container } = render(<ChatHistorySkeleton />);
      expect(container.firstChild).toBeInTheDocument();
    });
  });

  describe('TemplateSkeleton', () => {
    test('renders without crashing', () => {
      const { container } = render(<TemplateSkeleton />);
      expect(container.firstChild).toBeInTheDocument();
    });
  });

  describe('JiraProjectSkeleton', () => {
    test('renders without crashing', () => {
      const { container } = render(<JiraProjectSkeleton />);
      expect(container.firstChild).toBeInTheDocument();
    });
  });

  describe('StatsSkeleton', () => {
    test('renders without crashing', () => {
      const { container } = render(<StatsSkeleton />);
      expect(container.firstChild).toBeInTheDocument();
    });

    test('has grid layout', () => {
      const { container } = render(<StatsSkeleton />);
      expect(container.firstChild).toHaveClass('grid');
    });
  });

  describe('ListSkeleton', () => {
    test('renders without crashing', () => {
      const { container } = render(<ListSkeleton />);
      expect(container.firstChild).toBeInTheDocument();
    });

    test('renders with custom ItemComponent', () => {
      const CustomItem = () => <div data-testid="custom-item">Custom</div>;
      const { getAllByTestId } = render(<ListSkeleton items={2} ItemComponent={CustomItem} />);
      expect(getAllByTestId('custom-item')).toHaveLength(2);
    });
  });

  describe('FormSkeleton', () => {
    test('renders without crashing', () => {
      const { container } = render(<FormSkeleton />);
      expect(container.firstChild).toBeInTheDocument();
    });

    test('has form styling', () => {
      const { container } = render(<FormSkeleton />);
      expect(container.firstChild).toHaveClass('space-y-4');
    });
  });
});