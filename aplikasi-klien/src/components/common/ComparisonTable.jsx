import { useMemo, memo, useCallback, useState, useRef, useEffect } from 'react';
import { useComponentPerformance } from '../../utils/performance/componentProfiler';

// Memoized utility function to parse Gherkin scenario text
const parseGherkinScenario = (scenarioText) => {
  if (!scenarioText || typeof scenarioText !== 'string') {
    return { given: '', when: '', then: '' };
  }

  // Handle both object format and text format
  if (typeof scenarioText === 'object') {
    return {
      given: scenarioText.given || '',
      when: scenarioText.when || '',
      then: scenarioText.then || ''
    };
  }

  // Parse text format - handle various Gherkin formats
  const lines = scenarioText.trim().split('\n').map(line => line.trim());
  const result = { given: '', when: '', then: '' };
  
  let currentStep = null;
  let currentContent = [];

  for (const line of lines) {
    const lowerLine = line.toLowerCase();
    
    // Check for Gherkin keywords
    if (lowerLine.startsWith('given') || lowerLine.startsWith('diberikan')) {
      if (currentStep && currentContent.length > 0) {
        result[currentStep] = currentContent.join(' ').trim();
      }
      currentStep = 'given';
      currentContent = [line.replace(/^(given|diberikan)\s*/i, '')];
    } else if (lowerLine.startsWith('when') || lowerLine.startsWith('ketika')) {
      if (currentStep && currentContent.length > 0) {
        result[currentStep] = currentContent.join(' ').trim();
      }
      currentStep = 'when';
      currentContent = [line.replace(/^(when|ketika)\s*/i, '')];
    } else if (lowerLine.startsWith('then') || lowerLine.startsWith('maka')) {
      if (currentStep && currentContent.length > 0) {
        result[currentStep] = currentContent.join(' ').trim();
      }
      currentStep = 'then';
      currentContent = [line.replace(/^(then|maka)\s*/i, '')];
    } else if (lowerLine.startsWith('and') || lowerLine.startsWith('dan')) {
      if (currentStep) {
        currentContent.push(line.replace(/^(and|dan)\s*/i, ''));
      }
    } else if (line && currentStep) {
      currentContent.push(line);
    }
  }

  if (currentStep && currentContent.length > 0) {
    result[currentStep] = currentContent.join(' ').trim();
  }

  return result;
};

// TableRow dideklarasikan di luar agar tidak re-mount saat state parent berubah
const TableRow = memo(({ 
  step, 
  isLast, 
  isGenerated, 
  content, 
  value, 
  onChange, 
  isEditable, 
  hasReference 
}) => (
  <tr 
    className={`${!isLast ? 'border-b border-white/10' : ''} group/row hover:bg-white/5 transition-colors`}
  >
    <td className={`px-3 sm:px-4 py-3 sm:py-4 bg-${step.color}-500/10 border-r border-white/10 w-16 sm:w-20`}>
      <div className="flex items-center gap-1.5 sm:gap-2">
        <div className={`w-1.5 sm:w-2 h-1.5 sm:h-2 rounded-full bg-${step.color}-400`}></div>
        <span className={`text-${step.color}-400 font-mono text-xs font-bold`}>
          {step.label}
        </span>
      </div>
    </td>
    <td className="px-3 sm:px-4 py-3 sm:py-4 text-gray-200 text-xs sm:text-sm leading-relaxed">
      <div className="break-words">
        {isGenerated ? (
          content || <span className="text-gray-500 italic">No {step.key} step defined</span>
        ) : (
          isEditable ? (
            <textarea
              className="w-full bg-transparent border-none outline-none resize-none text-gray-200 placeholder-gray-500 text-xs sm:text-sm min-h-[2.5rem] leading-relaxed focus:ring-0 focus:outline-none"
              placeholder={`Enter ${step.key} step...`}
              value={value}
              onChange={onChange}
              rows={1}
              style={{ 
                minHeight: '2.5rem',
                height: 'auto'
              }}
              onInput={(e) => {
                e.target.style.height = 'auto';
                e.target.style.height = Math.max(40, e.target.scrollHeight) + 'px';
              }}
            />
          ) : (
            <div className="whitespace-pre-wrap">
              {content || (
                <span className="text-gray-500 italic">
                  {hasReference ? `No ${step.key} step defined` : 'Enter reference scenario...'}
                </span>
              )}
            </div>
          )
        )}
      </div>
    </td>
  </tr>
));

TableRow.displayName = 'TableRow';

