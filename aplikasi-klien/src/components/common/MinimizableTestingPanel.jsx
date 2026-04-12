import { useState } from 'react';
import { motion } from 'framer-motion';
import { useResponsive } from '../../hooks/useResponsive';
import TestedScenariosOverview from './TestedScenariosOverview';

const MinimizableTestingPanel = ({ activeChatId, chatMessages, isOpen, onToggle }) => {
  const { isMobile } = useResponsive();
  const [isMinimized, setIsMinimized] = useState(false);

  const toggleMinimize = () => {
    if (isMobile) {
      onToggle?.();
    } else {
      setIsMinimized(!isMinimized);
    }
  };

  // Mobile: Full-screen modal (controlled by parent)
  if (isMobile) {
    return (
      <>
        {/* Backdrop */}
        {isOpen && (
          <div 
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 transition-opacity duration-300"
            style={{ opacity: isOpen ? 1 : 0 }}
            onClick={toggleMinimize}
          />
        )}

        {/* Panel */}
        <div
          className={`
            fixed inset-y-0 right-0 w-full z-50 flex flex-col
            bg-[#09090A]
            transition-transform duration-300 cubic-bezier(0.2, 0, 0, 1)
            ${isOpen ? 'translate-x-0' : 'translate-x-full'}
          `}
        >
              {/* Header */}
              <div className="flex items-center justify-between p-4 border-b" style={{ borderColor: 'rgba(255, 255, 255, 0.05)', backgroundColor: '#09090A' }}>
                <h3 className="text-sm font-semibold text-white">Testing Scenario</h3>
                <button
                  onClick={toggleMinimize}
                  className="p-2 rounded-lg text-gray-400 hover:text-white transition-colors"
                  style={{ backgroundColor: 'rgba(255, 255, 255, 0.05)' }}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Content */}
              <div className="flex-1 overflow-y-auto p-4" style={{ backgroundColor: '#09090A' }}>
                <TestedScenariosOverview activeChatId={activeChatId} chatMessages={chatMessages} />
              </div>
            </div>
          </>
    );
  }

  // Desktop: Minimizable sidebar panel
  return (
    <motion.div
      initial={false}
      animate={{ width: isMinimized ? 60 : 320 }}
      transition={{ type: 'spring', damping: 25, stiffness: 200 }}
      className="flex-shrink-0 border-l flex flex-col"
      style={{ borderColor: 'rgba(255, 255, 255, 0.05)', backgroundColor: '#09090A' }}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b" style={{ borderColor: 'rgba(255, 255, 255, 0.05)', backgroundColor: '#09090A' }}>
        <button
          onClick={toggleMinimize}
          className="p-2 rounded-lg text-gray-400 hover:text-white transition-colors"
          style={{ backgroundColor: 'rgba(255, 255, 255, 0.05)' }}
          title={isMinimized ? 'Expand panel' : 'Minimize panel'}
        >
          {isMinimized ? (
            <svg className="w-5 h-5" style={{ color: '#C27AFF' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
            </svg>
          ) : (
            <h3 className="text-sm font-semibold text-white">Testing Scenario</h3>
          )}
        </button>
      </div>

      {/* Content */}
      {!isMinimized && (
        <div className="flex-1 overflow-y-auto p-4" style={{ backgroundColor: '#09090A' }}>
          <TestedScenariosOverview activeChatId={activeChatId} chatMessages={chatMessages} />
        </div>
      )}
    </motion.div>
  );
};

export default MinimizableTestingPanel;
