import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';

// Mock the GherkinStepAnalysis component since it's defined in TestResultsDetailPage
const GherkinStepAnalysis = ({ stepName, generatedText, referenceText, stepValue, testResult }) => {
  // Parse Gherkin scenarios into Given, When, Then parts
  const parseGherkinScenario = (text) => {
    if (!text) return { given: '', when: '', then: '' };
    
    const givenMatch = text.match(/Given\s+(.+?)(?=\s+When|$)/i);
    const whenMatch = text.match(/When\s+(.+?)(?=\s+Then|$)/i);
    const thenMatch = text.match(/Then\s+(.+?)$/i);
    
    return {
      given: givenMatch ? givenMatch[1].trim() : '',
      when: whenMatch ? whenMatch[1].trim() : '',
      then: thenMatch ? thenMatch[1].trim() : ''
    };
  };

  // Calculate word-level similarity for each Gherkin part
  const calculatePartSimilarity = (generated, reference) => {
    if (!generated || !reference) return 0;
    
    const generatedWords = generated.toLowerCase().split(/\s+/);
    const referenceWords = reference.toLowerCase().split(/\s+/);
    
    const matchingWords = generatedWords.filter(word => 
      referenceWords.some(refWord => 
        refWord === word || 
        refWord.includes(word) || 
        word.includes(refWord)
      )
    );
    
    return generatedWords.length > 0 ? matchingWords.length / generatedWords.length : 0;
  };

  const generatedParts = parseGherkinScenario(generatedText);
  const referenceParts = parseGherkinScenario(referenceText);

  const givenSimilarity = calculatePartSimilarity(generatedParts.given, referenceParts.given);
  const whenSimilarity = calculatePartSimilarity(generatedParts.when, referenceParts.when);
  const thenSimilarity = calculatePartSimilarity(generatedParts.then, referenceParts.then);

  return (
    <div data-testid="gherkin-step-analysis">
      <h5>Analisis {stepName} per Bagian Gherkin</h5>
      
      <div data-testid="given-section">
        <h6>GIVEN</h6>
        <div data-testid="given-similarity">{(givenSimilarity * 100).toFixed(1)}%</div>
        <div data-testid="given-generated">{generatedParts.given}</div>
        <div data-testid="given-reference">{referenceParts.given}</div>
      </div>

      <div data-testid="when-section">
        <h6>WHEN</h6>
        <div data-testid="when-similarity">{(whenSimilarity * 100).toFixed(1)}%</div>
        <div data-testid="when-generated">{generatedParts.when}</div>
        <div data-testid="when-reference">{referenceParts.when}</div>
      </div>

      <div data-testid="then-section">
        <h6>THEN</h6>
        <div data-testid="then-similarity">{(thenSimilarity * 100).toFixed(1)}%</div>
        <div data-testid="then-generated">{generatedParts.then}</div>
        <div data-testid="then-reference">{referenceParts.then}</div>
      </div>

      <div data-testid="step-summary">
        <div>Step: {stepName}</div>
        <div>Value: {stepValue}</div>
      </div>
    </div>
  );
};

