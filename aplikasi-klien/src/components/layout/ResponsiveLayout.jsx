import React from 'react';
import { motion } from 'framer-motion';
import { useResponsive } from '../../hooks/useResponsive';
import { useKeyboardNavigation } from '../../hooks/useKeyboardNavigation';

/**
 * Responsive layout component that adapts to different screen sizes
 */
const ResponsiveLayout = ({ 
  children, 
  sidebar = null,
  header = null,
  footer = null,
  className = '',
  sidebarCollapsible = true,
  sidebarDefaultOpen = true
}) => {
  const { isMobile, isTablet, isDesktop } = useResponsive();
  const [sidebarOpen, setSidebarOpen] = React.useState(sidebarDefaultOpen && !isMobile);
  
  // Keyboard navigation for layout
  const { containerRef } = useKeyboardNavigation({
    trapFocusEnabled: false,
    arrowNavigationEnabled: false
  });

  // Auto-close sidebar on mobile when screen size changes
  React.useEffect(() => {
    if (isMobile) {
      setSidebarOpen(false);
    } else if (isDesktop && sidebarDefaultOpen) {
      setSidebarOpen(true);
    }
  }, [isMobile, isDesktop, sidebarDefaultOpen]);

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  // Layout variants for different screen sizes
  const getLayoutClasses = () => {
    if (isMobile) {
      return {
        container: 'flex flex-col h-screen',
        sidebar: `fixed inset-y-0 left-0 z-50 w-64 transform transition-transform duration-300 ease-in-out ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`,
        main: 'flex-1 flex flex-col overflow-hidden',
        content: 'flex-1 overflow-auto p-4'
      };
    }
    
    if (isTablet) {
      return {
        container: 'flex h-screen',
        sidebar: `${sidebarOpen ? 'w-64' : 'w-16'} transition-all duration-300 ease-in-out flex-shrink-0`,
        main: 'flex-1 flex flex-col overflow-hidden',
        content: 'flex-1 overflow-auto p-6'
      };
    }
    
    // Desktop
    return {
      container: 'flex h-screen',
      sidebar: `${sidebarOpen ? 'w-64' : 'w-16'} transition-all duration-300 ease-in-out flex-shrink-0`,
      main: 'flex-1 flex flex-col overflow-hidden',
      content: 'flex-1 overflow-auto p-8'
    };
  };

  const layoutClasses = getLayoutClasses();

  return (
    <div ref={containerRef} className={`${layoutClasses.container} ${className}`}>
      {/* Mobile backdrop */}
      {isMobile && sidebarOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-40 bg-black/50"
          onClick={toggleSidebar}
        />
      )}

      {/* Sidebar */}
      {sidebar && (
        <motion.aside
          className={`${layoutClasses.sidebar} bg-[#0a0a0f] border-r border-white/10`}
          initial={false}
          animate={{
            width: isMobile ? (sidebarOpen ? 256 : 0) : (sidebarOpen ? 256 : 64)
          }}
          transition={{ duration: 0.3, ease: 'easeInOut' }}
        >
          <div className="h-full flex flex-col">
            {/* Sidebar toggle button */}
            {sidebarCollapsible && (
              <div className="p-4 border-b border-white/10">
                <button
                  onClick={toggleSidebar}
                  className="p-2 rounded-lg hover:bg-white/5 transition-colors duration-200 text-gray-400 hover:text-white"
                  aria-label={sidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}
                >
                  <svg 
                    className={`w-5 h-5 transition-transform duration-200 ${sidebarOpen ? 'rotate-0' : 'rotate-180'}`} 
                    fill="none" 
                    stroke="currentColor" 
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
                  </svg>
                </button>
              </div>
            )}
            
            {/* Sidebar content */}
            <div className="flex-1 overflow-y-auto">
              {React.cloneElement(sidebar, { collapsed: !sidebarOpen })}
            </div>
          </div>
        </motion.aside>
      )}

      {/* Main content area */}
      <div className={layoutClasses.main}>
        {/* Header */}
        {header && (
          <header className="flex-shrink-0 bg-[#0a0a0f] border-b border-white/10 px-4 py-3">
            <div className="flex items-center justify-between">
              {/* Mobile menu button */}
              {isMobile && sidebar && (
                <button
                  onClick={toggleSidebar}
                  className="p-2 rounded-lg hover:bg-white/5 transition-colors duration-200 text-gray-400 hover:text-white mr-4"
                  aria-label="Open sidebar"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                </button>
              )}
              
              {header}
            </div>
          </header>
        )}

        {/* Main content */}
        <main className={layoutClasses.content}>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="h-full"
          >
            {children}
          </motion.div>
        </main>

        {/* Footer */}
        {footer && (
          <footer className="flex-shrink-0 bg-[#0a0a0f] border-t border-white/10 px-4 py-3">
            {footer}
          </footer>
        )}
      </div>
    </div>
  );
};

export default ResponsiveLayout;