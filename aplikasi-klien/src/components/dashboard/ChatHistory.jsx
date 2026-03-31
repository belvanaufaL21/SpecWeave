import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import DeleteConfirmationModal from '../modals/DeleteConfirmationModal';
import { useChat } from '../../contexts/ChatContext';
import { formatRelativeTime, formatDate } from '../../utils/localization';

const ChatHistory = () => {
  const navigate = useNavigate();
  const { 
    getRecentChats, 
    deleteChat, 
    loading, 
    lastUpdated 
  } = useChat();
  
  const [chats, setChats] = useState([]);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [chatToDelete, setChatToDelete] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('recent'); // 'recent', 'oldest', 'messages'

  // Update chats when context data changes
  useEffect(() => {
    const recentChats = getRecentChats(50); // Get more chats for filtering
    setChats(recentChats);
  }, [getRecentChats, lastUpdated]);

  // Filter and sort chats based on search query and sort option
  const filteredAndSortedChats = useMemo(() => {
    let filtered = chats;

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = chats.filter(chat => {
        const title = (chat.title || '').toLowerCase();
        const preview = getPreviewText(chat.messages).toLowerCase();
        return title.includes(query) || preview.includes(query);
      });
    }

    // Apply sorting
    const sorted = [...filtered].sort((a, b) => {
      switch (sortBy) {
        case 'oldest':
          return new Date(a.timestamp) - new Date(b.timestamp);
        case 'messages':
          return (b.messageCount || 0) - (a.messageCount || 0);
        case 'recent':
        default:
          return new Date(b.timestamp) - new Date(a.timestamp);
      }
    });

    // Limit to 10 for display
    return sorted.slice(0, 10);
  }, [chats, searchQuery, sortBy]);

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

  const confirmDeleteChat = async () => {
    if (!chatToDelete) return;

    try {
      console.log('🗑️ [CHAT-HISTORY] Deleting chat:', chatToDelete.id);
      
      const result = await deleteChat(chatToDelete.id);
      
      if (result.success) {
        
      } else {
        console.error('❌ [CHAT-HISTORY] Failed to delete chat:', result.error);
      }

      // Close modal and reset state
      setIsDeleteModalOpen(false);
      setChatToDelete(null);
    } catch (error) {
      console.error('❌ [CHAT-HISTORY] Error deleting chat:', error);
    }
  };

  const formatChatDate = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffDays = Math.floor((now - date) / 86400000);

    if (diffDays < 7) {
      return formatRelativeTime(timestamp);
    }
    
    return formatDate(timestamp, {
      month: 'short',
      day: 'numeric',
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
    });
  };

  const getPreviewText = (messages) => {
    if (!messages || messages.length === 0) return 'Belum ada pesan';
    
    // Get last user message
    const lastUserMessage = [...messages].reverse().find(m => m.role === 'user');
    if (lastUserMessage) {
      return lastUserMessage.content.substring(0, 100) + (lastUserMessage.content.length > 100 ? '...' : '');
    }
    
    return 'Sesi chat';
  };

  const clearSearch = () => {
    setSearchQuery('');
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="animate-pulse">
          <div className="h-5 bg-gray-700 rounded mb-4 w-32"></div>
          <div className="h-10 bg-gray-700 rounded mb-4"></div>
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
    <div className="space-y-6">
      {/* Header with elegant styling */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500/20 to-pink-500/20 border border-purple-500/20 flex items-center justify-center">
            <svg className="w-4 h-4 text-purple-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
          </div>
          <h3 className="text-xl font-bold text-white">Chat History</h3>
        </div>
        <div className="px-3 py-1 bg-white/5 border border-white/10 rounded-lg text-sm text-gray-400">
          {filteredAndSortedChats.length} of {chats.length}
        </div>
      </div>

      {/* Search and Filter Controls - Enhanced */}
      <div className="space-y-4">
        {/* Search Input */}
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
            <svg className="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <input
            type="text"
            placeholder="Search conversations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-12 pr-12 py-3 bg-[#0a0a0f]/60 border border-white/10 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50 transition-all backdrop-blur-sm"
          />
          {searchQuery && (
            <button
              onClick={clearSearch}
              className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 hover:text-white transition-colors"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>

        {/* Sort Options */}
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-400 font-medium">Sort by:</span>
          <div className="flex gap-2">
            {[
              { value: 'recent', label: 'Recent', icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z' },
              { value: 'oldest', label: 'Oldest', icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z' },
              { value: 'messages', label: 'Messages', icon: 'M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z' }
            ].map((option) => (
              <button
                key={option.value}
                onClick={() => setSortBy(option.value)}
                className={`flex items-center gap-2 px-3 py-2 text-xs rounded-lg transition-all ${
                  sortBy === option.value
                    ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30 shadow-lg shadow-purple-500/10'
                    : 'bg-white/5 text-gray-400 border border-white/10 hover:bg-white/10 hover:text-white hover:border-white/20'
                }`}
              >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={option.icon} />
                </svg>
                {option.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Chat List - Enhanced Cards */}
      {filteredAndSortedChats.length === 0 ? (
        <div className="text-center py-12">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-purple-500/10 to-pink-500/10 border border-white/10 flex items-center justify-center">
            {searchQuery ? (
              <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            ) : (
              <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            )}
          </div>
          <h4 className="text-white font-semibold mb-2">
            {searchQuery ? 'No matching conversations' : 'No chat history yet'}
          </h4>
          <p className="text-gray-400 text-sm mb-4 max-w-sm mx-auto">
            {searchQuery ? `No conversations found matching "${searchQuery}"` : 'Start a new conversation to see it appear here'}
          </p>
          {searchQuery && (
            <button
              onClick={clearSearch}
              className="px-4 py-2 text-sm text-purple-400 hover:text-purple-300 transition-colors border border-purple-500/30 rounded-lg hover:bg-purple-500/10"
            >
              Clear search
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {filteredAndSortedChats.map((chat) => (
            <div
              key={chat.id}
              className="group relative w-full p-4 bg-[#0a0a0f]/60 backdrop-blur-sm border border-white/10 rounded-xl hover:border-purple-500/30 hover:bg-[#0a0a0f]/80 transition-all cursor-pointer hover:shadow-lg hover:shadow-purple-500/5"
              onClick={(e) => {
                // Only navigate if click is not on action buttons
                if (!e.target.closest('button')) {
                  handleOpenChat(chat.id);
                }
              }}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500/20 to-pink-500/20 border border-purple-500/20 flex items-center justify-center flex-shrink-0">
                      <svg className="w-4 h-4 text-purple-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                      </svg>
                    </div>
                    <h4 className="text-white text-sm font-semibold truncate flex-1">
                      {chat.title || 'Untitled Conversation'}
                    </h4>
                    <span className="px-2 py-1 text-xs rounded-lg bg-purple-500/20 text-purple-300 border border-purple-500/30 font-medium">
                      {chat.messageCount}
                    </span>
                  </div>
                  
                  <div className="text-gray-400 text-sm line-clamp-2 mb-3 leading-relaxed">
                    {getPreviewText(chat.messages)}
                  </div>
                  
                  <div className="flex items-center gap-4 text-xs text-gray-500">
                    <div className="flex items-center gap-1">
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span>{formatChatDate(chat.timestamp)}</span>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1 ml-4 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      console.log('🗑️ [SIDEBAR] Delete button clicked for chat:', chat.id);
                      handleDeleteChat(chat.id, e);
                    }}
                    className="p-2 text-gray-400 hover:text-red-400 hover:bg-red-500/10 transition-all duration-200 z-20 relative pointer-events-auto rounded-lg border border-transparent hover:border-red-500/30"
                    title="Delete Chat"
                  >
                    <svg className="w-4 h-4 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* New Chat Button */}
      {filteredAndSortedChats.length > 0 && (
        <div className="mt-6 pt-4 border-t border-white/10">
          <button
            onClick={() => {
              // Navigate to chat page to show LLM interface
              navigate('/chat');
            }}
            className="w-full px-4 py-3 text-sm text-purple-300 hover:text-white transition-colors flex items-center justify-center gap-2 bg-white/5 hover:bg-purple-500/10 border border-white/10 hover:border-purple-500/30 rounded-xl"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Start New Conversation
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
        title="Hapus Chat"
        message="Apakah Anda yakin ingin menghapus chat ini? Semua pesan dan riwayat percakapan akan dihapus secara permanen."
        itemName={chatToDelete?.title}
        confirmText="Hapus"
        cancelText="Batal"
        isDangerous={true}
      />
    </div>
  );
};

export default ChatHistory;
