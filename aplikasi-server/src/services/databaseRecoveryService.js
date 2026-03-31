/**
 * Database Recovery Service
 * Handles database reconnection, recovery mechanisms, and graceful degradation
 */

import { createClient } from '@supabase/supabase-js';
import { DatabaseError } from '../middlewares/errorHandler.js';
import errorHandler from '../utils/errorHandler.js';

class DatabaseRecoveryService {
  constructor() {
    this.supabaseUrl = process.env.SUPABASE_URL;
    this.supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    this.supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
    
    // Connection state
    this.isConnected = true;
    this.connectionAttempts = 0;
    this.maxConnectionAttempts = 5;
    this.reconnectDelay = 1000; // Start with 1 second
    this.maxReconnectDelay = 30000; // Max 30 seconds
    this.connectionTimeout = 10000; // 10 seconds
    
    // Circuit breaker state
    this.circuitBreaker = {
      state: 'CLOSED', // CLOSED, OPEN, HALF_OPEN
      failureCount: 0,
      failureThreshold: 5,
      timeout: 60000, // 1 minute
      lastFailureTime: null,
      successCount: 0,
      halfOpenSuccessThreshold: 3
    };
    
    // Health check
    this.healthCheckInterval = null;
    this.healthCheckFrequency = 30000; // 30 seconds
    this.lastHealthCheck = null;
    
    // Clients
    this.adminClient = null;
    this.anonClient = null;
    
    // Recovery strategies
    this.recoveryStrategies = new Map();
    this.fallbackData = new Map();
    
    this.initializeClients();
    this.startHealthCheck();
    this.setupRecoveryStrategies();
  }

