/**
 * SSE Error Handler Middleware
 * Wraps middleware to send errors via SSE stream instead of HTTP error response
 */

/**
 * Wrap authentication middleware for SSE endpoints
 * Sends auth errors via SSE stream instead of HTTP 401
 */
export const sseAuthWrapper = (authMiddleware) => {
  return async (req, res, next) => {
    // Set SSE headers FIRST
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    
    // Create custom next that catches errors and sends via SSE
    const sseNext = (error) => {
      if (error) {
        const errorMessage = {
          stage: 'error',
          progress: 0,
          error: error.message || 'Authentication failed',
          code: error.statusCode || 401
        };
        res.write(`data: ${JSON.stringify(errorMessage)}\n\n`);
        res.end();
      } else {
        next();
      }
    };
    
    // Call original middleware with SSE error handler
    try {
      await authMiddleware(req, res, sseNext);
    } catch (error) {
      const errorMessage = {
        stage: 'error',
        progress: 0,
        error: error.message || 'Authentication failed',
        code: error.statusCode || 401
      };
      res.write(`data: ${JSON.stringify(errorMessage)}\n\n`);
      res.end();
    }
  };
};

/**
 * Wrap usage limit middleware for SSE endpoints
 * Sends limit errors via SSE stream instead of HTTP 429
 */
export const sseUsageLimitWrapper = (limitMiddleware) => {
  return async (req, res, next) => {
    // Create custom response object that intercepts status/json
    const originalStatus = res.status;
    const originalJson = res.json;
    
    let statusCode = 200;
    let jsonData = null;
    
    // Intercept status()
    res.status = function(code) {
      statusCode = code;
      return this;
    };
    
    // Intercept json()
    res.json = function(data) {
      jsonData = data;
      
      // If it's an error response, send via SSE
      if (statusCode >= 400) {
        const errorMessage = {
          stage: 'error',
          progress: 0,
          error: data.error?.message || data.message || 'Request failed',
          code: statusCode,
          details: data.error
        };
        res.write(`data: ${JSON.stringify(errorMessage)}\n\n`);
        res.end();
      } else {
        // Restore original methods and continue
        res.status = originalStatus;
        res.json = originalJson;
        next();
      }
      
      return this;
    };
    
    // Create custom next that catches errors
    const sseNext = (error) => {
      if (error) {
        // Restore original methods
        res.status = originalStatus;
        res.json = originalJson;
        
        const errorMessage = {
          stage: 'error',
          progress: 0,
          error: error.message || 'Request failed',
          code: error.statusCode || 500
        };
        res.write(`data: ${JSON.stringify(errorMessage)}\n\n`);
        res.end();
      } else {
        // Restore original methods
        res.status = originalStatus;
        res.json = originalJson;
        next();
      }
    };
    
    // Call original middleware
    try {
      await limitMiddleware(req, res, sseNext);
    } catch (error) {
      // Restore original methods
      res.status = originalStatus;
      res.json = originalJson;
      
      const errorMessage = {
        stage: 'error',
        progress: 0,
        error: error.message || 'Request failed',
        code: error.statusCode || 500
      };
      res.write(`data: ${JSON.stringify(errorMessage)}\n\n`);
      res.end();
    }
  };
};

/**
 * Generic SSE error wrapper for any middleware
 */
export const sseMiddlewareWrapper = (...middlewares) => {
  return async (req, res, next) => {
    // Set SSE headers FIRST
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    
    // Intercept res.status() and res.json()
    const originalStatus = res.status;
    const originalJson = res.json;
    
    let statusCode = 200;
    
    res.status = function(code) {
      statusCode = code;
      return this;
    };
    
    res.json = function(data) {
      if (statusCode >= 400) {
        const errorMessage = {
          stage: 'error',
          progress: 0,
          error: data.error?.message || data.message || 'Request failed',
          code: statusCode,
          details: data.error
        };
        res.write(`data: ${JSON.stringify(errorMessage)}\n\n`);
        res.end();
      } else {
        res.status = originalStatus;
        res.json = originalJson;
        next();
      }
      return this;
    };
    
    // Execute middlewares sequentially
    let currentIndex = 0;
    
    const executeNext = async (error) => {
      if (error) {
        res.status = originalStatus;
        res.json = originalJson;
        
        const errorMessage = {
          stage: 'error',
          progress: 0,
          error: error.message || 'Request failed',
          code: error.statusCode || 500
        };
        res.write(`data: ${JSON.stringify(errorMessage)}\n\n`);
        res.end();
        return;
      }
      
      if (currentIndex >= middlewares.length) {
        res.status = originalStatus;
        res.json = originalJson;
        next();
        return;
      }
      
      const middleware = middlewares[currentIndex++];
      
      try {
        await middleware(req, res, executeNext);
      } catch (err) {
        executeNext(err);
      }
    };
    
    executeNext();
  };
};

export default {
  sseAuthWrapper,
  sseUsageLimitWrapper,
  sseMiddlewareWrapper
};
