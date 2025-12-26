import authService from '../services/authService.js';
import { AppError } from './errorHandler.js';

/**
 * Authentication middleware for protecting routes
 */
export const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authService.extractToken(authHeader);

    if (!token) {
      throw new AppError('Access token is required', 401);
    }

    const user = await authService.verifyToken(token);
    
    if (!user) {
      throw new AppError('Invalid or expired token', 401);
    }

    // Get full user profile
    const userProfile = await authService.getUserProfile(user.id);
    req.user = userProfile;
    
    next();
  } catch (error) {
    if (error instanceof AppError) {
      next(error);
    } else {
      next(new AppError('Authentication failed', 401));
    }
  }
};

/**
 * Optional authentication middleware
 * Sets user if token is valid, but doesn't require authentication
 */
export const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authService.extractToken(authHeader);

    if (token) {
      const user = await authService.verifyToken(token);
      if (user) {
        const userProfile = await authService.getUserProfile(user.id);
        req.user = userProfile;
      }
    }
    
    next();
  } catch (error) {
    // Don't fail on optional auth errors, just continue without user
    next();
  }
};

/**
 * Role-based authorization middleware
 * @param {string} requiredRole - Required role to access the route
 */
export const requireRole = (requiredRole) => {
  return (req, res, next) => {
    if (!req.user) {
      return next(new AppError('Authentication required', 401));
    }

    if (!authService.hasRole(req.user, requiredRole)) {
      return next(new AppError('Insufficient permissions', 403));
    }

    next();
  };
};

/**
 * Resource ownership middleware
 * Checks if user owns the resource or is admin
 * @param {string} paramName - Parameter name containing resource user ID
 */
export const requireOwnership = (paramName = 'userId') => {
  return (req, res, next) => {
    if (!req.user) {
      return next(new AppError('Authentication required', 401));
    }

    const resourceUserId = req.params[paramName] || req.body[paramName];
    
    if (!resourceUserId) {
      return next(new AppError('Resource user ID not found', 400));
    }

    if (!authService.canAccessResource(req.user, resourceUserId)) {
      return next(new AppError('Access denied to this resource', 403));
    }

    next();
  };
};

/**
 * API Key authentication middleware
 * Alternative authentication method for API access
 */
export const authenticateApiKey = async (req, res, next) => {
  try {
    const apiKey = req.headers['x-api-key'];

    if (!apiKey) {
      throw new AppError('API key is required', 401);
    }

    const user = await authService.validateApiKey(apiKey);
    
    if (!user) {
      throw new AppError('Invalid API key', 401);
    }

    req.user = user;
    req.authMethod = 'api_key';
    
    next();
  } catch (error) {
    if (error instanceof AppError) {
      next(error);
    } else {
      next(new AppError('API key authentication failed', 401));
    }
  }
};

/**
 * Flexible authentication middleware
 * Accepts both JWT tokens and API keys
 */
export const flexibleAuth = async (req, res, next) => {
  try {
    // Try JWT token first
    const authHeader = req.headers.authorization;
    const token = authService.extractToken(authHeader);

    if (token) {
      const user = await authService.verifyToken(token);
      if (user) {
        const userProfile = await authService.getUserProfile(user.id);
        req.user = userProfile;
        req.authMethod = 'jwt';
        return next();
      }
    }

    // Try API key if JWT failed
    const apiKey = req.headers['x-api-key'];
    if (apiKey) {
      const user = await authService.validateApiKey(apiKey);
      if (user) {
        req.user = user;
        req.authMethod = 'api_key';
        return next();
      }
    }

    throw new AppError('Valid authentication required', 401);
  } catch (error) {
    if (error instanceof AppError) {
      next(error);
    } else {
      next(new AppError('Authentication failed', 401));
    }
  }
};

/**
 * Rate limiting by user
 * @param {Object} options - Rate limiting options
 */
export const rateLimitByUser = (options = {}) => {
  const { 
    windowMs = 15 * 60 * 1000, // 15 minutes
    maxRequests = 100,
    message = 'Too many requests from this user'
  } = options;

  const userRequests = new Map();

  return (req, res, next) => {
    if (!req.user) {
      return next();
    }

    const userId = req.user.id;
    const now = Date.now();
    const windowStart = now - windowMs;

    // Clean old entries
    if (userRequests.has(userId)) {
      const requests = userRequests.get(userId);
      userRequests.set(userId, requests.filter(time => time > windowStart));
    }

    // Check current requests
    const currentRequests = userRequests.get(userId) || [];
    
    if (currentRequests.length >= maxRequests) {
      return next(new AppError(message, 429));
    }

    // Add current request
    currentRequests.push(now);
    userRequests.set(userId, currentRequests);

    // Set rate limit headers
    res.set({
      'X-RateLimit-Limit': maxRequests,
      'X-RateLimit-Remaining': Math.max(0, maxRequests - currentRequests.length),
      'X-RateLimit-Reset': new Date(now + windowMs).toISOString()
    });

    next();
  };
};

/**
 * Session validation middleware
 * Ensures user session is still valid
 */
export const validateSession = async (req, res, next) => {
  try {
    if (!req.user) {
      return next();
    }

    // Check if user still exists and is active
    const currentUser = await authService.getUserById(req.user.id);
    
    if (!currentUser) {
      throw new AppError('User session is no longer valid', 401);
    }

    // Update user data if needed
    if (currentUser.updated_at !== req.user.updated_at) {
      const userProfile = await authService.getUserProfile(currentUser.id);
      req.user = userProfile;
    }

    next();
  } catch (error) {
    if (error instanceof AppError) {
      next(error);
    } else {
      next(new AppError('Session validation failed', 401));
    }
  }
};