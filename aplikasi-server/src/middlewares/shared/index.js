/**
 * Shared Middleware Index
 * Centralized exports for all shared middleware functions
 */

// Core middleware
export { default as requestLogger } from './requestLogger.js';
export { default as responseFormatter } from './responseFormatter.js';
export { default as performanceMonitor } from './performanceMonitor.js';
export { default as securityHeaders } from './securityHeaders.js';

// Validation middleware
export { default as requestValidator } from './requestValidator.js';
export { default as sanitizer } from './sanitizer.js';

// Rate limiting and throttling
export { default as rateLimiter } from './rateLimiter.js';
export { default as throttler } from './throttler.js';

// Caching middleware
export { default as cacheMiddleware } from './cacheMiddleware.js';

// Error handling
export { default as asyncHandler } from './asyncHandler.js';
export { default as notFoundHandler } from './notFoundHandler.js';