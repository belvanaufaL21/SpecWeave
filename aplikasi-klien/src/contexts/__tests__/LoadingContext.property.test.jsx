/**
 * Property-based tests for Loading State Management
 * Feature: specweave-ux-revision, Property 8: Loading State Management
 * Validates: Requirements 11.2, 11.4, 11.5
 */

import { renderHook, act } from '@testing-library/react';
import fc from 'fast-check';
import { LoadingProvider, useLoading, LOADING_TYPES, PROGRESS_TYPES } from '../LoadingContext';

// Test wrapper component
const wrapper = ({ children }) => <LoadingProvider>{children}</LoadingProvider>;

describe('Property 8: Loading State Management', () => {
  /**
   * Property: For any loading type and state change, the system should maintain consistent state
   * Validates: Requirements 11.2, 11.4, 11.5
   */
  test('loading state consistency across all operations', () => {
    fc.assert(fc.property(
      fc.constantFrom(...Object.values(LOADING_TYPES)),
      fc.boolean(),
      fc.record({
        message: fc.string(),
        estimatedTime: fc.integer({ min: 1000, max: 60000 }),
        priority: fc.constantFrom('low', 'normal', 'high')
      }),
      (loadingType, isLoading, options) => {
        const { result } = renderHook(() => useLoading(), { wrapper });

        act(() => {
          result.current.setLoading(loadingType, isLoading, options);
        });

        const loadingState = result.current.getLoadingState(loadingType);

        // Property: Loading state should match what was set
        expect(loadingState.isLoading).toBe(isLoading);
        
        if (isLoading) {
          // Property: When loading is active, state should contain expected properties
          expect(loadingState.message).toBe(options.message);
          expect(loadingState.estimatedTime).toBe(options.estimatedTime);
          expect(loadingState.priority).toBe(options.priority);
          expect(loadingState.startTime).toBeGreaterThan(0);
        }

        // Property: isAnyLoading should reflect the current state
        const anyLoading = result.current.isAnyLoading();
        if (isLoading) {
          expect(anyLoading).toBe(true);
        }

        // Property: getActiveLoadingStates should include active states
        const activeStates = result.current.getActiveLoadingStates();
        if (isLoading) {
          expect(activeStates.some(state => state.type === loadingType)).toBe(true);
        } else {
          expect(activeStates.some(state => state.type === loadingType)).toBe(false);
        }
      }
    ), { numRuns: 100 });
  });

  /**
   * Property: For any progress update, the system should maintain progress state consistency
   * Validates: Requirements 11.4, 11.5
   */
  test('progress state consistency across all updates', () => {
    fc.assert(fc.property(
      fc.constantFrom(...Object.values(LOADING_TYPES)),
      fc.constantFrom(...Object.values(PROGRESS_TYPES)),
      fc.record({
        value: fc.integer({ min: 0, max: 100 }),
        max: fc.integer({ min: 1, max: 100 }),
        currentStep: fc.integer({ min: 0, max: 10 }),
        steps: fc.array(fc.record({
          title: fc.string(),
          description: fc.string()
        }), { minLength: 1, maxLength: 5 })
      }),
      (loadingType, progressType, progressData) => {
        const { result } = renderHook(() => useLoading(), { wrapper });

        // First set loading to true
        act(() => {
          result.current.setLoading(loadingType, true);
        });

        // Then set progress
        act(() => {
          result.current.setProgress(loadingType, {
            type: progressType,
            ...progressData
          });
        });

        const progressState = result.current.getProgressState(loadingType);

        // Property: Progress state should match what was set
        expect(progressState.type).toBe(progressType);
        
        if (progressType === PROGRESS_TYPES.DETERMINATE) {
          expect(progressState.value).toBe(progressData.value);
          expect(progressState.max).toBe(progressData.max);
        }
        
        if (progressType === PROGRESS_TYPES.STEPPED) {
          expect(progressState.currentStep).toBe(progressData.currentStep);
          expect(progressState.steps).toEqual(progressData.steps);
        }

        // Property: Progress state should have updatedAt timestamp
        expect(progressState.updatedAt).toBeGreaterThan(0);
      }
    ), { numRuns: 100 });
  });

  /**
   * Property: For any multiple loading operations, state management should remain consistent
   * Validates: Requirements 11.2, 11.4
   */
  test('multiple loading states consistency', () => {
    fc.assert(fc.property(
      fc.array(
        fc.record({
          type: fc.constantFrom(...Object.values(LOADING_TYPES)),
          isLoading: fc.boolean(),
          message: fc.string()
        }),
        { minLength: 1, maxLength: 5 }
      ),
      (loadingOperations) => {
        const { result } = renderHook(() => useLoading(), { wrapper });

        // Apply all loading operations
        act(() => {
          loadingOperations.forEach(op => {
            result.current.setLoading(op.type, op.isLoading, { message: op.message });
          });
        });

        // Group by type and take the last operation for each type (since operations can override)
        const finalStates = {};
        loadingOperations.forEach(op => {
          finalStates[op.type] = op;
        });

        // Property: Each loading state should match the final operation for that type
        Object.values(finalStates).forEach(op => {
          const state = result.current.getLoadingState(op.type);
          expect(state.isLoading).toBe(op.isLoading);
          if (op.isLoading) {
            expect(state.message).toBe(op.message);
          }
        });

        // Property: isAnyLoading should be true if any final operation is loading
        const anyLoading = result.current.isAnyLoading();
        const hasActiveLoading = Object.values(finalStates).some(op => op.isLoading);
        expect(anyLoading).toBe(hasActiveLoading);

        // Property: Active states count should match active operations
        const activeStates = result.current.getActiveLoadingStates();
        const expectedActiveCount = Object.values(finalStates).filter(op => op.isLoading).length;
        expect(activeStates.length).toBe(expectedActiveCount);
      }
    ), { numRuns: 100 });
  });

  /**
   * Property: For any loading state clear operation, all states should be reset
   * Validates: Requirements 11.2
   */
  test('clear all loading states consistency', () => {
    fc.assert(fc.property(
      fc.array(
        fc.constantFrom(...Object.values(LOADING_TYPES)),
        { minLength: 1, maxLength: 5 }
      ),
      (loadingTypes) => {
        const { result } = renderHook(() => useLoading(), { wrapper });

        // Set multiple loading states
        act(() => {
          loadingTypes.forEach(type => {
            result.current.setLoading(type, true, { message: 'Test loading' });
          });
        });

        // Verify states are set
        expect(result.current.isAnyLoading()).toBe(true);

        // Clear all loading states
        act(() => {
          result.current.clearAllLoading();
        });

        // Property: After clearing, no loading states should be active
        expect(result.current.isAnyLoading()).toBe(false);
        expect(result.current.getActiveLoadingStates()).toHaveLength(0);

        // Property: Each individual state should be cleared
        loadingTypes.forEach(type => {
          const state = result.current.getLoadingState(type);
          expect(state.isLoading).toBe(false);
        });
      }
    ), { numRuns: 100 });
  });

  /**
   * Property: For any withLoading operation, loading state should be managed automatically
   * Validates: Requirements 11.5
   */
  test('withLoading wrapper consistency', async () => {
    await fc.assert(fc.asyncProperty(
      fc.constantFrom(...Object.values(LOADING_TYPES)),
      fc.integer({ min: 10, max: 50 }), // Reduced delay for faster tests
      fc.boolean(),
      async (loadingType, delay, shouldThrow) => {
        const { result } = renderHook(() => useLoading(), { wrapper });

        const asyncOperation = async () => {
          await new Promise(resolve => setTimeout(resolve, delay));
          if (shouldThrow) {
            throw new Error('Test error');
          }
          return 'success';
        };

        // Property: Before operation, loading should be false
        expect(result.current.getLoadingState(loadingType).isLoading).toBe(false);

        let operationResult;
        let operationError;

        try {
          // Execute the withLoading operation and wait for it to complete
          operationResult = await act(async () => {
            return await result.current.withLoading(loadingType, asyncOperation);
          });
        } catch (error) {
          operationError = error;
        }

        // Property: After operation, loading should be false regardless of success/failure
        expect(result.current.getLoadingState(loadingType).isLoading).toBe(false);

        // Property: Operation result should match expected outcome
        if (shouldThrow) {
          expect(operationError).toBeDefined();
          expect(operationError.message).toBe('Test error');
          expect(operationResult).toBeUndefined();
        } else {
          expect(operationResult).toBe('success');
          expect(operationError).toBeUndefined();
        }
      }
    ), { numRuns: 30 }); // Reduced runs for async tests
  });
});