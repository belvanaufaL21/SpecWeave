import { useState, useEffect } from 'react';

const CompactChatHistory = ({ onSelectChat, activeChatId, onNewChat }) => {
  const [chats, setChats] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadChatHistory();
    
    // Listen for localStorage changes
    const handleStorageChange = () => {
      loadChatHistory();
    };

    window.addEventListener('chatHistoryUpdated', handleStorageChange);
    return () => window.removeEventListener('chatHistoryUpdated', handleStorageChange);
  }, []);

  const loadChatHistory = () => {
    try {
      const savedHistory = localStorage.getItem('specweave_chat_history');
      const savedChats = localStorage.getItem('specweave_chats');
      
      if (savedHistory && savedChats) {
        const history = JSON.parse(savedHistory);
        const chatsData = JSON.parse(savedChats);
        
        // Combine history with chat data for preview
        const enrichedChats = history.map(chat => {
          const chatMessages = chatsData[chat.id] || [];
          const lastMessage = chatMessages[chatMessages.length - 1];
          
          return {
            ...chat,
            messageCount: chatMessages.length,
            lastMessage: lastMessage?.content || 'No messages yet',
            lastMessageTime: lastMessage?.createdAt || chat.timestamp,
            hasScenarios: chatMessages.some(m => m.role === 'assistant')
          };
        });
        
        setChats(enrichedChats);
      }
    } catch (error) {
      console.error('Error loading chat history:', error);
    }
  };

  const filteredChats = chats.filter(chat => 
    chat.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    chat.lastMessage.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInHours = (now - date) / (1000 * 60 * 60);
    
    if (diffInHours < 1) {
      return 'Just now';
    } else if (diffInHours < 24) {
      return `${Math.floor(diffInHours)}h ago`;
    } else {
      return date.toLocaleDateString();
    }
  };

  const truncateMessage = (message, maxLength = 60) => {
    if (message.length <= maxLength) return message;
    return message.substring(0, maxLength) + '...';
  };

  const getMessagePreview = (message) => {
    // Remove markdown and clean up the message for preview
    return message
      .replace(/```[\s\S]*?```/g, '[Code Block]')
      .replace(/\*\*(.*?)\*\*/g, '$1')
      .replace(/\*(.*?)\*/g, '$1')
      .replace(/`(.*?)`/g, '$1')
      .replace(/\n/g, ' ')
      .trim();
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-white/5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-bold text-white">Chats</h2>
          <button
            onClick={onNewChat}
            className="p-1.5 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
            title="New Chat"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          </button>
        </div>
        
        {/* Search */}
        <div className="relative">
          <svg className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            placeholder="Search chats..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:border-purple-500/50 focus:bg-white/10 transition-colors"
          />
        </div>
      </div>

      {/* Chat List */}
      <div className="flex-1 overflow-y-auto">
        {filteredChats.length === 0 ? (
          <div className="p-4 text-center text-gray-500">
            <svg className="w-12 h-12 mx-auto mb-3 opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
            </svg>
            <p className="text-sm">No chats found</p>
            <button
              onClick={onNewChat}
              className="mt-2 text-xs text-purple-400 hover:text-purple-300 transition-colors"
            >
              Start your first chat
            </button>
          </div>
        ) : (
          <div className="p-2">
            {filteredChats.map((chat) => (
              <div
                key={chat.id}
                onClick={() => onSelectChat(chat.id)}
                className={`group relative p-3 rounded-xl cursor-pointer transition-all duration-200 mb-1 ${
                  activeChatId === chat.id.toString()
                    ? 'bg-white/10 border border-white/10'
                    : 'hover:bg-white/5'
                }`}
              >
                <div className="flex items-start gap-3">
                  {/* Avatar */}
                  <div className="flex-shrink-0 w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                    </svg>
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <h3 className="text-sm font-semibold text-white truncate pr-2">
                        {chat.title}
                      </h3>
                      <span className="text-xs text-gray-500 flex-shrink-0">
                        {formatTime(chat.lastMessageTime)}
                      </span>
                    </div>
                    
                    <p className="text-xs text-gray-400 line-clamp-2 leading-relaxed">
                      {truncateMessage(getMessagePreview(chat.lastMessage))}
                    </p>
                    
                    {/* Indicators */}
                    <div className="flex items-center gap-2 mt-2">
                      <div className="flex items-center gap-1 text-xs text-gray-500">
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                        </svg>
                        <span>{chat.messageCount}</span>
                      </div>
                      
                      {chat.hasScenarios && (
                        <div className="flex items-center gap-1 text-xs text-green-500">
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                          <span>Scenarios</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Active indicator */}
                {activeChatId === chat.id.toString() && (
                  <div className="absolute left-0 top-1/2 transform -translate-y-1/2 w-1 h-8 bg-gradient-to-b from-purple-500 to-pink-500 rounded-r-full"></div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default CompactChatHistory;