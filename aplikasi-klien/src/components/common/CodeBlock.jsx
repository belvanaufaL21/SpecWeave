import { useState } from 'react';

const CodeBlock = ({ code, language = 'gherkin' }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  // Fungsi Syntax Highlighting yang AMAN (Anti-Leak)
  const highlightGherkin = (text) => {
    if (!text) return null;

    return text.split('\n').map((line, index) => {
      // 1. Escape HTML characters dulu untuk keamanan (mencegah XSS & bug rendering)
      // Ini mengubah < menjadi &lt;, dsb.
      let safeLine = line
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");

      let processedLine = safeLine;

      // 2. Cek Komentar (Paling prioritas)
      if (line.trim().startsWith('#')) {
        processedLine = `<span class="text-gray-500 italic">${safeLine}</span>`;
      } else {
        // 3. Highlight Keywords (Ungu)
        // List keyword Gherkin standar
        const keywords = ['Feature:', 'Scenario:', 'Given', 'When', 'Then', 'And', 'But', 'Background:', 'Scenario Outline:', 'Examples:', 'Rule:'];
        
        for (const keyword of keywords) {
             // Regex: Cari keyword di awal baris (memperhitungkan spasi indentasi)
             // ^(\s*) -> Group 1: Spasi awal
             // (${keyword}) -> Group 2: Keyword
             const regex = new RegExp(`^(\\s*)(${keyword})`);
             if (regex.test(line)) {
                 processedLine = safeLine.replace(regex, '$1<span class="text-[#c084fc] font-bold">$2</span>');
                 break; // Stop jika sudah nemu keyword agar tidak double process
             }
        }

        // 4. Highlight Strings "..." (Hijau)
        // Kita replace &quot;...&quot; yang sudah di-escape di langkah 1
        processedLine = processedLine.replace(/&quot;(.*?)&quot;/g, '<span class="text-[#4ade80]">&quot;$1&quot;</span>');

        // 5. Highlight Variabel <...> (Pink)
        // Kita replace &lt;...&gt; yang sudah di-escape di langkah 1
        processedLine = processedLine.replace(/&lt;(.*?)&gt;/g, '<span class="text-[#f472b6]">&lt;$1&gt;</span>');
        
        // CATATAN: Saya MENGHAPUS highlight angka (\d+) karena itu menyebabkan bug
        // di mana angka dalam nama class CSS (misal text-purple-400) ikut terganti.
      }

      return (
        <div key={index} className="table-row hover:bg-white/5 transition-colors">
          {/* Line Number */}
          <span className="table-cell text-right w-8 pr-4 text-gray-600 select-none text-[11px] font-mono py-0.5 align-top border-r border-white/5 opacity-50">
            {index + 1}
          </span>
          {/* Code Content */}
          <span 
            className="table-cell pl-4 whitespace-pre-wrap break-words font-mono text-[13px] leading-6 align-top text-gray-300"
            dangerouslySetInnerHTML={{ __html: processedLine }}
          />
        </div>
      );
    });
  };

  return (
    <div className="relative group rounded-xl overflow-hidden bg-[#0c0c12] border border-white/10 my-3 shadow-lg w-full max-w-full">
      {/* Header Bar */}
      <div className="flex items-center justify-between px-4 py-2 bg-[#15151e] border-b border-white/5">
        <div className="flex items-center gap-2">
           <div className="flex gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full bg-red-500/20 border border-red-500/40"></div>
              <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/20 border border-yellow-500/40"></div>
              <div className="w-2.5 h-2.5 rounded-full bg-green-500/20 border border-green-500/40"></div>
           </div>
           <span className="ml-2 text-[10px] font-bold text-gray-500 uppercase tracking-widest">{language}</span>
        </div>

        <button
          onClick={handleCopy}
          className="flex items-center gap-1.5 px-2 py-1 text-[10px] font-medium text-gray-400 hover:text-white bg-white/5 hover:bg-white/10 rounded-md transition-all border border-white/5"
        >
          {copied ? (
            <>
              <svg className="w-3 h-3 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
              <span>Disalin</span>
            </>
          ) : (
            <>
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
              <span>Salin</span>
            </>
          )}
        </button>
      </div>
      
      {/* Code Body */}
      <div className="p-0 overflow-x-auto bg-[#0a0a0f]">
        <pre className="m-0 p-2">
          <div className="table w-full border-collapse">
            {highlightGherkin(code)}
          </div>
        </pre>
      </div>
    </div>
  );
};

export default CodeBlock;