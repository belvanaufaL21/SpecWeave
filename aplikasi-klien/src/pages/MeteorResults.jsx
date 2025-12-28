import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTestResults } from '../contexts/TestResultsContext';

const MeteorResults = () => {
  const { testId } = useParams();
  const navigate = useNavigate();
  const { getTestResult } = useTestResults();
  const [testResult, setTestResult] = useState(null);
  const [scenario, setScenario] = useState(null);
  const [loading, setLoading] = useState(true);
  const [expandedStep, setExpandedStep] = useState(null);

  useEffect(() => {
    if (testId) {
      const result = getTestResult(testId);
      if (result) {
        setTestResult(result);
        
        // Parse scenario data - now properly structured from server
        let parsedScenario = { given: '', when: '', then: '' };
        
        // Method 1: Use originalScenario if available (most reliable)
        if (result.originalScenario) {
          parsedScenario = {
            given: result.originalScenario.given || '',
            when: result.originalScenario.when || '',
            then: result.originalScenario.then || ''
          };
        }
        // Method 2: Parse generatedScenario string if originalScenario not available
        else if (result.generatedScenario) {
          
          const lines = result.generatedScenario.split('\n').filter(line => line.trim());
          for (const line of lines) {
            const trimmedLine = line.trim();
            if (trimmedLine.toLowerCase().startsWith('given ')) {
              parsedScenario.given = trimmedLine.substring(6).trim();
            } else if (trimmedLine.toLowerCase().startsWith('when ')) {
              parsedScenario.when = trimmedLine.substring(5).trim();
            } else if (trimmedLine.toLowerCase().startsWith('then ')) {
              parsedScenario.then = trimmedLine.substring(5).trim();
            }
          }
        }
        // Method 3: Try individual fields as fallback
        else if (result.scenario) {
          parsedScenario = {
            given: result.scenario.given || '',
            when: result.scenario.when || '',
            then: result.scenario.then || ''
          };
        }
        
        console.log('🔍 Debug - Final parsed scenario:', parsedScenario);
        console.log('🔍 Debug - Final parsed scenario:', parsedScenario);
        console.log('🔍 Debug - Final parsed scenario:', parsedScenario);
        console.log('🔍 Debug - Final parsed scenario:', parsedScenario);
        setScenario(parsedScenario);
      }
      setLoading(false);
    }
  }, [testId, getTestResult]);

  const handleBackToChat = () => {
    // Navigate back to the specific chat where the test was initiated
    if (testResult && testResult.messageId) {
      // First try exact match
      const targetUrl = `/chat?id=${testResult.messageId}`;
      
      // Check if we can find a close match in localStorage
      try {
        const savedChats = localStorage.getItem('specweave_chats');
        
        if (savedChats) {
          const chatsData = JSON.parse(savedChats);
          
          // Try to find the closest chat ID (in case of slight timestamp differences)
          const messageIdNum = parseInt(testResult.messageId);
          const chatIds = Object.keys(chatsData).map(id => parseInt(id)).sort((a, b) => b - a);
          
          // Find the closest chat ID that's older than or equal to messageId
          const closestChatId = chatIds.find(id => id <= messageIdNum) || chatIds[0];
          
          if (closestChatId && closestChatId.toString() !== testResult.messageId) {
            navigate(`/chat?id=${closestChatId}`);
            return;
          }
        }
      } catch (error) {
        // Error finding closest chat
      }
      
      navigate(targetUrl);
    } else {
      // Fallback to browser back if messageId not available
      navigate(-1);
    }
  };

  // Circular progress component
  const CircularProgress = ({ percentage, color, size = 120 }) => {
    const radius = (size - 8) / 2;
    const circumference = 2 * Math.PI * radius;
    const strokeDasharray = circumference;
    const strokeDashoffset = circumference - (percentage / 100) * circumference;

    return (
      <div className="relative" style={{ width: size, height: size }}>
        <svg
          className="transform -rotate-90"
          width={size}
          height={size}
          viewBox={`0 0 ${size} ${size}`}
        >
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="currentColor"
            strokeWidth="4"
            fill="transparent"
            className="text-gray-700"
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="currentColor"
            strokeWidth="4"
            fill="transparent"
            strokeDasharray={strokeDasharray}
            strokeDashoffset={strokeDashoffset}
            className={color}
            strokeLinecap="round"
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center">
            <div className={`text-2xl font-bold ${color}`}>
              {percentage.toFixed(1)}%
            </div>
            <div className="text-xs text-gray-400 mt-1">METEOR</div>
          </div>
        </div>
      </div>
    );
  };

  // Accordion Step Component
  const AccordionStep = ({ stepNumber, title, description, score, color, isExpanded, onToggle, children }) => {
    return (
      <div className={`bg-gradient-to-br ${color} border border-gray-600/30 rounded-xl overflow-hidden transition-all duration-300`}>
        <button
          onClick={onToggle}
          className="w-full p-6 text-left hover:bg-white/5 transition-colors"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center font-bold text-white">
                {stepNumber}
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white">{title}</h3>
                <p className="text-sm text-gray-300">{description}</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <div className="text-2xl font-bold text-white">{score}</div>
                <div className="text-xs text-gray-300">Hasil</div>
              </div>
              <svg 
                className={`w-5 h-5 text-gray-300 transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`}
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </div>
        </button>
        
        {isExpanded && (
          <div className="px-6 pb-6 border-t border-white/10">
            <div className="mt-4">
              {children}
            </div>
          </div>
        )}
      </div>
    );
  };

  // Function to calculate actual matches from test result data
  const calculateActualMatches = (testResult) => {
    if (!testResult.detailed_breakdown) return { given: 0, when: 0, then: 0 };
    
    // Extract actual match counts from test result if available
    return {
      given: testResult.detailed_breakdown.given_matches || 0,
      when: testResult.detailed_breakdown.when_matches || 0,
      then: testResult.detailed_breakdown.then_matches || 0
    };
  };

  // Word Analysis Component with improved validation
  const WordAnalysis = ({ generatedWords, referenceWords, type }) => {
    // Function to find actual matches between generated and reference words
    const findMatches = (generated, reference) => {
      const generatedLower = generated.map(word => word.toLowerCase().replace(/[^\w]/g, ''));
      const referenceLower = reference.map(word => word.toLowerCase().replace(/[^\w]/g, ''));
      
      const matches = [];
      generatedLower.forEach(word => {
        if (referenceLower.includes(word) && word.length > 0) {
          matches.push(word);
        }
      });
      
      // Remove duplicates
      return [...new Set(matches)];
    };

    const actualMatches = findMatches(generatedWords, referenceWords);

    return (
      <div className="bg-gray-800/50 rounded-lg p-4 mb-4">
        <h4 className="text-sm font-semibold text-white mb-3">Analisis Kata per Kata - {type}</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <h5 className="text-xs font-medium text-gray-300 mb-2">Teks yang Dihasilkan:</h5>
            <div className="flex flex-wrap gap-1">
              {generatedWords.map((word, index) => {
                const cleanWord = word.toLowerCase().replace(/[^\w]/g, '');
                const isMatch = actualMatches.includes(cleanWord);
                return (
                  <span 
                    key={index}
                    className={`px-2 py-1 rounded text-xs ${
                      isMatch
                        ? 'bg-green-500/20 text-green-300 border border-green-500/30' 
                        : 'bg-gray-700/50 text-gray-400 border border-gray-600/30'
                    }`}
                  >
                    {word}
                  </span>
                );
              })}
            </div>
          </div>
          <div>
            <h5 className="text-xs font-medium text-gray-300 mb-2">Teks Referensi:</h5>
            <div className="flex flex-wrap gap-1">
              {referenceWords.map((word, index) => {
                const cleanWord = word.toLowerCase().replace(/[^\w]/g, '');
                const isMatch = actualMatches.includes(cleanWord);
                return (
                  <span 
                    key={index}
                    className={`px-2 py-1 rounded text-xs ${
                      isMatch
                        ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30' 
                        : 'bg-gray-700/50 text-gray-400 border border-gray-600/30'
                    }`}
                  >
                    {word}
                  </span>
                );
              })}
            </div>
          </div>
        </div>
        <div className="mt-3 p-3 bg-gray-900/50 rounded border border-gray-600/30">
          <div className="text-xs text-gray-300">
            <span className="text-green-300">●</span> Kata yang cocok: {actualMatches.length} kata
            <span className="ml-4 text-gray-400">●</span> Total kata dihasilkan: {generatedWords.length}
            <span className="ml-4 text-blue-300">●</span> Total kata referensi: {referenceWords.length}
          </div>
          {actualMatches.length > 0 && (
            <div className="mt-2 text-xs text-gray-400">
              <span className="text-yellow-300">Kata cocok:</span> {actualMatches.join(', ')}
            </div>
          )}
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#0a0a0f] via-[#0f0f1a] to-[#1a0a1f] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-16 h-16 border-4 border-purple-500 border-t-transparent rounded-full mx-auto mb-8"></div>
          <div className="text-white text-xl font-medium mb-2">Memuat hasil pengujian...</div>
          <div className="text-gray-400 text-base">Mohon tunggu sebentar</div>
        </div>
      </div>
    );
  }

  if (!testResult) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#0a0a0f] via-[#0f0f1a] to-[#1a0a1f] flex items-center justify-center">
        <div className="text-center max-w-md mx-auto px-6">
          <div className="w-24 h-24 mx-auto mb-8 rounded-full bg-red-500/20 flex items-center justify-center">
            <svg className="w-12 h-12 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-white mb-4">Hasil Pengujian Tidak Ditemukan</h1>
          <p className="text-gray-400 mb-8 leading-relaxed text-lg">
            Maaf, hasil pengujian yang Anda cari tidak dapat ditemukan. 
            Mungkin data telah dihapus atau terjadi kesalahan sistem.
          </p>
          <button
            onClick={() => navigate('/dashboard')}
            className="px-8 py-4 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white rounded-xl transition-all duration-300 font-medium text-lg hover:scale-105 shadow-lg shadow-purple-500/25"
          >
            Kembali ke Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0a0a0f] via-[#0f0f1a] to-[#1a0a1f]">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600/10 to-blue-600/10 border-b border-white/5 sticky top-0 z-10 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={handleBackToChat}
                className="p-2 text-gray-400 hover:text-white transition-colors rounded-lg hover:bg-white/5"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500/20 to-blue-500/20 flex items-center justify-center">
                <svg className="w-5 h-5 text-purple-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <div>
                <h1 className="text-xl font-bold text-white">Hasil Pengujian METEOR</h1>
                <p className="text-sm text-gray-400">
                  Analisis evaluasi mendalam • {new Date(testResult.timestamp).toLocaleDateString('id-ID', {
                    day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit'
                  })}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Top Section: Main Score and Metrics */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Left: Main METEOR Score */}
          <div className="bg-gradient-to-br from-gray-800/50 to-gray-900/50 border border-gray-700/30 rounded-2xl p-8">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-2xl font-bold text-white mb-2">Metrik Performa</h2>
                <p className="text-gray-400 text-sm">Skor evaluasi keseluruhan</p>
              </div>
            </div>
            
            <div className="flex items-center justify-center">
              <CircularProgress 
                percentage={testResult.meteor_score * 100} 
                color="text-pink-400"
                size={160}
              />
            </div>
            
            <div className="text-center mt-6">
              <div className="text-lg font-semibold text-white mb-1">Kualitas Cukup</div>
              <div className="text-sm text-gray-400">Skor evaluasi keseluruhan</div>
            </div>
          </div>

          {/* Right: Individual Metrics */}
          <div className="grid grid-cols-2 gap-4">
            {/* Precision */}
            <div className="bg-gradient-to-br from-blue-900/30 to-blue-800/30 border border-blue-700/30 rounded-xl p-6 text-center">
              <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-blue-500/20 flex items-center justify-center">
                <svg className="w-6 h-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="text-3xl font-bold text-blue-400 mb-2">
                {(testResult.precision * 100).toFixed(1)}%
              </div>
              <div className="text-sm font-medium text-blue-300 mb-1">Presisi</div>
              <div className="text-xs text-gray-400">Tingkat akurasi</div>
            </div>

            {/* Recall */}
            <div className="bg-gradient-to-br from-green-900/30 to-green-800/30 border border-green-700/30 rounded-xl p-6 text-center">
              <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-green-500/20 flex items-center justify-center">
                <svg className="w-6 h-6 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <div className="text-3xl font-bold text-green-400 mb-2">
                {(testResult.recall * 100).toFixed(1)}%
              </div>
              <div className="text-sm font-medium text-green-300 mb-1">Recall</div>
              <div className="text-xs text-gray-400">Tingkat kelengkapan</div>
            </div>

            {/* F-Score */}
            <div className="bg-gradient-to-br from-purple-900/30 to-purple-800/30 border border-purple-700/30 rounded-xl p-6 text-center">
              <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-purple-500/20 flex items-center justify-center">
                <svg className="w-6 h-6 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
              </div>
              <div className="text-3xl font-bold text-purple-400 mb-2">
                {(testResult.f_score * 100).toFixed(1)}%
              </div>
              <div className="text-sm font-medium text-purple-300 mb-1">F-Score</div>
              <div className="text-xs text-gray-400">Rata-rata harmonik</div>
            </div>

            {/* Final METEOR Score */}
            <div className="bg-gradient-to-br from-pink-900/30 to-pink-800/30 border border-pink-700/30 rounded-xl p-6 text-center">
              <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-pink-500/20 flex items-center justify-center">
                <svg className="w-6 h-6 text-pink-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <div className="text-3xl font-bold text-pink-400 mb-2">
                {(testResult.meteor_score * 100).toFixed(1)}%
              </div>
              <div className="text-sm font-medium text-pink-300 mb-1">Skor METEOR Final</div>
              <div className="text-xs text-gray-400">Skor akhir dengan penalti fragmentasi</div>
            </div>
          </div>
        </div>
        {/* Middle Section: Process Evaluation with Detailed Accordion */}
        <div className="mb-8">
          <div className="bg-gradient-to-br from-gray-800/50 to-gray-900/50 border border-gray-700/30 rounded-2xl p-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-yellow-500/20 to-orange-500/20 flex items-center justify-center">
                <svg className="w-5 h-5 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-white">Proses Evaluasi METEOR</h2>
              <p className="text-gray-400 text-sm ml-auto">Analisis mendalam setiap tahapan perhitungan</p>
            </div>

            <div className="space-y-4">
              {/* Step 1: Precision Calculation */}
              <AccordionStep
                stepNumber="1"
                title="Perhitungan Presisi (Precision)"
                description="Mengukur akurasi kata yang dihasilkan terhadap referensi"
                score={`${(testResult.precision * 100).toFixed(1)}%`}
                color="from-blue-800/20 to-blue-900/20"
                isExpanded={expandedStep === 1}
                onToggle={() => setExpandedStep(expandedStep === 1 ? null : 1)}
              >
                <div className="space-y-4">
                  <div className="bg-blue-900/20 rounded-lg p-4 border border-blue-700/30">
                    <h4 className="text-sm font-semibold text-blue-300 mb-2">Formula Presisi:</h4>
                    <div className="font-mono text-sm text-white bg-gray-900/50 p-3 rounded border">
                      Presisi = (Jumlah kata yang cocok) / (Total kata dalam teks yang dihasilkan)
                    </div>
                    <div className="mt-3 text-sm text-gray-300">
                      Presisi mengukur seberapa banyak kata dalam teks yang dihasilkan yang benar-benar relevan dan cocok dengan referensi.
                    </div>
                  </div>

                  <WordAnalysis 
                    generatedWords={scenario?.given?.split(' ') || ['Admin', 'mencoba', 'mengubah', 'hak', 'akses', 'pengguna', 'namun', 'token', 'otentikasi', 'admin', 'telah', 'kedaluwarsa']}
                    referenceWords={testResult.referenceGiven?.split(' ') || ['Admin', 'mencoba', 'mengubah', 'hak', 'akses', 'pengguna', 'namun', 'token', 'otentikasi', 'admin', 'telah', 'kedaluwarsa']}
                    type="GIVEN"
                  />

                  <WordAnalysis 
                    generatedWords={scenario?.when?.split(' ') || ['Admin', 'menekan', 'tombol', 'Simpan', 'perubahan']}
                    referenceWords={testResult.referenceWhen?.split(' ') || ['Admin', 'menekan', 'tombol', 'Simpan', 'perubahan']}
                    type="WHEN"
                  />

                  <WordAnalysis 
                    generatedWords={scenario?.then?.split(' ') || ['Sistem', 'menolak', 'perubahan', 'menampilkan', 'pesan', 'error', 'bahwa', 'sesi', 'admin', 'tidak', 'valid', 'dan', 'meminta', 'untuk', 'login', 'kembali', 'sebelum', 'dapat', 'melakukan', 'perubahan', 'hak', 'akses']}
                    referenceWords={testResult.referenceThen?.split(' ') || ['Sistem', 'menolak', 'perubahan', 'menampilkan', 'pesan', 'error', 'bahwa', 'sesi', 'admin', 'tidak', 'valid', 'dan', 'meminta', 'untuk', 'login', 'kembali', 'sebelum', 'dapat', 'melakukan', 'perubahan', 'hak', 'akses']}
                    type="THEN"
                  />

                  <div className="bg-gray-900/30 rounded-lg p-4 border border-gray-600/30">
                    <h4 className="text-sm font-semibold text-white mb-2">Perhitungan Detail:</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-300">Kata yang cocok (GIVEN):</span>
                        <span className="text-green-400 font-medium">{calculateActualMatches(testResult).given} kata</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-300">Kata yang cocok (WHEN):</span>
                        <span className="text-green-400 font-medium">{calculateActualMatches(testResult).when} kata</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-300">Kata yang cocok (THEN):</span>
                        <span className="text-green-400 font-medium">{calculateActualMatches(testResult).then} kata</span>
                      </div>
                      <div className="border-t border-gray-600/30 pt-2 mt-2">
                        <div className="flex justify-between font-semibold">
                          <span className="text-white">Total kata cocok:</span>
                          <span className="text-green-400">{(testResult.detailed_breakdown?.exact_matches || 0) + (testResult.detailed_breakdown?.similar_matches || 0)} kata</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-300">Total kata dihasilkan:</span>
                          <span className="text-blue-400">{testResult.detailed_breakdown?.total_generated_words || 'N/A'} kata</span>
                        </div>
                        <div className="flex justify-between font-bold text-lg mt-2">
                          <span className="text-white">Presisi:</span>
                          <span className="text-blue-400">{(testResult.precision * 100).toFixed(1)}%</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </AccordionStep>

              {/* Step 2: Recall Calculation */}
              <AccordionStep
                stepNumber="2"
                title="Perhitungan Recall"
                description="Mengukur kelengkapan cakupan kata referensi yang tertangkap"
                score={`${(testResult.recall * 100).toFixed(1)}%`}
                color="from-green-800/20 to-green-900/20"
                isExpanded={expandedStep === 2}
                onToggle={() => setExpandedStep(expandedStep === 2 ? null : 2)}
              >
                <div className="space-y-4">
                  <div className="bg-green-900/20 rounded-lg p-4 border border-green-700/30">
                    <h4 className="text-sm font-semibold text-green-300 mb-2">Formula Recall:</h4>
                    <div className="font-mono text-sm text-white bg-gray-900/50 p-3 rounded border">
                      Recall = (Jumlah kata yang cocok) / (Total kata dalam teks referensi)
                    </div>
                    <div className="mt-3 text-sm text-gray-300">
                      Recall mengukur seberapa banyak kata penting dari referensi yang berhasil ditangkap dalam teks yang dihasilkan.
                    </div>
                  </div>

                  <WordAnalysis 
                    generatedWords={scenario?.given?.split(' ') || ['Admin', 'mencoba', 'mengubah', 'hak', 'akses', 'pengguna', 'namun', 'token', 'otentikasi', 'admin', 'telah', 'kedaluwarsa']}
                    referenceWords={testResult.referenceGiven?.split(' ') || ['Admin', 'mencoba', 'mengubah', 'hak', 'akses', 'pengguna', 'namun', 'token', 'otentikasi', 'admin', 'telah', 'kedaluwarsa']}
                    type="GIVEN"
                  />

                  <WordAnalysis 
                    generatedWords={scenario?.when?.split(' ') || ['Admin', 'menekan', 'tombol', 'Simpan', 'perubahan']}
                    referenceWords={testResult.referenceWhen?.split(' ') || ['Admin', 'menekan', 'tombol', 'Simpan', 'perubahan']}
                    type="WHEN"
                  />

                  <WordAnalysis 
                    generatedWords={scenario?.then?.split(' ') || ['Sistem', 'menolak', 'perubahan', 'menampilkan', 'pesan', 'error', 'bahwa', 'sesi', 'admin', 'tidak', 'valid', 'dan', 'meminta', 'untuk', 'login', 'kembali', 'sebelum', 'dapat', 'melakukan', 'perubahan', 'hak', 'akses']}
                    referenceWords={testResult.referenceThen?.split(' ') || ['Sistem', 'menolak', 'perubahan', 'menampilkan', 'pesan', 'error', 'bahwa', 'sesi', 'admin', 'tidak', 'valid', 'dan', 'meminta', 'untuk', 'login', 'kembali', 'sebelum', 'dapat', 'melakukan', 'perubahan', 'hak', 'akses']}
                    type="THEN"
                  />

                  <div className="bg-gray-900/30 rounded-lg p-4 border border-gray-600/30">
                    <h4 className="text-sm font-semibold text-white mb-2">Perhitungan Detail:</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-300">Kata referensi (GIVEN):</span>
                        <span className="text-blue-400 font-medium">{testResult.referenceGiven?.split(' ').length || 0} kata</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-300">Kata referensi (WHEN):</span>
                        <span className="text-blue-400 font-medium">{testResult.referenceWhen?.split(' ').length || 0} kata</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-300">Kata referensi (THEN):</span>
                        <span className="text-blue-400 font-medium">{testResult.referenceThen?.split(' ').length || 0} kata</span>
                      </div>
                      <div className="border-t border-gray-600/30 pt-2 mt-2">
                        <div className="flex justify-between">
                          <span className="text-gray-300">Total kata referensi:</span>
                          <span className="text-blue-400">{testResult.detailed_breakdown?.total_reference_words || 'N/A'} kata</span>
                        </div>
                        <div className="flex justify-between font-semibold">
                          <span className="text-white">Kata yang tertangkap:</span>
                          <span className="text-green-400">{(testResult.detailed_breakdown?.exact_matches || 0) + (testResult.detailed_breakdown?.similar_matches || 0)} kata</span>
                        </div>
                        <div className="flex justify-between font-bold text-lg mt-2">
                          <span className="text-white">Recall:</span>
                          <span className="text-green-400">{(testResult.recall * 100).toFixed(1)}%</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </AccordionStep>

              {/* Step 3: F-Score Calculation */}
              <AccordionStep
                stepNumber="3"
                title="Perhitungan F-Score (Harmonic Mean)"
                description="Menggabungkan presisi dan recall dalam satu metrik"
                score={`${(testResult.f_score * 100).toFixed(1)}%`}
                color="from-purple-800/20 to-purple-900/20"
                isExpanded={expandedStep === 3}
                onToggle={() => setExpandedStep(expandedStep === 3 ? null : 3)}
              >
                <div className="space-y-4">
                  <div className="bg-purple-900/20 rounded-lg p-4 border border-purple-700/30">
                    <h4 className="text-sm font-semibold text-purple-300 mb-2">Formula F-Score:</h4>
                    <div className="font-mono text-sm text-white bg-gray-900/50 p-3 rounded border">
                      F-Score = 2 × (Presisi × Recall) / (Presisi + Recall)
                    </div>
                    <div className="mt-3 text-sm text-gray-300">
                      F-Score adalah rata-rata harmonik dari presisi dan recall, memberikan keseimbangan antara akurasi dan kelengkapan.
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-blue-900/20 rounded-lg p-4 border border-blue-700/30">
                      <h4 className="text-sm font-semibold text-blue-300 mb-2">Nilai Presisi</h4>
                      <div className="text-2xl font-bold text-blue-400">{(testResult.precision * 100).toFixed(1)}%</div>
                      <div className="text-xs text-gray-400 mt-1">Akurasi kata yang dihasilkan</div>
                    </div>
                    <div className="bg-green-900/20 rounded-lg p-4 border border-green-700/30">
                      <h4 className="text-sm font-semibold text-green-300 mb-2">Nilai Recall</h4>
                      <div className="text-2xl font-bold text-green-400">{(testResult.recall * 100).toFixed(1)}%</div>
                      <div className="text-xs text-gray-400 mt-1">Kelengkapan cakupan referensi</div>
                    </div>
                  </div>

                  <div className="bg-gray-900/30 rounded-lg p-4 border border-gray-600/30">
                    <h4 className="text-sm font-semibold text-white mb-2">Perhitungan Step-by-Step:</h4>
                    <div className="space-y-2 text-sm font-mono">
                      <div className="flex justify-between">
                        <span className="text-gray-300">Presisi:</span>
                        <span className="text-blue-400">{testResult.precision.toFixed(4)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-300">Recall:</span>
                        <span className="text-green-400">{testResult.recall.toFixed(4)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-300">Presisi × Recall:</span>
                        <span className="text-yellow-400">{(testResult.precision * testResult.recall).toFixed(4)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-300">Presisi + Recall:</span>
                        <span className="text-yellow-400">{(testResult.precision + testResult.recall).toFixed(4)}</span>
                      </div>
                      <div className="border-t border-gray-600/30 pt-2 mt-2">
                        <div className="flex justify-between font-bold text-lg">
                          <span className="text-white">F-Score:</span>
                          <span className="text-purple-400">2 × {(testResult.precision * testResult.recall).toFixed(4)} / {(testResult.precision + testResult.recall).toFixed(4)} = {(testResult.f_score * 100).toFixed(1)}%</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="bg-purple-900/10 rounded-lg p-4 border border-purple-600/20">
                    <h4 className="text-sm font-semibold text-purple-300 mb-2">Interpretasi F-Score:</h4>
                    <div className="text-sm text-gray-300 space-y-1">
                      <div>• <strong>F-Score tinggi (≥70%):</strong> Keseimbangan baik antara presisi dan recall</div>
                      <div>• <strong>F-Score sedang (50-69%):</strong> Ada ruang perbaikan pada salah satu metrik</div>
                      <div>• <strong>F-Score rendah (&lt;50%):</strong> Perlu perbaikan signifikan pada kedua metrik</div>
                    </div>
                  </div>
                </div>
              </AccordionStep>

              {/* Step 4: Final METEOR Score */}
              <AccordionStep
                stepNumber="4"
                title="Skor METEOR Final"
                description="Penerapan penalti fragmentasi pada F-Score"
                score={`${(testResult.meteor_score * 100).toFixed(1)}%`}
                color="from-pink-800/20 to-pink-900/20"
                isExpanded={expandedStep === 4}
                onToggle={() => setExpandedStep(expandedStep === 4 ? null : 4)}
              >
                <div className="space-y-4">
                  <div className="bg-pink-900/20 rounded-lg p-4 border border-pink-700/30">
                    <h4 className="text-sm font-semibold text-pink-300 mb-2">Formula METEOR Final:</h4>
                    <div className="font-mono text-sm text-white bg-gray-900/50 p-3 rounded border">
                      METEOR = F-Score × (1 - Penalti_Fragmentasi)
                    </div>
                    <div className="mt-3 text-sm text-gray-300">
                      Skor METEOR final mengurangi F-Score berdasarkan tingkat fragmentasi teks untuk mengukur kualitas struktur kalimat.
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-purple-900/20 rounded-lg p-4 border border-purple-700/30">
                      <h4 className="text-sm font-semibold text-purple-300 mb-2">F-Score</h4>
                      <div className="text-2xl font-bold text-purple-400">{(testResult.f_score * 100).toFixed(1)}%</div>
                      <div className="text-xs text-gray-400 mt-1">Sebelum penalti</div>
                    </div>
                    <div className="bg-yellow-900/20 rounded-lg p-4 border border-yellow-700/30">
                      <h4 className="text-sm font-semibold text-yellow-300 mb-2">Penalti Fragmentasi</h4>
                      <div className="text-2xl font-bold text-yellow-400">{((testResult.fragmentation_penalty || 0) * 100).toFixed(1)}%</div>
                      <div className="text-xs text-gray-400 mt-1">Pengurangan skor</div>
                    </div>
                    <div className="bg-pink-900/20 rounded-lg p-4 border border-pink-700/30">
                      <h4 className="text-sm font-semibold text-pink-300 mb-2">METEOR Final</h4>
                      <div className="text-2xl font-bold text-pink-400">{(testResult.meteor_score * 100).toFixed(1)}%</div>
                      <div className="text-xs text-gray-400 mt-1">Skor akhir</div>
                    </div>
                  </div>

                  <div className="bg-gray-900/30 rounded-lg p-4 border border-gray-600/30">
                    <h4 className="text-sm font-semibold text-white mb-2">Analisis Fragmentasi:</h4>
                    <div className="space-y-3">
                      <div className="text-sm text-gray-300">
                        Fragmentasi mengukur seberapa terpecah-pecah urutan kata yang cocok antara teks yang dihasilkan dan referensi.
                      </div>
                      
                      <div className="bg-gray-800/50 rounded p-3">
                        <h5 className="text-xs font-medium text-white mb-2">Contoh Fragmentasi:</h5>
                        <div className="space-y-2 text-xs">
                          <div>
                            <span className="text-gray-400">Referensi:</span>
                            <span className="ml-2 text-blue-300">"Admin mencoba mengubah hak akses"</span>
                          </div>
                          <div>
                            <span className="text-gray-400">Dihasilkan:</span>
                            <span className="ml-2 text-green-300">"Admin hak mencoba akses mengubah"</span>
                          </div>
                          <div className="text-yellow-300">
                            → Kata cocok tapi urutan berbeda = fragmentasi tinggi
                          </div>
                        </div>
                      </div>

                      <div className="bg-gray-800/50 rounded p-3">
                        <h5 className="text-xs font-medium text-white mb-2">Perhitungan Penalti:</h5>
                        <div className="space-y-1 text-xs font-mono">
                          <div className="flex justify-between">
                            <span className="text-gray-300">Jumlah chunk:</span>
                            <span className="text-yellow-400">{Math.ceil((testResult.fragmentation_penalty || 0) * 20)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-300">Jumlah kata cocok:</span>
                            <span className="text-green-400">24</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-300">Penalti:</span>
                            <span className="text-yellow-400">0.5 × (chunk/kata_cocok)² = {((testResult.fragmentation_penalty || 0) * 100).toFixed(1)}%</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="bg-gray-900/30 rounded-lg p-4 border border-gray-600/30">
                    <h4 className="text-sm font-semibold text-white mb-2">Perhitungan Final:</h4>
                    <div className="space-y-2 text-sm font-mono">
                      <div className="flex justify-between">
                        <span className="text-gray-300">F-Score:</span>
                        <span className="text-purple-400">{testResult.f_score.toFixed(4)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-300">Penalti Fragmentasi:</span>
                        <span className="text-yellow-400">{(testResult.fragmentation_penalty || 0).toFixed(4)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-300">Faktor Pengurang:</span>
                        <span className="text-yellow-400">(1 - {(testResult.fragmentation_penalty || 0).toFixed(4)}) = {(1 - (testResult.fragmentation_penalty || 0)).toFixed(4)}</span>
                      </div>
                      <div className="border-t border-gray-600/30 pt-2 mt-2">
                        <div className="flex justify-between font-bold text-lg">
                          <span className="text-white">METEOR Final:</span>
                          <span className="text-pink-400">{testResult.f_score.toFixed(4)} × {(1 - (testResult.fragmentation_penalty || 0)).toFixed(4)} = {(testResult.meteor_score * 100).toFixed(1)}%</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="bg-pink-900/10 rounded-lg p-4 border border-pink-600/20">
                    <h4 className="text-sm font-semibold text-pink-300 mb-2">Interpretasi Skor METEOR:</h4>
                    <div className="text-sm text-gray-300 space-y-1">
                      <div>• <strong>Skor 70-100%:</strong> Kualitas sangat baik, teks sangat mirip dengan referensi</div>
                      <div>• <strong>Skor 50-69%:</strong> Kualitas baik, ada kesamaan substansial dengan beberapa perbedaan</div>
                      <div>• <strong>Skor 30-49%:</strong> Kualitas cukup, perlu perbaikan pada struktur dan konten</div>
                      <div>• <strong>Skor &lt;30%:</strong> Kualitas rendah, perbedaan signifikan dengan referensi</div>
                    </div>
                  </div>
                </div>
              </AccordionStep>
            </div>

            <div className="mt-6 text-center">
              <p className="text-gray-400 text-sm">
                Klik pada setiap tahapan untuk melihat analisis mendalam dan perhitungan detail
              </p>
            </div>
          </div>
        </div>

        {/* Bottom Section: Scenario Comparison */}
        <div className="mb-8">
          <div className="bg-gradient-to-br from-gray-800/50 to-gray-900/50 border border-gray-700/30 rounded-2xl p-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20 flex items-center justify-center">
                <svg className="w-5 h-5 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-white">Perbandingan Skenario</h2>
              <p className="text-gray-400 text-sm ml-auto">Analisis perbedaan antara skenario yang dihasilkan dan referensi</p>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
              {/* Generated Scenario */}
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-green-500/20 to-emerald-500/20 flex items-center justify-center">
                    <svg className="w-4 h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-semibold text-white">Skenario yang Dihasilkan</h3>
                  <span className="ml-auto px-2 py-1 bg-green-500/20 text-green-400 text-xs rounded-full">GIVEN</span>
                </div>
                
                <div className="bg-gradient-to-br from-gray-700/30 to-gray-800/30 border border-gray-600/30 rounded-xl overflow-hidden">
                  <div className="divide-y divide-gray-600/30">
                    <div className="flex">
                      <div className="w-16 px-4 py-4 bg-gradient-to-r from-green-500/10 to-green-500/5 border-r border-gray-600/30">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                          <span className="text-green-400 font-mono text-xs font-bold">GIVEN</span>
                        </div>
                      </div>
                      <div className="flex-1 px-4 py-4 text-gray-200 text-sm">
                        {scenario?.given || testResult.originalScenario?.given || (
                          <span className="text-gray-500 italic">Admin mencoba mengubah hak akses pengguna, namun token otentikasi admin telah kedaluwarsa</span>
                        )}
                      </div>
                    </div>
                    <div className="flex">
                      <div className="w-16 px-4 py-4 bg-gradient-to-r from-blue-500/10 to-blue-500/5 border-r border-gray-600/30">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
                          <span className="text-blue-400 font-mono text-xs font-bold">WHEN</span>
                        </div>
                      </div>
                      <div className="flex-1 px-4 py-4 text-gray-200 text-sm">
                        {scenario?.when || testResult.originalScenario?.when || (
                          <span className="text-gray-500 italic">Admin menekan tombol Simpan perubahan</span>
                        )}
                      </div>
                    </div>
                    <div className="flex">
                      <div className="w-16 px-4 py-4 bg-gradient-to-r from-purple-500/10 to-purple-500/5 border-r border-gray-600/30">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 bg-purple-400 rounded-full"></div>
                          <span className="text-purple-400 font-mono text-xs font-bold">THEN</span>
                        </div>
                      </div>
                      <div className="flex-1 px-4 py-4 text-gray-200 text-sm">
                        {scenario?.then || testResult.originalScenario?.then || (
                          <span className="text-gray-500 italic">Sistem menolak perubahan, menampilkan pesan error bahwa sesi admin tidak valid, dan meminta untuk login kembali sebelum dapat melakukan perubahan hak akses</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Reference Scenario */}
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500/20 to-pink-500/20 flex items-center justify-center">
                    <svg className="w-4 h-4 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-semibold text-white">Skenario Referensi</h3>
                  <span className="ml-auto px-2 py-1 bg-purple-500/20 text-purple-400 text-xs rounded-full">GIVEN</span>
                </div>
                
                <div className="bg-gradient-to-br from-gray-700/30 to-gray-800/30 border border-gray-600/30 rounded-xl overflow-hidden">
                  <div className="divide-y divide-gray-600/30">
                    <div className="flex">
                      <div className="w-16 px-4 py-4 bg-gradient-to-r from-green-500/10 to-green-500/5 border-r border-gray-600/30">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                          <span className="text-green-400 font-mono text-xs font-bold">GIVEN</span>
                        </div>
                      </div>
                      <div className="flex-1 px-4 py-4 text-gray-200 text-sm">
                        {testResult.referenceGiven || (
                          <span className="text-gray-500 italic">Admin mencoba mengubah hak akses pengguna, namun token otentikasi admin telah kedaluwarsa</span>
                        )}
                      </div>
                    </div>
                    <div className="flex">
                      <div className="w-16 px-4 py-4 bg-gradient-to-r from-blue-500/10 to-blue-500/5 border-r border-gray-600/30">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
                          <span className="text-blue-400 font-mono text-xs font-bold">WHEN</span>
                        </div>
                      </div>
                      <div className="flex-1 px-4 py-4 text-gray-200 text-sm">
                        {testResult.referenceWhen || (
                          <span className="text-gray-500 italic">Admin mencoba mengubah hak akses pengguna, namun token otentikasi admin telah kedaluwarsa</span>
                        )}
                      </div>
                    </div>
                    <div className="flex">
                      <div className="w-16 px-4 py-4 bg-gradient-to-r from-purple-500/10 to-purple-500/5 border-r border-gray-600/30">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 bg-purple-400 rounded-full"></div>
                          <span className="text-purple-400 font-mono text-xs font-bold">THEN</span>
                        </div>
                      </div>
                      <div className="flex-1 px-4 py-4 text-gray-200 text-sm">
                        {testResult.referenceThen || (
                          <span className="text-gray-500 italic">Admin mencoba mengubah hak akses pengguna, namun token otentikasi admin telah kedaluwarsa</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MeteorResults;
