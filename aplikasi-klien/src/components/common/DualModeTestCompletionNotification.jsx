import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTestResults } from '../../contexts/TestResultsContext';
import DualModeMeteorService from '../../services/dualModeMeteorService.js';
import { 
  FlaskConical, 
  ChartColumn, 
  TrendingUp,
  CheckCircle,
  AlertTriangle,
  Info,
  Eye
} from 'lucide-react';

const DualModeTestCompletionNotification = ({ isVisible, onClose, testResult, scenario }) => {
  const [isClosing, setIsClosing] = useState(false);
  const navigate = useNavigate();
  
  // Safely destructure the context to avoid undefined errors
  const testResultsContext = useTestResults();
  const { addTestResult } = testResultsContext || {};

  // Debug logging to help identify the issue
  useEffect(() => {
    console.log('🔍 [DUAL-METEOR-NOTIFICATION] Component mounted/updated:', {
      isVisible,
      hasTestResult: !!testResult,
      hasAddTestResult: !!addTestResult,
      addTestResultType: typeof addTestResult,
      contextKeys: testResultsContext ? Object.keys(testResultsContext) : 'no context'
    });
  }, [isVisible, testResult, addTestResult, testResultsContext]);

  useEffect(() => {
    // Add defensive checks to prevent errors
    if (isVisible && testResult && addTestResult && typeof addTestResult === 'function') {
      try {
        // Save the test result when notification becomes visible
        const testId = `dual-meteor-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
        const testResultWithId = {
          ...testResult,
          id: testId,
          timestamp: new Date().toISOString(),
          type: 'dual_mode_meteor',
          chatId: testResult.chatId || 'dual-mode-test'
        };
        
        console.log('💾 [DUAL-METEOR-NOTIFICATION] Attempting to save test result:', {
          testId,
          hasAddTestResult: !!addTestResult,
          functionType: typeof addTestResult
        });
        
        // Use addTestResult with the expected signature (messageId, scenarioIndex, result)
        // For dual-mode tests, we'll use the testId as both messageId and create a scenarioIndex of 0
        addTestResult(testId, 0, testResultWithId);
        console.log('✅ [DUAL-METEOR-NOTIFICATION] Test result saved with ID:', testId);
      } catch (error) {
        console.error('❌ [DUAL-METEOR-NOTIFICATION] Error saving test result:', error);
        console.error('❌ [DUAL-METEOR-NOTIFICATION] Error details:', {
          errorMessage: error.message,
          errorStack: error.stack,
          addTestResultType: typeof addTestResult,
          contextAvailable: !!testResultsContext
        });
      }
    } else if (isVisible && testResult && !addTestResult) {
      console.warn('⚠️ [DUAL-METEOR-NOTIFICATION] addTestResult function not available from context');
      console.warn('⚠️ [DUAL-METEOR-NOTIFICATION] Context details:', {
        hasContext: !!testResultsContext,
        contextKeys: testResultsContext ? Object.keys(testResultsContext) : 'no context',
        addTestResultValue: addTestResult
      });
    }
  }, [isVisible, testResult, addTestResult, testResultsContext]);

  const handleClose = () => {
    setIsClosing(true);
    setTimeout(() => {
      setIsClosing(false);
      onClose();
    }, 300);
  };

  const handleViewResults = () => {
    if (testResult?.id) {
      navigate(`/meteor-results/${testResult.id}`);
      handleClose();
    }
  };

  if (!isVisible || !testResult) return null;

  // Extract scores based on evaluation mode
  const isDualMode = testResult.evaluation_mode === 'dual';
  const strictScore = isDualMode 
    ? testResult.evaluation_results?.strict_result?.meteor_score 
    : (testResult.evaluation_mode === 'strict' ? testResult.meteor_score : null);
  const relaxedScore = isDualMode 
    ? testResult.evaluation_results?.relaxed_result?.meteor_score 
    : (testResult.evaluation_mode === 'relaxed' ? testResult.meteor_score : null);
  const improvement = isDualMode 
    ? testResult.evaluation_results?.comparison_analysis?.improvement_percentage 
    : null;

  // Get quality assessment
  const getQualityInfo = (score) => {
    if (score >= 0.8) return { level: 'Excellent', color: 'text-green-400', bgColor: 'bg-green-500/20' };
    if (score >= 0.6) return { level: 'Good', color: 'text-blue-400', bgColor: 'bg-blue-500/20' };
    if (score >= 0.4) return { level: 'Fair', color: 'text-yellow-400', bgColor: 'bg-yellow-500/20' };
    if (score >= 0.2) return { level: 'Poor', color: 'text-orange-400', bgColor: 'bg-orange-500/20' };
    return { level: 'Very Poor', color: 'text-red-400', bgColor: 'bg-red-500/20' };
  };

  const primaryScore = relaxedScore || strictScore || testResult.meteor_score || 0;
  const qualityInfo = getQualityInfo(primaryScore);

  return (
    <div className={`fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 transition-opacity duration-300 ${
      isClosing ? 'opacity-0' : 'opacity-100'
    }`}>
      <div className={`bg-[#16161e] border border-white/10 rounded-2xl w-full max-w-2xl shadow-2xl transform transition-all duration-300 ${
        isClosing ? 'scale-95 opacity-0' : 'scale-100 opacity-100'
      }`}>
        {/* Header */}
        <div className="p-6 border-b border-white/10">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className={`p-3 rounded-xl ${qualityInfo.bgColor}`}>
                {isDualMode ? (
                  <ChartColumn className={`h-6 w-6 ${qualityInfo.color}`} />
                ) : testResult.evaluation_mode === 'strict' ? (
                  <FlaskConical className={`h-6 w-6 ${qualityInfo.color}`} />
                ) : (
                  <TrendingUp className={`h-6 w-6 ${qualityInfo.color}`} />
                )}
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">
                  {isDualMode ? 'Dual-Mode' : testResult.evaluation_mode === 'strict' ? 'Strict Mode' : 'Flexible Mode'} METEOR Test Complete
                </h2>
                <p className="text-gray-400 text-sm">
                  Quality: <span className={qualityInfo.color}>{qualityInfo.level}</span>
                </p>
              </div>
            </div>
            <button
              onClick={handleClose}
              className="p-2 text-gray-400 hover:text-white transition-colors rounded-lg hover:bg-white/5"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Results */}
        <div className="p-6">
          {isDualMode ? (
            // Dual Mode Results
            <div className="space-y-6">
              {/* Score Comparison */}
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center p-4 bg-blue-500/10 rounded-xl border border-blue-500/20">
                  <div className="text-2xl font-bold text-blue-400">
                    {DualModeMeteorService.formatScore(strictScore)}
                  </div>
                  <div className="text-sm text-blue-300 font-medium mt-1">Strict Mode</div>
                  <div className="text-xs text-gray-400 mt-1">Exact matching</div>
                </div>
                
                <div className="text-center p-4 bg-green-500/10 rounded-xl border border-green-500/20">
                  <div className="text-2xl font-bold text-green-400">
                    {DualModeMeteorService.formatScore(relaxedScore)}
                  </div>
                  <div className="text-sm text-green-300 font-medium mt-1">Flexible Mode</div>
                  <div className="text-xs text-gray-400 mt-1">Semantic matching</div>
                </div>
                
                <div className="text-center p-4 bg-purple-500/10 rounded-xl border border-purple-500/20">
                  <div className="text-2xl font-bold text-purple-400">
                    +{improvement?.toFixed(1) || '0.0'}%
                  </div>
                  <div className="text-sm text-purple-300 font-medium mt-1">Improvement</div>
                  <div className="text-xs text-gray-400 mt-1">
                    {improvement >= 25 ? 'Significant' : improvement >= 10 ? 'Moderate' : 'Minimal'}
                  </div>
                </div>
              </div>

              {/* Recommendation */}
              <div className="bg-white/5 p-4 rounded-xl border border-white/10">
                <div className="flex items-start space-x-3">
                  <div className={`p-2 rounded-full ${
                    improvement >= 25 ? 'bg-green-100' : improvement >= 10 ? 'bg-yellow-100' : 'bg-red-100'
                  }`}>
                    {improvement >= 25 ? (
                      <CheckCircle className="h-4 w-4 text-green-600" />
                    ) : improvement >= 10 ? (
                      <Info className="h-4 w-4 text-yellow-600" />
                    ) : (
                      <AlertTriangle className="h-4 w-4 text-red-600" />
                    )}
                  </div>
                  <div className="flex-1">
                    <h4 className="font-medium text-white text-sm">Analysis</h4>
                    <p className="text-sm text-gray-300 mt-1">
                      {improvement >= 25 
                        ? 'Flexible mode shows significant semantic similarity despite structural differences.'
                        : improvement >= 10
                        ? 'Moderate improvement suggests some semantic matches beyond exact matching.'
                        : 'Limited improvement indicates scenarios are either very similar structurally or quite different semantically.'
                      }
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            // Single Mode Results
            <div className="space-y-6">
              {/* Single Score Display */}
              <div className="text-center p-6 bg-white/5 rounded-xl border border-white/10">
                <div className="text-4xl font-bold text-white mb-2">
                  {DualModeMeteorService.formatScore(primaryScore)}
                </div>
                <div className="text-lg font-medium text-gray-300 mb-1">
                  {testResult.evaluation_mode === 'strict' ? 'Strict Mode' : 'Flexible Mode'} METEOR Score
                </div>
                <div className={`text-sm ${qualityInfo.color}`}>
                  Quality: {qualityInfo.level}
                </div>
              </div>

              {/* Metrics Breakdown */}
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center p-3 bg-white/5 rounded-lg">
                  <div className="text-lg font-bold text-blue-400">
                    {DualModeMeteorService.formatScore(testResult.precision || 0)}
                  </div>
                  <div className="text-xs text-gray-400">Precision</div>
                </div>
                <div className="text-center p-3 bg-white/5 rounded-lg">
                  <div className="text-lg font-bold text-green-400">
                    {DualModeMeteorService.formatScore(testResult.recall || 0)}
                  </div>
                  <div className="text-xs text-gray-400">Recall</div>
                </div>
                <div className="text-center p-3 bg-white/5 rounded-lg">
                  <div className="text-lg font-bold text-purple-400">
                    {DualModeMeteorService.formatScore(testResult.f_score || 0)}
                  </div>
                  <div className="text-xs text-gray-400">F-Score</div>
                </div>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3 mt-6">
            <button
              onClick={handleViewResults}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white rounded-xl transition-all font-medium"
            >
              <Eye className="h-4 w-4" />
              View Detailed Results
            </button>
            <button
              onClick={handleClose}
              className="px-6 py-3 bg-white/10 hover:bg-white/20 text-white rounded-xl transition-all font-medium border border-white/10"
            >
              Close
            </button>
          </div>
        </div>

        {/* Footer Info */}
        <div className="px-6 pb-6">
          <div className="text-xs text-gray-500 text-center">
            {isDualMode 
              ? 'Dual-mode evaluation provides both structural and semantic analysis'
              : testResult.evaluation_mode === 'strict'
              ? 'Strict mode focuses on exact structural and terminological matching'
              : 'Flexible mode uses semantic matching with synonyms and translations'
            }
          </div>
        </div>
      </div>
    </div>
  );
};

export default DualModeTestCompletionNotification;