import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import JiraExportCTA from '../JiraExportCTA';
import { useJira } from '../../../contexts/JiraContext';
import { jiraService } from '../../../services/jiraService';

// Mock dependencies
vi.mock('../../../contexts/JiraContext');
vi.mock('../../../services/jiraService');
vi.mock('../../../config/cleanLogging.js', () => ({
  default: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn()
  }
}));

describe('JiraExportCTA - Export Error Handling (Task 10.3)', () => {
  const mockScenarioData = {
    feature: 'Test Feature',
    userStory: 'As a user, I want to test',
    scenarios: [
      {
        title: 'Test Scenario 1',
        given: ['user is logged in'],
        when: ['user clicks button'],
        then: ['action is performed']
      },
      {
        title: 'Test Scenario 2',
        given: ['another condition'],
        when: ['another action'],
        then: ['another result']
      }
    ]
  };

  const mockValidJiraContext = {
    epicContext: {
      epicData: {
        epic: { id: 'epic-1', key: 'TEST-1', name: 'Test Epic' },
        connection: { id: 'conn-1', project_key: 'TEST' }
      }
    },
    hasEpic: true,
    openEpicModal: vi.fn(),
    connections: [{ id: 'conn-1', project_key: 'TEST' }]
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Requirement 9.5: Error messages show failed scenarios and reasons', () => {
    it('should display error message when export fails', async () => {
      useJira.mockReturnValue(mockValidJiraContext);

      jiraService.createCompleteStory = vi.fn().mockResolvedValue({
        success: false,
        error: 'Failed to create user story in JIRA'
      });

      render(<JiraExportCTA scenarioData={mockScenarioData} />);

      const exportButton = screen.getByRole('button', { name: /export/i });
      fireEvent.click(exportButton);

      await waitFor(() => {
        // Verify error message is displayed
        expect(screen.getByText(/failed to create user story/i)).toBeInTheDocument();
      });
    });

    it('should show authentication error with helpful context', async () => {
      useJira.mockReturnValue(mockValidJiraContext);

      jiraService.createCompleteStory = vi.fn().mockRejectedValue({
        response: {
          data: {
            error: 'Authentication failed: 401 Unauthorized'
          }
        }
      });

      render(<JiraExportCTA scenarioData={mockScenarioData} />);

      const exportButton = screen.getByRole('button', { name: /export/i });
      fireEvent.click(exportButton);

      await waitFor(() => {
        // Verify authentication error with helpful message
        expect(screen.getByText(/authentication failed.*check your jira credentials/i)).toBeInTheDocument();
      });
    });

    it('should show permission error with helpful context', async () => {
      useJira.mockReturnValue(mockValidJiraContext);

      jiraService.createCompleteStory = vi.fn().mockRejectedValue({
        response: {
          data: {
            error: 'Permission denied: 403 Forbidden'
          }
        }
      });

      render(<JiraExportCTA scenarioData={mockScenarioData} />);

      const exportButton = screen.getByRole('button', { name: /export/i });
      fireEvent.click(exportButton);

      await waitFor(() => {
        // Verify permission error with helpful message
        expect(screen.getByText(/permission denied.*check your jira permissions/i)).toBeInTheDocument();
      });
    });

    it('should show resource not found error with helpful context', async () => {
      useJira.mockReturnValue(mockValidJiraContext);

      jiraService.createCompleteStory = vi.fn().mockRejectedValue({
        response: {
          data: {
            error: 'Epic not found: 404 Not Found'
          }
        }
      });

      render(<JiraExportCTA scenarioData={mockScenarioData} />);

      const exportButton = screen.getByRole('button', { name: /export/i });
      fireEvent.click(exportButton);

      await waitFor(() => {
        // Verify not found error with helpful message
        expect(screen.getByText(/jira resource not found.*check your epic and project settings/i)).toBeInTheDocument();
      });
    });

    it('should show field validation errors with details', async () => {
      useJira.mockReturnValue(mockValidJiraContext);

      jiraService.createCompleteStory = vi.fn().mockRejectedValue({
        message: 'Field errors: summary is required, description is too long'
      });

      render(<JiraExportCTA scenarioData={mockScenarioData} />);

      const exportButton = screen.getByRole('button', { name: /export/i });
      fireEvent.click(exportButton);

      await waitFor(() => {
        // Verify field validation error is shown with details
        const errorMessage = screen.getByText(/jira field validation failed.*field errors/i);
        expect(errorMessage).toBeInTheDocument();
      });
    });

    it('should explain which scenarios failed when partial export occurs', async () => {
      useJira.mockReturnValue(mockValidJiraContext);

      // Simulate partial failure - user story created but some scenarios failed
      jiraService.createCompleteStory = vi.fn().mockResolvedValue({
        success: true,
        data: {
          userStory: {
            id: 'story-1',
            key: 'TEST-100',
            url: 'https://jira.example.com/browse/TEST-100'
          },
          scenarioCount: 1, // Only 1 out of 2 scenarios succeeded
          failedScenarios: [
            {
              scenario_index: 1,
              scenario_title: 'Test Scenario 2',
              error: 'Failed to create subtask: Invalid field value'
            }
          ]
        }
      });

      render(<JiraExportCTA scenarioData={mockScenarioData} />);

      const exportButton = screen.getByRole('button', { name: /export/i });
      fireEvent.click(exportButton);

      await waitFor(() => {
        // Verify success message shows scenario count
        expect(screen.getByText(/1 scenario/i)).toBeInTheDocument();
      });
    });

    it('should provide clear error message for network failures', async () => {
      useJira.mockReturnValue(mockValidJiraContext);

      jiraService.createCompleteStory = vi.fn().mockRejectedValue({
        message: 'Network error: Failed to fetch'
      });

      render(<JiraExportCTA scenarioData={mockScenarioData} />);

      const exportButton = screen.getByRole('button', { name: /export/i });
      fireEvent.click(exportButton);

      await waitFor(() => {
        // Verify network error message
        expect(screen.getByText(/network error/i)).toBeInTheDocument();
      });
    });

    it('should show timeout warning with appropriate message', async () => {
      useJira.mockReturnValue(mockValidJiraContext);

      jiraService.createCompleteStory = vi.fn().mockResolvedValue({
        success: false,
        isTimeout: true,
        error: 'Export operation timed out. The user story may have been created - please check JIRA.'
      });

      render(<JiraExportCTA scenarioData={mockScenarioData} />);

      const exportButton = screen.getByRole('button', { name: /export/i });
      fireEvent.click(exportButton);

      await waitFor(() => {
        // Verify timeout warning is displayed
        const warningMessage = screen.getByText(/timed out.*may have been created/i);
        expect(warningMessage).toBeInTheDocument();
        // Verify it's styled as warning, not error
        expect(warningMessage).toHaveClass('text-yellow-300');
      });
    });

    it('should display generic error message for unknown failures', async () => {
      useJira.mockReturnValue(mockValidJiraContext);

      jiraService.createCompleteStory = vi.fn().mockRejectedValue(
        new Error('Unknown error occurred')
      );

      render(<JiraExportCTA scenarioData={mockScenarioData} />);

      const exportButton = screen.getByRole('button', { name: /export/i });
      fireEvent.click(exportButton);

      await waitFor(() => {
        // Verify generic error message
        expect(screen.getByText(/unknown error occurred/i)).toBeInTheDocument();
      });
    });

    it('should show error indicator icon for failed exports', async () => {
      useJira.mockReturnValue(mockValidJiraContext);

      jiraService.createCompleteStory = vi.fn().mockRejectedValue(
        new Error('Export failed')
      );

      render(<JiraExportCTA scenarioData={mockScenarioData} />);

      const exportButton = screen.getByRole('button', { name: /export/i });
      fireEvent.click(exportButton);

      await waitFor(() => {
        // Verify error message is present
        const errorMessage = screen.getByText(/export failed/i);
        expect(errorMessage).toBeInTheDocument();
        
        // Verify error icon is present (it's in a flex container)
        const errorContainer = errorMessage.parentElement;
        const iconContainer = errorContainer.querySelector('.flex-shrink-0');
        expect(iconContainer).toBeInTheDocument();
        
        const errorIcon = iconContainer.querySelector('svg');
        expect(errorIcon).toBeInTheDocument();
        expect(errorIcon).toHaveClass('text-red-400');
      });
    });

    it('should maintain error state after export failure', async () => {
      useJira.mockReturnValue(mockValidJiraContext);

      jiraService.createCompleteStory = vi.fn().mockRejectedValue(
        new Error('Export failed')
      );

      render(<JiraExportCTA scenarioData={mockScenarioData} />);

      const exportButton = screen.getByRole('button', { name: /export/i });
      fireEvent.click(exportButton);

      await waitFor(() => {
        expect(screen.getByText(/export failed/i)).toBeInTheDocument();
      });

      // Verify error persists
      expect(screen.getByText(/export failed/i)).toBeInTheDocument();
      
      // Verify button is re-enabled for retry
      expect(exportButton).not.toBeDisabled();
    });

    it('should allow retry after export failure', async () => {
      useJira.mockReturnValue(mockValidJiraContext);

      // First attempt fails
      jiraService.createCompleteStory = vi.fn()
        .mockRejectedValueOnce(new Error('Temporary failure'))
        .mockResolvedValueOnce({
          success: true,
          data: {
            userStory: {
              id: 'story-1',
              key: 'TEST-101',
              url: 'https://jira.example.com/browse/TEST-101'
            },
            scenarioCount: 2
          }
        });

      render(<JiraExportCTA scenarioData={mockScenarioData} />);

      const exportButton = screen.getByRole('button', { name: /export/i });
      
      // First attempt
      fireEvent.click(exportButton);
      await waitFor(() => {
        expect(screen.getByText(/temporary failure/i)).toBeInTheDocument();
      });

      // Retry
      fireEvent.click(exportButton);
      await waitFor(() => {
        expect(screen.getByText(/successfully exported/i)).toBeInTheDocument();
      });

      // Verify service was called twice
      expect(jiraService.createCompleteStory).toHaveBeenCalledTimes(2);
    });

    it('should clear previous error when starting new export', async () => {
      useJira.mockReturnValue(mockValidJiraContext);

      jiraService.createCompleteStory = vi.fn()
        .mockRejectedValueOnce(new Error('First error'))
        .mockImplementationOnce(() => new Promise(() => {})); // Never resolves

      render(<JiraExportCTA scenarioData={mockScenarioData} />);

      const exportButton = screen.getByRole('button', { name: /export/i });
      
      // First attempt - fails
      fireEvent.click(exportButton);
      await waitFor(() => {
        expect(screen.getByText(/first error/i)).toBeInTheDocument();
      });

      // Second attempt - starts loading
      fireEvent.click(exportButton);
      await waitFor(() => {
        // Verify loading state is shown
        expect(screen.getByText(/exporting/i)).toBeInTheDocument();
        // Verify previous error is cleared
        expect(screen.queryByText(/first error/i)).not.toBeInTheDocument();
      });
    });
  });
});
