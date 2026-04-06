import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Logo from '../common/Logo';
import JiraStatusIndicator from '../common/JiraStatusIndicator';
import SidebarProfileDropdown from '../common/SidebarProfileDropdown';
import { useResponsive } from '../../hooks/useResponsive';

const NavigationButton = ({ onClick, icon, label, className = "" }) => (
  <motion.button
    onClick={onClick}
    className={`w-full flex items-center gap-3 px-4 py-3 text-gray-400 hover:text-white hover:bg-white/5 rounded-xl transition-all duration-200 group ${className}`}
    whileHover={{ scale: 1.02, x: 4 }}
    whileTap={{ scale: 0.98 }}
    initial={{ opacity: 0, x: -10 }}
    animate={{ opacity: 1, x: 0 }}
  >
    <motion.svg 
      className="w-4 h-4 opacity-70 group-hover:opacity-100" 
      fill="none" 
      stroke="currentColor" 
      viewBox="0 0 24 24"
      whileHover={{ scale: 1.1 }}
      transition={{ duration: 0.2 }}
    >
      {icon}
    </motion.svg>
    <span className="text-sm font-medium">{label}</span>
  </motion.button>
);

const ChatHistoryItem = ({ 
  chat, 
  isActive, 
  onSelect, 
  onMenuToggle, 
  showMenu 
}) => (
  <motion.div 
    key={chat.id} 
    onClick={() => onSelect(chat.id)} 
    className={`group relative flex items-center gap-3 px-4 py-3 rounded-xl cursor-pointer transition-all duration-200 ${
      isActive 
        ? 'bg-gradient-to-r from-purple-500/10 to-pink-500/10 text-white shadow-inner border border-purple-500/20' 
        : 'text-gray-400 hover:bg-white/5 hover:text-gray-200'
    }`}
    whileHover={{ scale: 1.02, x: 4 }}
    whileTap={{ scale: 0.98 }}
    layout
  >
    <motion.svg 
      className={`w-3.5 h-3.5 shrink-0 ${
        isActive ? 'text-purple-400' : 'opacity-40 group-hover:opacity-70'
      }`} 
      fill="none" 
      stroke="currentColor" 
      viewBox="0 0 24 24"
      whileHover={{ scale: 1.1 }}
      transition={{ duration: 0.2 }}
    >
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
    </motion.svg>
    <div className="flex-1 min-w-0 pr-6">
      <p className="text-[13px] truncate font-medium leading-snug">{chat.title}</p>
    </div>
    <AnimatePresence>
      {(showMenu || isActive) && (
        <motion.div 
          className="absolute right-2 top-1/2 -translate-y-1/2"
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.8 }}
          transition={{ duration: 0.2 }}
        >
          <motion.button 
            onClick={(e) => {
              e.stopPropagation();
              
              onMenuToggle(e, chat.id);
            }} 
            className="p-1.5 rounded-lg hover:bg-white/5 text-gray-400 hover:text-white transition-colors"
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 12h.01M12 12h.01M19 12h.01M6 12a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0z" />
            </svg>
          </motion.button>
        </motion.div>
      )}
    </AnimatePresence>
  </motion.div>
);

