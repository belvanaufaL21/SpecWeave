import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { formatTime } from '../../utils/localization';
import { useLoading, LOADING_TYPES } from '../../contexts/LoadingContext';
import { AdaptiveProgress } from '../common/ProgressIndicator';

const TypingIndicator = ({ 
  loadingType = LOADING_TYPES.CHAT_GENERATION,
  customMessage = null,
  showProgress = true,
  variant = 'default',
  estimatedTime = null
}) => {
  const { getLoadingState } = useLoading();
  const [currentPhase, setCurrentPhase] = useState(0);
  const [dots, setDots] = useState('');
  const [elapsedTime, setElapsedTime] = useState(0);

  const loadingState = getLoadingState(loadingType);

  // Enhanced phases of AI thinking process with Indonesian text
  const phases = [
    { text: 'AI sedang menganalisis permintaan Anda', icon: '🔍', duration: 3000 },
    { text: 'Memproses konteks dan informasi', icon: '⚙️', duration: 4000 },
    { text: 'Menyusun skenario Gherkin', icon: '📝', duration: 5000 },
    { text: 'Melakukan validasi dan penyempurnaan', icon: '✨', duration: 3000 },
    { text: 'Hampir selesai...', icon: '🎯', duration: 2000 }
  ];

  // Get display message with enhanced context
  const getCurrentPhase = () => phases[currentPhase] || phases[0];
  const displayMessage = customMessage || loadingState.message || getCurrentPhase().text;

  // Animate dots with different patterns
  useEffect(() => {
    const patterns = ['', '.', '..', '...', '....'];
    let patternIndex = 0;
    
    const interval = setInterval(() => {
      setDots(patterns[patternIndex]);
      patternIndex = (patternIndex + 1) % patterns.length;
    }, 400);

    return () => clearInterval(interval);
  }, []);

  // Enhanced phase progression with realistic timing
  useEffect(() => {
    if (customMessage || loadingState.message) return;
    
    const currentPhaseDuration = getCurrentPhase().duration;
    const interval = setInterval(() => {
      setCurrentPhase(prev => (prev + 1) % phases.length);
    }, currentPhaseDuration);

    return () => clearInterval(interval);
  }, [currentPhase, customMessage, loadingState.message]);

  // Track elapsed time for better progress estimation
  useEffect(() => {
    const startTime = loadingState.startTime || Date.now();
    
    const interval = setInterval(() => {
      setElapsedTime(Date.now() - startTime);
    }, 100);

    return () => clearInterval(interval);
  }, [loadingState.startTime]);

  // Enhanced progress calculation
  const getProgressPercentage = () => {
    const totalEstimatedTime = estimatedTime || loadingState.estimatedTime || 15000; // 15 seconds default
    const baseProgress = Math.min((elapsedTime / totalEstimatedTime) * 100, 95);
    
    // Add phase-based progress for more realistic feel
    const phaseProgress = (currentPhase / phases.length) * 100;
    const combinedProgress = (baseProgress * 0.7) + (phaseProgress * 0.3);
    
    return Math.min(combinedProgress, 95);
  };

  // Get estimated remaining time
  const getRemainingTime = () => {
    const totalTime = estimatedTime || loadingState.estimatedTime || 15000;
    const remaining = Math.max(0, totalTime - elapsedTime);
    return Math.ceil(remaining / 1000);
  };

  return (
    <>
      <style dangerouslySetInnerHTML={{
        __html: `
          @keyframes pulse-ring {
            0% { transform: scale(1); opacity: 1; }
            100% { transform: scale(1.5); opacity: 0; }
          }
          .pulse-ring {
            animation: pulse-ring 2s ease-out infinite;
          }
          @keyframes thinking-dots {
            0%, 20% { opacity: 0.3; }
            50% { opacity: 1; }
            100% { opacity: 0.3; }
          }
          .thinking-dot-1 { animation: thinking-dots 1.4s infinite; }
          .thinking-dot-2 { animation: thinking-dots 1.4s infinite 0.2s; }
          .thinking-dot-3 { animation: thinking-dots 1.4s infinite 0.4s; }
        `
      }} />
      
      <motion.div 
        className="flex justify-start mb-6"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        transition={{ duration: 0.3 }}
      >
        <div className="flex items-center gap-3">
          {/* Avatar */}
          <div className="relative w-10 h-10 flex-shrink-0">
            <motion.div 
              className="w-10 h-10 rounded-full flex items-center justify-center relative z-10 overflow-hidden"
              style={{ 
                backgroundColor: '#120C18',
                border: '2px solid #2C1A43'
              }}
              animate={{ 
                boxShadow: [
                  '0 0 0 0 rgba(44, 26, 67, 0.4)',
                  '0 0 0 10px rgba(44, 26, 67, 0)',
                  '0 0 0 0 rgba(44, 26, 67, 0)'
                ]
              }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              <motion.img 
                src="/logo.png"
                alt="SpecWeave"
                className="w-6 h-6 rounded-md"
                style={{ filter: 'brightness(0) saturate(100%) invert(100%)' }}
                animate={{ scale: [1, 1.05, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
              />
            </motion.div>
            
            {/* Animated rings */}
            <div className="absolute inset-0 rounded-full border-2 pulse-ring" style={{ borderColor: 'rgba(44, 26, 67, 0.3)' }} />
            <div className="absolute inset-0 rounded-full border animate-pulse" style={{ borderColor: 'rgba(44, 26, 67, 0.4)', animationDelay: '0.5s' }} />
          </div>

          {/* Simple Loading Dots */}
          <div className="flex items-center gap-2">
            {/* Animated Dots */}
            <motion.div 
              className="w-2.5 h-2.5 rounded-full thinking-dot-1"
              style={{ backgroundColor: '#120C18' }}
            />
            <motion.div 
              className="w-2.5 h-2.5 rounded-full thinking-dot-2"
              style={{ backgroundColor: '#44273D' }}
            />
            <motion.div 
              className="w-2.5 h-2.5 rounded-full thinking-dot-3"
              style={{ backgroundColor: '#C27AFF' }}
            />
          </div>
        </div>
      </motion.div>
    </>
  );
};

export default TypingIndicator;