import { useResponsive } from '../../hooks/useResponsive';
import TestedScenariosOverview from './TestedScenariosOverview';

const MinimizableTestingPanel = ({ activeChatId, chatMessages, isOpen, onToggle }) => {
  const { isMobile } = useResponsive();

  const toggleMinimize = () => {
    onToggle?.();
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
            transition-transform duration-300 cubic-bezier(0.2, 0, 0, 1)
            ${isOpen ? 'translate-x-0' : 'translate-x-full'}
          `}
          style={{ backgroundColor: '#09090A', backgroundImage: 'none' }}
        >
              {/* Header */}
              <div className="flex items-center justify-between p-4 border-b" style={{ borderColor: 'rgba(255, 255, 255, 0.05)', backgroundColor: 'transparent' }}>
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
              <div className="flex-1 overflow-y-auto p-4" style={{ backgroundColor: 'transparent' }}>
                <TestedScenariosOverview activeChatId={activeChatId} chatMessages={chatMessages} />
              </div>
            </div>
          </>
    );
  }

  // Desktop: Sidebar panel (only show when open)
  if (!isOpen) {
    return null;
  }

  return (
    <div
      className="flex-shrink-0 border-l flex flex-col w-[320px]"
      style={{ borderColor: 'rgba(255, 255, 255, 0.05)', backgroundColor: 'transparent', backgroundImage: 'none' }}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b" style={{ borderColor: 'rgba(255, 255, 255, 0.05)', backgroundColor: 'transparent' }}>
        <h3 className="text-sm font-semibold text-white">Testing Scenario</h3>
        <button
          onClick={toggleMinimize}
          className="p-2 rounded-lg text-gray-400 hover:text-white transition-colors"
          style={{ backgroundColor: 'rgba(255, 255, 255, 0.05)' }}
          title="Close panel"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4" style={{ backgroundColor: 'transparent' }}>
        <TestedScenariosOverview activeChatId={activeChatId} chatMessages={chatMessages} />
      </div>
    </div>
  );
};

export default MinimizableTestingPanel;
