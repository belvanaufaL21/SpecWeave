/**
 * Unit Tests for Authentication and Authorization Error Handling
 * Tests error handling for auth middleware and authorization scenarios
 * 
 * Requirements: 8.3 - Error handling consistency
 */

// Mock authService first before importing
const mockAuthService = {
  extractToken: jest.fn(),
  verifyToken: jest.fn(),
  getUserProfile: jest.fn(),
  hasRole: jest.fn(),
  canAccessResource: jest.fn(),
  validateApiKey: jest.fn(),
  getUserById: jest.fn()
};

jest.mock('../../services/authService.js', () => ({
  default: mockAuthService
}));

// Mock AppError
class AppError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
    this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
    this.isOperational = true;
  }
}

jest.mock('../../middlewares/errorHandler.js', () => ({
  AppError: class MockAppError extends Error {
    constructor(message, statusCode) {
      super(message);
      this.statusCode = statusCode;
      this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
      this.isOperational = true;
    }
  }
}));

const { authenticate, optionalAuth, requireRole, requireOwnership, authenticateApiKey, flexibleAuth } = require('../auth.js');

// Mock request, response, and next function
const createMockReq = (overrides = {}) => ({
  headers: {},
  user: null,
  params: {},
  body: {},
  ...overrides
});

const createMockRes = () => ({
  status: jest.fn().mockReturnThis(),
  json: jest.fn().mockReturnThis(),
  set: jest.fn().mockReturnThis()
});

const createMockNext = () => jest.fn();

