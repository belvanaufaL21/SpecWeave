import React from 'react';

// Component for FFN + Residual + LayerNorm Analysis with Tabs
const FFNResidualAnalysis = ({ generatedText, referenceText }) => {
  const [activeTab, setActiveTab] = React.useState('4a');
  const [expandedResidual, setExpandedResidual] = React.useState(false);
  const [expandedFFN, setExpandedFFN] = React.useState(false);
  const [expandedOutput, setExpandedOutput] = React.useState(false);

  // Process real data from props
  const genTokens = generatedText ? generatedText.split(' ').filter(t => t.length > 0) : ['sistem', 'mem', '##valid', '##asi', 'kredensial'];
  
  // Generate embedding for each token (simulated but consistent based on actual token)
  const generateEmbedding = (token, position, seed) => {
    const hash = token.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const combinedSeed = hash + position + seed;
    const values = [];
    for (let i = 0; i < 384; i++) {
      values.push(((combinedSeed * (13 + i * 7)) % 1000) / 1000 - 0.5);
    }
    return values;
  };

  // Data untuk Proses Tahap 4a (Residual + LayerNorm) - using real tokens
  const residualDataFull = [];
  genTokens.forEach((token, idx) => {
    residualDataFull.push({
      token: token,
      operation: 'h\' + h³',
      values: generateEmbedding(token, idx, 1000)
    });
    residualDataFull.push({
      token: token,
      operation: 'LayerNorm →',
      values: generateEmbedding(token, idx, 2000)
    });
  });

  // Data untuk Proses Tahap 4b (FFN) - using first real token
  const firstToken = genTokens[0] || 'sistem';
  const ffnInputFull = generateEmbedding(firstToken, 0, 3000);
  const ffnOutputFull = generateEmbedding(firstToken, 0, 4000);
  
  const ffnInputData = [
    { label: 'dim 1', value: ffnInputFull[0] },
    { label: 'dim 2', value: ffnInputFull[1] },
    { label: 'dim 3', value: ffnInputFull[2] },
    { label: '...', value: null },
    { label: 'dim 384', value: ffnInputFull[383] }
  ];

  const ffnOutputData = [
    { label: 'dim 1', value: ffnOutputFull[0] },
    { label: 'dim 2', value: ffnOutputFull[1] },
    { label: 'dim 3', value: ffnOutputFull[2] },
    { label: '...', value: null },
    { label: 'dim 384', value: ffnOutputFull[383] }
  ];

  // Data untuk Output Tahap 4 (Hidden state final) - using real tokens
  const outputTahap4Data = genTokens.map((token, idx) => ({
    token: token,
    values: generateEmbedding(token, idx, 5000).slice(0, 6)
  }));

  return (
    <>
      {/* Tab Navigation */}
      <div className="grid grid-cols-3 gap-2 mb-4">
        <button
          onClick={() => setActiveTab('4a')}
          className={`px-4 py-2 text-sm font-medium rounded transition-all ${
            activeTab === '4a'
              ? 'bg-[#160D14] border border-[#44273D] text-[#FF7AD0]'
              : 'bg-[#09090A] border border-white/5 text-white/30 hover:text-white/50'
          }`}
        >
          Residual connection + LayerNorm setelah attention
        </button>
        <button
          onClick={() => setActiveTab('4b')}
          className={`px-4 py-2 text-sm font-medium rounded transition-all ${
            activeTab === '4b'
              ? 'bg-[#160D14] border border-[#44273D] text-[#FF7AD0]'
              : 'bg-[#09090A] border border-white/5 text-white/30 hover:text-white/50'
          }`}
        >
          Feed-Forward Network (dua linear layer + GELU)
        </button>
        <button
          onClick={() => setActiveTab('4c')}
          className={`px-4 py-2 text-sm font-medium rounded transition-all ${
            activeTab === '4c'
              ? 'bg-[#160D14] border border-[#44273D] text-[#FF7AD0]'
              : 'bg-[#09090A] border border-white/5 text-white/30 hover:text-white/50'
          }`}
        >
          Residual connection + LayerNorm setelah FFN
        </button>
      </div>

      {/* Formula Display */}
      <div className="mb-4 p-4 bg-black rounded-lg">
        <div className="text-xs font-semibold text-white mb-2 tracking-wide">FORMULA:</div>
        <div className="text-sm font-mono text-white">
          {activeTab === '4a' && "h'ˡ = LayerNorm( hˡ⁻¹ + MultiHead(hˡ⁻¹) )"}
          {activeTab === '4b' && 'FFN(x) = GELU( x · W₁ + b₁ ) · W₂ + b₂'}
          {activeTab === '4c' && "hˡ = LayerNorm( h'ˡ + FFN(h'ˡ) )"}
        </div>
      </div>

      {/* Tab 4a Content - Residual + LayerNorm setelah attention */}
      {activeTab === '4a' && (
        <div className="space-y-4">
          {/* Residual Process */}
          <div className="bg-transparent border border-[#44273D] rounded-lg p-4">
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-white/5">
                    <th className="text-left py-2 px-2 text-white">token</th>
                    <th className="text-left py-2 px-2 text-white">operasi</th>
                    <th className="text-right py-2 px-2 text-white">dim 1</th>
                    <th className="text-right py-2 px-2 text-white">dim 2</th>
                    <th className="text-right py-2 px-2 text-white">dim 3</th>
                    <th className="text-right py-2 px-2 text-white">dim 4</th>
                    <th className="text-center py-2 px-2 text-white">...</th>
                  </tr>
                </thead>
                <tbody>
                  {(expandedResidual ? residualDataFull : residualDataFull.slice(0, 4)).map((row, rowIdx) => (
                    <tr key={rowIdx} className="border-b border-white/5">
                      <td className="py-2 px-2 font-mono text-white/50">{row.token}</td>
                      <td className="py-2 px-2 font-mono text-white/50">{row.operation}</td>
                      {row.values.slice(0, 4).map((val, colIdx) => (
                        <td key={colIdx} className="py-2 px-2 text-right font-mono text-[#FF7AD0]">
                          {val.toFixed(3)}
                        </td>
                      ))}
                      <td className="py-2 px-2 text-center text-gray-500">...</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="text-xs text-gray-400 mt-3">
              Residual (h³ + h³) mencegah model "melupakan" representasi awal. LayerNorm menyesuaikan skala sehingga mean ≈ 0 dan std ≈ 1 per token — menstabilkan training.
            </div>
          </div>

          {/* Expand Button */}
          <div className="flex justify-center">
            <button
              onClick={() => setExpandedResidual(!expandedResidual)}
              className="flex items-center justify-center gap-2 mx-auto px-4 py-2 rounded-lg text-xs font-semibold transition-colors"
              style={{ backgroundColor: '#09090A', borderColor: 'rgba(255, 255, 255, 0.05)', borderWidth: '1px', color: 'rgba(255, 255, 255, 0.7)' }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#0d0d0d'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#09090A'}
            >
              <svg className={`w-4 h-4 transform transition-transform ${expandedResidual ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
              {expandedResidual ? 'Sembunyikan' : `Tampilkan ${residualDataFull.length - 4} baris lainnya`}
            </button>
          </div>
        </div>
      )}

      {/* Tab 4b Content - Feed-Forward Network */}
      {activeTab === '4b' && (
        <div className="space-y-4">
          {/* Grid 50:50 untuk Input dan Output FFN */}
          <div className="grid grid-cols-2 gap-4">
            {/* Input FFN */}
            <div className="bg-black border border-[#2C1A43] rounded-lg p-3">
              <div className="text-xs font-semibold text-[#C27AFF] mb-3">SETELAH LAYERNORM (384 DIM) — "{firstToken.toUpperCase()}"</div>
              <div className="space-y-2 font-mono text-xs">
                {(expandedFFN ? ffnInputFull : ffnInputFull.slice(0, 5)).map((val, idx) => (
                  <div key={idx} className="flex justify-between">
                    <span className="text-white/50">dim {idx + 1}</span>
                    <span className="text-[#C27AFF]">{val.toFixed(3)}</span>
                  </div>
                ))}
                {!expandedFFN && (
                  <>
                    <div className="flex justify-between">
                      <span className="text-white/50">...</span>
                      <span className="text-[#C27AFF]">↓</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-white/50">dim 384</span>
                      <span className="text-[#C27AFF]">{ffnInputFull[383].toFixed(3)}</span>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Output FFN */}
            <div className="bg-black border border-[#44273D] rounded-lg p-3">
              <div className="text-xs font-semibold text-[#FF7AD0] mb-3">OUTPUT FFN (384 DIM) — "{firstToken.toUpperCase()}"</div>
              <div className="space-y-2 font-mono text-xs">
                {(expandedFFN ? ffnOutputFull : ffnOutputFull.slice(0, 5)).map((val, idx) => (
                  <div key={idx} className="flex justify-between">
                    <span className="text-white/50">dim {idx + 1}</span>
                    <span className="text-[#FF7AD0]">{val.toFixed(3)}</span>
                  </div>
                ))}
                {!expandedFFN && (
                  <>
                    <div className="flex justify-between">
                      <span className="text-white/50">...</span>
                      <span className="text-[#FF7AD0]">↓</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-white/50">dim 384</span>
                      <span className="text-[#FF7AD0]">{ffnOutputFull[383].toFixed(3)}</span>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Expand Button */}
          <div className="flex justify-center">
            <button
              onClick={() => setExpandedFFN(!expandedFFN)}
              className="flex items-center justify-center gap-2 mx-auto px-4 py-2 rounded-lg text-xs font-semibold transition-colors"
              style={{ backgroundColor: '#09090A', borderColor: 'rgba(255, 255, 255, 0.05)', borderWidth: '1px', color: 'rgba(255, 255, 255, 0.7)' }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#0d0d0d'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#09090A'}
            >
              <svg className={`w-4 h-4 transform transition-transform ${expandedFFN ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
              {expandedFFN ? 'Sembunyikan' : `Tampilkan ${ffnInputFull.length - 6} dimensi lainnya`}
            </button>
          </div>
        </div>
      )}

      {/* Tab 4c Content - Output Tahap 4 */}
      {activeTab === '4c' && (
        <div className="space-y-4">
          {/* Output Table */}
          <div className="bg-transparent border border-[#44273D] rounded-lg p-4">
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-white/5">
                    <th className="text-left py-2 px-2 text-white">token</th>
                    <th className="text-right py-2 px-2 text-white">dim 1</th>
                    <th className="text-right py-2 px-2 text-white">dim 2</th>
                    <th className="text-right py-2 px-2 text-white">dim 3</th>
                    <th className="text-right py-2 px-2 text-white">dim 4</th>
                    <th className="text-right py-2 px-2 text-white">dim 5</th>
                    <th className="text-right py-2 px-2 text-white">dim 6</th>
                    <th className="text-center py-2 px-2 text-white">...</th>
                  </tr>
                </thead>
                <tbody>
                  {(expandedOutput ? outputTahap4Data : outputTahap4Data.slice(0, 5)).map((row, rowIdx) => (
                    <tr key={rowIdx} className="border-b border-white/5">
                      <td className="py-2 px-2 font-mono text-white/50">{row.token}</td>
                      {row.values.map((val, colIdx) => (
                        <td key={colIdx} className="py-2 px-2 text-right font-mono text-white/70">
                          {val.toFixed(3)}
                        </td>
                      ))}
                      <td className="py-2 px-2 text-center text-gray-500">...</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Expand Button */}
          {outputTahap4Data.length > 5 && (
            <div className="flex justify-center">
              <button
                onClick={() => setExpandedOutput(!expandedOutput)}
                className="flex items-center justify-center gap-2 mx-auto px-4 py-2 rounded-lg text-xs font-semibold transition-colors"
                style={{ backgroundColor: '#09090A', borderColor: 'rgba(255, 255, 255, 0.05)', borderWidth: '1px', color: 'rgba(255, 255, 255, 0.7)' }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#0d0d0d'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#09090A'}
              >
                <svg className={`w-4 h-4 transform transition-transform ${expandedOutput ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
                {expandedOutput ? 'Sembunyikan' : `Tampilkan ${outputTahap4Data.length - 5} token lainnya`}
              </button>
            </div>
          )}
        </div>
      )}
    </>
  );
};

export default FFNResidualAnalysis;
