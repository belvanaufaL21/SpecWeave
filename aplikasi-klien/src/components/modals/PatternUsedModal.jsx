import { motion, AnimatePresence } from 'framer-motion';
import { useState } from 'react';

/**
 * Modal untuk menampilkan references yang digunakan dalam few-shot prompting
 */
const PatternUsedModal = ({ isOpen, onClose, patternInfo }) => {
  const [expandedRef, setExpandedRef] = useState(null);

  if (!isOpen) return null;

  // Parse references data - support both old and new format
  const references = patternInfo?.references || [];
  const metadata = patternInfo?.metadata || {};
  const promptingMethod = patternInfo?.method || 'few-shot';

  // Helper function to parse Gherkin content into scenarios
  const parseGherkinToScenarios = (gherkinText) => {
    if (!gherkinText) return [];
    
    const lines = gherkinText.split('\n').map(line => line.trim()).filter(line => line);
    const scenarios = [];
    let currentScenario = { given: [], when: [], then: [] };
    
    lines.forEach(line => {
      const lowerLine = line.toLowerCase();
      
      if (lowerLine.startsWith('given ')) {
        if (currentScenario.given.length > 0 && currentScenario.when.length > 0 && currentScenario.then.length > 0) {
          scenarios.push(currentScenario);
          currentScenario = { given: [], when: [], then: [] };
        }
        currentScenario.given.push(line.substring(6).trim());
      } else if (lowerLine.startsWith('when ')) {
        currentScenario.when.push(line.substring(5).trim());
      } else if (lowerLine.startsWith('then ')) {
        currentScenario.then.push(line.substring(5).trim());
      }
    });
    
    if (currentScenario.given.length > 0 || currentScenario.when.length > 0 || currentScenario.then.length > 0) {
      scenarios.push(currentScenario);
    }
    
    return scenarios.length > 0 ? scenarios : [{ given: [], when: [], then: [] }];
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        />

        {/* Modal */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative w-full max-w-4xl max-h-[85vh] bg-[#09090A] border border-white/5 rounded-3xl shadow-2xl overflow-hidden"
        >
          {/* Content */}
          <div className="relative z-10 flex flex-col max-h-[85vh]">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-white/10">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#120C18] border border-[#2C1A43] flex items-center justify-center">
                  <svg className="w-5 h-5 text-[#C27AFF]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white">References Used</h2>
                  <p className="text-xs text-gray-400 mt-0.5">Few-shot prompting examples</p>
                </div>
              </div>

              <button
                onClick={onClose}
                className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center transition-all"
              >
                <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto p-6">
              <div className="space-y-6">
                {/* References List */}
                {references.length > 0 ? (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Referenced Examples</div>
                      <div className="px-3 py-1.5 bg-transparent border border-white/10 rounded-lg">
                        <span className="text-xs text-white">{references.length} Reference{references.length !== 1 ? 's' : ''}</span>
                      </div>
                    </div>
                    
                    {references.map((ref, index) => {
                      const scenarios = parseGherkinToScenarios(ref.gherkinContent || ref.content);
                      const isExpanded = expandedRef === index;
                      
                      return (
                        <div key={index} className="bg-transparent border border-white/5 rounded-xl overflow-hidden">
                          {/* Reference Header */}
                          <div 
                            className="flex items-center justify-between p-4 cursor-pointer hover:bg-white/5 transition-colors"
                            onClick={() => setExpandedRef(isExpanded ? null : index)}
                          >
                            <div className="flex-1">
                              <div className="flex items-center gap-3">
                                <div className={`transform transition-transform ${isExpanded ? 'rotate-90' : ''}`}>
                                  <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                  </svg>
                                </div>
                                <div className="flex-1">
                                  <h4 className="text-sm font-semibold text-white">{ref.title || `Reference ${index + 1}`}</h4>
                                  <div className="flex items-center gap-3 mt-1">
                                    {ref.category && (
                                      <span className="text-xs text-gray-500 flex items-center gap-1">
                                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                                        </svg>
                                        {ref.category}
                                      </span>
                                    )}
                                    {ref.relevanceScore && (
                                      <span className="text-xs text-gray-500 flex items-center gap-1">
                                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                                        </svg>
                                        {(ref.relevanceScore * 100).toFixed(0)}% relevant
                                      </span>
                                    )}
                                    <span className="text-xs text-gray-500 flex items-center gap-1">
                                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                      </svg>
                                      {scenarios.length} scenario{scenarios.length !== 1 ? 's' : ''}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Expanded Content */}
                          {isExpanded && (
                            <div className="border-t border-white/10 p-4 space-y-4">
                              {scenarios.map((scenario, scenarioIndex) => (
                                <div key={scenarioIndex}>
                                  {scenarios.length > 1 && (
                                    <div className="flex items-center gap-2 mb-3">
                                      <div className="px-2 py-1 bg-purple-500/10 border border-purple-500/30 rounded text-xs font-semibold text-purple-400">
                                        Scenario {scenarioIndex + 1}
                                      </div>
                                    </div>
                                  )}
                                  
                                  <div className="bg-black/40 border border-white/10 rounded-lg overflow-hidden">
                                    <table className="w-full text-sm">
                                      <tbody>
                                        {scenario.given.some(s => s.trim()) && (
                                          <tr className="border-b border-white/10">
                                            <td className="px-4 py-3 bg-green-500/10 border-r border-white/10 w-24">
                                              <div className="flex items-center gap-2">
                                                <div className="w-1.5 h-1.5 rounded-full bg-green-400"></div>
                                                <span className="text-green-400 font-mono text-xs font-bold">GIVEN</span>
                                              </div>
                                            </td>
                                            <td className="px-5 py-3 text-gray-200 text-xs leading-relaxed">
                                              {scenario.given.filter(s => s.trim()).map((step, i) => (
                                                <div key={i} className="mb-1.5 last:mb-0">{step}</div>
                                              ))}
                                            </td>
                                          </tr>
                                        )}
                                        {scenario.when.some(s => s.trim()) && (
                                          <tr className="border-b border-white/10">
                                            <td className="px-4 py-3 bg-blue-500/10 border-r border-white/10 w-24">
                                              <div className="flex items-center gap-2">
                                                <div className="w-1.5 h-1.5 rounded-full bg-blue-400"></div>
                                                <span className="text-blue-400 font-mono text-xs font-bold">WHEN</span>
                                              </div>
                                            </td>
                                            <td className="px-5 py-3 text-gray-200 text-xs leading-relaxed">
                                              {scenario.when.filter(s => s.trim()).map((step, i) => (
                                                <div key={i} className="mb-1.5 last:mb-0">{step}</div>
                                              ))}
                                            </td>
                                          </tr>
                                        )}
                                        {scenario.then.some(s => s.trim()) && (
                                          <tr>
                                            <td className="px-4 py-3 bg-purple-500/10 border-r border-white/10 w-24">
                                              <div className="flex items-center gap-2">
                                                <div className="w-1.5 h-1.5 rounded-full bg-purple-400"></div>
                                                <span className="text-purple-400 font-mono text-xs font-bold">THEN</span>
                                              </div>
                                            </td>
                                            <td className="px-5 py-3 text-gray-200 text-xs leading-relaxed">
                                              {scenario.then.filter(s => s.trim()).map((step, i) => (
                                                <div key={i} className="mb-1.5 last:mb-0">{step}</div>
                                              ))}
                                            </td>
                                          </tr>
                                        )}
                                      </tbody>
                                    </table>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <svg className="w-12 h-12 mx-auto mb-4" style={{ color: 'rgba(255, 255, 255, 0.7)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <p className="text-sm" style={{ color: 'rgba(255, 255, 255, 0.7)' }}>
                      Generasi tidak dapat menggunakan few-shot prompting dengan reference library kosong
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default PatternUsedModal;
