import { useState, useCallback, useRef, useEffect } from 'react';

import { generateGherkin } from '../services/EnhancedSpecWeaveService';

export const useChat = () => {
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [currentChatId, setCurrentChatId] = useState(null);
  const [loadingChats, setLoadingChats] = useState({}); // Track loading per chat
  const abortControllerRef = useRef(null);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  const sendMessage = useCallback(async (userStory, options = {}) => {
    if (!userStory.trim()) return;

    // Extract chatId and callback from options
    const chatId = options.chatId;
    const onMessageReceived = options.onMessageReceived; // Callback to save directly to context
    const skipUserMessage = options.skipUserMessage || false; // Flag to skip creating user message (for edits)
    
    if (!chatId) {
      console.error('❌ [USE-CHAT] No chatId provided to sendMessage');
      return;
    }

    console.log('📤 [USE-CHAT-v2] sendMessage called at', new Date().toISOString(), {
      chatId,
      userStory: userStory.substring(0, 50),
      hasCallback: !!onMessageReceived,
      skipUserMessage
    });

    // Set current chat ID for this request
    setCurrentChatId(chatId);
    
    // Set loading for this specific chat
    setLoadingChats(prev => ({ ...prev, [chatId]: true }));

    // Cancel previous request if still running
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Create new AbortController for this request
    abortControllerRef.current = new AbortController();

    setError(null);
    setIsLoading(true);
    
    // CRITICAL FIX: Only create and save user message if not skipped (for new messages, not edits)
    if (!skipUserMessage) {
      const userMessage = {
        id: `msg_user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        role: 'user',
        content: userStory,
        createdAt: new Date(),
        timestamp: new Date().toISOString(),
        chatId: chatId
      };
      
      console.log('💬 [USE-CHAT-v2] Created user message:', {
        id: userMessage.id,
        role: userMessage.role,
        chatId: userMessage.chatId
      });
      
      // CRITICAL: Save user message to context BEFORE sending to AI
      if (onMessageReceived) {
        console.log('💾 [USE-CHAT-v2] Saving user message to context first');
        await onMessageReceived(userMessage, chatId);
      }
    } else {
      console.log('⏭️ [USE-CHAT-v2] Skipping user message creation (edit mode)');
    }

    try {
      // Log epic context if available
      if (options.epicContext) {
        console.log('📤 [USE-CHAT] Sending message with epic context:', {
          hasEpic: !!options.epicContext.epicData?.epic,
          epicKey: options.epicContext.epicData?.epic?.key,
          epicName: options.epicContext.epicData?.epic?.name,
          projectKey: options.epicContext.epicData?.connection?.project_key
        });
      } else {
        console.log('📤 [USE-CHAT] Sending message without epic context');
      }

      const response = await generateGherkin(userStory, {
        ...options,
        signal: abortControllerRef.current.signal
      });
      
      // Check if response is successful
      if (response.success) {
        // Handle different response types
        let aiMessage;
        
        if (response.data.type === 'general') {
          // General LLM response (non-Connextra)
          const messageId = `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
          aiMessage = {
            id: messageId,
            role: 'ai',
            content: response.data.content,
            responseType: 'general',
            isConnextra: false,
            formatDetection: response.data.formatDetection,
            message: response.data.message,
            timestamp: new Date().toISOString(),
            chatId: chatId
          };
        } else {
          // Gherkin response (Connextra format)
          const messageId = `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
          aiMessage = {
            id: messageId,
            role: 'ai',
            content: response.data.gherkin,
            responseType: 'gherkin',
            isConnextra: true,
            formatDetection: response.data.formatDetection,
            qualityMetrics: response.data.quality_metrics,
            performanceMetrics: response.data.performance_metrics,
            referenceInfo: response.data.referenceInfo,
            usedReferences: response.data.usedReferences || [],
            metadata: response.data.metadata || {},
            timestamp: new Date().toISOString(),
            chatId: chatId
          };
        }

        // CRITICAL FIX: Stop loading IMMEDIATELY after receiving AI response
        // Don't wait for database save to complete
        setIsLoading(false);
        setLoadingChats(prev => ({ ...prev, [chatId]: false }));
        setCurrentChatId(null);
        
        // CRITICAL: Save directly to context via callback instead of hook state
        // This happens in background, doesn't block UI
        if (onMessageReceived) {
          console.log('💾 [USE-CHAT] Saving AI message to context for chat:', chatId);
          onMessageReceived(aiMessage, chatId).catch(err => {
            console.error('❌ [USE-CHAT] Error saving message to context:', err);
          });
        } else {
          // Fallback: add to hook state (old behavior)
          setMessages(prev => [...prev, aiMessage]);
        }
      } else {
        throw new Error(response.error || 'Failed to generate response');
      }
    } catch (err) {
      // Ignore abort errors (user switched chat)
      if (err.name === 'AbortError' || err.message === 'canceled') {
        console.log('🚫 [USE-CHAT] Request aborted (user switched chat)');
        setCurrentChatId(null);
        setLoadingChats(prev => ({ ...prev, [chatId]: false }));
        return;
      }

      const errorMessage = err.response?.data?.error || 'Failed to generate Gherkin. Please try again.';
      setError(errorMessage);
      
      // Stop loading before showing error
      setIsLoading(false);
      setLoadingChats(prev => ({ ...prev, [chatId]: false }));
      setCurrentChatId(null);
      
      // Add error message to chat
      const errorMessageId = `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const errorMsg = {
        id: errorMessageId,
        role: 'error',
        content: errorMessage,
        timestamp: new Date().toISOString(),
        chatId: chatId
      };

      // Save error directly to context (in background)
      if (onMessageReceived) {
        onMessageReceived(errorMsg, chatId).catch(err => {
          console.error('❌ [USE-CHAT] Error saving error message:', err);
        });
      } else {
        setMessages(prev => [...prev, errorMsg]);
      }
    }
  }, []);

  const clearMessages = useCallback(() => {
    setMessages([]);
    setError(null);
  }, []);

  const loadMessages = useCallback((messagesArray) => {
    setMessages(messagesArray || []);
    setError(null);
  }, []);

  // Helper to check if a specific chat is loading - Simple function without logging loop
  const isChatLoading = (chatId) => {
    return loadingChats[chatId] || false;
  };

  // Helper to check if ANY chat is loading
  const isAnyLoading = () => {
    return Object.values(loadingChats).some(loading => loading === true);
  };

  return {
    messages,
    isLoading,
    error,
    currentChatId,
    loadingChats,
    isChatLoading,
    isAnyLoading,
    sendMessage,
    clearMessages,
    loadMessages
  };
};

export default useChat;
