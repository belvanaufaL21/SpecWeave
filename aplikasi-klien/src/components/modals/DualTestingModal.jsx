import React, { useState, useEffect, useCallback, useMemo, memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Modal from '../common/Modal';
import ComparisonTable from '../common/ComparisonTable';
import TestingService from '../../services/testingService';

// ── Stage definitions ────────────────────────────────────────────────────────
const METEOR_STAGES = [
  { id: 'preparing',   label: 'Mempersiapkan Data',         description: 'Menyiapkan teks skenario untuk dianalisis',            weight: 10 },
  { id: 'precision',   label: 'Analisis Presisi',           description: 'Menghitung tingkat ketepatan kata yang cocok',         weight: 18 },
  { id: 'recall',      label: 'Analisis Recall',            description: 'Menghitung tingkat kelengkapan kata yang ditemukan',   weight: 18 },
  { id: 'fmean',       label: 'Analisis F-Mean Score',      description: 'Menghitung harmonic mean dari precision dan recall',   weight: 18 },
  { id: 'penalty',     label: 'Analisis Penalti',           description: 'Menghitung penalti fragmentasi urutan kata',           weight: 18 },
  { id: 'meteor',      label: 'Analisis METEOR Score',      description: 'Menghitung skor akhir METEOR',                         weight: 13 },
  { id: 'finalizing',  label: 'Analisis Selesai',           description: 'Menyusun hasil pengujian',                             weight: 5 },
];

const SBERT_STAGES = [
  { id: 'preparing',     label: 'Mempersiapkan Data',                          description: 'Menyiapkan teks skenario untuk dianalisis',        weight: 8 },
  { id: 'tokenizing',    label: 'Analisis Tokenisasi dan Input Embedding',     description: 'Mengubah teks menjadi token dan embedding',        weight: 18 },
  { id: 'attention',     label: 'Analisis Self-Attention',                     description: 'Menghitung hubungan antar kata dalam konteks',     weight: 20 },
  { id: 'ffn',           label: 'Analisis FFN + Residual + Layer Normalization', description: 'Transformasi non-linear dan normalisasi',       weight: 20 },
  { id: 'pooling',       label: 'Analisis Mean Pooling',                       description: 'Menghasilkan representasi vektor kalimat',         weight: 18 },
  { id: 'similarity',    label: 'Analisis Cosine Similarity',                  description: 'Membandingkan kesamaan semantik kedua skenario',   weight: 11 },
  { id: 'finalizing',    label: 'Analisis Selesai',                            description: 'Menyusun hasil pengujian',                         weight: 5 },
];

function buildThresholds(stages) {
  let acc = 0;
  return stages.map(s => { const start = acc; acc += s.weight; return { ...s, start, end: acc }; });
}
const METEOR_THRESHOLDS = buildThresholds(METEOR_STAGES);
const SBERT_THRESHOLDS  = buildThresholds(SBERT_STAGES);

// ── EvalProgressPanel ────────────────────────────────────────────────────────
const EvalProgressPanel = ({ stages, progress, color }) => {
  const thresholds = useMemo(() => buildThresholds(stages), [stages]);
  const activeIdx  = thresholds.findIndex(s => progress < s.end);
  const currentIdx = activeIdx === -1 ? thresholds.length - 1 : activeIdx;

  const bar    = color === 'purple' ? 'from-purple-500 to-purple-400' : 'from-pink-500 to-pink-400';
  const doneTextColor = color === 'purple' ? '#C27AFF' : '#FF7AD0';

  // Custom styling for METEOR (purple) and Sentence-BERT (pink)
  const itemBgColor = color === 'purple' ? '#120C18' : '#160D14';
  const itemBorderColor = color === 'purple' ? '#2C1A43' : '#44273D';
  const itemCurrentBgColor = '#0D0D0D';
  const itemCurrentBorderColor = 'rgba(255, 255, 255, 0.05)';
  const checkBgColor = color === 'purple' ? '#C27AFF' : '#FF7AD0';
  const checkCurrentBgColor = 'rgba(255, 255, 255, 0.5)';

  return (
    <div className="space-y-3">
      <div className="h-2 bg-white/10 rounded-full overflow-hidden">
        <div 
          className={`h-full rounded-full bg-gradient-to-r ${bar}`}
          style={{ 
            width: `${progress}%`,
            transition: 'width 0.3s ease-out'
          }} 
        />
      </div>
      <div className="space-y-1.5">
        {thresholds.map((s, idx) => {
          const done = idx < currentIdx || (progress >= 100 && idx === thresholds.length - 1);
          const cur = idx === currentIdx && progress < 100;
          const idle = !done && !cur;
          
          const itemStyle = (color === 'purple' || color === 'pink')
            ? (cur 
                ? { backgroundColor: itemCurrentBgColor, border: `1px solid ${itemCurrentBorderColor}` }
                : (done 
                    ? { backgroundColor: itemBgColor, border: `1px solid ${itemBorderColor}` }
                    : { backgroundColor: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(255, 255, 255, 0.05)' }
                  )
              )
            : {};
          
          return (
            <div 
              key={s.id} 
              className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-300 ${
                (done || cur || idle) && (color === 'purple' || color === 'pink') ? (idle ? 'opacity-40' : '') : 'bg-white/3 border border-white/8 opacity-40'
              }`}
              style={(color === 'purple' || color === 'pink') ? itemStyle : {}}
            >
              <div 
                className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0"
                style={
                  (color === 'purple' || color === 'pink')
                    ? (done 
                        ? { backgroundColor: checkBgColor }
                        : (cur 
                            ? { backgroundColor: checkCurrentBgColor }
                            : { backgroundColor: 'rgba(255, 255, 255, 0.1)' }
                          )
                      )
                    : {}
                }
              >
                {done ? (
                  <svg className="w-3 h-3" style={{ color: '#FFFFFF' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                  </svg>
                ) : cur ? (
                  <div className="w-2 h-2 rounded-full bg-white animate-pulse" />
                ) : (
                  <div className="w-1.5 h-1.5 rounded-full bg-white/30" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div 
                  className="text-xs font-medium" 
                  style={
                    done 
                      ? { color: doneTextColor } 
                      : (cur ? { color: 'rgba(255, 255, 255, 0.5)' } : { color: 'rgba(156, 163, 175, 1)' })
                  }
                >
                  {s.label}
                </div>
                {cur && <div className="text-xs text-gray-400 mt-0.5">{s.description}</div>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// ── DualTestingModal ─────────────────────────────────────────────────────────
const DualTestingModal = memo(({
  isOpen, onClose, scenarioText = '', scenarioId = null,
  initialReferenceScenario = '', onSubmitTest, loading = false
}) => {
  const [referenceScenario, setReferenceScenario] = useState(initialReferenceScenario || '');
  const [validationError, setValidationError]     = useState('');
  const [isSubmitting, setIsSubmitting]           = useState(false);

  // Per-tab state
  const [meteorProgress, setMeteorProgress] = useState(0);
  const [meteorStatus,   setMeteorStatus]   = useState('idle'); // idle|running|done|error
  const [sbertProgress,  setSbertProgress]  = useState(0);
  const [sbertStatus,    setSbertStatus]    = useState('idle');
  const [activeTab,      setActiveTab]      = useState('meteor');

  // Results
  const [meteorResult, setMeteorResult] = useState(null);
  const [sbertResult,  setSbertResult]  = useState(null);
  const [showResults,  setShowResults]  = useState(false);

  // Suggestions
  const [suggestedReferences, setSuggestedReferences] = useState([]);
  const [showSuggestions,     setShowSuggestions]     = useState(false);

  // Ref to track active test and allow cancellation
  const activeTestRef = React.useRef({ active: false, scenarioId: null });

  const isLoading    = loading || isSubmitting;
  const isEvaluating = meteorStatus === 'running' || sbertStatus === 'running';
  const isCompleted  = meteorStatus === 'done' && sbertStatus === 'done'; // Both tests completed
  const shouldShowProgress = isEvaluating || isCompleted; // Show progress during and after completion

  // Load suggestions
  useEffect(() => {
    if (!isOpen || !scenarioId) return;
    let alive = true;
    TestingService.getSuggestedReferences(scenarioText, 5)
      .then(s => { if (alive) setSuggestedReferences(s); })
      .catch(() => { if (alive) setSuggestedReferences([]); });
    return () => { alive = false; };
  }, [isOpen, scenarioId, scenarioText]);

  // Reset on close
  useEffect(() => {
    if (!isOpen) {
      // Cancel any active test
      activeTestRef.current.active = false;
      
      setShowResults(false); setMeteorResult(null); setSbertResult(null);
      setMeteorProgress(0); setSbertProgress(0);
      setMeteorStatus('idle'); setSbertStatus('idle');
      setActiveTab('meteor'); setValidationError('');
      setIsSubmitting(false);
    }
  }, [isOpen]);

  // Reset state when scenario changes (user switches to different scenario)
  useEffect(() => {
    if (isOpen && scenarioId) {
      // Check if scenario has changed from the active test
      if (activeTestRef.current.scenarioId && activeTestRef.current.scenarioId !== scenarioId) {
        console.log('🔄 Scenario changed, resetting test state');
        
        // Cancel any active test
        activeTestRef.current.active = false;
        
        // Reset all state
        setShowResults(false);
        setMeteorResult(null);
        setSbertResult(null);
        setMeteorProgress(0);
        setSbertProgress(0);
        setMeteorStatus('idle');
        setSbertStatus('idle');
        setActiveTab('meteor');
        setValidationError('');
        setIsSubmitting(false);
      }
      
      // Update tracked scenario ID
      activeTestRef.current.scenarioId = scenarioId;
    }
  }, [scenarioId, isOpen]);

  const isFormValid = useCallback(() => {
    if (!scenarioText?.trim()) { setValidationError('Skenario uji tidak boleh kosong'); return false; }
    if (!referenceScenario.trim()) { setValidationError('Skenario referensi harus diisi'); return false; }
    setValidationError(''); return true;
  }, [referenceScenario, scenarioText]);

  const handleSubmitTest = useCallback(async () => {
    if (!isFormValid()) return;
    
    // Mark test as active for this scenario
    activeTestRef.current.active = true;
    activeTestRef.current.scenarioId = scenarioId;
    
    const getActive = () => activeTestRef.current.active && activeTestRef.current.scenarioId === scenarioId;
    
    try {
      setValidationError(''); setIsSubmitting(true); setShowResults(false);
      setMeteorProgress(0); setSbertProgress(0);
      setMeteorStatus('running'); setSbertStatus('idle');

      const testData = { scenarioId, generatedText: scenarioText, referenceText: referenceScenario.trim() };

      // ── METEOR with Real-Time SSE ──
      console.log('🚀 Starting METEOR test with SSE...');
      const meteorData = await TestingService.runMeteorTestSSE(testData, (stage, progress, details) => {
        if (!getActive()) {
          console.log('⚠️ METEOR progress ignored - test cancelled or scenario changed');
          return;
        }
        setMeteorProgress(progress);
        console.log(`📊 METEOR ${stage}: ${progress}%`, details.message);
      });
      
      if (!getActive()) {
        console.log('⚠️ METEOR completed but test was cancelled');
        return;
      }
      
      const rawMeteor = meteorData.meteorMetrics;
      setMeteorProgress(100); setMeteorStatus('done'); setMeteorResult(rawMeteor);
      console.log('✅ METEOR completed:', rawMeteor);
      
      // ── Sentence-BERT with Real-Time SSE ──
      setSbertStatus('running');
      console.log('🚀 Starting Sentence-BERT test with SSE...');
      
      let rawSbert = null;
      try {
        const sbertData = await TestingService.runSentenceBertTestSSE(testData, (stage, progress, details) => {
          if (!getActive()) {
            console.log('⚠️ Sentence-BERT progress ignored - test cancelled or scenario changed');
            return;
          }
          setSbertProgress(progress);
          console.log(`📊 Sentence-BERT ${stage}: ${progress}%`, details.message);
        });
        
        if (!getActive()) {
          console.log('⚠️ Sentence-BERT completed but test was cancelled');
          return;
        }
        
        rawSbert = sbertData.sentenceBertMetrics;
        setSbertProgress(100); setSbertStatus('done'); setSbertResult(rawSbert);
        console.log('✅ Sentence-BERT completed:', rawSbert);
      } catch (sbertError) {
        if (!getActive()) {
          console.log('⚠️ Sentence-BERT error ignored - test was cancelled');
          return;
        }
        
        console.error('❌ Sentence-BERT test failed:', sbertError);
        setSbertProgress(0); 
        setSbertStatus('error');
        
        // Show user-friendly error message
        const errorMsg = sbertError.message || 'Gagal menjalankan pengujian Sentence-BERT';
        setValidationError(`METEOR berhasil, tetapi Sentence-BERT gagal: ${errorMsg}. Anda tetap dapat melihat hasil METEOR.`);
        
        // Still show results with METEOR only
        setShowResults(true);
        
        // Save METEOR result only
        if (onSubmitTest && rawMeteor) {
          const meteorMetrics = rawMeteor?.meteorMetrics || rawMeteor;
          const meteorDetails = meteorMetrics?.detailed_metrics || meteorMetrics?.details || {};

          const formatted = {
            timestamp: new Date().toISOString(),
            generatedText: scenarioText,
            referenceText: referenceScenario.trim(),
            meteor: meteorMetrics ? {
              success: true,
              score: meteorMetrics.score || 0,
              precision: meteorDetails.precision || 0,
              recall: meteorDetails.recall || 0,
              f_mean: meteorDetails.f_mean || 0,
              penalty: meteorDetails.penalty || 0,
              matches: meteorDetails.matches || 0,
              chunks: meteorMetrics.translation_info || null,
              formattedScore: TestingService.formatScore(meteorMetrics.score, 'meteor'),
              qualityLevel: TestingService.getQualityLevel(meteorMetrics.score),
            } : null,
            sentence_bert: null, // Mark as failed
          };
          await onSubmitTest(formatted);
        }
        
        // Mark test as complete
        activeTestRef.current.active = false;
        return; // Exit early
      }

      // Check again before saving
      if (!getActive()) {
        console.log('⚠️ Test completion ignored - test was cancelled');
        return;
      }

      // Save reference (best-effort)
      try {
        await TestingService.saveScenarioReference({
          referenceText: referenceScenario.trim(),
          description: `Reference for scenario ${scenarioId}`,
          tags: ['dual-evaluation', 'auto-saved'],
        });
      } catch (_) {}

      // Don't show results, directly submit and close
      // setShowResults(true); // REMOVED

      if (onSubmitTest) {
        // Build the formatted result that ChatRefined expects:
        const meteorMetrics = rawMeteor?.meteorMetrics || rawMeteor;
        const sbertMetrics  = rawSbert?.sentenceBertMetrics || rawSbert?.sentence_bert_metrics || rawSbert;

        const meteorDetails = meteorMetrics?.detailed_metrics || meteorMetrics?.details || {};
        const sbertDetails  = sbertMetrics?.details || {};

        const formatted = {
          timestamp: new Date().toISOString(),
          generatedText: scenarioText,
          referenceText: referenceScenario.trim(),
          meteor: meteorMetrics ? {
            success: true,
            score: meteorMetrics.score || 0,
            precision: meteorDetails.precision || 0,
            recall: meteorDetails.recall || 0,
            f_mean: meteorDetails.f_mean || 0,
            penalty: meteorDetails.penalty || 0,
            matches: meteorDetails.matches || 0,
            chunks: meteorDetails.chunks || 0,
            translation_info: meteorMetrics.translation_info || null,
            formattedScore: TestingService.formatScore(meteorMetrics.score, 'meteor'),
            qualityLevel: TestingService.getQualityLevel(meteorMetrics.score),
          } : null,
          sentence_bert: sbertMetrics ? {
            success: true,
            score: sbertMetrics.score || 0,
            details: sbertDetails,
            formattedScore: TestingService.formatScore(sbertMetrics.score, 'sentence_bert'),
            qualityLevel: TestingService.getQualityLevel(sbertMetrics.score),
          } : null,
        };
        await onSubmitTest(formatted);
        
        // Mark test as complete
        activeTestRef.current.active = false;
        
        // Give user a moment to see 100% completion before closing
        await new Promise(resolve => setTimeout(resolve, 800));
        
        // Don't reset isSubmitting - keep loading state until modal closes
        // This prevents form from flashing before close
        handleClose();
        return; // Exit early to skip finally block reset
      }
    } catch (error) {
      // Mark test as complete
      activeTestRef.current.active = false;
      
      console.error('❌ Test execution error:', error);
      setValidationError(error.message || 'Gagal menjalankan pengujian. Silakan coba lagi.');
      if (meteorStatus === 'running') setMeteorStatus('error');
      if (sbertStatus   === 'running') setSbertStatus('error');
      setIsSubmitting(false); // Only reset on error
    } finally {
      // Don't reset isSubmitting here - it's handled in success/error paths
    }
  }, [isFormValid, scenarioId, scenarioText, referenceScenario, onSubmitTest, meteorStatus, sbertStatus]);

  const handleReferenceChange = useCallback((e) => {
    setReferenceScenario(e.target.value);
    setValidationError(''); // Always clear validation error on change
  }, []); // No dependencies - stable callback

  const handleSuggestionSelect = useCallback((s) => {
    const text = s.reference_text || s.referenceText || s.text || '';
    if (!text) { setValidationError('Saran referensi tidak valid'); return; }
    setReferenceScenario(text); setShowSuggestions(false); setValidationError('');
  }, []);

  const handleClose = useCallback(() => {
    if (showResults && !window.confirm('Anda memiliki hasil pengujian. Yakin ingin menutup?')) return;
    onClose();
  }, [showResults, onClose]);

  // Status badge helper with custom styling per method
  const statusBadge = (status, color) => {
    if (status === 'idle') return <span className="text-xs text-gray-500 bg-white/5 px-2 py-0.5 rounded-full">Menunggu</span>;
    
    if (status === 'running') {
      return (
        <span 
          className="text-xs px-2 py-0.5 rounded-full flex items-center gap-1"
          style={{ 
            backgroundColor: '#0d0d0d', 
            border: '1px solid rgba(255, 255, 255, 0.05)',
            color: 'rgba(255, 255, 255, 0.5)'
          }}
        >
          <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ backgroundColor: 'rgba(255, 255, 255, 0.5)' }} />
          Berjalan
        </span>
      );
    }
    
    if (status === 'done') {
      const bgColor = color === 'purple' ? '#120C18' : '#160D14';
      const borderColor = color === 'purple' ? '#2C1A43' : '#44273D';
      const textColor = color === 'purple' ? '#C27AFF' : '#FF7AD0';
      
      return (
        <span 
          className="text-xs px-2 py-0.5 rounded-full"
          style={{ 
            backgroundColor: bgColor, 
            border: `1px solid ${borderColor}`,
            color: textColor
          }}
        >
          ✓ Selesai
        </span>
      );
    }
    
    return <span className="text-xs text-red-400 bg-red-500/10 px-2 py-0.5 rounded-full">Error</span>;
  };

  const modalFooter = useMemo(() => {
    if (showResults) return (
      <div className="flex justify-between items-center">
        <div className="text-sm text-gray-400">Pengujian selesai</div>
        <button onClick={handleClose} className="px-6 py-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white rounded-lg transition-all font-medium">Tutup</button>
      </div>
    );
    return (
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-2 text-sm text-gray-400">
          <div className="w-2 h-2 rounded-full bg-gradient-to-r from-purple-400 to-pink-400" />
          <span>Dual Evaluation: METEOR + Sentence-BERT</span>
        </div>
        <div className="flex gap-2 sm:gap-3">
          <button 
            type="button"
            onClick={handleSubmitTest} 
            disabled={!referenceScenario.trim() || isLoading}
            className="px-6 py-2 rounded-lg transition-all font-medium flex items-center gap-2 text-sm"
            style={
              !referenceScenario.trim() || isLoading
                ? { backgroundColor: '#0d0d0d', border: '1px solid rgba(255, 255, 255, 0.05)', color: 'rgba(255, 255, 255, 0.5)', cursor: 'not-allowed' }
                : { backgroundColor: '#160D14', border: '1px solid #44273D', color: '#FF7AD0', cursor: 'pointer' }
            }
          >
            {isLoading
              ? <><div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" /><span>Memproses...</span></>
              : <><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg><span>Mulai Pengujian</span></>
            }
          </button>
        </div>
      </div>
    );
  }, [showResults, isLoading, referenceScenario, handleClose, handleSubmitTest]);

  if (!isOpen) return null;

  const tabs = [
    { key: 'meteor',        label: 'METEOR',        color: 'purple', status: meteorStatus, progress: meteorProgress, stages: METEOR_STAGES, result: meteorResult },
    { key: 'sentence_bert', label: 'Sentence-BERT', color: 'pink',   status: sbertStatus,  progress: sbertProgress,  stages: SBERT_STAGES,  result: sbertResult, customBg: '#160D14', customText: '#FF7AD0'  },
  ];

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Pengujian Kualitas Skenario"
      size="xl" footer={modalFooter} loading={loading}
      closeOnBackdrop={!isLoading && !showResults} closeOnEscape={!isLoading && !showResults}>
      <div className="space-y-5">

        {/* Error */}
        {validationError && (
          <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-start gap-3">
            <svg className="w-5 h-5 text-red-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <p className="text-red-300 font-medium text-sm">Terjadi Kesalahan</p>
              <p className="text-red-200 text-xs mt-1">{validationError}</p>
            </div>
          </div>
        )}

        {/* ── Dual evaluation panels (visible while evaluating or completed) ── */}
        {shouldShowProgress && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {tabs.map(tab => {
              const textColor = tab.key === 'meteor' ? '#C27AFF' : '#FF7AD0';
              
              return (
                <div key={tab.key} className="rounded-xl overflow-hidden" style={{ backgroundColor: '#09090A' }}>
                  {/* Header */}
                  <div className="px-4 py-3 flex items-center justify-between" style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.05)' }}>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium" style={{ color: textColor }}>{tab.label}</span>
                      {tab.status !== 'idle' && (
                        <span className="text-xs font-bold" style={{ color: textColor }}>
                          {tab.progress}%
                        </span>
                      )}
                    </div>
                    {statusBadge(tab.status, tab.color)}
                  </div>

                  {/* Content */}
                  <div className="p-5">
                    {/* Progress view - show when running or done (but not showing final results yet) */}
                    {(tab.status === 'running' || (tab.status === 'done' && !showResults)) && (
                      <EvalProgressPanel stages={tab.stages} progress={tab.progress} color={tab.color} />
                    )}

                    {/* Idle state */}
                    {tab.status === 'idle' && (
                      <div className="flex items-center gap-3 py-4 text-gray-500 text-sm">
                        <div className="w-5 h-5 rounded-full border-2 border-dashed border-gray-600" />
                        Menunggu evaluasi METEOR selesai...
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ── Input form (hidden while evaluating or completed) ── */}
        {!shouldShowProgress && (
          <div className="space-y-5">

              {/* Method description */}
              <div className="p-4 rounded-xl" style={{ backgroundColor: '#09090A', border: '1px solid rgba(255, 255, 255, 0.05)' }}>
                <h3 className="font-semibold text-transparent bg-clip-text bg-gradient-to-r from-purple-300 to-pink-300 text-sm">Dual Evaluation</h3>
                <p className="text-xs text-gray-400 mt-1">METEOR dijalankan terlebih dahulu, kemudian Sentence-BERT. Pantau progress masing-masing di tab.</p>
                <div className="grid grid-cols-2 gap-3 mt-3">
                  <div className="p-2.5 rounded-lg" style={{ backgroundColor: '#120C18' }}>
                    <div className="text-xs font-medium" style={{ color: '#C27AFF' }}>METEOR</div>
                    <div className="text-xs text-gray-400 mt-0.5">Kecocokan kata & urutan</div>
                  </div>
                  <div className="p-2.5 rounded-lg" style={{ backgroundColor: '#160D14' }}>
                    <div className="text-xs font-medium" style={{ color: '#FF7AD0' }}>Sentence-BERT</div>
                    <div className="text-xs text-gray-400 mt-0.5">Kesamaan semantik</div>
                  </div>
                </div>
              </div>

              <div onKeyDown={(e) => {
                // Prevent Enter key from triggering form submission
                if (e.key === 'Enter' && !e.shiftKey && !e.ctrlKey && !e.metaKey) {
                  e.preventDefault();
                  e.stopPropagation();
                }
              }}>
                <ComparisonTable 
                  generatedScenario={scenarioText} 
                  referenceScenario={referenceScenario} 
                  onReferenceChange={handleReferenceChange}
                />
              </div>

              {/* Suggestions list */}
              {showSuggestions && suggestedReferences.length > 0 && (
                <div className="bg-white/5 border border-white/10 rounded-lg p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <h5 className="text-sm font-medium text-white">Skenario Referensi yang Sering Digunakan</h5>
                    <button onClick={() => setShowSuggestions(false)} className="text-gray-400 hover:text-white">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                  </div>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {suggestedReferences.map((s, i) => {
                      const text = s.reference_text || s.referenceText || s.text || '';
                      return (
                        <button key={s.id || i} onClick={() => handleSuggestionSelect(s)} disabled={!text}
                          className="w-full text-left p-3 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-purple-500/30 rounded-lg transition-all group disabled:opacity-50">
                          <p className="text-sm text-gray-300 group-hover:text-white line-clamp-2 font-mono">{text || 'Teks referensi tidak tersedia'}</p>
                          {s.description && <p className="text-xs text-gray-500 mt-1">{s.description}</p>}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

            </div>
          )}

      </div>
    </Modal>
  );
});

DualTestingModal.displayName = 'DualTestingModal';
export default DualTestingModal;
