import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import { EventEmitter } from 'events';
import cacheService from '../cacheService.js';

// Handle __dirname for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Optimized Python ML Service
 * Features: Connection pooling, timeout management, error handling, caching, monitoring
 */
class PythonMLServiceOptimized extends EventEmitter {
  constructor() {
    super();
    
    // Configuration
    this.config = {
      maxConcurrentProcesses: parseInt(process.env.PYTHON_MAX_CONCURRENT) || 5,
      processTimeout: parseInt(process.env.PYTHON_TIMEOUT_MS) || 30000,
      retryAttempts: parseInt(process.env.PYTHON_RETRY_ATTEMPTS) || 2,
      retryDelay: parseInt(process.env.PYTHON_RETRY_DELAY_MS) || 1000,
      pythonPath: process.env.PYTHON_PATH || 'python',
      cacheEnabled: process.env.PYTHON_CACHE_ENABLED !== 'false',
      cacheTTL: parseInt(process.env.PYTHON_CACHE_TTL) || 3600 // 1 hour
    };
    
    // Process pool management
    this.processPool = {
      active: new Map(),
      queue: [],
      count: 0
    };
    
    // Performance metrics
    this.metrics = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      cachedRequests: 0,
      averageResponseTime: 0,
      responseTimeSum: 0,
      timeoutErrors: 0,
      retryCount: 0,
      activeProcesses: 0,
      queuedRequests: 0
    };
    
    // Health monitoring
    this.healthCheck = {
      lastSuccessfulRequest: Date.now(),
      consecutiveFailures: 0,
      isHealthy: true
    };
    
