import React, { useState, useEffect, useCallback, useMemo, memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Modal from '../common/Modal';
import ComparisonTable from '../common/ComparisonTable';
import TestingProgressIndicator from '../common/TestingProgressIndicator';
import useTesting from '../../hooks/useTesting';
import useTestingStatePersistence from '../../hooks/useTestingStatePersistence';
import TestingService from '../../services/testingService';

const TestingModal = memo(({ 
  isOpen, 
  onClose, 
  scenarioText = '', 
  scenarioId = null,
  initialTab = 'meteor',
  initialReferenceScenario = '',
  onSubmitTest,
  loading = false 
}) => {
  // ALL HOOKS MUST BE CALLED UNCONDITIONALLY - NO EARLY RETURNS BEFORE THIS POINT
  
  // Use testing hook
  const { 
    loading: testingLoading, 
    error: testingError, 
    submitTest, 
    clearError 
  } = useTesting();

  // Use state persistence hook
  const {
    saveFormData,
    getFormData,
    saveModalState,
    getModalState,
    clearFormData,
    clearModalState
  } = useTestingStatePersistence();

  // Stable IDs that don't depend on activeTab
  const stableIds = useMemo(() => ({
    formId: `testing-form-${scenarioId}`,
    modalId: `testing-modal-${scenarioId}`
  }), [scenarioId]);

  // Helper function to sanitize state values (prevent "undefined" strings)
  const sanitizeValue = useCallback((value) => {
    if (value === null || value === undefined || value === 'undefined' || value === 'not defined') {
      return '';
    }
    return String(value);
  }, []);

  // Initialize state with explicit default values
  const initializeState = useCallback(() => {
    return {
      testScenario: sanitizeValue(scenarioText),
      referenceScenario: sanitizeValue(initialReferenceScenario),
      activeTab: initialTab || 'meteor',
      validationError: '',
      suggestedReferences: [],
      showSuggestions: false,
      loadingReferences: false,
      testProgress: 0,
      testStage: 'preparing',
      showProgress: false
    };
  }, [scenarioText, initialReferenceScenario, initialTab, sanitizeValue]);

  // State management with robust initialization
  const [activeTab, setActiveTab] = useState(() => initializeState().activeTab);
  const [referenceScenario, setReferenceScenario] = useState(() => initializeState().referenceScenario);
  const [validationError, setValidationError] = useState('');
  const [suggestedReferences, setSuggestedReferences] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [loadingReferences, setLoadingReferences] = useState(false);
  const [testProgress, setTestProgress] = useState(0);
  const [testStage, setTestStage] = useState('preparing');
  const [showProgress, setShowProgress] = useState(false);

  // Combined loading state
  const isLoading = loading || testingLoading;

  // Load saved state when modal opens
  useEffect(() => {
    if (!isOpen || !scenarioId) return;

    const savedModalState = getModalState(stableIds.modalId);
    if (savedModalState && savedModalState.activeTab) {
      const validTabs = ['meteor', 'sentence_bert'];
      if (validTabs.includes(savedModalState.activeTab)) {
        setActiveTab(savedModalState.activeTab);
      }
    }

    const savedFormData = getFormData(stableIds.formId);
    if (savedFormData && savedFormData.referenceScenario) {
      // Sanitize loaded data to prevent "undefined" strings
      const sanitizedReference = sanitizeValue(savedFormData.referenceScenario);
      if (sanitizedReference) {
        setReferenceScenario(sanitizedReference);
      }
    }

    setValidationError('');
    setShowSuggestions(false);
    setShowProgress(false);
    setTestProgress(0);
    setTestStage('preparing');
    clearError();
  }, [isOpen, scenarioId, stableIds.modalId, stableIds.formId, getModalState, getFormData, clearError, sanitizeValue]);

  // Save modal state changes
  useEffect(() => {
    if (!isOpen) return;

    saveModalState(stableIds.modalId, {
      activeTab,
      scenarioId,
      lastUpdated: Date.now()
    });
  }, [activeTab, isOpen, stableIds.modalId, scenarioId, saveModalState]);

  // Save form data changes
  useEffect(() => {
    if (!isOpen) return;

    saveFormData(stableIds.formId, {
      referenceScenario,
      activeTab,
      scenarioId,
      lastUpdated: Date.now()
    });
  }, [referenceScenario, activeTab, isOpen, stableIds.formId, scenarioId, saveFormData]);

  // Load reference data when modal opens
  useEffect(() => {
    if (!isOpen || !scenarioId) return;
    
    let isMounted = true;
    
    const loadData = async () => {
      setLoadingReferences(true);
      try {
        const suggestions = await TestingService.getSuggestedReferences(scenarioText, 5);
        if (isMounted) {
          setSuggestedReferences(suggestions);
        }
      } catch (error) {
        console.log('Could not load suggested references:', error.message);
        if (isMounted) {
          setSuggestedReferences([]);
        }
      } finally {
        if (isMounted) {
          setLoadingReferences(false);
        }
      }
    };

    loadData();
    
    return () => {
      isMounted = false;
    };
  }, [isOpen, scenarioId, scenarioText]);

  // Cleanup when modal closes
  useEffect(() => {
    if (!isOpen) {
      clearFormData(stableIds.formId);
      clearModalState(stableIds.modalId);
    }
  }, [isOpen, stableIds.formId, stableIds.modalId, clearFormData, clearModalState]);

  // Validation logic
  const isFormValid = useCallback(() => {
    // Check for "undefined" or "not defined" strings in test scenario
    const sanitizedTestScenario = sanitizeValue(scenarioText);
    if (!sanitizedTestScenario || sanitizedTestScenario === 'undefined' || sanitizedTestScenario === 'not defined') {
      setValidationError('Skenario uji tidak boleh kosong atau tidak terdefinisi');
      return false;
    }
    
    // Check for "undefined" or "not defined" strings in reference scenario
    const trimmedReference = referenceScenario.trim();
    if (!trimmedReference || trimmedReference === 'undefined' || trimmedReference === 'not defined') {
      setValidationError('Skenario referensi harus diisi dan tidak boleh "undefined"');
      return false;
    }
    
    const hasGherkinKeywords = /\b(given|when|then|diberikan|ketika|maka)\b/i.test(trimmedReference);
    if (!hasGherkinKeywords) {
      setValidationError('Disarankan menggunakan format Gherkin (Given/When/Then atau Diberikan/Ketika/Maka)');
      return true;
    }
    
    setValidationError('');
    return true;
  }, [referenceScenario, scenarioText, sanitizeValue]);

  // Handle tab switching with state preservation
  const handleTabSwitch = useCallback((tab) => {
    // Save current state with explicit values (no undefined)
    if (scenarioId) {
      saveModalState(stableIds.modalId, {
        activeTab: tab,
        scenarioId,
        lastUpdated: Date.now()
      });
      
      saveFormData(stableIds.formId, {
        referenceScenario: sanitizeValue(referenceScenario),
        activeTab: tab,
        scenarioId,
        lastUpdated: Date.now()
      });
    }
    
    // Update active tab
    setActiveTab(tab);
    setValidationError('');
    
    // Load cached result for the new tab if available
    if (scenarioId) {
      const cachedResult = TestingService.getCachedTestResult(scenarioId, tab);
      if (cachedResult) {
        console.log(`✅ Loaded cached ${tab} result for scenario ${scenarioId}`);
        // Result is available for display if needed
      } else {
        console.log(`ℹ️ No cached result for ${tab} - will show empty state`);
        // Clear previous result display if switching to a test type with no cached result
      }
    }
  }, [scenarioId, referenceScenario, sanitizeValue, saveModalState, saveFormData, stableIds.modalId, stableIds.formId]);

  // Load data from previous test type (FIX for "not defined" issue)
  const loadDataFromTestType = useCallback((sourceType) => {
    if (!scenarioId) {
      setValidationError('ID skenario tidak tersedia');
      return;
    }

    // Get cached result for the source test type
    const sourceResult = TestingService.getCachedTestResult(scenarioId, sourceType);
    
    if (!sourceResult) {
      setValidationError(`Tidak ada data ${sourceType.toUpperCase()} yang tersedia. Silakan lakukan pengujian ${sourceType.toUpperCase()} terlebih dahulu.`);
      return;
    }
    
    // Validate that result has the required data
    const generatedText = sourceResult.generatedText || sourceResult.testScenario;
    const referenceText = sourceResult.referenceText || sourceResult.referenceScenario;
    
    // Check for valid generated text
    const sanitizedGenerated = sanitizeValue(generatedText);
    if (!sanitizedGenerated || sanitizedGenerated === 'undefined' || sanitizedGenerated === 'not defined') {
      setValidationError(`Data skenario uji dari ${sourceType.toUpperCase()} tidak valid`);
      return;
    }
    
    // Check for valid reference text
    const sanitizedReference = sanitizeValue(referenceText);
    if (!sanitizedReference || sanitizedReference === 'undefined' || sanitizedReference === 'not defined') {
      setValidationError(`Data skenario referensi dari ${sourceType.toUpperCase()} tidak valid`);
      return;
    }
    
    // Load the data
    setReferenceScenario(sanitizedReference);
    
    // Clear any previous errors
    setValidationError('');
    
    console.log(`✅ Loaded data from ${sourceType} test type`);
  }, [scenarioId, sanitizeValue]);

  // Handle form submission
  const handleSubmitTest = useCallback(async () => {
    if (!isFormValid()) {
      return;
    }

    let progressEventSource = null;
    let progressSimulationActive = false;

    try {
      setValidationError('');
      clearError();
      
      setShowProgress(true);
      setTestProgress(0);
      setTestStage('preparing');

      const progressStages = activeTab === 'meteor' 
        ? [
            { stage: 'preparing', duration: 500, progress: 10 },
            { stage: 'tokenizing', duration: 800, progress: 30 },
            { stage: 'calculating', duration: 2000, progress: 80 },
            { stage: 'finalizing', duration: 500, progress: 100 }
          ]
        : [
            { stage: 'preparing', duration: 500, progress: 10 },
            { stage: 'loading_model', duration: 1200, progress: 35 },
            { stage: 'encoding', duration: 1500, progress: 70 },
            { stage: 'similarity', duration: 800, progress: 90 },
            { stage: 'finalizing', duration: 400, progress: 100 }
          ];

      // Function to simulate progress (fallback)
      const simulateProgress = async () => {
        progressSimulationActive = true;
        let currentProgress = 0;
        
        for (const { stage, duration, progress } of progressStages) {
          if (!progressSimulationActive) break;
          
          setTestStage(stage);
          
          const startProgress = currentProgress;
          const targetProgress = progress;
          const steps = 30; // Increased from 20 to 30 for smoother animation
          const stepDuration = duration / steps;
          
          // Smooth animation with ease-out cubic easing
          for (let i = 0; i <= steps; i++) {
            if (!progressSimulationActive) break;
            
            // Ease-out cubic: 1 - (1 - t)^3
            const t = i / steps;
            const eased = 1 - Math.pow(1 - t, 3);
            const stepProgress = startProgress + (targetProgress - startProgress) * eased;
            setTestProgress(stepProgress);
            
            if (i < steps) {
              await new Promise(resolve => setTimeout(resolve, stepDuration));
            }
          }
          
          currentProgress = progress;
        }
      };

      // Function to subscribe to backend progress events (if available)
      const subscribeToProgressEvents = (testId) => {
        try {
          // Attempt to connect to SSE endpoint for real-time progress
          const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5003/api';
          const eventSource = new EventSource(`${apiUrl}/testing/${testId}/progress`);
          
          eventSource.onmessage = (event) => {
            try {
              const data = JSON.parse(event.data);
              
              // Stop simulation if backend provides progress
              progressSimulationActive = false;
              
              if (data.stage) {
                setTestStage(data.stage);
              }
              
              if (typeof data.progress === 'number') {
                setTestProgress(data.progress);
              }
            } catch (parseError) {
              console.warn('Failed to parse progress event:', parseError);
            }
          };
          
          eventSource.onerror = (error) => {
            console.log('Progress event stream error, falling back to simulation:', error);
            eventSource.close();
            progressEventSource = null;
            
            // Fallback to simulation if SSE fails
            if (!progressSimulationActive) {
              simulateProgress();
            }
          };
          
          progressEventSource = eventSource;
          return eventSource;
        } catch (error) {
          console.log('Backend progress events not available, using simulation:', error);
          return null;
        }
      };

      // Start progress simulation immediately (will be stopped if backend events work)
      const simulationPromise = simulateProgress();

      const testRequest = {
        scenarioId,
        testType: activeTab,
        generatedText: scenarioText,
        referenceText: referenceScenario.trim()
      };

      const result = await submitTest(testRequest);
      
      // Stop progress simulation
      progressSimulationActive = false;
      
      // Try to subscribe to backend progress events if result has a test ID
      if (result && result.id) {
        subscribeToProgressEvents(result.id);
      }
      
      if (!result) {
        throw new Error('Test submission returned no result');
      }
      
      // Ensure progress reaches 100% before hiding
      setTestProgress(100);
      setTestStage('finalizing');
      
      // Brief pause to show completion
      await new Promise(resolve => setTimeout(resolve, 500));
      
      try {
        await TestingService.saveScenarioReference({
          referenceText: referenceScenario.trim(),
          description: `Reference for scenario ${scenarioId}`,
          tags: [activeTab, 'auto-saved']
        });
      } catch (saveError) {
        console.warn('Failed to save reference scenario:', saveError.message);
      }
      
      // Hide loading indicator with smooth transition
      setShowProgress(false);
      
      // Brief delay before showing results
      await new Promise(resolve => setTimeout(resolve, 200));
      
      if (onSubmitTest) {
        await onSubmitTest(result);
      }
      
      onClose();
    } catch (error) {
      console.error('Test submission failed:', error);
      
      // Keep progress indicator visible to show error
      const errorMessage = error.message || 'Gagal menjalankan pengujian. Silakan coba lagi.';
      setValidationError(errorMessage);
      
      // Stop progress animation but keep indicator visible
      progressSimulationActive = false;
      
      // Wait a moment to show the error in the progress indicator
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // Then hide the progress indicator
      setShowProgress(false);
    } finally {
      // Cleanup
      progressSimulationActive = false;
      
      if (progressEventSource) {
        progressEventSource.close();
      }
      
      // Reset progress state
      setShowProgress(false);
      setTestProgress(0);
      setTestStage('preparing');
    }
  }, [isFormValid, clearError, activeTab, scenarioId, scenarioText, referenceScenario, submitTest, onSubmitTest, onClose]);

  // Handle reference scenario input change
  const handleReferenceChange = useCallback((e) => {
    setReferenceScenario(e.target.value);
    if (validationError) {
      setValidationError('');
    }
    if (testingError) {
      clearError();
    }
  }, [validationError, testingError, clearError]);

  // Handle suggestion selection
  const handleSuggestionSelect = useCallback((suggestion) => {
    try {
      const referenceText = suggestion.reference_text || suggestion.referenceText || suggestion.text || '';
      
      if (!referenceText) {
        console.warn('No reference text found in suggestion:', suggestion);
        setValidationError('Saran referensi tidak valid');
        return;
      }
      
      setReferenceScenario(referenceText);
      setShowSuggestions(false);
      
      if (validationError) {
        setValidationError('');
      }
      if (testingError) {
        clearError();
      }
    } catch (error) {
      console.error('Error selecting suggestion:', error);
      setValidationError('Gagal memilih saran referensi');
    }
  }, [validationError, testingError, clearError]);

  // Tab configuration
  const tabs = useMemo(() => [
    {
      id: 'meteor',
      label: 'METEOR',
      description: 'Evaluasi berdasarkan unigram matching, stemming, dan synonymy',
      icon: '🎯',
      color: 'purple'
    },
    {
      id: 'sentence_bert',
      label: 'Sentence-BERT',
      description: 'Evaluasi berdasarkan semantic similarity menggunakan transformer',
      icon: '🧠',
      color: 'pink',
      customBg: '#160D14',
      customText: '#FF7AD0'
    }
  ], []);

  const activeTabConfig = useMemo(() => 
    tabs.find(tab => tab.id === activeTab), 
    [tabs, activeTab]
  );

  // Display error
  const displayError = validationError || testingError;

  // Modal footer
  const modalFooter = useMemo(() => (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-0">
      <div className="flex items-center gap-2 text-sm text-gray-400 order-2 sm:order-1">
        <div className={activeTab === 'meteor' ? 'w-2 h-2 rounded-full bg-purple-400' : 'w-2 h-2 rounded-full bg-pink-400'}></div>
        <span className="hidden sm:inline">Metode:</span>
        <span>{activeTabConfig?.label}</span>
      </div>
      
      <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 order-1 sm:order-2">
        <button
          onClick={onClose}
          disabled={isLoading}
          className="px-3 sm:px-4 py-2 text-gray-400 hover:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm sm:text-base"
        >
          Batal
        </button>
        
        <button
          onClick={handleSubmitTest}
          disabled={!referenceScenario.trim() || isLoading}
          className="px-4 sm:px-6 py-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white rounded-lg transition-all font-medium flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:from-gray-600 disabled:to-gray-600 text-sm sm:text-base justify-center"
        >
          {isLoading ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              <span className="hidden sm:inline">Memproses...</span>
              <span className="sm:hidden">...</span>
            </>
          ) : (
            <>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="hidden sm:inline">Mulai Test</span>
              <span className="sm:hidden">Test</span>
            </>
          )}
        </button>
      </div>
    </div>
  ), [activeTabConfig, isLoading, referenceScenario, onClose, handleSubmitTest]);

  // EARLY RETURN AFTER ALL HOOKS
  if (!isOpen) {
    return null;
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Pengujian Kualitas Skenario"
      size="xl"
      footer={modalFooter}
      loading={loading}
      closeOnBackdrop={!isLoading}
      closeOnEscape={!isLoading}
    >
      <div className="space-y-6">
        {/* Progress Indicator */}
        <AnimatePresence>
          {showProgress && (
            <TestingProgressIndicator
              isActive={showProgress}
              testType={activeTab}
              stage={testStage}
              progress={testProgress}
              error={displayError}
              variant="detailed"
              className="mb-6"
            />
          )}
        </AnimatePresence>

        {/* Main Content */}
        <AnimatePresence>
          {!showProgress && (
            <motion.div
              initial={{ opacity: 1 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-6"
            >
              {/* Error Display */}
              {displayError && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-4 bg-pink-500/10 border border-pink-500/20 rounded-xl flex items-start gap-3"
                >
                  <svg className="w-5 h-5 text-pink-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div>
                    <p className="text-pink-300 font-medium">Terjadi Kesalahan</p>
                    <p className="text-pink-200 text-sm mt-1">{displayError}</p>
                  </div>
                </motion.div>
              )}

              {/* Tab Navigation */}
              <div className="flex flex-col sm:flex-row space-y-1 sm:space-y-0 sm:space-x-1 bg-white/5 p-1 rounded-xl">
                {tabs.map((tab) => {
                  const isActive = activeTab === tab.id;
                  const customStyle = isActive && tab.customBg && tab.customText 
                    ? { backgroundColor: tab.customBg, borderColor: tab.customText, color: tab.customText }
                    : {};
                  
                  return (
                    <button
                      key={tab.id}
                      onClick={() => handleTabSwitch(tab.id)}
                      disabled={isLoading}
                      style={customStyle}
                      className={`flex-1 flex items-center justify-center gap-2 sm:gap-3 px-3 sm:px-4 py-3 rounded-lg text-sm font-medium transition-all duration-300 ease-in-out cursor-pointer disabled:cursor-not-allowed disabled:opacity-50 transform hover:scale-[1.02] ${
                        isActive
                          ? (tab.customBg 
                              ? 'border shadow-lg'
                              : tab.id === 'meteor' 
                                ? 'bg-gradient-to-r from-purple-600/20 to-purple-500/20 text-purple-300 border border-purple-500/30 shadow-lg'
                                : 'bg-gradient-to-r from-pink-600/20 to-pink-500/20 text-pink-300 border border-pink-500/30 shadow-lg')
                          : 'text-gray-400 hover:text-gray-300 hover:bg-white/10 hover:shadow-md'
                      }`}
                    >
                      <span className={`text-lg sm:text-xl transition-transform duration-300 ${isActive ? 'scale-110' : ''}`}>
                        {tab.icon}
                      </span>
                      <div className="text-left flex-1 min-w-0">
                        <div className="font-semibold truncate">{tab.label}</div>
                        <div className="text-xs opacity-75 hidden sm:block truncate">{tab.description}</div>
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Active Tab Content */}
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeTab}
                  initial={{ opacity: 0, x: 20, scale: 0.95 }}
                  animate={{ opacity: 1, x: 0, scale: 1 }}
                  exit={{ opacity: 0, x: -20, scale: 0.95 }}
                  transition={{ 
                    duration: 0.4, 
                    ease: [0.4, 0.0, 0.2, 1],
                    opacity: { duration: 0.3 },
                    scale: { duration: 0.3 }
                  }}
                  className="space-y-6"
                >
                  {/* Method Description */}
                  <div className={activeTab === 'meteor' 
                    ? 'p-3 sm:p-4 bg-gradient-to-r from-purple-500/10 to-purple-600/10 border border-purple-500/20 rounded-xl'
                    : 'p-3 sm:p-4 bg-gradient-to-r from-pink-500/10 to-pink-600/10 border border-pink-500/20 rounded-xl'
                  }>
                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 mb-2">
                      <div className={activeTab === 'meteor'
                        ? 'w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center flex-shrink-0'
                        : 'w-8 h-8 rounded-lg bg-gradient-to-br from-pink-500 to-pink-600 flex items-center justify-center flex-shrink-0'
                      }>
                        <span className="text-lg">{activeTabConfig?.icon}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className={activeTab === 'meteor' ? 'font-semibold text-purple-300' : 'font-semibold text-pink-300'}>
                          Metode {activeTabConfig?.label}
                        </h3>
                        <p className="text-sm text-gray-400 break-words">
                          {activeTabConfig?.description}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Comparison Tables */}
                  <div className="space-y-4">
                    <h4 className="text-lg font-semibold text-white flex items-center gap-2">
                      <svg className="w-5 h-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2h2a2 2 0 002-2z" />
                      </svg>
                      Perbandingan Skenario
                    </h4>
                    
                    <ComparisonTable
                      generatedScenario={scenarioText}
                      referenceScenario={referenceScenario}
                      onReferenceChange={handleReferenceChange}
                      className="mb-6"
                    />
                  </div>

                  {/* Suggested References */}
                  {showSuggestions && suggestedReferences.length > 0 && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="bg-white/5 border border-white/10 rounded-lg p-4 space-y-3 mt-4"
                    >
                      <div className="flex items-center justify-between">
                        <h5 className="text-sm font-medium text-white">Skenario Referensi yang Sering Digunakan</h5>
                        <button
                          onClick={() => setShowSuggestions(false)}
                          className="text-gray-400 hover:text-white transition-colors"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                      
                      <div className="space-y-2 max-h-48 overflow-y-auto">
                        {suggestedReferences.map((suggestion, index) => {
                          const referenceText = suggestion.reference_text || suggestion.referenceText || suggestion.text || '';
                          const description = suggestion.description || '';
                          const usageCount = suggestion.usage_count || suggestion.usageCount || 0;
                          
                          return (
                            <button
                              key={suggestion.id || index}
                              onClick={() => handleSuggestionSelect(suggestion)}
                              disabled={!referenceText}
                              className="w-full text-left p-3 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-purple-500/30 rounded-lg transition-all duration-200 group disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              <div className="flex items-start justify-between gap-3">
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm text-gray-300 group-hover:text-white transition-colors line-clamp-2 font-mono">
                                    {referenceText || 'Teks referensi tidak tersedia'}
                                  </p>
                                  {description && (
                                    <p className="text-xs text-gray-500 mt-1">
                                      {description}
                                    </p>
                                  )}
                                </div>
                                <div className="flex items-center gap-2 text-xs text-gray-500">
                                  {usageCount > 0 && (
                                    <span className="bg-purple-500/20 text-purple-300 px-2 py-1 rounded-full">
                                      {usageCount}x
                                    </span>
                                  )}
                                  <svg className="w-4 h-4 text-gray-400 group-hover:text-purple-400 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                  </svg>
                                </div>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </motion.div>
                  )}

                  {/* Quick Actions for Reference Input */}
                  {suggestedReferences.length > 0 && (
                    <div className="flex items-center justify-between mt-4">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-500 bg-white/5 px-2 py-1 rounded-full whitespace-nowrap">
                          Ground Truth / Company Standard
                        </span>
                      </div>
                      <button
                        onClick={() => setShowSuggestions(!showSuggestions)}
                        className="text-xs text-purple-400 hover:text-purple-300 bg-purple-500/10 hover:bg-purple-500/20 px-3 py-1.5 rounded-full transition-colors flex items-center gap-1 whitespace-nowrap"
                      >
                        <svg className="w-3 h-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                        </svg>
                        <span className="hidden sm:inline">Saran Referensi</span>
                        <span className="sm:hidden">Saran</span> ({suggestedReferences.length})
                      </button>
                    </div>
                  )}
                </motion.div>
              </AnimatePresence>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </Modal>
  );
});

TestingModal.displayName = 'TestingModal';

export default TestingModal;