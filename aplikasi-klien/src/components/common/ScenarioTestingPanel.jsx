import React, { useState } from 'react';
import MeteorTestModal from '../modals/MeteorTestModal';

const ScenarioTestingPanel = ({ scenario, scenarioIndex, onTestComplete, existingResults = [] }) => {
  const [isTestModalOpen, setIsTestModalOpen] = useState(false);
  
  // Get the latest test result for this scenario
  const latestResult = existingResults.length > 0 ? existingResults[existingResults.length - 1] : null;
  
  const handleTestClick = () => {
    setIsTestModalOpen(true);
  };
  
  const handleTestComplete = (result) => {
    setIsTestModalOpen(false);
    if (onTestComplete) {
      onTestComplete(result, scenarioIndex);
    }
  };
  
  const getScoreColor = (score) => {
    if (score >= 0.7) return 'text-green-400';
    if (score >= 0.5) return 'text-yellow-400';
    return 'text-red-400';
  };
  
  const getScoreLabel = (score) => {
    if (score >= 0.7) return 'Excellent';
    if (score >= 0.5) return 'Good';
    if (score >= 0.3) return 'Fair';
    return 'Poor';
  };

  return (
    <div className="mt-4 p-4 bg-white/5 border border-white/10 rounded-xl">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-purple-500/20 border border-purple-500/30 flex items-center justify-center">
            <svg className="w-4 h-4 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 002 2h2a2 2 0 002-2z" />
            </svg>
          </div>
          <div>
            <h4 className="text-sm font-semibold text-white">METEOR Quality Testing</h4>
            <p className="text-xs text-gray-400">Test this scenario against your reference</p>
          </div>
        </div>
        
        <button
          onClick={handleTestClick}
          className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white text-sm font-medium rounded-lg transition-all duration-300 shadow-lg hover:shadow-purple-500/25 hover:-translate-y-0.5"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Test with METEOR
        </button>
      </div>
      
      {/* Show latest test result if available */}
      {latestResult && (
        <div className="flex items-center justify-between p-3 bg-white/5 border border-white/10 rounded-lg">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-400">Latest Score:</span>
              <span className={`text-sm font-bold ${getScoreColor(latestResult.meteor_score)}`}>
                {(latestResult.meteor_score * 100).toFixed(1)}%
              </span>
              <span className={`text-xs px-2 py-0.5 rounded-full ${
                latestResult.meteor_score >= 0.7 ? 'bg-green-500/20 text-green-300' :
                latestResult.meteor_score >= 0.5 ? 'bg-yellow-500/20 text-yellow-300' :
                'bg-red-500/20 text-red-300'
              }`}>
                {getScoreLabel(latestResult.meteor_score)}
              </span>
            </div>
          </div>
          
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {new Date(latestResult.evaluation_metadata?.timestamp).toLocaleString()}
          </div>
        </div>
      )}
      
      {/* Show test history count if multiple results */}
      {existingResults.length > 1 && (
        <div className="mt-2 text-xs text-gray-500 text-center">
          {existingResults.length} tests performed • 
          <button className="ml-1 text-purple-400 hover:text-purple-300 underline">
            View History
          </button>
        </div>
      )}
      
      {/* METEOR Test Modal */}
      <MeteorTestModal
        isOpen={isTestModalOpen}
        onClose={() => setIsTestModalOpen(false)}
        scenario={scenario}
        scenarioIndex={scenarioIndex}
        onTestComplete={handleTestComplete}
      />
    </div>
  );
};

export default ScenarioTestingPanel;