    // Cleanup interval
    this.cleanupInterval = setInterval(() => {
      this.cleanupStaleProcesses();
    }, 60000); // Every minute
  }

  /**
   * Calculate METEOR score with optimization
   * @param {string} generatedText - Generated text
   * @param {string} referenceText - Reference text
   * @param {Object} options - Options
   * @returns {Promise<Object>} METEOR result
   */
  async calculateMeteorScore(generatedText, referenceText, options = {}) {
    const startTime = Date.now();
    const requestId = `meteor_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    try {
      // Check cache first if enabled
      if (this.config.cacheEnabled) {
        const cacheKey = this.createCacheKey('meteor', generatedText, referenceText);
        const cachedResult = await cacheService.get(cacheKey);
        
        if (cachedResult) {
          this.metrics.cachedRequests++;
          this.recordMetrics(Date.now() - startTime, true, true);
          
          console.log(`📦 METEOR result retrieved from cache (${requestId})`);
          return {
            ...cachedResult,
            fromCache: true,
            requestId
          };
        }
      }
      
      // Execute Python script
      const scriptPath = path.join(__dirname, '../../python/meteor_calculator.py');
      const result = await this.executePythonScript(
        scriptPath,
        [generatedText, referenceText],
        { requestId, timeout: options.timeout }
      );
      
      // Cache successful results
      if (this.config.cacheEnabled && result.success) {
        const cacheKey = this.createCacheKey('meteor', generatedText, referenceText);
        await cacheService.set(cacheKey, result, this.config.cacheTTL);
      }
      
      const responseTime = Date.now() - startTime;
      this.recordMetrics(responseTime, result.success, false);
      
      return {
        ...result,
        fromCache: false,
        requestId,
        responseTime
      };
      
    } catch (error) {
      const responseTime = Date.now() - startTime;
      this.recordMetrics(responseTime, false, false);
      
      console.error(`❌ METEOR calculation failed (${requestId}):`, error.message);
      throw new Error(`METEOR calculation failed: ${error.message}`);
    }
  }

  /**
   * Calculate Sentence-BERT score with optimization
   * @param {string} generatedText - Generated text
   * @param {string} referenceText - Reference text
   * @param {Object} options - Options
   * @returns {Promise<Object>} Sentence-BERT result
   */
  async calculateSentenceBertScore(generatedText, referenceText, options = {}) {
    const startTime = Date.now();
    const requestId = `sbert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    try {
      // Check cache first if enabled
      if (this.config.cacheEnabled) {
        const cacheKey = this.createCacheKey('sentence_bert', generatedText, referenceText);
        const cachedResult = await cacheService.get(cacheKey);
        
        if (cachedResult) {
          this.metrics.cachedRequests++;
          this.recordMetrics(Date.now() - startTime, true, true);
          
          console.log(`📦 Sentence-BERT result retrieved from cache (${requestId})`);
          return {
            ...cachedResult,
            fromCache: true,
            requestId
          };
        }
      }
      
      // Execute Python script
      const scriptPath = path.join(__dirname, '../../python/sentence_bert_calculator.py');
      const result = await this.executePythonScript(
        scriptPath,
        [generatedText, referenceText],
        { requestId, timeout: options.timeout }
      );
      
      // Cache successful results
      if (this.config.cacheEnabled && result.success) {
        const cacheKey = this.createCacheKey('sentence_bert', generatedText, referenceText);
        await cacheService.set(cacheKey, result, this.config.cacheTTL);
      }
      
      const responseTime = Date.now() - startTime;
      this.recordMetrics(responseTime, result.success, false);
      
      return {
        ...result,
        fromCache: false,
        requestId,
        responseTime
      };
      
    } catch (error) {
      const responseTime = Date.now() - startTime;
      this.recordMetrics(responseTime, false, false);
      
      console.error(`❌ Sentence-BERT calculation failed (${requestId}):`, error.message);
      throw new Error(`Sentence-BERT calculation failed: ${error.message}`);
    }
  }

  /**
   * Execute batch calculations with parallel processing
   * @param {Array} requests - Array of calculation requests
   * @param {Object} options - Options
   * @returns {Promise<Array>} Array of results
   */
  async executeBatch(requests, options = {}) {
    const startTime = Date.now();
    const batchId = `batch_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    try {
      console.log(`🚀 Starting batch execution (${batchId}) with ${requests.length} requests`);
      
      // Limit concurrent executions
      const maxConcurrent = Math.min(requests.length, this.config.maxConcurrentProcesses);
      const results = [];
      
      // Process requests in chunks
      for (let i = 0; i < requests.length; i += maxConcurrent) {
        const chunk = requests.slice(i, i + maxConcurrent);
        const chunkPromises = chunk.map(async (request, index) => {
          try {
            const globalIndex = i + index;
            
            if (request.type === 'meteor') {
              return await this.calculateMeteorScore(
                request.generatedText,
                request.referenceText,
                { ...options, batchId, index: globalIndex }
              );
            } else if (request.type === 'sentence_bert') {
              return await this.calculateSentenceBertScore(
                request.generatedText,
                request.referenceText,
                { ...options, batchId, index: globalIndex }
              );
            } else {
              throw new Error(`Unknown request type: ${request.type}`);
            }
          } catch (error) {
            return {
              success: false,
              error: error.message,
              type: request.type,
              index: i + index
            };
          }
        });
        
        const chunkResults = await Promise.all(chunkPromises);
        results.push(...chunkResults);
        
        // Small delay between chunks to prevent overwhelming the system
        if (i + maxConcurrent < requests.length) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }
      
      const responseTime = Date.now() - startTime;
      const successCount = results.filter(r => r.success).length;
      
      console.log(`✅ Batch execution completed (${batchId}): ${successCount}/${requests.length} successful in ${responseTime}ms`);
      
      return {
        success: true,
        batchId,
        results,
        summary: {
          total: requests.length,
          successful: successCount,
          failed: requests.length - successCount,
          responseTime
        }
      };
      
    } catch (error) {
      console.error(`❌ Batch execution failed (${batchId}):`, error.message);
      throw new Error(`Batch execution failed: ${error.message}`);
    }
  }

  /**
   * Execute Python script with optimized process management
   * @param {string} scriptPath - Path to Python script
   * @param {Array} args - Script arguments
   * @param {Object} options - Execution options
   * @returns {Promise<Object>} Script result
   */
  async executePythonScript(scriptPath, args = [], options = {}) {
    const { requestId, timeout = this.config.processTimeout } = options;
    
    return new Promise((resolve, reject) => {
      // Check if we can start a new process
      if (this.processPool.count >= this.config.maxConcurrentProcesses) {
        this.processPool.queue.push({ scriptPath, args, options, resolve, reject });
        this.metrics.queuedRequests++;
        console.log(`📋 Request queued (${requestId}): ${this.processPool.queue.length} in queue`);
        return;
      }
      
      this.startPythonProcess(scriptPath, args, options, resolve, reject);
    });
  }

  /**
   * Start Python process with monitoring
   * @param {string} scriptPath - Script path
   * @param {Array} args - Arguments
   * @param {Object} options - Options
   * @param {Function} resolve - Promise resolve
   * @param {Function} reject - Promise reject
   */
  startPythonProcess(scriptPath, args, options, resolve, reject) {
    const { requestId, timeout = this.config.processTimeout } = options;
    const startTime = Date.now();
    
    // Increment active process count
    this.processPool.count++;
    this.metrics.activeProcesses = this.processPool.count;
    
    console.log(`🐍 Starting Python process (${requestId}): ${this.processPool.count} active`);
    
    // Spawn Python process
    const pythonProcess = spawn(this.config.pythonPath, [scriptPath, ...args], {
      stdio: ['pipe', 'pipe', 'pipe'],
      timeout: timeout
    });
    
    // Store process reference
    this.processPool.active.set(requestId, {
      process: pythonProcess,
      startTime,
      timeout
    });
    
    let result = '';
    let errorOutput = '';
    let isResolved = false;
    
    // Set up timeout
    const timeoutHandle = setTimeout(() => {
      if (!isResolved) {
        isResolved = true;
        this.metrics.timeoutErrors++;
        
        console.warn(`⏰ Python process timeout (${requestId}): ${timeout}ms`);
        
        // Kill process
        if (!pythonProcess.killed) {
          pythonProcess.kill('SIGKILL');
        }
        
        this.cleanupProcess(requestId);
        reject(new Error(`Python process timeout after ${timeout}ms`));
      }
    }, timeout);
    
    // Handle stdout
    pythonProcess.stdout.on('data', (data) => {
      result += data.toString();
    });
    
    // Handle stderr
    pythonProcess.stderr.on('data', (data) => {
      errorOutput += data.toString();
    });
    
    // Handle process completion
    pythonProcess.on('close', (code) => {
      clearTimeout(timeoutHandle);
      
      if (isResolved) return;
      isResolved = true;
      
      const duration = Date.now() - startTime;
      console.log(`🏁 Python process completed (${requestId}): code ${code}, ${duration}ms`);
      
      this.cleanupProcess(requestId);
      
      if (code === 0) {
        try {
          const parsedResult = JSON.parse(result);
          
          if (parsedResult.error) {
            this.updateHealthStatus(false);
            reject(new Error(`Python script error: ${parsedResult.error}`));
          } else {
            this.updateHealthStatus(true);
            resolve(parsedResult);
          }
        } catch (parseError) {
          this.updateHealthStatus(false);
          reject(new Error(`Failed to parse Python result: ${parseError.message}`));
        }
      } else {
        this.updateHealthStatus(false);
        reject(new Error(`Python process failed with code ${code}: ${errorOutput}`));
      }
    });
    
    // Handle process errors
    pythonProcess.on('error', (error) => {
      clearTimeout(timeoutHandle);
      
      if (isResolved) return;
      isResolved = true;
      
      console.error(`❌ Python process error (${requestId}):`, error.message);
      
      this.cleanupProcess(requestId);
      this.updateHealthStatus(false);
      reject(new Error(`Failed to start Python process: ${error.message}`));
    });
  }

  /**
   * Cleanup process and process next in queue
   * @param {string} requestId - Request ID
   */
  cleanupProcess(requestId) {
    // Remove from active processes
    this.processPool.active.delete(requestId);
    this.processPool.count--;
    this.metrics.activeProcesses = this.processPool.count;
    
    // Process next in queue
    if (this.processPool.queue.length > 0) {
      const next = this.processPool.queue.shift();
      this.metrics.queuedRequests = this.processPool.queue.length;
      
      setImmediate(() => {
        this.startPythonProcess(
          next.scriptPath,
          next.args,
          next.options,
          next.resolve,
          next.reject
        );
      });
    }
  }

  /**
   * Cleanup stale processes
   */
  cleanupStaleProcesses() {
    const now = Date.now();
    const staleThreshold = this.config.processTimeout * 2; // 2x timeout
    
    for (const [requestId, processInfo] of this.processPool.active.entries()) {
      if (now - processInfo.startTime > staleThreshold) {
        console.warn(`🧹 Cleaning up stale process (${requestId})`);
        
        if (!processInfo.process.killed) {
          processInfo.process.kill('SIGKILL');
        }
        
        this.cleanupProcess(requestId);
      }
    }
  }

  /**
   * Create cache key for ML operations
   * @param {string} operation - Operation type
   * @param {string} generatedText - Generated text
   * @param {string} referenceText - Reference text
   * @returns {string} Cache key
   */
  createCacheKey(operation, generatedText, referenceText) {
    const combined = `${generatedText}|${referenceText}`;
    const hash = Buffer.from(combined).toString('base64').slice(0, 32);
    return cacheService.createKey(`ml_${operation}`, hash);
  }

  /**
   * Record performance metrics
   * @param {number} responseTime - Response time in ms
   * @param {boolean} success - Success status
   * @param {boolean} fromCache - Whether result was from cache
   */
  recordMetrics(responseTime, success, fromCache) {
    this.metrics.totalRequests++;
    
    if (success) {
      this.metrics.successfulRequests++;
    } else {
      this.metrics.failedRequests++;
    }
    
    if (!fromCache) {
      this.metrics.responseTimeSum += responseTime;
      this.metrics.averageResponseTime = this.metrics.responseTimeSum / 
        (this.metrics.totalRequests - this.metrics.cachedRequests);
    }
  }

  /**
   * Update health status
   * @param {boolean} success - Success status
   */
  updateHealthStatus(success) {
    if (success) {
      this.healthCheck.lastSuccessfulRequest = Date.now();
      this.healthCheck.consecutiveFailures = 0;
      this.healthCheck.isHealthy = true;
    } else {
      this.healthCheck.consecutiveFailures++;
      
      // Mark as unhealthy after 5 consecutive failures
      if (this.healthCheck.consecutiveFailures >= 5) {
        this.healthCheck.isHealthy = false;
      }
    }
  }

  /**
   * Get service metrics
   * @returns {Object} Service metrics
   */
  getMetrics() {
    return {
      ...this.metrics,
      healthCheck: this.healthCheck,
      processPool: {
        active: this.processPool.count,
        queued: this.processPool.queue.length,
        maxConcurrent: this.config.maxConcurrentProcesses
      },
      config: {
        timeout: this.config.processTimeout,
        cacheEnabled: this.config.cacheEnabled,
        cacheTTL: this.config.cacheTTL
      },
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Get service health status
   * @returns {Object} Health status
   */
  getHealthStatus() {
    const timeSinceLastSuccess = Date.now() - this.healthCheck.lastSuccessfulRequest;
    const isStale = timeSinceLastSuccess > 300000; // 5 minutes
    
    return {
      status: this.healthCheck.isHealthy && !isStale ? 'healthy' : 'unhealthy',
      consecutiveFailures: this.healthCheck.consecutiveFailures,
      lastSuccessfulRequest: new Date(this.healthCheck.lastSuccessfulRequest).toISOString(),
      timeSinceLastSuccess: timeSinceLastSuccess,
      activeProcesses: this.processPool.count,
      queuedRequests: this.processPool.queue.length,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Retry failed operation
   * @param {Function} operation - Operation to retry
   * @param {Array} args - Operation arguments
   * @param {number} maxRetries - Maximum retry attempts
   * @returns {Promise<any>} Operation result
   */
  async retryOperation(operation, args, maxRetries = this.config.retryAttempts) {
    let lastError;
    
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        if (attempt > 0) {
          this.metrics.retryCount++;
          console.log(`🔄 Retry attempt ${attempt}/${maxRetries}`);
          
          // Exponential backoff
          const delay = this.config.retryDelay * Math.pow(2, attempt - 1);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
        
        return await operation.apply(this, args);
        
      } catch (error) {
        lastError = error;
        
        if (attempt === maxRetries) {
          console.error(`❌ All retry attempts failed: ${error.message}`);
          break;
        }
      }
    }
    
    throw lastError;
  }

  /**
   * Shutdown service gracefully
   */
  async shutdown() {
    console.log('🛑 Shutting down Python ML Service...');
    
    // Clear cleanup interval
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    
    // Kill all active processes
    for (const [requestId, processInfo] of this.processPool.active.entries()) {
      console.log(`🔪 Killing process ${requestId}`);
      if (!processInfo.process.killed) {
        processInfo.process.kill('SIGTERM');
      }
    }
    
    // Wait for processes to terminate
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Force kill any remaining processes
    for (const [requestId, processInfo] of this.processPool.active.entries()) {
      if (!processInfo.process.killed) {
        console.log(`🔪 Force killing process ${requestId}`);
        processInfo.process.kill('SIGKILL');
      }
    }
    
    console.log('✅ Python ML Service shutdown complete');
  }
}

// Create singleton instance
const pythonMLService = new PythonMLServiceOptimized();

// Graceful shutdown handling
process.on('SIGTERM', async () => {
  await pythonMLService.shutdown();
  process.exit(0);
});

process.on('SIGINT', async () => {
  await pythonMLService.shutdown();
  process.exit(0);
});

export default pythonMLService;