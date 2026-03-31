import request from 'supertest';
import express from 'express';

// Mock dependencies before importing routes
jest.mock('../../services/jiraService.js');
jest.mock('../../services/supabaseService.js');
jest.mock('../../middlewares/auth.js', () => ({
  authenticate: (req, res, next) => {
    req.user = { id: 'test-user-id' };
    next();
  },
  optionalAuth: (req, res, next) => {
    req.user = { id: 'test-user-id' };
    next();
  }
}));

import jiraRoutes from '../../routes/jiraRoutes.js';
import jiraService from '../../services/jiraService.js';

// Create test app
const app = express();
app.use(express.json());
app.use('/api/jira', jiraRoutes);

describe('JIRA Connection Flow Integration Tests', () => {
  describe('POST /api/jira/test-connection', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('should successfully test valid JIRA credentials', async () => {
      // Arrange
      const validCredentials = {
        jiraUrl: 'https://test.atlassian.net',
        email: 'test@example.com',
        apiToken: 'valid-token-123',
        projectKey: 'TEST'
      };

      const mockTestResult = {
        success: true,
        data: {
          serverInfo: {
            version: '9.0.0',
            serverTitle: 'Test JIRA',
            baseUrl: 'https://test.atlassian.net'
          },
          projectInfo: {
            key: 'TEST',
            name: 'Test Project',
            projectTypeKey: 'software'
          },
          permissions: {
            canCreateIssues: true,
            availableIssueTypes: [
              { id: '1', name: 'Story', description: 'User Story' },
              { id: '2', name: 'Epic', description: 'Epic' }
            ]
          },
          tokenHealth: {
            status: 'healthy',
            userInfo: {
              displayName: 'Test User',
              emailAddress: 'test@example.com',
              accountId: 'test-account-id'
            },
            lastChecked: new Date().toISOString(),
            message: 'API token is working properly'
          }
        }
      };

      jiraService.testJiraConnection.mockResolvedValue(mockTestResult);

      // Act
      const response = await request(app)
        .post('/api/jira/test-connection')
        .send(validCredentials);

      // Assert
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.serverInfo).toBeDefined();
      expect(response.body.data.projectInfo).toBeDefined();
      expect(response.body.data.projectInfo.key).toBe('TEST');
      expect(response.body.data.tokenHealth.status).toBe('healthy');
      expect(response.body.message).toBe('JIRA connection test successful');
      
      // Verify service was called with correct parameters
      expect(jiraService.testJiraConnection).toHaveBeenCalledWith(validCredentials);
    });

    it('should return descriptive error for invalid credentials', async () => {
      // Arrange
      const invalidCredentials = {
        jiraUrl: 'https://test.atlassian.net',
        email: 'test@example.com',
        apiToken: 'invalid-token',
        projectKey: 'TEST'
      };

      const mockTestResult = {
        success: false,
        error: 'Invalid email or API token. Please check your credentials or generate a new API token.',
        errorCategory: 'authentication_failed',
        suggestions: [
          'Verify your email address is correct',
          'Generate a new API token from JIRA settings',
          'Check if your JIRA instance URL is correct'
        ]
      };

      jiraService.testJiraConnection.mockResolvedValue(mockTestResult);

      // Act
      const response = await request(app)
        .post('/api/jira/test-connection')
        .send(invalidCredentials);

      // Assert
      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Invalid email or API token');
      
      // Verify service was called
      expect(jiraService.testJiraConnection).toHaveBeenCalledWith(invalidCredentials);
    });

    it('should return descriptive error for expired token', async () => {
      // Arrange
      const expiredTokenCredentials = {
        jiraUrl: 'https://test.atlassian.net',
        email: 'test@example.com',
        apiToken: 'expired-token',
        projectKey: 'TEST'
      };

      const mockTestResult = {
        success: false,
        error: 'API token has expired or is invalid. Please generate a new API token from your JIRA account settings.',
        errorCategory: 'token_expired',
        suggestions: [
          'Generate a new API token from your JIRA account settings',
          'Check if your JIRA account is still active',
          'Verify the API token was copied correctly'
        ]
      };

      jiraService.testJiraConnection.mockResolvedValue(mockTestResult);

      // Act
      const response = await request(app)
        .post('/api/jira/test-connection')
        .send(expiredTokenCredentials);

      // Assert
      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('expired');
      
      // Verify service was called
      expect(jiraService.testJiraConnection).toHaveBeenCalledWith(expiredTokenCredentials);
    });

    it('should return validation error for missing required fields', async () => {
      // Arrange
      const incompleteCredentials = {
        jiraUrl: 'https://test.atlassian.net',
        email: 'test@example.com'
        // Missing apiToken and projectKey
      };

      // Act
      const response = await request(app)
        .post('/api/jira/test-connection')
        .send(incompleteCredentials);

      // Assert
      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Validation failed');
      expect(response.body.details).toBeDefined();
      expect(response.body.details.length).toBeGreaterThan(0);
      
      // Verify service was NOT called due to validation failure
      expect(jiraService.testJiraConnection).not.toHaveBeenCalled();
    });

    it('should return validation error for invalid URL format', async () => {
      // Arrange
      const invalidUrlCredentials = {
        jiraUrl: 'not-a-valid-url',
        email: 'test@example.com',
        apiToken: 'token-123',
        projectKey: 'TEST'
      };

      // Act
      const response = await request(app)
        .post('/api/jira/test-connection')
        .send(invalidUrlCredentials);

      // Assert
      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Validation failed');
      expect(response.body.details).toBeDefined();
      
      // Verify service was NOT called due to validation failure
      expect(jiraService.testJiraConnection).not.toHaveBeenCalled();
    });

    it('should return validation error for invalid email format', async () => {
      // Arrange
      const invalidEmailCredentials = {
        jiraUrl: 'https://test.atlassian.net',
        email: 'not-an-email',
        apiToken: 'token-123',
        projectKey: 'TEST'
      };

      // Act
      const response = await request(app)
        .post('/api/jira/test-connection')
        .send(invalidEmailCredentials);

      // Assert
      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Validation failed');
      
      // Verify service was NOT called due to validation failure
      expect(jiraService.testJiraConnection).not.toHaveBeenCalled();
    });

    it('should handle service errors gracefully', async () => {
      // Arrange
      const validCredentials = {
        jiraUrl: 'https://test.atlassian.net',
        email: 'test@example.com',
        apiToken: 'token-123',
        projectKey: 'TEST'
      };

      jiraService.testJiraConnection.mockRejectedValue(
        new Error('Network timeout')
      );

      // Act
      const response = await request(app)
        .post('/api/jira/test-connection')
        .send(validCredentials);

      // Assert
      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Network timeout');
    });

    it('should return descriptive error for project not found', async () => {
      // Arrange
      const credentialsWithInvalidProject = {
        jiraUrl: 'https://test.atlassian.net',
        email: 'test@example.com',
        apiToken: 'valid-token',
        projectKey: 'NONEXISTENT'
      };

      const mockTestResult = {
        success: false,
        error: "Project 'NONEXISTENT' not found. Please check the project key.",
        errorCategory: 'unknown'
      };

      jiraService.testJiraConnection.mockResolvedValue(mockTestResult);

      // Act
      const response = await request(app)
        .post('/api/jira/test-connection')
        .send(credentialsWithInvalidProject);

      // Assert
      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('not found');
    });

    it('should return descriptive error for insufficient permissions', async () => {
      // Arrange
      const credentialsWithLimitedPermissions = {
        jiraUrl: 'https://test.atlassian.net',
        email: 'test@example.com',
        apiToken: 'limited-token',
        projectKey: 'TEST'
      };

      const mockTestResult = {
        success: false,
        error: 'No permission to create issues in project \'TEST\'. Your API token may have expired or lacks sufficient permissions.',
        errorCategory: 'insufficient_permissions',
        suggestions: [
          'Contact your JIRA administrator to grant necessary permissions',
          'Ensure your account has access to the specified project',
          'Check if your API token has the required scopes'
        ]
      };

      jiraService.testJiraConnection.mockResolvedValue(mockTestResult);

      // Act
      const response = await request(app)
        .post('/api/jira/test-connection')
        .send(credentialsWithLimitedPermissions);

      // Assert
      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('permission');
    });
  });
});
