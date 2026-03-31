import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { XMarkIcon } from '@heroicons/react/24/outline';
import Button from '../common/Button';
import MeteorAnalysisReport from '../common/MeteorAnalysisReport';

const MeteorReviewModal = ({ 
  isOpen, 
  onClose, 
  scenario = null,
  scenarioIndex = null,
  testResult = null,
  onRetest = null,
  onApprove = null
}) => {
  const [activeTab, setActiveTab] = useState('scenario');
  const [isRetesting, setIsRetesting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setActiveTab('scenario');
      setIsRetesting(false);
    }
  }, [isOpen]);

  const handleRetest = async () => {
    if (onRetest && scenario) {
      setIsRetesting(true);
      try {
        await onRetest(scenario, scenarioIndex);
      } catch (error) {
        console.error('Retest failed:', error);
      } finally {
        setIsRetesting(false);
      }
    }
  };

  const handleApprove = () => {
    if (onApprove && scenario) {
      onApprove(scenario, scenarioIndex, testResult);
    }
    onClose();
  };

  const tabs = [
    { id: 'scenario', name: 'Scenario' },
    { id: 'results', name: 'Test Results' },
    { id: 'analysis', name: 'Analysis' }
  ];

  const mockTestResult = {
    status: 'completed',
    score: 0.85,
    executionTime: 1250,
    steps: [
      { step: 'Given I am on the login page', status: 'passed', duration: 200 },
      { step: 'When I enter valid credentials', status: 'passed', duration: 300 },
      { step: 'Then I should be redirected to dashboard', status: 'passed', duration: 150 }
    ],
    metrics: {
      coverage: 0.92,
      reliability: 0.88,
      performance: 0.79
    }
  };

  const displayTestResult = testResult || mockTestResult;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div 
          className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div 
            className="bg-black border border-white/10 rounded-2xl max-w-4xl w-full max-h-[90vh] flex flex-col shadow-2xl"
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-6 border-b border-white/10 flex-shrink-0">
              <div>
                <h2 className="text-xl font-semibold text-white">Meteor Test Review</h2>
                {scenarioIndex !== null && (
                  <p className="text-sm text-gray-400">Scenario #{scenarioIndex + 1}</p>
                )}
              </div>
              <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
                <XMarkIcon className="w-6 h-6" />
              </button>
            </div>

            <div className="flex border-b border-white/10 flex-shrink-0">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-6 py-3 text-sm font-medium transition-colors ${
                    activeTab === tab.id
                      ? 'text-purple-400 border-b-2 border-purple-400 bg-white/5'
                      : 'text-gray-400 hover:text-gray-300'
                  }`}
                >
                  {tab.name}
                </button>
              ))}
            </div>

            <div className="flex-1 overflow-y-auto">
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeTab}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.2 }}
                  className="p-6"
                >
                  {activeTab === 'scenario' && (
                    <div className="space-y-4">
                      <div>
                        <h3 className="text-lg font-medium text-white mb-3">Scenario Details</h3>
                        {scenario ? (
                          <div className="bg-white/5 rounded-lg p-4">
                            <div className="space-y-3">
                              <div>
                                <span className="text-sm font-medium text-gray-300">Title:</span>
                                <p className="text-white mt-1">{scenario.title || 'Untitled Scenario'}</p>
                              </div>
                              {scenario.description && (
                                <div>
                                  <span className="text-sm font-medium text-gray-300">Description:</span>
                                  <p className="text-gray-300 mt-1">{scenario.description}</p>
                                </div>
                              )}
                              <div>
                                <span className="text-sm font-medium text-gray-300">Gherkin Scenario:</span>
                                <pre className="text-gray-300 mt-1 whitespace-pre-wrap font-mono text-sm bg-white/5 p-3 rounded border border-white/10">
                                  {scenario.gherkin_scenario || scenario.scenario || 'No scenario content available'}
                                </pre>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="bg-white/5 rounded-lg p-8 text-center">
                            <p className="text-gray-300">No scenario data available</p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {activeTab === 'results' && (
                    <div className="space-y-6">
                      <div>
                        <h3 className="text-lg font-medium text-white mb-4">Test Execution Results</h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                          <div className="bg-gradient-to-br from-[#020203]/80 to-black/90 border border-white/10 rounded-lg p-4 text-center">
                            <div className="text-sm text-gray-400 mt-1">Status</div>
                            <div className={`text-xl font-bold ${
                              displayTestResult.status === 'completed' ? 'text-green-400' : 
                              displayTestResult.status === 'failed' ? 'text-red-400' : 'text-yellow-400'
                            } capitalize`}>{displayTestResult.status}</div>
                          </div>
                          <div className="bg-gradient-to-br from-[#020203]/80 to-black/90 border border-white/10 rounded-lg p-4 text-center">
                            <div className="text-sm text-gray-400 mt-1">Score</div>
                            <div className="text-xl font-bold text-purple-400">
                              {(displayTestResult.score * 100).toFixed(1)}%
                            </div>
                          </div>
                          <div className="bg-gradient-to-br from-[#020203]/80 to-black/90 border border-white/10 rounded-lg p-4 text-center">
                            <div className="text-sm text-gray-400 mt-1">Execution Time</div>
                            <div className="text-xl font-bold text-blue-400">
                              {displayTestResult.executionTime}ms
                            </div>
                          </div>
                        </div>
                        {displayTestResult.steps && (
                          <div>
                            <h4 className="text-md font-medium text-white mb-3">Step Results</h4>
                            <div className="space-y-2">
                              {displayTestResult.steps.map((step, index) => (
                                <div key={index} className="flex items-center gap-3 p-3 bg-white/5 rounded-lg border border-white/10">
                                  <div className="flex-1">
                                    <div className="flex items-center justify-between">
                                      <div className="text-white text-sm">{step.step}</div>
                                      <div className={`text-xs font-medium ${
                                        step.status === 'passed' ? 'text-green-400' :
                                        step.status === 'failed' ? 'text-red-400' :
                                        'text-yellow-400'
                                      } capitalize`}>
                                        {step.status}
                                      </div>
                                    </div>
                                    <div className="text-gray-400 text-xs">{step.duration}ms</div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {activeTab === 'analysis' && (
                    <div className="space-y-4">
                      <h3 className="text-lg font-medium text-white mb-4">Detailed Analysis</h3>
                      <MeteorAnalysisReport
                        groundTruthText={scenario?.gherkin_scenario || scenario?.scenario}
                        generatedText={scenario?.generated_scenario || 'Generated scenario not available'}
                        analysisResults={testResult?.analysis}
                      />
                    </div>
                  )}
                </motion.div>
              </AnimatePresence>
            </div>

            <div className="flex items-center justify-between p-6 border-t border-white/10 flex-shrink-0">
              <div className="flex items-center gap-3">
                {displayTestResult.status === 'failed' && (
                  <Button
                    variant="secondary"
                    onClick={handleRetest}
                    disabled={isRetesting}
                  >
                    {isRetesting ? (
                      <>
                        <div className="w-4 h-4 border-2 border-gray-400/20 border-t-gray-400 rounded-full animate-spin" />
                        Retesting...
                      </>
                    ) : (
                      'Retest'
                    )}
                  </Button>
                )}
              </div>
              <div className="flex items-center gap-3">
                <Button variant="secondary" onClick={onClose}>Close</Button>
                {displayTestResult.status === 'completed' && (
                  <Button onClick={handleApprove}>
                    Approve
                  </Button>
                )}
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default MeteorReviewModal;
