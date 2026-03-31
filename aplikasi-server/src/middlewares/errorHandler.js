/**
 * Enhanced Error Handler Middleware
 * Comprehensive error handling system for Express.js
 */

import errorHandler from '../utils/errorHandler.js';
import { v4 as uuidv4 } from 'uuid';

// Custom Error Classes
export class AppError extends Error {
  constructor(message, statusCode = 500, code = null, details = null) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
    this.code = code;
    this.details = details;
    this.isOperational = true;
    this.timestamp = new Date().toISOString();
    this.id = uuidv4();

    Error.captureStackTrace(this, this.constructor);
  }
}

export class ValidationError extends AppError {
  constructor(message, field = null, value = null) {
    super(message, 400, 'VALIDATION_ERROR', { field, value });
    this.name = 'ValidationError';
  }
}

export class DatabaseError extends AppError {
  constructor(message, operation = null, table = null) {
    super(message, 500, 'DATABASE_ERROR', { operation, table });
    this.name = 'DatabaseError';
  }
}

export class AuthenticationError extends AppError {
  constructor(message = 'Authentication failed') {
    super(message, 401, 'AUTHENTICATION_ERROR');
    this.name = 'AuthenticationError';
  }
}

export class AuthorizationError extends AppError {
  constructor(message = 'Insufficient permissions') {
    super(message, 403, 'AUTHORIZATION_ERROR');
    this.name = 'AuthorizationError';
  }
}

export class NotFoundError extends AppError {
  constructor(resource = 'Resource') {
    super(`${resource} not found`, 404, 'NOT_FOUND', { resource });
    this.name = 'NotFoundError';
  }
}

export class ConflictError extends AppError {
  constructor(message = 'Resource conflict', resource = null) {
    super(message, 409, 'CONFLICT', { resource });
    this.name = 'ConflictError';
  }
}

export class RateLimitError extends AppError {
  constructor(message = 'Rate limit exceeded', limit = null, window = null) {
    super(message, 429, 'RATE_LIMIT_EXCEEDED', { limit, window });
    this.name = 'RateLimitError';
  }
}

export class ExternalServiceError extends AppError {
  constructor(message, service = null, statusCode = 502) {
    super(message, statusCode, 'EXTERNAL_SERVICE_ERROR', { service });
    this.name = 'ExternalServiceError';
  }
}

/**
 * Request ID middleware - adds unique ID to each request
 */
export const requestIdMiddleware = (req, res, next) => {
  req.requestId = uuidv4();
  res.setHeader('X-Request-ID', req.requestId);
  next();
};

/**
 * Error logging middleware - logs all errors before handling
 */
export const errorLoggingMiddleware = (err, req, res, next) => {
  // Add request context to error
  err.requestId = req.requestId;
  err.requestUrl = req.url;
  err.requestMethod = req.method;
  err.userAgent = req.get('User-Agent');
  err.ip = req.ip;
  err.userId = req.user?.id;

  // Import logger dynamically to avoid circular dependencies
  import('../config/cleanLogging.js').then(({ default: cleanLogger }) => {
    cleanLogger.error(
      'ErrorHandler',
      `${err.name || 'Error'}: ${err.message}`,
      {
        statusCode: err.statusCode,
        code: err.code,
        url: err.requestUrl,
        method: err.requestMethod,
        stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
      },
      err.requestId
    );
  });

  next(err);
};

/**
 * Main error handler middleware
 */
export const errorHandlerMiddleware = (err, req, res, next) => {
  // Handle the error using our centralized error handler
  errorHandler.handleError(err, req, res);
};

/**
 * 404 handler for unmatched routes
 */
export const notFoundHandler = (req, res, next) => {
  const error = new NotFoundError(`Route ${req.method} ${req.path} not found`);
  next(error);
};

/**
 * Async error wrapper for route handlers
 */
export const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

/**
 * Validation error handler for express-validator
 */
export const handleValidationErrors = (req, res, next) => {
  const { validationResult } = require('express-validator');
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    const firstError = errors.array()[0];
    const error = new ValidationError(
      firstError.msg,
      firstError.param,
      firstError.value
    );
    return next(error);
  }
  
  next();
};

/**
 * Database error handler - converts database errors to AppErrors
 */
export const handleDatabaseError = (err, operation = null, table = null) => {
  if (err.code === '23505') { // PostgreSQL unique violation
    return new ConflictError('Resource already exists', table);
  }
  
  if (err.code === '23503') { // PostgreSQL foreign key violation
    return new ValidationError('Referenced resource does not exist');
  }
  
  if (err.code === '23502') { // PostgreSQL not null violation
    return new ValidationError('Required field is missing');
  }
  
  if (err.code === 'PGRST116') { // PostgREST no rows returned
    return new NotFoundError(table || 'Resource');
  }
  
  // Generic database error
  return new DatabaseError(err.message, operation, table);
};

/**
 * External service error handler
 */
export const handleExternalServiceError = (err, serviceName) => {
  if (err.response) {
    // HTTP error response
    return new ExternalServiceError(
      `${serviceName} service error: ${err.response.data?.message || err.message}`,
      serviceName,
      err.response.status >= 500 ? 502 : err.response.status
    );
  }
  
  if (err.request) {
    // Network error
    return new ExternalServiceError(
      `${serviceName} service unavailable`,
      serviceName,
      503
    );
  }
  
  // Other error
  return new ExternalServiceError(
    `${serviceName} service error: ${err.message}`,
    serviceName
  );
};

/**
 * Error recovery middleware - attempts to recover from certain errors
 */
export const errorRecoveryMiddleware = (err, req, res, next) => {
  // Attempt recovery for specific error types
  if (err.name === 'DatabaseError' && err.details?.operation === 'connection') {
    // Database connection error - could trigger reconnection
    console.log('Attempting database reconnection...');
    // This would be handled by the database reconnection logic
  }
  
  if (err.name === 'ExternalServiceError' && err.statusCode >= 500) {
    // External service error - could trigger retry logic
    console.log(`External service ${err.details?.service} error - considering retry`);
  }
  
  next(err);
};

// Legacy export for backward compatibility
export { errorHandlerMiddleware as errorHandler };