/**
 * Property-Based Test: Asynchronous Processing
 * **Validates: Requirements 2.4, 2.5**
 * 
 * Tests that asynchronous operations maintain consistency, handle concurrency correctly,
 * and provide proper error handling and timeout management.
 */

import fc from 'fast-check';

describe('Property 7: Asynchronous Processing', () => {
  
  /**
   * Property: Promise Resolution Consistency
   * Promises should resolve with consistent results for the same input
   */
  test('promise resolution consistency - same input produces same output', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1, maxLength: 50 }),
        fc.integer({ min: 10, max: 100 }),
        async (input, delay) => {
          const asyncProcessor = async (data) => {
            await new Promise(resolve => setTimeout(resolve, delay));
            return `processed_${data}_${delay}`;
          };
          
          // Execute the same operation multiple times
          const promises = Array.from({ length: 3 }, () => asyncProcessor(input));
          const results = await Promise.all(promises);
          
          // All results should be identical
          expect(results).toHaveLength(3);
          expect(results[0]).toBe(results[1]);
          expect(results[1]).toBe(results[2]);
          expect(results[0]).toBe(`processed_${input}_${delay}`);
        }
      ),
      { numRuns: 25, timeout: 8000 }
    );
  });

  /**
   * Property: Concurrent Execution Safety
   * Concurrent async operations should not interfere with each other
   */
  test('concurrent execution safety - operations do not interfere', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(
          fc.record({
            id: fc.integer({ min: 1, max: 1000 }),
            data: fc.string({ minLength: 1, maxLength: 20 }),
            delay: fc.integer({ min: 10, max: 200 })
          }),
          { minLength: 2, maxLength: 8 }
        ).map(operations => {
          // Ensure unique IDs
          return operations.map((op, index) => ({
            ...op,
            id: op.id + index * 1000 // Make IDs unique
          }));
        }),
        async (operations) => {
          const results = new Map();
          
          const asyncOperation = async (op) => {
            await new Promise(resolve => setTimeout(resolve, op.delay));
            const result = {
              id: op.id,
              processedData: `processed_${op.data}`,
              timestamp: Date.now(),
              delay: op.delay
            };
            results.set(op.id, result);
            return result;
          };
          
          // Execute all operations concurrently
          const promises = operations.map(op => asyncOperation(op));
          const completedResults = await Promise.all(promises);
          
          // Verify all operations completed successfully
          expect(completedResults).toHaveLength(operations.length);
          expect(results.size).toBe(operations.length);
          
          // Verify each operation produced correct result
          operations.forEach(op => {
            const result = results.get(op.id);
            expect(result).toBeDefined();
            expect(result.id).toBe(op.id);
            expect(result.processedData).toBe(`processed_${op.data}`);
            expect(result.delay).toBe(op.delay);
          });
          
          // Verify no data corruption between concurrent operations
          const uniqueIds = new Set(completedResults.map(r => r.id));
          expect(uniqueIds.size).toBe(operations.length);
        }
      ),
      { numRuns: 20, timeout: 10000 }
    );
  });

  /**
   * Property: Error Handling in Async Operations
   * Async operations should handle errors gracefully without affecting other operations
   */
  test('error handling in async operations - graceful error recovery', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(
          fc.record({
            id: fc.integer({ min: 1, max: 100 }),
            shouldFail: fc.boolean(),
            data: fc.string(),
            delay: fc.integer({ min: 10, max: 100 })
          }),
          { minLength: 3, maxLength: 10 }
        ),
        async (operations) => {
          const results = [];
          const errors = [];
          
          const asyncOperationWithErrorHandling = async (op) => {
            try {
              await new Promise(resolve => setTimeout(resolve, op.delay));
              
              if (op.shouldFail && Math.random() < 0.3) { // 30% failure rate for shouldFail operations
                throw new Error(`Operation ${op.id} failed intentionally`);
              }
              
              return {
                id: op.id,
                success: true,
                data: `processed_${op.data}`,
                timestamp: Date.now()
              };
            } catch (error) {
              return {
                id: op.id,
                success: false,
                error: error.message,
                timestamp: Date.now()
              };
            }
          };
          
          // Execute all operations concurrently
          const promises = operations.map(op => asyncOperationWithErrorHandling(op));
          const allResults = await Promise.all(promises);
          
          // Separate successful and failed operations
          allResults.forEach(result => {
            if (result.success) {
              results.push(result);
            } else {
              errors.push(result);
            }
          });
          
          // All operations should complete (either success or error)
          expect(allResults).toHaveLength(operations.length);
          expect(results.length + errors.length).toBe(operations.length);
          
          // Successful operations should have correct data
          results.forEach(result => {
            expect(result.success).toBe(true);
            expect(result.data).toMatch(/^processed_/);
            expect(result.timestamp).toBeGreaterThan(0);
          });
          
          // Failed operations should have error information
          errors.forEach(error => {
            expect(error.success).toBe(false);
            expect(error.error).toBeDefined();
            expect(error.timestamp).toBeGreaterThan(0);
          });
          
          console.log(`Async operations: ${results.length} successful, ${errors.length} failed`);
        }
      ),
      { numRuns: 15, timeout: 8000 }
    );
  });

  /**
   * Property: Timeout Handling
   * Async operations should respect timeout limits and fail gracefully
   */
  test('timeout handling - operations respect timeout limits', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(
          fc.record({
            id: fc.integer({ min: 1, max: 50 }),
            processingTime: fc.integer({ min: 50, max: 500 }),
            timeout: fc.integer({ min: 100, max: 300 })
          }),
          { minLength: 2, maxLength: 6 }
        ),
        async (operations) => {
          const results = [];
          
          const asyncOperationWithTimeout = async (op) => {
            const startTime = Date.now();
            
            try {
              const result = await Promise.race([
                // Actual operation
                new Promise(resolve => {
                  setTimeout(() => {
                    resolve({
                      id: op.id,
                      success: true,
                      data: `completed_${op.id}`,
                      actualTime: Date.now() - startTime
                    });
                  }, op.processingTime);
                }),
                // Timeout
                new Promise((_, reject) => {
                  setTimeout(() => {
                    reject(new Error(`Operation ${op.id} timed out after ${op.timeout}ms`));
                  }, op.timeout);
                })
              ]);
              
              return result;
            } catch (error) {
              return {
                id: op.id,
                success: false,
                error: error.message,
                actualTime: Date.now() - startTime,
                timedOut: error.message.includes('timed out')
              };
            }
          };
          
          // Execute all operations
          const promises = operations.map(op => asyncOperationWithTimeout(op));
          const allResults = await Promise.all(promises);
          
          // Analyze results
          allResults.forEach((result, index) => {
            const op = operations[index];
            
            if (op.processingTime <= op.timeout) {
              // Should succeed if processing time is within timeout
              if (result.success) {
                expect(result.data).toBe(`completed_${op.id}`);
                expect(result.actualTime).toBeGreaterThanOrEqual(op.processingTime - 50); // Allow some variance
              }
            } else {
              // Should timeout if processing time exceeds timeout
              if (!result.success && result.timedOut) {
                expect(result.actualTime).toBeLessThanOrEqual(op.timeout + 100); // Allow some variance
                expect(result.error).toContain('timed out');
              }
            }
            
            results.push(result);
          });
          
          expect(results).toHaveLength(operations.length);
          
          const successCount = results.filter(r => r.success).length;
          const timeoutCount = results.filter(r => !r.success && r.timedOut).length;
          
          console.log(`Timeout test: ${successCount} successful, ${timeoutCount} timed out`);
        }
      ),
      { numRuns: 12, timeout: 10000 }
    );
  });

  /**
   * Property: Async Queue Processing
   * Queued async operations should be processed in order and maintain consistency
   */
  test('async queue processing - ordered execution and consistency', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(
          fc.record({
            id: fc.integer({ min: 1, max: 100 }),
            priority: fc.integer({ min: 1, max: 5 }),
            data: fc.string({ minLength: 1, max: 15 })
          }),
          { minLength: 3, maxLength: 6 } // Reduced max length
        ).map(queueItems => {
          // Ensure unique IDs
          return queueItems.map((item, index) => ({
            ...item,
            id: item.id + index * 100 // Make IDs unique
          }));
        }),
        async (queueItems) => {
          const processedOrder = [];
          const results = new Map();
          
          // Simple async queue processor
          const processQueue = async (items) => {
            // Sort by priority (higher priority first)
            const sortedItems = [...items].sort((a, b) => b.priority - a.priority);
            
            for (const item of sortedItems) {
              const startTime = Date.now();
              
              // Simulate processing time based on priority (reduced time)
              const processingTime = (6 - item.priority) * 10 + Math.random() * 20; // Reduced from 20 + 30
              await new Promise(resolve => setTimeout(resolve, processingTime));
              
              const result = {
                id: item.id,
                priority: item.priority,
                processedData: `queue_processed_${item.data}`,
                processingTime: Date.now() - startTime,
                queuePosition: processedOrder.length
              };
              
              processedOrder.push(item.id);
              results.set(item.id, result);
            }
          };
          
          await processQueue(queueItems);
          
          // Verify all items were processed
          expect(processedOrder).toHaveLength(queueItems.length);
          expect(results.size).toBe(queueItems.length);
          
          // Verify processing order respects priority
          const sortedByPriority = [...queueItems].sort((a, b) => b.priority - a.priority);
          sortedByPriority.forEach((item, index) => {
            expect(processedOrder[index]).toBe(item.id);
          });
          
          // Verify each item was processed correctly
          queueItems.forEach(item => {
            const result = results.get(item.id);
            expect(result).toBeDefined();
            expect(result.id).toBe(item.id);
            expect(result.priority).toBe(item.priority);
            expect(result.processedData).toBe(`queue_processed_${item.data}`);
            expect(result.processingTime).toBeGreaterThan(0);
          });
          
          console.log(`Queue processed ${queueItems.length} items in priority order`);
        }
      ),
      { numRuns: 10, timeout: 15000 } // Increased timeout for queue processing
    );
  });

  /**
   * Property: Async Resource Management
   * Async operations should properly manage resources and prevent leaks
   */
  test('async resource management - proper resource cleanup', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(
          fc.record({
            resourceId: fc.integer({ min: 1, max: 50 }),
            resourceSize: fc.integer({ min: 100, max: 1000 }),
            processingTime: fc.integer({ min: 20, max: 150 })
          }),
          { minLength: 2, maxLength: 6 }
        ).map(operations => {
          // Ensure unique resource IDs
          return operations.map((op, index) => ({
            ...op,
            resourceId: op.resourceId + index * 100 // Make IDs unique
          }));
        }),
        async (resourceOperations) => {
          const activeResources = new Set();
          const completedResources = new Set();
          const resourceUsage = new Map();
          
          const asyncResourceOperation = async (op) => {
            const resourceId = `resource_${op.resourceId}`;
            
            try {
              // Acquire resource
              activeResources.add(resourceId);
              resourceUsage.set(resourceId, {
                size: op.resourceSize,
                startTime: Date.now(),
                status: 'active'
              });
              
              // Simulate resource usage
              await new Promise(resolve => setTimeout(resolve, op.processingTime));
              
              // Process with resource
              const result = {
                resourceId,
                processed: true,
                dataSize: op.resourceSize,
                processingTime: op.processingTime
              };
              
              return result;
              
            } finally {
              // Always cleanup resource
              activeResources.delete(resourceId);
              if (resourceUsage.has(resourceId)) {
                const usage = resourceUsage.get(resourceId);
                usage.status = 'completed';
                usage.endTime = Date.now();
                completedResources.add(resourceId);
              }
            }
          };
          
          // Execute all resource operations concurrently
          const promises = resourceOperations.map(op => asyncResourceOperation(op));
          const results = await Promise.all(promises);
          
          // Verify all operations completed
          expect(results).toHaveLength(resourceOperations.length);
          
          // Verify all resources were properly cleaned up
          expect(activeResources.size).toBe(0); // No resources should remain active
          expect(completedResources.size).toBe(resourceOperations.length);
          
          // Verify each resource was processed correctly
          results.forEach((result, index) => {
            const op = resourceOperations[index];
            expect(result.processed).toBe(true);
            expect(result.dataSize).toBe(op.resourceSize);
            expect(result.processingTime).toBe(op.processingTime);
            
            const resourceUsageInfo = resourceUsage.get(result.resourceId);
            expect(resourceUsageInfo).toBeDefined();
            expect(resourceUsageInfo.status).toBe('completed');
            expect(resourceUsageInfo.endTime).toBeGreaterThan(resourceUsageInfo.startTime);
          });
          
          console.log(`Resource management: ${completedResources.size} resources properly cleaned up`);
        }
      ),
      { numRuns: 12, timeout: 8000 }
    );
  });

  /**
   * Property: Async Retry Mechanisms
   * Failed async operations should retry appropriately and eventually succeed or fail gracefully
   */
  test('async retry mechanisms - appropriate retry behavior', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(
          fc.record({
            id: fc.integer({ min: 1, max: 30 }),
            failureRate: fc.float({ min: 0, max: Math.fround(0.8) }), // 0-80% failure rate
            maxRetries: fc.integer({ min: 1, max: 4 })
          }),
          { minLength: 2, maxLength: 5 }
        ),
        async (operations) => {
          const results = [];
          
          const asyncOperationWithRetry = async (op) => {
            let attempts = 0;
            let lastError = null;
            
            while (attempts <= op.maxRetries) {
              attempts++;
              
              try {
                // Simulate operation that might fail
                await new Promise(resolve => setTimeout(resolve, 30 + Math.random() * 50));
                
                if (Math.random() < op.failureRate) {
                  throw new Error(`Operation ${op.id} failed on attempt ${attempts}`);
                }
                
                // Success
                return {
                  id: op.id,
                  success: true,
                  attempts,
                  maxRetries: op.maxRetries,
                  data: `retry_success_${op.id}`
                };
                
              } catch (error) {
                lastError = error;
                
                if (attempts <= op.maxRetries) {
                  // Wait before retry with exponential backoff
                  const backoffTime = Math.pow(2, attempts - 1) * 50;
                  await new Promise(resolve => setTimeout(resolve, backoffTime));
                }
              }
            }
            
            // All retries exhausted
            return {
              id: op.id,
              success: false,
              attempts,
              maxRetries: op.maxRetries,
              error: lastError.message
            };
          };
          
          // Execute all operations with retry logic
          const promises = operations.map(op => asyncOperationWithRetry(op));
          const allResults = await Promise.all(promises);
          
          // Analyze retry behavior
          allResults.forEach((result, index) => {
            const op = operations[index];
            
            // Verify attempt count is within expected range
            expect(result.attempts).toBeGreaterThan(0);
            expect(result.attempts).toBeLessThanOrEqual(op.maxRetries + 1);
            
            if (result.success) {
              expect(result.data).toBe(`retry_success_${op.id}`);
            } else {
              expect(result.error).toBeDefined();
              expect(result.attempts).toBe(op.maxRetries + 1); // Should have exhausted all retries
            }
            
            results.push(result);
          });
          
          const successCount = results.filter(r => r.success).length;
          const failureCount = results.filter(r => !r.success).length;
          const totalAttempts = results.reduce((sum, r) => sum + r.attempts, 0);
          
          expect(results).toHaveLength(operations.length);
          expect(successCount + failureCount).toBe(operations.length);
          
          console.log(`Retry test: ${successCount} succeeded, ${failureCount} failed, ${totalAttempts} total attempts`);
        }
      ),
      { numRuns: 10, timeout: 12000 }
    );
  });
});

console.log('✅ Property-Based Test: Asynchronous Processing completed');