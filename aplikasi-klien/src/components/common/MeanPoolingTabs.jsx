import React from 'react';

const MeanPoolingTabs = ({ data }) => {
  const [isExpanded, setIsExpanded] = React.useState(false);

  // Jika tidak ada data, tampilkan pesan
  if (!data) {
    return (
      <div className="text-center py-8 px-4 bg-gray-900/30 rounded-xl border border-gray-700/30">
        <div className="text-4xl mb-4">📊</div>
        <h3 className="text-lg font-semibold text-white mb-2">Data Embeddings Tidak Tersedia</h3>
        <p className="text-gray-400 text-sm mb-4">
          Data embeddings untuk tahap ini tidak tersedia. Ini mungkin karena hasil test ini dibuat sebelum fitur embeddings ditambahkan.
        </p>
        <p className="text-blue-400 text-sm">
          Silakan lakukan test Sentence-BERT baru untuk melihat data embeddings yang lengkap.
        </p>
      </div>
    );
  }

  const poolingData = data;

  return (
    <div className="w-full space-y-4">
      {/* Grid 50:50 untuk u dan v */}
      <div className="grid md:grid-cols-2 gap-4">
        {Object.entries(poolingData).map(([key, sentenceData]) => (
          <div key={key} className="border border-pink-500/20 rounded-xl p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="text-sm font-semibold text-gray-300">
                {sentenceData.name}
              </div>
            </div>
            
            {/* Embedding Values */}
            <div className="space-y-2 font-mono text-xs">
              {(isExpanded ? [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12] : [1, 2, 3, 4, 5, 6]).map((dimNum) => (
                <div 
                  key={dimNum} 
                  className="flex justify-between items-center px-3 py-2 rounded bg-transparent"
                >
                  <span className="text-gray-400">dim {dimNum}</span>
                  <span className="text-white font-semibold">
                    {sentenceData.fullEmbedding[dimNum - 1].toFixed(3)}
                  </span>
                </div>
              ))}
              
              {!isExpanded && (
                <div 
                  className="flex justify-between items-center px-3 py-2 rounded bg-transparent"
                >
                  <span className="text-gray-500">...</span>
                  <span className="text-gray-500">...</span>
                </div>
              )}
              
              <div 
                className="flex justify-between items-center px-3 py-2 rounded bg-transparent"
              >
                <span className="text-gray-400">dim {sentenceData.fullEmbedding.length}</span>
                <span style={{ color: '#FF7AD0' }} className="font-semibold">
                  {sentenceData.fullEmbedding[sentenceData.fullEmbedding.length - 1].toFixed(3)}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Expand Button */}
      <div className="flex justify-center mt-4">
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center justify-center gap-2 mx-auto px-4 py-2 rounded-lg text-xs font-semibold transition-colors"
          style={{ backgroundColor: '#09090A', borderColor: 'rgba(255, 255, 255, 0.05)', borderWidth: '1px', color: 'rgba(255, 255, 255, 0.7)' }}
          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#0D0D0D'}
          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#09090A'}
        >
          <svg className={`w-4 h-4 transform transition-transform ${isExpanded ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
          {isExpanded ? 'Sembunyikan' : 'Tampilkan 6 dimensi lainnya'}
        </button>
      </div>
    </div>
  );
};

export default MeanPoolingTabs;