const ChatSidebar = ({
  isVisible,
  isPinned,
  history,
  activeChatId,
  openMenuId,
  onTogglePin,
  onNewChat,
  onSelectChat,
  onMenuToggle,
  onBackToDashboard,
  onTemplates,
  onJiraSetup,
  onSignOut,
  onOpenUserGuide,
  onMouseLeave
}) => {
  const { isMobile } = useResponsive();
  
  // State for sidebar persistence
  const [sidebarState, setSidebarState] = useState(() => {
    try {
      const saved = localStorage.getItem('specweave_sidebar_state');
      return saved ? JSON.parse(saved) : { isPinned: false, width: 280 };
    } catch {
      return { isPinned: false, width: 280 };
    }
  });

  // Save sidebar state to localStorage
  useEffect(() => {
    const newState = { isPinned, width: 280 };
    setSidebarState(newState);
    try {
      localStorage.setItem('specweave_sidebar_state', JSON.stringify(newState));
    } catch (error) {
      console.error('Error saving sidebar state:', error);
    }
  }, [isPinned]);

  // Animation variants for smooth transitions
  const sidebarVariants = {
    visible: {
      x: 0,
      transition: {
        type: "spring",
        stiffness: 300,
        damping: 30,
        duration: 0.3
      }
    },
    hidden: {
      x: isMobile ? -window.innerWidth : -280,
      transition: {
        type: "spring",
        stiffness: 300,
        damping: 30,
        duration: 0.3
      }
    }
  };

  const overlayVariants = {
    visible: {
      opacity: 1,
      transition: { duration: 0.2 }
    },
    hidden: {
      opacity: 0,
      transition: { duration: 0.2 }
    }
  };

  return (
    <>
      {/* Mobile/Desktop Overlay */}
      <AnimatePresence>
        {isVisible && !isPinned && (
          <motion.div
            variants={overlayVariants}
            initial="hidden"
            animate="visible"
            exit="hidden"
            className={`fixed inset-0 bg-black/50 backdrop-blur-sm z-30 ${isMobile ? '' : 'md:hidden'}`}
            onClick={onTogglePin}
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <motion.aside 
        variants={sidebarVariants}
        initial="hidden"
        animate={isVisible ? "visible" : "hidden"}
        onMouseLeave={!isMobile ? onMouseLeave : undefined}
        className={`
          fixed top-0 left-0 h-full z-40 flex flex-col
          bg-[#0a0a0f]/95 backdrop-blur-3xl border-r border-white/10 shadow-[10px_0_40px_rgba(147,51,234,0.1)]
        `}
        style={{ width: isMobile ? '100%' : '280px' }}
      >
        <div className="p-5 flex flex-col h-full w-full">
          {/* Header with enhanced animations */}
          <motion.div 
            className="flex items-center justify-between mb-8 pl-1"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <Logo 
              size="md" 
              showText={true} 
              onClick={onBackToDashboard}
            />
            <motion.button 
              onClick={onTogglePin}
              className={`p-2 rounded-lg transition-all duration-300 group/pin border ${
                isPinned 
                  ? 'bg-white/10 text-white border-white/10 shadow-sm' 
                  : 'bg-transparent text-gray-500 border-transparent hover:bg-white/5 hover:text-gray-300'
              }`}
              title={isPinned ? "Unpin Sidebar" : "Pin Sidebar"}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <motion.div
                animate={{ rotate: isPinned ? 0 : 180 }}
                transition={{ duration: 0.3 }}
              >
                {isPinned ? (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
                  </svg>
                ) : (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                )}
              </motion.div>
            </motion.button>
          </motion.div>

          {/* Navigation Section with staggered animations */}
          <motion.div 
            className="space-y-1 mb-6"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2, staggerChildren: 0.1 }}
          >
            <NavigationButton
              onClick={onBackToDashboard}
              icon={<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z" />}
              label="Dashboard"
            />
            
            <NavigationButton
              onClick={onTemplates}
              icon={<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />}
              label="Templates"
            />

            {/* JIRA Connection Status */}
            <div className="w-full flex items-center gap-3 px-4 py-3">
              <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
              </svg>
              <div className="flex-1">
                <JiraStatusIndicator 
                  onSetupJira={onJiraSetup}
                  compact={true}
                />
              </div>
            </div>
          </motion.div>

          {/* New Chat Button with enhanced animation */}
          <motion.button 
            onClick={onNewChat} 
            className="w-full flex items-center justify-center gap-3 px-5 py-4 bg-gradient-to-r from-purple-500/10 to-pink-500/10 hover:from-purple-500/20 hover:to-pink-500/20 text-white rounded-2xl transition-all duration-300 border border-purple-500/20 hover:border-purple-400/40 group active:scale-[0.98] shadow-lg hover:shadow-purple-500/10"
            whileHover={{ scale: 1.02, y: -2 }}
            whileTap={{ scale: 0.98 }}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <motion.svg 
              className="w-5 h-5 text-purple-400 group-hover:text-purple-300 transition-colors duration-300" 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
              whileHover={{ rotate: 90 }}
              transition={{ duration: 0.3 }}
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </motion.svg>
            <span className="text-sm font-bold tracking-wide">New Chat</span>
          </motion.button>

          {/* Chat History with enhanced animations */}
          <motion.div 
            className="flex-1 overflow-y-auto -mx-2 px-2 mt-8 space-y-1 scrollbar-none"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
          >
            {history.length > 0 && (
              <motion.h3 
                className="px-4 text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-3"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.5 }}
              >
                Recent
              </motion.h3>
            )}
            <AnimatePresence>
              {history.map((chat, index) => (
                <motion.div
                  key={chat.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ delay: 0.5 + (index * 0.05) }}
                >
                  <ChatHistoryItem
                    chat={chat}
                    isActive={activeChatId === chat.id}
                    onSelect={onSelectChat}
                    onMenuToggle={onMenuToggle}
                    showMenu={openMenuId === chat.id}
                  />
                </motion.div>
              ))}
            </AnimatePresence>
          </motion.div>

          {/* Profile Section with animation */}
          <motion.div 
            className="pt-4 mt-2 border-t border-white/10 space-y-2"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
          >
            <SidebarProfileDropdown 
              onSignOut={onSignOut}
              onOpenUserGuide={onOpenUserGuide}
            />
          </motion.div>
        </div>
      </motion.aside>
    </>
  );
};

export default ChatSidebar;