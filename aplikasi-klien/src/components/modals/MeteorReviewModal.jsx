import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTestResults } from '../../contexts/TestResultsContext';

const MeteorReviewModal = ({ isOpen, onClose, scenario, scenarioIndex, testResult }) => {
  const { getAllTestResults } = useTestResults();
  const [showHistory, setShowHistory] = useState(false);
  const navigate = useNavigate();

  if (!isOpen || !testResult) return null;

  // Get all test results for this scenario
  const allResults = getAllTestResults();
  const scenarioResults = Object.values(allResults).filter(result => 
    result.messageId === testResult.messageId && result.scenarioIndex === testResult.scenarioIndex
  ).sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

  const handleViewFullResults = () => {
    if (testResult?.timestamp) {
      navigate(`/meteor-results/${testResult.timestamp}`);
      onClose();
    }
  };

  const getScoreColor = (score) => {
    if (score >= 0.7) return 'text-green-400';
    if (score >= 0.5) return 'text-yellow-400';
    return 'text-red-400';
  };

  const getQualityLabel = (score) => {
    if (score >= 0.7) return 'Excellent';
    if (score >= 0.5) return 'Good';
    if (score >= 0.3) return 'Fair';
    return 'Poor';
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-[#16161e] border border-white/10 rounded-xl w-full max-w-2xl max-h-[80vh] overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-white/10">
          <div>
            <h2 className="text-xl font-bold text-white">METEOR Test Results</h2>
            <p className="text-gray-400 text-sm mt-1">
              Review detailed evaluation results and analysis
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
        <div className="p-6">
          {/* Test Info with History Toggle */}
          <div className="mb-6 p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="text-sm font-medium text-blue-400">Test Information</span>
              </div>
              {scenarioResults.length > 1 && (
                <button
                  onClick={() => setShowHistory(!showHistory)}
                  className="text-xs text-blue-400 hover:text-blue-300 underline"
                >
                  {showHistory ? 'Hide' : 'Show'} History ({scenarioResults.length} tests)
                </button>
              )}
            </div>
            <div className="text-sm text-gray-300">
              <p><span className="text-gray-400">Scenario:</span> {scenario.title || `Scenario ${scenarioIndex + 1}`}</p>
              <p><span className="text-gray-400">Latest test:</span> {new Date(testResult.timestamp).toLocaleString()}</p>
              <p><span className="text-gray-400">Evaluation time:</span> {testResult.evaluation_metadata?.evaluation_time_ms || 'N/A'}ms</p>
              {scenarioResults.length > 1 && (
                <p><span className="text-gray-400">Total tests:</span> {scenarioResults.length}</p>
              )}
            </div>

            {/* Test History */}
            {showHistory && scenarioResults.length > 1 && (
              <div className="mt-4 pt-4 border-t border-blue-500/20">
                <h4 className="text-sm font-medium text-blue-400 mb-3">Test History</h4>
                <div className="space-y-2 max-h-32 overflow-y-auto">
                  {scenarioResults.map((result, index) => (
                    <div key={result.timestamp} className="flex items-center justify-between p-2 bg-blue-500/5 rounded-lg">
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-gray-400">#{scenarioResults.length - index}</span>
                        <span className={`text-sm font-medium ${getScoreColor(result.meteor_score)}`}>
                          {(result.meteor_score * 100).toFixed(1)}%
                        </span>
                      </div>
                      <span className="text-xs text-gray-500">
                        {new Date(result.timestamp).toLocaleString()}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Quick Results Preview */}
          <div className="text-center mb-6">
            <div className="w-24 h-24 mx-auto mb-4 rounded-full border-4 border-purple-500/30 flex items-center justify-center">
              <div className="text-center">
                <div className={`text-2xl font-bold ${getScoreColor(testResult.meteor_score)}`}>
                  {(testResult.meteor_score * 100).toFixed(1)}%
                </div>
                <div className="text-xs text-gray-400">METEOR</div>
              </div>
            </div>
            <h3 className="text-lg font-bold text-white mb-2">
              {getQualityLabel(testResult.meteor_score)} Quality
            </h3>
          </div>

          {/* Quick Metrics */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="text-center p-3 bg-white/5 border border-white/10 rounded-lg">
              <div className="text-xl font-bold text-blue-400 mb-1">
                {(testResult.precision * 100).toFixed(1)}%
              </div>
              <div className="text-sm text-gray-400">Precision</div>
            </div>
            <div className="text-center p-3 bg-white/5 border border-white/10 rounded-lg">
              <div className="text-xl font-bold text-green-400 mb-1">
                {(testResult.recall * 100).toFixed(1)}%
              </div>
              <div className="text-sm text-gray-400">Recall</div>
            </div>
            <div className="text-center p-3 bg-white/5 border border-white/10 rounded-lg">
              <div className="text-xl font-bold text-purple-400 mb-1">
                {(testResult.f_score * 100).toFixed(1)}%
              </div>
              <div className="text-sm text-gray-400">F-Score</div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="space-y-3">
            {/* Primary View Full Results Button */}
            <button
              onClick={handleViewFullResults}
              className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl hover:from-purple-700 hover:to-pink-700 transition-all font-bold text-base shadow-xl"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
              <span>View Full Analysis</span>
            </button>

            {/* Secondary Actions */}
            <div className="flex gap-3">
              <button
                onClick={() => {
                  // Retest functionality
                  if (window.openMeteorTestModal) {
                    onClose();
                    window.openMeteorTestModal(scenario, scenarioIndex, testResult.messageId);
                  }
                }}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-green-600/20 hover:bg-green-600/30 border border-green-500/30 hover:border-green-500/50 text-green-300 hover:text-green-200 rounded-lg transition-all duration-200"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Run New Test
              </button>
              <button
                onClick={onClose}
                className="flex-1 px-6 py-3 bg-gray-600/20 hover:bg-gray-600/30 border border-gray-500/30 hover:border-gray-500/50 text-gray-300 hover:text-gray-200 rounded-lg transition-all duration-200"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MeteorReviewModal;