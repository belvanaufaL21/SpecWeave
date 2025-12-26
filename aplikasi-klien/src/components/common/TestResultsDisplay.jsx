import React, { useState, useEffect } from 'react';

const TestResultsDisplay = ({ result, generatedScenario, referenceScenario, onBackToInput }) => {
  const [activeTab, setActiveTab] = useState('overview');

  // Debug logging
  useEffect(() => {
    console.log('🔍 TestResultsDisplay received result:', result);
  }, [result]);

  // Safety check for result
  if (!result) {
    return (
      <div className="flex flex-col h-full">
        <div className="p-6 border-b border-white/10">
          <button
            onClick={onBackToInput}
            className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Input
          </button>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full mx-auto mb-4"></div>
            <p className="text-gray-400">Loading test results...</p>
          </div>
        </div>
      </div>
    );
  }

  const getScoreColor = (score) => {
    if (!score && score !== 0) return 'text-gray-400';
    if (score >= 0.7) return 'text-green-400';
    if (score >= 0.5) return 'text-yellow-400';
    return 'text-red-400';
  };

  const getScoreGradient = (score) => {
    if (!score && score !== 0) return 'from-gray-500 to-gray-600';
    if (score >= 0.7) return 'from-green-500 to-emerald-500';
    if (score >= 0.5) return 'from-yellow-500 to-orange-500';
    return 'from-red-500 to-pink-500';
  };

  const getScoreLabel = (score) => {
    if (!score && score !== 0) return 'Tidak Diketahui';
    if (score >= 0.7) return 'Sangat Baik';
    if (score >= 0.5) return 'Baik';
    if (score >= 0.3) return 'Cukup';
    return 'Perlu Perbaikan';
  };

  const formatScenarioText = (scenario) => {
    if (typeof scenario === 'string') {
      return scenario;
    }
    return `Given ${scenario.given}\nWhen ${scenario.when}\nThen ${scenario.then}`;
  };

  const renderWordAlignment = () => {
    if (!result.word_alignment) return null;

    return (
      <div className="space-y-4">
        <h4 className="text-lg font-semibold text-white">Word-Level Analysis</h4>
        <div className="grid grid-cols-1 gap-3">
          {result.word_alignment.map((alignment, index) => (
            <div key={index} className="flex items-center justify-between p-3 bg-white/5 border border-white/10 rounded-lg">
              <div className="flex items-center gap-4">
                <span className="text-sm font-mono text-gray-300 min-w-[100px]">
                  {alignment.generated}
                </span>
                <div className="flex items-center gap-2">
                  <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </div>
                <span className="text-sm font-mono text-gray-300 min-w-[100px]">
                  {alignment.reference || 'No match'}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <div className={`w-3 h-3 rounded-full ${
                  alignment.similarity === 1.0 ? 'bg-green-500' :
                  alignment.similarity > 0.7 ? 'bg-yellow-500' :
                  alignment.similarity > 0.3 ? 'bg-orange-500' :
                  'bg-red-500'
                }`}></div>
                <span className="text-xs text-gray-400 min-w-[40px]">
                  {(alignment.similarity * 100).toFixed(0)}%
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderImprovementSuggestions = () => {
    if (!result.improvement_suggestions || result.improvement_suggestions.length === 0) {
      return (
        <div className="text-center py-8 text-gray-400">
          <svg className="w-12 h-12 mx-auto mb-3 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p>No specific improvements needed. Great work!</p>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        {result.improvement_suggestions.map((suggestion, index) => (
          <div key={index} className={`p-4 border rounded-lg ${
            suggestion.priority === 'high' ? 'border-red-500/30 bg-red-500/10' :
            suggestion.priority === 'medium' ? 'border-yellow-500/30 bg-yellow-500/10' :
            'border-blue-500/30 bg-blue-500/10'
          }`}>
            <div className="flex items-start gap-3">
              <div className={`w-6 h-6 rounded-full flex items-center justify-center mt-0.5 ${
                suggestion.priority === 'high' ? 'bg-red-500' :
                suggestion.priority === 'medium' ? 'bg-yellow-500' :
                'bg-blue-500'
              }`}>
                <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="flex-1">
                <h5 className="font-semibold text-white mb-1">{suggestion.title}</h5>
                <p className="text-sm text-gray-300 mb-3">{suggestion.description}</p>
                {suggestion.actionable_steps && (
                  <ul className="space-y-1">
                    {suggestion.actionable_steps.map((step, stepIndex) => (
                      <li key={stepIndex} className="text-xs text-gray-400 flex items-start gap-2">
                        <span className="text-purple-400 mt-1">•</span>
                        <span>{step}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full">
      {/* Back Button */}
      <div className="p-6 border-b border-white/10">
        <button
          onClick={onBackToInput}
          className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Input
        </button>
      </div>

      {/* Main Results */}
      <div className="flex-1 overflow-y-auto p-6">
        {/* Overall Score */}
        <div className="text-center mb-8">
          <div className="relative w-32 h-32 mx-auto mb-4">
            <svg className="w-32 h-32 transform -rotate-90" viewBox="0 0 120 120">
              <circle
                cx="60"
                cy="60"
                r="50"
                stroke="currentColor"
                strokeWidth="8"
                fill="none"
                className="text-white/10"
              />
              <circle
                cx="60"
                cy="60"
                r="50"
                stroke="url(#scoreGradient)"
                strokeWidth="8"
                fill="none"
                strokeLinecap="round"
                strokeDasharray={`${(result.meteor_score || 0) * 314} 314`}
                className="transition-all duration-1000"
              />
              <defs>
                <linearGradient id="scoreGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#8b5cf6" />
                  <stop offset="100%" stopColor="#ec4899" />
                </linearGradient>
              </defs>
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center">
                <div className={`text-2xl font-bold ${getScoreColor(result.meteor_score)}`}>
                  {result.meteor_score ? (result.meteor_score * 100).toFixed(1) : '0.0'}%
                </div>
                <div className="text-xs text-gray-400">METEOR</div>
              </div>
            </div>
          </div>
          <h3 className="text-xl font-bold text-white mb-2">
            {getScoreLabel(result.meteor_score)} Quality
          </h3>
          <p className="text-gray-400 text-sm">
            Evaluation completed in {result.evaluation_metadata?.evaluation_time_ms || 'N/A'}ms
          </p>
        </div>

        {/* Component Breakdown */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          <div className="text-center p-4 bg-white/5 border border-white/10 rounded-lg">
            <div className="text-2xl font-bold text-blue-400 mb-1">
              {result.precision ? (result.precision * 100).toFixed(1) : '0.0'}%
            </div>
            <div className="text-sm text-gray-400">Precision</div>
            <div className="text-xs text-gray-500 mt-1">
              Accuracy of matches
            </div>
          </div>
          <div className="text-center p-4 bg-white/5 border border-white/10 rounded-lg">
            <div className="text-2xl font-bold text-green-400 mb-1">
              {result.recall ? (result.recall * 100).toFixed(1) : '0.0'}%
            </div>
            <div className="text-sm text-gray-400">Recall</div>
            <div className="text-xs text-gray-500 mt-1">
              Coverage of reference
            </div>
          </div>
          <div className="text-center p-4 bg-white/5 border border-white/10 rounded-lg">
            <div className="text-2xl font-bold text-purple-400 mb-1">
              {result.f_score ? (result.f_score * 100).toFixed(1) : '0.0'}%
            </div>
            <div className="text-sm text-gray-400">F-Score</div>
            <div className="text-xs text-gray-500 mt-1">
              Harmonic mean
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="border-b border-white/10 mb-6">
          <div className="flex space-x-8">
            {[
              { id: 'overview', label: 'Overview', icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 002 2h2a2 2 0 002-2z' },
              { id: 'comparison', label: 'Comparison', icon: 'M8 7h12m0 0V4m0 3l-4-4M4 17h12m0 0v3m0-3l-4 4' },
              { id: 'suggestions', label: 'Suggestions', icon: 'M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z' }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-3 px-1 border-b-2 font-medium text-sm transition-colors flex items-center gap-2 ${
                  activeTab === tab.id
                    ? 'border-purple-500 text-purple-300'
                    : 'border-transparent text-gray-400 hover:text-gray-300'
                }`}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={tab.icon} />
                </svg>
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Tab Content */}
        <div className="space-y-6">
          {activeTab === 'overview' && (
            <div className="space-y-6">
              <div>
                <h4 className="text-lg font-semibold text-white mb-4">Detailed Breakdown</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-3">
                    <div className="flex justify-between items-center p-3 bg-white/5 border border-white/10 rounded-lg">
                      <span className="text-sm text-gray-400">Exact Matches</span>
                      <span className="text-sm font-semibold text-green-400">
                        {result.detailed_breakdown?.exact_matches || 0}
                      </span>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-white/5 border border-white/10 rounded-lg">
                      <span className="text-sm text-gray-400">Similar Matches</span>
                      <span className="text-sm font-semibold text-yellow-400">
                        {result.detailed_breakdown?.similar_matches || 0}
                      </span>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-white/5 border border-white/10 rounded-lg">
                      <span className="text-sm text-gray-400">No Matches</span>
                      <span className="text-sm font-semibold text-red-400">
                        {result.detailed_breakdown?.no_matches || 0}
                      </span>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center p-3 bg-white/5 border border-white/10 rounded-lg">
                      <span className="text-sm text-gray-400">Match Rate</span>
                      <span className="text-sm font-semibold text-blue-400">
                        {((result.detailed_breakdown?.match_rate || 0) * 100).toFixed(1)}%
                      </span>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-white/5 border border-white/10 rounded-lg">
                      <span className="text-sm text-gray-400">Coverage</span>
                      <span className="text-sm font-semibold text-purple-400">
                        {((result.detailed_breakdown?.coverage || 0) * 100).toFixed(1)}%
                      </span>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-white/5 border border-white/10 rounded-lg">
                      <span className="text-sm text-gray-400">Fragmentation</span>
                      <span className="text-sm font-semibold text-orange-400">
                        {result.fragmentation_penalty?.toFixed(3) || 'N/A'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'comparison' && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <h4 className="text-lg font-semibold text-white mb-3">Generated Scenario</h4>
                  <div className="p-4 bg-white/5 border border-white/10 rounded-lg">
                    <pre className="text-sm text-gray-300 whitespace-pre-wrap font-mono">
                      {formatScenarioText(generatedScenario)}
                    </pre>
                  </div>
                </div>
                <div>
                  <h4 className="text-lg font-semibold text-white mb-3">Reference Scenario</h4>
                  <div className="p-4 bg-white/5 border border-white/10 rounded-lg">
                    <pre className="text-sm text-gray-300 whitespace-pre-wrap font-mono">
                      {referenceScenario}
                    </pre>
                  </div>
                </div>
              </div>
              {renderWordAlignment()}
            </div>
          )}

          {activeTab === 'suggestions' && (
            <div>
              <h4 className="text-lg font-semibold text-white mb-4">Improvement Suggestions</h4>
              {renderImprovementSuggestions()}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TestResultsDisplay;