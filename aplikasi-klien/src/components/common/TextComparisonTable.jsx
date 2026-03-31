import { useMemo, memo, useCallback } from 'react';
import { useComponentPerformance } from '../../utils/performance/componentProfiler';

// Utility function to parse Gherkin scenario text
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
      // Save previous step if exists
      if (currentStep && currentContent.length > 0) {
        result[currentStep] = currentContent.join(' ').trim();
      }
      currentStep = 'given';
      currentContent = [line.replace(/^(given|diberikan)\s*/i, '')];
    } else if (lowerLine.startsWith('when') || lowerLine.startsWith('ketika')) {
      // Save previous step if exists
      if (currentStep && currentContent.length > 0) {
        result[currentStep] = currentContent.join(' ').trim();
      }
      currentStep = 'when';
      currentContent = [line.replace(/^(when|ketika)\s*/i, '')];
    } else if (lowerLine.startsWith('then') || lowerLine.startsWith('maka')) {
      // Save previous step if exists
      if (currentStep && currentContent.length > 0) {
        result[currentStep] = currentContent.join(' ').trim();
      }
      currentStep = 'then';
      currentContent = [line.replace(/^(then|maka)\s*/i, '')];
    } else if (lowerLine.startsWith('and') || lowerLine.startsWith('dan')) {
      // Continue current step
      if (currentStep) {
        currentContent.push(line.replace(/^(and|dan)\s*/i, ''));
      }
    } else if (line && currentStep) {
      // Continue current step content
      currentContent.push(line);
    }
  }

  // Save the last step
  if (currentStep && currentContent.length > 0) {
    result[currentStep] = currentContent.join(' ').trim();
  }

  return result;
};

// Utility function to highlight matching words
const highlightMatchingWords = ({ text, referenceText, stepColor, stepKey }) => {
  if (!text || !referenceText) return text;
  
  const words = text.split(/(\s+)/);
  const referenceWords = referenceText.toLowerCase().split(/\s+/);
  
  return words.map((word, index) => {
    const cleanWord = word.toLowerCase().replace(/[^\w]/g, '');
    const isMatching = referenceWords.some(refWord => {
      const cleanRefWord = refWord.replace(/[^\w]/g, '');
      return cleanRefWord === cleanWord || 
          (cleanRefWord.length > 2 && cleanWord.length > 2 && 
           (cleanRefWord.includes(cleanWord) || cleanWord.includes(cleanRefWord)));
    });
    
    if (isMatching && cleanWord.length > 0) {
      // Use solid background #120C18 and text color #C27AFF for all steps
      return (
        <span 
          key={index} 
          className="px-1 rounded"
          style={{ 
            backgroundColor: '#120C18',
            color: '#C27AFF'
          }}
        >
          {word}
        </span>
      );
    }
    return <span key={index}>{word}</span>;
  });
};

