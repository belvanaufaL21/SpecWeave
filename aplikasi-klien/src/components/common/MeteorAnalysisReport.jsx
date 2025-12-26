import { useState } from 'react';
import { meteorAnalysisService } from '../../services/meteorAnalysisService';

const MeteorAnalysisReport = ({ 
  groundTruthText, 
  generatedText, 
  meteorMetrics, 
  onAnalysisRequest 
}) => {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisReport, setAnalysisReport] = useState(null);

  const handleRequestAnalysis = async () => {
    if (!groundTruthText || !generatedText || !meteorMetrics) return;

    setIsAnalyzing(true);
    try {
      // Call detailed analysis service
      const response = await meteorAnalysisService.requestDetailedAnalysis(
        groundTruthText,
        generatedText,
        meteorMetrics
      );

      if (response.success) {
        // Format the analysis for display
        const analysis = response.data.analysis;
        const formattedReport = formatAnalysisForDisplay(analysis);
        setAnalysisReport(formattedReport);
      }
    } catch (error) {
      console.error('Error requesting analysis:', error);
      // Fallback to local analysis
      const localAnalysis = meteorAnalysisService.formatAnalysisReport(
        groundTruthText,
        generatedText,
        meteorMetrics
      );
      setAnalysisReport(formatLocalAnalysis(localAnalysis));
    } finally {
      setIsAnalyzing(false);
    }
  };

  const formatAnalysisForDisplay = (analysis) => {
    return `
## ${analysis.summary}

### Penjelasan Metrik:
• **Precision (${analysis.metricsExplanation.precision.value.toFixed(1)}%)**: ${analysis.metricsExplanation.precision.explanation}
• **Recall (${analysis.metricsExplanation.recall.value.toFixed(1)}%)**: ${analysis.metricsExplanation.recall.explanation}
• **F-Score (${analysis.metricsExplanation.fScore.value.toFixed(1)}%)**: ${analysis.metricsExplanation.fScore.explanation}
• **METEOR (${analysis.metricsExplanation.meteor.value.toFixed(1)}%)**: ${analysis.metricsExplanation.meteor.explanation}

### Analisis Perbedaan:
${analysis.differences.structural.length > 0 ? `**Masalah Struktural:**\n${analysis.differences.structural.map(issue => `• ${issue}`).join('\n')}\n` : ''}
${analysis.differences.missing.length > 0 ? `**Informasi yang Hilang:**\n${analysis.differences.missing.map(item => `• ${item}`).join('\n')}\n` : ''}
${analysis.differences.extra.length > 0 ? `**Informasi Tambahan:**\n${analysis.differences.extra.map(item => `• ${item}`).join('\n')}\n` : ''}

### Rekomendasi Perbaikan:
${analysis.recommendations.map((rec, index) => `${index + 1}. ${rec}`).join('\n')}

### Skenario Hasil Revisi:
\`\`\`gherkin
${analysis.revisedScenario}
\`\`\`

**Penilaian Keseluruhan:** ${analysis.overallAssessment.level} - ${analysis.overallAssessment.message}
    `;
  };

  const formatLocalAnalysis = (analysis) => {
    return `
## ${analysis.summary}

### Insight Kualitas:
${analysis.insight.message}

### Rekomendasi:
${analysis.insight.recommendations.map((rec, index) => `${index + 1}. ${rec}`).join('\n')}

### Interpretasi Metrik:
• **Precision**: ${analysis.metrics.precision.interpretation}
• **Recall**: ${analysis.metrics.recall.interpretation}
• **F-Score**: ${analysis.metrics.fScore.interpretation}

${analysis.structural.structuralIssues.length > 0 ? `### Masalah Struktural:
${analysis.structural.structuralIssues.map(issue => `• ${issue}`).join('\n')}` : ''}
    `;
  };

  const getScoreColor = (score) => {
    if (score >= 0.8) return 'text-green-400';
    if (score >= 0.6) return 'text-yellow-400';
    return 'text-red-400';
  };

  const getScoreLabel = (score) => {
    if (score >= 0.8) return 'Sangat Baik';
    if (score >= 0.6) return 'Cukup Baik';
    return 'Perlu Perbaikan';
  };

  if (!meteorMetrics) return null;

  return (
    <div className="bg-white/5 border border-white/10 rounded-lg p-4 mt-4">
      <div className="flex items-center justify-between mb-4">
        <h4 className="text-lg font-semibold text-white flex items-center gap-2">
          <svg className="w-5 h-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 002 2h2a2 2 0 002-2z" />
          </svg>
          Analisis Kualitas METEOR
        </h4>
        
        <button
          onClick={handleRequestAnalysis}
          disabled={isAnalyzing || !groundTruthText || !generatedText}
          className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
        >
          {isAnalyzing ? 'Menganalisis...' : 'Analisis Detail'}
        </button>
      </div>

      {/* Quick Metrics Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        <div className="bg-white/5 rounded-lg p-3 text-center">
          <div className="text-xs text-gray-400 mb-1">Precision</div>
          <div className={`text-sm font-bold ${getScoreColor(meteorMetrics.precision || 0)}`}>
            {((meteorMetrics.precision || 0) * 100).toFixed(1)}%
          </div>
        </div>
        <div className="bg-white/5 rounded-lg p-3 text-center">
          <div className="text-xs text-gray-400 mb-1">Recall</div>
          <div className={`text-sm font-bold ${getScoreColor(meteorMetrics.recall || 0)}`}>
            {((meteorMetrics.recall || 0) * 100).toFixed(1)}%
          </div>
        </div>
        <div className="bg-white/5 rounded-lg p-3 text-center">
          <div className="text-xs text-gray-400 mb-1">F-Score</div>
          <div className={`text-sm font-bold ${getScoreColor(meteorMetrics.fScore || 0)}`}>
            {((meteorMetrics.fScore || 0) * 100).toFixed(1)}%
          </div>
        </div>
        <div className="bg-white/5 rounded-lg p-3 text-center">
          <div className="text-xs text-gray-400 mb-1">METEOR</div>
          <div className={`text-sm font-bold ${getScoreColor(meteorMetrics.meteorScore || 0)}`}>
            {((meteorMetrics.meteorScore || 0) * 100).toFixed(1)}%
          </div>
        </div>
      </div>

      {/* Overall Assessment */}
      <div className="mb-4">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-sm font-medium text-gray-300">Penilaian Keseluruhan:</span>
          <span className={`text-sm font-bold ${getScoreColor(meteorMetrics.meteorScore || 0)}`}>
            {getScoreLabel(meteorMetrics.meteorScore || 0)}
          </span>
        </div>
        <div className="w-full bg-gray-700 rounded-full h-2">
          <div 
            className={`h-2 rounded-full transition-all duration-300 ${
              (meteorMetrics.meteorScore || 0) >= 0.8 ? 'bg-green-500' :
              (meteorMetrics.meteorScore || 0) >= 0.6 ? 'bg-yellow-500' : 'bg-red-500'
            }`}
            style={{ width: `${((meteorMetrics.meteorScore || 0) * 100)}%` }}
          ></div>
        </div>
      </div>

      {/* Comparison Texts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <div>
          <h5 className="text-sm font-semibold text-green-300 mb-2 flex items-center gap-1">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Ground Truth (Referensi)
          </h5>
          <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-3 max-h-32 overflow-y-auto">
            <pre className="text-green-200 text-xs font-mono whitespace-pre-wrap">
              {groundTruthText || 'Tidak ada referensi ground truth'}
            </pre>
          </div>
        </div>
        
        <div>
          <h5 className="text-sm font-semibold text-blue-300 mb-2 flex items-center gap-1">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            Hasil Sistem (Generated)
          </h5>
          <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3 max-h-32 overflow-y-auto">
            <pre className="text-blue-200 text-xs font-mono whitespace-pre-wrap">
              {generatedText || 'Tidak ada teks yang dihasilkan sistem'}
            </pre>
          </div>
        </div>
      </div>

      {/* Analysis Report */}
      {analysisReport && (
        <div className="border-t border-white/10 pt-4">
          <h5 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
            <svg className="w-4 h-4 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Laporan Analisis Detail
          </h5>
          <div className="bg-orange-500/10 border border-orange-500/20 rounded-lg p-4">
            <div className="text-orange-100 text-sm whitespace-pre-wrap">
              {analysisReport}
            </div>
          </div>
        </div>
      )}

      {/* Help Text */}
      <div className="text-xs text-gray-500 mt-4 bg-white/5 rounded p-3">
        <p className="mb-2">
          <strong>Precision:</strong> Seberapa akurat sistem dalam menghasilkan langkah-langkah yang relevan.
        </p>
        <p className="mb-2">
          <strong>Recall:</strong> Seberapa lengkap sistem dalam mencakup semua langkah penting dari referensi.
        </p>
        <p className="mb-2">
          <strong>F-Score:</strong> Keseimbangan antara precision dan recall.
        </p>
        <p>
          <strong>METEOR:</strong> Skor keseluruhan yang mengukur kemiripan semantik dengan referensi ground truth.
        </p>
      </div>
    </div>
  );
};

export default MeteorAnalysisReport;