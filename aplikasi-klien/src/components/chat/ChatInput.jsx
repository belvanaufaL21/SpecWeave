import { useState, useRef, useEffect } from 'react';

const ChatInput = ({ onSendMessage, isLoading, disabled }) => {
  const [input, setInput] = useState('');
  const [isValidFormat, setIsValidFormat] = useState(true);
  const textareaRef = useRef(null);

  // Auto-resize
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }
    
    // Validasi format Connextra
    if (input.trim().length > 10) {
      const hasRole = /as a/i.test(input);
      const hasFeature = /i want/i.test(input);
      const hasBenefit = /so that/i.test(input);
      setIsValidFormat(hasRole && hasFeature && hasBenefit);
    } else {
      setIsValidFormat(true);
    }
  }, [input]);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleSend = () => {
    if (input.trim() && !isLoading && !disabled) {
      onSendMessage(input.trim());
      setInput('');
      if (textareaRef.current) textareaRef.current.style.height = 'auto';
    }
  };

  const insertTemplate = () => {
    setInput("As a [role], I want [feature], so that [benefit]");
    textareaRef.current?.focus();
  };

  return (
    <div className="relative">
      {/* Format Warning */}
      {!isValidFormat && input.length > 10 && (
        <div className="absolute -top-12 left-0 right-0 flex justify-center">
          <div className="bg-yellow-500/20 border border-yellow-500/30 text-yellow-200 text-xs px-3 py-2 rounded-lg backdrop-blur-sm">
            💡 Try: "As a [role], I want [feature], so that [benefit]"
          </div>
        </div>
      )}

      <div className={`relative bg-white/5 border rounded-2xl transition-all duration-200 ${
        !isValidFormat && input.length > 10 
          ? 'border-yellow-500/30' 
          : 'border-white/10 focus-within:border-white/20'
      }`}>
        
        {/* Input Area */}
        <div className="flex items-end gap-3 p-4">
          <div className="flex-1">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask me anything or describe your user story..."
              className="w-full bg-transparent text-white placeholder-gray-400 resize-none focus:outline-none text-sm leading-relaxed min-h-[24px] max-h-[120px]"
              rows={1}
              disabled={isLoading || disabled}
            />
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            {/* Template Button */}
            <button
              onClick={insertTemplate}
              className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
              title="Use template"
              disabled={isLoading || disabled}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </button>

            {/* Send Button */}
            <button 
              onClick={handleSend}
              disabled={!input.trim() || isLoading || disabled}
              className={`p-2 rounded-lg transition-all duration-200 ${
                input.trim() && !isLoading && !disabled
                  ? 'bg-white text-black hover:bg-gray-200 shadow-lg' 
                  : 'bg-gray-700/50 text-gray-500 cursor-not-allowed'
              }`}
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-gray-400 border-t-black rounded-full animate-spin" />
              ) : (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
              )}
            </button>
          </div>
        </div>

        {/* Footer Info */}
        <div className="px-4 pb-3">
          <p className="text-xs text-gray-500">
            Press Enter to send, Shift+Enter for new line
          </p>
        </div>
      </div>
    </div>
  );
};

export default ChatInput;