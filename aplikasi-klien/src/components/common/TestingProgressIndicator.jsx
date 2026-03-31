import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { LinearProgress, CircularProgress, SpinnerProgress } from './ProgressIndicator';

/**
 * Enhanced progress indicator specifically for testing operations
 * Provides visual feedback during METEOR and Sentence-BERT testing
 */
const TestingProgressIndicator = ({
  isActive = false,
  testType = 'meteor',
  stage = 'preparing',
  progress = 0,
  estimatedTime = null,
  error = null,
  className = '',
  variant = 'detailed' // 'detailed', 'minimal', 'compact'
}) => {
  const [elapsedTime, setElapsedTime] = useState(0);
  const [currentStage, setCurrentStage] = useState(stage);
  const [hasError, setHasError] = useState(false);

  // Test stages configuration
  const testStages = {
    meteor: [
      { 
        id: 'preparing', 
        label: 'Mempersiapkan Data Pengujian', 
        description: 'Menyiapkan teks skenario untuk dianalisis',
        duration: 2, 
        icon: '📋' 
      },
      { 
        id: 'tokenizing', 
        label: 'Memecah Teks Menjadi Token', 
        description: 'Memisahkan kalimat menjadi kata-kata individual',
        duration: 3, 
        icon: '🔤' 
      },
      { 
        id: 'matching', 
        label: 'Mencocokkan Kata dengan Referensi', 
        description: 'Membandingkan setiap kata dengan skenario referensi',
        duration: 4, 
        icon: '🔍' 
      },
      { 
        id: 'calculating', 
        label: 'Menghitung Skor METEOR', 
        description: 'Menghitung precision, recall, dan f-score',
        duration: 4, 
        icon: '🎯' 
      },
      { 
        id: 'finalizing', 
        label: 'Menyelesaikan Analisis', 
        description: 'Menyusun hasil pengujian',
        duration: 2, 
        icon: '✅' 
      }
    ],
    sentence_bert: [
      { 
        id: 'preparing', 
        label: 'Mempersiapkan Data Pengujian', 
        description: 'Menyiapkan teks skenario untuk dianalisis',
        duration: 2, 
        icon: '📋' 
      },
      { 
        id: 'loading_model', 
        label: 'Memuat Model Sentence-BERT', 
        description: 'Menginisialisasi model pembelajaran mesin',
        duration: 5, 
        icon: '🧠' 
      },
      { 
        id: 'encoding', 
        label: 'Menghasilkan Representasi Semantik', 
        description: 'Mengubah teks menjadi vektor numerik',
        duration: 6, 
        icon: '🔢' 
      },
      { 
        id: 'similarity', 
        label: 'Menghitung Kemiripan Semantik', 
        description: 'Membandingkan makna kedua skenario',
        duration: 3, 
        icon: '📊' 
      },
      { 
        id: 'finalizing', 
        label: 'Menyelesaikan Analisis', 
        description: 'Menyusun hasil pengujian',
        duration: 2, 
        icon: '✅' 
      }
    ]
  };

  const stages = testStages[testType] || testStages.meteor;
  const currentStageIndex = stages.findIndex(s => s.id === currentStage);
  const currentStageData = stages[currentStageIndex] || stages[0];

  // Timer for elapsed time
  useEffect(() => {
    let interval;
    if (isActive && !hasError) {
      interval = setInterval(() => {
        setElapsedTime(prev => prev + 1);
      }, 1000);
    } else {
      setElapsedTime(0);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isActive, hasError]);

  // Handle error state
  useEffect(() => {
    if (error) {
      setHasError(true);
    } else {
      setHasError(false);
    }
  }, [error]);

  // Stage progression tracking - ensures sequential progression
  useEffect(() => {
    if (!isActive || hasError) return;

    // Find the appropriate stage based on progress percentage
    // Stages must progress sequentially: preparing → tokenizing → calculating → finalizing
    const stageThresholds = [
      { id: 'preparing', maxProgress: 10 },
      { id: 'tokenizing', maxProgress: 30 },
      { id: 'matching', maxProgress: 60 },
      { id: 'calculating', maxProgress: 85 },
      { id: 'loading_model', maxProgress: 30 },
      { id: 'encoding', maxProgress: 60 },
      { id: 'similarity', maxProgress: 85 },
      { id: 'finalizing', maxProgress: 100 }
    ];

    // Find the current stage based on progress
    let newStage = stage;
    for (const stageItem of stages) {
      const threshold = stageThresholds.find(t => t.id === stageItem.id);
      if (threshold && progress <= threshold.maxProgress) {
        newStage = stageItem.id;
        break;
      }
    }

    // Only update if stage has changed to ensure sequential progression
    if (newStage !== currentStage) {
      const currentIndex = stages.findIndex(s => s.id === currentStage);
      const newIndex = stages.findIndex(s => s.id === newStage);
      
      // Only allow forward progression (no going backwards)
      if (newIndex > currentIndex || currentIndex === -1) {
        setCurrentStage(newStage);
      }
    }
  }, [progress, isActive, stages, stage, currentStage, hasError]);

  // Format time display
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Get test type configuration
  const testConfig = {
    meteor: {
      color: 'purple',
      gradient: 'from-purple-500 to-purple-600',
      icon: '🎯',
      name: 'METEOR'
    },
    sentence_bert: {
      color: 'pink',
      gradient: 'from-pink-500 to-pink-600',
      icon: '🧠',
      name: 'Sentence-BERT'
    }
  };

  const config = testConfig[testType] || testConfig.meteor;

  if (!isActive) {
    return null;
  }

  // Compact variant - just a spinner with minimal text
  if (variant === 'compact') {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        className={`flex items-center gap-3 ${className}`}
      >
        <SpinnerProgress size="sm" variant="default" />
        <div className="text-sm text-gray-400">
          Testing with {config.name}...
        </div>
      </motion.div>
    );
  }

  // Minimal variant - progress bar with basic info
  if (variant === 'minimal') {
    return (
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        className={`space-y-3 ${className}`}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-lg">{config.icon}</span>
            <span className="text-sm font-medium text-white">
              {config.name} Testing
            </span>
          </div>
          <div className="text-xs text-gray-400">
            {formatTime(elapsedTime)}
          </div>
        </div>
        
        <LinearProgress
          value={progress}
          variant="default"
          size="md"
          animated={true}
          className="w-full"
        />
        
        <div className="text-xs text-gray-400 text-center">
          {currentStageData.label}
        </div>
      </motion.div>
    );
  }

  // Detailed variant - full progress with stages
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      className={`bg-gradient-to-br from-slate-800/50 to-slate-900/50 backdrop-blur-sm border ${hasError ? 'border-pink-500/30' : 'border-white/10'} rounded-xl p-6 ${className}`}
    >
      {/* Error Display */}
      {hasError && error && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 p-4 bg-gradient-to-r from-pink-500/10 to-pink-600/10 border border-pink-500/30 rounded-lg"
        >
          <div className="flex items-start gap-3">
            <svg className="w-5 h-5 text-pink-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div className="flex-1">
              <p className="text-pink-300 font-medium">Testing Error</p>
              <p className="text-pink-200 text-sm mt-1">{error}</p>
            </div>
          </div>
        </motion.div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${hasError ? 'from-pink-500 to-pink-600' : config.gradient} flex items-center justify-center`}>
            <span className="text-xl">{hasError ? '⚠️' : config.icon}</span>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white">
              {hasError ? 'Testing Failed' : `${config.name} Analysis`}
            </h3>
            <p className="text-sm text-gray-400">
              {hasError ? 'An error occurred during testing' : 'Processing scenario comparison'}
            </p>
          </div>
        </div>
        
        <div className="text-right">
          <div className={`text-lg font-bold ${hasError ? 'text-pink-400' : 'text-white'}`}>
            {hasError ? 'Error' : `${Math.round(progress)}%`}
          </div>
          <div className="text-xs text-gray-400">
            {formatTime(elapsedTime)}
            {estimatedTime && !hasError && ` / ~${estimatedTime}`}
          </div>
        </div>
      </div>

      {/* Progress Bar - only show if not in error state */}
      {!hasError && (
        <div className="mb-6">
          <LinearProgress
            value={progress}
            variant="default"
            size="lg"
            animated={true}
            showPercentage={false}
            className="w-full"
          />
        </div>
      )}

      {/* Current Stage - only show if not in error state */}
      {!hasError && (
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-3">
            <motion.div
              key={currentStage}
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="text-2xl"
            >
              {currentStageData.icon}
            </motion.div>
            <div className="flex-1">
              <div className="text-base font-medium text-white">
                {currentStageData.label}
              </div>
              <div className="text-sm text-gray-400">
                {currentStageData.description}
              </div>
              <div className="text-xs text-gray-500 mt-1">
                Step {currentStageIndex + 1} of {stages.length} • {Math.round(progress)}% complete
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Stage Progress - only show if not in error state */}
      {!hasError && (
        <div className="space-y-2">
          <div className="text-sm font-medium text-gray-300 mb-3">
            Progress Stages:
          </div>
          <div className="grid grid-cols-1 gap-2">
            <AnimatePresence mode="sync">
              {stages.map((stageItem, index) => {
                const isCompleted = index < currentStageIndex;
                const isCurrent = index === currentStageIndex;
                const isPending = index > currentStageIndex;
                
                return (
                  <motion.div
                    key={stageItem.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 10 }}
                    transition={{ 
                      delay: index * 0.1,
                      duration: 0.3,
                      ease: "easeOut"
                    }}
                    className={`flex items-start gap-3 p-3 rounded-lg transition-all duration-300 ${
                      isCompleted 
                        ? 'bg-purple-500/10 border border-purple-500/20' 
                        : isCurrent 
                        ? (testType === 'meteor' ? 'bg-purple-500/10 border border-purple-500/20' : 'bg-pink-500/10 border border-pink-500/20')
                        : 'bg-white/5 border border-white/10'
                    }`}
                  >
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs flex-shrink-0 transition-all duration-300 ${
                      isCompleted 
                        ? 'bg-purple-500 text-white' 
                        : isCurrent 
                        ? (testType === 'meteor' ? 'bg-purple-500 text-white' : 'bg-pink-500 text-white')
                        : 'bg-white/10 text-gray-400'
                    }`}>
                      {isCompleted ? (
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      ) : isCurrent ? (
                        <SpinnerProgress size="sm" variant="light" />
                      ) : (
                        index + 1
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className={`text-sm font-medium transition-colors duration-300 ${
                        isCompleted 
                          ? 'text-purple-400' 
                          : isCurrent 
                          ? 'text-white' 
                          : 'text-gray-400'
                      }`}>
                        {stageItem.label}
                      </div>
                      {stageItem.description && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ 
                            opacity: isCurrent ? 1 : 0.6, 
                            height: 'auto' 
                          }}
                          transition={{ duration: 0.3 }}
                          className={`text-xs mt-1 transition-colors duration-300 ${
                            isCompleted 
                              ? 'text-purple-300/70' 
                              : isCurrent 
                              ? 'text-gray-300' 
                              : 'text-gray-500'
                          }`}
                        >
                          {stageItem.description}
                        </motion.div>
                      )}
                    </div>
                    <div className="text-base flex-shrink-0">
                      {stageItem.icon}
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        </div>
      )}

      {/* Tips - only show if not in error state */}
      {!hasError && (
        <div className="mt-6 p-3 bg-purple-500/10 border border-purple-500/20 rounded-lg">
          <div className="flex items-start gap-2">
            <svg className="w-4 h-4 text-purple-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div className="text-xs text-purple-300">
              <p className="font-medium mb-1">Testing in Progress</p>
              <p className="text-purple-200">
                {testType === 'meteor' 
                  ? 'METEOR evaluates text similarity using unigram matching, stemming, and synonymy detection.'
                  : 'Sentence-BERT generates semantic embeddings to measure deep contextual similarity between scenarios.'
                }
              </p>
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
};

export default TestingProgressIndicator;