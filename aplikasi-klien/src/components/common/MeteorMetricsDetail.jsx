import { useState } from 'react';

/**
 * Component untuk menampilkan detail metrik METEOR dalam proses pengujian
 * Memberikan analisis mendalam dan actionable insights untuk pengguna
 * Enhanced UX dengan progressive disclosure dan visualisasi yang lebih intuitif
 */
const MeteorMetricsDetail = ({ testResult, showExplanation = true }) => {
  if (!testResult?.detailed_metrics) {
    return (
      <div className="p-6 bg-gray-800/30 border border-gray-700/30 rounded-xl">
        <div className="text-center">
          <div className="text-4xl mb-4">📊</div>
          <h3 className="text-lg font-semibold text-white mb-2">Detail Metrik Tidak Tersedia</h3>
          <p className="text-gray-400 text-sm">
            Data detail perhitungan METEOR tidak ditemukan untuk hasil pengujian ini.
          </p>
        </div>
      </div>
    );
  }

  const { detailed_metrics } = testResult;

  // State untuk progressive disclosure
  const [activeInsight, setActiveInsight] = useState('overview');
  const [showDetailedCalculation, setShowDetailedCalculation] = useState(false);
  const [expandedMetric, setExpandedMetric] = useState(null);

  const getQualityLevel = (score) => {
    if (score >= 0.9) return { 
      label: 'Sangat Baik', 
      color: 'text-green-400', 
      bg: 'bg-green-500/10',
      border: 'border-green-500/20',
      description: 'Skenario berkualitas sangat tinggi dengan kecocokan hampir sempurna',
      icon: '🌟',
      recommendation: 'Pertahankan kualitas ini sebagai standar'
    };
    if (score >= 0.7) return { 
      label: 'Baik', 
      color: 'text-blue-400', 
      bg: 'bg-blue-500/10',
      border: 'border-blue-500/20',
      description: 'Skenario berkualitas baik dengan kecocokan yang solid',
      icon: '✅',
      recommendation: 'Tingkatkan sedikit lagi untuk mencapai level excellent'
    };
    if (score >= 0.5) return { 
      label: 'Cukup', 
      color: 'text-yellow-400', 
      bg: 'bg-yellow-500/10',
      border: 'border-yellow-500/20',
      description: 'Skenario cukup baik namun masih ada ruang perbaikan',
      icon: '⚠️',
      recommendation: 'Fokus pada peningkatan presisi dan recall'
    };
    if (score >= 0.3) return { 
      label: 'Kurang', 
      color: 'text-orange-400', 
      bg: 'bg-orange-500/10',
      border: 'border-orange-500/20',
      description: 'Skenario perlu perbaikan signifikan',
      icon: '🔄',
      recommendation: 'Revisi struktur dan konten skenario diperlukan'
    };
    return { 
      label: 'Sangat Kurang', 
      color: 'text-red-400', 
      bg: 'bg-red-500/10',
      border: 'border-red-500/20',
      description: 'Skenario memerlukan revisi menyeluruh',
      icon: '🚨',
      recommendation: 'Mulai ulang dengan pendekatan yang berbeda'
    };
  };

  const quality = getQualityLevel(testResult.score);

  // Insight tabs untuk progressive disclosure
  const insightTabs = [
    {
      id: 'overview',
      label: 'Ringkasan',
      icon: '📊',
      description: 'Gambaran umum hasil pengujian'
    },
    {
      id: 'breakdown',
      label: 'Detail Metrik',
      icon: '🔍',
      description: 'Analisis per komponen METEOR'
    },
    {
      id: 'recommendations',
      label: 'Rekomendasi',
      icon: '💡',
      description: 'Saran perbaikan berdasarkan hasil'
    },
    {
      id: 'technical',
      label: 'Teknis',
      icon: '⚙️',
      description: 'Detail perhitungan dan formula'
    }
  ];

  return (
    <div className="space-y-6">
      {/* Enhanced Main Score Display dengan Visual Indicator */}
      <div className={`p-6 rounded-xl ${quality.bg} border ${quality.border} relative overflow-hidden`}>
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-5">
          <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-white to-transparent rounded-full -translate-y-16 translate-x-16"></div>
          <div className="absolute bottom-0 left-0 w-24 h-24 bg-gradient-to-tr from-white to-transparent rounded-full translate-y-12 -translate-x-12"></div>
        </div>
        
        <div className="relative z-10">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-lg">
                <span className="text-3xl">{quality.icon}</span>
              </div>
              <div>
                <h3 className="text-2xl font-bold text-white mb-1">Skor METEOR</h3>
                <p className="text-sm text-gray-400">Evaluasi kualitas keseluruhan skenario</p>
              </div>
            </div>
            <div className="text-right">
              <div className="text-5xl font-bold text-white mb-2">
                {(testResult.score * 100).toFixed(1)}%
              </div>
              <div className={`text-xl font-semibold ${quality.color} flex items-center gap-2`}>
                <span>{quality.icon}</span>
                {quality.label}
              </div>
            </div>
          </div>
          
          {/* Quick Insight Bar */}
          <div className="bg-black border border-gray-700/30 rounded-xl p-4">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center flex-shrink-0 mt-1">
                <span className="text-sm">💡</span>
              </div>
              <div>
                <p className="text-sm text-gray-300 mb-2">
                  <span className="font-medium text-white">Interpretasi:</span> {quality.description}
                </p>
                <p className="text-sm text-blue-300">
                  <span className="font-medium">Rekomendasi:</span> {quality.recommendation}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Progressive Disclosure Tabs */}
      <div className="bg-black border border-white/10 rounded-2xl overflow-hidden">
        {/* Tab Navigation */}
        <div className="flex border-b border-white/10 bg-black">
          {insightTabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveInsight(tab.id)}
              className={`flex-1 px-4 py-4 text-sm font-medium transition-all ${
                activeInsight === tab.id
                  ? 'bg-blue-500/20 text-blue-300 border-b-2 border-blue-500'
                  : 'text-gray-400 hover:text-gray-300 hover:bg-white/5'
              }`}
            >
              <div className="flex items-center justify-center gap-2">
                <span className="text-lg">{tab.icon}</span>
                <div className="text-left">
                  <div className="font-semibold">{tab.label}</div>
                  <div className="text-xs opacity-75 hidden sm:block">{tab.description}</div>
                </div>
              </div>
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="p-6">
          {activeInsight === 'overview' && (
            <OverviewTab 
              testResult={testResult} 
              detailed_metrics={detailed_metrics} 
              quality={quality}
            />
          )}
          
          {activeInsight === 'breakdown' && (
            <BreakdownTab 
              detailed_metrics={detailed_metrics} 
              expandedMetric={expandedMetric}
              setExpandedMetric={setExpandedMetric}
            />
          )}
          
          {activeInsight === 'recommendations' && (
            <RecommendationsTab 
              testResult={testResult} 
              detailed_metrics={detailed_metrics} 
              quality={quality}
            />
          )}
          
          {activeInsight === 'technical' && (
            <TechnicalTab 
              testResult={testResult} 
              detailed_metrics={detailed_metrics}
              showDetailedCalculation={showDetailedCalculation}
              setShowDetailedCalculation={setShowDetailedCalculation}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default MeteorMetricsDetail;

// Helper Components untuk Progressive Disclosure

// Metric Card Component
const MetricCard = ({ title, value, icon, color, description, isInverted = false }) => {
  const getScoreColor = (score) => {
    if (isInverted) {
      // For penalty - lower is better
      if (score <= 0.1) return 'text-green-400';
      if (score <= 0.2) return 'text-blue-400';
      if (score <= 0.3) return 'text-yellow-400';
      return 'text-red-400';
    } else {
      // For precision, recall, f-mean - higher is better
      if (score >= 0.8) return 'text-green-400';
      if (score >= 0.6) return 'text-blue-400';
      if (score >= 0.4) return 'text-yellow-400';
      return 'text-red-400';
    }
  };

  return (
    <div className={`p-4 bg-${color}-500/10 border border-${color}-500/20 rounded-xl`}>
      <div className="flex items-center gap-2 mb-3">
        <div className={`w-8 h-8 rounded-lg bg-${color}-500/20 flex items-center justify-center`}>
          <span className="text-sm">{icon}</span>
        </div>
        <h4 className={`font-semibold text-${color}-300`}>{title}</h4>
      </div>
      <div className={`text-2xl font-bold ${getScoreColor(value)} mb-2`}>
        {(value * 100).toFixed(1)}%
      </div>
      <p className="text-xs text-gray-400 mb-3">
        {description}
      </p>
      
      {/* Progress bar */}
      <div className="w-full bg-gray-700 rounded-full h-2">
        <div 
          className={`bg-gradient-to-r from-${color}-500 to-${color}-400 h-2 rounded-full transition-all duration-1000`}
          style={{ width: `${value * 100}%` }}
        ></div>
      </div>
    </div>
  );
};

// Performance Radar Component (Simplified)
const PerformanceRadar = ({ metrics }) => {
  const radarData = [
    { label: 'Presisi', value: metrics.precision, color: 'blue' },
    { label: 'Recall', value: metrics.recall, color: 'green' },
    { label: 'F-Mean', value: metrics.f_mean, color: 'purple' },
    { label: 'Konsistensi', value: 1 - metrics.penalty, color: 'orange' }
  ];

  return (
    <div className="grid grid-cols-2 gap-4">
      {radarData.map((item, index) => (
        <div key={index} className="flex items-center gap-3">
          <div className={`w-3 h-3 rounded-full bg-${item.color}-400`}></div>
          <div className="flex-1">
            <div className="flex justify-between text-sm mb-1">
              <span className="text-gray-300">{item.label}</span>
              <span className={`text-${item.color}-400 font-medium`}>
                {(item.value * 100).toFixed(1)}%
              </span>
            </div>
            <div className="w-full bg-gray-700 rounded-full h-1.5">
              <div 
                className={`bg-${item.color}-400 h-1.5 rounded-full transition-all duration-1000`}
                style={{ width: `${item.value * 100}%` }}
              ></div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

// Quick Insights Component
const QuickInsights = ({ testResult, detailed_metrics, quality }) => {
  const insights = [];

  // Generate insights based on metrics
  if (detailed_metrics.precision > detailed_metrics.recall) {
    insights.push({
      type: 'balance',
      icon: '⚖️',
      title: 'Presisi Lebih Tinggi',
      description: 'Kata-kata yang dipilih akurat, tapi mungkin ada informasi yang terlewat',
      color: 'blue'
    });
  } else if (detailed_metrics.recall > detailed_metrics.precision) {
    insights.push({
      type: 'balance',
      icon: '📊',
      title: 'Recall Lebih Tinggi', 
      description: 'Informasi lengkap, tapi mungkin ada kata yang kurang relevan',
      color: 'green'
    });
  }

  if (detailed_metrics.penalty > 0.2) {
    insights.push({
      type: 'penalty',
      icon: '🔄',
      title: 'Urutan Perlu Diperbaiki',
      description: 'Struktur kalimat bisa disesuaikan dengan referensi',
      color: 'orange'
    });
  }

  if (testResult.score >= 0.8) {
    insights.push({
      type: 'excellent',
      icon: '🌟',
      title: 'Kualitas Excellent',
      description: 'Skenario sudah sangat baik, pertahankan standar ini',
      color: 'green'
    });
  }

  return (
    <div className="space-y-3">
      {insights.length > 0 ? insights.map((insight, index) => (
        <div key={index} className={`p-3 bg-${insight.color}-500/10 border border-${insight.color}-500/20 rounded-lg`}>
          <div className="flex items-start gap-3">
            <span className="text-lg">{insight.icon}</span>
            <div>
              <h5 className={`font-medium text-${insight.color}-300 mb-1`}>{insight.title}</h5>
              <p className="text-sm text-gray-400">{insight.description}</p>
            </div>
          </div>
        </div>
      )) : (
        <div className="p-3 bg-gray-500/10 border border-gray-500/20 rounded-lg text-center">
          <p className="text-sm text-gray-400">Tidak ada insight khusus untuk ditampilkan</p>
        </div>
      )}
    </div>
  );
};

// Overview Tab Component
const OverviewTab = ({ testResult, detailed_metrics, quality }) => {
  return (
    <div className="space-y-6">
      {/* Key Metrics Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricCard 
          title="Presisi" 
          value={detailed_metrics.precision} 
          icon="🎯" 
          color="blue"
          description="Akurasi kata"
        />
        <MetricCard 
          title="Recall" 
          value={detailed_metrics.recall} 
          icon="📊" 
          color="green"
          description="Kelengkapan info"
        />
        <MetricCard 
          title="F-Mean" 
          value={detailed_metrics.f_mean} 
          icon="⚖️" 
          color="purple"
          description="Keseimbangan"
        />
        <MetricCard 
          title="Penalti" 
          value={detailed_metrics.penalty} 
          icon="⚠️" 
          color="orange"
          description="Fragmentasi"
          isInverted={true}
        />
      </div>

      {/* Performance Radar */}
      <div className="bg-black border border-white/10 rounded-xl p-6">
        <h4 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <span>📈</span> Profil Performa
        </h4>
        <PerformanceRadar metrics={detailed_metrics} />
      </div>

      {/* Quick Insights */}
      <div className="bg-black border border-white/10 rounded-xl p-6">
        <h4 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <span>⚡</span> Insight Cepat
        </h4>
        <QuickInsights testResult={testResult} detailed_metrics={detailed_metrics} quality={quality} />
      </div>
    </div>
  );
};

// Breakdown Tab Component  
const BreakdownTab = ({ detailed_metrics, expandedMetric, setExpandedMetric }) => {
  const metrics = [
    {
      id: 'precision',
      name: 'Presisi',
      value: detailed_metrics.precision,
      icon: '🎯',
      color: 'blue',
      description: 'Mengukur akurasi kata yang dihasilkan',
      formula: 'Presisi = (Kata cocok) / (Total kata dihasilkan)',
      interpretation: 'Semakin tinggi, semakin akurat kata yang dipilih'
    },
    {
      id: 'recall', 
      name: 'Recall',
      value: detailed_metrics.recall,
      icon: '📊',
      color: 'green', 
      description: 'Mengukur kelengkapan informasi yang tercakup',
      formula: 'Recall = (Kata cocok) / (Total kata referensi)',
      interpretation: 'Semakin tinggi, semakin lengkap informasi yang diambil'
    },
    {
      id: 'f_mean',
      name: 'F-Mean',
      value: detailed_metrics.f_mean,
      icon: '⚖️',
      color: 'purple',
      description: 'Harmonic mean dari presisi dan recall',
      formula: 'F-Mean = 2 × (P × R) / (P + R)',
      interpretation: 'Keseimbangan optimal antara presisi dan recall'
    },
    {
      id: 'penalty',
      name: 'Penalti',
      value: detailed_metrics.penalty,
      icon: '⚠️',
      color: 'orange',
      description: 'Penalti fragmentasi urutan kata',
      formula: 'Penalti = 0.5 × (Chunks / Matches)³',
      interpretation: 'Semakin rendah, semakin konsisten urutan kata'
    }
  ];

  return (
    <div className="space-y-4">
      {metrics.map((metric) => (
        <MetricBreakdownCard
          key={metric.id}
          metric={metric}
          isExpanded={expandedMetric === metric.id}
          onToggle={() => setExpandedMetric(expandedMetric === metric.id ? null : metric.id)}
        />
      ))}
    </div>
  );
};

// Metric Breakdown Card Component
const MetricBreakdownCard = ({ metric, isExpanded, onToggle }) => {
  const getScoreColor = (score) => {
    if (metric.id === 'penalty') {
      // For penalty - lower is better
      if (score <= 0.1) return 'text-green-400';
      if (score <= 0.2) return 'text-blue-400';
      if (score <= 0.3) return 'text-yellow-400';
      return 'text-red-400';
    } else {
      // For others - higher is better
      if (score >= 0.8) return 'text-green-400';
      if (score >= 0.6) return 'text-blue-400';
      if (score >= 0.4) return 'text-yellow-400';
      return 'text-red-400';
    }
  };

  return (
    <div className={`bg-${metric.color}-500/10 border border-${metric.color}-500/20 rounded-xl overflow-hidden`}>
      <button
        onClick={onToggle}
        className="w-full p-4 text-left hover:bg-white/5 transition-colors"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl bg-${metric.color}-500/20 flex items-center justify-center`}>
              <span className="text-lg">{metric.icon}</span>
            </div>
            <div>
              <h4 className={`text-lg font-semibold text-${metric.color}-300`}>{metric.name}</h4>
              <p className="text-sm text-gray-400">{metric.description}</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className={`text-2xl font-bold ${getScoreColor(metric.value)}`}>
              {(metric.value * 100).toFixed(1)}%
            </div>
            <svg 
              className={`w-5 h-5 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
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
        <div className="px-4 pb-4 border-t border-white/10">
          <div className="pt-4 space-y-4">
            {/* Formula */}
            <div className={`bg-${metric.color}-500/10 border border-${metric.color}-500/20 rounded-lg p-3`}>
              <h5 className={`font-semibold text-${metric.color}-300 mb-2`}>Formula:</h5>
              <code className={`text-sm text-${metric.color}-200 font-mono`}>{metric.formula}</code>
            </div>
            
            {/* Interpretation */}
            <div className="bg-black border border-white/10 rounded-lg p-3">
              <h5 className="font-semibold text-white mb-2">Interpretasi:</h5>
              <p className="text-sm text-gray-300">{metric.interpretation}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Recommendations Tab Component
const RecommendationsTab = ({ testResult, detailed_metrics, quality }) => {
  const generateRecommendations = () => {
    const recommendations = [];
    
    // Precision recommendations
    if (detailed_metrics.precision < 0.7) {
      recommendations.push({
        type: 'precision',
        priority: 'high',
        title: 'Tingkatkan Presisi',
        description: 'Presisi saat ini rendah, menunjukkan banyak kata tidak relevan',
        actions: [
          'Hapus kata-kata yang tidak perlu atau redundan',
          'Fokus pada kata kunci yang benar-benar penting',
          'Periksa kembali relevansi setiap kata dengan konteks'
        ],
        icon: '🎯',
        color: 'blue'
      });
    }
    
    // Recall recommendations  
    if (detailed_metrics.recall < 0.7) {
      recommendations.push({
        type: 'recall',
        priority: 'high', 
        title: 'Tingkatkan Recall',
        description: 'Recall rendah menunjukkan informasi penting hilang',
        actions: [
          'Tambahkan kata kunci penting yang hilang',
          'Pastikan semua aspek referensi tercakup',
          'Periksa apakah ada informasi krusial yang terlewat'
        ],
        icon: '📊',
        color: 'green'
      });
    }
    
    // Balance recommendations
    const balance = Math.abs(detailed_metrics.precision - detailed_metrics.recall);
    if (balance > 0.2) {
      recommendations.push({
        type: 'balance',
        priority: 'medium',
        title: 'Seimbangkan Presisi dan Recall', 
        description: `${detailed_metrics.precision > detailed_metrics.recall ? 'Presisi' : 'Recall'} lebih dominan`,
        actions: [
          detailed_metrics.precision > detailed_metrics.recall 
            ? 'Tambahkan informasi penting untuk meningkatkan recall'
            : 'Kurangi kata tidak relevan untuk meningkatkan presisi',
          'Cari keseimbangan optimal antara akurasi dan kelengkapan',
          'Review ulang prioritas informasi'
        ],
        icon: '⚖️',
        color: 'purple'
      });
    }
    
    // Penalty recommendations
    if (detailed_metrics.penalty > 0.2) {
      recommendations.push({
        type: 'penalty',
        priority: 'medium',
        title: 'Kurangi Fragmentasi',
        description: 'Penalti tinggi menunjukkan urutan kata tidak konsisten',
        actions: [
          'Sesuaikan struktur kalimat dengan pola referensi',
          'Hindari memecah frasa penting menjadi bagian terpisah',
          'Pertahankan alur logis dalam penyusunan kata'
        ],
        icon: '⚠️',
        color: 'orange'
      });
    }
    
    // Overall recommendations
    if (testResult.score >= 0.8) {
      recommendations.push({
        type: 'maintain',
        priority: 'low',
        title: 'Pertahankan Kualitas',
        description: 'Skor sudah sangat baik, fokus pada konsistensi',
        actions: [
          'Gunakan skenario ini sebagai template untuk yang lain',
          'Dokumentasikan pola yang berhasil',
          'Lakukan review berkala untuk memastikan konsistensi'
        ],
        icon: '🌟',
        color: 'green'
      });
    }
    
    return recommendations;
  };

  const recommendations = generateRecommendations();

  return (
    <div className="space-y-6">
      {/* Priority Matrix */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {['high', 'medium', 'low'].map(priority => {
          const priorityRecs = recommendations.filter(r => r.priority === priority);
          if (priorityRecs.length === 0) return null;
          
          return (
            <div key={priority} className={`p-4 rounded-xl border ${
              priority === 'high' ? 'bg-red-500/10 border-red-500/20' :
              priority === 'medium' ? 'bg-yellow-500/10 border-yellow-500/20' :
              'bg-green-500/10 border-green-500/20'
            }`}>
              <h5 className={`font-semibold mb-2 ${
                priority === 'high' ? 'text-red-300' :
                priority === 'medium' ? 'text-yellow-300' :
                'text-green-300'
              }`}>
                Prioritas {priority === 'high' ? 'Tinggi' : priority === 'medium' ? 'Sedang' : 'Rendah'}
              </h5>
              <div className="text-sm text-gray-300">
                {priorityRecs.length} rekomendasi
              </div>
            </div>
          );
        })}
      </div>

      {/* Detailed Recommendations */}
      <div className="space-y-4">
        {recommendations.map((rec, index) => (
          <RecommendationCard key={index} recommendation={rec} />
        ))}
      </div>
    </div>
  );
};

// Recommendation Card Component
const RecommendationCard = ({ recommendation }) => {
  return (
    <div className={`bg-${recommendation.color}-500/10 border border-${recommendation.color}-500/20 rounded-xl p-4`}>
      <div className="flex items-start gap-3 mb-3">
        <div className={`w-10 h-10 rounded-xl bg-${recommendation.color}-500/20 flex items-center justify-center flex-shrink-0`}>
          <span className="text-lg">{recommendation.icon}</span>
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <h4 className={`font-semibold text-${recommendation.color}-300`}>{recommendation.title}</h4>
            <span className={`px-2 py-1 text-xs rounded-full ${
              recommendation.priority === 'high' ? 'bg-red-500/20 text-red-300' :
              recommendation.priority === 'medium' ? 'bg-yellow-500/20 text-yellow-300' :
              'bg-green-500/20 text-green-300'
            }`}>
              {recommendation.priority === 'high' ? 'Tinggi' : recommendation.priority === 'medium' ? 'Sedang' : 'Rendah'}
            </span>
          </div>
          <p className="text-sm text-gray-400 mb-3">{recommendation.description}</p>
          
          <div className="space-y-2">
            <h5 className="text-sm font-medium text-white">Langkah yang disarankan:</h5>
            <ul className="space-y-1">
              {recommendation.actions.map((action, index) => (
                <li key={index} className="flex items-start gap-2 text-sm text-gray-300">
                  <span className={`w-1.5 h-1.5 rounded-full bg-${recommendation.color}-400 flex-shrink-0 mt-2`}></span>
                  <span>{action}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

// Technical Tab Component
const TechnicalTab = ({ testResult, detailed_metrics, showDetailedCalculation, setShowDetailedCalculation }) => {
  return (
    <div className="space-y-6">
      {/* Formula Overview */}
      <div className="bg-black border border-white/10 rounded-xl p-6">
        <h4 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <span>🧮</span> Formula METEOR
        </h4>
        <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4 font-mono text-sm">
          <div className="text-blue-300 mb-2">METEOR = F-Mean × (1 - Penalty)</div>
          <div className="text-gray-400 text-xs">
            Dimana F-Mean = 2 × (Presisi × Recall) / (Presisi + Recall)
          </div>
        </div>
      </div>

      {/* Calculation Steps */}
      <div className="bg-black border border-white/10 rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h4 className="text-lg font-semibold text-white flex items-center gap-2">
            <span>📊</span> Langkah Perhitungan
          </h4>
          <button
            onClick={() => setShowDetailedCalculation(!showDetailedCalculation)}
            className="px-3 py-1 bg-blue-500/20 border border-blue-500/30 rounded-lg text-blue-300 text-sm hover:bg-blue-500/30 transition-colors"
          >
            {showDetailedCalculation ? 'Sembunyikan' : 'Tampilkan'} Detail
          </button>
        </div>
        
        <CalculationSteps 
          detailed_metrics={detailed_metrics} 
          finalScore={testResult.score}
          showDetailed={showDetailedCalculation}
        />
      </div>

      {/* Raw Data */}
      <div className="bg-black border border-white/10 rounded-xl p-6">
        <h4 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <span>🔢</span> Data Mentah
        </h4>
        <div className="bg-gray-800/30 border border-gray-700/30 rounded-xl p-4 font-mono text-sm">
          <pre className="text-gray-300 whitespace-pre-wrap">
            {JSON.stringify(detailed_metrics, null, 2)}
          </pre>
        </div>
      </div>
    </div>
  );
};

// Calculation Steps Component
const CalculationSteps = ({ detailed_metrics, finalScore, showDetailed }) => {
  const steps = [
    {
      name: 'Presisi',
      value: detailed_metrics.precision,
      formula: 'Kata cocok / Total kata dihasilkan'
    },
    {
      name: 'Recall', 
      value: detailed_metrics.recall,
      formula: 'Kata cocok / Total kata referensi'
    },
    {
      name: 'F-Mean',
      value: detailed_metrics.f_mean,
      formula: '2 × (P × R) / (P + R)'
    },
    {
      name: 'Penalty',
      value: detailed_metrics.penalty,
      formula: '0.5 × (Chunks / Matches)³'
    },
    {
      name: 'METEOR Score',
      value: finalScore,
      formula: 'F-Mean × (1 - Penalty)'
    }
  ];

  return (
    <div className="space-y-3">
      {steps.map((step, index) => (
        <div key={index} className="flex items-center justify-between p-3 bg-black border border-white/10 rounded-lg">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center">
              <span className="text-sm font-bold text-blue-300">{index + 1}</span>
            </div>
            <div>
              <div className="font-medium text-white">{step.name}</div>
              {showDetailed && (
                <div className="text-xs text-gray-400 font-mono">{step.formula}</div>
              )}
            </div>
          </div>
          <div className="text-lg font-bold text-blue-400">
            {(step.value * 100).toFixed(1)}%
          </div>
        </div>
      ))}
    </div>
  );
};