describe('Authentication Middleware Error Handling Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('authenticate middleware', () => {
    test('should call next with AppError when no authorization header is provided', async () => {
      const req = createMockReq();
      const res = createMockRes();
      const next = createMockNext();

      mockAuthService.extractToken.mockReturnValue(null);

      await authenticate(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.any(AppError));
      expect(next.mock.calls[0][0].message).toBe('Access token is required');
      expect(next.mock.calls[0][0].statusCode).toBe(401);
    });

    test('should call next with AppError when token extraction fails', async () => {
      const req = createMockReq({
        headers: { authorization: 'InvalidFormat' }
      });
      const res = createMockRes();
      const next = createMockNext();

      mockAuthService.extractToken.mockReturnValue(null);

      await authenticate(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.any(AppError));
      expect(next.mock.calls[0][0].message).toBe('Access token is required');
      expect(next.mock.calls[0][0].statusCode).toBe(401);
    });

    test('should call next with AppError when token verification fails', async () => {
      const req = createMockReq({
        headers: { authorization: 'Bearer invalid-token' }
      });
      const res = createMockRes();
      const next = createMockNext();

      mockAuthService.extractToken.mockReturnValue('invalid-token');
      mockAuthService.verifyToken.mockResolvedValue(null);

      await authenticate(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.any(AppError));
      expect(next.mock.calls[0][0].message).toBe('Invalid or expired token');
      expect(next.mock.calls[0][0].statusCode).toBe(401);
    });

    test('should call next with AppError when token verification throws error', async () => {
      const req = createMockReq({
        headers: { authorization: 'Bearer valid-token' }
      });
      const res = createMockRes();
      const next = createMockNext();

      mockAuthService.extractToken.mockReturnValue('valid-token');
      mockAuthService.verifyToken.mockRejectedValue(new Error('Token verification service unavailable'));

      await authenticate(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.any(AppError));
      expect(next.mock.calls[0][0].message).toBe('Authentication failed');
      expect(next.mock.calls[0][0].statusCode).toBe(401);
    });

    test('should handle successful authentication with fallback user data', async () => {
      const req = createMockReq({
        headers: { authorization: 'Bearer valid-token' }
      });
      const res = createMockRes();
      const next = createMockNext();

      mockAuthService.extractToken.mockReturnValue('valid-token');
      mockAuthService.verifyToken.mockResolvedValue({
        id: 'user-123',
        email: 'test@example.com'
      });

      await authenticate(req, res, next);

      expect(req.user).toBeDefined();
      expect(req.user.id).toBe('user-123');
      expect(req.user.email).toBe('test@example.com');
      expect(req.user.profile.name).toBe('test');
      expect(next).toHaveBeenCalledWith();
    });

    test('should handle network timeout during token verification', async () => {
      const req = createMockReq({
        headers: { authorization: 'Bearer valid-token' }
      });
      const res = createMockRes();
      const next = createMockNext();

      mockAuthService.extractToken.mockReturnValue('valid-token');
      mockAuthService.verifyToken.mockRejectedValue(new Error('Network timeout'));

      await authenticate(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.any(AppError));
      expect(next.mock.calls[0][0].message).toBe('Authentication failed');
      expect(next.mock.calls[0][0].statusCode).toBe(401);
    });

    test('should handle malformed JWT token', async () => {
      const req = createMockReq({
        headers: { authorization: 'Bearer malformed.jwt.token' }
      });
      const res = createMockRes();
      const next = createMockNext();

      mockAuthService.extractToken.mockReturnValue('malformed.jwt.token');
      mockAuthService.verifyToken.mockRejectedValue(new Error('JsonWebTokenError: invalid token'));

      await authenticate(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.any(AppError));
      expect(next.mock.calls[0][0].message).toBe('Authentication failed');
      expect(next.mock.calls[0][0].statusCode).toBe(401);
    });

    test('should handle expired JWT token', async () => {
      const req = createMockReq({
        headers: { authorization: 'Bearer expired-token' }
      });
      const res = createMockRes();
      const next = createMockNext();

      mockAuthService.extractToken.mockReturnValue('expired-token');
      mockAuthService.verifyToken.mockRejectedValue(new Error('TokenExpiredError: jwt expired'));

      await authenticate(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.any(AppError));
      expect(next.mock.calls[0][0].message).toBe('Authentication failed');
      expect(next.mock.calls[0][0].statusCode).toBe(401);
    });
  });

  describe('optionalAuth middleware', () => {
    test('should continue without error when no authorization header is provided', async () => {
      const req = createMockReq();
      const res = createMockRes();
      const next = createMockNext();

      mockAuthService.extractToken.mockReturnValue(null);

      await optionalAuth(req, res, next);

      expect(req.user).toBeNull();
      expect(next).toHaveBeenCalledWith();
    });

    test('should continue without error when token verification fails', async () => {
      const req = createMockReq({
        headers: { authorization: 'Bearer invalid-token' }
      });
      const res = createMockRes();
      const next = createMockNext();

      mockAuthService.extractToken.mockReturnValue('invalid-token');
      mockAuthService.verifyToken.mockResolvedValue(null);

      await optionalAuth(req, res, next);

      expect(req.user).toBeUndefined();
      expect(next).toHaveBeenCalledWith();
    });

    test('should continue without error when auth service throws exception', async () => {
      const req = createMockReq({
        headers: { authorization: 'Bearer valid-token' }
      });
      const res = createMockRes();
      const next = createMockNext();

      mockAuthService.extractToken.mockReturnValue('valid-token');
      mockAuthService.verifyToken.mockRejectedValue(new Error('Service unavailable'));

      await optionalAuth(req, res, next);

      expect(req.user).toBeUndefined();
      expect(next).toHaveBeenCalledWith();
    });

    test('should set user when token is valid but profile loading fails', async () => {
      const req = createMockReq({
        headers: { authorization: 'Bearer valid-token' }
      });
      const res = createMockRes();
      const next = createMockNext();

      mockAuthService.extractToken.mockReturnValue('valid-token');
      mockAuthService.verifyToken.mockResolvedValue({
        id: 'user-123',
        email: 'test@example.com'
      });
      mockAuthService.getUserProfile.mockRejectedValue(new Error('Profile service unavailable'));

      await optionalAuth(req, res, next);

      expect(req.user).toBeDefined();
      expect(req.user.id).toBe('user-123');
      expect(req.user.email).toBe('test@example.com');
      expect(next).toHaveBeenCalledWith();
    });
  });

  describe('requireRole middleware', () => {
    test('should call next with AppError when user is not authenticated', () => {
      const middleware = requireRole('admin');
      const req = createMockReq(); // No user
      const res = createMockRes();
      const next = createMockNext();

      middleware(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.any(AppError));
      expect(next.mock.calls[0][0].message).toBe('Authentication required');
      expect(next.mock.calls[0][0].statusCode).toBe(401);
    });

    test('should call next with AppError when user lacks required role', () => {
      const middleware = requireRole('admin');
      const req = createMockReq({
        user: { id: 'user-123', role: 'user' }
      });
      const res = createMockRes();
      const next = createMockNext();

      mockAuthService.hasRole.mockReturnValue(false);

      middleware(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.any(AppError));
      expect(next.mock.calls[0][0].message).toBe('Insufficient permissions');
      expect(next.mock.calls[0][0].statusCode).toBe(403);
    });

    test('should call next without error when user has required role', () => {
      const middleware = requireRole('admin');
      const req = createMockReq({
        user: { id: 'user-123', role: 'admin' }
      });
      const res = createMockRes();
      const next = createMockNext();

      mockAuthService.hasRole.mockReturnValue(true);

      middleware(req, res, next);

      expect(next).toHaveBeenCalledWith();
    });

    test('should handle authService.hasRole throwing error', () => {
      const middleware = requireRole('admin');
      const req = createMockReq({
        user: { id: 'user-123', role: 'admin' }
      });
      const res = createMockRes();
      const next = createMockNext();

      mockAuthService.hasRole.mockImplementation(() => {
        throw new Error('Role service unavailable');
      });

      expect(() => middleware(req, res, next)).toThrow('Role service unavailable');
    });
  });

  describe('requireOwnership middleware', () => {
    test('should call next with AppError when user is not authenticated', () => {
      const middleware = requireOwnership('userId');
      const req = createMockReq({
        params: { userId: 'other-user-id' }
      });
      const res = createMockRes();
      const next = createMockNext();

      middleware(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.any(AppError));
      expect(next.mock.calls[0][0].message).toBe('Authentication required');
      expect(next.mock.calls[0][0].statusCode).toBe(401);
    });

    test('should call next with AppError when resource user ID is not found', () => {
      const middleware = requireOwnership('userId');
      const req = createMockReq({
        user: { id: 'user-123' },
        params: {} // Missing userId
      });
      const res = createMockRes();
      const next = createMockNext();

      middleware(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.any(AppError));
      expect(next.mock.calls[0][0].message).toBe('Resource user ID not found');
      expect(next.mock.calls[0][0].statusCode).toBe(400);
    });

    test('should call next with AppError when user cannot access resource', () => {
      const middleware = requireOwnership('userId');
      const req = createMockReq({
        user: { id: 'user-123' },
        params: { userId: 'other-user-id' }
      });
      const res = createMockRes();
      const next = createMockNext();

      mockAuthService.canAccessResource.mockReturnValue(false);

      middleware(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.any(AppError));
      expect(next.mock.calls[0][0].message).toBe('Access denied to this resource');
      expect(next.mock.calls[0][0].statusCode).toBe(403);
    });

    test('should call next without error when user can access resource', () => {
      const middleware = requireOwnership('userId');
      const req = createMockReq({
        user: { id: 'user-123' },
        params: { userId: 'user-123' }
      });
      const res = createMockRes();
      const next = createMockNext();

      mockAuthService.canAccessResource.mockReturnValue(true);

      middleware(req, res, next);

      expect(next).toHaveBeenCalledWith();
    });

    test('should check body parameter when not found in params', () => {
      const middleware = requireOwnership('userId');
      const req = createMockReq({
        user: { id: 'user-123' },
        params: {},
        body: { userId: 'user-123' }
      });
      const res = createMockRes();
      const next = createMockNext();

      mockAuthService.canAccessResource.mockReturnValue(true);

      middleware(req, res, next);

      expect(next).toHaveBeenCalledWith();
    });
  });

  describe('authenticateApiKey middleware', () => {
    test('should call next with AppError when API key is not provided', async () => {
      const req = createMockReq();
      const res = createMockRes();
      const next = createMockNext();

      await authenticateApiKey(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.any(AppError));
      expect(next.mock.calls[0][0].message).toBe('API key is required');
      expect(next.mock.calls[0][0].statusCode).toBe(401);
    });

    test('should call next with AppError when API key is invalid', async () => {
      const req = createMockReq({
        headers: { 'x-api-key': 'invalid-api-key' }
      });
      const res = createMockRes();
      const next = createMockNext();

      mockAuthService.validateApiKey.mockResolvedValue(null);

      await authenticateApiKey(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.any(AppError));
      expect(next.mock.calls[0][0].message).toBe('Invalid API key');
      expect(next.mock.calls[0][0].statusCode).toBe(401);
    });

    test('should call next with AppError when API key validation throws error', async () => {
      const req = createMockReq({
        headers: { 'x-api-key': 'valid-api-key' }
      });
      const res = createMockRes();
      const next = createMockNext();

      mockAuthService.validateApiKey.mockRejectedValue(new Error('API key service unavailable'));

      await authenticateApiKey(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.any(AppError));
      expect(next.mock.calls[0][0].message).toBe('API key authentication failed');
      expect(next.mock.calls[0][0].statusCode).toBe(401);
    });

    test('should set user and authMethod when API key is valid', async () => {
      const req = createMockReq({
        headers: { 'x-api-key': 'valid-api-key' }
      });
      const res = createMockRes();
      const next = createMockNext();

      const mockUser = { id: 'api-user-123', email: 'api@example.com' };
      mockAuthService.validateApiKey.mockResolvedValue(mockUser);

      await authenticateApiKey(req, res, next);

      expect(req.user).toBe(mockUser);
      expect(req.authMethod).toBe('api_key');
      expect(next).toHaveBeenCalledWith();
    });
  });

  describe('flexibleAuth middleware', () => {
    test('should call next with AppError when both JWT and API key authentication fail', async () => {
      const req = createMockReq({
        headers: {
          authorization: 'Bearer invalid-token',
          'x-api-key': 'invalid-api-key'
        }
      });
      const res = createMockRes();
      const next = createMockNext();

      mockAuthService.extractToken.mockReturnValue('invalid-token');
      mockAuthService.verifyToken.mockResolvedValue(null);
      mockAuthService.validateApiKey.mockResolvedValue(null);

      await flexibleAuth(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.any(AppError));
      expect(next.mock.calls[0][0].message).toBe('Valid authentication required');
      expect(next.mock.calls[0][0].statusCode).toBe(401);
    });

    test('should authenticate with JWT when both JWT and API key are provided and JWT is valid', async () => {
      const req = createMockReq({
        headers: {
          authorization: 'Bearer valid-token',
          'x-api-key': 'valid-api-key'
        }
      });
      const res = createMockRes();
      const next = createMockNext();

      const mockJwtUser = { id: 'jwt-user-123', email: 'jwt@example.com' };
      const mockApiUser = { id: 'api-user-123', email: 'api@example.com' };

      mockAuthService.extractToken.mockReturnValue('valid-token');
      mockAuthService.verifyToken.mockResolvedValue(mockJwtUser);
      mockAuthService.getUserProfile.mockResolvedValue(mockJwtUser);
      mockAuthService.validateApiKey.mockResolvedValue(mockApiUser);

      await flexibleAuth(req, res, next);

      expect(req.user).toBe(mockJwtUser);
      expect(req.authMethod).toBe('jwt');
      expect(next).toHaveBeenCalledWith();
    });

    test('should authenticate with API key when JWT fails but API key is valid', async () => {
      const req = createMockReq({
        headers: {
          authorization: 'Bearer invalid-token',
          'x-api-key': 'valid-api-key'
        }
      });
      const res = createMockRes();
      const next = createMockNext();

      const mockApiUser = { id: 'api-user-123', email: 'api@example.com' };

      mockAuthService.extractToken.mockReturnValue('invalid-token');
      mockAuthService.verifyToken.mockResolvedValue(null);
      mockAuthService.validateApiKey.mockResolvedValue(mockApiUser);

      await flexibleAuth(req, res, next);

      expect(req.user).toBe(mockApiUser);
      expect(req.authMethod).toBe('api_key');
      expect(next).toHaveBeenCalledWith();
    });

    test('should handle service errors gracefully', async () => {
      const req = createMockReq({
        headers: {
          authorization: 'Bearer valid-token'
        }
      });
      const res = createMockRes();
      const next = createMockNext();

      mockAuthService.extractToken.mockReturnValue('valid-token');
      mockAuthService.verifyToken.mockRejectedValue(new Error('Auth service down'));

      await flexibleAuth(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.any(AppError));
      expect(next.mock.calls[0][0].message).toBe('Authentication failed');
      expect(next.mock.calls[0][0].statusCode).toBe(401);
    });
  });

  describe('Edge Cases and Security Scenarios', () => {
    test('should handle SQL injection attempts in user ID', () => {
      const middleware = requireOwnership('userId');
      const req = createMockReq({
        user: { id: 'user-123' },
        params: { userId: "'; DROP TABLE users; --" }
      });
      const res = createMockRes();
      const next = createMockNext();

      mockAuthService.canAccessResource.mockReturnValue(false);

      middleware(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.any(AppError));
      expect(next.mock.calls[0][0].message).toBe('Access denied to this resource');
      expect(next.mock.calls[0][0].statusCode).toBe(403);
    });

    test('should handle extremely long API keys', async () => {
      const longApiKey = 'a'.repeat(10000);
      const req = createMockReq({
        headers: { 'x-api-key': longApiKey }
      });
      const res = createMockRes();
      const next = createMockNext();

      mockAuthService.validateApiKey.mockRejectedValue(new Error('API key too long'));

      await authenticateApiKey(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.any(AppError));
      expect(next.mock.calls[0][0].message).toBe('API key authentication failed');
      expect(next.mock.calls[0][0].statusCode).toBe(401);
    });

    test('should handle null or undefined user objects', () => {
      const middleware = requireRole('admin');
      const req = createMockReq({
        user: null
      });
      const res = createMockRes();
      const next = createMockNext();

      middleware(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.any(AppError));
      expect(next.mock.calls[0][0].message).toBe('Authentication required');
      expect(next.mock.calls[0][0].statusCode).toBe(401);
    });

    test('should handle malformed authorization headers', async () => {
      const req = createMockReq({
        headers: { authorization: 'NotBearer token' }
      });
      const res = createMockRes();
      const next = createMockNext();

      mockAuthService.extractToken.mockReturnValue(null);

      await authenticate(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.any(AppError));
      expect(next.mock.calls[0][0].message).toBe('Access token is required');
      expect(next.mock.calls[0][0].statusCode).toBe(401);
    });

    test('should handle case-sensitive header names', async () => {
      const req = createMockReq({
        headers: { 'X-API-KEY': 'valid-api-key' } // Uppercase
      });
      const res = createMockRes();
      const next = createMockNext();

      await authenticateApiKey(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.any(AppError));
      expect(next.mock.calls[0][0].message).toBe('API key is required');
      expect(next.mock.calls[0][0].statusCode).toBe(401);
    });
  });
});