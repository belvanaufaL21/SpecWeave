/**
 * Property-Based Testing Helpers
 * Utilities for creating property-based tests with fast-check
 */

import fc from 'fast-check';

/**
 * Common arbitraries for UI components
 */
export const arbitraries = {
  // Basic types
  nonEmptyString: fc.string({ minLength: 1, maxLength: 100 }),
  shortString: fc.string({ maxLength: 50 }),
  longString: fc.string({ minLength: 100, maxLength: 1000 }),
  positiveInteger: fc.integer({ min: 1, max: 1000 }),
  percentage: fc.float({ min: 0, max: 100 }),
  
  // UI-specific
  cssClass: fc.stringOf(fc.constantFrom('a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm', 'n', 'o', 'p', 'q', 'r', 's', 't', 'u', 'v', 'w', 'x', 'y', 'z', '-', '_'), { minLength: 1, maxLength: 20 }),
  color: fc.oneof(
    fc.constant('red'),
    fc.constant('blue'),
    fc.constant('green'),
    fc.constant('yellow'),
    fc.constant('purple'),
    fc.constant('pink'),
    fc.constant('gray')
  ),
  size: fc.oneof(
    fc.constant('xs'),
    fc.constant('sm'),
    fc.constant('md'),
    fc.constant('lg'),
    fc.constant('xl')
  ),
  
  // Component props
  buttonProps: fc.record({
    variant: fc.oneof(fc.constant('primary'), fc.constant('secondary'), fc.constant('outline'), fc.constant('ghost')),
    size: fc.oneof(fc.constant('sm'), fc.constant('md'), fc.constant('lg')),
    disabled: fc.boolean(),
    loading: fc.boolean()
  }),
  
  modalProps: fc.record({
    isOpen: fc.boolean(),
    size: fc.oneof(fc.constant('sm'), fc.constant('md'), fc.constant('lg'), fc.constant('xl')),
    closeOnBackdrop: fc.boolean(),
    closeOnEscape: fc.boolean(),
    showCloseButton: fc.boolean()
  }),
  
  tableColumn: fc.record({
    key: fc.string({ minLength: 1, maxLength: 20 }),
    title: fc.string({ minLength: 1, maxLength: 50 }),
    sortable: fc.boolean(),
    filterable: fc.boolean(),
    width: fc.option(fc.integer({ min: 50, max: 500 }))
  }),
  
  // Data structures
  tableData: fc.array(
    fc.record({
      id: fc.integer({ min: 1, max: 10000 }),
      name: fc.string({ minLength: 1, maxLength: 50 }),
      email: fc.emailAddress(),
      status: fc.oneof(fc.constant('active'), fc.constant('inactive'), fc.constant('pending')),
      createdAt: fc.date({ min: new Date('2020-01-01'), max: new Date() })
    }),
    { minLength: 0, maxLength: 100 }
  ),
  
  // Performance-related
  performanceMetric: fc.record({
    name: fc.string({ minLength: 1, maxLength: 50 }),
    duration: fc.float({ min: 0, max: 5000 }),
    timestamp: fc.integer({ min: Date.now() - 86400000, max: Date.now() }),
    success: fc.boolean()
  }),
  
  // Error scenarios
  apiError: fc.record({
    status: fc.integer({ min: 400, max: 599 }),
    message: fc.string({ minLength: 1, maxLength: 200 }),
    code: fc.option(fc.string({ minLength: 1, maxLength: 20 }))
  }),
  
  // User interactions
  userEvent: fc.record({
    type: fc.oneof(
      fc.constant('click'),
      fc.constant('keydown'),
      fc.constant('focus'),
      fc.constant('blur'),
      fc.constant('submit')
    ),
    target: fc.string({ minLength: 1, maxLength: 50 }),
    timestamp: fc.integer({ min: Date.now() - 3600000, max: Date.now() })
  })
};

/**
 * Property test configuration presets
 */
export const testConfigs = {
  // Fast tests for CI
  fast: {
    numRuns: 10,
    timeout: 1000,
    seed: 42
  },
  
  // Standard tests for development
  standard: {
    numRuns: 100,
    timeout: 5000
  },
  
  // Thorough tests for release
  thorough: {
    numRuns: 1000,
    timeout: 30000
  },
  
  // Performance-focused tests
  performance: {
    numRuns: 50,
    timeout: 2000,
    endOnFailure: true
  }
};

/**
 * Common property test patterns
 */
