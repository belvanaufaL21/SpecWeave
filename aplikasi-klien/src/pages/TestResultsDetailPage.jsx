import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useLoading, LOADING_TYPES } from '../contexts/LoadingContext';
import { useError } from '../contexts/ErrorContext';
import TestingService from '../services/testingService';
import DualTestingModal from '../components/modals/DualTestingModal';
import TextComparisonTable from '../components/common/TextComparisonTable';
import { useToast } from '../hooks/useToast';
import SelfAttentionAnalysis from '../components/common/SelfAttentionTabs';
import FFNResidualAnalysis from '../components/common/FFNResidualTabs';
import MeanPoolingTabs from '../components/common/MeanPoolingTabs';
import CosineSimilarityTabs from '../components/common/CosineSimilarityTabs';

const TestResultsDetailPage = () => {
  const { scenarioId } = useParams();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { setLoading, getLoadingState } = useLoading();
  const { handleError, clearError } = useError();
  
  // State management
  const [activeTab, setActiveTab] = useState('meteor');
  const [testResults, setTestResults] = useState({});
  const [error, setError] = useState(null);
  const [showTestingModal, setShowTestingModal] = useState(false);
  const [selectedSection, setSelectedSection] = useState('semua');

  // Get loading state from context
  const loading = getLoadingState(LOADING_TYPES.METEOR_ANALYSIS).isLoading;

  // Tab configuration - SpecWeave Brand Colors
  const tabs = [
    {
      id: 'meteor',
      label: 'METEOR',
      description: 'Evaluasi berdasarkan unigram matching, stemming, dan synonymy',
      color: 'purple',
      gradient: 'from-purple-600 to-purple-500'
    },
    {
      id: 'sentence_bert',
      label: 'Sentence-BERT', 
      description: 'Evaluasi berdasarkan semantic similarity menggunakan transformer',
      color: 'pink',
      gradient: 'from-pink-600 to-pink-500',
      customBg: '#160D14',
      customText: '#FF7AD0'
    }
  ];

  // Load test results on component mount
  useEffect(() => {
    console.log('?? [TEST-RESULTS-DETAIL] Component mounted with scenarioId:', scenarioId);
    loadTestResults();
  }, [scenarioId]);

  const loadTestResults = async () => {
    try {
      setLoading(LOADING_TYPES.METEOR_ANALYSIS, true, {
        message: 'Loading test results...'
      });
      setError(null);
      clearError();
      
      console.log('?? [TEST-RESULTS-DETAIL] Loading results for scenarioId:', scenarioId);
      
      const response = await TestingService.getTestResults(scenarioId);
      console.log('?? [TEST-RESULTS-DETAIL] Response:', response);
      
      if (response && response.allResults) {
        const groupedResults = {};
        Object.entries(response.allResults).forEach(([testType, results]) => {
          if (Array.isArray(results)) {
            groupedResults[testType] = results.map(result => 
              TestingService.formatTestResult({ testResult: result })
            ).filter(Boolean);
          }
        });
        
        console.log('? [TEST-RESULTS-DETAIL] Grouped results:', groupedResults);
        setTestResults(groupedResults);
      } else {
        console.log('?? [TEST-RESULTS-DETAIL] No results found');
        setTestResults({});
      }
    } catch (err) {
      console.error('? [TEST-RESULTS-DETAIL] Failed to load test results:', err);
      const errorMessage = err.message || 'Gagal memuat hasil pengujian';
      setError(errorMessage);
      
      handleError(err, {
        type: 'testing',
        code: 'TEST_RESULTS_LOAD_FAILED',
        context: { scenarioId }
      });
      
      showToast('Gagal memuat hasil pengujian', 'error');
    } finally {
      setLoading(LOADING_TYPES.METEOR_ANALYSIS, false);
    }
  };

  // Get the latest result for a specific test type
  const getLatestResult = (testType) => {
    const results = testResults[testType];
    
    // If requesting meteor or sentence_bert but no direct results, check dual results
    if ((!results || results.length === 0) && (testType === 'meteor' || testType === 'sentence_bert')) {
      const dualResults = testResults['dual'];
      if (dualResults && dualResults.length > 0) {
        const dualResult = dualResults[0];
        console.log('📊 [GET-LATEST-RESULT] Using dual result for', testType, dualResult);
        
        // Extract meteor or sentence_bert data from dual result
        if (testType === 'meteor' && dualResult.meteor) {
          console.log('🔍 [DUAL-TO-METEOR] Extracting meteor data:', {
            hasMeteor: !!dualResult.meteor,
            meteorKeys: Object.keys(dualResult.meteor),
            hasSectionMetrics: !!dualResult.meteor.section_metrics,
            hasDetailedMetrics: !!dualResult.meteor.detailed_metrics,
            sectionMetricsKeys: dualResult.meteor.section_metrics ? Object.keys(dualResult.meteor.section_metrics) : []
          });
          
          return {
            ...dualResult,
            testType: 'meteor',
            score: dualResult.meteor.score,
            details: {
              ...dualResult.meteor,
              section_metrics: dualResult.meteor.section_metrics || {}
            },
            detailed_metrics: dualResult.meteor.detailed_metrics || {
              section_metrics: dualResult.meteor.section_metrics || {}
            },
            ...dualResult.meteor
          };
        } else if (testType === 'sentence_bert' && dualResult.sentence_bert) {
          return {
            ...dualResult,
            testType: 'sentence_bert',
            score: dualResult.sentence_bert.score,
            details: dualResult.sentence_bert.details || dualResult.sentence_bert,
            ...dualResult.sentence_bert
          };
        }
      }
    }
    
    return results && results.length > 0 ? results[0] : null;
  };
  
  // Get all results for a specific test type (history)
  const getTestHistory = (testType) => {
    return testResults[testType] || [];
  };

  // Handle opening testing modal
  const handleStartTest = (testType) => {
    setModalConfig({
      initialTab: testType,
      initialReferenceScenario: '',
      isRetesting: false
    });
    setShowTestingModal(true);
  };

  // Handle opening testing modal
  const handleOpenTestingModal = () => {
    setShowTestingModal(true);
  };

  // Handle test submission
  const handleTestSubmit = async (result) => {
    try {
      showToast('Pengujian berhasil diselesaikan', 'success');
      await loadTestResults();
    } catch (err) {
      console.error('Test submission error:', err);
      showToast('Gagal menyimpan hasil pengujian', 'error');
    }
  };

  // Render loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-[#020203] text-white font-sans relative">
        {/* Background Effects */}
        <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
          <div className="absolute top-[-10%] left-[-10%] w-[50vw] h-[50vh] bg-[radial-gradient(circle_at_center,rgba(147,51,234,0.08)_0%,rgba(0,0,0,0)_70%)] blur-[100px]" />
          <div className="absolute bottom-[-10%] right-[-10%] w-[50vw] h-[50vh] bg-[radial-gradient(circle_at_center,rgba(236,72,153,0.08)_0%,rgba(0,0,0,0)_70%)] blur-[100px]" />
        </div>
        
        <div className="flex items-center justify-center min-h-screen relative z-10">
          <div className="text-center">
            <div className="w-16 h-16 border-4 border-purple-500/30 border-t-purple-500 rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-400 text-lg font-medium">Memuat hasil pengujian...</p>
          </div>
        </div>
      </div>
    );
  }

  // Render error state
  if (error) {
    return (
      <div className="min-h-screen bg-[#020203] text-white font-sans relative">
        {/* Background Effects */}
        <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
          <div className="absolute top-[-10%] left-[-10%] w-[50vw] h-[50vh] bg-[radial-gradient(circle_at_center,rgba(147,51,234,0.08)_0%,rgba(0,0,0,0)_70%)] blur-[100px]" />
          <div className="absolute bottom-[-10%] right-[-10%] w-[50vw] h-[50vh] bg-[radial-gradient(circle_at_center,rgba(236,72,153,0.08)_0%,rgba(0,0,0,0)_70%)] blur-[100px]" />
        </div>
        
        {/* Simplified Header - Inline with transparent background */}
        <header className="sticky top-0 z-30 bg-[#020203]/60 backdrop-blur-2xl border-b border-white/5">
          <div className="px-6 py-5">
            <div className="flex items-center gap-4">
              {/* Chevron Back Button */}
              <button
                onClick={() => navigate(-1)}
                className="text-gray-400 hover:text-white transition-colors p-1"
                aria-label="Kembali"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              
              {/* Title and Subtitle - Inline */}
              <div className="flex items-baseline gap-2">
                <h1 className="text-lg font-semibold text-white">
                  Detail Hasil Pengujian
                </h1>
                <span className="text-sm text-gray-500">
                  ({scenarioId ? `Scenario ${scenarioId.split('-').pop()}` : 'Scenario'})
                </span>
              </div>
            </div>
          </div>
        </header>
        
        <div className="max-w-7xl mx-auto px-6 py-8 relative z-10">
          <div className="flex items-center justify-center min-h-[60vh]">
            <div className="text-center max-w-md mx-auto">
              <div className="text-6xl mb-4">??</div>
              <h2 className="text-2xl font-semibold text-white mb-4">Terjadi Kesalahan</h2>
              <p className="text-gray-400 mb-8">{error}</p>
              <button
                onClick={loadTestResults}
                className="px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white rounded-xl transition-all font-medium"
              >
                Coba Lagi
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const activeTabConfig = tabs.find(tab => tab.id === activeTab);
  const currentResult = activeTab !== 'comparison' ? getLatestResult(activeTab) : null;
  const hasResult = currentResult !== null;

  // Helper function to extract text based on section (shared across components)
  const getTextBySection = (fullText, section) => {
    if (!fullText) {
      console.error('❌ [getTextBySection] No text provided');
      return '';
    }
    
    if (section === 'semua') {
      console.log('✓ [getTextBySection] Using full text for "semua"');
      return fullText;
    }
    
    console.log('🔍 [getTextBySection] Attempting to extract:', {
      section,
      fullText: fullText,
      fullTextLength: fullText.length
    });
    
    // Try to extract based on section keywords
    let extractedText = '';
    
    if (section === 'given') {
      // Try to find "Given" followed by text until "When" or end
      const match = fullText.match(/Given\s*:?\s*([^]*?)(?=\s*When\s*:?|\s*$)/i);
      extractedText = match ? match[1].trim() : '';
      
      // If no match, try to find just "Given" line
      if (!extractedText) {
        const lines = fullText.split('\n');
        const givenLine = lines.find(line => line.trim().toLowerCase().startsWith('given'));
        extractedText = givenLine ? givenLine.replace(/^given\s*:?\s*/i, '').trim() : '';
      }
      
      if (!extractedText) {
        console.error('❌ [getTextBySection] Failed to extract Given section from text');
      }
    } else if (section === 'when') {
      // Try to find "When" followed by text until "Then" or end
      const match = fullText.match(/When\s*:?\s*([^]*?)(?=\s*Then\s*:?|\s*$)/i);
      extractedText = match ? match[1].trim() : '';
      
      // If no match, try to find just "When" line
      if (!extractedText) {
        const lines = fullText.split('\n');
        const whenLine = lines.find(line => line.trim().toLowerCase().startsWith('when'));
        extractedText = whenLine ? whenLine.replace(/^when\s*:?\s*/i, '').trim() : '';
      }
      
      if (!extractedText) {
        console.error('❌ [getTextBySection] Failed to extract When section from text');
      }
    } else if (section === 'then') {
      // Try to find "Then" followed by text until end
      const match = fullText.match(/Then\s*:?\s*([^]*?)$/i);
      extractedText = match ? match[1].trim() : '';
      
      // If no match, try to find just "Then" line
      if (!extractedText) {
        const lines = fullText.split('\n');
        const thenLine = lines.find(line => line.trim().toLowerCase().startsWith('then'));
        extractedText = thenLine ? thenLine.replace(/^then\s*:?\s*/i, '').trim() : '';
      }
      
      if (!extractedText) {
        console.error('❌ [getTextBySection] Failed to extract Then section from text');
      }
    }
    
    console.log('✓ [getTextBySection] Result:', {
      section,
      success: !!extractedText,
      extractedLength: extractedText.length,
      extracted: extractedText
    });
    
    return extractedText;
  };

  // Function to get display score based on selected section
  // UNIFIED: Menggunakan sumber data yang sama dengan accordion
  const getDisplayScore = (result, section) => {
    if (!result) {
      console.log('❌ [getDisplayScore] No result provided');
      return 0;
    }
    
    console.log('🔍 [getDisplayScore] Called with:', {
      section,
      activeTab,
      hasResult: !!result,
      resultKeys: Object.keys(result),
      detailed_metrics: result.detailed_metrics,
      details: result.details
    });
    
    // Untuk "semua", gunakan overall score
    if (section === 'semua') {
      console.log('✓ [getDisplayScore] Using overall score for "semua":', result.score);
      return result.score || 0;
    }
    
    // Untuk Sentence-BERT, gunakan skor per section dari sentence_bert_scores
    if (activeTab === 'sentence_bert') {
      const detailedMetrics = result.detailed_metrics || result.details?.detailed_metrics || {};
      const details = result.details || {};
      
      // Coba beberapa lokasi data yang mungkin
      const sbertScores = detailedMetrics.sentence_bert_scores || 
                         details.sentence_bert_scores || 
                         detailedMetrics.section_scores ||
                         details.section_scores ||
                         {};
      
      console.log('🔍 [getDisplayScore] Sentence-BERT data search:', {
        section,
        detailedMetrics,
        details,
        sbertScores,
        hasSectionScore: sbertScores[section] !== undefined
      });
      
      if (sbertScores[section] !== undefined) {
        console.log('✓ [getDisplayScore] Using sentence_bert section score:', {
          section,
          score: sbertScores[section],
          source: 'sentence_bert_scores or section_scores'
        });
        return sbertScores[section];
      }
      
      // FALLBACK: Jika tidak ada section score (data lama), gunakan overall score
      // Ini untuk backward compatibility dengan data test lama
      console.warn('⚠️ [getDisplayScore] No section score found for Sentence-BERT, using overall score as fallback');
      return result.score || 0;
    }
    
    // Untuk METEOR, ambil dari section_metrics (sumber yang sama dengan accordion)
    const detailedMetrics = result.detailed_metrics || result.details?.detailed_metrics || {};
    const sectionMetrics = detailedMetrics.section_metrics || {};
    
    console.log('🔍 [getDisplayScore] METEOR data search:', {
      section,
      sectionMetrics,
      hasSectionData: !!sectionMetrics[section]
    });
    
    // Ambil meteor_score dari section yang dipilih
    const sectionData = sectionMetrics[section];
    if (sectionData && sectionData.meteor_score !== undefined) {
      console.log('✓ [getDisplayScore] Using section_metrics:', {
        section,
        meteor_score: sectionData.meteor_score,
        source: 'section_metrics'
      });
      return sectionData.meteor_score;
    }
    
    // Fallback ke explanation.section_scores jika section_metrics tidak ada
    const explanationScores = detailedMetrics.explanation?.section_scores || {};
    if (explanationScores[section] !== undefined) {
      console.log('✓ [getDisplayScore] Using explanation.section_scores:', {
        section,
        score: explanationScores[section],
        source: 'explanation.section_scores'
      });
      return explanationScores[section];
    }
    
    // Fallback terakhir ke section_scores (legacy)
    const sectionScores = result.section_scores || result.details?.section_scores || {};
    if (sectionScores[section] !== undefined) {
      console.log('✓ [getDisplayScore] Using section_scores (legacy):', {
        section,
        score: sectionScores[section],
        source: 'section_scores'
      });
      return sectionScores[section];
    }
    
    // Jika tidak ada data section sama sekali, return 0
    console.warn('⚠️ [getDisplayScore] No section score found, returning 0');
    return 0;
  };

  return (
    <div className="min-h-screen bg-[#020203] text-white font-sans relative">
      {/* Background Effects - Konsisten dengan halaman lain */}
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] w-[50vw] h-[50vh] bg-[radial-gradient(circle_at_center,rgba(147,51,234,0.08)_0%,rgba(0,0,0,0)_70%)] blur-[100px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50vw] h-[50vh] bg-[radial-gradient(circle_at_center,rgba(236,72,153,0.08)_0%,rgba(0,0,0,0)_70%)] blur-[100px]" />
      </div>

      {/* Simplified Header - Inline with transparent background */}
      <header className="sticky top-0 z-30 bg-[#020203]/60 backdrop-blur-2xl border-b border-white/5">
        <div className="px-6 py-5">
          <div className="flex items-center gap-4">
            {/* Chevron Back Button */}
            <button
              onClick={() => navigate(-1)}
              className="text-gray-400 hover:text-white transition-colors p-1"
              aria-label="Kembali"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            
            {/* Title - Simple */}
            <h1 className="text-lg font-semibold text-white">
              Detail Hasil Pengujian
            </h1>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-6 relative z-10">

        {/* Tab Navigation - SpecWeave Signature Style */}
        <div className="mb-6">
          <div className="flex gap-2 bg-black/60 backdrop-blur-xl p-1.5 rounded-2xl" style={{ borderWidth: '1px', borderStyle: 'solid', borderColor: '#0D0D0D' }}>
            {tabs.map((tab) => {
              const tabResult = getLatestResult(tab.id);
              const hasTabResult = tabResult !== null;
              
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`group relative flex items-center gap-3 px-5 py-3.5 rounded-xl text-sm font-medium transition-all duration-300 flex-1 overflow-hidden ${
                    activeTab === tab.id
                      ? 'text-white'
                      : 'text-gray-400 hover:text-gray-300'
                  }`}
                  style={activeTab === tab.id && tab.id === 'meteor' ? { backgroundColor: '#120C18' } : 
                         activeTab === tab.id && tab.customBg ? { backgroundColor: tab.customBg } : {}}
                >
                  {/* SpecWeave Gradient Background - Only on Active (except METEOR and custom bg) */}
                  {activeTab === tab.id && tab.id !== 'meteor' && !tab.customBg && (
                    <div className={`absolute inset-0 bg-gradient-to-r ${tab.gradient} opacity-20`}></div>
                  )}
                  
                  <div className="relative flex items-center gap-3 flex-1">
                    <span className="text-2xl">{tab.icon}</span>
                    <div className="text-left flex-1">
                      <div className="font-semibold flex items-center gap-2">
                        <span 
                          className={activeTab === tab.id && tab.id !== 'meteor' && !tab.customText ? `bg-gradient-to-r ${tab.gradient} bg-clip-text text-transparent` : ''}
                          style={activeTab === tab.id && tab.id === 'meteor' ? { color: '#C27AFF' } : 
                                 activeTab === tab.id && tab.customText ? { color: tab.customText } : {}}
                        >
                          {tab.label}
                        </span>
                        {hasTabResult && (
                          <div className={`w-1.5 h-1.5 bg-gradient-to-r ${tab.gradient} rounded-full ${activeTab === tab.id ? 'animate-pulse' : ''}`}></div>
                        )}
                      </div>
                      <div className="text-xs opacity-70 line-clamp-1">{tab.description}</div>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Tab Content - SpecWeave Landing Style */}
        <div className="relative">
          {/* Tab Filter dan METEOR Score - Di luar container */}
          {hasResult && (
            <div className="grid grid-cols-4 mb-8" style={{ gap: '180px' }}>
              {/* Section Filter Tabs - 25% (1 column) */}
              <div className="col-span-1 flex flex-col gap-2">
                {['semua', 'given', 'when', 'then'].map((section) => (
                  <button
                    key={section}
                    onClick={() => setSelectedSection(section)}
                    className={`px-4 py-3.5 rounded-lg text-sm font-medium transition-colors text-left border ${
                      selectedSection === section
                        ? activeTab === 'sentence_bert' 
                          ? 'text-gray-400 hover:text-gray-300'
                          : 'bg-purple-500/20 text-purple-300 border-purple-500/30'
                        : 'bg-transparent text-gray-400 hover:text-gray-300 border-transparent'
                    }`}
                    style={selectedSection === section && activeTab === 'sentence_bert' ? {
                      backgroundColor: '#160D14',
                      borderColor: '#44273D',
                      color: '#FF7AD0'
                    } : {}}
                  >
                    {section.charAt(0).toUpperCase() + section.slice(1)}
                  </button>
                ))}
              </div>

              {/* METEOR Score Display - 75% (3 columns) */}
              <div className="col-span-3 text-center flex flex-col justify-center relative pl-6">
                {/* Garis vertikal di kiri */}
                <div 
                  className="absolute left-0 top-0 bottom-0 w-1"
                  style={activeTab === 'sentence_bert' ? { backgroundColor: '#160D14' } : { backgroundColor: 'rgb(168 85 247 / 0.3)' }}
                ></div>
                
                <div className="mb-4">
                  <span 
                    className="text-lg font-semibold"
                    style={activeTab === 'sentence_bert' ? { color: '#FF7AD0' } : { color: 'rgb(216 180 254)' }}
                  >
                    {activeTab === 'sentence_bert' ? 'Sentence-BERT Result' : 'METEOR Result'}
                  </span>
                  <span className="text-sm text-gray-400"> ({selectedSection.charAt(0).toUpperCase() + selectedSection.slice(1)})</span>
                </div>
                <div 
                  className="text-6xl font-bold"
                  style={activeTab === 'sentence_bert' ? { color: '#FF7AD0' } : { color: 'rgb(192 132 252)' }}
                >
                  {getDisplayScore(currentResult, selectedSection).toFixed(5)}
                </div>
              </div>
            </div>
          )}

          <div className="relative bg-black backdrop-blur-lg rounded-3xl overflow-hidden shadow-2xl" style={{ borderWidth: '1px', borderStyle: 'solid', borderColor: '#0D0D0D' }}>
            {hasResult ? (
              <TestResultContent
                result={currentResult}
                testType={activeTab}
                tabConfig={activeTabConfig}
                onRetest={handleOpenTestingModal}
                selectedSection={selectedSection}
              />
            ) : (
              <EmptyTestState
                testType={activeTab}
                tabConfig={activeTabConfig}
                onStartTest={handleOpenTestingModal}
              />
            )}
          </div>
          
          {/* Perbandingan Teks dan Tahapan Pengujian - Di luar container */}
          {hasResult && (
            <TestResultDetails
              result={currentResult}
              testType={activeTab}
              tabConfig={activeTabConfig}
              selectedSection={selectedSection}
              getTextBySection={getTextBySection}
              getDisplayScore={getDisplayScore}
            />
          )}
        </div>
      </div>

      {/* Dual Testing Modal */}
      <DualTestingModal
        isOpen={showTestingModal}
        onClose={() => setShowTestingModal(false)}
        scenarioText={currentResult?.generatedText || ''}
        scenarioId={scenarioId}
        onSubmitTest={handleTestSubmit}
      />
    </div>
  );
};

// Component for displaying test results
const TestResultContent = ({ 
  result, 
  testType, 
  tabConfig, 
  onRetest,
  selectedSection = 'semua'
}) => {
  const [expandedStep, setExpandedStep] = useState(null);

  const getScoreColor = (score) => {
    if (score == null || isNaN(score)) return 'text-gray-400';
    if (score >= 0.8) return 'text-purple-400';  // Excellent - purple
    if (score >= 0.6) return 'text-purple-300';  // Good - light purple  
    if (score >= 0.4) return 'text-pink-400';    // Fair - pink
    return 'text-pink-300';                       // Needs improvement - light pink
  };

  // Get detailed testing steps based on test type
  const getTestingSteps = (testType, result, selectedSection = 'semua') => {
    if (testType === 'meteor') {
      // UNIFIED: Gunakan sumber data yang sama dengan header
      const detailedMetrics = result.detailed_metrics || result.details?.detailed_metrics || {};
      const details = result.details || {};
      const sectionMetrics = detailedMetrics.section_metrics || details.section_metrics || {};
      
      // Determine which metrics to use based on selectedSection
      let precision, recall, f_mean, penalty, generated_tokens, reference_tokens, matches, meteorScore;
      
      // Check if we have section data and it's not "semua"
      const hasSectionData = selectedSection !== 'semua' && 
                            sectionMetrics[selectedSection] && 
                            Object.keys(sectionMetrics).length > 0;
      
      if (hasSectionData) {
        // Use section-specific metrics (SUMBER YANG SAMA dengan header)
        const section = sectionMetrics[selectedSection];
        precision = section.precision ?? 0;
        recall = section.recall ?? 0;
        f_mean = section.f_mean ?? 0;
        penalty = section.penalty ?? 0;
        generated_tokens = section.generated_tokens ?? 0;
        reference_tokens = section.reference_tokens ?? 0;
        matches = section.matches ?? 0;
        meteorScore = section.meteor_score ?? 0; // PENTING: Gunakan meteor_score dari section
      } else {
        // Use overall metrics (sum of all sections)
        precision = detailedMetrics.precision ?? details.precision ?? result.precision ?? 0;
        recall = detailedMetrics.recall ?? details.recall ?? result.recall ?? 0;
        f_mean = detailedMetrics.f_mean ?? details.f_mean ?? result.f_mean ?? 0;
        penalty = detailedMetrics.penalty ?? details.penalty ?? details.fragmentation_penalty ?? 0;
        generated_tokens = detailedMetrics.generated_tokens ?? details.generated_tokens ?? 1;
        reference_tokens = detailedMetrics.reference_tokens ?? details.reference_tokens ?? 1;
        matches = detailedMetrics.matches ?? details.matches ?? 1;
        meteorScore = result.score ?? 0; // Overall score
      }
      
      console.log('?? [getTestingSteps] METEOR metrics (UNIFIED):', {
        selectedSection,
        hasSectionData,
        sectionMetrics,
        precision,
        recall,
        f_mean,
        penalty,
        meteorScore,
        source: hasSectionData ? 'section_metrics' : 'overall'
      });
      
      return [
        {
          name: 'Presisi (Precision)',
          value: precision,
          description: 'Mengukur akurasi kata yang dihasilkan dibandingkan dengan referensi',
          formula: 'Presisi = (Total kata cocok) / (Total kata dihasilkan)',
          actualData: {
            precision: precision,
            generated_tokens: generated_tokens,
            matches: matches,
            calculation: `${matches} / ${generated_tokens} = ${precision.toFixed(5)}`
          }
        },
        {
          name: 'Recall',
          value: recall,
          description: 'Mengukur kelengkapan informasi dari referensi yang tercakup',
          formula: 'Recall = (Total kata cocok) / (Total kata referensi)',
          actualData: {
            recall: recall,
            reference_tokens: reference_tokens,
            matches: matches,
            calculation: `${matches} / ${reference_tokens} = ${recall.toFixed(5)}`
          }
        },
        {
          name: 'F-Mean (F-Score)',
          value: f_mean,
          description: 'Weighted mean dari presisi dan recall dengan bobot lebih pada presisi',
          formula: 'F-Mean = 10 × (P × R) / (9P + R)'
        },
        {
          name: 'Penalti',
          value: penalty,
          description: 'Mengukur penalti fragmentasi urutan kata dalam teks',
          formula: 'Penalti = 0.5 × (Chunks / Matches)³'
        },
        {
          name: 'METEOR Score',
          value: meteorScore, // UNIFIED: Gunakan meteorScore yang sudah disesuaikan dengan section
          description: 'Skor akhir METEOR dengan penalty untuk fragmentasi teks',
          formula: 'METEOR = F-Mean × (1 - Penalty)'
        }
      ];
    } else if (testType === 'sentence_bert') {
      // Try multiple paths to get detailed metrics
      const detailedMetrics = result.detailed_metrics || result.details?.detailed_metrics || {};
      const details = result.details || {};
      
      return [
        {
          name: 'Tokenisasi',
          value: 1.0,
          description: 'Kalimat dipecah menggunakan WordPiece tokenizer',
          formula: 'tokens = tokenize(raw_text)',
          details: {
            steps: [
              'Tokenization (WordPiece)',
              'Add special tokens [CLS], [SEP]',
              'Padding to max length',
              'Create attention masks'
            ]
          }
        },
        {
          name: 'Input embedding',
          value: 1.0,
          description: 'Tiap token ID berubah jadi vektor 384 dimensi dari penjumlahan 3 embedding (kata + posisi + segmen).',
          formula: 'h⁰ᵢ = token_embedding(tᵢ) + positional_embedding(i) + segment_embedding(sᵢ)',
          details: {
            model: 'paraphrase-multilingual-MiniLM-L12-v2',
            layers: 12,
            hiddenSize: 384,
            outputType: 'Token embeddings',
            dimensions: 'n_tokens × 384'
          }
        },
        {
          name: 'Self-Attention',
          value: 1.0,
          description: 'Di setiap layer BERT, input diproyeksikan ke Query, Key, Value. Attention score dihitung, dinormalisasi dengan softmax, lalu digunakan untuk meng-weight Value vectors.',
          formula: 'Attention(Q,K,V) = softmax(QKᵀ/√dₖ) × V',
          details: {
            method: 'Multi-Head Attention',
            input: 'Token embeddings (n × 384)',
            output: 'Contextualized embeddings (n × 384)',
            vectorDimension: 384,
            numHeads: 12
          }
        },
        {
          name: 'FFN + Residual + Layer Normalization',
          value: 1.0,
          description: 'Output attention diproses oleh fully-connected feed-forward network dengan aktivasi GELU, lalu dinormalisasi. Proses ini diulang sebanyak L layer (L=6 untuk MiniLM-L6).',
          formula: 'hˡ = LayerNorm(hˡ⁻¹ + FFN(hˡ⁻¹))',
          details: {
            method: 'Feed-Forward Network + Residual Connection',
            activation: 'GELU',
            layers: 6,
            hiddenSize: 384,
            intermediateSize: 1536,
            process: 'Repeated L times'
          }
        },
        {
          name: 'Mean pooling',
          value: 1.0,
          description: 'Semua hidden state token dari layer terakhir dirata-rata untuk menghasilkan satu vektor representasi kalimat.',
          formula: 'u = (1/n) × Σᵢ₌₁ⁿ hᵢᴸ',
          details: {
            method: 'Mean Pooling',
            input: 'All token hidden states (n × 384)',
            output: 'Single sentence vector (384)',
            advantage: 'More stable than [CLS] token only',
            dimension: 384
          }
        },
        {
          name: 'Cosine Similarity',
          value: result.score,
          description: 'Menghitung kesamaan semantik antara dua sentence embeddings',
          formula: 'Σ(u×v) / (√Σ(u²) × √Σ(v²))',
          details: {
            dotProduct: detailedMetrics.dot_product ?? details.dot_product,
            magnitudeA: detailedMetrics.magnitude_a ?? details.magnitude_a,
            magnitudeB: detailedMetrics.magnitude_b ?? details.magnitude_b,
            range: '[-1, 1] atau [0, 1]',
            finalScore: result.score
          }
        }
      ];
    }
    return [];
  };

  return null; // Container kosong, semua konten sudah dipindah keluar
};

// Component for displaying test result details (outside container)
const TestResultDetails = ({ 
  result, 
  testType, 
  tabConfig,
  selectedSection,
  getTextBySection, // Receive as prop
  getDisplayScore // Receive as prop
}) => {
  const [expandedStep, setExpandedStep] = useState(null);

  const getTestingSteps = (testType, result, selectedSection = 'semua') => {
    if (testType === 'meteor') {
      // UNIFIED: Gunakan sumber data yang sama dengan header dan accordion lainnya
      const detailedMetrics = result.detailed_metrics || result.details?.detailed_metrics || {};
      const details = result.details || {};
      const sectionMetrics = detailedMetrics.section_metrics || {};
      
      // Determine which metrics to use based on selectedSection
      let precision, recall, f_mean, penalty, generated_tokens, reference_tokens, matches, meteorScore;
      
      // Check if we have section data and it's not "semua"
      const hasSectionData = selectedSection !== 'semua' && 
                            sectionMetrics[selectedSection] && 
                            Object.keys(sectionMetrics).length > 0;
      
      if (hasSectionData) {
        // Use section-specific metrics (SUMBER YANG SAMA dengan header)
        const section = sectionMetrics[selectedSection];
        precision = section.precision ?? 0;
        recall = section.recall ?? 0;
        f_mean = section.f_mean ?? 0;
        penalty = section.penalty ?? 0;
        generated_tokens = section.generated_tokens ?? 0;
        reference_tokens = section.reference_tokens ?? 0;
        matches = section.matches ?? 0;
        meteorScore = section.meteor_score ?? 0; // PENTING: Gunakan meteor_score dari section
      } else {
        // Use overall metrics (sum of all sections)
        precision = detailedMetrics.precision ?? details.precision ?? result.precision ?? 0;
        recall = detailedMetrics.recall ?? details.recall ?? result.recall ?? 0;
        f_mean = detailedMetrics.f_mean ?? details.f_mean ?? result.f_mean ?? 0;
        penalty = detailedMetrics.penalty ?? details.penalty ?? details.fragmentation_penalty ?? 0;
        generated_tokens = detailedMetrics.generated_tokens ?? details.generated_tokens ?? 1;
        reference_tokens = detailedMetrics.reference_tokens ?? details.reference_tokens ?? 1;
        matches = detailedMetrics.matches ?? details.matches ?? 1;
        meteorScore = result.score ?? 0; // Overall score
      }
      
      console.log('?? [TestResultDetails.getTestingSteps] METEOR metrics (UNIFIED):', {
        selectedSection,
        hasSectionData,
        precision,
        recall,
        f_mean,
        penalty,
        meteorScore,
        source: hasSectionData ? 'section_metrics' : 'overall'
      });
      
      return [
        {
          name: 'Presisi (Precision)',
          value: precision,
          description: 'Mengukur akurasi kata yang dihasilkan dibandingkan dengan referensi',
          formula: 'Presisi = (Total kata cocok) / (Total kata dihasilkan)',
          actualData: {
            precision: precision,
            generated_tokens: generated_tokens,
            matches: matches,
            calculation: `${matches} / ${generated_tokens} = ${precision.toFixed(5)}`
          }
        },
        {
          name: 'Recall',
          value: recall,
          description: 'Mengukur kelengkapan informasi dari referensi yang tercakup',
          formula: 'Recall = (Total kata cocok) / (Total kata referensi)',
          actualData: {
            recall: recall,
            reference_tokens: reference_tokens,
            matches: matches,
            calculation: `${matches} / ${reference_tokens} = ${recall.toFixed(5)}`
          }
        },
        {
          name: 'F-Mean (F-Score)',
          value: f_mean,
          description: 'Weighted mean dari presisi dan recall dengan bobot lebih pada presisi',
          formula: 'F-Mean = 10 × (P × R) / (9P + R)'
        },
        {
          name: 'Penalti',
          value: penalty,
          description: 'Mengukur penalti fragmentasi urutan kata dalam teks',
          formula: 'Penalti = 0.5 × (Chunks / Matches)³'
        },
        {
          name: 'METEOR Score',
          value: meteorScore, // UNIFIED: Gunakan meteorScore yang sudah disesuaikan dengan section
          description: 'Skor akhir METEOR dengan penalty untuk fragmentasi teks',
          formula: 'METEOR = F-Mean × (1 - Penalty)'
        }
      ];
    } else if (testType === 'sentence_bert') {
      const detailedMetrics = result.detailed_metrics || result.details?.detailed_metrics || {};
      const details = result.details || {};
      
      return [
        {
          name: 'Tokenisasi',
          value: 1.0,
          description: 'Kalimat dipecah menggunakan WordPiece tokenizer',
          formula: 'tokens = tokenize(raw_text)',
          details: {
            steps: [
              'Tokenization (WordPiece)',
              'Add special tokens [CLS], [SEP]',
              'Padding to max length',
              'Create attention masks'
            ]
          }
        },
        {
          name: 'Input embedding',
          value: 1.0,
          description: 'Tiap token ID berubah jadi vektor 384 dimensi dari penjumlahan 3 embedding (kata + posisi + segmen).',
          formula: 'h⁰ᵢ = token_embedding(tᵢ) + positional_embedding(i) + segment_embedding(sᵢ)',
          details: {
            model: 'paraphrase-multilingual-MiniLM-L12-v2',
            layers: 12,
            hiddenSize: 384,
            outputType: 'Token embeddings',
            dimensions: 'n_tokens × 384'
          }
        },
        {
          name: 'Self-Attention',
          value: 1.0,
          description: 'Di setiap layer BERT, input diproyeksikan ke Query, Key, Value. Attention score dihitung, dinormalisasi dengan softmax, lalu digunakan untuk meng-weight Value vectors.',
          formula: 'Attention(Q,K,V) = softmax(QKᵀ/√dₖ) × V',
          details: {
            method: 'Multi-Head Attention',
            input: 'Token embeddings (n × 384)',
            output: 'Contextualized embeddings (n × 384)',
            vectorDimension: 384,
            numHeads: 12
          }
        },
        {
          name: 'FFN + Residual + Layer Normalization',
          value: 1.0,
          description: 'Output attention diproses oleh fully-connected feed-forward network dengan aktivasi GELU, lalu dinormalisasi. Proses ini diulang sebanyak L layer (L=6 untuk MiniLM-L6).',
          formula: 'hˡ = LayerNorm(hˡ⁻¹ + FFN(hˡ⁻¹))',
          details: {
            method: 'Feed-Forward Network + Residual Connection',
            activation: 'GELU',
            layers: 6,
            hiddenSize: 384,
            intermediateSize: 1536,
            process: 'Repeated L times'
          }
        },
        {
          name: 'Mean pooling',
          value: 1.0,
          description: 'Semua hidden state token dari layer terakhir dirata-rata untuk menghasilkan satu vektor representasi kalimat.',
          formula: 'u = (1/n) × Σᵢ₌₁ⁿ hᵢᴸ',
          details: {
            method: 'Mean Pooling',
            input: 'All token hidden states (n × 384)',
            output: 'Single sentence vector (384)',
            advantage: 'More stable than [CLS] token only',
            dimension: 384
          }
        },
        {
          name: 'Cosine Similarity',
          value: result.score,
          description: 'Menghitung kesamaan semantik antara dua sentence embeddings',
          formula: 'Σ(u×v) / (√Σ(u²) × √Σ(v²))',
          details: {
            dotProduct: detailedMetrics.dot_product ?? details.dot_product,
            magnitudeA: detailedMetrics.magnitude_a ?? details.magnitude_a,
            magnitudeB: detailedMetrics.magnitude_b ?? details.magnitude_b,
            range: '[-1, 1] atau [0, 1]',
            finalScore: result.score
          }
        }
      ];
    }
    return [];
  };

  const testingSteps = useMemo(() => {
    console.log('?? [getTestingSteps] Called with:', { testType, selectedSection });
    const steps = getTestingSteps(testType, result, selectedSection);
    console.log('?? [getTestingSteps] Returned steps:', steps);
    return steps;
  }, [testType, result, selectedSection]);

  return (
    <div className="mt-8 space-y-8">
      {/* Text Comparison Table - Landing Style - Tampil untuk semua section */}
      <div>
        <div className="mb-4">
          <h3 className="text-lg font-bold text-white">Perbandingan Teks</h3>
          {testType === 'meteor' ? (
            <div className="h-1 w-10 rounded-full mt-1" style={{ backgroundColor: '#120C18' }}></div>
          ) : (
            <div className={`h-1 w-10 bg-${tabConfig.color}-500 rounded-full mt-1`}></div>
          )}
        </div>
        <TextComparisonTable
          generatedText={result.generatedText}
          referenceText={result.referenceText}
          showHighlight={testType === 'meteor'} // Hanya highlight untuk METEOR
          selectedSection={selectedSection}
          testType={testType} // Pass testType untuk styling
        />
        
        {/* Penjelasan untuk Sentence-BERT - Dihapus */}
      </div>

      {/* Detailed Process Steps - Landing Style */}
      {selectedSection !== 'semua' && (
        <div>
          <div className="mb-6">
            <h3 className="text-lg font-bold text-white">Tahapan Pengujian {tabConfig.label}</h3>
            {testType === 'meteor' ? (
              <div className="h-1 w-10 rounded-full mt-1" style={{ backgroundColor: '#120C18' }}></div>
            ) : (
              <div className={`h-1 w-10 bg-${tabConfig.color}-500 rounded-full mt-1`}></div>
            )}
          </div>
          
          <div className="space-y-4">
            {testingSteps.map((step, index) => (
              <div key={index} className="group bg-black backdrop-blur-lg rounded-2xl overflow-hidden shadow-lg" style={{ borderWidth: '1px', borderStyle: 'solid', borderColor: '#0D0D0D' }}>
                <button
                  onClick={() => setExpandedStep(expandedStep === index ? null : index)}
                  className="w-full p-5 text-left hover:bg-[#09090A] transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4 flex-1">
                      {/* Step Badge - Landing Style */}
                      <div className={`w-10 h-10 rounded-xl bg-${tabConfig.color}-500/10 border border-${tabConfig.color}-500/20 flex items-center justify-center flex-shrink-0`}>
                        <span className="text-sm font-bold text-white">{index + 1}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="text-base font-semibold text-white truncate">{step.name}</h4>
                        <p className="text-xs text-gray-500 line-clamp-1">{step.description}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 flex-shrink-0">
                      <svg 
                        className={`w-5 h-5 text-gray-400 transition-transform ${expandedStep === index ? 'rotate-180' : ''}`}
                        fill="none" 
                        stroke="currentColor" 
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </div>
                </button>
                
                {expandedStep === index && (
                  <div className="px-5 pb-5 bg-black/50" style={{ borderTop: '1px solid #0D0D0D' }}>
                    <div className="pt-5 space-y-5">
                      {/* Formula - Direct Display - Only for non-Self-Attention steps and not Residual connection */}
                      {step.name !== 'Self-Attention' && step.name !== 'FFN + Residual + Layer Normalization' && (
                        <div>
                          <h5 className="font-semibold mb-2 text-sm tracking-wide uppercase" style={{ color: testType === 'meteor' ? '#C27AFF' : '' }}>Formula:</h5>
                          <code className="text-sm text-gray-300 font-mono">{step.formula}</code>
                        </div>
                      )}
                      
                      {/* METEOR Analysis - Only for METEOR steps */}
                      {(step.name === 'Presisi (Precision)' || step.name === 'Recall' || step.name === 'F-Mean (F-Score)' || step.name === 'Penalti' || step.name === 'METEOR Score') && (
                        <GherkinStepAnalysis 
                          stepName={step.name}
                          generatedText={result.generatedText}
                          referenceText={result.referenceText}
                          stepValue={step.value}
                          testResult={result}
                          selectedSection={selectedSection}
                        />
                      )}
                      
                      {/* Sentence-BERT Analysis - Only for Sentence-BERT steps */}
                      {step.name === 'Tokenisasi' && (
                        <SentenceBertPreprocessingAnalysis 
                          generatedText={(() => {
                            console.log('🔍 [Tokenisasi] Calling getTextBySection with:', { selectedSection });
                            return getTextBySection(result.generatedText, selectedSection);
                          })()}
                          referenceText={(() => {
                            console.log('🔍 [Tokenisasi] Calling getTextBySection with:', { selectedSection });
                            return getTextBySection(result.referenceText, selectedSection);
                          })()}
                        />
                      )}
                      
                      {step.name === 'Input embedding' && (
                        <SentenceBertEncodingAnalysis 
                          generatedText={getTextBySection(result.generatedText, selectedSection)}
                          referenceText={getTextBySection(result.referenceText, selectedSection)}
                        />
                      )}
                      
                      {step.name === 'Self-Attention' && (
                        <SelfAttentionAnalysis 
                          generatedText={getTextBySection(result.generatedText, selectedSection)}
                          referenceText={getTextBySection(result.referenceText, selectedSection)}
                        />
                      )}
                      
                      {step.name === 'FFN + Residual + Layer Normalization' && (
                        <FFNResidualAnalysis 
                          generatedText={getTextBySection(result.generatedText, selectedSection)}
                          referenceText={getTextBySection(result.referenceText, selectedSection)}
                        />
                      )}
                      
                      {step.name === 'Mean pooling' && (
                        <MeanPoolingTabs 
                          data={(() => {
                            const detailedMetrics = result.detailed_metrics || {};
                            const details = result.details || {};
                            const sectionEmbeddings = detailedMetrics.section_embeddings || details.section_embeddings || {};
                            const overallEmbeddings = detailedMetrics.overall_embeddings || details.overall_embeddings || {};
                            
                            // Jika section spesifik dipilih, coba ambil section embeddings
                            if (selectedSection !== 'semua') {
                              const sectionData = sectionEmbeddings[selectedSection];
                              
                              if (sectionData && sectionData.generated && sectionData.reference) {
                                return {
                                  sentence1: {
                                    label: 'u',
                                    name: 'HYPOTHESIS H',
                                    embedding: sectionData.generated.slice(0, 8),
                                    fullEmbedding: sectionData.generated,
                                    fullDimension: sectionData.generated.length,
                                    numTokens: getTextBySection(result.generatedText, selectedSection).split(/\s+/).length + 2
                                  },
                                  sentence2: {
                                    label: 'v',
                                    name: 'REFERENCE R',
                                    embedding: sectionData.reference.slice(0, 8),
                                    fullEmbedding: sectionData.reference,
                                    fullDimension: sectionData.reference.length,
                                    numTokens: getTextBySection(result.referenceText, selectedSection).split(/\s+/).length + 2
                                  }
                                };
                              }
                            }
                            
                            // FALLBACK: Gunakan overall embeddings jika section embeddings tidak ada
                            // atau jika "semua" dipilih
                            if (overallEmbeddings.generated && overallEmbeddings.reference) {
                              console.log('ℹ️ Using overall embeddings for Mean Pooling (fallback or "semua" selected)');
                              return {
                                sentence1: {
                                  label: 'u',
                                  name: 'HYPOTHESIS H',
                                  embedding: overallEmbeddings.generated.slice(0, 8),
                                  fullEmbedding: overallEmbeddings.generated,
                                  fullDimension: overallEmbeddings.generated.length,
                                  numTokens: result.generatedText ? result.generatedText.split(/\s+/).length + 2 : 0
                                },
                                sentence2: {
                                  label: 'v',
                                  name: 'REFERENCE R',
                                  embedding: overallEmbeddings.reference.slice(0, 8),
                                  fullEmbedding: overallEmbeddings.reference,
                                  fullDimension: overallEmbeddings.reference.length,
                                  numTokens: result.referenceText ? result.referenceText.split(/\s+/).length + 2 : 0
                                }
                              };
                            }
                            
                            // Jika tidak ada data embeddings sama sekali, return null
                            console.warn('⚠️ No embeddings data found for Mean Pooling');
                            return null;
                          })()}
                        />
                      )}
                      
                      {step.name === 'Cosine Similarity' && (
                        <CosineSimilarityTabs 
                          actualScore={getDisplayScore(result, selectedSection)}
                          data={(() => {
                            const detailedMetrics = result.detailed_metrics || {};
                            const details = result.details || {};
                            const sectionEmbeddings = detailedMetrics.section_embeddings || details.section_embeddings || {};
                            const overallEmbeddings = detailedMetrics.overall_embeddings || details.overall_embeddings || {};
                            
                            // Jika section spesifik dipilih, coba ambil section embeddings
                            if (selectedSection !== 'semua') {
                              const sectionData = sectionEmbeddings[selectedSection];
                              
                              if (sectionData && sectionData.generated && sectionData.reference) {
                                return {
                                  sentence1: {
                                    label: 'u',
                                    name: 'HYPOTHESIS H',
                                    fullEmbedding: sectionData.generated,
                                    fullDimension: sectionData.generated.length,
                                    numTokens: getTextBySection(result.generatedText, selectedSection).split(/\s+/).length + 2
                                  },
                                  sentence2: {
                                    label: 'v',
                                    name: 'REFERENCE R',
                                    fullEmbedding: sectionData.reference,
                                    fullDimension: sectionData.reference.length,
                                    numTokens: getTextBySection(result.referenceText, selectedSection).split(/\s+/).length + 2
                                  }
                                };
                              }
                            }
                            
                            // FALLBACK: Gunakan overall embeddings jika section embeddings tidak ada
                            // atau jika "semua" dipilih
                            if (overallEmbeddings.generated && overallEmbeddings.reference) {
                              console.log('ℹ️ Using overall embeddings for Cosine Similarity (fallback or "semua" selected)');
                              return {
                                sentence1: {
                                  label: 'u',
                                  name: 'HYPOTHESIS H',
                                  fullEmbedding: overallEmbeddings.generated,
                                  fullDimension: overallEmbeddings.generated.length,
                                  numTokens: result.generatedText ? result.generatedText.split(/\s+/).length + 2 : 0
                                },
                                sentence2: {
                                  label: 'v',
                                  name: 'REFERENCE R',
                                  fullEmbedding: overallEmbeddings.reference,
                                  fullDimension: overallEmbeddings.reference.length,
                                  numTokens: result.referenceText ? result.referenceText.split(/\s+/).length + 2 : 0
                                }
                              };
                            }
                            
                            // Jika tidak ada data embeddings sama sekali, return null
                            console.warn('⚠️ No embeddings data found for Cosine Similarity');
                            return null;
                          })()}
                        />
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// Component for empty test state
const EmptyTestState = ({ 
  testType, 
  tabConfig, 
  onStartTest
}) => {
  return (
    <div className="p-16 text-center">
      {/* Icon - Landing Style */}
      <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br from-${tabConfig.color}-500/20 to-${tabConfig.color === 'purple' ? 'pink' : 'purple'}-500/20 flex items-center justify-center border border-${tabConfig.color}-500/20 mx-auto mb-8`}>
        <span className="text-4xl">{tabConfig.icon}</span>
      </div>
      
      <h3 className="text-2xl font-bold text-white mb-4">
        Belum Ada Hasil Pengujian
      </h3>
      
      <p className="text-gray-400 text-lg font-light mb-10 max-w-md mx-auto leading-relaxed">
        {tabConfig.description}
      </p>
      
      <div className="flex gap-4 justify-center">
        <button
          onClick={onStartTest}
          className={`px-6 py-3 rounded-xl transition-all font-medium text-sm bg-black hover:border-${tabConfig.color}-500/30 text-white`}
          style={{ borderWidth: '1px', borderStyle: 'solid', borderColor: '#0D0D0D' }}
        >
          Mulai Pengujian
        </button>
      </div>
    </div>
  );
};

// Component for Gherkin analysis within each step
const GherkinStepAnalysis = ({ stepName, generatedText, referenceText, stepValue, testResult, selectedSection }) => {
  // Debug logging untuk penalty
  console.log('?? [GherkinStepAnalysis] Debug info:', {
    stepName,
    testResult: testResult,
    detailed_metrics: testResult?.detailed_metrics || testResult?.details?.detailed_metrics,
    details: testResult?.details,
    penalty: testResult?.detailed_metrics?.penalty ?? testResult?.details?.penalty ?? testResult?.details?.fragmentation_penalty,
    chunks: testResult?.detailed_metrics?.chunks ?? testResult?.details?.chunks,
    matches: testResult?.detailed_metrics?.matches ?? testResult?.details?.matches
  });

  // Parse Gherkin scenarios into Given, When, Then parts
  const parseGherkinScenario = (text) => {
    if (!text) return { given: '', when: '', then: '' };
    
    const givenMatch = text.match(/Given\s+(.+?)(?=\s+When|$)/i);
    const whenMatch = text.match(/When\s+(.+?)(?=\s+Then|$)/i);
    const thenMatch = text.match(/Then\s+(.+?)$/i);
    
    return {
      given: givenMatch ? givenMatch[1].trim() : '',
      when: whenMatch ? whenMatch[1].trim() : '',
      then: thenMatch ? thenMatch[1].trim() : ''
    };
  };

  // Note: We no longer calculate metrics on frontend
  // All metrics come from backend NLTK METEOR calculation
  // This ensures consistency with official METEOR implementation

  // Highlight matching words
  const highlightMatchingWords = (text, referenceText, isGenerated = true) => {
    if (!text || !referenceText) return text;
    
    const words = text.split(/(\s+)/);
    const referenceWords = referenceText.toLowerCase().split(/\s+/);
    
    return words.map((word, index) => {
      const cleanWord = word.toLowerCase().replace(/[^\w]/g, '');
      const isMatching = referenceWords.some(refWord => {
        const cleanRefWord = refWord.replace(/[^\w]/g, '');
        return cleanRefWord === cleanWord || 
               (cleanRefWord.length > 2 && cleanWord.length > 2 && 
                (cleanRefWord.includes(cleanWord) || cleanWord.includes(cleanRefWord)));
      });
      
      if (isMatching && cleanWord.length > 0) {
        return (
          <span 
            key={index} 
            className={`${isGenerated ? 'bg-purple-500/30 text-purple-200' : 'bg-pink-500/30 text-pink-200'} px-1 rounded`}
          >
            {word}
          </span>
        );
      }
      return <span key={index}>{word}</span>;
    });
  };

  const getScoreColor = (score) => {
    if (score >= 0.8) return 'text-purple-400';
    if (score >= 0.6) return 'text-purple-300';
    if (score >= 0.4) return 'text-pink-400';
    return 'text-pink-300';
  };

  const generatedParts = parseGherkinScenario(generatedText);
  const referenceParts = parseGherkinScenario(referenceText);

  // Get metrics from backend (NLTK METEOR calculation per section)
  const detailedMetrics = testResult?.detailed_metrics || testResult?.details?.detailed_metrics || {};
  const details = testResult?.details || {};
  const sectionMetrics = detailedMetrics.section_metrics || {};
  
  // Debug: Log what we received from backend
  console.log('?? [GherkinStepAnalysis] Backend data:', {
    hasDetailedMetrics: !!testResult?.detailed_metrics,
    hasDetails: !!testResult?.details,
    hasSectionMetrics: !!sectionMetrics.given,
    sectionMetrics: sectionMetrics,
    detailedMetrics: detailedMetrics
  });
  
  // Use backend section metrics (will be empty object if not available yet)
  const givenMetrics = sectionMetrics.given || { precision: 0, recall: 0, matches: 0, generated_tokens: 0, reference_tokens: 0 };
  const whenMetrics = sectionMetrics.when || { precision: 0, recall: 0, matches: 0, generated_tokens: 0, reference_tokens: 0 };
  const thenMetrics = sectionMetrics.then || { precision: 0, recall: 0, matches: 0, generated_tokens: 0, reference_tokens: 0 };

  // Get relevant analysis based on step name with enhanced detail
  const getRelevantAnalysis = () => {
    if (stepName === 'Presisi (Precision)') {
      const detailedMetrics = testResult?.detailed_metrics || testResult?.details?.detailed_metrics || {};
      const sectionMetrics = detailedMetrics.section_metrics || {};
      
      // HANYA gunakan section-specific metrics (TIDAK ADA OVERALL)
      const sectionData = sectionMetrics[selectedSection] || {};
      const actualPrecision = sectionData.precision ?? 0;
      const actualMatches = sectionData.matches ?? 0;
      const actualGeneratedTokens = sectionData.generated_tokens ?? 0;
      
      console.log('?? [Presisi Analysis] Data:', {
        selectedSection,
        sectionMetrics,
        actualPrecision,
        actualMatches,
        actualGeneratedTokens
      });
      
      return {
        title: 'Analisis Presisi (Precision)',
        description: 'Precision mengukur akurasi kata yang dihasilkan dibandingkan dengan referensi.',
        formula: 'Presisi = (Total kata cocok) / (Total kata dihasilkan)',
        type: 'precision_analysis',
        actualData: {
          precision: actualPrecision,
          matches: actualMatches,
          generated_tokens: actualGeneratedTokens,
          ratio: actualGeneratedTokens > 0 ? actualMatches / actualGeneratedTokens : 0,
          calculation: `${actualMatches} / ${actualGeneratedTokens} = ${actualPrecision.toFixed(5)}`
        }
      };
    } else if (stepName === 'Recall') {
      const detailedMetrics = testResult?.detailed_metrics || testResult?.details?.detailed_metrics || {};
      const sectionMetrics = detailedMetrics.section_metrics || {};
      
      // HANYA gunakan section-specific metrics (TIDAK ADA OVERALL)
      const sectionData = sectionMetrics[selectedSection] || {};
      const actualRecall = sectionData.recall ?? 0;
      const actualMatches = sectionData.matches ?? 0;
      const actualReferenceTokens = sectionData.reference_tokens ?? 0;
      
      console.log('?? [Recall Analysis] Data:', {
        selectedSection,
        sectionMetrics,
        actualRecall,
        actualMatches,
        actualReferenceTokens
      });
      
      return {
        title: 'Analisis Recall',
        description: 'Recall mengukur kelengkapan informasi dari referensi yang tercakup.',
        formula: 'Recall = (Total kata cocok) / (Total kata referensi)',
        type: 'recall_analysis',
        actualData: {
          recall: actualRecall,
          matches: actualMatches,
          reference_tokens: actualReferenceTokens,
          ratio: actualReferenceTokens > 0 ? actualMatches / actualReferenceTokens : 0,
          calculation: `${actualMatches} / ${actualReferenceTokens} = ${actualRecall.toFixed(5)}`
        }
      };
    } else if (stepName === 'F-Mean (F-Score)') {
      const detailedMetrics = testResult?.detailed_metrics || testResult?.details?.detailed_metrics || {};
      const sectionMetrics = detailedMetrics.section_metrics || {};
      
      // HANYA gunakan section-specific metrics (TIDAK ADA OVERALL)
      const sectionData = sectionMetrics[selectedSection] || {};
      const precision = sectionData.precision ?? 0;
      const recall = sectionData.recall ?? 0;
      const fMean = sectionData.f_mean ?? 0;
      
      return {
        title: 'Visualisasi Keseimbangan Presisi dan Recall',
        description: 'F-Mean mengukur keseimbangan antara presisi dan recall dengan bobot lebih pada presisi. Formula memberikan penekanan 9:1 pada presisi.',
        formula: 'F-Mean = 10 × (P × R) / (9P + R)',
        type: 'balance_visualization',
        overallMetrics: {
          precision: precision,
          recall: recall,
          fMean: fMean,
          balance: Math.abs(precision - recall),
          numerator: 10 * precision * recall,
          denominator: 9 * precision + recall
        }
      };
    } else if (stepName === 'Penalti') {
      const detailedMetrics = testResult?.detailed_metrics || testResult?.details?.detailed_metrics || {};
      const sectionMetrics = detailedMetrics.section_metrics || {};
      
      // HANYA gunakan section-specific metrics (TIDAK ADA OVERALL)
      const sectionData = sectionMetrics[selectedSection] || {};
      const actualPenalty = sectionData.penalty ?? 0;
      const actualChunks = sectionData.chunks ?? 1;
      const actualMatches = sectionData.matches ?? 1;
      
      return {
        title: 'Analisis Fragmentasi Urutan Kata',
        description: 'Penalty mengukur seberapa terfragmentasi urutan kata yang cocok. Semakin banyak chunk terpisah, semakin tinggi penalty.',
        formula: 'Penalty = 0.5 × (Chunks / Matches)³',
        type: 'fragmentation_analysis',
        actualData: {
          penalty: actualPenalty,
          chunks: actualChunks,
          matches: actualMatches,
          ratio: actualMatches > 0 ? actualChunks / actualMatches : 0,
          calculation: `0.5 × (${actualChunks} / ${actualMatches})× = ${actualPenalty.toFixed(5)}`
        }
      };
    } else if (stepName === 'METEOR Score') {
      const detailedMetrics = testResult?.detailed_metrics || testResult?.details?.detailed_metrics || {};
      const sectionMetrics = detailedMetrics.section_metrics || {};
      
      return {
        title: 'Skor METEOR Per Section',
        description: 'Skor METEOR dihitung per section (Given, When, Then) untuk evaluasi yang lebih detail dan konsisten.',
        formula: 'METEOR = F-Mean × (1 - Penalty)',
        type: 'section_breakdown',
        selectedSection: selectedSection, // Pass selectedSection to rendering
        sections: {
          given: {
            score: sectionMetrics.given?.meteor_score ?? 0,
            precision: sectionMetrics.given?.precision ?? 0,
            recall: sectionMetrics.given?.recall ?? 0,
            f_mean: sectionMetrics.given?.f_mean ?? 0,
            penalty: sectionMetrics.given?.penalty ?? 0,
            matches: sectionMetrics.given?.matches ?? 0,
            generated_tokens: sectionMetrics.given?.generated_tokens ?? 0,
            reference_tokens: sectionMetrics.given?.reference_tokens ?? 0
          },
          when: {
            score: sectionMetrics.when?.meteor_score ?? 0,
            precision: sectionMetrics.when?.precision ?? 0,
            recall: sectionMetrics.when?.recall ?? 0,
            f_mean: sectionMetrics.when?.f_mean ?? 0,
            penalty: sectionMetrics.when?.penalty ?? 0,
            matches: sectionMetrics.when?.matches ?? 0,
            generated_tokens: sectionMetrics.when?.generated_tokens ?? 0,
            reference_tokens: sectionMetrics.when?.reference_tokens ?? 0
          },
          then: {
            score: sectionMetrics.then?.meteor_score ?? 0,
            precision: sectionMetrics.then?.precision ?? 0,
            recall: sectionMetrics.then?.recall ?? 0,
            f_mean: sectionMetrics.then?.f_mean ?? 0,
            penalty: sectionMetrics.then?.penalty ?? 0,
            matches: sectionMetrics.then?.matches ?? 0,
            generated_tokens: sectionMetrics.then?.generated_tokens ?? 0,
            reference_tokens: sectionMetrics.then?.reference_tokens ?? 0
          }
        },
        average: testResult.score || 0
      };
    } else if (stepName === 'Text Preprocessing') {
      // For Sentence-BERT Text Preprocessing
      return {
        title: 'Proses Pembersihan dan Persiapan Teks',
        description: 'Tahap preprocessing mempersiapkan teks agar dapat diproses oleh model BERT dengan optimal.',
        formula: 'Clean_Text = preprocess(raw_text)',
        type: 'text_preprocessing',
        steps: [
          { name: 'Lowercase Conversion', description: 'Mengubah semua huruf menjadi lowercase untuk konsistensi' },
          { name: 'Tokenization', description: 'Memecah teks menjadi token-token individual' },
          { name: 'Remove Special Characters', description: 'Menghapus karakter khusus yang tidak diperlukan' },
          { name: 'Normalize Whitespace', description: 'Menormalisasi spasi dan whitespace' }
        ],
        examples: {
          before: generatedText,
          after: generatedText?.toLowerCase().replace(/[^\w\s]/g, '').replace(/\s+/g, ' ').trim()
        }
      };
    } else if (stepName === 'Embedding Generation') {
      // For Sentence-BERT Embedding Generation
      return {
        title: 'Proses Konversi Teks ke Vector Embedding',
        description: 'Model Sentence-BERT mengubah teks menjadi representasi vektor numerik yang menangkap makna semantik.',
        formula: 'Vector = SentenceBERT_Encoder(preprocessed_text)',
        type: 'embedding_generation',
        modelInfo: {
          name: 'paraphrase-multilingual-MiniLM-L12-v2',
          architecture: 'Transformer-based (BERT)',
          vectorDimension: 384,
          encodingmethod: 'Multi-Head Attention',
          layers: 6,
          parameters: '22.7M'
        },
        process: [
          { step: 1, name: 'Tokenization', description: 'Teks dipecah menjadi token menggunakan WordPiece tokenizer' },
          { step: 2, name: 'Token Embedding', description: 'Setiap token dikonversi menjadi vektor embedding' },
          { step: 3, name: 'Transformer Encoding', description: 'Vektor diproses melalui 6 layer transformer untuk menangkap konteks' },
          { step: 4, name: 'Mean Pooling', description: 'Output dari semua token digabungkan menggunakan mean pooling' },
          { step: 5, name: 'Normalization', description: 'Vektor final dinormalisasi untuk perhitungan similarity' }
        ],
        output: {
          dimension: 384,
          description: 'Vektor 384 dimensi yang merepresentasikan makna semantik teks'
        }
      };
    } else if (stepName === 'Cosine Similarity') {
      // For Sentence-BERT Cosine Similarity
      // Try multiple paths to get metrics
      const detailedMetrics = testResult?.detailed_metrics || testResult?.details?.detailed_metrics || {};
      const details = testResult?.details || {};
      
      const dotProduct = detailedMetrics.dot_product ?? details.dot_product ?? (result.score * 1.0); // Approximate if not available
      const magnitudeA = detailedMetrics.magnitude_a ?? details.magnitude_a ?? 1.0;
      const magnitudeB = detailedMetrics.magnitude_b ?? details.magnitude_b ?? 1.0;
      
      return {
        title: 'Perhitungan Kesamaan Cosine antara Dua Vektor',
        description: 'Cosine similarity mengukur sudut antara dua vektor embedding untuk menentukan kesamaan semantik.',
        formula: 'Similarity = (A · B) / (||A|| × ||B||)',
        type: 'cosine_similarity',
        calculation: {
          dotProduct: dotProduct,
          magnitudeA: magnitudeA,
          magnitudeB: magnitudeB,
          similarity: result.score,
          steps: [
            { name: 'Dot Product (A · B)', value: dotProduct, description: 'Perkalian titik antara vektor A dan B', formula: `Σ(A[i] × B[i])` },
            { name: 'Magnitude A (||A||)', value: magnitudeA, description: 'Panjang vektor A', formula: `√(Σ(A[i]²))` },
            { name: 'Magnitude B (||B||)', value: magnitudeB, description: 'Panjang vektor B', formula: `√(Σ(B[i]²))` },
            { name: 'Cosine Similarity', value: result.score, description: 'Hasil akhir perhitungan', formula: `${dotProduct.toFixed(5)} / (${magnitudeA.toFixed(5)} × ${magnitudeB.toFixed(5)}) = ${result.score.toFixed(5)}` }
          ]
        },
        interpretation: {
          score: result.score,
          angle: Math.acos(Math.min(1, Math.max(-1, result.score))) * (180 / Math.PI),
          meaning: result.score >= 0.9 ? 'Sangat Mirip (Sudut < 25×)' :
                   result.score >= 0.8 ? 'Mirip (Sudut 25-36×)' :
                   result.score >= 0.7 ? 'Cukup Mirip (Sudut 36-45×)' :
                   result.score >= 0.5 ? 'Agak Mirip (Sudut 45-60×)' :
                   'Kurang Mirip (Sudut > 60×)'
        }
      };
    } else if (stepName === 'Semantic Score') {
      // For Sentence-BERT Semantic Score (Final)
      return {
        title: 'Skor Kesamaan Semantik Final',
        description: 'Skor akhir yang merepresentasikan tingkat kesamaan makna antara teks yang dihasilkan dan referensi.',
        formula: 'Score = normalize(Cosine_Similarity)',
        type: 'semantic_score',
        finalScore: {
          value: result.score,
          percentage: result.score * 100,
          normalized: true,
          range: '0.0 - 1.0'
        },
        comparison: {
          generatedText: generatedText,
          referenceText: referenceText,
          similarity: result.score
        },
        interpretation: {
          level: result.score >= 0.9 ? 'Excellent' :
                 result.score >= 0.8 ? 'Very Good' :
                 result.score >= 0.7 ? 'Good' :
                 result.score >= 0.6 ? 'Fair' :
                 'Poor',
          description: result.score >= 0.9 ? 'Teks memiliki makna yang hampir identik' :
                       result.score >= 0.8 ? 'Teks memiliki makna yang sangat mirip' :
                       result.score >= 0.7 ? 'Teks memiliki makna yang mirip' :
                       result.score >= 0.6 ? 'Teks memiliki makna yang cukup mirip' :
                       'Teks memiliki makna yang berbeda',
          recommendation: result.score < 0.7 ? 'Pertimbangkan untuk merevisi teks agar lebih sesuai dengan referensi' : 'Teks sudah sesuai dengan referensi'
        },
        advantages: [
          'Menangkap kesamaan semantik, bukan hanya kata-kata yang sama',
          'Robust terhadap parafrase dan sinonim',
          'Mempertimbangkan konteks kalimat secara keseluruhan',
          'Tidak terpengaruh oleh urutan kata yang berbeda jika makna sama'
        ]
      };
    }
    return null;
  };

  const analysis = getRelevantAnalysis();
  if (!analysis) return null;

  return (
    <>
      <div className="space-y-4">
        {/* Render berdasarkan tipe analisis */}
        {analysis.type === 'precision_analysis' && (
          <div className="bg-black rounded-xl p-6 shadow-lg" style={{ borderWidth: '1px', borderStyle: 'solid', borderColor: '#241931' }}>
            <h6 className="font-semibold text-white mb-4">
              Analisis Presisi (Precision)
            </h6>
            
            {/* Precision Ratio Visualization (70%) + Precision Card (30%) */}
            <div className="flex gap-6 mb-6">
              {/* Visualisasi Rasio Precision - 70% */}
              <div className="flex-1 flex items-center">
                {/* Visual Ratio Bar */}
                <div className="flex items-center gap-4 w-full">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#C27AFF' }}></div>
                      <span className="text-xs text-gray-400">Total kata cocok: {analysis.actualData.matches}</span>
                    </div>
                    <div className="w-full h-2 rounded-full" style={{ backgroundColor: '#120C18' }}>
                      <div 
                        className="h-2 rounded-full transition-all duration-1000"
                        style={{ 
                          width: `${Math.min((analysis.actualData.matches / Math.max(analysis.actualData.matches, analysis.actualData.generated_tokens)) * 100, 100)}%`,
                          backgroundColor: '#C27AFF'
                        }}
                      ></div>
                    </div>
                  </div>
                  
                  <div className="text-2xl font-bold" style={{ color: '#2C1A43' }}>/</div>
                  
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#FF7AD0' }}></div>
                      <span className="text-xs text-gray-400">Total kata dihasilkan: {analysis.actualData.generated_tokens}</span>
                    </div>
                    <div className="w-full h-2 rounded-full" style={{ backgroundColor: '#160D14' }}>
                      <div 
                        className="h-2 rounded-full transition-all duration-1000"
                        style={{ 
                          width: '100%',
                          backgroundColor: '#FF7AD0'
                        }}
                      ></div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Precision Card - 30% */}
              <div className="w-48 rounded-xl p-4 pt-12 pb-10" style={{ backgroundColor: '#000000', borderWidth: '1px', borderStyle: 'solid', borderColor: '#241931' }}>
                <div className="text-center">
                  <div className="text-white font-medium mb-4">Precision</div>
                  <div className="text-3xl font-bold mb-4" style={{ color: '#C27AFF' }}>
                    {analysis.actualData.precision.toFixed(5)}
                  </div>
                </div>
              </div>
            </div>

          </div>
        )}

        {analysis.type === 'recall_analysis' && (
          <div className="bg-black rounded-xl p-6 shadow-lg" style={{ borderWidth: '1px', borderStyle: 'solid', borderColor: '#241931' }}>
            <h6 className="font-semibold text-white mb-4">
              Analisis Recall
            </h6>
            
            {/* Recall Ratio Visualization (70%) + Recall Card (30%) */}
            <div className="flex gap-6 mb-6">
              {/* Visualisasi Rasio Recall - 70% */}
              <div className="flex-1 flex items-center">
                {/* Visual Ratio Bar */}
                <div className="flex items-center gap-4 w-full">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#C27AFF' }}></div>
                      <span className="text-xs text-gray-400">Total kata cocok: {analysis.actualData.matches}</span>
                    </div>
                    <div className="w-full h-2 rounded-full" style={{ backgroundColor: '#120C18' }}>
                      <div 
                        className="h-2 rounded-full transition-all duration-1000"
                        style={{ 
                          width: `${Math.min((analysis.actualData.matches / Math.max(analysis.actualData.matches, analysis.actualData.reference_tokens)) * 100, 100)}%`,
                          backgroundColor: '#C27AFF'
                        }}
                      ></div>
                    </div>
                  </div>
                  
                  <div className="text-2xl font-bold" style={{ color: '#2C1A43' }}>/</div>
                  
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#FF7AD0' }}></div>
                      <span className="text-xs text-gray-400">Total kata referensi: {analysis.actualData.reference_tokens}</span>
                    </div>
                    <div className="w-full h-2 rounded-full" style={{ backgroundColor: '#160D14' }}>
                      <div 
                        className="h-2 rounded-full transition-all duration-1000"
                        style={{ 
                          width: '100%',
                          backgroundColor: '#FF7AD0'
                        }}
                      ></div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Recall Card - 30% */}
              <div className="w-48 rounded-xl p-4 pt-12 pb-10" style={{ backgroundColor: '#000000', borderWidth: '1px', borderStyle: 'solid', borderColor: '#241931' }}>
                <div className="text-center">
                  <div className="text-white font-medium mb-4">Recall</div>
                  <div className="text-3xl font-bold mb-4" style={{ color: '#C27AFF' }}>
                    {analysis.actualData.recall.toFixed(5)}
                  </div>
                </div>
              </div>
            </div>

          </div>
        )}

        {analysis.type === 'calculation_only' && (
          <>
            <div className="grid grid-cols-3 gap-4 mb-4">
              {analysis.sections.map((section, index) => (
                <div key={index} className="bg-black rounded-xl p-4" style={{ borderWidth: '1px', borderStyle: 'solid', borderColor: '#2C1A43' }}>
                  <div className="flex items-center justify-between mb-3">
                    <h6 className="font-semibold text-white">
                      {section.name}
                    </h6>
                  </div>
                  <div className={`text-3xl font-bold ${getScoreColor(section.similarity)} mb-2 text-center`}>
                    {section.similarity.toFixed(5)}
                  </div>
                  <div className="text-xs text-gray-400 text-center mb-3">
                    {section.calculation}
                  </div>
                  <div className="text-xs text-gray-300 space-y-1">
                    <div className="flex justify-between">
                      <span>Kata cocok:</span>
                      <span className="text-purple-400">{section.metrics.matchingWords}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Total kata {stepName === 'Recall' ? 'referensi' : 'dihasilkan'}:</span>
                      <span className="text-pink-400">{stepName === 'Recall' ? section.metrics.referenceWords : section.metrics.generatedWords}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className="bg-gradient-to-r from-purple-500/10 to-pink-500/10 border border-purple-500/20 rounded-lg p-4 mt-4">
              <div className="text-sm text-gray-300 space-y-3">
                <div className="flex justify-between items-center">
                  <span className="font-semibold text-white">Total Keseluruhan (dari Backend):</span>
                  <span className="text-lg font-bold text-purple-400">
                    {stepName === 'Recall' ? testResult?.detailed_metrics?.recall?.toFixed(5) || testResult?.details?.recall?.toFixed(5) || '0.00000' : testResult?.detailed_metrics?.precision?.toFixed(5) || testResult?.details?.precision?.toFixed(5) || '0.00000'}
                  </span>
                </div>
                <div className="text-xs text-gray-400">
                  <div className="flex justify-between mb-1">
                    <span>Kata cocok:</span>
                    <span className="text-purple-400 font-semibold">{testResult?.detailed_metrics?.matches || testResult?.details?.matches || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Total kata {stepName === 'Recall' ? 'referensi' : 'dihasilkan'}:</span>
                    <span className="text-pink-400 font-semibold">{stepName === 'Recall' ? (testResult?.detailed_metrics?.reference_tokens || testResult?.details?.reference_tokens || 0) : (testResult?.detailed_metrics?.generated_tokens || testResult?.details?.generated_tokens || 0)}</span>
                  </div>
                  <div className="flex justify-between mt-1 pt-1 border-t border-gray-600">
                    <span>Perhitungan:</span>
                    <span className="text-gray-300 font-mono text-xs">
                      {testResult?.detailed_metrics?.matches || testResult?.details?.matches || 0} / {stepName === 'Recall' ? (testResult?.detailed_metrics?.reference_tokens || testResult?.details?.reference_tokens || 0) : (testResult?.detailed_metrics?.generated_tokens || testResult?.details?.generated_tokens || 0)} = {stepName === 'Recall' ? testResult?.detailed_metrics?.recall?.toFixed(5) || testResult?.details?.recall?.toFixed(5) || '0.00000' : testResult?.detailed_metrics?.precision?.toFixed(5) || testResult?.details?.precision?.toFixed(5) || '0.00000'}
                    </span>
                  </div>
                </div>
                <div className="text-xs text-yellow-300 pt-2 border-t border-yellow-500/20">
                  <div className="font-semibold mb-1">?? Kenapa berbeda dengan penjumlahan per section?</div>
                  <div className="text-gray-400 space-y-1">
                    <div>× <strong className="text-yellow-200">Overall menghitung FULL TEXT</strong> (termasuk keyword "Given", "When", "Then")</div>
                    <div>× <strong className="text-yellow-200">Per section hanya menghitung ISI</strong> (tanpa keyword)</div>
                    <div>× Keyword match sempurna di kedua teks ? Overall sedikit lebih tinggi (~0.002-0.003)</div>
                    <div>× METEOR menghitung kata duplikat dengan min(count_generated, count_reference)</div>
                    <div className="text-xs text-gray-500 mt-1">Contoh: kata "agen" muncul 3x di generated tapi 2x di reference = hanya 2x match</div>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}

        {analysis.type === 'gherkin_comparison' && (
          <>
            {analysis.sections.map((section, index) => (
              <div key={index} className="bg-black rounded-xl p-4 shadow-lg" style={{ borderWidth: '1px', borderStyle: 'solid', borderColor: '#0D0D0D' }}>
                <div className="flex items-center justify-between mb-3">
                  <h6 className="font-semibold text-white">
                    {section.name}
                  </h6>
                  <div className={`text-lg font-bold ${getScoreColor(section.similarity)}`}>
                    {section.similarity.toFixed(5)}
                  </div>
                </div>
                
                <div className="flex rounded-xl overflow-hidden" style={{ borderWidth: '1px', borderStyle: 'solid', borderColor: '#0D0D0D' }}>
                  {/* Generated Text - 50% */}
                  <div className="flex-1" style={{ borderRight: '1px solid #0D0D0D' }}>
                    <div className="p-3 bg-purple-500/5 border-b border-purple-500/20">
                      <div className="text-xs text-purple-300 font-medium">Teks yang Dihasilkan:</div>
                    </div>
                    <div className="p-3">
                      <div className="bg-purple-500/10 border border-purple-500/20 rounded-lg p-3">
                        <div className="text-sm font-mono">
                          <span className="text-purple-400 font-bold">{section.name} </span>
                          <span className="text-gray-300">
                            {highlightMatchingWords(section.generated, section.reference, true)}
                          </span>
                        </div>
                      </div>
                      <div className="text-xs text-gray-400 mt-2">
                        Kata cocok: <span className={getScoreColor(section.similarity)}>
                          {section.metrics ? section.metrics.matchingWords : Math.round(section.generated.split(/\s+/).length * section.similarity)} dari {section.generated.split(/\s+/).length}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  {/* Reference Text - 50% */}
                  <div className="flex-1">
                    <div className="p-3 bg-pink-500/5 border-b border-pink-500/20">
                      <div className="text-xs text-pink-300 font-medium">Teks Referensi:</div>
                    </div>
                    <div className="p-3">
                      <div className="bg-pink-500/10 border border-pink-500/20 rounded-lg p-3">
                        <div className="text-sm font-mono">
                          <span className="text-pink-400 font-bold">{section.name} </span>
                          <span className="text-gray-300">
                            {highlightMatchingWords(section.reference, section.generated, false)}
                          </span>
                        </div>
                      </div>
                      <div className="text-xs text-gray-400 mt-2">
                        Total kata: <span className="text-pink-400">{section.reference.split(/\s+/).length}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
            
            <div className="mt-4 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
              <div className="text-xs text-yellow-300">
                <div className="font-semibold mb-1">?? Catatan tentang Highlighting:</div>
                <div className="text-gray-400">
                  Kata yang di-highlight menunjukkan <strong>exact match</strong> dan <strong>substring match</strong> (contoh: "login" dan "logins"). 
                  Kata dengan <strong>sinonim</strong> (contoh: "mengklik" dan "menekan") tidak di-highlight karena memerlukan WordNet yang hanya tersedia di backend, 
                  namun tetap dihitung sebagai match dalam skor METEOR.
                </div>
              </div>
            </div>
          </>
        )}

        {analysis.type === 'balance_visualization' && (
          <div className="bg-black rounded-xl p-6 shadow-lg" style={{ borderWidth: '1px', borderStyle: 'solid', borderColor: '#241931' }}>
            <h6 className="font-semibold text-white mb-4">
              Keseimbangan Presisi vs Recall
            </h6>
            
            {/* Visual Balance Chart - Optimized Layout */}
            <div className="flex gap-6 mb-6">
              {/* Precision & Recall Bars - 70% */}
              <div className="flex-1 flex items-center">
                <div className="space-y-4 w-full">
                  {/* Precision Bar */}
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <span className="font-medium" style={{ color: '#C27AFF' }}>Presisi</span>
                      <span className="font-bold" style={{ color: '#C27AFF' }}>{analysis.overallMetrics.precision.toFixed(5)}</span>
                    </div>
                    <div className="w-full rounded-full h-2" style={{ backgroundColor: '#120C18' }}>
                      <div 
                        className="bg-gradient-to-r from-purple-500 to-purple-400 h-2 rounded-full transition-all duration-1000"
                        style={{ width: `${analysis.overallMetrics.precision * 100}%` }}
                      >
                      </div>
                    </div>
                  </div>

                  {/* Recall Bar */}
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <span className="font-medium" style={{ color: '#FF7AD0' }}>Recall</span>
                      <span className="font-bold" style={{ color: '#FF7AD0' }}>{analysis.overallMetrics.recall.toFixed(5)}</span>
                    </div>
                    <div className="w-full rounded-full h-2" style={{ backgroundColor: '#160D14' }}>
                      <div 
                        className="bg-gradient-to-r from-pink-500 to-pink-400 h-2 rounded-full transition-all duration-1000"
                        style={{ width: `${analysis.overallMetrics.recall * 100}%` }}
                      >
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* F-Mean Result - 30% */}
              <div className="w-48 rounded-xl p-4 pt-12 pb-10" style={{ backgroundColor: '#000000', borderWidth: '1px', borderStyle: 'solid', borderColor: '#241931' }}>
                <div className="text-center">
                  <div className="text-white font-medium mb-4">F-Mean</div>
                  <div className="text-3xl font-bold mb-4" style={{ color: '#C27AFF' }}>
                    {analysis.overallMetrics.fMean.toFixed(5)}
                  </div>
                </div>
              </div>
            </div>


          </div>
        )}

        {analysis.type === 'fragmentation_analysis' && (
          <div className="bg-black rounded-xl p-6 shadow-lg" style={{ borderWidth: '1px', borderStyle: 'solid', borderColor: '#241931' }}>
            <h6 className="font-semibold text-white mb-4">
              Analisis Fragmentasi Urutan Kata
            </h6>
            
            {/* Fragmentation Ratio Visualization (70%) + Penalty Card (30%) */}
            <div className="flex gap-6 mb-6">
              {/* Visualisasi Rasio Fragmentasi - 70% */}
              <div className="flex-1 flex items-center">
                {/* Visual Ratio Bar */}
                <div className="flex items-center gap-4 w-full">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#C27AFF' }}></div>
                      <span className="text-xs text-gray-400">Chunks: {analysis.actualData.chunks}</span>
                    </div>
                    <div className="w-full h-2 rounded-full" style={{ backgroundColor: '#120C18' }}>
                      <div 
                        className="h-2 rounded-full transition-all duration-1000"
                        style={{ 
                          width: `${Math.min((analysis.actualData.chunks / Math.max(analysis.actualData.chunks, analysis.actualData.matches)) * 100, 100)}%`,
                          backgroundColor: '#C27AFF'
                        }}
                      ></div>
                    </div>
                  </div>
                  
                  <div className="text-2xl font-bold" style={{ color: '#2C1A43' }}>/</div>
                  
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#FF7AD0' }}></div>
                      <span className="text-xs text-gray-400">Matches: {analysis.actualData.matches}</span>
                    </div>
                    <div className="w-full h-2 rounded-full" style={{ backgroundColor: '#160D14' }}>
                      <div 
                        className="h-2 rounded-full transition-all duration-1000"
                        style={{ 
                          width: '100%',
                          backgroundColor: '#FF7AD0'
                        }}
                      ></div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Penalty Card - 30% */}
              <div className="w-48 rounded-xl p-4 pt-12 pb-10" style={{ backgroundColor: '#000000', borderWidth: '1px', borderStyle: 'solid', borderColor: '#241931' }}>
                <div className="text-center">
                  <div className="text-white font-medium mb-4">Penalty</div>
                  <div className="text-3xl font-bold mb-4" style={{ color: '#C27AFF' }}>
                    {analysis.actualData.penalty.toFixed(5)}
                  </div>
                </div>
              </div>
            </div>

          </div>
        )}

        {analysis.type === 'section_breakdown' && (
          <div className="bg-black rounded-xl p-6 shadow-lg" style={{ borderWidth: '1px', borderStyle: 'solid', borderColor: '#241931' }}>
            <h6 className="font-semibold text-white mb-4">
              Perhitungan METEOR Score
            </h6>
            
            {/* Visual Balance Chart - Optimized Layout */}
            <div className="flex gap-6 mb-6">
              {/* F-Mean & Penalty Bars - 70% */}
              <div className="flex-1 flex items-center">
                <div className="space-y-4 w-full">
                  {/* F-Mean Bar */}
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <span className="font-medium" style={{ color: '#C27AFF' }}>F-Mean</span>
                      <span className="font-bold" style={{ color: '#C27AFF' }}>{analysis.sections[selectedSection]?.f_mean?.toFixed(5) || '0.00000'}</span>
                    </div>
                    <div className="w-full rounded-full h-2" style={{ backgroundColor: '#120C18' }}>
                      <div 
                        className="bg-gradient-to-r from-purple-500 to-purple-400 h-2 rounded-full transition-all duration-1000"
                        style={{ width: `${(analysis.sections[selectedSection]?.f_mean || 0) * 100}%` }}
                      >
                      </div>
                    </div>
                  </div>

                  {/* Penalty Bar */}
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <span className="font-medium" style={{ color: '#FF7AD0' }}>Penalty</span>
                      <span className="font-bold" style={{ color: '#FF7AD0' }}>{analysis.sections[selectedSection]?.penalty?.toFixed(5) || '0.00000'}</span>
                    </div>
                    <div className="w-full rounded-full h-2" style={{ backgroundColor: '#160D14' }}>
                      <div 
                        className="bg-gradient-to-r from-pink-500 to-pink-400 h-2 rounded-full transition-all duration-1000"
                        style={{ width: `${(analysis.sections[selectedSection]?.penalty || 0) * 100}%` }}
                      >
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* METEOR Score Result - 30% */}
              <div className="w-48 rounded-xl p-4 pt-12 pb-10" style={{ backgroundColor: '#000000', borderWidth: '1px', borderStyle: 'solid', borderColor: '#241931' }}>
                <div className="text-center">
                  <div className="text-white font-medium mb-4">METEOR Score</div>
                  <div className="text-3xl font-bold mb-4" style={{ color: '#C27AFF' }}>
                    {analysis.sections[selectedSection]?.score?.toFixed(5) || analysis.average?.toFixed(5) || '0.00000'}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {analysis.type === 'component_summary' && (
          <>
            {/* F-Mean and Penalty Cards - 50% each */}
            <div className="flex gap-6 mb-6">
              {/* F-Mean Card - 50% */}
              <div className="flex-1 rounded-xl p-6 text-center" style={{ backgroundColor: '#000000', borderWidth: '1px', borderStyle: 'solid', borderColor: '#2C1A43' }}>
                <div className="text-sm text-gray-400 mb-2">F-Mean</div>
                <div className="text-4xl font-bold" style={{ color: '#C27AFF' }}>
                  {analysis.components.fMean.toFixed(5)}
                </div>
              </div>

              {/* Penalty Card - 50% */}
              <div className="flex-1 rounded-xl p-6 text-center" style={{ backgroundColor: '#000000', borderWidth: '1px', borderStyle: 'solid', borderColor: '#2C1A43' }}>
                <div className="text-sm text-gray-400 mb-2">Penalty</div>
                <div className="text-4xl font-bold" style={{ color: '#FF7AD0' }}>
                  {analysis.components.penalty.toFixed(5)}
                </div>
              </div>
            </div>

            {/* METEOR Score - No Container */}
            <div className="text-center mb-16 mt-8">
              <div className="text-sm text-gray-400 mb-4">METEOR Score</div>
              <div className="text-5xl font-bold mb-4" style={{ color: '#C27AFF' }}>
                {analysis.components.finalScore.toFixed(5)}
              </div>
              <div className="text-xs text-gray-500 font-mono">
                {analysis.components.fMean.toFixed(5)} × (1 - {analysis.components.penalty.toFixed(5)})
              </div>
            </div>
          </>
        )}

        {/* Sentence-BERT: Text Preprocessing */}
        {analysis.type === 'text_preprocessing' && (
          <div className="bg-black rounded-xl p-6 shadow-lg" style={{ borderWidth: '1px', borderStyle: 'solid', borderColor: '#0D0D0D' }}>
            <h6 className="font-semibold text-white mb-4 flex items-center gap-2">
              <span>??</span> Tahapan Preprocessing Teks
            </h6>
            
            {/* Preprocessing Steps */}
            <div className="grid grid-cols-2 gap-4 mb-6">
              {analysis.steps.map((step, index) => (
                <div key={index} className="bg-purple-500/10 border border-purple-500/20 rounded-xl p-4">
                  <div className="flex items-center gap-3 mb-2">
                    <span className="text-2xl">{step.icon}</span>
                    <h6 className="font-semibold text-purple-300">{step.name}</h6>
                  </div>
                  <p className="text-sm text-gray-300">{step.description}</p>
                </div>
              ))}
            </div>

            {/* Before/After Example */}
            <div className="space-y-4 mb-6">
              <div className="bg-purple-500/10 border border-purple-500/20 rounded-xl p-4">
                <h6 className="font-semibold text-purple-300 mb-2 flex items-center gap-2">
                  <span>??</span> Sebelum Preprocessing:
                </h6>
                <div className="text-sm text-gray-300 font-mono bg-black p-3 rounded-lg">
                  {analysis.examples.before}
                </div>
              </div>
              
              <div className="bg-pink-500/10 border border-pink-500/20 rounded-xl p-4">
                <h6 className="font-semibold text-pink-300 mb-2 flex items-center gap-2">
                  <span>?</span> Setelah Preprocessing:
                </h6>
                <div className="text-sm text-gray-300 font-mono bg-black p-3 rounded-lg">
                  {analysis.examples.after}
                </div>
              </div>
            </div>

            {/* Detailed Analysis */}
            <div className="bg-purple-500/10 border border-purple-500/20 rounded-xl p-4">
              <h6 className="font-semibold text-purple-300 mb-3 flex items-center gap-2">
                <span>??</span> Analisis Detail Preprocessing:
              </h6>
              <div className="space-y-3 text-sm text-gray-300">
                <div className="flex items-start gap-2">
                  <span className="text-purple-400 mt-1">?</span>
                  <div>
                    <strong>Lowercase Conversion:</strong> Semua huruf kapital diubah menjadi huruf kecil untuk memastikan konsistensi. 
                    Contoh: "Given" ? "given", "WHEN" ? "when"
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-purple-400 mt-1">?</span>
                  <div>
                    <strong>Tokenization:</strong> Teks dipecah menjadi token-token individual berdasarkan spasi dan tanda baca. 
                    Ini mempersiapkan teks untuk diproses oleh model BERT.
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-purple-400 mt-1">?</span>
                  <div>
                    <strong>Remove Special Characters:</strong> Karakter khusus yang tidak diperlukan dihapus untuk mengurangi noise. 
                    Hanya karakter alfanumerik dan spasi yang dipertahankan.
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-purple-400 mt-1">?</span>
                  <div>
                    <strong>Normalize Whitespace:</strong> Spasi berlebih dihapus dan whitespace dinormalisasi menjadi single space. 
                    Ini memastikan format teks yang konsisten.
                  </div>
                </div>
              </div>
              <div className="mt-4 p-3 bg-black border border-white/10 rounded-lg">
                <div className="text-xs text-gray-400">
                  ?? <strong>Mengapa Preprocessing Penting:</strong> Preprocessing memastikan teks dalam format yang optimal untuk model BERT. 
                  Tanpa preprocessing, model mungkin menganggap "User" dan "user" sebagai token yang berbeda, atau terganggu oleh karakter khusus yang tidak relevan.
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Sentence-BERT: Embedding Generation */}
        {analysis.type === 'embedding_generation' && (
          <div className="bg-black rounded-xl p-6 shadow-lg" style={{ borderWidth: '1px', borderStyle: 'solid', borderColor: '#0D0D0D' }}>
            <h6 className="font-semibold text-white mb-4 flex items-center gap-2">
              <span>??</span> Proses Encoding dengan Sentence-BERT
            </h6>
            
            {/* Model Information */}
            <div className="bg-purple-500/10 border border-purple-500/20 rounded-xl p-4 mb-6">
              <h6 className="font-semibold text-purple-300 mb-3">Informasi Model:</h6>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <div className="text-xs text-gray-400">Model</div>
                  <div className="text-sm text-white font-semibold">{analysis.modelInfo.name}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-400">Dimensi Vektor</div>
                  <div className="text-sm text-white font-semibold">{analysis.modelInfo.vectorDimension}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-400">Metode Encoding</div>
                  <div className="text-sm text-white font-semibold">{analysis.modelInfo.encodingMethod}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-400">Arsitektur</div>
                  <div className="text-sm text-white font-semibold">{analysis.modelInfo.architecture}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-400">Jumlah Layer</div>
                  <div className="text-sm text-white font-semibold">{analysis.modelInfo.layers}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-400">Parameter</div>
                  <div className="text-sm text-white font-semibold">{analysis.modelInfo.parameters}</div>
                </div>
              </div>
            </div>

            {/* Encoding Process Flow */}
            <div className="space-y-3 mb-6">
              {analysis.process.map((step, index) => (
                <div key={index} className="flex items-start gap-4 bg-black border border-white/10 rounded-xl p-4">
                  <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500/20 to-purple-500/20 border border-white/10 flex items-center justify-center">
                    <span className="text-2xl">{step.icon}</span>
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-bold text-purple-400">Step {step.step}</span>
                      <h6 className="font-semibold text-white">{step.name}</h6>
                    </div>
                    <p className="text-sm text-gray-300">{step.description}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Detailed Analysis of Encoding Process */}
            <div className="bg-purple-500/10 border border-purple-500/20 rounded-xl p-4 mb-6">
              <h6 className="font-semibold text-purple-300 mb-3">
                Analisis Detail Proses Encoding:
              </h6>
              <div className="space-y-3 text-sm text-gray-300">
                <div className="flex items-start gap-2">
                  <span className="text-purple-400 mt-1">1.</span>
                  <div>
                    <strong>Tokenization (WordPiece):</strong> Teks dipecah menjadi subword tokens menggunakan WordPiece tokenizer. 
                    Contoh: "logging" ? ["log", "##ging"]. Ini memungkinkan model menangani kata-kata yang jarang muncul dengan lebih baik.
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-purple-400 mt-1">2.</span>
                  <div>
                    <strong>Token Embedding:</strong> Setiap token dikonversi menjadi vektor embedding 384 dimensi. 
                    Token yang sama selalu menghasilkan embedding yang sama, tetapi konteks akan mengubahnya di layer berikutnya.
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-purple-400 mt-1">3.</span>
                  <div>
                    <strong>Transformer Encoding (6 Layers):</strong> Vektor embedding diproses melalui 6 layer transformer. 
                    Setiap layer menggunakan self-attention untuk menangkap hubungan antar kata dan konteks kalimat. 
                    Layer yang lebih dalam menangkap makna semantik yang lebih abstrak.
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-purple-400 mt-1">4.</span>
                  <div>
                    <strong>Mean Pooling:</strong> Output dari semua token digabungkan menggunakan mean pooling (rata-rata). 
                    Ini menghasilkan satu vektor 384 dimensi yang merepresentasikan makna keseluruhan kalimat, bukan hanya kata individual.
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-purple-400 mt-1">5.</span>
                  <div>
                    <strong>Normalization:</strong> Vektor final dinormalisasi (panjang vektor = 1) untuk memudahkan perhitungan cosine similarity. 
                    Normalisasi memastikan bahwa panjang teks tidak mempengaruhi skor similarity.
                  </div>
                </div>
              </div>
            </div>

            {/* Output Information */}
            <div className="bg-pink-500/10 border border-pink-500/20 rounded-xl p-4">
              <h6 className="font-semibold text-pink-300 mb-2 flex items-center gap-2">
                <span>??</span> Output Embedding:
              </h6>
              <div className="text-sm text-gray-300 space-y-2">
                <div>
                  <strong>Dimensi:</strong> {analysis.output.dimension} (vektor numerik)
                </div>
                <div>
                  <strong>Deskripsi:</strong> {analysis.output.description}
                </div>
                <div className="pt-2 border-t border-green-500/30">
                  <strong>Contoh Representasi:</strong> Vektor [0.123, -0.456, 0.789, ..., 0.234] dengan 384 nilai float yang merepresentasikan makna semantik teks dalam ruang vektor multidimensi.
                </div>
                <div className="text-xs text-gray-400 mt-2 p-2 bg-black rounded">
                  ?? <strong>Keunggulan:</strong> Vektor embedding menangkap makna semantik, sehingga kalimat dengan kata berbeda tetapi makna sama akan memiliki vektor yang mirip. 
                  Contoh: "user login" dan "pengguna masuk" akan memiliki vektor yang dekat meskipun kata-katanya berbeda.
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Sentence-BERT: Cosine Similarity */}
        {analysis.type === 'cosine_similarity' && (
          <div className="bg-black rounded-xl p-6 shadow-lg" style={{ borderWidth: '1px', borderStyle: 'solid', borderColor: '#0D0D0D' }}>
            <h6 className="font-semibold text-white mb-4 flex items-center gap-2">
              <span>??</span> Perhitungan Cosine Similarity
            </h6>
            
            {/* Calculation Steps */}
            <div className="space-y-4 mb-6">
              {analysis.calculation.steps.map((step, index) => (
                <div key={index} className="bg-black border border-white/10 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h6 className="font-semibold text-purple-300">{step.name}</h6>
                    <div className={`text-xl font-bold ${getScoreColor(step.value)}`}>
                      {step.value.toFixed(5)}
                    </div>
                  </div>
                  <p className="text-sm text-gray-300 mb-2">{step.description}</p>
                  <div className="bg-purple-500/10 border border-purple-500/20 rounded-lg p-3">
                    <code className="text-sm text-purple-200 font-mono">{step.formula}</code>
                  </div>
                </div>
              ))}
            </div>

            {/* Detailed Analysis of Calculation */}
            <div className="bg-purple-500/10 border border-purple-500/20 rounded-xl p-4 mb-6">
              <h6 className="font-semibold text-purple-300 mb-3">
                Analisis Detail Perhitungan:
              </h6>
              <div className="space-y-3 text-sm text-gray-300">
                <div className="flex items-start gap-2">
                  <span className="text-purple-400 mt-1">1.</span>
                  <div>
                    <strong>Dot Product (A × B):</strong> Perkalian titik antara vektor A (teks yang dihasilkan) dan vektor B (teks referensi). 
                    Dihitung dengan menjumlahkan hasil perkalian setiap elemen: S(A[i] × B[i]) untuk i = 0 hingga 383.
                    <div className="mt-1 text-xs text-gray-400">
                      Contoh: A[0]×B[0] + A[1]×B[1] + ... + A[383]×B[383] = {analysis.calculation.dotProduct.toFixed(5)}
                    </div>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-purple-400 mt-1">2.</span>
                  <div>
                    <strong>Magnitude A (||A||):</strong> Panjang vektor A, dihitung dengan akar kuadrat dari jumlah kuadrat semua elemen: v(S(A[i]×)).
                    <div className="mt-1 text-xs text-gray-400">
                      Hasil: v(A[0]× + A[1]× + ... + A[383]×) = {analysis.calculation.magnitudeA.toFixed(5)}
                    </div>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-purple-400 mt-1">3.</span>
                  <div>
                    <strong>Magnitude B (||B||):</strong> Panjang vektor B, dihitung dengan cara yang sama seperti magnitude A.
                    <div className="mt-1 text-xs text-gray-400">
                      Hasil: v(B[0]× + B[1]× + ... + B[383]×) = {analysis.calculation.magnitudeB.toFixed(5)}
                    </div>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-purple-400 mt-1">4.</span>
                  <div>
                    <strong>Cosine Similarity:</strong> Hasil akhir diperoleh dengan membagi dot product dengan perkalian kedua magnitude.
                    <div className="mt-1 text-xs text-gray-400">
                      Perhitungan: {analysis.calculation.dotProduct.toFixed(5)} × ({analysis.calculation.magnitudeA.toFixed(5)} × {analysis.calculation.magnitudeB.toFixed(5)}) = {analysis.calculation.similarity.toFixed(5)}
                    </div>
                  </div>
                </div>
              </div>
              <div className="mt-4 p-3 bg-black border border-white/10 rounded-lg">
                <div className="text-xs text-gray-400">
                  ?? <strong>Mengapa Cosine Similarity:</strong> Cosine similarity mengukur sudut antara dua vektor, bukan jarak euclidean. 
                  Ini berarti fokus pada arah vektor (makna semantik) bukan panjangnya (jumlah kata). 
                  Nilai 1.0 = vektor identik (sudut 0×), nilai 0.0 = vektor ortogonal (sudut 90×), nilai -1.0 = vektor berlawanan (sudut 180×).
                </div>
              </div>
            </div>

            {/* Visual Interpretation */}
            <div className="bg-gradient-to-r from-purple-500/10 to-pink-500/10 border border-purple-500/20 rounded-xl p-4">
              <h6 className="font-semibold text-purple-300 mb-3">
                Interpretasi Geometris:
              </h6>
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="bg-black border border-white/10 rounded-lg p-3">
                  <div className="text-xs text-gray-400 mb-1">Skor Similarity</div>
                  <div className={`text-2xl font-bold ${getScoreColor(analysis.interpretation.score)}`}>
                    {(analysis.interpretation.score * 100).toFixed(1)}%
                  </div>
                </div>
                <div className="bg-black border border-white/10 rounded-lg p-3">
                  <div className="text-xs text-gray-400 mb-1">Sudut antara Vektor</div>
                  <div className="text-2xl font-bold text-orange-400">
                    {analysis.interpretation.angle.toFixed(1)}×
                  </div>
                </div>
              </div>
              <div className="p-3 bg-black border border-white/10 rounded-lg mb-3">
                <div className="text-sm text-gray-300">
                  <strong>Makna:</strong> {analysis.interpretation.meaning}
                </div>
              </div>
              <div className="text-xs text-gray-400 p-2 bg-black rounded">
                ?? Semakin kecil sudut (mendekati 0×), semakin mirip makna kedua teks. 
                Sudut 0× = teks identik secara semantik, sudut 90× = teks tidak berhubungan.
              </div>
            </div>
          </div>
        )}

        {/* Sentence-BERT: Semantic Score (Final) */}
        {analysis.type === 'semantic_score' && (
          <div className="bg-black rounded-xl p-6 shadow-lg" style={{ borderWidth: '1px', borderStyle: 'solid', borderColor: '#0D0D0D' }}>
            <h6 className="font-semibold text-white mb-4">
              Skor Kesamaan Semantik Final
            </h6>
            
            {/* Final Score Display */}
            <div className="bg-gradient-to-r from-blue-500/10 to-purple-500/10 border border-blue-500/20 rounded-xl p-6 mb-6 text-center">
              <div className={`text-6xl font-bold ${getScoreColor(analysis.finalScore.value)} mb-4`}>
                {analysis.finalScore.percentage.toFixed(1)}%
              </div>
              <div className="text-xl font-semibold text-white mb-2">
                {analysis.interpretation.level}
              </div>
              <div className="text-sm text-gray-300">
                {analysis.interpretation.description}
              </div>
            </div>

            {/* Detailed Analysis of Final Score */}
            <div className="bg-purple-500/10 border border-purple-500/20 rounded-xl p-4 mb-6">
              <h6 className="font-semibold text-purple-300 mb-3">
                Analisis Detail Skor Final:
              </h6>
              <div className="space-y-3 text-sm text-gray-300">
                <div className="flex items-start gap-2">
                  <span className="text-purple-400 mt-1">?</span>
                  <div>
                    <strong>Normalisasi Skor:</strong> Skor cosine similarity sudah dalam rentang 0.0 - 1.0, sehingga tidak perlu normalisasi tambahan. 
                    Skor {(analysis.finalScore.value * 100).toFixed(1)}% menunjukkan tingkat kesamaan semantik antara kedua teks.
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-purple-400 mt-1">?</span>
                  <div>
                    <strong>Interpretasi Skor:</strong> 
                    <div className="mt-1 space-y-1 text-xs">
                      <div>× 90-100%: Teks hampir identik secara semantik</div>
                      <div>× 80-89%: Teks sangat mirip, perbedaan minor</div>
                      <div>× 70-79%: Teks mirip, beberapa perbedaan detail</div>
                      <div>× 60-69%: Teks cukup mirip, perbedaan signifikan</div>
                      <div>× &lt;60%: Teks berbeda secara semantik</div>
                    </div>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-purple-400 mt-1">?</span>
                  <div>
                    <strong>Konteks Skor Anda ({(analysis.finalScore.value * 100).toFixed(1)}%):</strong> {analysis.interpretation.description}
                    {analysis.finalScore.value >= 0.8 && (
                      <div className="mt-1 text-xs text-green-400">
                        ? Skor ini menunjukkan kualitas yang sangat baik. Teks yang dihasilkan menangkap makna referensi dengan akurat.
                      </div>
                    )}
                    {analysis.finalScore.value >= 0.7 && analysis.finalScore.value < 0.8 && (
                      <div className="mt-1 text-xs text-blue-400">
                        ? Skor ini menunjukkan kualitas yang baik. Ada beberapa perbedaan detail tetapi makna utama sudah tercakup.
                      </div>
                    )}
                    {analysis.finalScore.value < 0.7 && (
                      <div className="mt-1 text-xs text-yellow-400">
                        ? Skor ini menunjukkan ada perbedaan signifikan. Pertimbangkan untuk merevisi teks agar lebih sesuai dengan referensi.
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Comparison Summary */}
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4">
                <h6 className="font-semibold text-blue-300 mb-2">Teks yang Dihasilkan</h6>
                <div className="text-sm text-gray-300 bg-black p-3 rounded-lg max-h-32 overflow-y-auto">
                  {analysis.comparison.generatedText}
                </div>
              </div>
              <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-4">
                <h6 className="font-semibold text-green-300 mb-2">Teks Referensi</h6>
                <div className="text-sm text-gray-300 bg-black p-3 rounded-lg max-h-32 overflow-y-auto">
                  {analysis.comparison.referenceText}
                </div>
              </div>
            </div>

            {/* Recommendation */}
            {analysis.interpretation.recommendation && (
              <div className={`p-4 rounded-xl mb-6 ${
                analysis.finalScore.value >= 0.7 
                  ? 'bg-green-500/10 border border-green-500/20' 
                  : 'bg-yellow-500/10 border border-yellow-500/20'
              }`}>
                <div className="flex items-start gap-3">
                  <span className="text-2xl">{analysis.finalScore.value >= 0.7 ? '?' : '??'}</span>
                  <div>
                    <h6 className={`font-semibold mb-1 ${
                      analysis.finalScore.value >= 0.7 ? 'text-green-300' : 'text-yellow-300'
                    }`}>
                      Rekomendasi:
                    </h6>
                    <p className="text-sm text-gray-300">{analysis.interpretation.recommendation}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Advantages of Sentence-BERT */}
            <div className="bg-purple-500/10 border border-purple-500/20 rounded-xl p-4">
              <h6 className="font-semibold text-purple-300 mb-3 flex items-center gap-2">
                <span>?</span> Keunggulan Sentence-BERT:
              </h6>
              <ul className="space-y-2">
                {analysis.advantages.map((advantage, index) => (
                  <li key={index} className="text-sm text-gray-300 flex items-start gap-2">
                    <span className="text-green-400 mt-1">?</span>
                    <span>{advantage}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-4 p-3 bg-black border border-white/10 rounded-lg">
                <div className="text-xs text-gray-400">
                  ?? <strong>Catatan Penting:</strong> Sentence-BERT menggunakan deep learning untuk memahami makna, bukan hanya mencocokkan kata. 
                  Ini membuatnya lebih akurat dalam mengevaluasi kualitas teks dibandingkan metode berbasis kata seperti METEOR, 
                  terutama untuk teks dengan parafrase atau sinonim.
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

// Component for Sentence-BERT Text Preprocessing Analysis
const SentenceBertPreprocessingAnalysis = ({ generatedText, referenceText }) => {
  // Simulate tokenization (actual tokenization is done by BERT internally)
  const simulateTokenization = (text) => {
    if (!text) return [];
    
    // Simulasi WordPiece tokenization yang lebih realistis
    const words = text.toLowerCase().split(/\s+/).filter(t => t.length > 0);
    const tokens = [];
    
    // Vocabulary umum bahasa Indonesia dan English
    const commonWords = new Set([
      'given', 'when', 'then', 'and', 'the', 'is', 'on', 'to', 'a', 'in', 'of', 'for',
      'yang', 'dan', 'pada', 'di', 'dengan', 'ke', 'dari', 'untuk', 'serta', 'atau',
      'user', 'sistem', 'login', 'email', 'password', 'tombol', 'halaman', 'aplikasi',
      'pengguna', 'berada', 'telah', 'benar', 'masuk', 'valid', 'kredensial'
    ]);
    
    // Prefix umum bahasa Indonesia
    const commonPrefixes = ['mem', 'men', 'meng', 'me', 'peng', 'per', 'ber', 'ter', 'di', 'ke'];
    
    words.forEach(word => {
      // Hapus tanda baca
      const cleanWord = word.replace(/[.,!?;:"()]/g, '');
      if (!cleanWord) return;
      
      // Jika kata ada di vocabulary, tidak dipecah
      if (commonWords.has(cleanWord)) {
        tokens.push(cleanWord);
        return;
      }
      
      // Kata pendek tidak dipecah
      if (cleanWord.length <= 5) {
        tokens.push(cleanWord);
        return;
      }
      
      // Coba deteksi prefix bahasa Indonesia
      let prefixFound = false;
      for (const prefix of commonPrefixes) {
        if (cleanWord.startsWith(prefix) && cleanWord.length > prefix.length + 3) {
          tokens.push(prefix);
          tokens.push('##' + cleanWord.substring(prefix.length));
          prefixFound = true;
          break;
        }
      }
      
      // Jika tidak ada prefix, pecah kata panjang (>8 karakter)
      if (!prefixFound) {
        if (cleanWord.length > 8) {
          // Pecah di tengah atau cari vokal untuk pemecahan yang lebih natural
          const vowels = ['a', 'e', 'i', 'o', 'u'];
          let splitPos = Math.floor(cleanWord.length / 2);
          
          // Cari posisi vokal terdekat untuk pemecahan yang lebih natural
          for (let i = splitPos; i < Math.min(splitPos + 3, cleanWord.length); i++) {
            if (vowels.includes(cleanWord[i])) {
              splitPos = i + 1;
              break;
            }
          }
          
          tokens.push(cleanWord.substring(0, splitPos));
          tokens.push('##' + cleanWord.substring(splitPos));
        } else {
          tokens.push(cleanWord);
        }
      }
    });
    
    return tokens;
  };

  const genTokens = simulateTokenization(generatedText);
  const refTokens = simulateTokenization(referenceText);

  return (
    <div className="space-y-4">
      {/* Hypothesis Container */}
      <div className="border border-pink-500/20 rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="text-sm font-semibold text-gray-300">
            Hypothesis → {genTokens.length + 2} token input
          </div>
        </div>
        
        {/* Token Display */}
        <div className="flex flex-wrap gap-2">
          <span className="inline-block px-2.5 py-1 rounded text-xs font-mono" style={{ backgroundColor: '#160D14', borderColor: '#44273D', borderWidth: '1px', color: '#FF7AD0' }}>
            [CLS]
          </span>
          {genTokens.map((token, idx) => (
            <span 
              key={idx}
              className="inline-block px-2.5 py-1 rounded text-xs font-mono"
              style={{ backgroundColor: '#0D0D0D', borderColor: 'rgba(255, 255, 255, 0.05)', borderWidth: '1px', color: '#FFFFFF' }}
            >
              {token}
            </span>
          ))}
          <span className="inline-block px-2.5 py-1 rounded text-xs font-mono" style={{ backgroundColor: '#160D14', borderColor: '#44273D', borderWidth: '1px', color: '#FF7AD0' }}>
            [SEP]
          </span>
        </div>
      </div>

      {/* Reference Container */}
      <div className="border border-pink-500/20 rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="text-sm font-semibold text-gray-300">
            Reference → {refTokens.length + 2} token input
          </div>
        </div>
        
        {/* Token Display */}
        <div className="flex flex-wrap gap-2">
          <span className="inline-block px-2.5 py-1 rounded text-xs font-mono" style={{ backgroundColor: '#160D14', borderColor: '#44273D', borderWidth: '1px', color: '#FF7AD0' }}>
            [CLS]
          </span>
          {refTokens.map((token, idx) => (
            <span 
              key={idx}
              className="inline-block px-2.5 py-1 rounded text-xs font-mono"
              style={{ backgroundColor: '#0D0D0D', borderColor: 'rgba(255, 255, 255, 0.05)', borderWidth: '1px', color: '#FFFFFF' }}
            >
              {token}
            </span>
          ))}
          <span className="inline-block px-2.5 py-1 rounded text-xs font-mono" style={{ backgroundColor: '#160D14', borderColor: '#44273D', borderWidth: '1px', color: '#FF7AD0' }}>
            [SEP]
          </span>
        </div>
      </div>
    </div>
  );
};

// Component for Sentence-BERT BERT Encoding Analysis
const SentenceBertEncodingAnalysis = ({ generatedText, referenceText }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  
  // Simulate tokenization to get token counts
  const simulateTokenization = (text) => {
    if (!text) return [];
    
    // Simulasi WordPiece tokenization yang lebih realistis
    const words = text.toLowerCase().split(/\s+/).filter(t => t.length > 0);
    const tokens = [];
    
    // Vocabulary umum bahasa Indonesia dan English
    const commonWords = new Set([
      'given', 'when', 'then', 'and', 'the', 'is', 'on', 'to', 'a', 'in', 'of', 'for',
      'yang', 'dan', 'pada', 'di', 'dengan', 'ke', 'dari', 'untuk', 'serta', 'atau',
      'user', 'sistem', 'login', 'email', 'password', 'tombol', 'halaman', 'aplikasi',
      'pengguna', 'berada', 'telah', 'benar', 'masuk', 'valid', 'kredensial'
    ]);
    
    // Prefix umum bahasa Indonesia
    const commonPrefixes = ['mem', 'men', 'meng', 'me', 'peng', 'per', 'ber', 'ter', 'di', 'ke'];
    
    words.forEach(word => {
      // Hapus tanda baca
      const cleanWord = word.replace(/[.,!?;:"()]/g, '');
      if (!cleanWord) return;
      
      // Jika kata ada di vocabulary, tidak dipecah
      if (commonWords.has(cleanWord)) {
        tokens.push(cleanWord);
        return;
      }
      
      // Kata pendek tidak dipecah
      if (cleanWord.length <= 5) {
        tokens.push(cleanWord);
        return;
      }
      
      // Coba deteksi prefix bahasa Indonesia
      let prefixFound = false;
      for (const prefix of commonPrefixes) {
        if (cleanWord.startsWith(prefix) && cleanWord.length > prefix.length + 3) {
          tokens.push(prefix);
          tokens.push('##' + cleanWord.substring(prefix.length));
          prefixFound = true;
          break;
        }
      }
      
      // Jika tidak ada prefix, pecah kata panjang (>8 karakter)
      if (!prefixFound) {
        if (cleanWord.length > 8) {
          // Pecah di tengah atau cari vokal untuk pemecahan yang lebih natural
          const vowels = ['a', 'e', 'i', 'o', 'u'];
          let splitPos = Math.floor(cleanWord.length / 2);
          
          // Cari posisi vokal terdekat untuk pemecahan yang lebih natural
          for (let i = splitPos; i < Math.min(splitPos + 3, cleanWord.length); i++) {
            if (vowels.includes(cleanWord[i])) {
              splitPos = i + 1;
              break;
            }
          }
          
          tokens.push(cleanWord.substring(0, splitPos));
          tokens.push('##' + cleanWord.substring(splitPos));
        } else {
          tokens.push(cleanWord);
        }
      }
    });
    
    return tokens;
  };

  const genTokens = simulateTokenization(generatedText);
  const refTokens = simulateTokenization(referenceText);
  const genTokenCount = genTokens.length + 2; // +2 for [CLS] and [SEP]
  const refTokenCount = refTokens.length + 2; // +2 for [CLS] and [SEP]

  // Simulasi token IDs (untuk display)
  const generateTokenIds = (tokens) => {
    const ids = [101]; // [CLS]
    tokens.forEach(token => {
      // Generate pseudo-random but consistent ID based on token
      const hash = token.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
      ids.push(1000 + (hash % 50000));
    });
    ids.push(102); // [SEP]
    return ids;
  };

  const genTokenIds = generateTokenIds(genTokens);
  const refTokenIds = generateTokenIds(refTokens);

  // Simulasi embedding values (random tapi konsisten)
  const generateEmbedding = (token, position) => {
    const hash = token.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const seed = hash + position;
    return {
      e_tok: ((seed * 13) % 1000) / 1000 - 0.5,
      e_pos: ((seed * 7) % 100) / 5000,
      e_seg: ((seed * 3) % 100) / 20000,
      h0_dim1: ((seed * 17) % 1000) / 1000 - 0.5,
      h0_dim2: ((seed * 23) % 1000) / 1000 - 0.5,
      h0_dim3: ((seed * 29) % 1000) / 1000 - 0.5,
      h0_dim4: ((seed * 31) % 1000) / 1000 - 0.5
    };
  };

  const displayLimit = isExpanded ? genTokens.length : 5;

  return (
    <div className="space-y-4">
      {/* Embedding Table */}
      <div className="rounded-xl p-5" style={{ borderColor: '#44273D', borderWidth: '1px' }}>
        <div className="overflow-x-auto">
          <table className="w-full text-xs font-mono">
            <thead>
              <tr className="border-b border-white/5">
                <th className="text-left py-2 px-3 text-white font-semibold">token</th>
                <th className="text-right py-2 px-3 text-white font-semibold">E_tok (kata)</th>
                <th className="text-right py-2 px-3 text-white font-semibold">E_pos (urutan)</th>
                <th className="text-right py-2 px-3 text-white font-semibold">E_seg (segmen)</th>
                <th className="text-right py-2 px-3 text-white font-semibold">h⁰ dim1</th>
                <th className="text-right py-2 px-3 text-white font-semibold">h⁰ dim2</th>
                <th className="text-right py-2 px-3 text-white font-semibold">h⁰ dim3</th>
                <th className="text-right py-2 px-3 text-white font-semibold">h⁰ dim4</th>
                <th className="text-center py-2 px-3 text-white font-semibold">...</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-white/5 hover:bg-gray-800/30">
                <td className="py-2 px-3 text-[#FF7AD0]">[CLS]</td>
                {(() => {
                  const emb = generateEmbedding('[CLS]', 0);
                  return (
                    <>
                      <td className="text-right py-2 px-3 text-white/50">{emb.e_tok.toFixed(3)}</td>
                      <td className="text-right py-2 px-3 text-white/50">{emb.e_pos.toFixed(3)}</td>
                      <td className="text-right py-2 px-3 text-white/50">{emb.e_seg.toFixed(3)}</td>
                      <td className="text-right py-2 px-3 text-white/50">{emb.h0_dim1.toFixed(3)}</td>
                      <td className="text-right py-2 px-3 text-white/50">{emb.h0_dim2.toFixed(3)}</td>
                      <td className="text-right py-2 px-3 text-white/50">{emb.h0_dim3.toFixed(3)}</td>
                      <td className="text-right py-2 px-3 text-white/50">{emb.h0_dim4.toFixed(3)}</td>
                      <td className="text-center py-2 px-3 text-gray-500">...</td>
                    </>
                  );
                })()}
              </tr>
              {genTokens.slice(0, displayLimit).map((token, idx) => {
                const emb = generateEmbedding(token, idx + 1);
                return (
                  <tr key={idx} className="border-b border-white/5 hover:bg-gray-800/30">
                    <td className="py-2 px-3 text-white/50">{token}</td>
                    <td className="text-right py-2 px-3 text-white/50">{emb.e_tok.toFixed(3)}</td>
                    <td className="text-right py-2 px-3 text-white/50">{emb.e_pos.toFixed(3)}</td>
                    <td className="text-right py-2 px-3 text-white/50">{emb.e_seg.toFixed(3)}</td>
                    <td className="text-right py-2 px-3 text-white/50">{emb.h0_dim1.toFixed(3)}</td>
                    <td className="text-right py-2 px-3 text-white/50">{emb.h0_dim2.toFixed(3)}</td>
                    <td className="text-right py-2 px-3 text-white/50">{emb.h0_dim3.toFixed(3)}</td>
                    <td className="text-right py-2 px-3 text-white/50">{emb.h0_dim4.toFixed(3)}</td>
                    <td className="text-center py-2 px-3 text-gray-500">...</td>
                  </tr>
                );
              })}
              {!isExpanded && genTokens.length > 5 && (
                <tr>
                  <td colSpan="9" className="text-center py-3">
                    <button
                      onClick={() => setIsExpanded(true)}
                      className="flex items-center justify-center gap-2 mx-auto px-4 py-2 rounded-lg text-xs font-semibold transition-colors"
                      style={{ backgroundColor: '#09090A', borderColor: 'rgba(255, 255, 255, 0.05)', borderWidth: '1px', color: 'rgba(255, 255, 255, 0.7)' }}
                      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#0d0d0d'}
                      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#09090A'}
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                      Tampilkan {genTokens.length - 5} token lainnya
                    </button>
                  </td>
                </tr>
              )}
              {isExpanded && genTokens.length > 5 && (
                <tr>
                  <td colSpan="9" className="text-center py-3">
                    <button
                      onClick={() => setIsExpanded(false)}
                      className="flex items-center justify-center gap-2 mx-auto px-4 py-2 rounded-lg text-xs font-semibold transition-colors"
                      style={{ backgroundColor: '#09090A', borderColor: 'rgba(255, 255, 255, 0.05)', borderWidth: '1px', color: 'rgba(255, 255, 255, 0.7)' }}
                      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#0d0d0d'}
                      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#09090A'}
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                      </svg>
                      Sembunyikan
                    </button>
                  </td>
                </tr>
              )}
              <tr className="hover:bg-gray-800/30">
                <td className="py-2 px-3 text-[#FF7AD0]">[SEP]</td>
                {(() => {
                  const emb = generateEmbedding('[SEP]', genTokenCount - 1);
                  return (
                    <>
                      <td className="text-right py-2 px-3 text-white/50">{emb.e_tok.toFixed(3)}</td>
                      <td className="text-right py-2 px-3 text-white/50">{emb.e_pos.toFixed(3)}</td>
                      <td className="text-right py-2 px-3 text-white/50">{emb.e_seg.toFixed(3)}</td>
                      <td className="text-right py-2 px-3 text-white/50">{emb.h0_dim1.toFixed(3)}</td>
                      <td className="text-right py-2 px-3 text-white/50">{emb.h0_dim2.toFixed(3)}</td>
                      <td className="text-right py-2 px-3 text-white/50">{emb.h0_dim3.toFixed(3)}</td>
                      <td className="text-right py-2 px-3 text-white/50">{emb.h0_dim4.toFixed(3)}</td>
                      <td className="text-center py-2 px-3 text-gray-500">...</td>
                    </>
                  );
                })()}
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

// Component for Self-Attention Analysis - MOVED TO: src/components/common/SelfAttentionTabs.jsx

// Component for Sentence-BERT Embedding Generation Analysis (OLD - WILL BE REMOVED)
const SentenceBertEmbeddingAnalysis = () => {
  return (
    <div className="bg-purple-500/10 border border-purple-500/20 rounded-xl p-4">
      <h6 className="font-semibold text-purple-300 mb-3">
        Proses Encoding ke Vektor
      </h6>
      
      {/* Model Info - Compact */}
      <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3 mb-3">
        <div className="grid grid-cols-3 gap-3 text-xs">
          <div>
            <div className="text-gray-400">Model</div>
            <div className="text-white font-semibold">paraphrase-multilingual-MiniLM-L12-v2</div>
          </div>
          <div>
            <div className="text-gray-400">Dimensi</div>
            <div className="text-white font-semibold">384</div>
          </div>
          <div>
            <div className="text-gray-400">Metode</div>
            <div className="text-white font-semibold">Mean Pooling</div>
          </div>
        </div>
      </div>

      {/* Encoding Steps - Compact */}
      <div className="space-y-2">
        {[
          { step: 1, name: 'Tokenization', desc: 'WordPiece tokenizer' },
          { step: 2, name: 'Token Embedding', desc: 'Vektor 384 dimensi' },
          { step: 3, name: 'Transformer (6 layers)', desc: 'Self-attention context' },
          { step: 4, name: 'Mean Pooling', desc: 'Rata-rata semua token' },
          { step: 5, name: 'Normalization', desc: 'Panjang vektor = 1' }
        ].map((item, index) => (
          <div key={index} className="flex items-center gap-3 bg-black border border-white/10 rounded-lg p-2">
            <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500/20 to-purple-500/20 border border-white/10 flex items-center justify-center">
              <span className="text-xs font-bold text-purple-400">#{item.step}</span>
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-white text-sm">{item.name}</span>
              </div>
              <p className="text-xs text-gray-400">{item.desc}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Output Info */}
      <div className="mt-3 bg-green-500/10 border border-green-500/20 rounded-lg p-3">
        <div className="text-xs text-gray-300">
          <strong>Output:</strong> Vektor [0.123, -0.456, ..., 0.234] dengan 384 nilai yang merepresentasikan makna semantik teks
        </div>
      </div>
    </div>
  );
};

// Component for Sentence-BERT Cosine Similarity Analysis
const SentenceBertCosineSimilarityAnalysis = ({ score, details }) => {
  // Simulate tokenization to get token counts
  const simulateTokenization = (text) => {
    if (!text) return [];
    return text.split(/\s+/).filter(t => t.length > 0);
  };

  const genTokens = simulateTokenization(details?.generatedText || '');
  const refTokens = simulateTokenization(details?.referenceText || '');
  const genTokenCount = genTokens.length + 2; // +2 for [CLS] and [SEP]
  const refTokenCount = refTokens.length + 2; // +2 for [CLS] and [SEP]

  return (
    <div className="bg-purple-500/10 border border-purple-500/20 rounded-xl p-5">
      <h6 className="font-semibold text-purple-300 mb-4 flex items-center gap-2 text-base">
        <span>??</span> TAHAP 5: METEOR SCORE
        <span className="text-xs text-gray-400 font-normal ml-2">
          F-Mean dikurangi penalty untuk menghasilkan METEOR Score
        </span>
      </h6>
      
      {/* Formula Display */}
      <div className="bg-black border border-purple-500/30 rounded-lg p-4 mb-4">
        <div className="text-xs text-gray-400 mb-2 uppercase tracking-wide">Formula dari Jurnal:</div>
        <div className="font-mono text-sm text-purple-200">
          METEOR = <span className="text-blue-300">F-Mean</span> × <span className="text-yellow-300">(1 - Penalty)</span>
        </div>
        <div className="text-xs text-gray-400 mt-2">
          F-Mean dikurangi penalty fragmentasi
        </div>
      </div>

      {/* METEOR Calculation - SIDE BY SIDE */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        {/* F-Mean */}
        <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
          <div className="text-sm font-semibold text-blue-300 mb-3 flex items-center gap-2">
            <span>??</span> F-Mean:
          </div>
          
          <div className="bg-[#0a0a0f]/70 border border-blue-500/30 rounded-lg p-3 mb-3">
            <div className="font-mono text-xs text-blue-200">
              F-Mean = 10 × (P × R) / (9P + R)
            </div>
          </div>
          
          <div className="bg-blue-500/20 border border-blue-500/30 rounded-lg p-3">
            <div className="text-xs text-gray-300 font-semibold mb-1">Hasil:</div>
            <div className="text-sm font-mono text-blue-200">
              F-Mean = {details?.fMean?.toFixed(5) || '0.00000'}
            </div>
          </div>
        </div>

        {/* Penalty */}
        <div className="bg-orange-500/10 border border-orange-500/20 rounded-lg p-4">
          <div className="text-sm font-semibold text-orange-300 mb-3 flex items-center gap-2">
            <span>??</span> Penalty:
          </div>
          
          <div className="bg-[#0a0a0f]/70 border border-orange-500/30 rounded-lg p-3 mb-3">
            <div className="font-mono text-xs text-orange-200">
              Penalty = 0.5 × (Chunks / Matches)×
            </div>
          </div>
          
          <div className="bg-orange-500/20 border border-orange-500/30 rounded-lg p-3">
            <div className="text-xs text-gray-300 font-semibold mb-1">Hasil:</div>
            <div className="text-sm font-mono text-orange-200">
              Penalty = {details?.penalty?.toFixed(5) || '0.00000'}
            </div>
          </div>
        </div>
      </div>

      {/* Keterkaitan Box */}
      <div className="bg-gradient-to-r from-purple-500/20 to-pink-500/20 border border-purple-500/30 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <span className="text-2xl">??</span>
          <div className="flex-1">
            <h6 className="font-semibold text-purple-200 mb-2">Keterkaitan di Tahap 5:</h6>
            <div className="text-xs text-gray-300 space-y-1">
              <div>× <strong>Input:</strong> F-Mean = {details?.fMean?.toFixed(5) || '0.00000'}, Penalty = {details?.penalty?.toFixed(5) || '0.00000'}</div>
              <div>• <strong>Proses:</strong> METEOR = F-Mean × (1 - Penalty)</div>
              <div>× <strong>Output:</strong> METEOR Score = {score?.toFixed(5) || '0.00000'}</div>
              <div>× <strong>Penalty mengurangi skor:</strong> Semakin tinggi penalty, semakin rendah METEOR Score</div>
              <div>× <strong>Skor final!</strong> METEOR Score adalah hasil akhir evaluasi kualitas teks</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TestResultsDetailPage;







