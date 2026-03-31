import React, { memo, useMemo, useCallback, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FixedSizeList as List } from 'react-window';
import ChatBubble from './ChatBubble';
import TypingIndicator from './TypingIndicator';

/**
 * Optimized chat container with virtual scrolling for better performance
 */
const OptimizedChatContainer = memo(({ 
  messages = [], 
  isLoading = false, 
  className = '',
  onMessageAction = null 
}) => {
  const listRef = useRef(null);
  const containerRef = useRef(null);

  // Memoize message items to prevent unnecessary re-renders
  const messageItems = useMemo(() => {
    return messages.map((message, index) => ({
      ...message,
      index,
      id: message.id || `msg-${index}`
    }));
  }, [messages]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (listRef.current && messages.length > 0) {
      listRef.current.scrollToItem(messages.length - 1, 'end');
    }
  }, [messages.length]);

  // Memoized message renderer for virtual list
  const MessageItem = useCallback(({ index, style }) => {
    const message = messageItems[index];
    
    return (
      <div style={style}>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2, delay: index * 0.05 }}
          className="px-4 py-2"
        >
          <ChatBubble
            message={message}
            onAction={onMessageAction}
          />
        </motion.div>
      </div>
    );
  }, [messageItems, onMessageAction]);

  // Calculate item height dynamically based on content
  const getItemSize = useCallback((index) => {
    const message = messageItems[index];
    if (!message) return 100;
    
    // Estimate height based on content length
    const baseHeight = 80;
    const contentHeight = Math.ceil(message.content?.length / 50) * 20;
    return Math.max(baseHeight, Math.min(contentHeight, 300));
  }, [messageItems]);

  // Handle container resize
  const [containerHeight, setContainerHeight] = React.useState(400);
  
  useEffect(() => {
    const updateHeight = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        setContainerHeight(rect.height);
      }
    };

    updateHeight();
    window.addEventListener('resize', updateHeight);
    return () => window.removeEventListener('resize', updateHeight);
  }, []);

  if (messageItems.length === 0 && !isLoading) {
    return (
      <div className={`flex items-center justify-center h-full ${className}`}>
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center text-gray-400"
        >
          <div className="text-6xl mb-4">💬</div>
          <p className="text-lg">Mulai percakapan baru</p>
          <p className="text-sm mt-2">Ketik pesan untuk memulai chat</p>
        </motion.div>
      </div>
    );
  }

  return (
    <div ref={containerRef} className={`relative h-full ${className}`}>
      {/* Virtual scrolling list for messages */}
      <List
        ref={listRef}
        height={containerHeight}
        itemCount={messageItems.length}
        itemSize={getItemSize}
        overscanCount={5}
        className="scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-transparent"
      >
        {MessageItem}
      </List>

      {/* Typing indicator */}
      <AnimatePresence>
        {isLoading && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="absolute bottom-0 left-0 right-0 px-4 py-2 bg-gradient-to-t from-[#0a0a0f] to-transparent"
          >
            <TypingIndicator />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Scroll to bottom button */}
      <ScrollToBottomButton 
        listRef={listRef}
        messageCount={messageItems.length}
      />
    </div>
  );
});

/**
 * Scroll to bottom button component
 */
const ScrollToBottomButton = memo(({ listRef, messageCount }) => {
  const [showButton, setShowButton] = React.useState(false);

  const handleScrollToBottom = useCallback(() => {
    if (listRef.current) {
      listRef.current.scrollToItem(messageCount - 1, 'end');
    }
  }, [listRef, messageCount]);

  // Show/hide button based on scroll position
  useEffect(() => {
    const checkScrollPosition = () => {
      if (listRef.current) {
        const { scrollOffset, scrollHeight, clientHeight } = listRef.current.state;
        const isNearBottom = scrollOffset + clientHeight >= scrollHeight - 100;
        setShowButton(!isNearBottom && messageCount > 0);
      }
    };

    const interval = setInterval(checkScrollPosition, 500);
    return () => clearInterval(interval);
  }, [listRef, messageCount]);

  return (
    <AnimatePresence>
      {showButton && (
        <motion.button
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.8 }}
          onClick={handleScrollToBottom}
          className="absolute bottom-4 right-4 bg-purple-600 hover:bg-purple-700 text-white p-3 rounded-full shadow-lg transition-colors duration-200 z-10"
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
          </svg>
        </motion.button>
      )}
    </AnimatePresence>
  );
});

OptimizedChatContainer.displayName = 'OptimizedChatContainer';
ScrollToBottomButton.displayName = 'ScrollToBottomButton';

export default OptimizedChatContainer;