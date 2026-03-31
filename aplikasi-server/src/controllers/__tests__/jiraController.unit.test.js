// Mock dependencies before importing
jest.mock('../../services/jiraService.js');
jest.mock('../../services/supabaseService.js');

import jiraController from '../jiraController.js';
import jiraService from '../../services/jiraService.js';

describe('JIRA Controller - Connection Testing', () => {
  let mockReq;
  let mockRes;

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockReq = {
      body: {},
      params: {},
      query: {},
      user: { id: 'test-user-id' }
    };
    
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis()
    };
  });

  describe('testNewConnection', () => {
    it('should successfully test valid JIRA credentials', async () => {
      // Arrange
      mockReq.body = {
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
      await jiraController.testNewConnection(mockReq, mockRes);

      // Assert
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: mockTestResult.data,
        message: 'JIRA connection test successful'
      });
      expect(jiraService.testJiraConnection).toHaveBeenCalledWith({
        jiraUrl: 'https://test.atlassian.net',
        email: 'test@example.com',
        apiToken: 'valid-token-123',
        projectKey: 'TEST'
      });
    });

    it('should return descriptive error for invalid credentials', async () => {
      // Arrange
      mockReq.body = {
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
      await jiraController.testNewConnection(mockReq, mockRes);

      // Assert
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Invalid email or API token. Please check your credentials or generate a new API token.'
      });
    });

    it('should return descriptive error for expired token', async () => {
      // Arrange
      mockReq.body = {
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
      await jiraController.testNewConnection(mockReq, mockRes);

      // Assert
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: expect.stringContaining('expired')
      });
    });

    it('should return descriptive error for project not found', async () => {
      // Arrange
      mockReq.body = {
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
      await jiraController.testNewConnection(mockReq, mockRes);

      // Assert
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: expect.stringContaining('not found')
      });
    });

    it('should return descriptive error for insufficient permissions', async () => {
      // Arrange
      mockReq.body = {
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
      await jiraController.testNewConnection(mockReq, mockRes);

      // Assert
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: expect.stringContaining('permission')
      });
    });

    it('should handle service errors gracefully', async () => {
      // Arrange
      mockReq.body = {
        jiraUrl: 'https://test.atlassian.net',
        email: 'test@example.com',
        apiToken: 'token-123',
        projectKey: 'TEST'
      };

      jiraService.testJiraConnection.mockRejectedValue(
        new Error('Network timeout')
      );

      // Act
      await jiraController.testNewConnection(mockReq, mockRes);

      // Assert
      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Network timeout'
      });
    });
  });
});


  describe('getProjectEpics', () => {
    it('should successfully fetch epics for a project', async () => {
      // Arrange
      mockReq.params = {
        connectionId: 'test-connection-id',
        projectKey: 'TEST'
      };

      const mockEpics = [
        {
          id: '10001',
          key: 'TEST-1',
          name: 'Epic 1',
          summary: 'First Epic',
          description: 'Description of first epic',
          status: 'In Progress',
          assignee: 'John Doe',
          created: '2024-01-01T00:00:00Z',
          updated: '2024-01-02T00:00:00Z',
          issueType: 'Epic',
          projectKey: 'TEST'
        },
        {
          id: '10002',
          key: 'TEST-2',
          name: 'Epic 2',
          summary: 'Second Epic',
          description: 'Description of second epic',
          status: 'To Do',
          assignee: 'Jane Smith',
          created: '2024-01-03T00:00:00Z',
          updated: '2024-01-04T00:00:00Z',
          issueType: 'Epic',
          projectKey: 'TEST'
        }
      ];

      jiraService.getProjectEpics.mockResolvedValue(mockEpics);

      // Act
      await jiraController.getProjectEpics(mockReq, mockRes);

      // Assert
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: mockEpics
      });
      expect(jiraService.getProjectEpics).toHaveBeenCalledWith(
        'test-connection-id',
        'TEST',
        'test-user-id'
      );
    });

    it('should return empty array when no epics found', async () => {
      // Arrange
      mockReq.params = {
        connectionId: 'test-connection-id',
        projectKey: 'EMPTY'
      };

      jiraService.getProjectEpics.mockResolvedValue([]);

      // Act
      await jiraController.getProjectEpics(mockReq, mockRes);

      // Assert
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: []
      });
    });

    it('should handle errors gracefully and return empty array', async () => {
      // Arrange
      mockReq.params = {
        connectionId: 'test-connection-id',
        projectKey: 'TEST'
      };

      jiraService.getProjectEpics.mockRejectedValue(
        new Error('JIRA API error')
      );

      // Act
      await jiraController.getProjectEpics(mockReq, mockRes);

      // Assert
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: [],
        warning: 'JIRA API error',
        fallback: true
      });
    });

    it('should work with different project keys', async () => {
      // Arrange
      const projectKeys = ['TEST', 'SCRUM', 'PROJ'];
      
      for (const projectKey of projectKeys) {
        jest.clearAllMocks();
        
        mockReq.params = {
          connectionId: 'test-connection-id',
          projectKey
        };

        const mockEpics = [
          {
            id: '10001',
            key: `${projectKey}-1`,
            name: `Epic for ${projectKey}`,
            summary: `Epic summary`,
            projectKey
          }
        ];

        jiraService.getProjectEpics.mockResolvedValue(mockEpics);

        // Act
        await jiraController.getProjectEpics(mockReq, mockRes);

        // Assert
        expect(mockRes.json).toHaveBeenCalledWith({
          success: true,
          data: mockEpics
        });
        expect(jiraService.getProjectEpics).toHaveBeenCalledWith(
          'test-connection-id',
          projectKey,
          'test-user-id'
        );
      }
    });

    it('should handle timeout errors gracefully', async () => {
      // Arrange
      mockReq.params = {
        connectionId: 'test-connection-id',
        projectKey: 'TEST'
      };

      const timeoutError = new Error('Epic fetch timeout');
      jiraService.getProjectEpics.mockRejectedValue(timeoutError);

      // Act
      await jiraController.getProjectEpics(mockReq, mockRes);

      // Assert
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: [],
        warning: 'Epic fetch timeout',
        fallback: true
      });
    });

    it('should verify epic data structure contains required fields', async () => {
      // Arrange
      mockReq.params = {
        connectionId: 'test-connection-id',
        projectKey: 'TEST'
      };

      const mockEpics = [
        {
          id: '10001',
          key: 'TEST-1',
          name: 'Epic 1',
          summary: 'First Epic',
          description: 'Description',
          status: 'In Progress',
          assignee: 'John Doe',
          created: '2024-01-01T00:00:00Z',
          updated: '2024-01-02T00:00:00Z',
          issueType: 'Epic',
          projectKey: 'TEST'
        }
      ];

      jiraService.getProjectEpics.mockResolvedValue(mockEpics);

      // Act
      await jiraController.getProjectEpics(mockReq, mockRes);

      // Assert
      expect(mockRes.json).toHaveBeenCalled();
      const response = mockRes.json.mock.calls[0][0];
      expect(response.success).toBe(true);
      expect(response.data).toHaveLength(1);
      
      const epic = response.data[0];
      expect(epic).toHaveProperty('id');
      expect(epic).toHaveProperty('key');
      expect(epic).toHaveProperty('name');
      expect(epic).toHaveProperty('summary');
      expect(epic).toHaveProperty('status');
      expect(epic).toHaveProperty('projectKey');
    });
  });
});
