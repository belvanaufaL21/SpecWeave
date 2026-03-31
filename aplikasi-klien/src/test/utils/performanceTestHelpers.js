/**
 * Performance Testing Helpers
 * Utilities for testing component and application performance
 */

import { render, cleanup } from '@testing-library/react';
import performanceMonitor from '../../utils/performance/performanceMonitor.js';

/**
 * Performance test configuration
 */
export const performanceConfig = {
  // Render performance thresholds (in milliseconds)
  renderThresholds: {
    fast: 16,      // 60fps budget
    acceptable: 33, // 30fps budget
    slow: 100      // Anything above this is considered slow
  },
  
  // Memory usage thresholds (in bytes)
  memoryThresholds: {
    small: 1024 * 1024,      // 1MB
    medium: 5 * 1024 * 1024, // 5MB
    large: 10 * 1024 * 1024  // 10MB
  },
  
  // Test iteration counts
  iterations: {
    quick: 10,
    standard: 50,
    thorough: 100
  }
};

/**
 * Measure component render performance
 */
export function measureRenderPerformance(Component, props = {}, iterations = performanceConfig.iterations.standard) {
  const measurements = [];
  
  for (let i = 0; i < iterations; i++) {
    const startTime = performance.now();
    const startMemory = getMemoryUsage();
    
    const { unmount } = render(<Component {...props} />);
    
    const renderTime = performance.now();
    const renderDuration = renderTime - startTime;
    
    unmount();
    cleanup();
    
    // Force garbage collection if available
    if (global.gc) global.gc();
    
    const endMemory = getMemoryUsage();
    const memoryDelta = endMemory - startMemory;
    
    measurements.push({
      renderDuration,
      memoryDelta,
      iteration: i + 1
    });
  }
  
  return {
    measurements,
    stats: calculatePerformanceStats(measurements)
  };
}

/**
 * Test component render performance with different prop combinations
 */
export function testRenderPerformanceWithProps(Component, propVariations, threshold = performanceConfig.renderThresholds.acceptable) {
  const results = [];
  
  propVariations.forEach((props, index) => {
    const result = measureRenderPerformance(Component, props, performanceConfig.iterations.quick);
    
    results.push({
      propsIndex: index,
      props,
      performance: result.stats,
      passesThreshold: result.stats.average < threshold
    });
  });
  
  return results;
}

/**
 * Memory leak detection test
 */
export function detectMemoryLeaks(Component, props = {}, iterations = performanceConfig.iterations.standard) {
  const initialMemory = getMemoryUsage();
  const memorySnapshots = [initialMemory];
  
  for (let i = 0; i < iterations; i++) {
    const { unmount } = render(<Component {...props} />);
    unmount();
    cleanup();
    
    // Force garbage collection every 10 iterations
    if (i % 10 === 0 && global.gc) {
      global.gc();
    }
    
    memorySnapshots.push(getMemoryUsage());
  }
  
  const finalMemory = getMemoryUsage();
  const memoryGrowth = finalMemory - initialMemory;
  const memoryGrowthPercentage = (memoryGrowth / initialMemory) * 100;
  
  return {
    initialMemory,
    finalMemory,
    memoryGrowth,
    memoryGrowthPercentage,
    snapshots: memorySnapshots,
    hasMemoryLeak: memoryGrowthPercentage > 50, // Consider >50% growth as potential leak
    iterations
  };
}

/**
 * Test component re-render performance
 */
export function measureReRenderPerformance(Component, initialProps, propUpdates) {
  const measurements = [];
  
  const { rerender } = render(<Component {...initialProps} />);
  
  propUpdates.forEach((newProps, index) => {
    const startTime = performance.now();
    
    rerender(<Component {...newProps} />);
    
    const endTime = performance.now();
    const duration = endTime - startTime;
    
    measurements.push({
      updateIndex: index,
      duration,
      props: newProps
    });
  });
  
  cleanup();
  
  return {
    measurements,
    stats: calculatePerformanceStats(measurements)
  };
}

/**
 * Benchmark component against performance budget
 */
export function benchmarkComponent(Component, testCases, budget = performanceConfig.renderThresholds.fast) {
  const results = {
    passed: 0,
    failed: 0,
    total: testCases.length,
    details: []
  };
  
  testCases.forEach((testCase, index) => {
    const performance = measureRenderPerformance(Component, testCase.props, performanceConfig.iterations.quick);
    const passed = performance.stats.average <= budget;
    
    if (passed) {
      results.passed++;
    } else {
      results.failed++;
    }
    
    results.details.push({
      testCase: testCase.name || `Test ${index + 1}`,
      props: testCase.props,
      performance: performance.stats,
      budget,
      passed,
      margin: budget - performance.stats.average
    });
  });
  
  results.passRate = (results.passed / results.total) * 100;
  
  return results;
}

