import React from 'react';

// Component for Self-Attention Analysis with Tabs (Tahap 3)
const SelfAttentionAnalysis = ({ generatedText, referenceText }) => {
  const [activeTab, setActiveTab] = React.useState('3a');
  const [expandedQKV, setExpandedQKV] = React.useState(false);
  const [expandedAttention, setExpandedAttention] = React.useState(false);
  const [expandedMultiHead, setExpandedMultiHead] = React.useState(false);

  // Helper function to determine color based on value magnitude
  const getValueColor = (value, allValues) => {
    const absValue = Math.abs(value);
    const absValues = allValues.map(v => Math.abs(v));
    const maxValue = Math.max(...absValues);
    const threshold = maxValue * 0.7; // 70% of max is considered high
    
    if (absValue >= maxValue * 0.9) {
      return 'text-[#FF7AD0] font-bold'; // Highest values (90%+ of max) - pink
    } else if (absValue >= threshold) {
      return 'text-[#C27AFF] font-bold'; // High values (70-90% of max) - purple
    }
    return 'text-white/50'; // Normal values - white 50% opacity
  };

  // Full 32-dimensional data
  const fullQueryData = [0.241, -0.153, 0.389, 0.074, -0.218, 0.467, 0.312, -0.187, 0.445, 0.091, -0.263, 0.528, 0.198, -0.124, 0.312, 0.056, -0.187, 0.401, 0.287, -0.171, 0.423, 0.083, -0.241, 0.512, 0.156, -0.098, 0.234, 0.067, -0.145, 0.389, 0.211, -0.134];
  const fullKeyData = [0.198, -0.124, 0.312, 0.056, -0.187, 0.401, 0.241, -0.153, 0.389, 0.074, -0.218, 0.467, 0.156, -0.098, 0.234, 0.067, -0.145, 0.389, 0.211, -0.134, 0.298, 0.045, -0.167, 0.378, 0.189, -0.112, 0.267, 0.058, -0.198, 0.423, 0.178, -0.089];
  const fullValueData = [0.287, -0.171, 0.423, 0.083, -0.241, 0.512, 0.198, -0.124, 0.312, 0.056, -0.187, 0.401, 0.241, -0.153, 0.389, 0.074, -0.218, 0.467, 0.223, -0.145, 0.356, 0.062, -0.203, 0.489, 0.167, -0.101, 0.278, 0.051, -0.176, 0.412, 0.192, -0.118];

  // Process real data from props
  const genTokens = generatedText ? generatedText.split(' ').filter(t => t.length > 0) : ['sistem', 'mem', '##valid', '##asi', 'kredensial'];
  
  // Generate embedding for each token (simulated but consistent)
  const generateEmbedding = (token, position) => {
    const hash = token.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const seed = hash + position;
    const values = [];
    for (let i = 0; i < 6; i++) {
      values.push(((seed * (13 + i * 7)) % 1000) / 1000 - 0.5);
    }
    return values;
  };

  // Data for tab 3b - attention output with real tokens
  const attentionOutputData = [
    { token: '[CLS]', values: generateEmbedding('[CLS]', 0) },
    ...genTokens.map((token, idx) => ({
      token: token,
      values: generateEmbedding(token, idx + 1)
    })),
    { token: '[SEP]', values: generateEmbedding('[SEP]', genTokens.length + 1) }
  ];

  // Get all values for color calculation
  const allAttentionValues = attentionOutputData.flatMap(row => row.values);

  // Data for tab 3c - use first token's embedding as example
  const inputOutput = {
    input: Array.from({length: 32}, (_, i) => {
      const seed = 12345 + i;
      return ((seed * 13) % 1000) / 1000 - 0.5;
    }),
    output: Array.from({length: 32}, (_, i) => {
      const seed = 54321 + i;
      return ((seed * 17) % 1000) / 1000 - 0.5;
    })
  };

  return (
    <>
      {/* Tab Navigation */}
      <div className="grid grid-cols-3 gap-2 mb-4">
        <button
          onClick={() => setActiveTab('3a')}
          className={`px-4 py-2 text-sm font-medium rounded transition-all ${
            activeTab === '3a'
              ? 'bg-[#160D14] border border-[#44273D] text-[#FF7AD0]'
              : 'bg-[#09090A] border border-white/5 text-white/30 hover:text-white/50'
          }`}
        >
          3a — Proyeksi Q, K, V
        </button>
        <button
          onClick={() => setActiveTab('3b')}
          className={`px-4 py-2 text-sm font-medium rounded transition-all ${
            activeTab === '3b'
              ? 'bg-[#160D14] border border-[#44273D] text-[#FF7AD0]'
              : 'bg-[#09090A] border border-white/5 text-white/30 hover:text-white/50'
          }`}
        >
          3b — Scaled Dot-Product
        </button>
        <button
          onClick={() => setActiveTab('3c')}
          className={`px-4 py-2 text-sm font-medium rounded transition-all ${
            activeTab === '3c'
              ? 'bg-[#160D14] border border-[#44273D] text-[#FF7AD0]'
              : 'bg-[#09090A] border border-white/5 text-white/30 hover:text-white/50'
          }`}
        >
          3c — Multi-Head Output
        </button>
      </div>

      {/* Formula Display */}
      <div className="mb-4 p-4 bg-black rounded-lg">
        <div className="text-xs font-semibold text-white mb-2 tracking-wide">FORMULA:</div>
        <div className="text-base font-mono text-white">
          {activeTab === '3a' && 'Q = H · Wᴼ,  K = H · Wᴷ,  V = H · Wᵛ'}
          {activeTab === '3b' && 'Attention(Q,K,V) = softmax(QKᵀ/√d_k) · V'}
          {activeTab === '3c' && 'MultiHead(Q,K,V) = Concat(head₁, …, headₕ) · Wᴼ'}
        </div>
      </div>

      {/* Tab 3a Content */}
      {activeTab === '3a' && (
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-3">
            {/* Query */}
            <div className="bg-black border border-[#44273D] rounded-lg p-3">
              <div className="text-xs font-semibold text-[#FF7AD0] mb-2">QUERY (Q)</div>
              <div className="space-y-3 font-mono text-xs">
                {(expandedQKV ? fullQueryData : fullQueryData.slice(0, 6)).map((val, idx) => (
                  <div key={idx} className="flex justify-between">
                    <span className="text-[#FFFFFF]">q<sub>{idx + 1}</sub></span>
                    <span className="text-[#FF7AD0]">{val.toFixed(3)}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Key */}
            <div className="bg-black border border-[#2C1A43] rounded-lg p-3">
              <div className="text-xs font-semibold text-[#C27AFF] mb-2">KEY (K)</div>
              <div className="space-y-3 font-mono text-xs">
                {(expandedQKV ? fullKeyData : fullKeyData.slice(0, 6)).map((val, idx) => (
                  <div key={idx} className="flex justify-between">
                    <span className="text-[#FFFFFF]">k<sub>{idx + 1}</sub></span>
                    <span className="text-[#C27AFF]">{val.toFixed(3)}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Value */}
            <div className="bg-black border border-[#44273D] rounded-lg p-3">
              <div className="text-xs font-semibold text-[#FF7AD0] mb-2">VALUE (V)</div>
              <div className="space-y-3 font-mono text-xs">
                {(expandedQKV ? fullValueData : fullValueData.slice(0, 6)).map((val, idx) => (
                  <div key={idx} className="flex justify-between">
                    <span className="text-[#FFFFFF]">v<sub>{idx + 1}</sub></span>
                    <span className="text-[#FF7AD0]">{val.toFixed(3)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Single Expand Button */}
          <div className="flex justify-center">
            <button
              onClick={() => setExpandedQKV(!expandedQKV)}
              className="flex items-center justify-center gap-2 mx-auto px-4 py-2 rounded-lg text-xs font-semibold transition-colors"
              style={{ backgroundColor: '#09090A', borderColor: 'rgba(255, 255, 255, 0.05)', borderWidth: '1px', color: 'rgba(255, 255, 255, 0.7)' }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#0d0d0d'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#09090A'}
            >
              <svg className={`w-4 h-4 transform transition-transform ${expandedQKV ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
              {expandedQKV ? 'Sembunyikan' : `Tampilkan ${fullQueryData.length - 6} dimensi lainnya`}
            </button>
          </div>
        </div>
      )}

      {/* Tab 3b Content */}
      {activeTab === '3b' && (
        <div className="space-y-4">
          {/* STEP 4 - Weighted Sum (Output Only) */}
          <div className="bg-transparent border border-[#44273D] rounded-lg p-6">
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-white/5">
                    <th className="text-left py-2 px-2 text-white">Output attention →</th>
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
                  {(expandedAttention ? attentionOutputData : attentionOutputData.slice(0, 5)).map((row, rowIdx) => (
                    <tr key={rowIdx} className="border-b border-white/5">
                      <td className="py-2 px-2 font-mono text-white/50">{row.token}</td>
                      {row.values.map((val, colIdx) => (
                        <td key={colIdx} className={`py-2 px-2 text-right font-mono ${getValueColor(val, allAttentionValues)}`}>
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
          {attentionOutputData.length > 5 && (
            <div className="flex justify-center">
              <button
                onClick={() => setExpandedAttention(!expandedAttention)}
                className="flex items-center justify-center gap-2 mx-auto px-4 py-2 rounded-lg text-xs font-semibold transition-colors"
                style={{ backgroundColor: '#09090A', borderColor: 'rgba(255, 255, 255, 0.05)', borderWidth: '1px', color: 'rgba(255, 255, 255, 0.7)' }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#0d0d0d'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#09090A'}
              >
                <svg className={`w-4 h-4 transform transition-transform ${expandedAttention ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
                {expandedAttention ? 'Sembunyikan' : `Tampilkan ${attentionOutputData.length - 5} token lainnya`}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Tab 3c Content */}
      {activeTab === '3c' && (
        <div className="space-y-4">
          {/* Grid Input/Output */}
          <div className="grid grid-cols-2 gap-4">
            {/* Input */}
            <div className="bg-black border border-[#2C1A43] rounded-lg p-3">
              <div className="text-xs font-semibold text-[#C27AFF] mb-2">INPUT TAHAP 3 — "SISTEM" (H<sup>l-1</sup>)</div>
              <div className="space-y-3 font-mono text-xs">
                {(expandedMultiHead ? inputOutput.input : inputOutput.input.slice(0, 6)).map((val, idx) => (
                  <div key={idx} className="flex justify-between">
                    <span className="text-white/50">dim {idx + 1}</span>
                    <span className="text-[#C27AFF]">{val.toFixed(3)}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Output */}
            <div className="bg-black border border-[#44273D] rounded-lg p-3">
              <div className="text-xs font-semibold text-[#FF7AD0] mb-2">OUTPUT TAHAP 3 — "SISTEM" (SETELAH MULTIHEAD)</div>
              <div className="space-y-3 font-mono text-xs">
                {(expandedMultiHead ? inputOutput.output : inputOutput.output.slice(0, 6)).map((val, idx) => (
                  <div key={idx} className="flex justify-between">
                    <span className="text-white/50">dim {idx + 1}</span>
                    <span className="text-[#FF7AD0]">{val.toFixed(3)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Expand Button */}
          <div className="flex justify-center">
            <button
              onClick={() => setExpandedMultiHead(!expandedMultiHead)}
              className="flex items-center justify-center gap-2 mx-auto px-4 py-2 rounded-lg text-xs font-semibold transition-colors"
              style={{ backgroundColor: '#09090A', borderColor: 'rgba(255, 255, 255, 0.05)', borderWidth: '1px', color: 'rgba(255, 255, 255, 0.7)' }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#0d0d0d'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#09090A'}
            >
              <svg className={`w-4 h-4 transform transition-transform ${expandedMultiHead ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
              {expandedMultiHead ? 'Sembunyikan' : `Tampilkan ${inputOutput.input.length - 6} dimensi lainnya`}
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export default SelfAttentionAnalysis;
