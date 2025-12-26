import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import DeleteConfirmationModal from '../modals/DeleteConfirmationModal';

const ChatHistory = () => {
  const navigate = useNavigate();
  const [chats, setChats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [chatToDelete, setChatToDelete] = useState(null);

  useEffect(() => {
    loadChatHistory();
    
    // Listen for localStorage changes
    const handleStorageChange = (e) => {
      if (e.key === 'specweave_chat_history' || e.key === 'specweave_chats') {
        loadChatHistory();
      }
    };
    
    window.addEventListener('storage', handleStorageChange);
    
    // Also listen for custom events (for same-tab updates)
    const handleChatUpdate = () => {
      loadChatHistory();
    };
    
    window.addEventListener('chatHistoryUpdated', handleChatUpdate);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('chatHistoryUpdated', handleChatUpdate);
    };
  }, []);

  const loadChatHistory = () => {
    try {
      setLoading(true);
      
      // Load from localStorage
      const savedHistory = localStorage.getItem('specweave_chat_history');
      const savedChats = localStorage.getItem('specweave_chats');
      
      if (savedHistory && savedChats) {
        const history = JSON.parse(savedHistory);
        const chatsData = JSON.parse(savedChats);
        
        // Validate data structure
        if (Array.isArray(history) && typeof chatsData === 'object') {
          // Combine history with chat data and sort by last updated
          const enrichedHistory = history
            .filter(item => item && item.id) // Filter out invalid items
            .map(item => ({
              ...item,
              messages: chatsData[item.id] || [],
              messageCount: (chatsData[item.id] || []).length,
              // Ensure timestamp exists for sorting
              timestamp: item.timestamp || new Date().toISOString()
            }))
            .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
            .slice(0, 10); // Show last 10 chats
          
          setChats(enrichedHistory);
        } else {
          setChats([]);
        }
      } else {
        setChats([]);
      }
    } catch (error) {
      console.error('Error loading chat history:', error);
      setChats([]);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenChat = (chatId) => {
    // Navigate to chat page with the chat ID
    navigate(`/chat?id=${chatId}`);
  };

  const handleDeleteChat = (chatId, e) => {
    e.stopPropagation();
    
    const chat = chats.find(c => c.id === chatId);
    setChatToDelete({ id: chatId, title: chat?.title || 'Untitled Chat' });
    setIsDeleteModalOpen(true);
  };

  const confirmDeleteChat = () => {
    if (!chatToDelete) return;

    try {
      // Remove from history
      const savedHistory = localStorage.getItem('specweave_chat_history');
      if (savedHistory) {
        const history = JSON.parse(savedHistory);
        const newHistory = history.filter(item => item.id !== chatToDelete.id);
        localStorage.setItem('specweave_chat_history', JSON.stringify(newHistory));
      }

      // Remove from chats
      const savedChats = localStorage.getItem('specweave_chats');
      if (savedChats) {
        const chatsData = JSON.parse(savedChats);
        delete chatsData[chatToDelete.id];
        localStorage.setItem('specweave_chats', JSON.stringify(chatsData));
      }

      // Clear active chat if it's the one being deleted
      const activeChat = localStorage.getItem('specweave_active_chat_id');
      if (activeChat === chatToDelete.id.toString()) {
        localStorage.removeItem('specweave_active_chat_id');
      }

      // Reload chat history
      loadChatHistory();
      
      // Dispatch event to notify other components
      window.dispatchEvent(new CustomEvent('chatHistoryUpdated'));

      // Close modal and reset state
      setIsDeleteModalOpen(false);
      setChatToDelete(null);
    } catch (error) {
      console.error('Error deleting chat:', error);
    }
  };

  const formatDate = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
    });
  };

  const getPreviewText = (messages) => {
    if (!messages || messages.length === 0) return 'No messages yet';
    
    // Get last user message
    const lastUserMessage = [...messages].reverse().find(m => m.role === 'user');
    if (lastUserMessage) {
      return lastUserMessage.content.substring(0, 100) + (lastUserMessage.content.length > 100 ? '...' : '');
    }
    
    return 'Chat session';
  };

  if (loading) {
    return (
      <div className="bg-[#16161e] border border-white/10 rounded-xl p-4">
        <div className="animate-pulse">
          <div className="h-5 bg-gray-700 rounded mb-4 w-32"></div>
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-16 bg-gray-700 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#16161e] border border-white/10 rounded-xl p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-base font-semibold text-white">Recent Chats</h3>
        <div className="text-sm text-gray-400">
          {chats.length} chat{chats.length !== 1 ? 's' : ''}
        </div>
      </div>

      {chats.length === 0 ? (
        <div className="text-center py-8">
          <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-gray-500/20 flex items-center justify-center">
            <svg className="w-6 h-6 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
          </div>
          <p className="text-gray-400 text-sm">No chat history yet</p>
          <p className="text-gray-500 text-xs mt-1">Start a new chat to see it here</p>
        </div>
      ) : (
        <div className="space-y-2">
          {chats.map((chat) => (
            <div
              key={chat.id}
              className="relative w-full p-3 bg-[#0a0a0f] border border-white/10 rounded-lg hover:border-purple-500/50 transition-all group cursor-pointer"
              onClick={() => handleOpenChat(chat.id)}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="text-white text-sm font-medium truncate">
                      {chat.title || 'Untitled Chat'}
                    </h4>
                    <span className="px-2 py-0.5 text-xs rounded bg-purple-500/20 text-purple-400 border border-purple-500/30">
                      {chat.messageCount} msg{chat.messageCount !== 1 ? 's' : ''}
                    </span>
                  </div>
                  
                  <div className="text-gray-400 text-xs line-clamp-2 mb-1">
                    {getPreviewText(chat.messages)}
                  </div>
                  
                  <div className="flex items-center gap-3 text-xs text-gray-500">
                    <span>{formatDate(chat.timestamp)}</span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1 ml-3 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={(e) => handleDeleteChat(chat.id, e)}
                    className="p-1.5 text-gray-400 hover:text-red-400 transition-colors z-10 relative"
                    title="Delete Chat"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {chats.length > 0 && (
        <div className="mt-4 pt-3 border-t border-white/10">
          <button
            onClick={() => {
              // Clear active chat ID to ensure new chat
              localStorage.removeItem('specweave_active_chat_id');
              navigate('/chat');
            }}
            className="w-full px-3 py-2 text-sm text-purple-400 hover:text-purple-300 transition-colors flex items-center justify-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Start New Chat
          </button>
        </div>
      )}

      <DeleteConfirmationModal
        isOpen={isDeleteModalOpen}
        onClose={() => {
          setIsDeleteModalOpen(false);
          setChatToDelete(null);
        }}
        onConfirm={confirmDeleteChat}
        title="Delete Chat"
        message="Are you sure you want to delete this chat? All messages and conversation history will be permanently removed."
        itemName={chatToDelete?.title}
        confirmText="Delete Chat"
        cancelText="Keep Chat"
        isDangerous={true}
      />
    </div>
  );
};

export default ChatHistory;