const TextComparisonTable = memo(({ 
  generatedText, 
  referenceText,
  showHighlight = true, // Default true untuk METEOR, false untuk Sentence-BERT
  className = '',
  selectedSection = 'semua',
  testType = 'meteor' // Default METEOR
}) => {
  const { measureOperation } = useComponentPerformance('TextComparisonTable');

  // Parse both texts into Gherkin scenarios with memoization
  const parsedGenerated = useMemo(() => 
    measureOperation('parse-generated', () => parseGherkinScenario(generatedText)), 
    [generatedText, measureOperation]
  );
  
  const parsedReference = useMemo(() => 
    measureOperation('parse-reference', () => parseGherkinScenario(referenceText)), 
    [referenceText, measureOperation]
  );

  // Memoized steps configuration - berbeda untuk METEOR dan Sentence BERT
  const steps = useMemo(() => {
    const isSentenceBert = testType === 'sentence_bert';
    return [
      {
        key: 'given',
        label: 'GIVEN',
        color: 'purple',
        bgColor: isSentenceBert ? '#160D14' : '#120C18',
        textColor: isSentenceBert ? '#FF7AD0' : '#C27AFF',
        description: 'Kondisi awal atau prasyarat'
      },
      {
        key: 'when',
        label: 'WHEN', 
        color: 'purple',
        bgColor: isSentenceBert ? '#160D14' : '#120C18',
        textColor: isSentenceBert ? '#FF7AD0' : '#C27AFF',
        description: 'Aksi atau event yang memicu skenario'
      },
      {
        key: 'then',
        label: 'THEN',
        color: 'purple', 
        bgColor: isSentenceBert ? '#160D14' : '#120C18',
        textColor: isSentenceBert ? '#FF7AD0' : '#C27AFF',
        description: 'Hasil yang diharapkan'
      }
    ];
  }, [testType]);

  // Filter steps based on selectedSection
  const filteredSteps = useMemo(() => {
    if (selectedSection === 'semua') {
      return steps;
    }
    return steps.filter(step => step.key === selectedSection);
  }, [steps, selectedSection]);

  // Memoized table row component for better performance
  const TableRow = memo(({ step, index }) => {
    const generatedContent = parsedGenerated[step.key];
    const referenceContent = parsedReference[step.key];

    return (
      <tr 
        style={{ backgroundColor: '#020203' }}
      >
        {/* Step Label */}
        <td 
          className="px-4 py-6"
          style={{ 
            background: `linear-gradient(to right, ${step.bgColor}, ${step.bgColor})`,
            borderRight: '1px solid #000000',
            borderBottom: index < steps.length - 1 ? '1px solid #000000' : 'none'
          }}
        >
          <div className="flex flex-col items-center gap-2">
            <div 
              className="font-mono text-sm font-bold"
              style={{ color: step.textColor }}
            >
              {step.label}
            </div>
          </div>
        </td>

        {/* Generated Text */}
        <td 
          className="px-4 py-6" 
          style={{ 
            borderRight: '1px solid #120C18',
            borderBottom: index < steps.length - 1 ? '1px solid #120C18' : 'none'
          }}
        >
          <div className="pl-4 py-2">
            <div className="text-sm text-gray-300 font-mono leading-relaxed min-h-[3rem]">
              {generatedContent ? (
                <div className="whitespace-pre-wrap">
                  {showHighlight ? (
                    highlightMatchingWords({ 
                      text: generatedContent, 
                      referenceText: referenceContent,
                      stepColor: step.textColor,
                      stepKey: step.key
                    })
                  ) : (
                    generatedContent
                  )}
                </div>
              ) : (
                <span className="text-gray-500 italic">Tidak ada {step.key} step</span>
              )}
            </div>
          </div>
        </td>

        {/* Reference Text */}
        <td 
          className="px-4 py-6"
          style={{ 
            borderBottom: index < steps.length - 1 ? '1px solid #120C18' : 'none'
          }}
        >
          <div className="pl-4 py-2">
            <div className="text-sm text-gray-300 font-mono leading-relaxed min-h-[3rem]">
              {referenceContent ? (
                <div className="whitespace-pre-wrap">
                  {showHighlight ? (
                    highlightMatchingWords({ 
                      text: referenceContent, 
                      referenceText: generatedContent,
                      stepColor: step.textColor,
                      stepKey: step.key
                    })
                  ) : (
                    referenceContent
                  )}
                </div>
              ) : (
                <span className="text-gray-500 italic">Tidak ada {step.key} step</span>
              )}
            </div>
          </div>
        </td>
      </tr>
    );
  });

  return measureOperation('render', () => (
    <div className={`text-comparison-container space-y-6 ${className}`}>

      {/* Comparison Table */}
      <div className="bg-[#0a0a0f]/40 rounded-2xl overflow-hidden shadow-lg" style={{ borderWidth: '1px', borderStyle: 'solid', borderColor: '#120C18' }}>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr style={{ backgroundColor: '#09090A', borderBottom: '1px solid #000000' }}>
                <th className="px-4 py-4 text-left text-sm font-semibold text-gray-300 w-20" style={{ borderRight: '1px solid #000000' }}>
                  Bagian
                </th>
                <th className="px-4 py-4 text-left text-sm font-semibold text-gray-300 w-1/2" style={{ borderRight: '1px solid #000000' }}>
                  Teks yang Dihasilkan
                </th>
                <th className="px-4 py-4 text-left text-sm font-semibold text-gray-300 w-1/2">
                  Teks Referensi
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredSteps.map((step, index) => (
                <TableRow key={step.key} step={step} index={index} />
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  ));
});

TextComparisonTable.displayName = 'TextComparisonTable';

export default TextComparisonTable;