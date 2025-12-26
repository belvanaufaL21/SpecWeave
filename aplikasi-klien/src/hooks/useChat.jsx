import { useState, useCallback } from 'react';

import { generateGherkin } from '../services/specWeaveService';


export const useChat = () => {
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const sendMessage = useCallback(async (userStory, options = {}) => {
    if (!userStory.trim()) return;

    setError(null);
    setIsLoading(true);

    try {
      const response = await generateGherkin(userStory, options);
      
      // Check if response is successful
      if (response.success) {
        // Add AI response with quality metrics
        const aiMessage = {
          id: Date.now() + 1,
          role: 'ai', // Changed from 'type' to 'role' to match ChatBubble expectations
          content: response.data.gherkin, // FIXED: Use response.data.gherkin instead of response.content
          qualityMetrics: response.data.quality_metrics, // FIXED: Use response.data.quality_metrics
          performanceMetrics: response.data.performance_metrics, // FIXED: Use response.data.performance_metrics
          timestamp: new Date().toISOString()
        };
        
        setMessages(prev => [...prev, aiMessage]);
      } else {
        throw new Error(response.error || 'Failed to generate Gherkin'); // FIXED: Use response.error instead of response.content
      }
    } catch (err) {
      const errorMessage = err.response?.data?.error || 'Failed to generate Gherkin. Please try again.';
      setError(errorMessage);
      
      // Add error message to chat
      const errorMsg = {
        id: Date.now() + 1,
        role: 'error', // Changed from 'type' to 'role' to match ChatBubble expectations
        content: errorMessage,
        timestamp: new Date().toISOString()
      };
      
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
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

  return {
    messages,
    isLoading,
    error,
    sendMessage,
    clearMessages,
    loadMessages
  };
};

export default useChat;