export const propertyPatterns = {
  /**
   * Test that a function is idempotent
   */
  idempotent: (fn, arbitrary) => {
    return fc.property(arbitrary, (input) => {
      const result1 = fn(input);
      const result2 = fn(result1);
      expect(result2).toEqual(result1);
    });
  },
  
  /**
   * Test that a function preserves certain invariants
   */
  invariant: (fn, arbitrary, invariantCheck) => {
    return fc.property(arbitrary, (input) => {
      const result = fn(input);
      expect(invariantCheck(input, result)).toBe(true);
    });
  },
  
  /**
   * Test that a function handles all valid inputs without throwing
   */
  noThrow: (fn, arbitrary) => {
    return fc.property(arbitrary, (input) => {
      expect(() => fn(input)).not.toThrow();
    });
  },
  
  /**
   * Test that a component renders without crashing
   */
  renderStability: (Component, propsArbitrary) => {
    return fc.property(propsArbitrary, (props) => {
      expect(() => {
        const { unmount } = render(<Component {...props} />);
        unmount();
      }).not.toThrow();
    });
  },
  
  /**
   * Test that a component's output is deterministic
   */
  deterministic: (Component, propsArbitrary) => {
    return fc.property(propsArbitrary, (props) => {
      const { container: container1, unmount: unmount1 } = render(<Component {...props} />);
      const html1 = container1.innerHTML;
      unmount1();
      
      const { container: container2, unmount: unmount2 } = render(<Component {...props} />);
      const html2 = container2.innerHTML;
      unmount2();
      
      expect(html1).toBe(html2);
    });
  },
  
  /**
   * Test performance characteristics
   */
  performance: (fn, arbitrary, maxDuration = 100) => {
    return fc.property(arbitrary, (input) => {
      const start = performance.now();
      fn(input);
      const end = performance.now();
      const duration = end - start;
      
      expect(duration).toBeLessThan(maxDuration);
    });
  },
  
  /**
   * Test memory usage doesn't grow excessively
   */
  memoryStability: (fn, arbitrary, maxMemoryGrowth = 1024 * 1024) => {
    return fc.property(arbitrary, (input) => {
      const initialMemory = performance.memory?.usedJSHeapSize || 0;
      
      fn(input);
      
      // Force garbage collection if available
      if (global.gc) global.gc();
      
      const finalMemory = performance.memory?.usedJSHeapSize || 0;
      const memoryGrowth = finalMemory - initialMemory;
      
      expect(memoryGrowth).toBeLessThan(maxMemoryGrowth);
    });
  }
};

/**
 * Test data generators for common scenarios
 */
export const generators = {
  /**
   * Generate realistic user data
   */
  userData: () => fc.record({
    id: fc.integer({ min: 1, max: 100000 }),
    name: fc.string({ minLength: 2, maxLength: 50 }),
    email: fc.emailAddress(),
    age: fc.integer({ min: 18, max: 100 }),
    role: fc.oneof(fc.constant('admin'), fc.constant('user'), fc.constant('moderator')),
    active: fc.boolean(),
    createdAt: fc.date({ min: new Date('2020-01-01'), max: new Date() }),
    preferences: fc.record({
      theme: fc.oneof(fc.constant('light'), fc.constant('dark')),
      notifications: fc.boolean(),
      language: fc.oneof(fc.constant('en'), fc.constant('es'), fc.constant('fr'))
    })
  }),
  
  /**
   * Generate test scenarios with different data sizes
   */
  scalabilityScenarios: () => fc.oneof(
    fc.record({ size: fc.constant('small'), data: fc.array(fc.anything(), { maxLength: 10 }) }),
    fc.record({ size: fc.constant('medium'), data: fc.array(fc.anything(), { maxLength: 100 }) }),
    fc.record({ size: fc.constant('large'), data: fc.array(fc.anything(), { maxLength: 1000 }) })
  ),
  
  /**
   * Generate error scenarios
   */
  errorScenarios: () => fc.oneof(
    fc.record({ type: fc.constant('network'), error: fc.record({ message: fc.constant('Network error'), code: fc.constant('NETWORK_ERROR') }) }),
    fc.record({ type: fc.constant('validation'), error: fc.record({ message: fc.string(), field: fc.string() }) }),
    fc.record({ type: fc.constant('server'), error: fc.record({ status: fc.integer({ min: 500, max: 599 }), message: fc.string() }) }),
    fc.record({ type: fc.constant('timeout'), error: fc.record({ message: fc.constant('Request timeout'), timeout: fc.integer({ min: 1000, max: 30000 }) }) })
  )
};

/**
 * Utility functions for property tests
 */
export const utils = {
  /**
   * Create a property test with custom configuration
   */
  createPropertyTest: (name, property, config = testConfigs.standard) => {
    return it(name, () => {
      fc.assert(property, config);
    });
  },
  
  /**
   * Skip property test in CI if it's too slow
   */
  skipInCI: (testFn) => {
    return process.env.CI ? it.skip : testFn;
  },
  
  /**
   * Run property test only in development
   */
  devOnly: (testFn) => {
    return process.env.NODE_ENV === 'development' ? testFn : it.skip;
  },
  
  /**
   * Measure test execution time
   */
  withTiming: (testFn) => {
    return (...args) => {
      const start = performance.now();
      const result = testFn(...args);
      const end = performance.now();
      console.log(`Test executed in ${(end - start).toFixed(2)}ms`);
      return result;
    };
  }
};

export default {
  arbitraries,
  testConfigs,
  propertyPatterns,
  generators,
  utils
};