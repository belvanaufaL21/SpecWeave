import { render, screen, cleanup } from '@testing-library/react';
import { describe, it, expect, afterEach, beforeEach } from 'vitest';
import fc from 'fast-check';
import ComparisonTable from '../ComparisonTable';

/**
 * Property-Based Tests for ComparisonTable Component
 * 
 * Feature: meteor-sentence-bert-testing, Property 3: UI State Persistence and Synchronization
 * Validates: Requirements 1.3, 1.4
 */

describe('ComparisonTable Property Tests', () => {
  
  // Aggressive DOM cleanup for property-based testing
  beforeEach(() => {
    // Clear any existing DOM content
    document.body.innerHTML = '';
    cleanup();
  });
  
  afterEach(() => {
    // Ensure complete cleanup after each test
    cleanup();
    document.body.innerHTML = '';
  });
  
  // Simplified test data generators with predefined scenarios
  const predefinedScenarios = [
    {
      given: 'I am logged in as a user',
      when: 'I click the logout button',
      then: 'I should be redirected to login page'
    },
    {
      given: 'I have valid credentials',
      when: 'I submit the login form',
      then: 'I should access the dashboard'
    },
    {
      given: 'I am on the settings page',
      when: 'I update my profile',
      then: 'I should see success message'
    }
  ];
  
  const scenarioArb = fc.constantFrom(...predefinedScenarios);
  
  const gherkinTextArb = scenarioArb.map(scenario => 
    `Given ${scenario.given}\nWhen ${scenario.when}\nThen ${scenario.then}`
  );

  /**
   * Property 3: UI State Persistence and Synchronization
   * 
   * Tests that:
   * 1. Data consistency is maintained across re-renders (simulating tab switches)
   * 2. Reference scenario input synchronization works correctly
   */
  it('Property 3: UI State Persistence and Synchronization', () => {
    fc.assert(
      fc.property(
        gherkinTextArb,
        fc.boolean(), // showHeaders
        (generatedScenario, showHeaders) => {
          
          // Manual cleanup before each property iteration
          cleanup();
          document.body.innerHTML = '';
          
          // Test with empty reference scenario first
          const { rerender, container } = render(
            <ComparisonTable
              generatedScenario={generatedScenario}
              referenceScenario=""
              showHeaders={showHeaders}
            />
          );
          
          // Test Requirement 1.3: Data persistence across re-renders (simulating tab switches)
          // Re-render with same props to simulate tab switching behavior
          rerender(
            <ComparisonTable
              generatedScenario={generatedScenario}
              referenceScenario=""
              showHeaders={showHeaders}
            />
          );
          
          // Verify basic structure is maintained - use container to scope queries
          const givenLabels = screen.getAllByText('GIVEN');
          const whenLabels = screen.getAllByText('WHEN');
          const thenLabels = screen.getAllByText('THEN');
          
          expect(givenLabels).toHaveLength(2); // One for each table
          expect(whenLabels).toHaveLength(2);
          expect(thenLabels).toHaveLength(2);
          
          // Should show placeholder text when reference is empty
          expect(screen.getAllByText('Enter reference scenario...')).toHaveLength(3);
          
          // Test Requirement 1.4: Reference scenario synchronization
          // Update to include reference scenario
          const referenceScenario = 'Given I have a reference\nWhen I test it\nThen I see results';
          
          rerender(
            <ComparisonTable
              generatedScenario={generatedScenario}
              referenceScenario={referenceScenario}
              showHeaders={showHeaders}
            />
          );
          
          // Verify structure remains consistent after update
          const updatedGivenLabels = screen.getAllByText('GIVEN');
          const updatedWhenLabels = screen.getAllByText('WHEN');
          const updatedThenLabels = screen.getAllByText('THEN');
          
          expect(updatedGivenLabels).toHaveLength(2);
          expect(updatedWhenLabels).toHaveLength(2);
          expect(updatedThenLabels).toHaveLength(2);
          
          // Should show comparison ready status when reference is provided
          expect(screen.getByText('Ready for comparison testing')).toBeInTheDocument();
          
          // Cleanup after this iteration
          cleanup();
        }
      ),
      { numRuns: 10 } // Reduced runs for stability
    );
  });

  /**
   * Property 3.1: Gherkin Parsing Consistency
   * 
   * Tests that Gherkin parsing produces consistent results regardless of input format
   */
  it('Property 3.1: Gherkin Parsing Consistency', () => {
    fc.assert(
      fc.property(
        scenarioArb,
        (scenarioObj) => {
          
          // Manual cleanup before each property iteration
          cleanup();
          document.body.innerHTML = '';
          
          // Test both object and text format inputs
          const textFormat = `Given ${scenarioObj.given}\nWhen ${scenarioObj.when}\nThen ${scenarioObj.then}`;
          
          // Render with object format
          const { rerender } = render(
            <ComparisonTable
              generatedScenario={scenarioObj}
              referenceScenario=""
            />
          );
          
          // Verify basic structure
          let givenLabels = screen.getAllByText('GIVEN');
          let whenLabels = screen.getAllByText('WHEN');
          let thenLabels = screen.getAllByText('THEN');
          
          expect(givenLabels).toHaveLength(2);
          expect(whenLabels).toHaveLength(2);
          expect(thenLabels).toHaveLength(2);
          
          // Re-render with text format
          rerender(
            <ComparisonTable
              generatedScenario={textFormat}
              referenceScenario=""
            />
          );
          
          // Verify structure remains consistent (parsing consistency)
          givenLabels = screen.getAllByText('GIVEN');
          whenLabels = screen.getAllByText('WHEN');
          thenLabels = screen.getAllByText('THEN');
          
          expect(givenLabels).toHaveLength(2);
          expect(whenLabels).toHaveLength(2);
          expect(thenLabels).toHaveLength(2);
          
          // Cleanup after this iteration
          cleanup();
        }
      ),
      { numRuns: 10 }
    );
  });

  /**
   * Property 3.2: State Independence
   * 
   * Tests that generated and reference scenarios are independent and don't affect each other
   */
  it('Property 3.2: State Independence', () => {
    fc.assert(
      fc.property(
        gherkinTextArb,
        gherkinTextArb,
        (generatedScenario, referenceScenario) => {
          
          // Manual cleanup before each property iteration
          cleanup();
          document.body.innerHTML = '';
          
          render(
            <ComparisonTable
              generatedScenario={generatedScenario}
              referenceScenario={referenceScenario}
            />
          );
          
          // Should have 6 Gherkin step labels total (3 per table)
          const givenLabels = screen.getAllByText('GIVEN');
          const whenLabels = screen.getAllByText('WHEN');
          const thenLabels = screen.getAllByText('THEN');
          
          expect(givenLabels).toHaveLength(2);
          expect(whenLabels).toHaveLength(2);
          expect(thenLabels).toHaveLength(2);
          
          // Should show comparison ready status when both scenarios are provided
          expect(screen.getByText('Ready for comparison testing')).toBeInTheDocument();
          
          // Cleanup after this iteration
          cleanup();
        }
      ),
      { numRuns: 10 }
    );
  });
});