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

  const loading = getLoadingState(LOADING_TYPES.METEOR_ANALYSIS).isLoading;

  // Tab configuration - SpecWeave Brand Colors
  const tabs = [
    {
      id: 'meteor',
      label: 'METEOR',
      description: 'Evaluasi berdasarkan unigram matching, stemming, dan synonymy',
      color: 'purple',
      gradient: 'from-purple-600 to-purple-500',
    },
    {
      id: 'sentence_bert',
      label: 'Sentence-BERT',
      description: 'Evaluasi berdasarkan semantic similarity menggunakan transformer',
      color: 'pink',
      gradient: 'from-pink-600 to-pink-500',
      customBg: '#160D14',
      customText: '#FF7AD0',
    },
  ];

  useEffect(() => {
    loadTestResults();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scenarioId]);

  const loadTestResults = async () => {
    try {
      setLoading(LOADING_TYPES.METEOR_ANALYSIS, true, {
        message: 'Loading test results...',
      });
      setError(null);
      clearError();

      const response = await TestingService.getTestResults(scenarioId);

      if (response && response.allResults) {
        const groupedResults = {};
        Object.entries(response.allResults).forEach(([testType, results]) => {
          if (Array.isArray(results)) {
            groupedResults[testType] = results
              .map((result) => TestingService.formatTestResult({ testResult: result }))
              .filter(Boolean);
          }
        });
        setTestResults(groupedResults);
      } else {
        setTestResults({});
      }
    } catch (err) {
      console.error('Failed to load test results:', err);
      const errorMessage = err.message || 'Gagal memuat hasil pengujian';
      setError(errorMessage);
      handleError(err, {
        type: 'testing',
        code: 'TEST_RESULTS_LOAD_FAILED',
        context: { scenarioId },
      });
      showToast('Gagal memuat hasil pengujian', 'error');
    } finally {
      setLoading(LOADING_TYPES.METEOR_ANALYSIS, false);
    }
  };

  // Get the latest result for a specific test type, with dual fallback
  const getLatestResult = (testType) => {
    const results = testResults[testType];

    if ((!results || results.length === 0) && (testType === 'meteor' || testType === 'sentence_bert')) {
      const dualResults = testResults['dual'];
      if (dualResults && dualResults.length > 0) {
        const dualResult = dualResults[0];

        if (testType === 'meteor' && dualResult.meteor) {
          return {
            ...dualResult,
            testType: 'meteor',
            score: dualResult.meteor.score,
            details: {
              ...dualResult.meteor,
              section_metrics: dualResult.meteor.section_metrics || {},
            },
            detailed_metrics: dualResult.meteor.detailed_metrics || {
              section_metrics: dualResult.meteor.section_metrics || {},
            },
            ...dualResult.meteor,
          };
        } else if (testType === 'sentence_bert' && dualResult.sentence_bert) {
          return {
            ...dualResult,
            testType: 'sentence_bert',
            score: dualResult.sentence_bert.score,
            details: dualResult.sentence_bert.details || dualResult.sentence_bert,
            ...dualResult.sentence_bert,
          };
        }
      }
    }

    return results && results.length > 0 ? results[0] : null;
  };

  const handleOpenTestingModal = () => {
    setShowTestingModal(true);
  };

  const handleTestSubmit = async () => {
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
        <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
          <div className="absolute top-[-10%] left-[-10%] w-[50vw] h-[50vh] bg-[radial-gradient(circle_at_center,rgba(147,51,234,0.08)_0%,rgba(0,0,0,0)_70%)] blur-[100px]" />
          <div className="absolute bottom-[-10%] right-[-10%] w-[50vw] h-[50vh] bg-[radial-gradient(circle_at_center,rgba(236,72,153,0.08)_0%,rgba(0,0,0,0)_70%)] blur-[100px]" />
        </div>

        <header className="sticky top-0 z-30 bg-[#020203]/60 backdrop-blur-2xl border-b border-white/5">
          <div className="px-6 py-5">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate(-1)}
                className="text-gray-400 hover:text-white transition-colors p-1"
                aria-label="Kembali"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <div className="flex items-baseline gap-2">
                <h1 className="text-lg font-semibold text-white">Detail Hasil Pengujian</h1>
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

  const activeTabConfig = tabs.find((tab) => tab.id === activeTab);
  const currentResult = getLatestResult(activeTab);
  const hasResult = currentResult !== null;

  return (
    <div className="min-h-screen bg-[#020203] text-white font-sans relative">
      {/* Background Effects */}
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] w-[50vw] h-[50vh] bg-[radial-gradient(circle_at_center,rgba(147,51,234,0.08)_0%,rgba(0,0,0,0)_70%)] blur-[100px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50vw] h-[50vh] bg-[radial-gradient(circle_at_center,rgba(236,72,153,0.08)_0%,rgba(0,0,0,0)_70%)] blur-[100px]" />
      </div>

      {/* Header */}
      <header className="sticky top-0 z-30 bg-[#020203]/60 backdrop-blur-2xl border-b border-white/5">
        <div className="px-6 py-5">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate(-1)}
              className="text-gray-400 hover:text-white transition-colors p-1"
              aria-label="Kembali"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <h1 className="text-lg font-semibold text-white">Detail Hasil Pengujian</h1>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-6 relative z-10">
        {/* Tab Navigation - METEOR / Sentence-BERT */}
        <div className="mb-6">
          <div
            className="flex gap-2 bg-black/60 backdrop-blur-xl p-1.5 rounded-2xl"
            style={{ borderWidth: '1px', borderStyle: 'solid', borderColor: '#0D0D0D' }}
          >
            {tabs.map((tab) => {
              const tabResult = getLatestResult(tab.id);
              const hasTabResult = tabResult !== null;

              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`group relative flex items-center gap-3 px-5 py-3.5 rounded-xl text-sm font-medium transition-all duration-300 flex-1 overflow-hidden ${
                    activeTab === tab.id ? 'text-white' : 'text-gray-400 hover:text-gray-300'
                  }`}
                  style={
                    activeTab === tab.id && tab.id === 'meteor'
                      ? { backgroundColor: '#120C18' }
                      : activeTab === tab.id && tab.customBg
                      ? { backgroundColor: tab.customBg }
                      : {}
                  }
                >
                  {activeTab === tab.id && tab.id !== 'meteor' && !tab.customBg && (
                    <div className={`absolute inset-0 bg-gradient-to-r ${tab.gradient} opacity-20`}></div>
                  )}

                  <div className="relative flex items-center gap-3 flex-1">
                    <div className="text-left flex-1">
                      <div className="font-semibold flex items-center gap-2">
                        <span
                          className={
                            activeTab === tab.id && tab.id !== 'meteor' && !tab.customText
                              ? `bg-gradient-to-r ${tab.gradient} bg-clip-text text-transparent`
                              : ''
                          }
                          style={
                            activeTab === tab.id && tab.id === 'meteor'
                              ? { color: '#C27AFF' }
                              : activeTab === tab.id && tab.customText
                              ? { color: tab.customText }
                              : {}
                          }
                        >
                          {tab.label}
                        </span>
                        {hasTabResult && (
                          <div
                            className={`w-1.5 h-1.5 bg-gradient-to-r ${tab.gradient} rounded-full ${
                              activeTab === tab.id ? 'animate-pulse' : ''
                            }`}
                          ></div>
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

        {/* Score Display + Tab Content */}
        <div className="relative">
          {/* Score Display - Centered, no section filter */}
          {hasResult && (
            <div className="mb-8">
              <div
                className="relative rounded-3xl py-12 px-8 flex flex-col items-center justify-center"
                style={{
                  borderWidth: '1px',
                  borderStyle: 'solid',
                  borderColor: activeTab === 'sentence_bert' ? '#44273D' : '#241931',
                  backgroundColor: activeTab === 'sentence_bert' ? '#0A0608' : '#08060B',
                }}
              >
                <div className="mb-3">
                  <span
                    className="text-base font-semibold tracking-wide"
                    style={activeTab === 'sentence_bert' ? { color: '#FF7AD0' } : { color: 'rgb(216 180 254)' }}
                  >
                    {activeTab === 'sentence_bert' ? 'Sentence-BERT Score' : 'METEOR Score'}
                  </span>
                </div>
                <div
                  className="text-7xl font-bold"
                  style={activeTab === 'sentence_bert' ? { color: '#FF7AD0' } : { color: 'rgb(192 132 252)' }}
                >
                  {(currentResult.score ?? 0).toFixed(5)}
                </div>
                <div className="mt-3 text-sm text-gray-500">
                  {activeTab === 'sentence_bert'
                    ? 'Cosine similarity antara dua sentence embeddings'
                    : 'Skor METEOR dari teks utuh'}
                </div>
              </div>
            </div>
          )}

          <div
            className="relative bg-black backdrop-blur-lg rounded-3xl overflow-hidden shadow-2xl"
            style={{ borderWidth: '1px', borderStyle: 'solid', borderColor: '#0D0D0D' }}
          >
            {hasResult ? null : (
              <EmptyTestState
                testType={activeTab}
                tabConfig={activeTabConfig}
                onStartTest={handleOpenTestingModal}
              />
            )}
          </div>

          {/* Detail accordion - Tahapan Pengujian */}
          {hasResult && (
            <TestResultDetails
              result={currentResult}
              testType={activeTab}
              tabConfig={activeTabConfig}
            />
          )}
        </div>
      </div>

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

// ============================================================================
// TestResultDetails - accordion "Tahapan Pengujian", pakai full-text data
// ============================================================================

const TestResultDetails = ({ result, testType, tabConfig }) => {
  const [expandedStep, setExpandedStep] = useState(null);

  const getTestingSteps = (testType, result) => {
    if (testType === 'meteor') {
      // Pakai overall metrics dari teks utuh (sesuai refactor backend Banerjee & Lavie 2005)
      const detailedMetrics = result.detailed_metrics || result.details?.detailed_metrics || {};
      const details = result.details || {};

      const precision = detailedMetrics.precision ?? details.precision ?? result.precision ?? 0;
      const recall = detailedMetrics.recall ?? details.recall ?? result.recall ?? 0;
      const f_mean = detailedMetrics.f_mean ?? details.f_mean ?? result.f_mean ?? 0;
      const penalty = detailedMetrics.penalty ?? details.penalty ?? details.fragmentation_penalty ?? 0;
      const generated_tokens = detailedMetrics.generated_tokens ?? details.generated_tokens ?? 0;
      const reference_tokens = detailedMetrics.reference_tokens ?? details.reference_tokens ?? 0;
      const matches = detailedMetrics.matches ?? details.matches ?? 0;
      const chunks = detailedMetrics.chunks ?? details.chunks ?? 0;
      const meteorScore = result.score ?? 0;

      // Debug log untuk memastikan data tidak dummy
      console.log('🔍 [METEOR Data Check]', {
        source: 'getTestingSteps',
        detailedMetrics_keys: Object.keys(detailedMetrics),
        details_keys: Object.keys(details),
        values: {
          precision,
          recall,
          f_mean,
          penalty,
          generated_tokens,
          reference_tokens,
          matches,
          chunks,
          meteorScore
        },
        raw_detailedMetrics: detailedMetrics,
        raw_details: details
      });

      return [
        {
          name: 'Presisi (Precision)',
          value: precision,
          description: 'Mengukur akurasi kata yang dihasilkan dibandingkan dengan referensi',
          formula: 'Presisi = (Total kata cocok) / (Total kata dihasilkan)',
          actualData: {
            precision,
            generated_tokens,
            matches,
            calculation: `${matches} / ${generated_tokens} = ${precision.toFixed(5)}`,
          },
        },
        {
          name: 'Recall',
          value: recall,
          description: 'Mengukur kelengkapan informasi dari referensi yang tercakup',
          formula: 'Recall = (Total kata cocok) / (Total kata referensi)',
          actualData: {
            recall,
            reference_tokens,
            matches,
            calculation: `${matches} / ${reference_tokens} = ${recall.toFixed(5)}`,
          },
        },
        {
          name: 'F-Mean (F-Score)',
          value: f_mean,
          description: 'Weighted mean dari presisi dan recall dengan bobot lebih pada presisi',
          formula: 'F-Mean = 10 × (P × R) / (9P + R)',
          actualData: { precision, recall, f_mean },
        },
        {
          name: 'Penalti',
          value: penalty,
          description: 'Mengukur penalti fragmentasi urutan kata dalam teks',
          formula: 'Penalti = 0.5 × (Chunks / Matches)³',
          actualData: {
            penalty,
            chunks,
            matches,
          },
        },
        {
          name: 'METEOR Score',
          value: meteorScore,
          description: 'Skor akhir METEOR dengan penalty untuk fragmentasi teks',
          formula: 'METEOR = F-Mean × (1 - Penalty)',
          actualData: { f_mean, penalty, score: meteorScore },
        },
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
        },
        {
          name: 'Input embedding',
          value: 1.0,
          description:
            'Tiap token ID berubah jadi vektor 384 dimensi dari penjumlahan 3 embedding (kata + posisi + segmen).',
          formula: 'h⁰ᵢ = token_embedding(tᵢ) + positional_embedding(i) + segment_embedding(sᵢ)',
        },
        {
          name: 'Self-Attention',
          value: 1.0,
          description:
            'Di setiap layer BERT, input diproyeksikan ke Query, Key, Value. Attention score dihitung, dinormalisasi dengan softmax, lalu digunakan untuk meng-weight Value vectors.',
          formula: 'Attention(Q,K,V) = softmax(QKᵀ/√dₖ) × V',
        },
        {
          name: 'FFN + Residual + Layer Normalization',
          value: 1.0,
          description:
            'Output attention diproses oleh fully-connected feed-forward network dengan aktivasi GELU, lalu dinormalisasi. Proses ini diulang sebanyak L layer.',
          formula: 'hˡ = LayerNorm(hˡ⁻¹ + FFN(hˡ⁻¹))',
        },
        {
          name: 'Mean pooling',
          value: 1.0,
          description:
            'Semua hidden state token dari layer terakhir dirata-rata untuk menghasilkan satu vektor representasi kalimat.',
          formula: 'u = (1/n) × Σᵢ₌₁ⁿ hᵢᴸ',
        },
        {
          name: 'Cosine Similarity',
          value: result.score,
          description: 'Menghitung kesamaan semantik antara dua sentence embeddings',
          formula: 'Σ(u×v) / (√Σ(u²) × √Σ(v²))',
          actualData: {
            dotProduct: detailedMetrics.dot_product ?? details.dot_product,
            magnitudeA: detailedMetrics.magnitude_a ?? details.magnitude_a,
            magnitudeB: detailedMetrics.magnitude_b ?? details.magnitude_b,
            score: result.score,
          },
        },
      ];
    }
    return [];
  };

  const testingSteps = useMemo(
    () => getTestingSteps(testType, result),
    [testType, result]
  );

  return (
    <div className="mt-8 space-y-8 pb-16">
      {/* Perbandingan Teks */}
      <div>
        <div className="mb-4">
          <h3 className="text-lg font-bold text-white">Perbandingan Teks</h3>
          {testType === 'meteor' ? (
            <div className="h-1 w-10 rounded-full mt-1" style={{ backgroundColor: '#C27AFF' }}></div>
          ) : (
            <div className={`h-1 w-10 bg-${tabConfig.color}-500 rounded-full mt-1`}></div>
          )}
        </div>
        <TextComparisonTable
          generatedText={result.generatedText}
          referenceText={result.referenceText}
          showHighlight={testType === 'meteor'}
          testType={testType}
        />
      </div>

      {/* Tahapan Pengujian */}
      <div>
        <div className="mb-6">
          <h3 className="text-lg font-bold text-white">Tahapan Pengujian {tabConfig.label}</h3>
          {testType === 'meteor' ? (
            <div className="h-1 w-10 rounded-full mt-1" style={{ backgroundColor: '#C27AFF' }}></div>
          ) : (
            <div className={`h-1 w-10 bg-${tabConfig.color}-500 rounded-full mt-1`}></div>
          )}
        </div>

        <div className="space-y-4">
          {testingSteps.map((step, index) => (
            <div
              key={index}
              className="group bg-black backdrop-blur-lg rounded-2xl overflow-hidden shadow-lg"
              style={{ borderWidth: '1px', borderStyle: 'solid', borderColor: '#0D0D0D' }}
            >
              <button
                onClick={() => setExpandedStep(expandedStep === index ? null : index)}
                className="w-full p-5 text-left hover:bg-[#09090A] transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4 flex-1">
                    <div
                      className={`w-10 h-10 rounded-xl bg-${tabConfig.color}-500/10 border border-${tabConfig.color}-500/20 flex items-center justify-center flex-shrink-0`}
                    >
                      <span className="text-sm font-bold text-white">{index + 1}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-base font-semibold text-white truncate">{step.name}</h4>
                      <p className="text-xs text-gray-500 line-clamp-1">{step.description}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 flex-shrink-0">
                    <svg
                      className={`w-5 h-5 text-gray-400 transition-transform ${
                        expandedStep === index ? 'rotate-180' : ''
                      }`}
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
                    {/* Formula */}
                    {step.name !== 'Self-Attention' &&
                      step.name !== 'FFN + Residual + Layer Normalization' && (
                        <div>
                          <h5
                            className="font-semibold mb-2 text-sm tracking-wide uppercase"
                            style={{ color: testType === 'meteor' ? '#C27AFF' : '#FF7AD0' }}
                          >
                            Formula:
                          </h5>
                          <code className="text-sm text-gray-300 font-mono">{step.formula}</code>
                        </div>
                      )}

                    {/* METEOR Analysis */}
                    {(step.name === 'Presisi (Precision)' ||
                      step.name === 'Recall' ||
                      step.name === 'F-Mean (F-Score)' ||
                      step.name === 'Penalti' ||
                      step.name === 'METEOR Score') && (
                      <MeteorStepAnalysis stepName={step.name} testResult={result} />
                    )}

                    {/* Sentence-BERT Analysis */}
                    {step.name === 'Tokenisasi' && (
                      <SentenceBertPreprocessingAnalysis
                        generatedText={result.generatedText}
                        referenceText={result.referenceText}
                      />
                    )}

                    {step.name === 'Input embedding' && (
                      <SentenceBertEncodingAnalysis
                        generatedText={result.generatedText}
                        referenceText={result.referenceText}
                      />
                    )}

                    {step.name === 'Self-Attention' && (
                      <SelfAttentionAnalysis
                        generatedText={result.generatedText}
                        referenceText={result.referenceText}
                      />
                    )}

                    {step.name === 'FFN + Residual + Layer Normalization' && (
                      <FFNResidualAnalysis
                        generatedText={result.generatedText}
                        referenceText={result.referenceText}
                      />
                    )}

                    {step.name === 'Mean pooling' && (
                      <MeanPoolingTabs data={getMeanPoolingData(result)} />
                    )}

                    {step.name === 'Cosine Similarity' && (
                      <CosineSimilarityTabs
                        actualScore={result.score ?? 0}
                        data={getCosineSimilarityData(result)}
                      />
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// Helper: ambil data Mean Pooling dari overall embeddings
function getMeanPoolingData(result) {
  const detailedMetrics = result.detailed_metrics || {};
  const details = result.details || {};
  const overall = detailedMetrics.overall_embeddings || details.overall_embeddings || {};

  if (overall.generated && overall.reference) {
    return {
      sentence1: {
        label: 'u',
        name: 'HYPOTHESIS H',
        embedding: overall.generated.slice(0, 8),
        fullEmbedding: overall.generated,
        fullDimension: overall.generated.length,
        numTokens: result.generatedText ? result.generatedText.split(/\s+/).length + 2 : 0,
      },
      sentence2: {
        label: 'v',
        name: 'REFERENCE R',
        embedding: overall.reference.slice(0, 8),
        fullEmbedding: overall.reference,
        fullDimension: overall.reference.length,
        numTokens: result.referenceText ? result.referenceText.split(/\s+/).length + 2 : 0,
      },
    };
  }
  return null;
}

// Helper: ambil data Cosine Similarity dari overall embeddings
function getCosineSimilarityData(result) {
  const detailedMetrics = result.detailed_metrics || {};
  const details = result.details || {};
  const overall = detailedMetrics.overall_embeddings || details.overall_embeddings || {};

  if (overall.generated && overall.reference) {
    return {
      sentence1: {
        label: 'u',
        name: 'HYPOTHESIS H',
        fullEmbedding: overall.generated,
        fullDimension: overall.generated.length,
        numTokens: result.generatedText ? result.generatedText.split(/\s+/).length + 2 : 0,
      },
      sentence2: {
        label: 'v',
        name: 'REFERENCE R',
        fullEmbedding: overall.reference,
        fullDimension: overall.reference.length,
        numTokens: result.referenceText ? result.referenceText.split(/\s+/).length + 2 : 0,
      },
    };
  }
  return null;
}

// ============================================================================
// MeteorStepAnalysis - tampilkan visualisasi metric per step (tanpa per-section)
// ============================================================================

const MeteorStepAnalysis = ({ stepName, testResult }) => {
  // Pakai overall metrics dari teks utuh
  const detailedMetrics = testResult?.detailed_metrics || testResult?.details?.detailed_metrics || {};
  const details = testResult?.details || {};

  const precision = detailedMetrics.precision ?? details.precision ?? 0;
  const recall = detailedMetrics.recall ?? details.recall ?? 0;
  let fMean = detailedMetrics.f_mean ?? details.f_mean ?? 0;
  
  // Fallback: hitung F-Mean jika tidak ada di data (formula METEOR: 10*P*R / (9*P + R))
  if (fMean === 0 && (precision > 0 || recall > 0)) {
    const denominator = (9 * precision) + recall;
    fMean = denominator > 0 ? (10 * precision * recall) / denominator : 0;
    console.log('🔧 [F-Mean Fallback] Calculated:', {
      precision,
      recall,
      calculated_f_mean: fMean,
      formula: '10 * P * R / (9*P + R)'
    });
  }
  
  const penalty = detailedMetrics.penalty ?? details.penalty ?? 0;
  const matches = detailedMetrics.matches ?? details.matches ?? 0;
  const generatedTokens = detailedMetrics.generated_tokens ?? details.generated_tokens ?? 0;
  const referenceTokens = detailedMetrics.reference_tokens ?? details.reference_tokens ?? 0;
  const chunks = detailedMetrics.chunks ?? details.chunks ?? 0;
  const meteorScore = testResult?.score ?? 0;

  // Debug log untuk F-Mean step
  if (stepName === 'F-Mean (F-Score)') {
    console.log('📊 [F-Mean Debug]', {
      precision,
      recall,
      fMean,
      detailedMetrics_f_mean: detailedMetrics.f_mean,
      details_f_mean: details.f_mean,
      testResult_keys: Object.keys(testResult || {})
    });
  }

  if (stepName === 'Presisi (Precision)') {
    return (
      <RatioVisualization
        label="Precision"
        value={precision}
        numerator={{ label: 'Total kata cocok', value: matches }}
        denominator={{ label: 'Total kata dihasilkan', value: generatedTokens }}
      />
    );
  }

  if (stepName === 'Recall') {
    return (
      <RatioVisualization
        label="Recall"
        value={recall}
        numerator={{ label: 'Total kata cocok', value: matches }}
        denominator={{ label: 'Total kata referensi', value: referenceTokens }}
      />
    );
  }

  if (stepName === 'F-Mean (F-Score)') {
    return (
      <BalanceVisualization
        title="Keseimbangan Presisi vs Recall"
        bar1={{ label: 'Presisi', value: precision, color: '#C27AFF', track: '#120C18' }}
        bar2={{ label: 'Recall', value: recall, color: '#FF7AD0', track: '#160D14' }}
        result={{ label: 'F-Mean', value: fMean }}
      />
    );
  }

  if (stepName === 'Penalti') {
    return (
      <RatioVisualization
        label="Penalty"
        value={penalty}
        numerator={{ label: 'Chunks', value: chunks }}
        denominator={{ label: 'Matches', value: matches }}
      />
    );
  }

  if (stepName === 'METEOR Score') {
    return (
      <BalanceVisualization
        title="Perhitungan METEOR Score"
        bar1={{ label: 'F-Mean', value: fMean, color: '#C27AFF', track: '#120C18' }}
        bar2={{ label: 'Penalty', value: penalty, color: '#FF7AD0', track: '#160D14' }}
        result={{ label: 'METEOR Score', value: meteorScore }}
      />
    );
  }

  return null;
};

// ============================================================================
// Reusable visualization components
// ============================================================================

const RatioVisualization = ({ label, value, numerator, denominator }) => {
  const numFraction =
    Math.max(numerator.value, denominator.value) > 0
      ? numerator.value / Math.max(numerator.value, denominator.value)
      : 0;

  return (
    <div
      className="bg-black rounded-xl p-6 shadow-lg"
      style={{ borderWidth: '1px', borderStyle: 'solid', borderColor: '#241931' }}
    >
      <h6 className="font-semibold text-white mb-4">Analisis {label}</h6>

      <div className="flex gap-6 mb-6">
        {/* Visualization 70% */}
        <div className="flex-1 flex items-center">
          <div className="flex items-center gap-4 w-full">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#C27AFF' }}></div>
                <span className="text-xs text-gray-400">
                  {numerator.label}: {numerator.value}
                </span>
              </div>
              <div className="w-full h-2 rounded-full" style={{ backgroundColor: '#120C18' }}>
                <div
                  className="h-2 rounded-full transition-all duration-1000"
                  style={{
                    width: `${Math.min(numFraction * 100, 100)}%`,
                    backgroundColor: '#C27AFF',
                  }}
                ></div>
              </div>
            </div>

            <div className="text-2xl font-bold" style={{ color: '#2C1A43' }}>
              /
            </div>

            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#FF7AD0' }}></div>
                <span className="text-xs text-gray-400">
                  {denominator.label}: {denominator.value}
                </span>
              </div>
              <div className="w-full h-2 rounded-full" style={{ backgroundColor: '#160D14' }}>
                <div
                  className="h-2 rounded-full transition-all duration-1000"
                  style={{ width: '100%', backgroundColor: '#FF7AD0' }}
                ></div>
              </div>
            </div>
          </div>
        </div>

        {/* Result card 30% */}
        <div
          className="w-48 rounded-xl p-4 pt-12 pb-10"
          style={{
            backgroundColor: '#000000',
            borderWidth: '1px',
            borderStyle: 'solid',
            borderColor: '#241931',
          }}
        >
          <div className="text-center">
            <div className="text-white font-medium mb-4">{label}</div>
            <div className="text-3xl font-bold mb-4" style={{ color: '#C27AFF' }}>
              {value.toFixed(5)}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const BalanceVisualization = ({ title, bar1, bar2, result }) => {
  return (
    <div
      className="bg-black rounded-xl p-6 shadow-lg"
      style={{ borderWidth: '1px', borderStyle: 'solid', borderColor: '#241931' }}
    >
      <h6 className="font-semibold text-white mb-4">{title}</h6>

      <div className="flex gap-6 mb-6">
        {/* Bars 70% */}
        <div className="flex-1 flex items-center">
          <div className="space-y-4 w-full">
            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="font-medium" style={{ color: bar1.color }}>
                  {bar1.label}
                </span>
                <span className="font-bold" style={{ color: bar1.color }}>
                  {bar1.value.toFixed(5)}
                </span>
              </div>
              <div className="w-full rounded-full h-2" style={{ backgroundColor: bar1.track }}>
                <div
                  className="bg-gradient-to-r from-purple-500 to-purple-400 h-2 rounded-full transition-all duration-1000"
                  style={{ width: `${Math.min(bar1.value * 100, 100)}%` }}
                ></div>
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="font-medium" style={{ color: bar2.color }}>
                  {bar2.label}
                </span>
                <span className="font-bold" style={{ color: bar2.color }}>
                  {bar2.value.toFixed(5)}
                </span>
              </div>
              <div className="w-full rounded-full h-2" style={{ backgroundColor: bar2.track }}>
                <div
                  className="bg-gradient-to-r from-pink-500 to-pink-400 h-2 rounded-full transition-all duration-1000"
                  style={{ width: `${Math.min(bar2.value * 100, 100)}%` }}
                ></div>
              </div>
            </div>
          </div>
        </div>

        {/* Result card 30% */}
        <div
          className="w-48 rounded-xl p-4 pt-12 pb-10"
          style={{
            backgroundColor: '#000000',
            borderWidth: '1px',
            borderStyle: 'solid',
            borderColor: '#241931',
          }}
        >
          <div className="text-center">
            <div className="text-white font-medium mb-4">{result.label}</div>
            <div className="text-3xl font-bold mb-4" style={{ color: '#C27AFF' }}>
              {result.value.toFixed(5)}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// Empty state
// ============================================================================

const EmptyTestState = ({ tabConfig, onStartTest }) => {
  return (
    <div className="p-16 text-center">
      <div
        className={`w-16 h-16 rounded-2xl bg-gradient-to-br from-${tabConfig.color}-500/20 to-${
          tabConfig.color === 'purple' ? 'pink' : 'purple'
        }-500/20 flex items-center justify-center border border-${tabConfig.color}-500/20 mx-auto mb-8`}
      ></div>

      <h3 className="text-2xl font-bold text-white mb-4">Belum Ada Hasil Pengujian</h3>

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

// ============================================================================
// Sentence-BERT Preprocessing & Encoding visualizations (unchanged from original,
// dipertahankan apa adanya tapi tanpa selectedSection)
// ============================================================================

const SentenceBertPreprocessingAnalysis = ({ generatedText, referenceText }) => {
  const simulateTokenization = (text) => {
    if (!text) return [];
    const words = text.toLowerCase().split(/\s+/).filter((t) => t.length > 0);
    const tokens = [];

    const commonWords = new Set([
      'given', 'when', 'then', 'and', 'the', 'is', 'on', 'to', 'a', 'in', 'of', 'for',
      'yang', 'dan', 'pada', 'di', 'dengan', 'ke', 'dari', 'untuk', 'serta', 'atau',
      'user', 'sistem', 'login', 'email', 'password', 'tombol', 'halaman', 'aplikasi',
      'pengguna', 'berada', 'telah', 'benar', 'masuk', 'valid', 'kredensial',
    ]);

    const commonPrefixes = ['mem', 'men', 'meng', 'me', 'peng', 'per', 'ber', 'ter', 'di', 'ke'];

    words.forEach((word) => {
      const cleanWord = word.replace(/[.,!?;:"()]/g, '');
      if (!cleanWord) return;
      if (commonWords.has(cleanWord)) {
        tokens.push(cleanWord);
        return;
      }
      if (cleanWord.length <= 5) {
        tokens.push(cleanWord);
        return;
      }

      let prefixFound = false;
      for (const prefix of commonPrefixes) {
        if (cleanWord.startsWith(prefix) && cleanWord.length > prefix.length + 3) {
          tokens.push(prefix);
          tokens.push('##' + cleanWord.substring(prefix.length));
          prefixFound = true;
          break;
        }
      }

      if (!prefixFound) {
        if (cleanWord.length > 8) {
          const vowels = ['a', 'e', 'i', 'o', 'u'];
          let splitPos = Math.floor(cleanWord.length / 2);
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

  const renderTokens = (label, tokens) => (
    <div className="border border-pink-500/20 rounded-xl p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="text-sm font-semibold text-gray-300">
          {label} → {tokens.length + 2} token input
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        <span
          className="inline-block px-2.5 py-1 rounded text-xs font-mono"
          style={{
            backgroundColor: '#160D14',
            borderColor: '#44273D',
            borderWidth: '1px',
            color: '#FF7AD0',
          }}
        >
          [CLS]
        </span>
        {tokens.map((token, idx) => (
          <span
            key={idx}
            className="inline-block px-2.5 py-1 rounded text-xs font-mono"
            style={{
              backgroundColor: '#0D0D0D',
              borderColor: 'rgba(255, 255, 255, 0.05)',
              borderWidth: '1px',
              color: '#FFFFFF',
            }}
          >
            {token}
          </span>
        ))}
        <span
          className="inline-block px-2.5 py-1 rounded text-xs font-mono"
          style={{
            backgroundColor: '#160D14',
            borderColor: '#44273D',
            borderWidth: '1px',
            color: '#FF7AD0',
          }}
        >
          [SEP]
        </span>
      </div>
    </div>
  );

  return (
    <div className="space-y-4">
      {renderTokens('Hypothesis', genTokens)}
      {renderTokens('Reference', refTokens)}
    </div>
  );
};

const SentenceBertEncodingAnalysis = ({ generatedText, referenceText }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const simulateTokenization = (text) => {
    if (!text) return [];
    const words = text.toLowerCase().split(/\s+/).filter((t) => t.length > 0);
    const tokens = [];

    const commonWords = new Set([
      'given', 'when', 'then', 'and', 'the', 'is', 'on', 'to', 'a', 'in', 'of', 'for',
      'yang', 'dan', 'pada', 'di', 'dengan', 'ke', 'dari', 'untuk', 'serta', 'atau',
      'user', 'sistem', 'login', 'email', 'password', 'tombol', 'halaman', 'aplikasi',
      'pengguna', 'berada', 'telah', 'benar', 'masuk', 'valid', 'kredensial',
    ]);
    const commonPrefixes = ['mem', 'men', 'meng', 'me', 'peng', 'per', 'ber', 'ter', 'di', 'ke'];

    words.forEach((word) => {
      const cleanWord = word.replace(/[.,!?;:"()]/g, '');
      if (!cleanWord) return;
      if (commonWords.has(cleanWord)) {
        tokens.push(cleanWord);
        return;
      }
      if (cleanWord.length <= 5) {
        tokens.push(cleanWord);
        return;
      }

      let prefixFound = false;
      for (const prefix of commonPrefixes) {
        if (cleanWord.startsWith(prefix) && cleanWord.length > prefix.length + 3) {
          tokens.push(prefix);
          tokens.push('##' + cleanWord.substring(prefix.length));
          prefixFound = true;
          break;
        }
      }

      if (!prefixFound) {
        if (cleanWord.length > 8) {
          const vowels = ['a', 'e', 'i', 'o', 'u'];
          let splitPos = Math.floor(cleanWord.length / 2);
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
  const genTokenCount = genTokens.length + 2;

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
      h0_dim4: ((seed * 31) % 1000) / 1000 - 0.5,
    };
  };

  const displayLimit = isExpanded ? genTokens.length : 5;

  const renderRow = (label, emb, isSpecial = false) => (
    <tr className="border-b border-white/5 hover:bg-gray-800/30">
      <td className={`py-2 px-3 ${isSpecial ? 'text-[#FF7AD0]' : 'text-white/50'}`}>{label}</td>
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

  return (
    <div className="space-y-4">
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
              {renderRow('[CLS]', generateEmbedding('[CLS]', 0), true)}
              {genTokens.slice(0, displayLimit).map((token, idx) =>
                renderRow(token, generateEmbedding(token, idx + 1))
              )}
              {!isExpanded && genTokens.length > 5 && (
                <tr>
                  <td colSpan="9" className="text-center py-3">
                    <button
                      onClick={() => setIsExpanded(true)}
                      className="flex items-center justify-center gap-2 mx-auto px-4 py-2 rounded-lg text-xs font-semibold transition-colors"
                      style={{
                        backgroundColor: '#09090A',
                        borderColor: 'rgba(255, 255, 255, 0.05)',
                        borderWidth: '1px',
                        color: 'rgba(255, 255, 255, 0.7)',
                      }}
                    >
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
                      style={{
                        backgroundColor: '#09090A',
                        borderColor: 'rgba(255, 255, 255, 0.05)',
                        borderWidth: '1px',
                        color: 'rgba(255, 255, 255, 0.7)',
                      }}
                    >
                      Sembunyikan
                    </button>
                  </td>
                </tr>
              )}
              {renderRow('[SEP]', generateEmbedding('[SEP]', genTokenCount - 1), true)}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default TestResultsDetailPage;