import jiraController from '../jiraController.js';
import jiraService from '../../services/jiraService.js';

// Mock dependencies
jest.mock('../../services/jiraService.js');
jest.mock('../../services/supabaseService.js');
jest.mock('../../config/cleanLogging.js', () => ({
  default: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
    jiraOperation: jest.fn()
  }
}));

describe('JiraController - Export Flow (Task 10.2)', () => {
  let mockReq;
  let mockRes;

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockReq = {
      user: { id: 'user-123' },
      params: {},
      body: {}
    };

    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis()
    };
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Requirement 9.2: Client sends scenarios and epic to server', () => {
    it('should receive complete story data from client', async () => {
      mockReq.params = {
        connectionId: 'conn-123',
        epicId: 'epic-456'
      };

      mockReq.body = {
        storyData: {
          title: 'User Authentication Feature',
          userStory: 'As a user, I want to authenticate',
          description: 'Authentication feature',
          scenarios: [
            {
              title: 'Successful login',
              given: ['user has valid credentials'],
              when: ['user submits login form'],
              then: ['user is authenticated']
            }
          ]
        },
        scenarios: []
      };

      jiraService.createUserStory = jest.fn().mockResolvedValue({
        id: 'story-789',
        key: 'TEST-123',
        url: 'https://jira.example.com/browse/TEST-123'
      });

      await jiraController.createCompleteStory(mockReq, mockRes);

      // Verify service was called with correct data
      expect(jiraService.createUserStory).toHaveBeenCalledWith(
        'conn-123',
        'epic-456',
        expect.objectContaining({
          title: 'User Authentication Feature',
          scenarios: expect.arrayContaining([
            expect.objectContaining({
              title: 'Successful login'
            })
          ])
        }),
        'user-123'
      );
    });

    it('should handle multiple scenarios in export request', async () => {
      mockReq.params = {
        connectionId: 'conn-123',
        epicId: 'epic-456'
      };

      mockReq.body = {
        storyData: {
          title: 'Multi-scenario Feature',
          userStory: 'Feature with multiple scenarios',
          scenarios: [
            {
              title: 'Scenario 1',
              given: ['condition 1'],
              when: ['action 1'],
              then: ['result 1']
            },
            {
              title: 'Scenario 2',
              given: ['condition 2'],
              when: ['action 2'],
              then: ['result 2']
            },
            {
              title: 'Scenario 3',
              given: ['condition 3'],
              when: ['action 3'],
              then: ['result 3']
            }
          ]
        }
      };

      jiraService.createUserStory = jest.fn().mockResolvedValue({
        id: 'story-789',
        key: 'TEST-124',
        url: 'https://jira.example.com/browse/TEST-124'
      });

      await jiraController.createCompleteStory(mockReq, mockRes);

      // Verify all scenarios were included
      expect(jiraService.createUserStory).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(String),
        expect.objectContaining({
          scenarios: expect.arrayContaining([
            expect.objectContaining({ title: 'Scenario 1' }),
            expect.objectContaining({ title: 'Scenario 2' }),
            expect.objectContaining({ title: 'Scenario 3' })
          ])
        }),
        expect.any(String)
      );
    });

    it('should validate and sanitize scenario data before processing', async () => {
      mockReq.params = {
        connectionId: 'conn-123',
        epicId: 'epic-456'
      };

      // Include invalid scenarios that should be filtered out
      mockReq.body = {
        storyData: {
          title: 'Test Feature',
          userStory: 'Test story',
          scenarios: [
            {
              title: 'Valid Scenario',
              given: ['valid step'],
              when: ['valid action'],
              then: ['valid result']
            },
            null, // Invalid - should be filtered
            {
              // Invalid - no title
              given: ['step'],
              when: ['action'],
              then: ['result']
            },
            {
              title: 'Another Valid Scenario',
              given: ['step 2'],
              when: ['action 2'],
              then: ['result 2']
            }
          ]
        }
      };

      jiraService.createUserStory = jest.fn().mockResolvedValue({
        id: 'story-789',
        key: 'TEST-125',
        url: 'https://jira.example.com/browse/TEST-125'
      });

      await jiraController.createCompleteStory(mockReq, mockRes);

      // Verify only valid scenarios were processed
      const callArgs = jiraService.createUserStory.mock.calls[0];
      const storyData = callArgs[2];
      
      expect(storyData.scenarios).toHaveLength(2);
      expect(storyData.scenarios.every(s => s.title)).toBe(true);
    });
  });

  describe('Requirement 9.3: Server creates JIRA user stories', () => {
    it('should create user story with acceptance criteria table', async () => {
      mockReq.params = {
        connectionId: 'conn-123',
        epicId: 'epic-456'
      };

      mockReq.body = {
        storyData: {
          title: 'Feature with Acceptance Criteria',
          userStory: 'As a user, I want acceptance criteria',
          scenarios: [
            {
              title: 'Test Scenario',
              given: ['precondition'],
              when: ['action'],
              then: ['expected result']
            }
          ]
        }
      };

      jiraService.createUserStory = jest.fn().mockResolvedValue({
        id: 'story-789',
        key: 'TEST-126',
        url: 'https://jira.example.com/browse/TEST-126'
      });

      await jiraController.createCompleteStory(mockReq, mockRes);

      // Verify user story was created
      expect(jiraService.createUserStory).toHaveBeenCalled();
      
      // Verify response indicates success
      expect(mockRes.status).toHaveBeenCalledWith(201);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            userStory: expect.objectContaining({
              key: 'TEST-126'
            })
          })
        })
      );
    });

    it('should link user story to specified Epic', async () => {
      const epicId = 'epic-789';
      
      mockReq.params = {
        connectionId: 'conn-123',
        epicId: epicId
      };

      mockReq.body = {
        storyData: {
          title: 'Story linked to Epic',
          userStory: 'Story under epic',
          scenarios: [
            {
              title: 'Scenario',
              given: ['step'],
              when: ['action'],
              then: ['result']
            }
          ]
        }
      };

      jiraService.createUserStory = jest.fn().mockResolvedValue({
        id: 'story-999',
        key: 'TEST-127',
        url: 'https://jira.example.com/browse/TEST-127'
      });

      await jiraController.createCompleteStory(mockReq, mockRes);

      // Verify Epic ID was passed to service
      expect(jiraService.createUserStory).toHaveBeenCalledWith(
        expect.any(String),
        epicId,
        expect.any(Object),
        expect.any(String)
      );
    });

    it('should handle scenarios included in acceptance criteria table', async () => {
      mockReq.params = {
        connectionId: 'conn-123',
        epicId: 'epic-456'
      };

      mockReq.body = {
        storyData: {
          title: 'Story with Table',
          userStory: 'Story with acceptance criteria table',
          scenarios: [
            {
              title: 'Table Scenario 1',
              given: ['table condition 1'],
              when: ['table action 1'],
              then: ['table result 1']
            },
            {
              title: 'Table Scenario 2',
              given: ['table condition 2'],
              when: ['table action 2'],
              then: ['table result 2']
            }
          ]
        }
      };

      jiraService.createUserStory = jest.fn().mockResolvedValue({
        id: 'story-888',
        key: 'TEST-128',
        url: 'https://jira.example.com/browse/TEST-128'
      });

      await jiraController.createCompleteStory(mockReq, mockRes);

      // Verify scenarios were included in story data
      const callArgs = jiraService.createUserStory.mock.calls[0];
      const storyData = callArgs[2];
      
      expect(storyData.scenarios).toBeDefined();
      expect(storyData.scenarios.length).toBe(2);
      
      // Verify response indicates scenarios were included
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            scenarioCount: 2
          }),
          message: expect.stringContaining('scenarios in acceptance criteria')
        })
      );
    });
  });

  describe('Requirement 9.4: Server returns success with issue keys', () => {
    it('should return created user story key and URL', async () => {
      mockReq.params = {
        connectionId: 'conn-123',
        epicId: 'epic-456'
      };

      mockReq.body = {
        storyData: {
          title: 'Test Story',
          userStory: 'Test',
          scenarios: [
            {
              title: 'Scenario',
              given: ['step'],
              when: ['action'],
              then: ['result']
            }
          ]
        }
      };

      const mockUserStory = {
        id: 'story-123',
        key: 'TEST-200',
        url: 'https://jira.example.com/browse/TEST-200'
      };

      jiraService.createUserStory = jest.fn().mockResolvedValue(mockUserStory);

      await jiraController.createCompleteStory(mockReq, mockRes);

      // Verify response contains issue key and URL
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            userStory: expect.objectContaining({
              key: 'TEST-200',
              url: 'https://jira.example.com/browse/TEST-200'
            })
          })
        })
      );
    });

    it('should return scenario count in success response', async () => {
      mockReq.params = {
        connectionId: 'conn-123',
        epicId: 'epic-456'
      };

      mockReq.body = {
        storyData: {
          title: 'Multi-scenario Story',
          userStory: 'Story with 3 scenarios',
          scenarios: [
            { title: 'S1', given: ['g1'], when: ['w1'], then: ['t1'] },
            { title: 'S2', given: ['g2'], when: ['w2'], then: ['t2'] },
            { title: 'S3', given: ['g3'], when: ['w3'], then: ['t3'] }
          ]
        }
      };

      jiraService.createUserStory = jest.fn().mockResolvedValue({
        id: 'story-456',
        key: 'TEST-201',
        url: 'https://jira.example.com/browse/TEST-201'
      });

      await jiraController.createCompleteStory(mockReq, mockRes);

      // Verify scenario count is returned
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            scenarioCount: 3
          })
        })
      );
    });

    it('should return success message with scenario details', async () => {
      mockReq.params = {
        connectionId: 'conn-123',
        epicId: 'epic-456'
      };

      mockReq.body = {
        storyData: {
          title: 'Story',
          userStory: 'Test',
          scenarios: [
            { title: 'S1', given: ['g'], when: ['w'], then: ['t'] },
            { title: 'S2', given: ['g'], when: ['w'], then: ['t'] }
          ]
        }
      };

      jiraService.createUserStory = jest.fn().mockResolvedValue({
        id: 'story-789',
        key: 'TEST-202',
        url: 'https://jira.example.com/browse/TEST-202'
      });

      await jiraController.createCompleteStory(mockReq, mockRes);

      // Verify success message mentions scenarios
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          message: expect.stringMatching(/2 scenarios/)
        })
      );
    });

    it('should return 201 status code for successful creation', async () => {
      mockReq.params = {
        connectionId: 'conn-123',
        epicId: 'epic-456'
      };

      mockReq.body = {
        storyData: {
          title: 'New Story',
          userStory: 'Test',
          scenarios: [
            { title: 'S', given: ['g'], when: ['w'], then: ['t'] }
          ]
        }
      };

      jiraService.createUserStory = jest.fn().mockResolvedValue({
        id: 'story-111',
        key: 'TEST-203',
        url: 'https://jira.example.com/browse/TEST-203'
      });

      await jiraController.createCompleteStory(mockReq, mockRes);

      // Verify 201 Created status
      expect(mockRes.status).toHaveBeenCalledWith(201);
    });

    it('should include empty subtasks array in response', async () => {
      mockReq.params = {
        connectionId: 'conn-123',
        epicId: 'epic-456'
      };

      mockReq.body = {
        storyData: {
          title: 'Story',
          userStory: 'Test',
          scenarios: [
            { title: 'S', given: ['g'], when: ['w'], then: ['t'] }
          ]
        }
      };

      jiraService.createUserStory = jest.fn().mockResolvedValue({
        id: 'story-222',
        key: 'TEST-204',
        url: 'https://jira.example.com/browse/TEST-204'
      });

      await jiraController.createCompleteStory(mockReq, mockRes);

      // Verify subtasks array is empty (scenarios in table, not as subtasks)
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            subtasks: []
          })
        })
      );
    });
  });
});
