import React from 'react';

const CosineSimilarityTabs = ({ data, actualScore }) => {
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
        {actualScore !== undefined && actualScore !== null && (
          <div className="mt-6 pt-6 border-t border-gray-700/30">
            <div className="text-xs text-gray-400 mb-2">Skor Cosine Similarity</div>
            <div className="text-4xl font-bold" style={{ color: '#FF7AD0' }}>
              {actualScore.toFixed(5)}
            </div>
          </div>
        )}
      </div>
    );
  }

  // Hitung cosine similarity dari data yang diterima
  const calculateCosineSimilarity = () => {
    if (!data || !data.sentence1 || !data.sentence2) {
      return null;
    }

    const u = data.sentence1.fullEmbedding;
    const v = data.sentence2.fullEmbedding;

    // Hitung dot product dan norms
    let dotProduct = 0;
    let normU = 0;
    let normV = 0;

    const componentProducts = [];

    for (let i = 0; i < u.length; i++) {
      const product = u[i] * v[i];
      componentProducts.push({
        dim: i + 1,
        uValue: u[i],
        vValue: v[i],
        product: product
      });
      dotProduct += product;
      normU += u[i] * u[i];
      normV += v[i] * v[i];
    }

    normU = Math.sqrt(normU);
    normV = Math.sqrt(normV);

    // Gunakan actualScore jika tersedia, jika tidak hitung dari embedding
    const cosineSim = actualScore !== undefined && actualScore !== null 
      ? actualScore 
      : dotProduct / (normU * normV);

    return {
      componentProducts,
      dotProduct,
      normU,
      normV,
      cosineSim
    };
  };

  const result = calculateCosineSimilarity();

  const { componentProducts, dotProduct, normU, normV, cosineSim } = result;

  // Tampilkan 8 dimensi pertama atau semua jika expanded
  const displayedProducts = isExpanded 
    ? componentProducts 
    : componentProducts.slice(0, 8);

  return (
    <div className="w-full space-y-6">
      {/* Process - Step 1 */}
      <div className="border border-pink-500/20 rounded-xl p-5">
        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full font-mono text-xs">
            <thead>
              <tr className="border-b" style={{ borderColor: 'rgba(255, 255, 255, 0.05)' }}>
                <th className="text-left py-2 px-3 text-gray-400 font-normal">dim</th>
                <th className="text-right py-2 px-3 text-gray-400 font-normal">u</th>
                <th className="text-right py-2 px-3 text-gray-400 font-normal">v</th>
                <th className="text-right py-2 px-3 text-gray-400 font-normal">u × v</th>
                <th className="text-right py-2 px-3 text-gray-400 font-normal">u²</th>
                <th className="text-right py-2 px-3 text-gray-400 font-normal">v²</th>
              </tr>
            </thead>
            <tbody>
              {displayedProducts.map((item) => (
                <tr key={item.dim} className="border-b" style={{ borderColor: 'rgba(255, 255, 255, 0.05)' }}>
                  <td className="py-2 px-3 text-gray-400">{item.dim}</td>
                  <td className="text-right py-2 px-3 text-white">{item.uValue.toFixed(3)}</td>
                  <td className="text-right py-2 px-3 text-white">{item.vValue.toFixed(3)}</td>
                  <td className="text-right py-2 px-3 text-white">{item.product.toFixed(5)}</td>
                  <td className="text-right py-2 px-3 text-white">{(item.uValue * item.uValue).toFixed(5)}</td>
                  <td className="text-right py-2 px-3 text-white">{(item.vValue * item.vValue).toFixed(5)}</td>
                </tr>
              ))}
              {!isExpanded && (
                <tr className="border-b" style={{ borderColor: 'rgba(255, 255, 255, 0.05)' }}>
                  <td className="py-2 px-3 text-gray-600 text-center">⋮</td>
                  <td className="text-center py-2 px-3 text-gray-600"></td>
                  <td className="text-center py-2 px-3 text-gray-600"></td>
                  <td className="text-center py-2 px-3 text-gray-600"></td>
                  <td className="text-center py-2 px-3 text-gray-600"></td>
                  <td className="text-center py-2 px-3 text-gray-600">⋮</td>
                </tr>
              )}
              <tr className="border-t-2" style={{ borderColor: 'rgba(255, 255, 255, 0.05)' }}>
                <td className="py-2 px-3 font-semibold text-white">Σ (1–384)</td>
                <td className="text-right py-2 px-3"></td>
                <td className="text-right py-2 px-3"></td>
                <td className="text-right py-2 px-3 font-semibold text-white">{dotProduct.toFixed(3)}</td>
                <td className="text-right py-2 px-3 font-semibold text-white">{(normU * normU).toFixed(3)}</td>
                <td className="text-right py-2 px-3 font-semibold text-white">{(normV * normV).toFixed(3)}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Expand/Collapse Button */}
        <div className="flex justify-center mt-4">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-colors"
            style={{ 
              backgroundColor: '#09090A', 
              borderColor: 'rgba(255, 255, 255, 0.05)', 
              borderWidth: '1px', 
              color: 'rgba(255, 255, 255, 0.7)' 
            }}
          >
            <svg className={`w-4 h-4 transform transition-transform ${isExpanded ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
            {isExpanded ? 'Sembunyikan' : 'Tampilkan semua 384 dimensi'}
          </button>
        </div>
      </div>

      {/* Score Display */}
      <div className="text-center mb-6">
        <div className="text-xs text-gray-400 mb-2">CosSim(u, v)</div>
        <div className="text-6xl font-bold mb-4" style={{ color: '#FF7AD0' }}>
          {cosineSim.toFixed(5)}
        </div>
        
        {/* Scale Labels - Top */}
        <div className="flex justify-between text-xs text-gray-500 mb-1">
          <span>-1 (berlawanan)</span>
          <span></span>
          <span>1 (identik)</span>
        </div>
        
        {/* Progress Bar */}
        <div className="relative w-full h-2 rounded-full overflow-visible mb-1" style={{ backgroundColor: '#0D0D0D' }}>
          {/* Progress fill */}
          {cosineSim >= 0 ? (
            // Positive values: fill from center to right
            <div 
              className="absolute top-0 h-full rounded-full transition-all duration-500"
              style={{ 
                left: '50%',
                width: `${cosineSim * 50}%`,
                backgroundColor: '#FF7AD0'
              }}
            />
          ) : (
            // Negative values: fill from center to left
            <div 
              className="absolute top-0 h-full rounded-full transition-all duration-500"
              style={{ 
                right: '50%',
                width: `${Math.abs(cosineSim) * 50}%`,
                backgroundColor: '#FF7AD0'
              }}
            />
          )}
          
          {/* Center marker at 0 */}
          <div 
            className="absolute top-1/2 left-1/2 w-3 h-3 rounded-full border-2 transform -translate-x-1/2 -translate-y-1/2"
            style={{ 
              backgroundColor: '#0D0D0D',
              borderColor: '#FF7AD0'
            }}
          ></div>
        </div>

        {/* Scale Label - Bottom Center */}
        <div className="text-center text-xs text-gray-500 mb-6">
          <span>0 (ortogonal)</span>
        </div>
      </div>

      {/* Category Legend */}
      <div className="flex items-center justify-center gap-6 text-xs">
        <span className="text-gray-400">0.0–0.5 &gt; kemiripan rendah</span>
        <span className="text-gray-400">0.5–0.8 &gt; kemiripan sedang</span>
        <span className="text-gray-400">0.8–1.0 &gt; kemiripan tinggi</span>
      </div>
    </div>
  );
};

export default CosineSimilarityTabs;
