/**
 * Chat Count Indicator Component
 * Shows total number of chats and search results
 */
const ChatCountIndicator = ({ 
  filteredCount, 
  totalCount, 
  searchQuery,
  showThreshold = 10 
}) => {
  
  // Only show if we have more chats than threshold
  if (filteredCount <= showThreshold) {
    return null;
  }

  return (
    <div className="mb-3">
      <div className="text-xs text-gray-500 rounded-lg px-3 py-2 text-center border border-gray-700/30 flex items-center justify-center gap-2" style={{ backgroundColor: '#0D0D0D' }}>
        {/* Chat Icon */}
        <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
        </svg>
        
        {/* Count Text */}
        <span>
          {searchQuery ? (
            <>
              <span className="font-medium text-white">{filteredCount}</span>
              <span className="text-gray-400"> of </span>
              <span className="font-medium text-gray-300">{totalCount}</span>
              <span className="text-gray-400"> conversations</span>
            </>
          ) : (
            <>
              <span className="font-medium text-white">{filteredCount}</span>
              <span className="text-gray-400"> conversations</span>
            </>
          )}
        </span>
        
        {/* Search indicator */}
        {searchQuery && (
          <div className="flex items-center gap-1 ml-2 px-2 py-1 bg-purple-600/20 rounded-md border border-purple-500/30">
            <svg className="w-3 h-3 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <span className="text-xs text-purple-300">filtered</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default ChatCountIndicator;