  /**
   * Initialize Supabase clients
   */
  initializeClients() {
    try {
      this.adminClient = createClient(this.supabaseUrl, this.supabaseServiceKey, {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        },
        global: {
          headers: {
            'x-connection-id': `admin-${Date.now()}`
          }
        }
      });

      this.anonClient = createClient(this.supabaseUrl, this.supabaseAnonKey, {
        global: {
          headers: {
            'x-connection-id': `anon-${Date.now()}`
          }
        }
      });

      // Only log in verbose mode
      if (process.env.LOG_LEVEL === 'DEBUG') {
        console.log('✅ Database clients initialized successfully');
      }
    } catch (error) {
      console.error('❌ Failed to initialize database clients:', error);
      this.handleConnectionFailure(error);
    }
  }

  /**
   * Get admin client with connection validation
   */
  async getAdminClient() {
    if (this.circuitBreaker.state === 'OPEN') {
      throw new DatabaseError('Database circuit breaker is OPEN', 'connection', 'database');
    }

    if (!this.isConnected) {
      await this.attemptReconnection();
    }

    return this.adminClient;
  }

  /**
   * Get anonymous client with connection validation
   */
  async getAnonClient() {
    if (this.circuitBreaker.state === 'OPEN') {
      throw new DatabaseError('Database circuit breaker is OPEN', 'connection', 'database');
    }

    if (!this.isConnected) {
      await this.attemptReconnection();
    }

    return this.anonClient;
  }

  /**
   * Execute database operation with recovery
   */
  async executeWithRecovery(operation, context = {}) {
    const operationType = context.type || 'query';
    const tableName = context.table || 'unknown';
    
    try {
      // Check circuit breaker
      if (this.circuitBreaker.state === 'OPEN') {
        if (this.shouldAttemptHalfOpen()) {
          this.circuitBreaker.state = 'HALF_OPEN';
          console.log('🔄 Circuit breaker moving to HALF_OPEN state');
        } else {
          return this.handleCircuitBreakerOpen(operationType, tableName, context);
        }
      }

      // Execute operation
      const result = await operation();
      
      // Record success
      this.recordSuccess();
      
      return result;
      
    } catch (error) {
      // Record failure
      this.recordFailure(error);
      
      // Attempt recovery
      return this.attemptRecovery(operation, error, context);
    }
  }

  /**
   * Attempt to recover from database error
   */
  async attemptRecovery(operation, error, context) {
    const errorType = this.classifyError(error);
    
    console.log(`🔧 Attempting recovery for ${errorType} error:`, error.message);
    
    switch (errorType) {
      case 'connection':
        return this.recoverFromConnectionError(operation, error, context);
      
      case 'timeout':
        return this.recoverFromTimeoutError(operation, error, context);
      
      case 'rate_limit':
        return this.recoverFromRateLimitError(operation, error, context);
      
      case 'temporary':
        return this.recoverFromTemporaryError(operation, error, context);
      
      default:
        return this.handleUnrecoverableError(error, context);
    }
  }

  /**
   * Classify error type for recovery strategy
   */
  classifyError(error) {
    const message = error.message?.toLowerCase() || '';
    const code = error.code || '';
    
    if (message.includes('connection') || message.includes('network') || code === 'ECONNREFUSED') {
      return 'connection';
    }
    
    if (message.includes('timeout') || code === 'ETIMEDOUT') {
      return 'timeout';
    }
    
    if (message.includes('rate limit') || error.status === 429) {
      return 'rate_limit';
    }
    
    if (error.status >= 500 && error.status < 600) {
      return 'temporary';
    }
    
    return 'permanent';
  }

  /**
   * Recover from connection errors
   */
  async recoverFromConnectionError(operation, error, context) {
    console.log('🔌 Attempting connection recovery...');
    
    // Mark as disconnected
    this.isConnected = false;
    
    // Attempt reconnection
    const reconnected = await this.attemptReconnection();
    
    if (reconnected) {
      try {
        // Retry operation with new connection
        return await operation();
      } catch (retryError) {
        console.error('❌ Operation failed after reconnection:', retryError);
        return this.getFallbackData(context);
      }
    }
    
    return this.getFallbackData(context);
  }

  /**
   * Recover from timeout errors
   */
  async recoverFromTimeoutError(operation, error, context) {
    console.log('⏱️ Attempting timeout recovery...');
    
    // Wait a bit and retry with shorter timeout
    await this.delay(1000);
    
    try {
      // Retry with reduced timeout
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Retry timeout')), 5000)
      );
      
      return await Promise.race([operation(), timeoutPromise]);
    } catch (retryError) {
      console.error('❌ Timeout retry failed:', retryError);
      return this.getFallbackData(context);
    }
  }

  /**
   * Recover from rate limit errors
   */
  async recoverFromRateLimitError(operation, error, context) {
    console.log('🚦 Attempting rate limit recovery...');
    
    // Extract retry-after header if available
    const retryAfter = error.headers?.['retry-after'] || 5;
    const delay = Math.min(retryAfter * 1000, 30000); // Max 30 seconds
    
    console.log(`⏳ Waiting ${delay}ms before retry...`);
    await this.delay(delay);
    
    try {
      return await operation();
    } catch (retryError) {
      console.error('❌ Rate limit retry failed:', retryError);
      return this.getFallbackData(context);
    }
  }

  /**
   * Recover from temporary errors
   */
  async recoverFromTemporaryError(operation, error, context) {
    console.log('🔄 Attempting temporary error recovery...');
    
    // Exponential backoff retry
    const maxRetries = 3;
    let delay = 1000;
    
    for (let i = 0; i < maxRetries; i++) {
      console.log(`🔄 Retry attempt ${i + 1}/${maxRetries} after ${delay}ms...`);
      await this.delay(delay);
      
      try {
        return await operation();
      } catch (retryError) {
        if (i === maxRetries - 1) {
          console.error('❌ All retry attempts failed:', retryError);
          return this.getFallbackData(context);
        }
        delay *= 2; // Exponential backoff
      }
    }
  }

  /**
   * Handle unrecoverable errors
   */
  handleUnrecoverableError(error, context) {
    console.error('💥 Unrecoverable database error:', error);
    
    // Log error for monitoring
    errorHandler.handleError(new DatabaseError(
      `Unrecoverable database error: ${error.message}`,
      context.type,
      context.table
    ));
    
    // Return fallback data if available
    return this.getFallbackData(context);
  }

  /**
   * Attempt database reconnection
   */
  async attemptReconnection() {
    if (this.connectionAttempts >= this.maxConnectionAttempts) {
      console.error('❌ Max reconnection attempts reached');
      return false;
    }

    this.connectionAttempts++;
    const delay = Math.min(this.reconnectDelay * Math.pow(2, this.connectionAttempts - 1), this.maxReconnectDelay);
    
    console.log(`🔄 Reconnection attempt ${this.connectionAttempts}/${this.maxConnectionAttempts} in ${delay}ms...`);
    
    await this.delay(delay);
    
    try {
      // Reinitialize clients
      this.initializeClients();
      
      // Test connection
      const isHealthy = await this.performHealthCheck();
      
      if (isHealthy) {
        this.isConnected = true;
        this.connectionAttempts = 0;
        this.reconnectDelay = 1000; // Reset delay
        console.log('✅ Database reconnection successful');
        return true;
      } else {
        console.error('❌ Health check failed after reconnection');
        return this.attemptReconnection();
      }
    } catch (error) {
      console.error(`❌ Reconnection attempt ${this.connectionAttempts} failed:`, error);
      return this.attemptReconnection();
    }
  }

  /**
   * Perform health check
   */
  async performHealthCheck() {
    try {
      const startTime = Date.now();
      
      // Simple query to test connection
      const { data, error } = await Promise.race([
        this.adminClient.from('profiles').select('count').limit(1),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Health check timeout')), this.connectionTimeout)
        )
      ]);
      
      const duration = Date.now() - startTime;
      
      if (error) {
        console.error('❌ Health check failed:', error);
        this.lastHealthCheck = { success: false, duration, error: error.message, timestamp: new Date() };
        return false;
      }
      
      // Only log in verbose mode
      if (process.env.LOG_LEVEL === 'DEBUG') {
        console.log(`✅ Health check passed (${duration}ms)`);
      }
      this.lastHealthCheck = { success: true, duration, timestamp: new Date() };
      return true;
      
    } catch (error) {
      console.error('❌ Health check error:', error);
      this.lastHealthCheck = { success: false, error: error.message, timestamp: new Date() };
      return false;
    }
  }

  /**
   * Start periodic health checks
   */
  startHealthCheck() {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }
    
    this.healthCheckInterval = setInterval(async () => {
      const isHealthy = await this.performHealthCheck();
      
      if (!isHealthy && this.isConnected) {
        console.warn('⚠️ Health check failed, marking as disconnected');
        this.isConnected = false;
        this.handleConnectionFailure(new Error('Health check failed'));
      }
    }, this.healthCheckFrequency);
    // Silent - no startup message
  }

  /**
   * Stop health checks
   */
  stopHealthCheck() {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
      if (process.env.NODE_ENV === 'development') {
        console.log('Health check stopped');
      }
    }
  }

  /**
   * Handle connection failure
   */
  handleConnectionFailure(error) {
    this.isConnected = false;
    this.recordFailure(error);
    
    console.error('💥 Database connection failure:', error.message);
    
    // Log error for monitoring
    errorHandler.handleError(new DatabaseError(
      `Database connection failure: ${error.message}`,
      'connection',
      'database'
    ));
  }

  /**
   * Record operation success
   */
  recordSuccess() {
    if (this.circuitBreaker.state === 'HALF_OPEN') {
      this.circuitBreaker.successCount++;
      
      if (this.circuitBreaker.successCount >= this.circuitBreaker.halfOpenSuccessThreshold) {
        this.circuitBreaker.state = 'CLOSED';
        this.circuitBreaker.failureCount = 0;
        this.circuitBreaker.successCount = 0;
        console.log('✅ Circuit breaker closed - service recovered');
      }
    } else if (this.circuitBreaker.state === 'CLOSED') {
      this.circuitBreaker.failureCount = Math.max(0, this.circuitBreaker.failureCount - 1);
    }
  }

  /**
   * Record operation failure
   */
  recordFailure(error) {
    this.circuitBreaker.failureCount++;
    this.circuitBreaker.lastFailureTime = Date.now();
    
    if (this.circuitBreaker.state === 'CLOSED' && 
        this.circuitBreaker.failureCount >= this.circuitBreaker.failureThreshold) {
      this.circuitBreaker.state = 'OPEN';
      console.warn('🚨 Circuit breaker opened - too many failures');
    } else if (this.circuitBreaker.state === 'HALF_OPEN') {
      this.circuitBreaker.state = 'OPEN';
      this.circuitBreaker.successCount = 0;
      console.warn('🚨 Circuit breaker reopened - half-open test failed');
    }
  }

  /**
   * Check if should attempt half-open state
   */
  shouldAttemptHalfOpen() {
    return Date.now() - this.circuitBreaker.lastFailureTime > this.circuitBreaker.timeout;
  }

  /**
   * Handle circuit breaker open state
   */
  handleCircuitBreakerOpen(operationType, tableName, context) {
    console.warn(`⚡ Circuit breaker OPEN - rejecting ${operationType} on ${tableName}`);
    
    // Return fallback data if available
    const fallback = this.getFallbackData(context);
    if (fallback) {
      return fallback;
    }
    
    // Throw error if no fallback available
    throw new DatabaseError(
      'Database service temporarily unavailable',
      operationType,
      tableName
    );
  }

  /**
   * Setup recovery strategies
   */
  setupRecoveryStrategies() {
    // Strategy for user profiles
    this.recoveryStrategies.set('profiles', {
      fallback: () => ({ id: null, email: 'offline@user.com', name: 'Offline User' }),
      cache: true,
      cacheTTL: 300
    });
    
    // Strategy for test results
    this.recoveryStrategies.set('test_results', {
      fallback: () => [],
      cache: true,
      cacheTTL: 60
    });
    
    // Strategy for templates
    this.recoveryStrategies.set('templates', {
      fallback: () => this.getDefaultTemplates(),
      cache: true,
      cacheTTL: 600
    });
  }

  /**
   * Get fallback data for operation
   */
  getFallbackData(context) {
    const tableName = context.table;
    const strategy = this.recoveryStrategies.get(tableName);
    
    if (strategy && strategy.fallback) {
      console.log(`📦 Using fallback data for ${tableName}`);
      return { data: strategy.fallback(), fromFallback: true };
    }
    
    console.warn(`⚠️ No fallback data available for ${tableName}`);
    return null;
  }

  /**
   * Get default templates for fallback
   */
  getDefaultTemplates() {
    return [
      {
        id: 'default-1',
        name: 'Basic User Story',
        content: 'As a [user type], I want [functionality] so that [benefit].',
        category: 'user-story',
        is_default: true
      }
    ];
  }

  /**
   * Delay utility
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get connection status
   */
  getStatus() {
    return {
      isConnected: this.isConnected,
      connectionAttempts: this.connectionAttempts,
      circuitBreaker: {
        state: this.circuitBreaker.state,
        failureCount: this.circuitBreaker.failureCount,
        successCount: this.circuitBreaker.successCount
      },
      lastHealthCheck: this.lastHealthCheck,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Reset connection state (for testing)
   */
  reset() {
    this.isConnected = true;
    this.connectionAttempts = 0;
    this.circuitBreaker = {
      state: 'CLOSED',
      failureCount: 0,
      failureThreshold: 5,
      timeout: 60000,
      lastFailureTime: null,
      successCount: 0,
      halfOpenSuccessThreshold: 3
    };
  }

  /**
   * Graceful shutdown
   */
  async shutdown() {
    console.log('🔌 Shutting down database recovery service...');
    
    this.stopHealthCheck();
    
    // Close connections if needed
    // Supabase client doesn't have explicit close method
    
    console.log('✅ Database recovery service shutdown complete');
  }
}

// Create singleton instance
const databaseRecoveryService = new DatabaseRecoveryService();

export default databaseRecoveryService;