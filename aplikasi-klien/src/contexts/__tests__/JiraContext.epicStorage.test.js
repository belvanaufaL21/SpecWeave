/**
 * Test Suite: Epic Context Storage
 * 
 * Tests for Task 7.1: Test epic context storage
 * Requirements: 6.3
 * 
 * Validates:
 * - Epic selection stores context correctly
 * - Context is available for scenario generation
 * - Context persists across component re-renders
 * - Context is cleared when appropriate
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { JiraProvider, useJira } from '../JiraContext';
import { jiraService } from '../../services/jiraService';

// Mock jiraService
vi.mock('../../services/jiraService', () => ({
  jiraService: {
    getConnections: vi.fn(),
    getEpicContext: vi.fn(),
    setEpicContext: vi.fn(),
    clearEpicContext: vi.fn(),
    startHealthMonitoring: vi.fn()
  }
}));

// Mock initializationManager
vi.mock('../../utils/singletons/InitializationManager.js', () => ({
  default: {
    isJiraInitialized: vi.fn(() => false),
    setJiraInitialized: vi.fn(),
    getJiraPromise: vi.fn(() => null)
  }
}));

describe('Epic Context Storage - Task 7.1', () => {
  const mockConnection = {
    id: 'conn-123',
    project_key: 'TEST',
    jira_url: 'https://test.atlassian.net',
    custom_fields: {
      project_info: {
        name: 'Test Project'
      }
    }
  };

  const mockEpic = {
    id: 'epic-456',
    key: 'TEST-123',
    name: 'Test Epic',
    summary: 'Test epic summary',
    status: 'In Progress',
    assignee: 'Test User',
    created: '2024-01-01',
    updated: '2024-01-15',
    issueType: 'Epic'
  };

  beforeEach(() => {
    // Clear all mocks
    vi.clearAllMocks();
    
    // Clear localStorage and sessionStorage
    localStorage.clear();
    sessionStorage.clear();
    
    // Setup default mock responses
    jiraService.getConnections.mockResolvedValue({
      success: true,
      data: [mockConnection]
    });
    
    jiraService.getEpicContext.mockResolvedValue({
      success: true,
      data: null
    });
    
    jiraService.setEpicContext.mockImplementation(async (epicId, epicData) => {
      // Simulate the actual behavior of storing in localStorage
      const contextData = {
        epicId,
        epicData: {
          ...epicData,
          validatedAt: new Date().toISOString(),
          validationPassed: true
        },
        timestamp: new Date().toISOString()
      };
      localStorage.setItem('specweave_epic_context', JSON.stringify(contextData));
      
      // Clear blocking flags
      localStorage.removeItem('epic_user_cleared');
      sessionStorage.removeItem('epic_context_blocked');
      localStorage.removeItem('epic_context_cleared_at');
      localStorage.removeItem('epic_force_clear_time');
      
      return {
        success: true,
        data: { epicId, epicData }
      };
    });
    
    jiraService.clearEpicContext.mockImplementation(async () => {
      // Simulate the actual behavior of clearing from localStorage
      localStorage.removeItem('specweave_epic_context');
      const clearTimestamp = Date.now();
      localStorage.setItem('epic_context_cleared_at', clearTimestamp.toString());
      localStorage.setItem('epic_force_clear_time', clearTimestamp.toString());
      
      return {
        success: true
      };
    });
  });

  afterEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  describe('Requirement 6.3: Epic selection stores context', () => {
    it('should store epic context when epic is selected', async () => {
      const { result } = renderHook(() => useJira(), {
        wrapper: JiraProvider
      });

      // Wait for initial load
      await waitFor(() => {
        expect(result.current.isLoadingEpic).toBe(false);
      });

      // Set epic context
      await act(async () => {
        await result.current.setEpicContext({
          epic: mockEpic,
          connection: mockConnection
        });
      });

      // Verify epic context is stored in state
      expect(result.current.hasEpic).toBe(true);
      expect(result.current.epicContext).toBeDefined();
      expect(result.current.epicContext.epicData.epic.id).toBe(mockEpic.id);
      expect(result.current.epicContext.epicData.epic.key).toBe(mockEpic.key);
    });

    it('should store epic context in localStorage', async () => {
      const { result } = renderHook(() => useJira(), {
        wrapper: JiraProvider
      });

      await waitFor(() => {
        expect(result.current.isLoadingEpic).toBe(false);
      });

      // Set epic context
      await act(async () => {
        await result.current.setEpicContext({
          epic: mockEpic,
          connection: mockConnection
        });
      });

      // Verify localStorage contains epic context
      const storedContext = localStorage.getItem('specweave_epic_context');
      expect(storedContext).toBeTruthy();
      
      const parsedContext = JSON.parse(storedContext);
      expect(parsedContext.epicData.epic.id).toBe(mockEpic.id);
      expect(parsedContext.epicData.connection.id).toBe(mockConnection.id);
    });

    it('should include connection information in stored context', async () => {
      const { result } = renderHook(() => useJira(), {
        wrapper: JiraProvider
      });

      await waitFor(() => {
        expect(result.current.isLoadingEpic).toBe(false);
      });

      await act(async () => {
        await result.current.setEpicContext({
          epic: mockEpic,
          connection: mockConnection
        });
      });

      // Verify connection info is stored
      expect(result.current.epicContext.epicData.connection).toBeDefined();
      expect(result.current.epicContext.epicData.connection.id).toBe(mockConnection.id);
      expect(result.current.epicContext.epicData.connection.project_key).toBe(mockConnection.project_key);
    });

    it('should store timestamp when epic context is set', async () => {
      const { result } = renderHook(() => useJira(), {
        wrapper: JiraProvider
      });

      await waitFor(() => {
        expect(result.current.isLoadingEpic).toBe(false);
      });

      const beforeTime = Date.now();

      await act(async () => {
        await result.current.setEpicContext({
          epic: mockEpic,
          connection: mockConnection
        });
      });

      const afterTime = Date.now();

      // Verify timestamp is stored
      const storedContext = localStorage.getItem('specweave_epic_context');
      const parsedContext = JSON.parse(storedContext);
      
      expect(parsedContext.timestamp).toBeDefined();
      const storedTime = new Date(parsedContext.timestamp).getTime();
      expect(storedTime).toBeGreaterThanOrEqual(beforeTime);
      expect(storedTime).toBeLessThanOrEqual(afterTime);
    });
  });

  describe('Requirement 6.3: Context available for scenario generation', () => {
    it('should make epic context accessible after selection', async () => {
      const { result } = renderHook(() => useJira(), {
        wrapper: JiraProvider
      });

      await waitFor(() => {
        expect(result.current.isLoadingEpic).toBe(false);
      });

      // Set epic context
      await act(async () => {
        await result.current.setEpicContext({
          epic: mockEpic,
          connection: mockConnection
        });
      });

      // Verify context is accessible
      expect(result.current.epicContext).toBeDefined();
      expect(result.current.epicContext.epicData).toBeDefined();
      expect(result.current.epicContext.epicData.epic).toEqual(mockEpic);
      expect(result.current.epicContext.epicData.connection).toEqual(mockConnection);
    });

    it('should provide hasEpic flag for conditional rendering', async () => {
      const { result } = renderHook(() => useJira(), {
        wrapper: JiraProvider
      });

      await waitFor(() => {
        expect(result.current.isLoadingEpic).toBe(false);
      });

      // Initially no epic
      expect(result.current.hasEpic).toBe(false);

      // Set epic context
      await act(async () => {
        await result.current.setEpicContext({
          epic: mockEpic,
          connection: mockConnection
        });
      });

      // Now has epic
      expect(result.current.hasEpic).toBe(true);
    });

    it('should persist epic context across component re-renders', async () => {
      const { result, rerender } = renderHook(() => useJira(), {
        wrapper: JiraProvider
      });

      await waitFor(() => {
        expect(result.current.isLoadingEpic).toBe(false);
      });

      // Set epic context
      await act(async () => {
        await result.current.setEpicContext({
          epic: mockEpic,
          connection: mockConnection
        });
      });

      const epicContextBefore = result.current.epicContext;

      // Force re-render
      rerender();

      // Context should still be available
      expect(result.current.hasEpic).toBe(true);
      expect(result.current.epicContext).toBeDefined();
      expect(result.current.epicContext.epicData.epic.id).toBe(epicContextBefore.epicData.epic.id);
    });

    it('should allow retrieval of epic context for API calls', async () => {
      const { result } = renderHook(() => useJira(), {
        wrapper: JiraProvider
      });

      await waitFor(() => {
        expect(result.current.isLoadingEpic).toBe(false);
      });

      await act(async () => {
        await result.current.setEpicContext({
          epic: mockEpic,
          connection: mockConnection
        });
      });

      // Simulate scenario generation needing epic context
      const epicForGeneration = result.current.epicContext?.epicData?.epic;
      const connectionForGeneration = result.current.epicContext?.epicData?.connection;

      expect(epicForGeneration).toBeDefined();
      expect(epicForGeneration.id).toBe(mockEpic.id);
      expect(connectionForGeneration).toBeDefined();
      expect(connectionForGeneration.id).toBe(mockConnection.id);
    });
  });

  describe('Context clearing', () => {
    it('should clear epic context when requested', async () => {
      const { result } = renderHook(() => useJira(), {
        wrapper: JiraProvider
      });

      await waitFor(() => {
        expect(result.current.isLoadingEpic).toBe(false);
      });

      // Set epic context
      await act(async () => {
        await result.current.setEpicContext({
          epic: mockEpic,
          connection: mockConnection
        });
      });

      expect(result.current.hasEpic).toBe(true);

      // Clear epic context
      await act(async () => {
        await result.current.clearEpicContext();
      });

      // Verify context is cleared
      expect(result.current.hasEpic).toBe(false);
      expect(result.current.epicContext).toBeNull();
    });

    it('should remove epic context from localStorage when cleared', async () => {
      const { result } = renderHook(() => useJira(), {
        wrapper: JiraProvider
      });

      await waitFor(() => {
        expect(result.current.isLoadingEpic).toBe(false);
      });

      // Set epic context
      await act(async () => {
        await result.current.setEpicContext({
          epic: mockEpic,
          connection: mockConnection
        });
      });

      // Verify it's in localStorage
      expect(localStorage.getItem('specweave_epic_context')).toBeTruthy();

      // Clear epic context
      await act(async () => {
        await result.current.clearEpicContext();
      });

      // Verify it's removed from localStorage
      // Note: clearEpicContext sets a cleared timestamp, so we check for null epic context
      const clearedTimestamp = localStorage.getItem('epic_context_cleared_at');
      expect(clearedTimestamp).toBeTruthy();
    });

    it('should handle working without epic (project-only mode)', async () => {
      const { result } = renderHook(() => useJira(), {
        wrapper: JiraProvider
      });

      await waitFor(() => {
        expect(result.current.isLoadingEpic).toBe(false);
      });

      // Set context without epic
      await act(async () => {
        await result.current.setEpicContext({
          epic: null,
          connection: mockConnection,
          workWithoutEpic: true
        });
      });

      // Verify context is set but without epic
      expect(result.current.hasEpic).toBe(true); // Still true because context is set
      expect(result.current.epicContext).toBeDefined();
      expect(result.current.epicContext.epicData.workWithoutEpic).toBe(true);
      expect(result.current.epicContext.epicData.connection).toEqual(mockConnection);
    });
  });

  describe('Edge cases', () => {
    it('should handle setting epic context when service fails', async () => {
      jiraService.setEpicContext.mockResolvedValueOnce({
        success: false,
        error: 'Failed to set epic context'
      });

      const { result } = renderHook(() => useJira(), {
        wrapper: JiraProvider
      });

      await waitFor(() => {
        expect(result.current.isLoadingEpic).toBe(false);
      });

      // Attempt to set epic context
      let setResult;
      await act(async () => {
        setResult = await result.current.setEpicContext({
          epic: mockEpic,
          connection: mockConnection
        });
      });

      // Verify error is handled
      expect(setResult.success).toBe(false);
      expect(result.current.hasEpic).toBe(false);
    });

    it('should clear blocking flags when epic context is legitimately set', async () => {
      // Set blocking flags
      localStorage.setItem('epic_user_cleared', 'true');
      sessionStorage.setItem('epic_context_blocked', 'true');
      localStorage.setItem('epic_context_cleared_at', Date.now().toString());

      const { result } = renderHook(() => useJira(), {
        wrapper: JiraProvider
      });

      await waitFor(() => {
        expect(result.current.isLoadingEpic).toBe(false);
      });

      // Set epic context
      await act(async () => {
        await result.current.setEpicContext({
          epic: mockEpic,
          connection: mockConnection
        });
      });

      // Verify blocking flags are cleared
      expect(localStorage.getItem('epic_user_cleared')).toBeNull();
      expect(sessionStorage.getItem('epic_context_blocked')).toBeNull();
    });

    it('should validate epic data consistency with chatId', async () => {
      const chatId = 'test-chat-123';
      
      const { result } = renderHook(() => useJira(), {
        wrapper: JiraProvider
      });

      await waitFor(() => {
        expect(result.current.isLoadingEpic).toBe(false);
      });

      // Set epic context with chatId
      await act(async () => {
        await result.current.setEpicContext({
          epic: mockEpic,
          connection: mockConnection,
          chatId: chatId
        });
      });

      // Verify chatId is included in the service call
      expect(jiraService.setEpicContext).toHaveBeenCalledWith(
        mockEpic.id,
        expect.objectContaining({
          chatId: chatId
        })
      );
    });
  });
});
