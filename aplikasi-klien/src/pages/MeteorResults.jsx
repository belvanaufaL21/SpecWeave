import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';

const MeteorResults = () => {
  const { testId } = useParams();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-gray-300 hover:text-white transition-colors"
          >
            <ArrowLeftIcon className="w-5 h-5" />
            Back
          </button>
          <h1 className="text-3xl font-bold text-white">
            Meteor Test Results
          </h1>
        </div>

        {/* Content */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-slate-800/50 backdrop-blur-sm rounded-xl border border-purple-500/20 p-6"
        >
          <div className="text-center py-12">
            <div className="text-6xl mb-4">🚀</div>
            <h2 className="text-2xl font-semibold text-white mb-4">
              Test Results for ID: {testId}
            </h2>
            <p className="text-gray-400 mb-8">
              Meteor test results will be displayed here once the feature is fully implemented.
            </p>
            <div className="bg-slate-700/50 rounded-lg p-4 text-left max-w-2xl mx-auto">
              <h3 className="text-lg font-medium text-white mb-2">Coming Soon:</h3>
              <ul className="text-gray-300 space-y-1">
                <li>• Test execution results</li>
                <li>• Performance metrics</li>
                <li>• Quality analysis</li>
                <li>• Detailed reports</li>
              </ul>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default MeteorResults;