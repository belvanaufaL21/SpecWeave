import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useResponsive } from '../../hooks/useResponsive';
import TestedScenariosOverview from './TestedScenariosOverview';

const MinimizableTestingPanel = ({ activeChatId, chatMessages }) => {
  const { isMobile } = useResponsive();
  const [isMinimized, setIsMinimized] = useState(false);
  const [isFullScreen, setIsFullScreen] = useState(false);

  const toggleMinimize = () => {
    if (isMobile) {
      setIsFullScreen(!isFullScreen);
    } else {
      setIsMinimized(!isMinimized);
    }
  };

  // Mobile: Full-screen modal
  if (isMobile) {
    return (
      <>
        {/* Minimized button - floating */}
        {!isFullScreen && (
          <motion.button
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            onClick={toggleMinimize}
            className="fixed bottom-20 right-4 z-40 w-14 h-14 rounded-full flex items-center justify-center shadow-lg"
            style={{ backgroundColor: '#120C18', border: '2px solid #2C1A43' }}
          >
            <svg className="w-6 h-6" style={{ color: '#C27AFF' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
            </svg>
          </motion.button>
        )}

        {/* Full-screen modal */}
        <AnimatePresence>
          {isFullScreen && (
            <>
              {/* Backdrop */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
                onClick={toggleMinimize}
              />

              {/* Panel */}
              <motion.div
                initial={{ x: '100%' }}
                animate={{ x: 0 }}
                exit={{ x: '100%' }}
                transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                className="fixed inset-y-0 right-0 w-full z-50 flex flex-col"
                style={{ backgroundColor: '#09090A' }}
              >
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b" style={{ borderColor: 'rgba(255, 255, 255, 0.05)' }}>
                  <div className="flex items-center gap-2">
                    <svg className="w-5 h-5" style={{ color: '#C27AFF' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                    </svg>
                    <h3 className="text-sm font-semibold text-white">Testing Scenario</h3>
                  </div>
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
                <div className="flex-1 overflow-y-auto p-4">
                  <TestedScenariosOverview activeChatId={activeChatId} chatMessages={chatMessages} />
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>
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
      <div className="flex items-center justify-between p-4 border-b" style={{ borderColor: 'rgba(255, 255, 255, 0.05)' }}>
        {!isMinimized && (
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5" style={{ color: '#C27AFF' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
            </svg>
            <h3 className="text-sm font-semibold text-white">Testing Scenario</h3>
          </div>
        )}
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
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          )}
        </button>
      </div>

      {/* Content */}
      {!isMinimized && (
        <div className="flex-1 overflow-y-auto p-4">
          <TestedScenariosOverview activeChatId={activeChatId} chatMessages={chatMessages} />
        </div>
      )}
    </motion.div>
  );
};

export default MinimizableTestingPanel;
