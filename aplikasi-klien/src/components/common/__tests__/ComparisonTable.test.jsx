import { render, screen } from '@testing-library/react';
import ComparisonTable from '../ComparisonTable';

describe('ComparisonTable', () => {
  const mockGeneratedScenario = `
    Given I am a logged in user
    When I click the logout button
    Then I should be logged out
  `;

  const mockReferenceScenario = `
    Given I am authenticated as a user
    When I select the logout option
    Then I should be redirected to login page
  `;

  it('renders both generated and reference scenarios', () => {
    render(
      <ComparisonTable
        generatedScenario={mockGeneratedScenario}
        referenceScenario={mockReferenceScenario}
      />
    );

    // Check headers
    expect(screen.getByText('Skenario yang Dihasilkan')).toBeInTheDocument();
    expect(screen.getByText('Skenario Referensi')).toBeInTheDocument();

    // Check Gherkin steps
    expect(screen.getAllByText('GIVEN')).toHaveLength(2);
    expect(screen.getAllByText('WHEN')).toHaveLength(2);
    expect(screen.getAllByText('THEN')).toHaveLength(2);

    // Check generated scenario content
    expect(screen.getByText('I am a logged in user')).toBeInTheDocument();
    expect(screen.getByText('I click the logout button')).toBeInTheDocument();
    expect(screen.getByText('I should be logged out')).toBeInTheDocument();

    // Check reference scenario content
    expect(screen.getByText('I am authenticated as a user')).toBeInTheDocument();
    expect(screen.getByText('I select the logout option')).toBeInTheDocument();
    expect(screen.getByText('I should be redirected to login page')).toBeInTheDocument();
  });

  it('handles text format scenarios correctly', () => {
    const textScenario = `
      Given I have a user account
      When I enter valid credentials
      Then I should be authenticated
    `;

    render(
      <ComparisonTable
        generatedScenario={textScenario}
        referenceScenario=""
      />
    );

    expect(screen.getByText('I have a user account')).toBeInTheDocument();
    expect(screen.getByText('I enter valid credentials')).toBeInTheDocument();
    expect(screen.getByText('I should be authenticated')).toBeInTheDocument();
  });

  it('shows placeholder text when reference scenario is empty', () => {
    render(
      <ComparisonTable
        generatedScenario={mockGeneratedScenario}
        referenceScenario=""
      />
    );

    expect(screen.getAllByText('Enter reference scenario...')).toHaveLength(3);
  });

  it('shows ready for comparison status when reference scenario is provided', () => {
    render(
      <ComparisonTable
        generatedScenario={mockGeneratedScenario}
        referenceScenario={mockReferenceScenario}
      />
    );

    expect(screen.getByText('Ready for comparison testing')).toBeInTheDocument();
  });

  it('handles missing steps gracefully', () => {
    const incompleteScenario = `
      Given I am a user
    `;

    render(
      <ComparisonTable
        generatedScenario={incompleteScenario}
        referenceScenario=""
      />
    );

    expect(screen.getByText('I am a user')).toBeInTheDocument();
    expect(screen.getAllByText(/No .* step defined/)).toHaveLength(2);
  });
});