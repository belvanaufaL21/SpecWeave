/**
 * Test Suite: Epic Selection Modal - Empty State and Error Handling
 * 
 * Tests for Task 7.2: Test empty state dan error handling
 * Requirements: 6.4, 6.5
 * 
 * Validates:
 * - Message "Tidak ada epic ditemukan" muncul saat empty
 * - Error message dengan retry option saat loading gagal
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import EpicSelectionModal from '../EpicSelectionModal';
import { jiraService } from '../../../services/jiraService';
import projectStateManager from '../../../utils/managers/ProjectStateManager';

// Mock dependencies
vi.mock('../../../services/jiraService', () => ({
  jiraService: {
    getConnections: vi.fn(),
    getProjectEpics: vi.fn(),
    validateEpicAccess: vi.fn(),
    setEpicContext: vi.fn()
  }
}));

vi.mock('../../../utils/managers/ProjectStateManager', () => ({
  default: {
    validateConsistency: vi.fn(),
    fixInconsistencies: vi.fn(),
    getActiveProject: vi.fn(),
    setActiveProject: vi.fn()
  }
}));

describe('Epic Selection Modal - Empty State and Error Handling - Task 7.2', () => {
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

  const mockOnClose = vi.fn();
  const mockOnEpicSelected = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    sessionStorage.clear();

    // Default mock setup for successful connection loading
    projectStateManager.validateConsistency.mockResolvedValue({
      success: true,
      data: { consistent: true }
    });

    projectStateManager.getActiveProject.mockResolvedValue({
      success: true,
      data: {
        connection: mockConnection,
        projectKey: mockConnection.project_key,
        projectName: mockConnection.custom_fields.project_info.name,
        connectionId: mockConnection.id
      }
    });

    jiraService.getConnections.mockResolvedValue({
      success: true,
      data: [mockConnection]
    });
  });

  afterEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  describe('Requirement 6.4: Empty epic list handling', () => {
    it('should display "Tidak ada epic ditemukan" message when no epics are available', async () => {
      // Mock empty epic list
      jiraService.getProjectEpics.mockResolvedValue({
        success: true,
        data: []
      });

      render(
        <EpicSelectionModal
          isOpen={true}
          onClose={mockOnClose}
          onEpicSelected={mockOnEpicSelected}
        />
      );

      // Wait for loading to complete
      await waitFor(() => {
        expect(screen.queryByText(/Loading/i)).not.toBeInTheDocument();
      });

      // Check for empty state message (Indonesian: "Tidak ada epic ditemukan")
      // The actual text in the component is "Tidak Ada Epic"
      await waitFor(() => {
        const emptyMessage = screen.getByText(/tidak ada epic/i);
        expect(emptyMessage).toBeInTheDocument();
      });
    });

    it('should display project name in empty state message', async () => {
      jiraService.getProjectEpics.mockResolvedValue({
        success: true,
        data: []
      });

      render(
        <EpicSelectionModal
          isOpen={true}
          onClose={mockOnClose}
          onEpicSelected={mockOnEpicSelected}
        />
      );

      await waitFor(() => {
        expect(screen.queryByText(/Loading/i)).not.toBeInTheDocument();
      });

      // Should show project name in empty state (in the empty message area, not the header)
      await waitFor(() => {
        const emptyStateText = screen.getByText(/tidak memiliki epic issues/i);
        expect(emptyStateText).toBeInTheDocument();
        // Verify the project name is in the empty state paragraph
        const paragraph = emptyStateText.closest('p');
        expect(paragraph).toHaveTextContent('Test Project');
      });
    });

    it('should offer "Continue without Epic" option when no epics found', async () => {
      jiraService.getProjectEpics.mockResolvedValue({
        success: true,
        data: []
      });

      render(
        <EpicSelectionModal
          isOpen={true}
          onClose={mockOnClose}
          onEpicSelected={mockOnEpicSelected}
        />
      );

      await waitFor(() => {
        expect(screen.queryByText(/Loading/i)).not.toBeInTheDocument();
      });

      // Should show "Continue without Epic" button (Indonesian: "Lanjutkan Tanpa Epic")
      await waitFor(() => {
        const continueButton = screen.getByText(/lanjutkan tanpa epic/i);
        expect(continueButton).toBeInTheDocument();
      });
    });

    it('should handle "Continue without Epic" action', async () => {
      jiraService.getProjectEpics.mockResolvedValue({
        success: true,
        data: []
      });

      jiraService.setEpicContext.mockResolvedValue({
        success: true,
        data: { workWithoutEpic: true }
      });

      render(
        <EpicSelectionModal
          isOpen={true}
          onClose={mockOnClose}
          onEpicSelected={mockOnEpicSelected}
        />
      );

      await waitFor(() => {
        expect(screen.queryByText(/Loading/i)).not.toBeInTheDocument();
      });

      // Click "Continue without Epic" (Indonesian: "Lanjutkan Tanpa Epic")
      const continueButton = await screen.findByText(/lanjutkan tanpa epic/i);
      fireEvent.click(continueButton);

      // Wait for the action to complete
      await waitFor(() => {
        expect(jiraService.setEpicContext).toHaveBeenCalledWith(
          null,
          expect.objectContaining({
            workWithoutEpic: true,
            connection: mockConnection
          })
        );
      });

      // Modal should close
      await waitFor(() => {
        expect(mockOnClose).toHaveBeenCalled();
      });
    });

    it('should display empty state for search with no results', async () => {
      const mockEpics = [
        {
          id: 'epic-1',
          key: 'TEST-1',
          name: 'Feature A',
          summary: 'Feature A summary',
          status: 'In Progress',
          assignee: 'User 1',
          created: '2024-01-01',
          updated: '2024-01-15',
          issueType: 'Epic'
        }
      ];

      jiraService.getProjectEpics.mockResolvedValue({
        success: true,
        data: mockEpics
      });

      render(
        <EpicSelectionModal
          isOpen={true}
          onClose={mockOnClose}
          onEpicSelected={mockOnEpicSelected}
        />
      );

      await waitFor(() => {
        expect(screen.queryByText(/Loading/i)).not.toBeInTheDocument();
      });

      // Search for non-existent epic
      // The placeholder is in Indonesian: "Cari Epic berdasarkan nama, key, atau deskripsi..."
      const searchInput = screen.getByPlaceholderText(/cari epic/i);
      fireEvent.change(searchInput, { target: { value: 'NonExistent' } });

      // Should show "No matching epics" message (Indonesian: "Tidak Ada Epic yang Cocok")
      await waitFor(() => {
        const noMatchMessage = screen.getByText(/tidak ada epic yang cocok/i);
        expect(noMatchMessage).toBeInTheDocument();
      });

      // Should show "Clear search" button (Indonesian: "Hapus Pencarian")
      const clearButton = screen.getByText(/hapus pencarian/i);
      expect(clearButton).toBeInTheDocument();
    });
  });

  describe('Requirement 6.5: Error handling with retry option', () => {
    it('should display error message when epic loading fails', async () => {
      jiraService.getProjectEpics.mockResolvedValue({
        success: false,
        error: 'Failed to connect to JIRA'
      });

      render(
        <EpicSelectionModal
          isOpen={true}
          onClose={mockOnClose}
          onEpicSelected={mockOnEpicSelected}
        />
      );

      await waitFor(() => {
        expect(screen.queryByText(/Loading/i)).not.toBeInTheDocument();
      });

      // Should show error message
      await waitFor(() => {
        const errorMessage = screen.getByText(/failed to connect to jira/i);
        expect(errorMessage).toBeInTheDocument();
      });
    });

    it('should display specific error for authentication failure', async () => {
      jiraService.getProjectEpics.mockResolvedValue({
        success: false,
        error: 'JIRA authentication failed. Please check your JIRA credentials and try reconnecting.'
      });

      render(
        <EpicSelectionModal
          isOpen={true}
          onClose={mockOnClose}
          onEpicSelected={mockOnEpicSelected}
        />
      );

      await waitFor(() => {
        expect(screen.queryByText(/Loading/i)).not.toBeInTheDocument();
      });

      // Should show authentication error
      await waitFor(() => {
        const authError = screen.getByText(/authentication failed/i);
        expect(authError).toBeInTheDocument();
      });
    });

    it('should display specific error for permission issues', async () => {
      jiraService.getProjectEpics.mockResolvedValue({
        success: false,
        error: 'Access denied to JIRA project. Please check your JIRA permissions for project TEST.'
      });

      render(
        <EpicSelectionModal
          isOpen={true}
          onClose={mockOnClose}
          onEpicSelected=  {mockOnEpicSelected}
        />
      );

      await waitFor(() => {
        expect(screen.queryByText(/Loading/i)).not.toBeInTheDocument();
      });

      // Should show permission error
      await waitFor(() => {
        const permissionError = screen.getByText(/access denied/i);
        expect(permissionError).toBeInTheDocument();
      });
    });

    it('should display specific error for deprecated API endpoint', async () => {
      jiraService.getProjectEpics.mockResolvedValue({
        success: false,
        error: 'JIRA API endpoint is deprecated. Your JIRA instance may need to be updated.'
      });

      render(
        <EpicSelectionModal
          isOpen={true}
          onClose={mockOnClose}
          onEpicSelected={mockOnEpicSelected}
        />
      );

      await waitFor(() => {
        expect(screen.queryByText(/Loading/i)).not.toBeInTheDocument();
      });

      // Should show deprecated API error
      await waitFor(() => {
        const deprecatedError = screen.getByText(/api endpoint is deprecated/i);
        expect(deprecatedError).toBeInTheDocument();
      });
    });

    it('should provide retry option when loading fails', async () => {
      let callCount = 0;
      jiraService.getProjectEpics.mockImplementation(async () => {
        callCount++;
        if (callCount === 1) {
          return {
            success: false,
            error: 'Network error'
          };
        }
        return {
          success: true,
          data: []
        };
      });

      const { rerender } = render(
        <EpicSelectionModal
          isOpen={true}
          onClose={mockOnClose}
          onEpicSelected={mockOnEpicSelected}
        />
      );

      // Wait for initial error
      await waitFor(() => {
        expect(screen.getByText(/network error/i)).toBeInTheDocument();
      });

      // Close and reopen modal to trigger retry
      rerender(
        <EpicSelectionModal
          isOpen={false}
          onClose={mockOnClose}
          onEpicSelected={mockOnEpicSelected}
        />
      );

      rerender(
        <EpicSelectionModal
          isOpen={true}
          onClose={mockOnClose}
          onEpicSelected={mockOnEpicSelected}
        />
      );

      // Should retry loading
      await waitFor(() => {
        expect(jiraService.getProjectEpics).toHaveBeenCalledTimes(2);
      });
    });

    it('should handle network errors gracefully', async () => {
      jiraService.getProjectEpics.mockRejectedValue(
        new Error('Network error: Cannot connect to JIRA')
      );

      render(
        <EpicSelectionModal
          isOpen={true}
          onClose={mockOnClose}
          onEpicSelected={mockOnEpicSelected}
        />
      );

      await waitFor(() => {
        expect(screen.queryByText(/Loading/i)).not.toBeInTheDocument();
      });

      // Should show network error message
      await waitFor(() => {
        const networkError = screen.getByText(/network error/i);
        expect(networkError).toBeInTheDocument();
      });
    });

    it('should display error icon with error messages', async () => {
      jiraService.getProjectEpics.mockResolvedValue({
        success: false,
        error: 'Connection failed'
      });

      const { container } = render(
        <EpicSelectionModal
          isOpen={true}
          onClose={mockOnClose}
          onEpicSelected={mockOnEpicSelected}
        />
      );

      await waitFor(() => {
        expect(screen.queryByText(/Loading/i)).not.toBeInTheDocument();
      });

      // Should show error with icon (SVG)
      await waitFor(() => {
        const errorSection = container.querySelector('.text-red-400');
        expect(errorSection).toBeInTheDocument();
      });
    });

    it('should clear error when successfully loading epics after retry', async () => {
      let callCount = 0;
      jiraService.getProjectEpics.mockImplementation(async () => {
        callCount++;
        if (callCount === 1) {
          return {
            success: false,
            error: 'Temporary error'
          };
        }
        return {
          success: true,
          data: [
            {
              id: 'epic-1',
              key: 'TEST-1',
              name: 'Test Epic',
              summary: 'Test summary',
              status: 'To Do',
              assignee: 'User',
              created: '2024-01-01',
              updated: '2024-01-15',
              issueType: 'Epic'
            }
          ]
        };
      });

      const { rerender } = render(
        <EpicSelectionModal
          isOpen={true}
          onClose={mockOnClose}
          onEpicSelected={mockOnEpicSelected}
        />
      );

      // Wait for error
      await waitFor(() => {
        expect(screen.getByText(/temporary error/i)).toBeInTheDocument();
      });

      // Retry by closing and reopening modal
      rerender(
        <EpicSelectionModal
          isOpen={false}
          onClose={mockOnClose}
          onEpicSelected={mockOnEpicSelected}
        />
      );

      rerender(
        <EpicSelectionModal
          isOpen={true}
          onClose={mockOnClose}
          onEpicSelected={mockOnEpicSelected}
        />
      );

      // Error should be cleared and epics should be shown
      await waitFor(() => {
        expect(screen.queryByText(/temporary error/i)).not.toBeInTheDocument();
        expect(screen.getByText(/Test Epic/i)).toBeInTheDocument();
      });
    });
  });

  describe('Edge cases', () => {
    it('should handle no active project scenario', async () => {
      projectStateManager.getActiveProject.mockResolvedValue({
        success: false,
        error: 'No active project'
      });

      jiraService.getConnections.mockResolvedValue({
        success: true,
        data: []
      });

      render(
        <EpicSelectionModal
          isOpen={true}
          onClose={mockOnClose}
          onEpicSelected={mockOnEpicSelected}
        />
      );

      await waitFor(() => {
        expect(screen.queryByText(/Loading/i)).not.toBeInTheDocument();
      });

      // Should show "No active project" message (Indonesian: "Tidak Ada Proyek Aktif")
      await waitFor(() => {
        const noProjectMessage = screen.getByText(/tidak ada proyek aktif/i);
        expect(noProjectMessage).toBeInTheDocument();
      });
    });

    it('should handle modal close during loading', async () => {
      jiraService.getProjectEpics.mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve({ success: true, data: [] }), 1000))
      );

      const { rerender } = render(
        <EpicSelectionModal
          isOpen={true}
          onClose={mockOnClose}
          onEpicSelected={mockOnEpicSelected}
        />
      );

      // Close modal while loading
      rerender(
        <EpicSelectionModal
          isOpen={false}
          onClose={mockOnClose}
          onEpicSelected={mockOnEpicSelected}
        />
      );

      // Modal should not be in document
      expect(screen.queryByText(/Select Epic/i)).not.toBeInTheDocument();
    });

    it('should reset state when modal is reopened', async () => {
      jiraService.getProjectEpics.mockResolvedValue({
        success: true,
        data: []
      });

      const { rerender } = render(
        <EpicSelectionModal
          isOpen={true}
          onClose={mockOnClose}
          onEpicSelected={mockOnEpicSelected}
        />
      );

      await waitFor(() => {
        expect(screen.queryByText(/Loading/i)).not.toBeInTheDocument();
      });

      // Close modal
      rerender(
        <EpicSelectionModal
          isOpen={false}
          onClose={mockOnClose}
          onEpicSelected={mockOnEpicSelected}
        />
      );

      // Reopen modal
      rerender(
        <EpicSelectionModal
          isOpen={true}
          onClose={mockOnClose}
          onEpicSelected={mockOnEpicSelected}
        />
      );

      // Should reload epics
      await waitFor(() => {
        expect(jiraService.getProjectEpics).toHaveBeenCalledTimes(2);
      });
    });
  });
});
