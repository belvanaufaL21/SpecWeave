/**
 * Network Recovery Service
 * Handles network errors, retries, and graceful degradation for external services
 */

import { ExternalServiceError } from '../middlewares/errorHandler.js';
import errorHandler from '../utils/errorHandler.js';

class NetworkRecoveryService {
  constructor() {
    this.retryConfig = {
      maxRetries: 3,
      baseDelay: 1000,
      maxDelay: 30000,
      backoffMultiplier: 2,
      jitter: true
    };
    
    this.circuitBreakers = new Map();
    this.requestQueue = new Map();
    this.serviceHealth = new Map();
    
    // Default circuit breaker config
    this.defaultCircuitBreakerConfig = {
      failureThreshold: 5,
      timeout: 60000, // 1 minute
      halfOpenSuccessThreshold: 3,
      state: 'CLOSED',
      failureCount: 0,
      successCount: 0,
      lastFailureTime: null
    };
    
    this.setupDefaultServices();
  }

  /**
   * Setup default service configurations
   */
  setupDefaultServices() {
    const services = [
      'supabase',
      'openai',
      'jira',
      'python-ml',
      'external-api'
    ];
    
    services.forEach(service => {
      this.circuitBreakers.set(service, { ...this.defaultCircuitBreakerConfig });
      this.serviceHealth.set(service, {
        isHealthy: true,
        lastCheck: null,
        consecutiveFailures: 0,
        averageResponseTime: 0,
        totalRequests: 0,
        successfulRequests: 0
      });
    });
  }

  /**
   * Execute network request with recovery
   */
  async executeWithRecovery(requestFn, options = {}) {
    const {
      serviceName = 'external-api',
      timeout = 30000,
      retries = this.retryConfig.maxRetries,
      fallback = null,
      cacheKey = null,
      cacheTTL = 300
    } = options;

    const circuitBreaker = this.circuitBreakers.get(serviceName);
    
    // Check circuit breaker
    if (circuitBreaker.state === 'OPEN') {
      if (this.shouldAttemptHalfOpen(circuitBreaker)) {
        circuitBreaker.state = 'HALF_OPEN';
        console.log(`🔄 Circuit breaker for ${serviceName} moving to HALF_OPEN`);
      } else {
        return this.handleCircuitBreakerOpen(serviceName, fallback);
      }
    }

    // Check if request is already in progress (deduplication)
    if (cacheKey && this.requestQueue.has(cacheKey)) {
      console.log(`⏳ Deduplicating request for ${cacheKey}`);
      return this.requestQueue.get(cacheKey);
    }

    const requestPromise = this.executeRequest(requestFn, {
      serviceName,
      timeout,
      retries,
      fallback
    });

    // Store in queue for deduplication
    if (cacheKey) {
      this.requestQueue.set(cacheKey, requestPromise);
      
      // Clean up after completion
      requestPromise.finally(() => {
        this.requestQueue.delete(cacheKey);
      });
    }

    return requestPromise;
  }

  /**
   * Execute request with retry logic
   */
  async executeRequest(requestFn, options) {
    const { serviceName, timeout, retries, fallback } = options;
    const startTime = Date.now();
    
    let lastError;
    
    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        // Add timeout wrapper
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Request timeout')), timeout)
        );
        
        const result = await Promise.race([requestFn(), timeoutPromise]);
        
        // Record success
        this.recordSuccess(serviceName, Date.now() - startTime);
        
