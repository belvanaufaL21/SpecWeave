/**
 * Functionality Preservation Tests
 * Comprehensive regression tests to ensure refactoring doesn't break existing functionality
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import { vi } from 'vitest';

// Import components to test
import Button from '../../components/common/Button.jsx';
import Input from '../../components/common/Input.jsx';
import Modal from '../../components/common/Modal.jsx';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '../../components/shared/Card.jsx';
import ComparisonTable from '../../components/common/ComparisonTable.jsx';
import TestButton from '../../components/common/TestButton.jsx';

// Import utilities to test
import {
  deepClone,
  deepMerge,
  isEmpty,
  generateId,
  debounce,
  throttle,
  getNestedProperty,
  setNestedProperty,
  removeDuplicates,
  groupBy,
  sortBy,
  chunk,
  flatten,
  pick,
  omit
} from '../../utils/shared/commonUtils.js';

import {
  isValidEmail,
  isStrongPassword,
  isValidUUID,
  isRequired,
  hasMinLength,
  hasMaxLength,
  isInRange
} from '../../utils/shared/validationUtils.js';

import {
  formatNumber,
  formatFileSize,
  formatDate,
  formatRelativeTime,
  formatPercentage,
  toTitleCase,
  toKebabCase,
  toCamelCase,
  truncateText
} from '../../utils/shared/formatUtils.js';

// Test wrapper component
const TestWrapper = ({ children }) => (
  <BrowserRouter>
    {children}
  </BrowserRouter>
);

describe('Functionality Preservation Tests', () => {
  describe('Button Component Functionality', () => {
    test('should render with correct text and handle clicks', async () => {
      const handleClick = vi.fn();
      const user = userEvent.setup();

      render(
        <Button onClick={handleClick}>
          Click me
        </Button>
      );

      const button = screen.getByRole('button', { name: /click me/i });
      expect(button).toBeInTheDocument();

      await user.click(button);
      expect(handleClick).toHaveBeenCalledTimes(1);
    });

    test('should support different variants', () => {
      const { rerender } = render(<Button variant="primary">Primary</Button>);
      expect(screen.getByRole('button')).toHaveClass('bg-gradient-to-r');

      rerender(<Button variant="secondary">Secondary</Button>);
      expect(screen.getByRole('button')).toHaveClass('bg-[#1a1a2e]');

      rerender(<Button variant="outline">Outline</Button>);
      expect(screen.getByRole('button')).toHaveClass('border-2');

      rerender(<Button variant="ghost">Ghost</Button>);
      expect(screen.getByRole('button')).toHaveClass('text-gray-300');
    });

    test('should handle disabled state', () => {
      render(<Button disabled>Disabled</Button>);
      const button = screen.getByRole('button');
      
      expect(button).toBeDisabled();
      expect(button).toHaveClass('disabled:opacity-50');
    });

    test('should show loading state', () => {
      render(<Button loading>Loading</Button>);
      const button = screen.getByRole('button');
      
      expect(button).toBeDisabled();
      expect(screen.getByRole('button')).toContainHTML('svg');
    });

    test('should support different sizes', () => {
      const { rerender } = render(<Button size="sm">Small</Button>);
      expect(screen.getByRole('button')).toHaveClass('px-3', 'py-1.5', 'text-sm');

      rerender(<Button size="md">Medium</Button>);
      expect(screen.getByRole('button')).toHaveClass('px-5', 'py-2.5', 'text-base');

      rerender(<Button size="lg">Large</Button>);
      expect(screen.getByRole('button')).toHaveClass('px-8', 'py-3', 'text-lg');
    });
  });

  describe('Input Component Functionality', () => {
    test('should render with label and handle input', async () => {
      const handleChange = vi.fn();
      const user = userEvent.setup();

      render(
        <Input
          label="Test Input"
          placeholder="Enter text"
          onChange={handleChange}
        />
      );

      const label = screen.getByText('Test Input');
      const input = screen.getByPlaceholderText('Enter text');

      expect(label).toBeInTheDocument();
      expect(input).toBeInTheDocument();

      await user.type(input, 'test value');
      expect(handleChange).toHaveBeenCalled();
    });

    test('should display error state', () => {
      render(
        <Input
          label="Test Input"
          error="This field is required"
        />
      );

      const input = screen.getByRole('textbox');
      const errorMessage = screen.getByText('This field is required');

      expect(input).toHaveClass('border-red-500');
      expect(errorMessage).toBeInTheDocument();
      expect(errorMessage).toHaveClass('text-red-400');
    });

    test('should apply custom className', () => {
      render(<Input className="custom-class" />);
      const input = screen.getByRole('textbox');
      
      expect(input).toHaveClass('custom-class');
    });
  });

  describe('Modal Component Functionality', () => {
    test('should render when open and close when requested', async () => {
      const handleClose = vi.fn();
      const user = userEvent.setup();

      const { rerender } = render(
        <Modal isOpen={false} onClose={handleClose} title="Test Modal">
          <p>Modal content</p>
        </Modal>
      );

      expect(screen.queryByText('Test Modal')).not.toBeInTheDocument();

      rerender(
        <Modal isOpen={true} onClose={handleClose} title="Test Modal">
          <p>Modal content</p>
        </Modal>
      );

      expect(screen.getByText('Test Modal')).toBeInTheDocument();
      expect(screen.getByText('Modal content')).toBeInTheDocument();

      const closeButton = screen.getByLabelText('Close modal');
      await user.click(closeButton);
      
      expect(handleClose).toHaveBeenCalledTimes(1);
    });

    test('should close on backdrop click when enabled', async () => {
      const handleClose = vi.fn();
      const user = userEvent.setup();

      render(
        <Modal isOpen={true} onClose={handleClose} closeOnBackdrop={true}>
          <p>Modal content</p>
        </Modal>
      );

      const backdrop = screen.getByRole('dialog').parentElement;
      await user.click(backdrop);
      
      expect(handleClose).toHaveBeenCalledTimes(1);
    });

    test('should handle escape key when enabled', async () => {
      const handleClose = vi.fn();
      const user = userEvent.setup();

      render(
        <Modal isOpen={true} onClose={handleClose} closeOnEscape={true}>
          <p>Modal content</p>
        </Modal>
      );

      await user.keyboard('{Escape}');
      expect(handleClose).toHaveBeenCalledTimes(1);
    });

    test('should support different sizes', () => {
      const { rerender } = render(
        <Modal isOpen={true} onClose={() => {}} size="sm">
          Content
        </Modal>
      );
      expect(screen.getByRole('dialog')).toHaveClass('max-w-md');

      rerender(
        <Modal isOpen={true} onClose={() => {}} size="lg">
          Content
        </Modal>
      );
      expect(screen.getByRole('dialog')).toHaveClass('max-w-4xl');
    });
  });

  describe('Card Component Functionality', () => {
    test('should render with all sub-components', () => {
      render(
        <Card>
          <CardHeader>
            <CardTitle>Card Title</CardTitle>
          </CardHeader>
          <CardContent>
            <p>Card content goes here</p>
          </CardContent>
          <CardFooter>
            <button>Action</button>
          </CardFooter>
        </Card>
      );

      expect(screen.getByText('Card Title')).toBeInTheDocument();
      expect(screen.getByText('Card content goes here')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Action' })).toBeInTheDocument();
    });

    test('should support different variants', () => {
      const { rerender } = render(<Card variant="default">Content</Card>);
      expect(screen.getByText('Content').parentElement).toHaveClass('bg-[#0a0a0f]/95');

      rerender(<Card variant="elevated">Content</Card>);
      expect(screen.getByText('Content').parentElement).toHaveClass('bg-[#0a0a0f]/98');

      rerender(<Card variant="glass">Content</Card>);
      expect(screen.getByText('Content').parentElement).toHaveClass('bg-white/10');
    });

    test('should handle click events when onClick is provided', async () => {
      const handleClick = vi.fn();
      const user = userEvent.setup();

      render(
        <Card onClick={handleClick}>
          Clickable card
        </Card>
      );

      const card = screen.getByText('Clickable card').parentElement;
      expect(card).toHaveClass('cursor-pointer');

      await user.click(card);
      expect(handleClick).toHaveBeenCalledTimes(1);
    });

    test('should support hover effects', () => {
      render(<Card hover>Hoverable card</Card>);
      const card = screen.getByText('Hoverable card').parentElement;
      
      expect(card).toHaveClass('hover:shadow-lg', 'hover:scale-[1.02]');
    });
  });

  describe('Utility Functions Functionality', () => {
    describe('deepClone', () => {
      test('should create deep copies of objects', () => {
        const original = { a: 1, b: { c: 2 } };
        const cloned = deepClone(original);
        
        expect(cloned).toEqual(original);
        expect(cloned).not.toBe(original);
        expect(cloned.b).not.toBe(original.b);
        
        cloned.b.c = 3;
        expect(original.b.c).toBe(2);
      });

      test('should handle arrays correctly', () => {
        const original = [1, [2, 3], { a: 4 }];
        const cloned = deepClone(original);
        
        expect(cloned).toEqual(original);
        expect(cloned).not.toBe(original);
        expect(cloned[1]).not.toBe(original[1]);
        expect(cloned[2]).not.toBe(original[2]);
      });

      test('should handle primitive values', () => {
        expect(deepClone(42)).toBe(42);
        expect(deepClone('hello')).toBe('hello');
        expect(deepClone(true)).toBe(true);
        expect(deepClone(null)).toBe(null);
      });
    });

    describe('deepMerge', () => {
      test('should merge objects deeply', () => {
        const target = { a: 1, b: { c: 2 } };
        const source = { b: { d: 3 }, e: 4 };
        const result = deepMerge(target, source);
        
        expect(result).toEqual({
          a: 1,
          b: { c: 2, d: 3 },
          e: 4
        });
      });

      test('should handle multiple sources', () => {
        const target = { a: 1 };
        const source1 = { b: 2 };
        const source2 = { c: 3 };
        const result = deepMerge(target, source1, source2);
        
        expect(result).toEqual({ a: 1, b: 2, c: 3 });
      });
    });

    describe('isEmpty', () => {
      test('should correctly identify empty values', () => {
        expect(isEmpty(null)).toBe(true);
        expect(isEmpty(undefined)).toBe(true);
        expect(isEmpty('')).toBe(true);
        expect(isEmpty('   ')).toBe(true);
        expect(isEmpty([])).toBe(true);
        expect(isEmpty({})).toBe(true);
      });

      test('should correctly identify non-empty values', () => {
        expect(isEmpty('hello')).toBe(false);
        expect(isEmpty([1])).toBe(false);
        expect(isEmpty({ a: 1 })).toBe(false);
        expect(isEmpty(0)).toBe(false);
        expect(isEmpty(false)).toBe(false);
      });
    });

    describe('generateId', () => {
      test('should generate unique IDs', () => {
        const id1 = generateId();
        const id2 = generateId();
        
        expect(id1).not.toBe(id2);
        expect(typeof id1).toBe('string');
        expect(id1.length).toBeGreaterThan(0);
      });

      test('should include prefix when provided', () => {
        const id = generateId('test');
        expect(id).toMatch(/^test_/);
      });
    });

    describe('getNestedProperty', () => {
      test('should get nested properties correctly', () => {
        const obj = { a: { b: { c: 'value' } } };
        
        expect(getNestedProperty(obj, 'a.b.c')).toBe('value');
        expect(getNestedProperty(obj, 'a.b')).toEqual({ c: 'value' });
        expect(getNestedProperty(obj, 'a.b.d', 'default')).toBe('default');
      });

      test('should handle null/undefined objects', () => {
        expect(getNestedProperty(null, 'a.b.c', 'default')).toBe('default');
        expect(getNestedProperty(undefined, 'a.b.c', 'default')).toBe('default');
      });
    });

    describe('setNestedProperty', () => {
      test('should set nested properties correctly', () => {
        const obj = {};
        setNestedProperty(obj, 'a.b.c', 'value');
        
        expect(obj.a.b.c).toBe('value');
      });

      test('should overwrite existing properties', () => {
        const obj = { a: { b: { c: 'old' } } };
        setNestedProperty(obj, 'a.b.c', 'new');
        
        expect(obj.a.b.c).toBe('new');
      });
    });

    describe('removeDuplicates', () => {
      test('should remove duplicates from primitive arrays', () => {
        const arr = [1, 2, 2, 3, 3, 3];
        const result = removeDuplicates(arr);
        
        expect(result).toEqual([1, 2, 3]);
      });

      test('should remove duplicates by key', () => {
        const arr = [
          { id: 1, name: 'John' },
          { id: 2, name: 'Jane' },
          { id: 1, name: 'John Doe' }
        ];
        const result = removeDuplicates(arr, 'id');
        
        expect(result).toHaveLength(2);
        expect(result[0].id).toBe(1);
        expect(result[1].id).toBe(2);
      });
    });

    describe('groupBy', () => {
      test('should group array by key', () => {
        const arr = [
          { category: 'A', value: 1 },
          { category: 'B', value: 2 },
          { category: 'A', value: 3 }
        ];
        const result = groupBy(arr, 'category');
        
        expect(result.A).toHaveLength(2);
        expect(result.B).toHaveLength(1);
      });

      test('should group by function', () => {
        const arr = [1, 2, 3, 4, 5, 6];
        const result = groupBy(arr, (item) => item % 2 === 0 ? 'even' : 'odd');
        
        expect(result.even).toEqual([2, 4, 6]);
        expect(result.odd).toEqual([1, 3, 5]);
      });
    });
  });

  describe('Validation Functions Functionality', () => {
    describe('isValidEmail', () => {
      test('should validate email addresses correctly', () => {
        expect(isValidEmail('test@example.com')).toBe(true);
        expect(isValidEmail('user.name+tag@domain.co.uk')).toBe(true);
        expect(isValidEmail('invalid-email')).toBe(false);
        expect(isValidEmail('test@')).toBe(false);
        expect(isValidEmail('@example.com')).toBe(false);
      });
    });

    describe('isStrongPassword', () => {
      test('should validate password strength correctly', () => {
        expect(isStrongPassword('Password123')).toBe(true);
        expect(isStrongPassword('StrongP@ss1')).toBe(true);
        expect(isStrongPassword('weak')).toBe(false);
        expect(isStrongPassword('password')).toBe(false);
        expect(isStrongPassword('PASSWORD123')).toBe(false);
        expect(isStrongPassword('Password')).toBe(false);
      });
    });

    describe('isValidUUID', () => {
      test('should validate UUID format correctly', () => {
        expect(isValidUUID('123e4567-e89b-12d3-a456-426614174000')).toBe(true);
        expect(isValidUUID('550e8400-e29b-41d4-a716-446655440000')).toBe(true);
        expect(isValidUUID('invalid-uuid')).toBe(false);
        expect(isValidUUID('123-456-789')).toBe(false);
      });
    });

    describe('isRequired', () => {
      test('should validate required fields correctly', () => {
        expect(isRequired('value')).toBe(true);
        expect(isRequired([1, 2, 3])).toBe(true);
        expect(isRequired({ a: 1 })).toBe(true);
        expect(isRequired('')).toBe(false);
        expect(isRequired('   ')).toBe(false);
        expect(isRequired([])).toBe(false);
        expect(isRequired({})).toBe(false);
        expect(isRequired(null)).toBe(false);
        expect(isRequired(undefined)).toBe(false);
      });
    });

    describe('hasMinLength', () => {
      test('should validate minimum length correctly', () => {
        expect(hasMinLength('hello', 3)).toBe(true);
        expect(hasMinLength('hi', 3)).toBe(false);
        expect(hasMinLength([1, 2, 3], 2)).toBe(true);
        expect(hasMinLength([1], 2)).toBe(false);
      });
    });

    describe('hasMaxLength', () => {
      test('should validate maximum length correctly', () => {
        expect(hasMaxLength('hi', 5)).toBe(true);
        expect(hasMaxLength('hello world', 5)).toBe(false);
        expect(hasMaxLength([1, 2], 3)).toBe(true);
        expect(hasMaxLength([1, 2, 3, 4], 3)).toBe(false);
      });
    });

    describe('isInRange', () => {
      test('should validate number ranges correctly', () => {
        expect(isInRange(5, 1, 10)).toBe(true);
        expect(isInRange(1, 1, 10)).toBe(true);
        expect(isInRange(10, 1, 10)).toBe(true);
        expect(isInRange(0, 1, 10)).toBe(false);
        expect(isInRange(11, 1, 10)).toBe(false);
        expect(isInRange('5', 1, 10)).toBe(true);
      });
    });
  });

  describe('Format Functions Functionality', () => {
    describe('formatNumber', () => {
      test('should format numbers with commas', () => {
        expect(formatNumber(1234)).toBe('1,234');
        expect(formatNumber(1234567)).toBe('1,234,567');
        expect(formatNumber(1234.56, { decimals: 2 })).toBe('1,234.56');
      });

      test('should format currency', () => {
        const result = formatNumber(1234.56, { currency: 'USD' });
        expect(result).toMatch(/\$1,234\.56/);
      });

      test('should format percentages', () => {
        const result = formatNumber(0.1234, { percentage: true, decimals: 2 });
        expect(result).toBe('12.34%');
      });
    });

    describe('formatFileSize', () => {
      test('should format file sizes correctly', () => {
        expect(formatFileSize(0)).toBe('0 Bytes');
        expect(formatFileSize(1024)).toBe('1 KB');
        expect(formatFileSize(1048576)).toBe('1 MB');
        expect(formatFileSize(1073741824)).toBe('1 GB');
      });
    });

    describe('formatPercentage', () => {
      test('should format percentages correctly', () => {
        expect(formatPercentage(0.1234)).toBe('12.3%');
        expect(formatPercentage(0.1234, 2)).toBe('12.34%');
        expect(formatPercentage(1)).toBe('100.0%');
        expect(formatPercentage(0)).toBe('0.0%');
      });
    });

    describe('toTitleCase', () => {
      test('should convert to title case correctly', () => {
        expect(toTitleCase('hello world')).toBe('Hello World');
        expect(toTitleCase('HELLO WORLD')).toBe('Hello World');
        expect(toTitleCase('hELLo WoRLd')).toBe('Hello World');
      });
    });

    describe('toKebabCase', () => {
      test('should convert to kebab case correctly', () => {
        expect(toKebabCase('Hello World')).toBe('hello-world');
        expect(toKebabCase('helloWorld')).toBe('hello-world');
        expect(toKebabCase('hello_world')).toBe('hello-world');
      });
    });

    describe('toCamelCase', () => {
      test('should convert to camel case correctly', () => {
        expect(toCamelCase('hello world')).toBe('helloWorld');
        expect(toCamelCase('hello-world')).toBe('helloWorld');
        expect(toCamelCase('hello_world')).toBe('helloWorld');
      });
    });

    describe('truncateText', () => {
      test('should truncate text correctly', () => {
        expect(truncateText('Hello World', 5)).toBe('He...');
        expect(truncateText('Hello', 10)).toBe('Hello');
        expect(truncateText('Hello World', 5, '***')).toBe('He***');
      });
    });
  });

  describe('Backward Compatibility', () => {
    test('should maintain existing API signatures', () => {
      // Test that refactored components still accept the same props
      expect(() => {
        render(<Button>Test</Button>);
      }).not.toThrow();

      expect(() => {
        render(<Input label="Test" />);
      }).not.toThrow();

      expect(() => {
        render(
          <Modal isOpen={true} onClose={() => {}}>
            Content
          </Modal>
        );
      }).not.toThrow();
    });

    test('should maintain existing utility function signatures', () => {
      // Test that utility functions still work with existing parameters
      expect(() => deepClone({ a: 1 })).not.toThrow();
      expect(() => isEmpty('')).not.toThrow();
      expect(() => generateId()).not.toThrow();
      expect(() => isValidEmail('test@example.com')).not.toThrow();
      expect(() => formatNumber(1234)).not.toThrow();
    });
  });

  describe('Performance Regression', () => {
    test('should not have significant performance degradation', () => {
      const startTime = performance.now();
      
      // Render multiple components
      for (let i = 0; i < 100; i++) {
        const { unmount } = render(<Button>Button {i}</Button>);
        unmount();
      }
      
      const endTime = performance.now();
      const renderTime = endTime - startTime;
      
      // Should render 100 buttons in less than 1 second
      expect(renderTime).toBeLessThan(1000);
    });

    test('should not have memory leaks in utility functions', () => {
      const initialMemory = performance.memory?.usedJSHeapSize || 0;
      
      // Run utility functions many times
      for (let i = 0; i < 1000; i++) {
        deepClone({ a: i, b: { c: i * 2 } });
        isEmpty(`test${i}`);
        generateId('test');
        isValidEmail(`test${i}@example.com`);
        formatNumber(i * 1234.56);
      }
      
      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }
      
      const finalMemory = performance.memory?.usedJSHeapSize || 0;
      
      // Memory usage should not increase significantly
      if (initialMemory > 0) {
        expect(finalMemory).toBeLessThan(initialMemory * 1.5);
      }
    });
  });
});