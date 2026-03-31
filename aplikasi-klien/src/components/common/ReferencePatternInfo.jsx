import { useState } from 'react';

/**
 * Component untuk menampilkan informasi reference patterns yang digunakan dalam generation
 */
const ReferencePatternInfo = ({ referenceInfo, className = '' }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  if (!referenceInfo) {
    return null;
  }

  const {
    patternsUsed = 0,
    patternTypes = [],
    generationType = 'unknown',
    totalPatternsAnalyzed = 0
  } = referenceInfo;

  const getGenerationTypeInfo = (type) => {
    switch (type) {
      case 'pattern-based':
        return {
          label: 'Pattern-Based',
          description: 'Generated using reference patterns',
          color: 'text-green-400',
          bgColor: 'bg-green-500/10',
          borderColor: 'border-green-500/20'
        };
      case 'basic':
        return {
          label: 'Basic',
          description: 'Generated without reference patterns',
          color: 'text-blue-400',
          bgColor: 'bg-blue-500/10',
          borderColor: 'border-blue-500/20'
        };
      default:
        return {
          label: 'Unknown',
          description: 'Generation type not specified',
          color: 'text-gray-400',
          bgColor: 'bg-gray-500/10',
          borderColor: 'border-gray-500/20'
        };
    }
  };

  const typeInfo = getGenerationTypeInfo(generationType);

  const getPatternTypeIcon = (type) => {
    switch (type) {
      case 'category':
        return (
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
          </svg>
        );
      case 'structure':
        return (
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
          </svg>
        );
      default:
        return (
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        );
    }
  };

  return (
    <div className={`${typeInfo.bgColor} ${typeInfo.borderColor} border rounded-lg p-3 mt-4 ${className}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 ${typeInfo.color.replace('text-', 'bg-')} rounded-full`}></div>
          <span className={`text-sm font-medium ${typeInfo.color}`}>
            {typeInfo.label} Generation
          </span>
          {patternsUsed > 0 && (
            <span className="text-xs text-gray-400">
              ({patternsUsed} pattern{patternsUsed !== 1 ? 's' : ''} used)
            </span>
          )}
        </div>
        
        {patternsUsed > 0 && (
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1 text-gray-400 hover:text-gray-300 transition-colors"
            title={isExpanded ? 'Hide details' : 'Show details'}
          >
            <svg 
              className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`} 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
        )}
      </div>

      <p className="text-xs text-gray-400 mt-1">
        {typeInfo.description}
      </p>

      {isExpanded && patternsUsed > 0 && (
        <div className="mt-3 pt-3 border-t border-white/10">
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-400">Patterns Analyzed:</span>
              <span className="text-white font-medium">{totalPatternsAnalyzed}</span>
            </div>
            
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-400">Patterns Applied:</span>
              <span className="text-white font-medium">{patternsUsed}</span>
            </div>

            {patternTypes.length > 0 && (
              <div className="mt-2">
                <span className="text-xs text-gray-400 block mb-1">Pattern Types:</span>
                <div className="flex flex-wrap gap-1">
                  {patternTypes.map((type, index) => (
                    <div 
                      key={index}
                      className="flex items-center gap-1 px-2 py-1 bg-white/5 border border-white/10 rounded text-xs text-gray-300"
                    >
                      {getPatternTypeIcon(type)}
                      <span className="capitalize">{type}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="mt-2 p-2 bg-black/20 border border-white/5 rounded text-xs">
              <div className="flex items-center gap-1 mb-1">
                <svg className="w-3 h-3 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="text-blue-400 font-medium">How it works:</span>
              </div>
              <p className="text-gray-400 leading-relaxed">
                The system analyzed {totalPatternsAnalyzed} reference patterns from your library, 
                selected the {patternsUsed} most relevant ones based on your user story, 
                and used them to guide the LLM in generating more accurate Gherkin scenarios.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ReferencePatternInfo;