import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useResponsive } from '../../hooks/useResponsive';

const ResponsiveChatInput = ({
  value,
  onChange,
  onSubmit,
  onFormatGuideClick,
  onUseFormatClick,
  activeAI,
  availableAIs = [],
  onAIChange,
  disabled = false,
  placeholder = 'Ketik user story Anda di sini...'
}) => {
  const { isMobile } = useResponsive();
  const [showAIDropdown, setShowAIDropdown] = useState(false);
  const textareaRef = useRef(null);
  const dropdownRef = useRef(null);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [value]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowAIDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (value.trim() && !disabled) {
      onSubmit();
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <div className="border-t" style={{ borderColor: 'rgba(255, 255, 255, 0.05)', backgroundColor: '#09090A' }}>
      <div className="p-4">
        <form onSubmit={handleSubmit} className="space-y-3">
          {/* Textarea */}
          <div className="relative">
            <textarea
              ref={textareaRef}
              value={value}
              onChange={(e) => onChange(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={placeholder}
              disabled={disabled}
              rows={isMobile ? 3 : 4}
              className="w-full px-4 py-3 rounded-xl resize-none focus:outline-none transition-all"
              style={{
                backgroundColor: '#0D0D0D',
                border: '1px solid rgba(255, 255, 255, 0.05)',
                color: 'rgba(255, 255, 255, 0.7)',
                maxHeight: isMobile ? '120px' : '200px',
                minHeight: isMobile ? '80px' : '100px'
              }}
            />
          </div>

          {/* Controls */}
          <div className="flex items-center justify-between gap-2">
            {/* Left controls */}
            <div className="flex items-center gap-2">
              {/* Format Guide Button - Icon only on mobile */}
              <button
                type="button"
                onClick={onFormatGuideClick}
                className="p-2 rounded-lg text-gray-400 hover:text-white transition-colors"
                style={{ backgroundColor: 'rgba(255, 255, 255, 0.05)' }}
                title="Format Guide"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {!isMobile && <span className="ml-2 text-sm">Format Guide</span>}
              </button>

              {/* Use Format Button - Icon only on mobile */}
              {onUseFormatClick && (
                <button
                  type="button"
                  onClick={onUseFormatClick}
                  className="p-2 rounded-lg text-gray-400 hover:text-white transition-colors"
                  style={{ backgroundColor: 'rgba(255, 255, 255, 0.05)' }}
                  title="Use Format"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  {!isMobile && <span className="ml-2 text-sm">Use Format</span>}
                </button>
              )}

              {/* AI Model Dropdown - Icon only on mobile */}
              {availableAIs.length > 0 && (
                <div className="relative" ref={dropdownRef}>
                  <button
                    type="button"
                    onClick={() => setShowAIDropdown(!showAIDropdown)}
                    className="flex items-center gap-2 p-2 rounded-lg text-gray-400 hover:text-white transition-colors"
                    style={{ backgroundColor: 'rgba(255, 255, 255, 0.05)' }}
                    title={isMobile ? activeAI?.name : undefined}
                  >
                    {activeAI?.icon && (
                      <img src={activeAI.icon} alt={activeAI.name} className="w-5 h-5 rounded" />
                    )}
                    {!isMobile && <span className="text-sm">{activeAI?.name}</span>}
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>

                  {/* Dropdown */}
                  <AnimatePresence>
                    {showAIDropdown && (
                      <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="absolute bottom-full left-0 mb-2 w-64 rounded-xl shadow-2xl overflow-hidden"
                        style={{ backgroundColor: '#09090A', border: '1px solid rgba(255, 255, 255, 0.05)' }}
                      >
                        {availableAIs.map((ai) => (
                          <button
                            key={ai.id}
                            type="button"
                            onClick={() => {
                              onAIChange(ai);
                              setShowAIDropdown(false);
                            }}
                            className="w-full flex items-center gap-3 p-3 text-left hover:bg-white/5 transition-colors"
                          >
                            {ai.icon && (
                              <img src={ai.icon} alt={ai.name} className="w-6 h-6 rounded" />
                            )}
                            <div className="flex-1">
                              <div className="text-sm font-medium text-white">{ai.name}</div>
                              {ai.description && (
                                <div className="text-xs text-gray-400">{ai.description}</div>
                              )}
                            </div>
                            {activeAI?.id === ai.id && (
                              <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                              </svg>
                            )}
                          </button>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )}
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={!value.trim() || disabled}
              className="px-6 py-2 rounded-lg font-medium transition-all flex items-center gap-2"
              style={
                !value.trim() || disabled
                  ? { backgroundColor: '#0D0D0D', border: '1px solid rgba(255, 255, 255, 0.05)', color: 'rgba(255, 255, 255, 0.3)', cursor: 'not-allowed' }
                  : { backgroundColor: '#120C18', border: '1px solid #2C1A43', color: '#C27AFF' }
              }
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
              {!isMobile && <span>Send</span>}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ResponsiveChatInput;
