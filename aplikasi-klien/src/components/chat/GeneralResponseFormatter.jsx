import React from 'react';

/**
 * GeneralResponseFormatter - Component untuk memformat general response dengan rapi
 * Menangani berbagai jenis konten: code blocks, lists, headers, bold text, dll.
 * Improved version dengan better contextual formatting
 */
const GeneralResponseFormatter = ({ content }) => {
  const formatContent = (text) => {
    // Split by double newlines but preserve single newlines within paragraphs
    return text.split(/\n\s*\n/).map((paragraph, index) => {
      const trimmed = paragraph.trim();
      
      if (!trimmed) return null;

      // Enhanced code block detection (supports more languages)
      if (trimmed.startsWith('```')) {
        const lines = paragraph.split('\n');
        const language = lines[0].replace('```', '').trim();
        const codeContent = lines.slice(1, -1).join('\n');
        
        return (
          <div key={index} className="bg-gray-900/50 border border-gray-700/30 rounded-lg p-4 font-mono text-xs overflow-x-auto my-4">
            {language && (
              <div className="text-gray-400 text-xs mb-2 uppercase tracking-wide flex items-center gap-2">
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                </svg>
                {language}
              </div>
            )}
            <pre className="text-gray-300 whitespace-pre-wrap leading-relaxed">{codeContent}</pre>
          </div>
        );
      }

      // Enhanced table detection (markdown table with | separators)
      if (trimmed.includes('|') && trimmed.split('\n').length >= 2) {
        const lines = paragraph.split('\n').filter(line => line.trim());
        const hasTableStructure = lines.length >= 2 && 
          lines[0].includes('|') && 
          lines[1].includes('|') &&
          (lines[1].includes('-') || lines[1].includes('='));
        
        if (hasTableStructure) {
          const headerRow = lines[0].split('|').map(cell => cell.trim()).filter(cell => cell);
          const dataRows = lines.slice(2).map(line => 
            line.split('|').map(cell => cell.trim()).filter(cell => cell)
          ).filter(row => row.length > 0);
          
          return (
            <div key={index} className="overflow-x-auto my-4">
              <table className="w-full border-collapse border border-gray-600/30 rounded-lg overflow-hidden">
                <thead>
                  <tr className="bg-gray-800/50">
                    {headerRow.map((header, headerIndex) => (
                      <th key={headerIndex} className="border border-gray-600/30 px-3 py-2 text-left text-sm font-semibold text-white">
                        {formatInlineText(header)}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {dataRows.map((row, rowIndex) => (
                    <tr key={rowIndex} className={rowIndex % 2 === 0 ? 'bg-gray-900/20' : 'bg-gray-800/20'}>
                      {row.map((cell, cellIndex) => (
                        <td key={cellIndex} className="border border-gray-600/30 px-3 py-2 text-sm text-gray-200">
                          {formatInlineText(cell)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          );
        }
      }

      // Enhanced bullet list detection
      if (trimmed.includes('\n- ') || trimmed.includes('\n* ') || trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
        const listItems = paragraph.split('\n').filter(line => {
          const lineTrimmed = line.trim();
          return lineTrimmed.startsWith('- ') || lineTrimmed.startsWith('* ');
        });
        
        return (
          <ul key={index} className="space-y-2 ml-2 my-4">
            {listItems.map((item, itemIndex) => (
              <li key={itemIndex} className="flex items-start gap-3">
                <span className="text-blue-400 mt-2 w-1.5 h-1.5 rounded-full bg-blue-400 flex-shrink-0"></span>
                <span className="leading-relaxed text-gray-200">{formatInlineText(item.replace(/^[-*]\s*/, ''))}</span>
              </li>
            ))}
          </ul>
        );
      }

      // Enhanced numbered list detection
      if (trimmed.match(/^\d+\./) || trimmed.includes('\n1.') || trimmed.includes('\n2.')) {
        const numberedItems = paragraph.split('\n').filter(line => line.trim().match(/^\d+\./));
        
        return (
          <ol key={index} className="space-y-2 ml-2 my-4">
            {numberedItems.map((item, itemIndex) => (
              <li key={itemIndex} className="flex items-start gap-3">
                <span className="text-purple-400 text-xs font-semibold mt-0.5 flex-shrink-0 bg-purple-500/20 rounded-full w-5 h-5 flex items-center justify-center">
                  {itemIndex + 1}
                </span>
                <span className="leading-relaxed text-gray-200">{formatInlineText(item.replace(/^\d+\.\s*/, ''))}</span>
              </li>
            ))}
          </ol>
        );
      }

      // Enhanced headers with better styling
      if (trimmed.startsWith('#')) {
        const headerMatch = trimmed.match(/^(#+)\s*(.+)$/);
        if (headerMatch) {
          const level = headerMatch[1].length;
          const text = headerMatch[2];
          
          const headerClasses = {
            1: 'text-xl font-bold text-white mb-4 mt-6 pb-3 border-b border-white/20 flex items-center gap-3',
            2: 'text-lg font-semibold text-white mb-3 mt-5 flex items-center gap-2',
            3: 'text-base font-medium text-gray-200 mb-2 mt-4 flex items-center gap-2',
            4: 'text-sm font-medium text-gray-300 mb-2 mt-3',
          };
          
          const className = headerClasses[level] || headerClasses[4];
          
          // Add icons for different header levels
          const getHeaderIcon = (level) => {
            switch(level) {
              case 1:
                return (
                  <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                );
              case 2:
                return (
                  <svg className="w-4 h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                );
              case 3:
                return (
                  <svg className="w-4 h-4 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                  </svg>
                );
              default:
                return null;
            }
          };
          
          return (
            <div key={index} className={className}>
              {level <= 3 && getHeaderIcon(level)}
              {formatInlineText(text)}
            </div>
          );
        }
      }

      // Enhanced quote/blockquote with better styling
      if (trimmed.startsWith('>')) {
        const quoteText = trimmed.replace(/^>\s*/, '');
        return (
          <blockquote key={index} className="border-l-4 border-blue-500/50 pl-4 py-3 bg-blue-500/5 rounded-r-lg my-4 relative">
            <div className="absolute top-2 left-2 text-blue-400/30">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M14.017 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151c-2.432.917-3.995 3.638-3.995 5.849h4v10h-9.983zm-14.017 0v-7.391c0-5.704 3.748-9.57 9-10.609l.996 2.151c-2.433.917-3.996 3.638-3.996 5.849h4v10h-10z"/>
              </svg>
            </div>
            <p className="text-gray-300 italic leading-relaxed pl-6">{formatInlineText(quoteText)}</p>
          </blockquote>
        );
      }

      // Regular paragraph with enhanced formatting
      return (
        <div key={index} className="leading-relaxed text-gray-200 my-3">
          {paragraph.split('\n').map((line, lineIndex) => {
            const trimmedLine = line.trim();
            if (!trimmedLine) return <br key={lineIndex} />;
            
            return (
              <p key={lineIndex} className="mb-2 last:mb-0">
                {formatInlineText(line)}
              </p>
            );
          })}
        </div>
      );
    }).filter(Boolean);
  };

  const formatInlineText = (text) => {
    // Handle multiple markdown elements in sequence
    let processedText = text;
    const elements = [];
    let currentIndex = 0;

    // Process bold text (**text** or __text__)
    const boldRegex = /(\*\*[^*]+\*\*|__[^_]+__)/g;
    let match;
    
    while ((match = boldRegex.exec(text)) !== null) {
      // Add text before bold
      if (match.index > currentIndex) {
        elements.push({
          type: 'text',
          content: text.slice(currentIndex, match.index),
          index: currentIndex
        });
      }
      
      // Add bold element
      elements.push({
        type: 'bold',
        content: match[0].replace(/\*\*|__/g, ''),
        index: match.index
      });
      
      currentIndex = match.index + match[0].length;
    }
    
    // Add remaining text
    if (currentIndex < text.length) {
      elements.push({
        type: 'text',
        content: text.slice(currentIndex),
        index: currentIndex
      });
    }
    
    // If no bold elements found, process normally
    if (elements.length === 0) {
      elements.push({ type: 'text', content: text, index: 0 });
    }
    
    return elements.map((element, index) => {
      if (element.type === 'bold') {
        return (
          <strong key={index} className="font-semibold text-white">
            {processInlineElements(element.content)}
          </strong>
        );
      }
      
      return (
        <span key={index}>
          {processInlineElements(element.content)}
        </span>
      );
    });
  };

  const processInlineElements = (text) => {
    // Handle inline code (`code`)
    if (text.includes('`')) {
      const codeParts = text.split(/(`[^`]+`)/g);
      return codeParts.map((part, index) => {
        if (part.startsWith('`') && part.endsWith('`')) {
          return (
            <code key={index} className="bg-gray-800/50 text-blue-300 px-1.5 py-0.5 rounded text-xs font-mono border border-gray-700/30">
              {part.slice(1, -1)}
            </code>
          );
        }
        
        // Handle italic text (*text* or _text_)
        if (part.includes('*') || part.includes('_')) {
          const italicParts = part.split(/(\*[^*]+\*|_[^_]+_)/g);
          return italicParts.map((italicPart, italicIndex) => {
            if ((italicPart.startsWith('*') && italicPart.endsWith('*')) || 
                (italicPart.startsWith('_') && italicPart.endsWith('_'))) {
              return (
                <em key={`${index}-${italicIndex}`} className="italic text-gray-300">
                  {italicPart.slice(1, -1)}
                </em>
              );
            }
            return italicPart;
          });
        }
        
        return part;
      });
    }
    
    // Handle italic text without code
    if (text.includes('*') || text.includes('_')) {
      const italicParts = text.split(/(\*[^*]+\*|_[^_]+_)/g);
      return italicParts.map((part, index) => {
        if ((part.startsWith('*') && part.endsWith('*')) || 
            (part.startsWith('_') && part.endsWith('_'))) {
          return (
            <em key={index} className="italic text-gray-300">
              {part.slice(1, -1)}
            </em>
          );
        }
        return part;
      });
    }
    
    return text;
  };

  return (
    <div className="space-y-4">
      {formatContent(content)}
    </div>
  );
};

export default GeneralResponseFormatter;