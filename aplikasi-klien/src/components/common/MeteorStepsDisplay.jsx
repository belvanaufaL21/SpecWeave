import { useState } from 'react';

const MeteorStepsDisplay = ({ testResult, isCompact = false }) => {
  const [selectedStep, setSelectedStep] = useState(null);

  // METEOR evaluation steps - 4 main score calculation steps for user display
  const meteorSteps = [
    {
      id: 'precision',
      title: 'Perhitungan Presisi',
      icon: '🎯',
      color: 'blue',
      description: 'Akurasi teks yang dihasilkan terhadap referensi',
      content: testResult ? {
        score: testResult.precision,
        matches: testResult.detailed_breakdown?.exact_matches || 0,
        totalGenerated: testResult.detailed_breakdown?.total_generated_tokens || 0,
        explanation: 'Presisi mengukur seberapa banyak kata dalam skenario yang dihasilkan benar dan relevan dibandingkan dengan skenario referensi.',
        formula: 'Presisi = Kata yang Cocok / Total Kata yang Dihasilkan'
      } : null
    },
    {
      id: 'recall',
      title: 'Perhitungan Recall',
      icon: '🔍',
      color: 'green',
      description: 'Kelengkapan cakupan teks yang dihasilkan',
      content: testResult ? {
        score: testResult.recall,
        matches: testResult.detailed_breakdown?.exact_matches || 0,
        totalReference: testResult.detailed_breakdown?.total_reference_tokens || 0,
        explanation: 'Recall mengukur seberapa banyak kata penting dari skenario referensi yang berhasil ditangkap dalam skenario yang dihasilkan.',
        formula: 'Recall = Kata yang Cocok / Total Kata Referensi'
      } : null
    },
    {
      id: 'fmean',
      title: 'Perhitungan F-mean',
      icon: '⚖️',
      color: 'yellow',
      description: 'Rata-rata harmonik dari presisi dan recall',
      content: testResult ? {
        score: testResult.f_score,
        precision: testResult.precision,
        recall: testResult.recall,
        explanation: 'F-mean menggabungkan presisi dan recall menjadi satu metrik seimbang menggunakan rata-rata harmonik.',
        formula: 'F-mean = 2 × (Presisi × Recall) / (Presisi + Recall)'
      } : null
    },
    {
      id: 'final-meteor',
      title: 'Skor METEOR Final',
      icon: '🏆',
      color: 'purple',
      description: 'Skor akhir dengan penalti fragmentasi',
      content: testResult ? {
        score: testResult.meteor_score,
        fmean: testResult.f_score,
        penalty: testResult.fragmentation_penalty || 0,
        quality: testResult.meteor_score >= 0.7 ? 'Sangat Baik' : 
                testResult.meteor_score >= 0.5 ? 'Baik' : 
                testResult.meteor_score >= 0.3 ? 'Cukup' : 'Perlu Perbaikan',
        explanation: 'Skor METEOR final menerapkan penalti fragmentasi pada F-mean, mempertimbangkan urutan kata dan koherensi chunk.',
        formula: 'METEOR = F-mean × (1 - Penalti)'
      } : null
    }
  ];

  const getColorClasses = (color, isSelected = false) => {
    const colors = {
      purple: isSelected ? 'bg-purple-500/20 border-purple-400 shadow-purple-500/25' : 'bg-purple-500/10 border-purple-500/30 hover:border-purple-400',
      blue: isSelected ? 'bg-blue-500/20 border-blue-400 shadow-blue-500/25' : 'bg-blue-500/10 border-blue-500/30 hover:border-blue-400',
      green: isSelected ? 'bg-green-500/20 border-green-400 shadow-green-500/25' : 'bg-green-500/10 border-green-500/30 hover:border-green-400',
      yellow: isSelected ? 'bg-yellow-500/20 border-yellow-400 shadow-yellow-500/25' : 'bg-yellow-500/10 border-yellow-500/30 hover:border-yellow-400',
      indigo: isSelected ? 'bg-indigo-500/20 border-indigo-400 shadow-indigo-500/25' : 'bg-indigo-500/10 border-indigo-500/30 hover:border-indigo-400',
      pink: isSelected ? 'bg-pink-500/20 border-pink-400 shadow-pink-500/25' : 'bg-pink-500/10 border-pink-500/30 hover:border-pink-400'
    };
    return colors[color] || colors.purple;
  };

  const getTextColor = (color) => {
    const colors = {
      purple: 'text-purple-400',
      blue: 'text-blue-400',
      green: 'text-green-400',
      yellow: 'text-yellow-400',
      indigo: 'text-indigo-400',
      pink: 'text-pink-400'
    };
    return colors[color] || colors.purple;
  };

  const renderStepContent = (step) => {
    if (!step.content) return null;

    switch (step.id) {
      case 'precision':
        return (
          <div className="space-y-6">
            {/* Score Display */}
            <div className="text-center">
              <div className={`text-4xl font-bold ${getTextColor(step.color)} mb-2`}>
                {(step.content.score * 100).toFixed(1)}%
              </div>
              <div className="text-lg text-white mb-4">Skor Presisi</div>
            </div>

            {/* Calculation Details */}
            <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
              <div className="text-sm font-medium text-blue-400 mb-2">Perhitungan</div>
              <div className="grid grid-cols-2 gap-4 mb-3">
                <div className="text-center p-3 bg-white/5 rounded-lg">
                  <div className="text-xl font-bold text-green-400">{step.content.matches}</div>
                  <div className="text-xs text-gray-400">Kata yang Cocok</div>
                </div>
                <div className="text-center p-3 bg-white/5 rounded-lg">
                  <div className="text-xl font-bold text-blue-400">{step.content.totalGenerated}</div>
                  <div className="text-xs text-gray-400">Kata yang Dihasilkan</div>
                </div>
              </div>
              <div className="text-xs font-mono text-gray-300 text-center">
                {step.content.matches} ÷ {step.content.totalGenerated} = {step.content.score.toFixed(3)}
              </div>
            </div>

            {/* Explanation */}
            <div className="p-4 bg-white/5 border border-white/10 rounded-lg">
              <div className="text-sm font-medium text-white mb-2">Apa itu Presisi?</div>
              <div className="text-sm text-gray-300 leading-relaxed mb-3">
                {step.content.explanation}
              </div>
              <div className="p-3 bg-blue-500/10 rounded-lg">
                <div className="text-xs text-blue-400 font-mono">
                  {step.content.formula}
                </div>
              </div>
            </div>
          </div>
        );

      case 'recall':
        return (
          <div className="space-y-6">
            {/* Score Display */}
            <div className="text-center">
              <div className={`text-4xl font-bold ${getTextColor(step.color)} mb-2`}>
                {(step.content.score * 100).toFixed(1)}%
              </div>
              <div className="text-lg text-white mb-4">Skor Recall</div>
            </div>

            {/* Calculation Details */}
            <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-lg">
              <div className="text-sm font-medium text-green-400 mb-2">Perhitungan</div>
              <div className="grid grid-cols-2 gap-4 mb-3">
                <div className="text-center p-3 bg-white/5 rounded-lg">
                  <div className="text-xl font-bold text-green-400">{step.content.matches}</div>
                  <div className="text-xs text-gray-400">Kata yang Cocok</div>
                </div>
                <div className="text-center p-3 bg-white/5 rounded-lg">
                  <div className="text-xl font-bold text-purple-400">{step.content.totalReference}</div>
                  <div className="text-xs text-gray-400">Kata Referensi</div>
                </div>
              </div>
              <div className="text-xs font-mono text-gray-300 text-center">
                {step.content.matches} ÷ {step.content.totalReference} = {step.content.score.toFixed(3)}
              </div>
            </div>

            {/* Explanation */}
            <div className="p-4 bg-white/5 border border-white/10 rounded-lg">
              <div className="text-sm font-medium text-white mb-2">Apa itu Recall?</div>
              <div className="text-sm text-gray-300 leading-relaxed mb-3">
                {step.content.explanation}
              </div>
              <div className="p-3 bg-green-500/10 rounded-lg">
                <div className="text-xs text-green-400 font-mono">
                  {step.content.formula}
                </div>
              </div>
            </div>
          </div>
        );

      case 'fmean':
        return (
          <div className="space-y-6">
            {/* Score Display */}
            <div className="text-center">
              <div className={`text-4xl font-bold ${getTextColor(step.color)} mb-2`}>
                {(step.content.score * 100).toFixed(1)}%
              </div>
              <div className="text-lg text-white mb-4">Skor F-mean</div>
            </div>

            {/* Input Values */}
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                <div className="text-2xl font-bold text-blue-400">{(step.content.precision * 100).toFixed(1)}%</div>
                <div className="text-sm text-blue-300">Presisi</div>
              </div>
              <div className="text-center p-4 bg-green-500/10 border border-green-500/20 rounded-lg">
                <div className="text-2xl font-bold text-green-400">{(step.content.recall * 100).toFixed(1)}%</div>
                <div className="text-sm text-green-300">Recall</div>
              </div>
            </div>

            {/* Calculation */}
            <div className="p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
              <div className="text-sm font-medium text-yellow-400 mb-2">Perhitungan Rata-rata Harmonik</div>
              <div className="text-xs font-mono text-gray-300 space-y-1">
                <div>F-mean = 2 × (P × R) / (P + R)</div>
                <div>F-mean = 2 × ({step.content.precision.toFixed(3)} × {step.content.recall.toFixed(3)}) / ({step.content.precision.toFixed(3)} + {step.content.recall.toFixed(3)})</div>
                <div className="text-yellow-400 font-bold">F-mean = {step.content.score.toFixed(3)}</div>
              </div>
            </div>

            {/* Explanation */}
            <div className="p-4 bg-white/5 border border-white/10 rounded-lg">
              <div className="text-sm font-medium text-white mb-2">Mengapa F-mean?</div>
              <div className="text-sm text-gray-300 leading-relaxed">
                {step.content.explanation}
              </div>
            </div>
          </div>
        );

      case 'final-meteor':
        return (
          <div className="space-y-6">
            {/* Final Score Display */}
            <div className="text-center p-6 bg-gradient-to-r from-purple-500/20 to-pink-500/20 border border-purple-500/30 rounded-xl">
              <div className={`text-5xl font-bold ${getTextColor(step.color)} mb-2`}>
                {(step.content.score * 100).toFixed(1)}%
              </div>
              <div className="text-xl text-white mb-1">Skor METEOR Final</div>
              <div className="text-sm text-gray-400">
                Kualitas {step.content.quality}
              </div>
            </div>

            {/* Calculation Steps */}
            <div className="space-y-4">
              <div className="p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                <div className="text-sm font-medium text-yellow-400 mb-2">Langkah 1: F-mean</div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-yellow-400">{(step.content.fmean * 100).toFixed(1)}%</div>
                  <div className="text-xs text-gray-400">Skor dasar dari presisi & recall</div>
                </div>
              </div>

              <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
                <div className="text-sm font-medium text-red-400 mb-2">Langkah 2: Penalti Fragmentasi</div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-red-400">{(step.content.penalty * 100).toFixed(1)}%</div>
                  <div className="text-xs text-gray-400">Penalti untuk masalah urutan kata</div>
                </div>
              </div>

              <div className="p-4 bg-purple-500/10 border border-purple-500/20 rounded-lg">
                <div className="text-sm font-medium text-purple-400 mb-2">Langkah 3: Perhitungan Final</div>
                <div className="text-xs font-mono text-gray-300 space-y-1">
                  <div>METEOR = F-mean × (1 - Penalti)</div>
                  <div>METEOR = {step.content.fmean.toFixed(3)} × (1 - {step.content.penalty.toFixed(3)})</div>
                  <div className="text-purple-400 font-bold">METEOR = {step.content.score.toFixed(3)}</div>
                </div>
              </div>
            </div>

            {/* Explanation */}
            <div className="p-4 bg-white/5 border border-white/10 rounded-lg">
              <div className="text-sm font-medium text-white mb-2">Skor METEOR Final</div>
              <div className="text-sm text-gray-300 leading-relaxed">
                {step.content.explanation}
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  if (isCompact) {
    return (
      <div className="grid grid-cols-2 gap-2">
        {meteorSteps.map((step) => (
          <div
            key={step.id}
            className={`p-3 rounded-lg border transition-all duration-200 ${getColorClasses(step.color)}`}
          >
            <div className="text-center">
              <div className="text-lg mb-1">{step.icon}</div>
              <div className="text-xs font-medium text-white">{step.title}</div>
              {step.content && (
                <div className={`text-sm font-bold ${getTextColor(step.color)} mt-1`}>
                  {(step.content.score * 100).toFixed(1)}%
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Steps Grid */}
      <div className={`grid gap-4 transition-all duration-500 ${
        selectedStep ? 'grid-cols-1' : 'grid-cols-2 md:grid-cols-4'
      }`}>
        {meteorSteps.map((step) => {
          const isSelected = selectedStep === step.id;
          const isOtherSelected = selectedStep && selectedStep !== step.id;
          
          return (
            <div
              key={step.id}
              className={`
                relative cursor-pointer transition-all duration-500 transform
                ${isSelected ? 'scale-105 z-10' : isOtherSelected ? 'scale-95 opacity-60' : 'hover:scale-102'}
                ${isSelected ? 'col-span-full' : ''}
              `}
              onClick={() => setSelectedStep(isSelected ? null : step.id)}
            >
              <div className={`
                p-6 rounded-xl border-2 transition-all duration-300
                ${getColorClasses(step.color, isSelected)}
                ${isSelected ? 'shadow-2xl' : 'shadow-lg hover:shadow-xl'}
              `}>
                {/* Card Header */}
                <div className="flex items-center gap-3 mb-4">
                  <div className="text-2xl">{step.icon}</div>
                  <div>
                    <h3 className="text-lg font-semibold text-white">{step.title}</h3>
                    <p className="text-sm text-gray-400">{step.description}</p>
                  </div>
                  {!isSelected && (
                    <div className="ml-auto">
                      <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  )}
                </div>

                {/* Quick Preview (when not selected) */}
                {!isSelected && step.content && (
                  <div className="text-center">
                    <div className={`text-2xl font-bold ${getTextColor(step.color)}`}>
                      {(step.content.score * 100).toFixed(1)}%
                    </div>
                  </div>
                )}

                {/* Detailed Content (when selected) */}
                {isSelected && (
                  <div className="mt-6">
                    {renderStepContent(step)}
                    
                    {/* Close Button */}
                    <div className="mt-6 text-center">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedStep(null);
                        }}
                        className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors text-sm"
                      >
                        Tutup Detail
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Instructions */}
      {!selectedStep && (
        <div className="text-center text-sm text-gray-500 mt-6">
          Klik pada kartu mana pun untuk melihat langkah-langkah perhitungan skor METEOR secara detail
        </div>
      )}
    </div>
  );
};

export default MeteorStepsDisplay;