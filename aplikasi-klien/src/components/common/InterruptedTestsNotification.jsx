import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import useTestingStatePersistence from '../../hooks/useTestingStatePersistence';

/**
 * Notification component for handling interrupted tests
 * Shows when user returns to the app with ongoing tests
 */
const InterruptedTestsNotification = ({ onResumeTest, onCancelTest }) => {
  const {
    getInterruptedTests,
    hasInterruptedTests,
    resumeTest,
    cancelInterruptedTest
  } = useTestingStatePersistence();

  const [interruptedTests, setInterruptedTests] = useState([]);
  const [showNotification, setShowNotification] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  // Check for interrupted tests on mount and when state changes
  useEffect(() => {
    if (hasInterruptedTests && !dismissed) {
      const tests = getInterruptedTests();
      setInterruptedTests(tests);
      setShowNotification(tests.length > 0);
    } else {
      setShowNotification(false);
    }
  }, [hasInterruptedTests, getInterruptedTests, dismissed]);

  // Handle resume test
  const handleResumeTest = (testId) => {
    const testState = resumeTest(testId);
    if (testState && onResumeTest) {
      onResumeTest(testState);
    }
    
    // Update local state
    setInterruptedTests(prev => prev.filter(test => test.id !== testId));
    
    // Hide notification if no more tests
    if (interruptedTests.length <= 1) {
      setShowNotification(false);
    }
  };

  // Handle cancel test
  const handleCancelTest = (testId) => {
    cancelInterruptedTest(testId);
    if (onCancelTest) {
      onCancelTest(testId);
    }
    
    // Update local state
    setInterruptedTests(prev => prev.filter(test => test.id !== testId));
    
    // Hide notification if no more tests
    if (interruptedTests.length <= 1) {
      setShowNotification(false);
    }
  };

  // Handle dismiss all
  const handleDismissAll = () => {
    interruptedTests.forEach(test => {
      cancelInterruptedTest(test.id);
      if (onCancelTest) {
        onCancelTest(test.id);
      }
    });
    
    setShowNotification(false);
    setDismissed(true);
  };

  // Format time since interruption
  const formatTimeSince = (timestamp) => {
    const now = Date.now();
    const diff = now - timestamp;
    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(minutes / 60);
    
    if (hours > 0) {
      return `${hours}h ${minutes % 60}m ago`;
    } else if (minutes > 0) {
      return `${minutes}m ago`;
    } else {
      return 'Just now';
    }
  };

  // Get test type configuration
  const getTestConfig = (testType) => {
    const configs = {
      meteor: {
        color: 'blue',
        icon: '🎯',
        name: 'METEOR'
      },
      sentence_bert: {
        color: 'purple',
        icon: '🧠',
        name: 'Sentence-BERT'
      }
    };
    return configs[testType] || configs.meteor;
  };

  if (!showNotification || interruptedTests.length === 0) {
    return null;
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -100 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -100 }}
        className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 w-full max-w-md mx-auto px-4"
      >
        <div className="bg-gradient-to-br from-slate-800/95 to-slate-900/95 backdrop-blur-sm border border-yellow-500/30 rounded-xl shadow-2xl overflow-hidden">
          {/* Header */}
          <div className="p-4 border-b border-yellow-500/20 bg-yellow-500/10">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-yellow-500/20 flex items-center justify-center">
                  <span className="text-lg">⚠️</span>
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-yellow-300">
                    Interrupted Tests Found
                  </h3>
                  <p className="text-xs text-yellow-200/80">
                    {interruptedTests.length} test{interruptedTests.length > 1 ? 's' : ''} were interrupted
                  </p>
                </div>
              </div>
              
              <button
                onClick={handleDismissAll}
                className="text-yellow-400 hover:text-yellow-300 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          {/* Test List */}
          <div className="max-h-64 overflow-y-auto">
            {interruptedTests.map((test, index) => {
              const config = getTestConfig(test.testType);
              
              return (
                <motion.div
                  key={test.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="p-4 border-b border-white/10 last:border-b-0"
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className={`w-6 h-6 rounded bg-${config.color}-500/20 flex items-center justify-center flex-shrink-0`}>
                        <span className="text-sm">{config.icon}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-white truncate">
                          {config.name} Test
                        </div>
                        <div className="text-xs text-gray-400 truncate">
                          Scenario: {test.scenarioId}
                        </div>
                      </div>
                    </div>
                    
                    <div className="text-xs text-gray-500 text-right flex-shrink-0">
                      <div>{Math.round(test.progress || 0)}% complete</div>
                      <div>{formatTimeSince(test.startedAt)}</div>
                    </div>
                  </div>

                  {/* Progress bar */}
                  <div className="mb-3">
                    <div className="w-full bg-white/10 rounded-full h-1.5">
                      <div 
                        className={`h-1.5 bg-gradient-to-r from-${config.color}-500 to-${config.color}-400 rounded-full transition-all duration-300`}
                        style={{ width: `${test.progress || 0}%` }}
                      />
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleResumeTest(test.id)}
                      className="flex-1 px-3 py-2 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white rounded-lg transition-all font-medium text-xs flex items-center gap-2 justify-center"
                    >
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h1m4 0h1m-6 4h1m4 0h1m-6-8h8a2 2 0 012 2v8a2 2 0 01-2 2H8a2 2 0 01-2-2V8a2 2 0 012-2z" />
                      </svg>
                      Resume
                    </button>
                    
                    <button
                      onClick={() => handleCancelTest(test.id)}
                      className="flex-1 px-3 py-2 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 text-white rounded-lg transition-all font-medium text-xs flex items-center gap-2 justify-center"
                    >
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                      Cancel
                    </button>
                  </div>
                </motion.div>
              );
            })}
          </div>

          {/* Footer */}
          <div className="p-3 bg-slate-800/50 border-t border-white/10">
            <div className="flex items-center gap-2 text-xs text-gray-400">
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>Tests were interrupted due to navigation or page refresh</span>
            </div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export default InterruptedTestsNotification;