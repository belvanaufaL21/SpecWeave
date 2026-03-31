import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const MeteorAnalysisReport = ({ 
  groundTruthText = '', 
  generatedText = '', 
  analysisResults = null,
  className = '' 
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');

  // Mock analysis results if none provided
  const mockResults = {
    meteorScore: 0.85,
    bleuScore: 0.78,
    rougeScore: 0.82,
    semanticSimilarity: 0.88,
    qualityMetrics: {
      coherence: 0.91,
      relevance: 0.87,
      completeness: 0.83
    },
    issues: [
      { type: 'warning', message: 'Minor semantic deviation detected in scenario step 3' },
      { type: 'info', message: 'Generated text is 15% longer than ground truth' }
    ],
    recommendations: [
      'Consider refining the scenario generation model for better semantic alignment',
      'Review step 3 for potential improvements in clarity'
    ]
  };

  const results = analysisResults || mockResults;

  const getScoreColor = (score) => {
    if (score >= 0.8) return 'text-green-400';
    if (score >= 0.6) return 'text-yellow-400';
    return 'text-red-400';
  };

  const getScoreBg = (score) => {
    if (score >= 0.8) return 'bg-green-500/20 border-green-500/30';
    if (score >= 0.6) return 'bg-yellow-500/20 border-yellow-500/30';
    return 'bg-red-500/20 border-red-500/30';
  };

  const tabs = [
    { id: 'overview', name: 'Overview' },
    { id: 'comparison', name: 'Text Comparison' },
    { id: 'details', name: 'Detailed Analysis' }
  ];

  return (
    <div className={`bg-gradient-to-br from-[#020203]/80 to-black/90 backdrop-blur-sm rounded-lg border border-white/10 ${className}`}>
      {/* Header */}
      <div 
        className="flex items-center justify-between p-4 cursor-pointer hover:bg-white/5 transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-3">
          <h3 className="text-lg font-medium text-white">Meteor Analysis Report</h3>
          <div className="px-3 py-1 rounded-full text-xs font-medium border bg-purple-500/5 border-purple-500/30">
            <span className={getScoreColor(results.meteorScore)}>
              METEOR: {(results.meteorScore * 100).toFixed(1)}%
            </span>
          </div>
        </div>
        <div className="text-gray-400 text-sm">
          {isExpanded ? 'Collapse' : 'Expand'}
        </div>
      </div>

      {/* Expanded Content */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden"
          >
            <div className="border-t border-white/10">
              {/* Tab Navigation */}
              <div className="flex border-b border-white/10">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`px-4 py-3 text-sm font-medium transition-colors ${
                      activeTab === tab.id
                        ? 'text-purple-400 border-b-2 border-purple-400 bg-white/5'
                        : 'text-gray-400 hover:text-gray-300'
                    }`}
                  >
                    {tab.name}
                  </button>
                ))}
              </div>

              {/* Tab Content */}
              <div className="p-4">
                {activeTab === 'overview' && (
                  <div className="space-y-4">
                    {/* Score Grid */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      {[
                        { label: 'METEOR', value: results.meteorScore },
                        { label: 'BLEU', value: results.bleuScore },
                        { label: 'ROUGE', value: results.rougeScore },
                        { label: 'Semantic', value: results.semanticSimilarity }
                      ].map((metric) => (
                        <div key={metric.label} className="text-center">
                          <div className={`text-2xl font-bold ${getScoreColor(metric.value)}`}>
                            {(metric.value * 100).toFixed(1)}%
                          </div>
                          <div className="text-xs text-gray-400">{metric.label}</div>
                        </div>
                      ))}
                    </div>

                    {/* Quality Metrics */}
                    <div>
                      <h4 className="text-sm font-medium text-white mb-3">Quality Metrics</h4>
                      <div className="space-y-2">
                        {Object.entries(results.qualityMetrics).map(([key, value]) => (
                          <div key={key} className="flex items-center justify-between">
                            <span className="text-gray-300 capitalize">{key}</span>
                            <div className="flex items-center gap-2">
                              <div className="w-24 bg-white/10 rounded-full h-2">
                                <div 
                                  className={`h-2 rounded-full ${
                                    value >= 0.8 ? 'bg-green-500' : 
                                    value >= 0.6 ? 'bg-yellow-500' : 'bg-red-500'
                                  }`}
                                  style={{ width: `${value * 100}%` }}
                                />
                              </div>
                              <span className={`text-sm ${getScoreColor(value)}`}>
                                {(value * 100).toFixed(0)}%
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === 'comparison' && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <h4 className="text-sm font-medium text-white mb-2">Ground Truth</h4>
                        <div className="bg-white/5 rounded-lg p-3 text-sm text-gray-300 max-h-40 overflow-y-auto border border-white/10">
                          {groundTruthText || 'No ground truth text provided'}
                        </div>
                      </div>
                      <div>
                        <h4 className="text-sm font-medium text-white mb-2">Generated Text</h4>
                        <div className="bg-white/5 rounded-lg p-3 text-sm text-gray-300 max-h-40 overflow-y-auto border border-white/10">
                          {generatedText || 'No generated text provided'}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === 'details' && (
                  <div className="space-y-4">
                    {/* Issues */}
                    {results.issues && results.issues.length > 0 && (
                      <div>
                        <h4 className="text-sm font-medium text-white mb-3">Issues Detected</h4>
                        <div className="space-y-2">
                          {results.issues.map((issue, index) => (
                            <div key={index} className="flex items-start gap-2 p-2 bg-white/5 rounded border border-white/10">
                              <span className="text-sm text-gray-300">{issue.message}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Recommendations */}
                    {results.recommendations && results.recommendations.length > 0 && (
                      <div>
                        <h4 className="text-sm font-medium text-white mb-3">Recommendations</h4>
                        <div className="space-y-2">
                          {results.recommendations.map((rec, index) => (
                            <div key={index} className="flex items-start gap-2 p-2 bg-white/5 rounded border border-white/10">
                              <span className="text-sm text-gray-300">{rec}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default MeteorAnalysisReport;