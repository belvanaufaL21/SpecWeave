import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { XMarkIcon, RocketLaunchIcon } from '@heroicons/react/24/outline';
import Button from '../common/Button';
import Modal from '../common/Modal';

const DualModeMeteorTestModal = ({ 
  isOpen, 
  onClose, 
  onStartTest,
  testData = null,
  isLoading = false 
}) => {
  const [selectedMode, setSelectedMode] = useState('standard');
  const [testConfig, setTestConfig] = useState({
    iterations: 1,
    timeout: 30000,
    includeMetrics: true,
    generateReport: true
  });

  const handleStartTest = () => {
    if (onStartTest) {
      onStartTest({
        mode: selectedMode,
        config: testConfig,
        data: testData
      });
    }
  };

  const modes = [
    {
      id: 'standard',
      name: 'Standard Test',
      description: 'Run standard Meteor test suite with basic metrics',
      icon: '🧪',
      recommended: true
    },
    {
      id: 'comprehensive',
      name: 'Comprehensive Test',
      description: 'Extended test suite with detailed analysis and reporting',
      icon: '🔬',
      recommended: false
    }
  ];

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="lg">
      <div className="bg-slate-800 rounded-xl border border-purple-500/20 max-w-2xl w-full mx-4">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-700">
          <div className="flex items-center gap-3">
            <RocketLaunchIcon className="w-6 h-6 text-purple-400" />
            <h2 className="text-xl font-semibold text-white">
              Meteor Test Configuration
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <XMarkIcon className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Mode Selection */}
          <div>
            <h3 className="text-lg font-medium text-white mb-4">Select Test Mode</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {modes.map((mode) => (
                <motion.div
                  key={mode.id}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className={`relative p-4 rounded-lg border-2 cursor-pointer transition-all ${
                    selectedMode === mode.id
                      ? 'border-purple-500 bg-purple-500/10'
                      : 'border-slate-600 bg-slate-700/50 hover:border-slate-500'
                  }`}
                  onClick={() => setSelectedMode(mode.id)}
                >
                  {mode.recommended && (
                    <div className="absolute -top-2 -right-2 bg-green-500 text-white text-xs px-2 py-1 rounded-full">
                      Recommended
                    </div>
                  )}
                  <div className="text-2xl mb-2">{mode.icon}</div>
                  <h4 className="font-medium text-white mb-1">{mode.name}</h4>
                  <p className="text-sm text-gray-400">{mode.description}</p>
                </motion.div>
              ))}
            </div>
          </div>

          {/* Configuration Options */}
          <div>
            <h3 className="text-lg font-medium text-white mb-4">Test Configuration</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Test Iterations
                </label>
                <input
                  type="number"
                  min="1"
                  max="10"
                  value={testConfig.iterations}
                  onChange={(e) => setTestConfig(prev => ({
                    ...prev,
                    iterations: parseInt(e.target.value) || 1
                  }))}
                  className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:border-purple-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Timeout (ms)
                </label>
                <input
                  type="number"
                  min="5000"
                  max="120000"
                  step="5000"
                  value={testConfig.timeout}
                  onChange={(e) => setTestConfig(prev => ({
                    ...prev,
                    timeout: parseInt(e.target.value) || 30000
                  }))}
                  className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:border-purple-500 focus:outline-none"
                />
              </div>

              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 text-gray-300">
                  <input
                    type="checkbox"
                    checked={testConfig.includeMetrics}
                    onChange={(e) => setTestConfig(prev => ({
                      ...prev,
                      includeMetrics: e.target.checked
                    }))}
                    className="rounded border-slate-600 bg-slate-700 text-purple-500 focus:ring-purple-500"
                  />
                  Include Performance Metrics
                </label>

                <label className="flex items-center gap-2 text-gray-300">
                  <input
                    type="checkbox"
                    checked={testConfig.generateReport}
                    onChange={(e) => setTestConfig(prev => ({
                      ...prev,
                      generateReport: e.target.checked
                    }))}
                    className="rounded border-slate-600 bg-slate-700 text-purple-500 focus:ring-purple-500"
                  />
                  Generate Report
                </label>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-slate-700">
          <Button
            variant="secondary"
            onClick={onClose}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button
            onClick={handleStartTest}
            disabled={isLoading}
            className="flex items-center gap-2"
          >
            {isLoading ? (
              <>
                <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                Running Test...
              </>
            ) : (
              <>
                <RocketLaunchIcon className="w-4 h-4" />
                Start Test
              </>
            )}
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default DualModeMeteorTestModal;