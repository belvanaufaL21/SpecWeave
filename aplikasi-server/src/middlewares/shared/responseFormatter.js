/**
 * Response Formatter Middleware
 * Standardizes API response formats across all endpoints
 */

import { v4 as uuidv4 } from 'uuid';

/**
 * Standard response format
 */
const createResponse = (success, data = null, message = null, meta = null, errors = null) => {
  const response = {
    success,
    timestamp: new Date().toISOString(),
    requestId: null // Will be set by middleware
  };

  if (data !== null) response.data = data;
  if (message) response.message = message;
  if (meta) response.meta = meta;
  if (errors) response.errors = errors;

  return response;
};

/**
 * Response formatter middleware
 */
const responseFormatter = (req, res, next) => {
  // Add request ID for tracking
  req.requestId = req.requestId || uuidv4();

  // Success response helper
  res.success = (data = null, message = null, meta = null, statusCode = 200) => {
    const response = createResponse(true, data, message, meta);
    response.requestId = req.requestId;
    
    return res.status(statusCode).json(response);
  };

  // Error response helper
  res.error = (message = 'An error occurred', statusCode = 500, errors = null, data = null) => {
    const response = createResponse(false, data, message, null, errors);
    response.requestId = req.requestId;
    
    return res.status(statusCode).json(response);
  };

  // Paginated response helper
  res.paginated = (data, pagination, message = null, statusCode = 200) => {
    const meta = {
      pagination: {
        page: pagination.page || 1,
        limit: pagination.limit || 20,
        total: pagination.total || 0,
        totalPages: Math.ceil((pagination.total || 0) / (pagination.limit || 20)),
        hasNext: pagination.hasNext || false,
        hasPrev: pagination.hasPrev || false
      }
    };

    const response = createResponse(true, data, message, meta);
    response.requestId = req.requestId;
    
    return res.status(statusCode).json(response);
  };

  // Created response helper
  res.created = (data = null, message = 'Resource created successfully') => {
    return res.success(data, message, null, 201);
  };

  // Updated response helper
  res.updated = (data = null, message = 'Resource updated successfully') => {
    return res.success(data, message, null, 200);
  };

  // Deleted response helper
  res.deleted = (message = 'Resource deleted successfully') => {
    return res.success(null, message, null, 200);
  };

  // Not found response helper
  res.notFound = (message = 'Resource not found') => {
    return res.error(message, 404);
  };

  // Validation error response helper
  res.validationError = (errors, message = 'Validation failed') => {
    return res.error(message, 400, errors);
  };

  // Unauthorized response helper
  res.unauthorized = (message = 'Unauthorized access') => {
    return res.error(message, 401);
  };

  // Forbidden response helper
  res.forbidden = (message = 'Forbidden access') => {
    return res.error(message, 403);
  };

  // Conflict response helper
  res.conflict = (message = 'Resource conflict', data = null) => {
    return res.error(message, 409, null, data);
  };

  // Rate limited response helper
  res.rateLimited = (message = 'Rate limit exceeded') => {
    return res.error(message, 429);
  };

  // Server error response helper
  res.serverError = (message = 'Internal server error') => {
    return res.error(message, 500);
  };

  // Service unavailable response helper
  res.serviceUnavailable = (message = 'Service temporarily unavailable') => {
    return res.error(message, 503);
  };

  next();
};

/**
 * Error response formatter for error handling middleware
 */
export const formatErrorResponse = (error, req) => {
  const response = createResponse(
    false,
    null,
    error.message || 'An error occurred',
    null,
    error.details || null
  );
  
  response.requestId = req.requestId;
  
  // Add error details in development
  if (process.env.NODE_ENV === 'development') {
    response.debug = {
      stack: error.stack,
      code: error.code,
      name: error.name
    };
  }
  
  return response;
};

/**
 * Success response formatter for consistent success responses
 */
export const formatSuccessResponse = (data, message, meta, req) => {
  const response = createResponse(true, data, message, meta);
  response.requestId = req.requestId;
  return response;
};

/**
 * Validation error formatter
 */
export const formatValidationErrors = (validationResult) => {
  if (!validationResult || !validationResult.errors) return null;
  
  return validationResult.errors.map(error => ({
    field: error.path || error.param,
    message: error.msg,
    value: error.value,
    location: error.location
  }));
};

/**
 * Pagination meta formatter
 */
export const formatPaginationMeta = (page, limit, total) => {
  const totalPages = Math.ceil(total / limit);
  
  return {
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total: parseInt(total),
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1,
      nextPage: page < totalPages ? page + 1 : null,
      prevPage: page > 1 ? page - 1 : null
    }
  };
};

/**
 * Response time formatter
 */
export const formatResponseTime = (startTime) => {
  const endTime = process.hrtime(startTime);
  return Math.round((endTime[0] * 1000) + (endTime[1] / 1000000));
};

/**
 * Health check response formatter
 */
export const formatHealthResponse = (checks) => {
  const allHealthy = Object.values(checks).every(check => check.status === 'healthy');
  
  return {
    status: allHealthy ? 'healthy' : 'unhealthy',
    timestamp: new Date().toISOString(),
    checks,
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    version: process.env.npm_package_version || '1.0.0'
  };
};

/**
 * API documentation response formatter
 */
export const formatApiDocResponse = (endpoints) => {
  return {
    api: {
      version: '1.0.0',
      title: 'SpecWeave API',
      description: 'API for SpecWeave testing and evaluation system',
      baseUrl: process.env.API_BASE_URL || 'http://localhost:3001',
      endpoints
    },
    timestamp: new Date().toISOString()
  };
};

export default responseFormatter;