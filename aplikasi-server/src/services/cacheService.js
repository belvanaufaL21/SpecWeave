import Redis from 'ioredis';
import cleanLogger from '../config/cleanLogging.js';

/**
 * Cache Service
 * Provides Redis-based caching with fallback to in-memory cache
 */
class CacheService {
  constructor() {
    this.redis = null;
    this.memoryCache = new Map();
    this.isRedisConnected = false;
    this.defaultTTL = 300; // 5 minutes
    this.maxMemoryCacheSize = 1000;
    
    this.initializeRedis();
  }

  /**
   * Initialize Redis connection
   */
  async initializeRedis() {
    try {
      const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
      const maxRetries = parseInt(process.env.REDIS_MAX_RETRIES) || 3;
      const retryDelay = parseInt(process.env.REDIS_RETRY_DELAY) || 1000;
      
      this.redis = new Redis(redisUrl, {
        retryDelayOnFailover: retryDelay,
        enableReadyCheck: false,
        maxRetriesPerRequest: maxRetries,
        lazyConnect: true,
        connectTimeout: 5000,
        commandTimeout: 3000,
        showFriendlyErrorStack: false
      });

      let errorCount = 0;
      const maxErrorLogs = 3; // Only log first 3 errors to reduce noise

      this.redis.on('connect', () => {
        cleanLogger.cache('redis', 'connected');
        this.isRedisConnected = true;
        errorCount = 0; // Reset error count on successful connection
      });

      this.redis.on('error', (error) => {
        this.isRedisConnected = false;
        errorCount++;
        
        // Only log Redis errors if not suppressed
        if (process.env.SUPPRESS_CACHE_WARNINGS !== 'true' && errorCount <= maxErrorLogs) {
          cleanLogger.cache('memory', 'fallback', 'Redis connection failed', 'redis-error');
          
          if (errorCount === maxErrorLogs) {
            cleanLogger.cache('memory', 'fallback', 'Redis errors suppressed', 'redis-suppressed');
          }
        }
      });

      this.redis.on('close', () => {
        if (this.isRedisConnected) {
          cleanLogger.cache('memory', 'fallback', 'Redis connection closed', 'redis-closed');
        }
        this.isRedisConnected = false;
      });

      // Test connection with timeout
      const connectionTimeout = setTimeout(() => {
        cleanLogger.cache('memory', 'fallback', 'Redis connection timeout', 'redis-timeout');
        this.isRedisConnected = false;
      }, 3000);

      try {
        await this.redis.ping();
        clearTimeout(connectionTimeout);
      } catch (pingError) {
        clearTimeout(connectionTimeout);
        throw pingError;
      }
      
    } catch (error) {
      if (process.env.SUPPRESS_CACHE_WARNINGS !== 'true') {
        cleanLogger.cache('memory', 'fallback', 'Redis initialization failed', 'redis-init-failed');
      }
      this.isRedisConnected = false;
    }
  }

  /**
   * Get value from cache
   * @param {string} key - Cache key
   * @returns {Promise<any>} Cached value or null
   */
  async get(key) {
    try {
      if (this.isRedisConnected && this.redis) {
        const value = await this.redis.get(key);
        if (value) {
          return JSON.parse(value);
        }
      } else {
        // Fallback to memory cache
        const cached = this.memoryCache.get(key);
        if (cached && cached.expiry > Date.now()) {
          return cached.value;
        } else if (cached) {
          this.memoryCache.delete(key);
        }
      }
      return null;
    } catch (error) {
      console.error('Cache get error:', error);
      return null;
    }
  }

  /**
   * Set value in cache
   * @param {string} key - Cache key
   * @param {any} value - Value to cache
   * @param {number} ttl - Time to live in seconds
   * @returns {Promise<boolean>} Success status
   */
  async set(key, value, ttl = this.defaultTTL) {
    try {
      if (this.isRedisConnected && this.redis) {
        await this.redis.setex(key, ttl, JSON.stringify(value));
        return true;
      } else {
        // Fallback to memory cache
        if (this.memoryCache.size >= this.maxMemoryCacheSize) {
          // Remove oldest entries
          const firstKey = this.memoryCache.keys().next().value;
          this.memoryCache.delete(firstKey);
        }
        
        this.memoryCache.set(key, {
          value,
          expiry: Date.now() + (ttl * 1000)
        });
        return true;
      }
    } catch (error) {
      console.error('Cache set error:', error);
      return false;
    }
  }

  /**
   * Delete value from cache
   * @param {string} key - Cache key
   * @returns {Promise<boolean>} Success status
   */
  async del(key) {
    try {
      if (this.isRedisConnected && this.redis) {
        await this.redis.del(key);
      } else {
        this.memoryCache.delete(key);
      }
      return true;
    } catch (error) {
      console.error('Cache delete error:', error);
      return false;
    }
  }

  /**
   * Check if key exists in cache
   * @param {string} key - Cache key
   * @returns {Promise<boolean>} Exists status
   */
  async exists(key) {
    try {
      if (this.isRedisConnected && this.redis) {
        return await this.redis.exists(key) === 1;
      } else {
        const cached = this.memoryCache.get(key);
        return cached && cached.expiry > Date.now();
      }
    } catch (error) {
      console.error('Cache exists error:', error);
      return false;
    }
  }

