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

describe('JiraExportCTA - Export Validation (Task 10.1)', () => {
  const mockScenarioData = {
    feature: 'Test Feature',
    userStory: 'As a user, I want to test',
    scenarios: [
      {
        title: 'Test Scenario 1',
        given: ['user is logged in'],
        when: ['user clicks button'],
        then: ['action is performed']
      }
    ]
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Requirement 9.1: Export Validation', () => {
    it('should validate JIRA connection is present before export', async () => {
      // Setup: No JIRA connection
      useJira.mockReturnValue({
        epicContext: null,
        hasEpic: false,
        openEpicModal: vi.fn(),
        connections: []
      });

      render(<JiraExportCTA scenarioData={mockScenarioData} />);

      const exportButton = screen.getByRole('button', { name: /export/i });
      
      // Verify button is disabled when no connection
      expect(exportButton).toBeDisabled();
    });

    it('should validate Epic is selected before export', async () => {
      const mockOpenEpicModal = vi.fn();
      
      // Setup: Connection exists but no Epic selected
      useJira.mockReturnValue({
        epicContext: null,
        hasEpic: false,
        openEpicModal: mockOpenEpicModal,
        connections: [{ id: 'conn-1', project_key: 'TEST' }]
      });

      render(<JiraExportCTA scenarioData={mockScenarioData} />);

      const exportButton = screen.getByRole('button', { name: /export/i });
      
      // Verify button is disabled when no Epic
      expect(exportButton).toBeDisabled();
      
      // Verify "Select Epic first" message is shown
      expect(screen.getByText(/select epic first/i)).toBeInTheDocument();
    });

    it('should validate Epic context has valid data', async () => {
      const mockOpenEpicModal = vi.fn();
      
      // Setup: Epic selected but invalid context
      useJira.mockReturnValue({
        epicContext: {
          // Missing epicData
        },
        hasEpic: true,
        openEpicModal: mockOpenEpicModal,
        connections: [{ id: 'conn-1', project_key: 'TEST' }]
      });

      render(<JiraExportCTA scenarioData={mockScenarioData} />);

      const exportButton = screen.getByRole('button', { name: /export/i });
      fireEvent.click(exportButton);

      await waitFor(() => {
        // Verify error message for invalid context
        expect(screen.getByText(/invalid epic context/i)).toBeInTheDocument();
        // Verify Epic modal is opened to re-select
        expect(mockOpenEpicModal).toHaveBeenCalled();
      });
    });

    it('should validate Epic has required ID field', async () => {
      // Setup: Epic context without Epic ID
      useJira.mockReturnValue({
        epicContext: {
          epicData: {
            epic: {}, // Missing id
            connection: { id: 'conn-1' }
          }
        },
        hasEpic: true,
        openEpicModal: vi.fn(),
        connections: [{ id: 'conn-1', project_key: 'TEST' }]
      });

      jiraService.createCompleteStory = vi.fn().mockRejectedValue(
        new Error('Invalid Epic data: Epic ID is missing')
      );

      render(<JiraExportCTA scenarioData={mockScenarioData} />);

      const exportButton = screen.getByRole('button', { name: /export/i });
      fireEvent.click(exportButton);

      await waitFor(() => {
        // Verify error message for missing Epic ID
        expect(screen.getByText(/invalid epic data/i)).toBeInTheDocument();
      });
    });

    it('should validate connection has required ID field', async () => {
      // Setup: Epic context without connection ID
      useJira.mockReturnValue({
        epicContext: {
          epicData: {
            epic: { id: 'epic-1', key: 'TEST-1' },
            connection: {} // Missing id
          }
        },
        hasEpic: true,
        openEpicModal: vi.fn(),
        connections: [{ id: 'conn-1', project_key: 'TEST' }]
      });

      jiraService.createCompleteStory = vi.fn().mockRejectedValue(
        new Error('Invalid connection data: Connection ID is missing')
      );

      render(<JiraExportCTA scenarioData={mockScenarioData} />);

      const exportButton = screen.getByRole('button', { name: /export/i });
      fireEvent.click(exportButton);

      await waitFor(() => {
        // Verify error message for missing connection ID
        expect(screen.getByText(/invalid connection data/i)).toBeInTheDocument();
      });
    });

    it('should show validation error messages to user', async () => {
      const mockOpenEpicModal = vi.fn();
      
      useJira.mockReturnValue({
        epicContext: null,
        hasEpic: false,
        openEpicModal: mockOpenEpicModal,
        connections: []
      });

      render(<JiraExportCTA scenarioData={mockScenarioData} />);

      const exportButton = screen.getByRole('button', { name: /export/i });
      
      // Verify button is disabled
      expect(exportButton).toBeDisabled();
      
      // Verify validation message is displayed
      const validationMessage = screen.getByText(/select epic first/i);
      expect(validationMessage).toBeInTheDocument();
      expect(validationMessage).toHaveClass('text-gray-500');
    });

    it('should enable export button only when validation passes', () => {
      // Test 1: No Epic - button disabled
      const { rerender } = render(
        <JiraExportCTA scenarioData={mockScenarioData} />
      );
      
      useJira.mockReturnValue({
        epicContext: null,
        hasEpic: false,
        openEpicModal: vi.fn(),
        connections: []
      });
      
      rerender(<JiraExportCTA scenarioData={mockScenarioData} />);
      expect(screen.getByRole('button', { name: /export/i })).toBeDisabled();

      // Test 2: Valid Epic - button enabled
      useJira.mockReturnValue({
        epicContext: {
          epicData: {
            epic: { id: 'epic-1', key: 'TEST-1', name: 'Test Epic' },
            connection: { id: 'conn-1', project_key: 'TEST' }
          }
        },
        hasEpic: true,
        openEpicModal: vi.fn(),
        connections: [{ id: 'conn-1', project_key: 'TEST' }]
      });
      
      rerender(<JiraExportCTA scenarioData={mockScenarioData} />);
      expect(screen.getByRole('button', { name: /export/i })).not.toBeDisabled();
    });

    it('should not render component if no scenario data', () => {
      useJira.mockReturnValue({
        epicContext: null,
        hasEpic: false,
        openEpicModal: vi.fn(),
        connections: []
      });

      const { container } = render(<JiraExportCTA scenarioData={null} />);
      expect(container.firstChild).toBeNull();
    });

    it('should not render component if scenarios array is empty', () => {
      useJira.mockReturnValue({
        epicContext: null,
        hasEpic: false,
        openEpicModal: vi.fn(),
        connections: []
      });

      const { container } = render(
        <JiraExportCTA scenarioData={{ feature: 'Test', scenarios: null }} />
      );
      expect(container.firstChild).toBeNull();
    });
  });
});
