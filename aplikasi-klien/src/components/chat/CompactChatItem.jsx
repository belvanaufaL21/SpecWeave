/**
 * Compact Chat Item Component for efficient rendering of many chats
 * Optimized for performance and space efficiency
 */
const CompactChatItem = ({ 
  chat, 
  isActive, 
  isEditing, 
  isDropdownOpen,
  editingTitle,
  onSelect,
  onToggleDropdown,
  onStartRename,
  onRenameChat,
  onCancelRename,
  onDeleteChat,
  setEditingTitle,
  formatTime,
  getMessagePreview
}) => {
  
  return (
    <div
      className={`group relative rounded-xl transition-all duration-200 cursor-pointer ${
        isActive 
          ? 'border shadow-lg' 
          : 'border border-transparent'
      }`}
      style={
        isEditing 
          ? { backgroundColor: '#0D0D0D', borderColor: 'rgba(255, 255, 255, 0.05)' }
          : isActive 
            ? { backgroundColor: '#160D14', borderColor: '#44273D' } 
            : { backgroundColor: 'transparent' }
      }
      onMouseEnter={(e) => {
        if (!isActive && !isEditing) {
          e.currentTarget.style.backgroundColor = '#0D0D0D';
          e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.05)';
        }
      }}
      onMouseLeave={(e) => {
        if (!isActive && !isEditing) {
          e.currentTarget.style.backgroundColor = 'transparent';
          e.currentTarget.style.borderColor = 'transparent';
        }
      }}
    >
      <div className="flex items-center gap-3 p-3">
        {/* Compact Content */}
        <div 
          className="flex-1 min-w-0"
          onClick={() => !isEditing && !isDropdownOpen && onSelect(chat.id)}
        >
          <div className="flex items-center justify-between mb-1">
            {isEditing ? (
              <input
                type="text"
                value={editingTitle}
                onChange={(e) => setEditingTitle(e.target.value)}
                onBlur={() => onRenameChat(chat.id, editingTitle)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    onRenameChat(chat.id, editingTitle);
                  } else if (e.key === 'Escape') {
                    onCancelRename();
                  }
                }}
                className="text-sm font-medium text-white rounded-lg px-2 py-1 w-full focus:outline-none"
                style={{
                  backgroundColor: '#0D0D0D'
                }}
                autoFocus
              />
            ) : (
              <>
                <div className="flex-1 min-w-0 pr-3">
                  <h3 className={`text-sm font-medium truncate mb-1 ${
                    isActive ? 'text-white' : 'text-gray-200 group-hover:text-white'
                  }`}>
                    {chat.title || 'Untitled'}
                  </h3>
                  <p className={`text-xs truncate ${
                    isActive ? 'text-gray-300' : 'text-gray-400'
                  }`}>
                    {getMessagePreview(chat.id)}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-1 flex-shrink-0">
                  <span className="text-xs text-gray-500">
                    {formatTime(chat.timestamp)}
                  </span>
                  {/* Compact Dropdown Menu */}
                  <div className="relative">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onToggleDropdown(chat.id);
                      }}
                      className="p-1 rounded-lg hover:bg-gray-700/50 text-gray-400 hover:text-white transition-colors opacity-0 group-hover:opacity-100"
                      id={`menu-button-${chat.id}`}
                    >
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
                      </svg>
                    </button>

                    {/* Dropdown Menu - Fixed positioning to escape overflow */}
                    {isDropdownOpen && (
                      <div 
                        className="fixed w-40 rounded-lg shadow-xl z-[9999] py-1"
                        style={{
                          backgroundColor: '#0D0D0D',
                          border: '1px solid rgba(255, 255, 255, 0.05)',
                          left: `${document.getElementById(`menu-button-${chat.id}`)?.getBoundingClientRect().right + 8}px`,
                          top: `${document.getElementById(`menu-button-${chat.id}`)?.getBoundingClientRect().top}px`
                        }}
                      >
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onStartRename(chat.id, chat.title);
                            onToggleDropdown(null);
                          }}
                          className="w-full px-4 py-2 text-left text-sm text-gray-300 hover:bg-gray-700 hover:text-white flex items-center gap-2"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                          Rename
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onDeleteChat(chat.id);
                            onToggleDropdown(null);
                          }}
                          className="w-full px-4 py-2 text-left text-sm hover:bg-red-600/20 flex items-center gap-2"
                          style={{ color: '#EE4038' }}
                          onMouseEnter={(e) => e.currentTarget.style.color = '#f1554d'}
                          onMouseLeave={(e) => e.currentTarget.style.color = '#EE4038'}
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                          Delete Chat
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CompactChatItem;