/**
 * Test long-running operations for performance
 */
export function testLongRunningOperation(operation, maxDuration = 5000) {
  const startTime = performance.now();
  const startMemory = getMemoryUsage();
  
  const result = operation();
  
  const endTime = performance.now();
  const endMemory = getMemoryUsage();
  
  const duration = endTime - startTime;
  const memoryUsed = endMemory - startMemory;
  
  return {
    result,
    duration,
    memoryUsed,
    withinBudget: duration <= maxDuration,
    performance: {
      duration,
      memoryUsed,
      startTime,
      endTime
    }
  };
}

/**
 * Performance regression test
 */
export function performanceRegressionTest(Component, baselineProps, testProps, regressionThreshold = 20) {
  const baseline = measureRenderPerformance(Component, baselineProps, performanceConfig.iterations.quick);
  const test = measureRenderPerformance(Component, testProps, performanceConfig.iterations.quick);
  
  const performanceChange = ((test.stats.average - baseline.stats.average) / baseline.stats.average) * 100;
  const hasRegression = performanceChange > regressionThreshold;
  
  return {
    baseline: baseline.stats,
    test: test.stats,
    performanceChange,
    hasRegression,
    regressionThreshold
  };
}

/**
 * Utility functions
 */
function getMemoryUsage() {
  if (typeof performance !== 'undefined' && performance.memory) {
    return performance.memory.usedJSHeapSize;
  }
  return 0;
}

function calculatePerformanceStats(measurements) {
  const durations = measurements.map(m => m.renderDuration || m.duration);
  const memoryDeltas = measurements.map(m => m.memoryDelta).filter(d => d !== undefined);
  
  durations.sort((a, b) => a - b);
  
  return {
    count: measurements.length,
    average: durations.reduce((sum, d) => sum + d, 0) / durations.length,
    median: durations[Math.floor(durations.length / 2)],
    min: Math.min(...durations),
    max: Math.max(...durations),
    p95: durations[Math.floor(durations.length * 0.95)],
    p99: durations[Math.floor(durations.length * 0.99)],
    standardDeviation: calculateStandardDeviation(durations),
    memoryStats: memoryDeltas.length > 0 ? {
      average: memoryDeltas.reduce((sum, d) => sum + d, 0) / memoryDeltas.length,
      max: Math.max(...memoryDeltas),
      min: Math.min(...memoryDeltas)
    } : null
  };
}

function calculateStandardDeviation(values) {
  const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
  const squaredDifferences = values.map(value => Math.pow(value - mean, 2));
  const variance = squaredDifferences.reduce((sum, value) => sum + value, 0) / values.length;
  return Math.sqrt(variance);
}

/**
 * Performance test matchers for Jest
 */
export const performanceMatchers = {
  toRenderWithinBudget: (received, budget) => {
    const performance = measureRenderPerformance(received.Component, received.props);
    const pass = performance.stats.average <= budget;
    
    return {
      pass,
      message: () => pass
        ? `Expected component to render slower than ${budget}ms, but it rendered in ${performance.stats.average.toFixed(2)}ms`
        : `Expected component to render within ${budget}ms, but it took ${performance.stats.average.toFixed(2)}ms`
    };
  },
  
  toNotHaveMemoryLeaks: (received) => {
    const leakTest = detectMemoryLeaks(received.Component, received.props);
    const pass = !leakTest.hasMemoryLeak;
    
    return {
      pass,
      message: () => pass
        ? `Expected component to have memory leaks, but memory growth was only ${leakTest.memoryGrowthPercentage.toFixed(2)}%`
        : `Expected component to not have memory leaks, but memory grew by ${leakTest.memoryGrowthPercentage.toFixed(2)}%`
    };
  }
};

// Extend Jest matchers if available
if (typeof expect !== 'undefined' && expect.extend) {
  expect.extend(performanceMatchers);
}

export default {
  measureRenderPerformance,
  testRenderPerformanceWithProps,
  detectMemoryLeaks,
  measureReRenderPerformance,
  benchmarkComponent,
  testLongRunningOperation,
  performanceRegressionTest,
  performanceConfig,
  performanceMatchers
};