  /**
   * Increment counter in cache
   * @param {string} key - Cache key
   * @param {number} increment - Increment value
   * @param {number} ttl - Time to live in seconds
   * @returns {Promise<number>} New value
   */
  async incr(key, increment = 1, ttl = this.defaultTTL) {
    try {
      if (this.isRedisConnected && this.redis) {
        const newValue = await this.redis.incrby(key, increment);
        await this.redis.expire(key, ttl);
        return newValue;
      } else {
        const cached = this.memoryCache.get(key);
        const currentValue = (cached && cached.expiry > Date.now()) ? cached.value : 0;
        const newValue = currentValue + increment;
        
        this.memoryCache.set(key, {
          value: newValue,
          expiry: Date.now() + (ttl * 1000)
        });
        return newValue;
      }
    } catch (error) {
      console.error('Cache increment error:', error);
      return 0;
    }
  }

  /**
   * Get multiple values from cache
   * @param {Array<string>} keys - Cache keys
   * @returns {Promise<Object>} Key-value pairs
   */
  async mget(keys) {
    try {
      const result = {};
      
      if (this.isRedisConnected && this.redis) {
        const values = await this.redis.mget(...keys);
        keys.forEach((key, index) => {
          result[key] = values[index] ? JSON.parse(values[index]) : null;
        });
      } else {
        keys.forEach(key => {
          const cached = this.memoryCache.get(key);
          result[key] = (cached && cached.expiry > Date.now()) ? cached.value : null;
        });
      }
      
      return result;
    } catch (error) {
      console.error('Cache mget error:', error);
      return {};
    }
  }

  /**
   * Set multiple values in cache
   * @param {Object} keyValuePairs - Key-value pairs to set
   * @param {number} ttl - Time to live in seconds
   * @returns {Promise<boolean>} Success status
   */
  async mset(keyValuePairs, ttl = this.defaultTTL) {
    try {
      if (this.isRedisConnected && this.redis) {
        const pipeline = this.redis.pipeline();
        
        Object.entries(keyValuePairs).forEach(([key, value]) => {
          pipeline.setex(key, ttl, JSON.stringify(value));
        });
        
        await pipeline.exec();
        return true;
      } else {
        Object.entries(keyValuePairs).forEach(([key, value]) => {
          if (this.memoryCache.size >= this.maxMemoryCacheSize) {
            const firstKey = this.memoryCache.keys().next().value;
            this.memoryCache.delete(firstKey);
          }
          
          this.memoryCache.set(key, {
            value,
            expiry: Date.now() + (ttl * 1000)
          });
        });
        return true;
      }
    } catch (error) {
      console.error('Cache mset error:', error);
      return false;
    }
  }

  /**
   * Clear all cache entries
   * @returns {Promise<boolean>} Success status
   */
  async clear() {
    try {
      if (this.isRedisConnected && this.redis) {
        await this.redis.flushdb();
      } else {
        this.memoryCache.clear();
      }
      return true;
    } catch (error) {
      console.error('Cache clear error:', error);
      return false;
    }
  }

  /**
   * Get cache statistics
   * @returns {Promise<Object>} Cache statistics
   */
  async getStats() {
    try {
      const stats = {
        type: this.isRedisConnected ? 'redis' : 'memory',
        connected: this.isRedisConnected,
        timestamp: new Date().toISOString()
      };

      if (this.isRedisConnected && this.redis) {
        const info = await this.redis.info('memory');
        const keyspace = await this.redis.info('keyspace');
        
        stats.redis = {
          memory: info,
          keyspace: keyspace
        };
      } else {
        stats.memory = {
          size: this.memoryCache.size,
          maxSize: this.maxMemoryCacheSize
        };
      }

      return stats;
    } catch (error) {
      console.error('Cache stats error:', error);
      return {
        type: 'unknown',
        connected: false,
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Create cache key with namespace
   * @param {string} namespace - Cache namespace
   * @param {string} key - Cache key
   * @returns {string} Namespaced cache key
   */
  createKey(namespace, key) {
    return `specweave:${namespace}:${key}`;
  }

  /**
   * Cache wrapper for functions
   * @param {string} key - Cache key
   * @param {Function} fn - Function to cache
   * @param {number} ttl - Time to live in seconds
   * @returns {Promise<any>} Function result
   */
  async wrap(key, fn, ttl = this.defaultTTL) {
    try {
      // Try to get from cache first
      const cached = await this.get(key);
      if (cached !== null) {
        return cached;
      }

      // Execute function and cache result
      const result = await fn();
      await this.set(key, result, ttl);
      return result;
    } catch (error) {
      console.error('Cache wrap error:', error);
      // If caching fails, still return function result
      return await fn();
    }
  }

  /**
   * Cleanup expired entries from memory cache
   */
  cleanupMemoryCache() {
    const now = Date.now();
    for (const [key, cached] of this.memoryCache.entries()) {
      if (cached.expiry <= now) {
        this.memoryCache.delete(key);
      }
    }
  }

  /**
   * Close cache connections
   */
  async close() {
    try {
      if (this.redis) {
        await this.redis.quit();
      }
      this.memoryCache.clear();
    } catch (error) {
      console.error('Cache close error:', error);
    }
  }
}

// Create singleton instance
const cacheService = new CacheService();

// Cleanup memory cache every 2 minutes (more aggressive)
setInterval(() => {
  cacheService.cleanupMemoryCache();
}, 2 * 60 * 1000);

// Force garbage collection hint every 10 minutes if available
if (global.gc) {
  setInterval(() => {
    try {
      global.gc();
    } catch (e) {
      // GC not available
    }
  }, 10 * 60 * 1000);
}

export default cacheService;