        return result;
        
      } catch (error) {
        lastError = error;
        
        // Record failure
        this.recordFailure(serviceName, error);
        
        // Don't retry on certain errors
        if (this.shouldNotRetry(error)) {
          break;
        }
        
        // Don't delay on last attempt
        if (attempt < retries) {
          const delay = this.calculateDelay(attempt);
          console.log(`🔄 Retrying ${serviceName} request in ${delay}ms (attempt ${attempt + 1}/${retries + 1})`);
          await this.delay(delay);
        }
      }
    }
    
    // All retries failed
    console.error(`❌ All retry attempts failed for ${serviceName}:`, lastError);
    
    // Try fallback
    if (fallback) {
      console.log(`📦 Using fallback for ${serviceName}`);
      return fallback();
    }
    
    // Throw enhanced error
    throw this.enhanceError(lastError, serviceName);
  }

  /**
   * Record successful request
   */
  recordSuccess(serviceName, responseTime) {
    const circuitBreaker = this.circuitBreakers.get(serviceName);
    const health = this.serviceHealth.get(serviceName);
    
    // Update circuit breaker
    if (circuitBreaker.state === 'HALF_OPEN') {
      circuitBreaker.successCount++;
      
      if (circuitBreaker.successCount >= circuitBreaker.halfOpenSuccessThreshold) {
        circuitBreaker.state = 'CLOSED';
        circuitBreaker.failureCount = 0;
        circuitBreaker.successCount = 0;
        console.log(`✅ Circuit breaker for ${serviceName} closed - service recovered`);
      }
    } else if (circuitBreaker.state === 'CLOSED') {
      circuitBreaker.failureCount = Math.max(0, circuitBreaker.failureCount - 1);
    }
    
    // Update health metrics
    health.isHealthy = true;
    health.lastCheck = new Date();
    health.consecutiveFailures = 0;
    health.totalRequests++;
    health.successfulRequests++;
    
    // Update average response time
    const totalResponseTime = health.averageResponseTime * (health.totalRequests - 1) + responseTime;
    health.averageResponseTime = totalResponseTime / health.totalRequests;
  }

  /**
   * Record failed request
   */
  recordFailure(serviceName, error) {
    const circuitBreaker = this.circuitBreakers.get(serviceName);
    const health = this.serviceHealth.get(serviceName);
    
    // Update circuit breaker
    circuitBreaker.failureCount++;
    circuitBreaker.lastFailureTime = Date.now();
    
    if (circuitBreaker.state === 'CLOSED' && 
        circuitBreaker.failureCount >= circuitBreaker.failureThreshold) {
      circuitBreaker.state = 'OPEN';
      console.warn(`🚨 Circuit breaker for ${serviceName} opened - too many failures`);
    } else if (circuitBreaker.state === 'HALF_OPEN') {
      circuitBreaker.state = 'OPEN';
      circuitBreaker.successCount = 0;
      console.warn(`🚨 Circuit breaker for ${serviceName} reopened - half-open test failed`);
    }
    
    // Update health metrics
    health.consecutiveFailures++;
    health.totalRequests++;
    health.lastCheck = new Date();
    
    if (health.consecutiveFailures >= 3) {
      health.isHealthy = false;
    }
    
    // Log error for monitoring
    errorHandler.handleError(this.enhanceError(error, serviceName));
  }

  /**
   * Check if should attempt half-open state
   */
  shouldAttemptHalfOpen(circuitBreaker) {
    return Date.now() - circuitBreaker.lastFailureTime > circuitBreaker.timeout;
  }

  /**
   * Handle circuit breaker open state
   */
  handleCircuitBreakerOpen(serviceName, fallback) {
    console.warn(`⚡ Circuit breaker OPEN for ${serviceName} - rejecting request`);
    
    if (fallback) {
      console.log(`📦 Using fallback for ${serviceName}`);
      return fallback();
    }
    
    throw new ExternalServiceError(
      `${serviceName} service temporarily unavailable`,
      serviceName,
      503
    );
  }

  /**
   * Check if error should not be retried
   */
  shouldNotRetry(error) {
    // Don't retry client errors (4xx)
    if (error.status >= 400 && error.status < 500) {
      return true;
    }
    
    // Don't retry authentication errors
    if (error.status === 401 || error.status === 403) {
      return true;
    }
    
    // Don't retry validation errors
    if (error.name === 'ValidationError') {
      return true;
    }
    
    // Don't retry certain error types
    const nonRetryableErrors = [
      'SyntaxError',
      'TypeError',
      'ReferenceError'
    ];
    
    return nonRetryableErrors.includes(error.name);
  }

  /**
   * Calculate retry delay with exponential backoff and jitter
   */
  calculateDelay(attempt) {
    let delay = this.retryConfig.baseDelay * Math.pow(this.retryConfig.backoffMultiplier, attempt);
    delay = Math.min(delay, this.retryConfig.maxDelay);
    
    // Add jitter to prevent thundering herd
    if (this.retryConfig.jitter) {
      delay = delay * (0.5 + Math.random() * 0.5);
    }
    
    return Math.floor(delay);
  }

  /**
   * Enhance error with additional context
   */
  enhanceError(error, serviceName) {
    if (error instanceof ExternalServiceError) {
      return error;
    }
    
    let statusCode = 502; // Bad Gateway
    
    if (error.message?.includes('timeout')) {
      statusCode = 504; // Gateway Timeout
    } else if (error.message?.includes('network') || error.code === 'ECONNREFUSED') {
      statusCode = 503; // Service Unavailable
    }
    
    return new ExternalServiceError(
      `${serviceName} service error: ${error.message}`,
      serviceName,
      statusCode
    );
  }

  /**
   * Create HTTP request with recovery
   */
  async fetch(url, options = {}) {
    const serviceName = this.extractServiceName(url);
    
    return this.executeWithRecovery(
      () => fetch(url, options),
      {
        serviceName,
        timeout: options.timeout || 30000,
        retries: options.retries,
        fallback: options.fallback,
        cacheKey: options.cacheKey
      }
    );
  }

  /**
   * Extract service name from URL
   */
  extractServiceName(url) {
    try {
      const urlObj = new URL(url);
      const hostname = urlObj.hostname;
      
      // Map known services
      if (hostname.includes('supabase')) return 'supabase';
      if (hostname.includes('openai')) return 'openai';
      if (hostname.includes('atlassian')) return 'jira';
      if (hostname.includes('localhost') || hostname.includes('127.0.0.1')) return 'python-ml';
      
      return hostname.split('.')[0] || 'external-api';
    } catch {
      return 'external-api';
    }
  }

  /**
   * Get service health status
   */
  getServiceHealth(serviceName) {
    const health = this.serviceHealth.get(serviceName);
    const circuitBreaker = this.circuitBreakers.get(serviceName);
    
    if (!health || !circuitBreaker) {
      return null;
    }
    
    return {
      serviceName,
      isHealthy: health.isHealthy,
      circuitBreakerState: circuitBreaker.state,
      consecutiveFailures: health.consecutiveFailures,
      averageResponseTime: Math.round(health.averageResponseTime),
      successRate: health.totalRequests > 0 
        ? Math.round((health.successfulRequests / health.totalRequests) * 100)
        : 0,
      lastCheck: health.lastCheck,
      totalRequests: health.totalRequests
    };
  }

  /**
   * Get all services health status
   */
  getAllServicesHealth() {
    const services = Array.from(this.serviceHealth.keys());
    return services.map(service => this.getServiceHealth(service));
  }

  /**
   * Reset service health (for testing or recovery)
   */
  resetServiceHealth(serviceName) {
    const circuitBreaker = this.circuitBreakers.get(serviceName);
    const health = this.serviceHealth.get(serviceName);
    
    if (circuitBreaker) {
      Object.assign(circuitBreaker, this.defaultCircuitBreakerConfig);
    }
    
    if (health) {
      Object.assign(health, {
        isHealthy: true,
        lastCheck: null,
        consecutiveFailures: 0,
        averageResponseTime: 0,
        totalRequests: 0,
        successfulRequests: 0
      });
    }
    
    console.log(`🔄 Reset health status for ${serviceName}`);
  }

  /**
   * Test service connectivity
   */
  async testService(serviceName, testFn) {
    try {
      const startTime = Date.now();
      await testFn();
      const responseTime = Date.now() - startTime;
      
      this.recordSuccess(serviceName, responseTime);
      
      return {
        success: true,
        responseTime,
        message: `${serviceName} service is healthy`
      };
    } catch (error) {
      this.recordFailure(serviceName, error);
      
      return {
        success: false,
        error: error.message,
        message: `${serviceName} service is unhealthy`
      };
    }
  }

  /**
   * Delay utility
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get network recovery statistics
   */
  getStats() {
    const services = this.getAllServicesHealth();
    
    return {
      services,
      totalServices: services.length,
      healthyServices: services.filter(s => s.isHealthy).length,
      openCircuitBreakers: services.filter(s => s.circuitBreakerState === 'OPEN').length,
      averageResponseTime: Math.round(
        services.reduce((sum, s) => sum + s.averageResponseTime, 0) / services.length
      ),
      totalRequests: services.reduce((sum, s) => sum + s.totalRequests, 0),
      timestamp: new Date().toISOString()
    };
  }
}

// Create singleton instance
const networkRecoveryService = new NetworkRecoveryService();

export default networkRecoveryService;