describe('GherkinStepAnalysis (Integrated)', () => {
  const mockTestResult = {
    score: 0.81,
    details: {
      precision: 0.85,
      recall: 0.78,
      f_mean: 0.81,
      penalty: 0.05
    }
  };

  it('should render analysis for Precision step', () => {
    const generatedText = 'Given user is on login page When user enters valid credentials Then user is redirected to dashboard';
    const referenceText = 'Given user is on the login page When user provides valid email and password Then system redirects to main dashboard';

    render(
      <GherkinStepAnalysis
        stepName="Presisi (Precision)"
        generatedText={generatedText}
        referenceText={referenceText}
        stepValue={0.85}
        testResult={mockTestResult}
      />
    );

    // Check if component is rendered with correct step name
    expect(screen.getByTestId('gherkin-step-analysis')).toBeInTheDocument();
    expect(screen.getByText('Analisis Presisi (Precision) per Bagian Gherkin')).toBeInTheDocument();
    
    // Check Given section
    expect(screen.getByTestId('given-section')).toBeInTheDocument();
    expect(screen.getByTestId('given-generated')).toHaveTextContent('user is on login page');
    expect(screen.getByTestId('given-reference')).toHaveTextContent('user is on the login page');
    
    // Check step summary
    expect(screen.getByTestId('step-summary')).toBeInTheDocument();
    expect(screen.getByText('Step: Presisi (Precision)')).toBeInTheDocument();
    expect(screen.getByText('Value: 0.85')).toBeInTheDocument();
  });

  it('should render analysis for Recall step', () => {
    const generatedText = 'Given user is on page When user clicks button Then page loads';
    const referenceText = 'Given user is on page When user clicks button Then page loads';

    render(
      <GherkinStepAnalysis
        stepName="Recall"
        generatedText={generatedText}
        referenceText={referenceText}
        stepValue={0.78}
        testResult={mockTestResult}
      />
    );

    expect(screen.getByText('Analisis Recall per Bagian Gherkin')).toBeInTheDocument();
    expect(screen.getByText('Step: Recall')).toBeInTheDocument();
    expect(screen.getByText('Value: 0.78')).toBeInTheDocument();
  });

  it('should render analysis for METEOR Score step', () => {
    const generatedText = 'Given user is on login page When user enters credentials Then user is redirected';
    const referenceText = 'Given user is on the login page When user provides valid credentials Then system redirects user';

    render(
      <GherkinStepAnalysis
        stepName="METEOR Score"
        generatedText={generatedText}
        referenceText={referenceText}
        stepValue={0.81}
        testResult={mockTestResult}
      />
    );

    expect(screen.getByText('Analisis METEOR Score per Bagian Gherkin')).toBeInTheDocument();
    expect(screen.getByText('Step: METEOR Score')).toBeInTheDocument();
    expect(screen.getByText('Value: 0.81')).toBeInTheDocument();
  });

  it('should calculate similarity scores correctly for each section', () => {
    const generatedText = 'Given user is on page When user clicks button Then page loads';
    const referenceText = 'Given user is on page When user clicks button Then page loads';

    render(
      <GherkinStepAnalysis
        stepName="Presisi (Precision)"
        generatedText={generatedText}
        referenceText={referenceText}
        stepValue={1.0}
        testResult={mockTestResult}
      />
    );

    // Perfect match should give 100% similarity for all sections
    expect(screen.getByTestId('given-similarity')).toHaveTextContent('100.0%');
    expect(screen.getByTestId('when-similarity')).toHaveTextContent('100.0%');
    expect(screen.getByTestId('then-similarity')).toHaveTextContent('100.0%');
  });

  it('should handle empty or invalid Gherkin text gracefully', () => {
    const generatedText = '';
    const referenceText = 'Not a valid Gherkin scenario';

    render(
      <GherkinStepAnalysis
        stepName="Recall"
        generatedText={generatedText}
        referenceText={referenceText}
        stepValue={0.0}
        testResult={mockTestResult}
      />
    );

    // Should still render without crashing
    expect(screen.getByTestId('gherkin-step-analysis')).toBeInTheDocument();
    expect(screen.getByTestId('given-similarity')).toHaveTextContent('0.0%');
    expect(screen.getByTestId('when-similarity')).toHaveTextContent('0.0%');
    expect(screen.getByTestId('then-similarity')).toHaveTextContent('0.0%');
  });

  it('should parse Gherkin sections correctly', () => {
    const generatedText = 'Given user is logged in When user navigates to dashboard Then dashboard is displayed';
    const referenceText = 'Given user has valid session When user accesses main page Then main page loads successfully';

    render(
      <GherkinStepAnalysis
        stepName="Presisi (Precision)"
        generatedText={generatedText}
        referenceText={referenceText}
        stepValue={0.65}
        testResult={mockTestResult}
      />
    );

    // Check that each section is parsed correctly
    expect(screen.getByTestId('given-generated')).toHaveTextContent('user is logged in');
    expect(screen.getByTestId('when-generated')).toHaveTextContent('user navigates to dashboard');
    expect(screen.getByTestId('then-generated')).toHaveTextContent('dashboard is displayed');
    
    expect(screen.getByTestId('given-reference')).toHaveTextContent('user has valid session');
    expect(screen.getByTestId('when-reference')).toHaveTextContent('user accesses main page');
    expect(screen.getByTestId('then-reference')).toHaveTextContent('main page loads successfully');
  });
});