// Main Component
const ComparisonTable = memo(({ 
  generatedScenario, 
  referenceScenario = '', 
  onReferenceChange,
  className = '',
  showHeaders = true,
  selectedSection = 'semua'
}) => {
  const { measureOperation } = useComponentPerformance('ComparisonTable');

  // Parse both scenarios with memoization for performance
  const parsedGenerated = useMemo(() => 
    measureOperation('parse-generated', () => parseGherkinScenario(generatedScenario)), 
    [generatedScenario, measureOperation]
  );
  
  const parsedReference = useMemo(() => 
    measureOperation('parse-reference', () => parseGherkinScenario(referenceScenario)), 
    [referenceScenario, measureOperation]
  );

  // Local state for individual fields
  const [givenValue, setGivenValue] = useState('');
  const [whenValue, setWhenValue] = useState('');
  const [thenValue, setThenValue] = useState('');
  
  // Track if user has started typing (to prevent external updates from overriding)
  const [hasUserInput, setHasUserInput] = useState(false);

  // Initialize from referenceScenario only once or when explicitly changed from outside
  const prevReferenceScenario = useRef(referenceScenario);
  
  // Only update local state if referenceScenario changed from outside (not from our own update)
  if (prevReferenceScenario.current !== referenceScenario && !hasUserInput) {
    const parsed = parseGherkinScenario(referenceScenario);
    setGivenValue(parsed.given || '');
    setWhenValue(parsed.when || '');
    setThenValue(parsed.then || '');
    prevReferenceScenario.current = referenceScenario;
  }

  // Update parent when any field changes
  const updateParent = useCallback((given, when, then) => {
    if (!onReferenceChange) return;
    
    const gherkinText = [
      given ? `Given ${given}` : '',
      when ? `When ${when}` : '',
      then ? `Then ${then}` : ''
    ].filter(Boolean).join('\n');
    
    // Update ref to prevent re-sync
    prevReferenceScenario.current = gherkinText;
    
    onReferenceChange({ target: { value: gherkinText } });
  }, [onReferenceChange]);

  // Individual handlers
  const handleGivenChange = useCallback((e) => {
    const newValue = e.target.value;
    setHasUserInput(true);
    setGivenValue(newValue);
    updateParent(newValue, whenValue, thenValue);
  }, [whenValue, thenValue, updateParent]);

  const handleWhenChange = useCallback((e) => {
    const newValue = e.target.value;
    setHasUserInput(true);
    setWhenValue(newValue);
    updateParent(givenValue, newValue, thenValue);
  }, [givenValue, thenValue, updateParent]);

  const handleThenChange = useCallback((e) => {
    const newValue = e.target.value;
    setHasUserInput(true);
    setThenValue(newValue);
    updateParent(givenValue, whenValue, newValue);
  }, [givenValue, whenValue, updateParent]);

  // Memoized steps configuration
  const steps = useMemo(() => [
    {
      key: 'given',
      label: 'GIVEN',
      color: 'green',
      description: 'Initial context or preconditions',
      value: givenValue,
      onChange: handleGivenChange
    },
    {
      key: 'when',
      label: 'WHEN', 
      color: 'blue',
      description: 'Action or event that triggers the scenario',
      value: whenValue,
      onChange: handleWhenChange
    },
    {
      key: 'then',
      label: 'THEN',
      color: 'purple', 
      description: 'Expected outcome or result',
      value: thenValue,
      onChange: handleThenChange
    }
  ], [givenValue, whenValue, thenValue, handleGivenChange, handleWhenChange, handleThenChange]);

  // Filter steps based on selectedSection
  const filteredSteps = useMemo(() => {
    if (selectedSection === 'semua') {
      return steps;
    }
    return steps.filter(step => step.key === selectedSection);
  }, [steps, selectedSection]);

  // Memoized header component
  const HeaderComponent = useMemo(() => {
    if (!showHeaders) return null;
    
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
        {/* Generated Scenario Header */}
        <div className="text-center">
          <div className="mb-2">
            <h4 className="text-sm font-semibold text-white">Skenario yang Dihasilkan</h4>
          </div>
          <p className="text-xs text-gray-400">Generated by AI</p>
        </div>

        {/* Reference Scenario Header */}
        <div className="text-center">
          <div className="mb-2">
            <h4 className="text-sm font-semibold text-white">Skenario Referensi</h4>
          </div>
          <p className="text-xs text-gray-400">Ground truth / Company standard</p>
        </div>
      </div>
    );
  }, [showHeaders]);

  return measureOperation('render', () => (
    <div className={`comparison-container space-y-4 sm:space-y-6 ${className}`}>
      {HeaderComponent}

      {/* Comparison Tables - Responsive Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        {/* Generated Scenario Table */}
        <div className="scenario-table">
          <div className="rounded-xl sm:rounded-2xl overflow-hidden shadow-inner" style={{ backgroundColor: '#09090A', border: '1px solid rgba(255, 255, 255, 0.05)' }}>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[280px]">
                <tbody>
                  {filteredSteps.map((step, index) => (
                    <TableRow
                      key={step.key}
                      step={step}
                      isLast={index === filteredSteps.length - 1}
                      isGenerated={true}
                      content={parsedGenerated[step.key]}
                      value={null}
                      onChange={null}
                      isEditable={false}
                      hasReference={false}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Reference Scenario Table */}
        <div className="scenario-table">
          <div className="rounded-xl sm:rounded-2xl overflow-hidden shadow-inner" style={{ backgroundColor: '#09090A', border: '1px solid rgba(255, 255, 255, 0.05)' }}>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[280px]">
                <tbody>
                  {filteredSteps.map((step, index) => (
                    <TableRow
                      key={step.key}
                      step={step}
                      isLast={index === filteredSteps.length - 1}
                      isGenerated={false}
                      content={null}
                      value={step.value}
                      onChange={step.onChange}
                      isEditable={!!onReferenceChange}
                      hasReference={!!referenceScenario}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  ));
});

ComparisonTable.displayName = 'ComparisonTable';

export default ComparisonTable;