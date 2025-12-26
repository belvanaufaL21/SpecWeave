import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const TestCompletionNotification = ({ 
  isVisible, 
  onClose, 
  testResult, 
  scenario,
  autoHideDelay = 8000 
}) => {
  const [isClosing, setIsClosing] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (isVisible && autoHideDelay > 0) {
      const timer = setTimeout(() => {
        handleClose();
      }, autoHideDelay);

      return () => clearTimeout(timer);
    }
  }, [isVisible, autoHideDelay]);

  const handleClose = () => {
    setIsClosing(true);
    setTimeout(() => {
      onClose();
      setIsClosing(false);
    }, 300);
  };

  const handleViewResults = () => {
    if (testResult?.timestamp) {
      navigate(`/meteor-results/${testResult.timestamp}`);
      handleClose();
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

  if (!isVisible || !testResult) return null;

  return (
    <div className={`fixed top-4 right-4 z-50 transition-all duration-300 ${
      isClosing ? 'translate-x-full opacity-0' : 'translate-x-0 opacity-100'
    }`}>
      <div className="bg-[#16161e] border border-white/10 rounded-xl shadow-2xl max-w-md overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-green-500/20 rounded-full flex items-center justify-center">
              <svg className="w-4 h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white">METEOR Test Complete</h3>
              <p className="text-xs text-gray-400">Evaluation finished successfully</p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-1 text-gray-400 hover:text-white transition-colors rounded"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-4">
          {/* Score Display */}
          <div className="text-center mb-4">
            <div className={`text-2xl font-bold ${getScoreColor(testResult.meteor_score)} mb-1`}>
              {(testResult.meteor_score * 100).toFixed(1)}%
            </div>
            <div className="text-sm text-white">
              {getQualityLabel(testResult.meteor_score)} Quality
            </div>
          </div>

          {/* Quick Metrics */}
          <div className="grid grid-cols-3 gap-2 mb-4">
            <div className="text-center p-2 bg-blue-500/10 rounded-lg">
              <div className="text-sm font-bold text-blue-400">
                {(testResult.precision * 100).toFixed(0)}%
              </div>
              <div className="text-xs text-gray-400">Precision</div>
            </div>
            <div className="text-center p-2 bg-green-500/10 rounded-lg">
              <div className="text-sm font-bold text-green-400">
                {(testResult.recall * 100).toFixed(0)}%
              </div>
              <div className="text-xs text-gray-400">Recall</div>
            </div>
            <div className="text-center p-2 bg-purple-500/10 rounded-lg">
              <div className="text-sm font-bold text-purple-400">
                {(testResult.f_score * 100).toFixed(0)}%
              </div>
              <div className="text-xs text-gray-400">F-Score</div>
            </div>
          </div>

          {/* Scenario Info */}
          <div className="p-3 bg-white/5 rounded-lg mb-4">
            <div className="text-xs text-gray-400 mb-1">Tested Scenario</div>
            <div className="text-sm text-white truncate">
              {scenario?.title || `Scenario ${testResult.scenarioIndex + 1}`}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2">
            <button
              onClick={handleViewResults}
              className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors text-sm font-medium"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
              View Details
            </button>
            <button
              onClick={handleClose}
              className="px-3 py-2 bg-gray-600/20 hover:bg-gray-600/30 text-gray-300 hover:text-white rounded-lg transition-colors text-sm"
            >
              Dismiss
            </button>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="h-1 bg-gray-700">
          <div 
            className="h-full bg-purple-500 transition-all duration-300 ease-linear"
            style={{
              width: '100%',
              animation: `progressShrink ${autoHideDelay}ms linear forwards`
            }}
          />
        </div>
      </div>

      {/* Inline styles for animation */}
      <style>
        {`
          @keyframes progressShrink {
            from { width: 100%; }
            to { width: 0%; }
          }
        `}
      </style>
    </div>
  );
};

export default TestCompletionNotification;