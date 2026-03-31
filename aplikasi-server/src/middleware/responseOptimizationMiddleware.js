import compression from 'compression';
import rateLimit from 'express-rate-limit';

/**
 * Response Optimization Middleware
 * Provides compression, rate limiting, and response optimization
 */

/**
 * Compression middleware with intelligent filtering
 */
export const compressionMiddleware = compression({
  // Only compress responses larger than 1KB
  threshold: 1024,
  
  // Compression level (1-9, 6 is default balance of speed/compression)
  level: 6,
  
  // Filter function to determine what to compress
  filter: (req, res) => {
    // Don't compress if client doesn't support it
    if (req.headers['x-no-compression']) {
      return false;
    }
    
    // Don't compress images, videos, or already compressed files
    const contentType = res.getHeader('content-type');
    if (contentType) {
      const type = contentType.toLowerCase();
      if (type.includes('image/') || 
          type.includes('video/') || 
          type.includes('audio/') ||
          type.includes('application/zip') ||
          type.includes('application/gzip')) {
        return false;
      }
    }
    
    // Use default compression filter for everything else
    return compression.filter(req, res);
  },
  
  // Memory level (1-9, higher = more memory but better compression)
  memLevel: 8
});

/**
 * Rate limiting middleware with different limits for different endpoints
 */
export const createRateLimit = (options = {}) => {
  const defaultOptions = {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
    message: {
      error: 'Too many requests from this IP, please try again later.',
      retryAfter: '15 minutes'
    },
    standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
    legacyHeaders: false, // Disable the `X-RateLimit-*` headers
    
    // Custom key generator (can be overridden)
    keyGenerator: (req) => {
      // Use user ID if authenticated, otherwise IP
      return req.user?.id || req.ip;
    },
    
    // Skip successful requests for certain endpoints
    skipSuccessfulRequests: false,
    
    // Skip failed requests
    skipFailedRequests: false,
    
    // Custom handler for when limit is exceeded
    handler: (req, res) => {
      res.status(429).json({
        success: false,
        error: 'Rate limit exceeded',
        message: options.message?.error || 'Too many requests from this IP, please try again later.',
        retryAfter: Math.ceil(options.windowMs / 1000 / 60) + ' minutes',
        timestamp: new Date().toISOString()
      });
    }
  };
  
  return rateLimit({ ...defaultOptions, ...options });
};

/**
 * Specific rate limits for different endpoint types
 */
export const rateLimits = {
  // General API rate limit
  general: createRateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100 // 100 requests per 15 minutes
  }),
  
  // Strict rate limit for AI/ML operations
  aiOperations: createRateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 10, // 10 requests per minute
    message: {
      error: 'AI operation rate limit exceeded. Please wait before making more requests.',
      retryAfter: '1 minute'
    }
  }),
  
  // Authentication endpoints
  auth: createRateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // 5 login attempts per 15 minutes
    skipSuccessfulRequests: true,
    message: {
      error: 'Too many authentication attempts. Please try again later.',
      retryAfter: '15 minutes'
    }
  }),
  
  // Database operations
  database: createRateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 50, // 50 database operations per minute
    message: {
      error: 'Database operation rate limit exceeded.',
      retryAfter: '1 minute'
    }
  }),
  
  // File uploads
  upload: createRateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 5, // 5 uploads per minute
    message: {
      error: 'Upload rate limit exceeded.',
      retryAfter: '1 minute'
    }
  })
};

/**
 * Response caching headers middleware
 */
export const cacheHeadersMiddleware = (maxAge = 300) => {
  return (req, res, next) => {
    // Only cache GET requests
    if (req.method === 'GET') {
      // Set cache headers
      res.setHeader('Cache-Control', `public, max-age=${maxAge}`);
      res.setHeader('ETag', `"${Date.now()}"`);
      
      // Check if client has cached version
      const clientETag = req.headers['if-none-match'];
      if (clientETag && clientETag === res.getHeader('ETag')) {
        return res.status(304).end();
      }
    } else {
      // Don't cache non-GET requests
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
    }
    
    next();
  };
};

/**
 * Response time header middleware
 */
export const responseTimeMiddleware = (req, res, next) => {
  const startTime = Date.now();
  
  // Override res.end to capture response time
  const originalEnd = res.end;
  res.end = function(...args) {
    const responseTime = Date.now() - startTime;
    
    // Add response time header
    res.setHeader('X-Response-Time', `${responseTime}ms`);
    
    // Log slow responses
    if (responseTime > 2000) {
      console.warn(`🐌 Slow response: ${req.method} ${req.path} - ${responseTime}ms`);
    }
    
    // Call original end method
    originalEnd.apply(this, args);
  };
  
  next();
};

/**
 * JSON response optimization middleware
 */
export const jsonOptimizationMiddleware = (req, res, next) => {
  // Override res.json to add optimization
  const originalJson = res.json;
  
  res.json = function(data) {
    // Add response metadata
    if (data && typeof data === 'object' && !data.meta) {
      data.meta = {
        timestamp: new Date().toISOString(),
        version: '1.0',
        requestId: req.headers['x-request-id'] || 'unknown'
      };
    }
    
    // Set appropriate content type
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    
    // Call original json method
    originalJson.call(this, data);
  };
  
  next();
};

/**
 * Security headers middleware
 */
export const securityHeadersMiddleware = (req, res, next) => {
  // Security headers
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  
  // Remove server header
  res.removeHeader('X-Powered-By');
  
  next();
};

/**
 * Request size limiting middleware
 */
export const requestSizeLimitMiddleware = (limit = '10mb') => {
  return (req, res, next) => {
    const contentLength = parseInt(req.headers['content-length'] || '0');
    const maxSize = parseSize(limit);
    
    if (contentLength > maxSize) {
      return res.status(413).json({
        success: false,
        error: 'Request entity too large',
        message: `Request size ${formatSize(contentLength)} exceeds limit of ${limit}`,
        timestamp: new Date().toISOString()
      });
    }
    
    next();
  };
};

/**
 * Helper function to parse size strings (e.g., '10mb', '1gb')
 */
function parseSize(size) {
  const units = {
    b: 1,
    kb: 1024,
    mb: 1024 * 1024,
    gb: 1024 * 1024 * 1024
  };
  
  const match = size.toLowerCase().match(/^(\d+(?:\.\d+)?)(b|kb|mb|gb)$/);
  if (!match) return 0;
  
  return parseFloat(match[1]) * units[match[2]];
}

/**
 * Helper function to format size in bytes to human readable
 */
function formatSize(bytes) {
  const units = ['B', 'KB', 'MB', 'GB'];
  let size = bytes;
  let unitIndex = 0;
  
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }
  
  return `${size.toFixed(1)}${units[unitIndex]}`;
}

export default {
  compressionMiddleware,
  createRateLimit,
  rateLimits,
  cacheHeadersMiddleware,
  responseTimeMiddleware,
  jsonOptimizationMiddleware,
  securityHeadersMiddleware,
  requestSizeLimitMiddleware
};