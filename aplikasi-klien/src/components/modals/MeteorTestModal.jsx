import { useState, useRef, useEffect } from 'react';
import TestCompletionNotification from '../common/TestCompletionNotification';
import api from '../../services/api.js'; // Import API service with correct base URL

const MeteorTestModal = ({ isOpen, onClose, scenario, scenarioIndex, onTestComplete }) => {
  const [referenceGiven, setReferenceGiven] = useState('');
  const [referenceWhen, setReferenceWhen] = useState('');
  const [referenceThen, setReferenceThen] = useState('');
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [showNotification, setShowNotification] = useState(false);
  const [completedTestResult, setCompletedTestResult] = useState(null);
  const givenInputRef = useRef(null);

  // Reset state when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setReferenceGiven('');
      setReferenceWhen('');
      setReferenceThen('');
      setShowNotification(false);
      setCompletedTestResult(null);
      setTimeout(() => {
        givenInputRef.current?.focus();
      }, 100);
    }
  }, [isOpen]);

  const handleRunTest = async () => {
    if (!referenceGiven.trim() || !referenceWhen.trim() || !referenceThen.trim()) {
      alert('Please fill in all reference scenario fields before testing.');
      return;
    }

    const referenceText = `Given ${referenceGiven}\nWhen ${referenceWhen}\nThen ${referenceThen}`;
    const generatedScenario = `Given ${scenario.given}\nWhen ${scenario.when}\nThen ${scenario.then}`;

    setIsEvaluating(true);
    
    try {
      // Use API service instead of direct fetch to get correct base URL and headers
      const response = await api.post('/meteor/evaluate-detailed', {
        generatedScenario,
        referenceScenario: referenceText.trim(),
        scenarioIndex,
        options: {
          includeWordAlignment: true,
          includeComponentBreakdown: true,
          includeSimilarityMatrix: false
        }
      });

      const result = response.data; // Axios response structure
      
      if (result.success && result.data) {
        // Add reference data to result for comparison
        const resultWithReference = {
          ...result.data,
          referenceGiven,
          referenceWhen,
          referenceThen,
          originalScenario: {
            given: scenario.given,
            when: scenario.when,
            then: scenario.then
          },
          // Ensure generatedScenario is properly formatted
          generatedScenario: result.data.generatedScenario || `Given ${scenario.given}\nWhen ${scenario.when}\nThen ${scenario.then}`
        };
        
        // Set completed result for notification first
        setCompletedTestResult(resultWithReference);
        
        // Save test result BEFORE closing modal
        if (onTestComplete) {
          onTestComplete(resultWithReference);
        }
        
        // Small delay to ensure save completes, then close modal and show notification
        setTimeout(() => {
          onClose();
          setTimeout(() => {
            setShowNotification(true);
          }, 300);
        }, 100);
      } else {
        throw new Error(result.message || 'Evaluation failed');
      }
    } catch (error) {
      console.error('METEOR Test Error:', error);
      alert(`Failed to run METEOR evaluation: ${error.message}`);
    } finally {
      setIsEvaluating(false);
    }
  };

  const handleCloseNotification = () => {
    setShowNotification(false);
    setCompletedTestResult(null);
  };

  if (!isOpen) {
    return (
      <TestCompletionNotification
        isVisible={showNotification}
        onClose={handleCloseNotification}
        testResult={completedTestResult}
        scenario={scenario}
      />
    );
  }

  return (
    <>
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-[#16161e] border border-white/10 rounded-xl w-full max-w-2xl max-h-[80vh] overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-white/10">
          <div>
            <h2 className="text-xl font-bold text-white">Test Scenario with METEOR</h2>
            <p className="text-gray-400 text-sm mt-1">
              Fill in your reference scenario below, then click "RUN METEOR TEST"
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-white transition-colors rounded-lg hover:bg-white/5"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="h-[60vh] overflow-y-auto">
          {/* Input View */}
          <div className="flex h-full">
              {/* Generated Scenario */}
              <div className="w-1/2 p-6 border-r border-white/10">
                <h3 className="text-lg font-semibold text-white mb-4">Generated Scenario</h3>
                <div className="bg-white/5 border border-white/10 rounded-lg overflow-hidden">
                  <table className="w-full">
                    <tbody>
                      <tr className="border-b border-gray-700/30">
                        <td className="px-4 py-3 bg-green-500/10 border-r border-gray-700/30 w-16">
                          <span className="text-green-400 font-mono text-xs font-semibold">GIVEN</span>
                        </td>
                        <td className="px-4 py-3 text-gray-200 text-sm">{scenario.given}</td>
                      </tr>
                      <tr className="border-b border-gray-700/30">
                        <td className="px-4 py-3 bg-blue-500/10 border-r border-gray-700/30 w-16">
                          <span className="text-blue-400 font-mono text-xs font-semibold">WHEN</span>
                        </td>
                        <td className="px-4 py-3 text-gray-200 text-sm">{scenario.when}</td>
                      </tr>
                      <tr>
                        <td className="px-4 py-3 bg-purple-500/10 border-r border-gray-700/30 w-16">
                          <span className="text-purple-400 font-mono text-xs font-semibold">THEN</span>
                        </td>
                        <td className="px-4 py-3 text-gray-200 text-sm">{scenario.then}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Reference Input */}
              <div className="w-1/2 p-6 flex flex-col">
                <h3 className="text-lg font-semibold text-white mb-4">Reference Scenario</h3>
                <div className="flex-1 flex flex-col">
                  <div className="bg-white/5 border border-white/10 rounded-lg overflow-hidden mb-4">
                    <table className="w-full">
                      <tbody>
                        <tr className="border-b border-gray-700/30">
                          <td className="px-4 py-3 bg-green-500/10 border-r border-gray-700/30 w-16">
                            <span className="text-green-400 font-mono text-xs font-semibold">GIVEN</span>
                          </td>
                          <td className="px-4 py-3">
                            <textarea
                              ref={givenInputRef}
                              value={referenceGiven}
                              onChange={(e) => setReferenceGiven(e.target.value)}
                              placeholder="Enter the precondition..."
                              className="w-full bg-transparent text-gray-200 text-sm placeholder-gray-500 focus:outline-none resize-none min-h-[50px]"
                              rows={2}
                            />
                          </td>
                        </tr>
                        <tr className="border-b border-gray-700/30">
                          <td className="px-4 py-3 bg-blue-500/10 border-r border-gray-700/30 w-16">
                            <span className="text-blue-400 font-mono text-xs font-semibold">WHEN</span>
                          </td>
                          <td className="px-4 py-3">
                            <textarea
                              value={referenceWhen}
                              onChange={(e) => setReferenceWhen(e.target.value)}
                              placeholder="Enter the action..."
                              className="w-full bg-transparent text-gray-200 text-sm placeholder-gray-500 focus:outline-none resize-none min-h-[50px]"
                              rows={2}
                            />
                          </td>
                        </tr>
                        <tr>
                          <td className="px-4 py-3 bg-purple-500/10 border-r border-gray-700/30 w-16">
                            <span className="text-purple-400 font-mono text-xs font-semibold">THEN</span>
                          </td>
                          <td className="px-4 py-3">
                            <textarea
                              value={referenceThen}
                              onChange={(e) => setReferenceThen(e.target.value)}
                              placeholder="Enter the expected result..."
                              className="w-full bg-transparent text-gray-200 text-sm placeholder-gray-500 focus:outline-none resize-none min-h-[50px]"
                              rows={2}
                            />
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  {/* Test Button */}
                  <div className="mt-auto">
                    <button
                      onClick={handleRunTest}
                      disabled={!referenceGiven.trim() || !referenceWhen.trim() || !referenceThen.trim() || isEvaluating}
                      className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl hover:from-purple-700 hover:to-pink-700 transition-all font-bold text-base disabled:opacity-50 disabled:cursor-not-allowed shadow-xl"
                    >
                      {isEvaluating ? (
                        <>
                          <div className="animate-spin w-5 h-5 border-2 border-white border-t-transparent rounded-full"></div>
                          <span>Running METEOR Test...</span>
                        </>
                      ) : (
                        <>
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                          </svg>
                          <span>RUN METEOR TEST</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Notification Component - Always render but conditionally show */}
      <TestCompletionNotification
        isVisible={showNotification}
        onClose={handleCloseNotification}
        testResult={completedTestResult}
        scenario={scenario}
      />
    </>
  );
};

export default MeteorTestModal;
