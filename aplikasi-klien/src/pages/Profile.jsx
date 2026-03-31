import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';
import { useJira } from '../contexts/JiraContext';
import { useChat as useChatContext } from '../contexts/ChatContext';
import toast from 'react-hot-toast';
import Logo from '../components/common/Logo';
import CompactChatItem from '../components/chat/CompactChatItem';
import ChatCountIndicator from '../components/chat/ChatCountIndicator';
import TemplateModal from '../components/modals/TemplateModal';
import JiraProjectManagementModal from '../components/modals/JiraProjectManagementModal';
import JiraSetupModal from '../components/modals/JiraSetupModal';
import ReferenceLibraryWithAutoSettings from '../components/common/ReferenceLibraryWithAutoSettings';
import ErrorBoundary from '../components/common/ErrorBoundary';

const Profile = () => {
  const { user, profile, updateProfile, signOut } = useAuth();
  const navigate = useNavigate();
  
  // Chat Context
  const { 
    chats: contextChats, 
    history: contextHistory, 
    renameChat: contextRenameChat,
    deleteChat: contextDeleteChat,
  } = useChatContext();
  
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    name: (profile?.name && typeof profile.name === 'string') ? profile.name : '',
    email: (user?.email && typeof user.email === 'string') ? user.email : ''
  });

  // Modal states
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);
  const [isReferenceLibraryOpen, setIsReferenceLibraryOpen] = useState(false);
  const [isJiraProjectModalOpen, setIsJiraProjectModalOpen] = useState(false);

  // Chat sidebar states
  const [searchQuery, setSearchQuery] = useState('');
  const [editingChatId, setEditingChatId] = useState(null);
  const [editingTitle, setEditingTitle] = useState('');
  const [dropdownChatId, setDropdownChatId] = useState(null);

  // JIRA Context
  const { 
    hasConnection: hasJiraConnection,
    isJiraSetupModalOpen,
    openJiraSetupModal,
    closeJiraSetupModal
  } = useJira();

  // Sidebar state
  const [isHovered, setIsHovered] = useState(false);
  const [isPinned, setIsPinned] = useState(false);
  const [ignoreHover, setIgnoreHover] = useState(false);

  const isSidebarVisible = isPinned || (isHovered && !ignoreHover);

  // Sidebar handlers - same as ChatRefined
  const handleToggleSidebar = () => {
    if (isPinned) {
      setIsPinned(false);
      setIsHovered(false); 
      setIgnoreHover(true);
      setTimeout(() => setIgnoreHover(false), 600); 
    } else {
      setIsPinned(true);
    }
  };

  const handleTriggerEnter = () => {
    if (!isPinned && !ignoreHover) {
      setIsHovered(true);
    }
  };

  const handleEdit = () => {
    try {
      setEditForm({
        name: (profile?.name && typeof profile.name === 'string') ? profile.name : '',
        email: (user?.email && typeof user.email === 'string') ? user.email : ''
      });
      setIsEditing(true);
    } catch (error) {
      setEditForm({ name: '', email: '' });
      setIsEditing(true);
    }
  };

  const handleSave = async () => {
    try {
      const result = await updateProfile({ name: editForm.name });
      if (result.error) {
        toast.error('Failed to update profile: ' + result.error.message);
      } else {
        toast.success('Profile updated successfully!');
        setIsEditing(false);
      }
    } catch (error) {
      toast.error('Failed to update profile');
    }
  };

  const handleCancel = () => {
    try {
      setIsEditing(false);
      setEditForm({
        name: (profile?.name && typeof profile.name === 'string') ? profile.name : '',
        email: (user?.email && typeof user.email === 'string') ? user.email : ''
      });
    } catch (error) {
      setIsEditing(false);
      setEditForm({ name: '', email: '' });
    }
  };

  const getInitials = (name, email) => {
    try {
      if (name && typeof name === 'string' && name.trim()) {
        return name.trim().split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
      }
      if (email && typeof email === 'string' && email.trim()) {
        return email.trim().slice(0, 2).toUpperCase();
      }
      return 'U';
    } catch (error) {
      return 'U';
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      navigate('/', { replace: true });
    } catch (error) {
      console.error('Sign out error:', error);
      navigate('/', { replace: true });
    }
  };

  const handleJiraSetup = () => {
    openJiraSetupModal();
  };

  const handleJiraProjects = () => {
    setIsJiraProjectModalOpen(true);
  };

  const handleAddNewProject = () => {
    setIsJiraProjectModalOpen(false);
    openJiraSetupModal();
  };

  // Chat handlers - same as ChatRefined
  const handleSelectChat = (id) => {
    navigate(`/chat?id=${id}`);
  };

  const handleToggleDropdown = (chatId) => {
    setDropdownChatId(dropdownChatId === chatId ? null : chatId);
  };

  const handleStartRename = (chatId, currentTitle) => {
    setEditingChatId(chatId);
    setEditingTitle(currentTitle);
    setDropdownChatId(null);
  };

  const handleRenameChat = async (chatId) => {
    if (editingTitle.trim()) {
      await contextRenameChat(chatId, editingTitle.trim());
    }
    setEditingChatId(null);
    setEditingTitle('');
  };

  const handleCancelRename = () => {
    setEditingChatId(null);
    setEditingTitle('');
  };

  const handleDeleteChat = async (chatId) => {
    await contextDeleteChat(chatId);
    setDropdownChatId(null);
  };

  // Close dropdown when sidebar is closed or user clicks outside
  useEffect(() => {
    // Close dropdown when sidebar is closed
    if (!isSidebarVisible && dropdownChatId) {
      setDropdownChatId(null);
    }
  }, [isSidebarVisible, dropdownChatId]);

  // Close dropdown when clicking outside
  useEffect(() => {
    if (!dropdownChatId) return;

    const handleClickOutside = (event) => {
      // Check if click is outside the dropdown menu and button
      const dropdownMenu = document.querySelector('.fixed.z-\\[9999\\]');
      const menuButton = document.getElementById(`menu-button-${dropdownChatId}`);
      
      if (dropdownMenu && !dropdownMenu.contains(event.target) && 
          menuButton && !menuButton.contains(event.target)) {
        setDropdownChatId(null);
      }
    };

    // Add event listener with a small delay to avoid immediate closing
    setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside);
    }, 0);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [dropdownChatId]);

  // Filter chats based on search
  const filteredHistory = contextHistory.filter(chat => 
    chat.title && chat.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Format time helper
  const formatTime = (timestamp) => {
    if (!timestamp) return 'unknown';
    
    const date = new Date(timestamp);
    const now = new Date();
    const diffInMs = now - date;
    const diffInMinutes = diffInMs / (1000 * 60);
    const diffInHours = diffInMs / (1000 * 60 * 60);
    
    if (diffInMinutes < 1) return 'now';
    if (diffInMinutes < 60) return `${Math.floor(diffInMinutes)}m`;
    if (diffInHours < 24) return `${Math.floor(diffInHours)}h`;
    
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) return `${diffInDays}d`;
    
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  // Get message preview - show first user message (user story)
  const getMessagePreview = (chatId) => {
    const chatMessages = contextChats[chatId] || [];
    
    // Find first user message (user story input)
    const firstUserMessage = chatMessages.find(msg => msg.role === 'user');
    
    if (!firstUserMessage) return 'No messages yet';
    
    // FIXED: Add null/undefined check for content
    const content = firstUserMessage.content || '';
    if (!content) return 'Empty message';
    
    const preview = content
      .replace(/```[\s\S]*?```/g, '[Code]')
      .replace(/\*\*(.*?)\*\*/g, '$1')
      .replace(/\n/g, ' ')
      .trim();
    
    return preview.length > 50 ? preview.substring(0, 50) + '...' : preview;
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-[#020203] text-white font-sans flex overflow-hidden relative">
      
      {/* GLOBAL BACKGROUND */}
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] w-[50vw] h-[50vh] bg-[radial-gradient(circle_at_center,rgba(147,51,234,0.08)_0%,rgba(0,0,0,0)_70%)] blur-[100px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50vw] h-[50vh] bg-[radial-gradient(circle_at_center,rgba(236,72,153,0.08)_0%,rgba(0,0,0,0)_70%)] blur-[100px]" />
      </div>

      {/* TRIGGER ZONE */}
      {!isPinned && (
        <div 
            onMouseEnter={handleTriggerEnter}
            className="fixed top-0 left-0 w-5 h-full z-50 bg-transparent" 
        />
      )}

      {/* LEFT SIDEBAR - Collapsible Design */}
      <aside 
        onMouseLeave={() => !isPinned && setIsHovered(false)}
        className={`
            fixed top-0 left-0 h-full z-40 flex flex-col
            bg-[#0f0f14] border-r border-white/5 shadow-[10px_0_40px_rgba(0,0,0,0.5)]
            transition-transform duration-300 cubic-bezier(0.2, 0, 0, 1)
            ${isSidebarVisible ? 'translate-x-0' : '-translate-x-full'}
        `}
        style={{ width: '280px' }}
      >
        
        {/* Header Section */}
        <div className="p-5 border-b border-white/5" style={{ backgroundColor: '#09090A' }}>
          <div className="flex items-center justify-between mb-5">
            <Logo 
              size="lg" 
              showText={false} 
              textClassName="text-lg font-semibold" 
            />
            <button 
                onClick={handleToggleSidebar}
                className="p-2 rounded-lg transition-all duration-300 group/pin border text-white"
                style={{ backgroundColor: 'transparent', borderColor: 'rgba(255, 255, 255, 0.05)' }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#0D0D0D';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                }}
                title={isPinned ? "Unpin Sidebar" : "Pin Sidebar"}
            >
                {isPinned ? (
                     <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" /></svg>
                ) : (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
                )}
            </button>
          </div>

          {/* New Chat Button */}
          <button
            onClick={() => navigate('/chat')}
            className="w-full flex items-center justify-start gap-3 p-3.5 rounded-xl transition-all duration-300 text-sm font-medium border"
            style={{ 
              backgroundColor: 'transparent', 
              borderColor: 'transparent',
              color: '#FFFFFF'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#0D0D0D';
              e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.05)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
              e.currentTarget.style.borderColor = 'transparent';
            }}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            New Chat
          </button>

          {/* Reference Library Button */}
          <button
            onClick={() => setIsReferenceLibraryOpen(true)}
            className="w-full flex items-center justify-start gap-3 p-3.5 rounded-xl transition-all duration-300 text-sm font-medium border mt-2"
            style={{ 
              backgroundColor: 'transparent', 
              borderColor: 'transparent',
              color: '#FFFFFF'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#0D0D0D';
              e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.05)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
              e.currentTarget.style.borderColor = 'transparent';
            }}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
            Reference Library
          </button>
        </div>



        {/* Recent Chats Section */}
        <div className="flex-1 flex flex-col min-h-0" style={{ backgroundColor: '#09090A' }}>
          <div className="px-5 pt-5 pb-3">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-gray-300">Recent Chats</h3>
              <span className="text-xs text-gray-500 px-2.5 py-1 rounded-md border" style={{ backgroundColor: '#0D0D0D', borderColor: 'rgba(255, 255, 255, 0.05)' }}>
                {filteredHistory.length}
              </span>
            </div>
          </div>

          {/* Chat List */}
          <div className="flex-1 overflow-y-auto px-5 pb-4 scroll-smooth">
            <>
              <ChatCountIndicator 
                filteredCount={filteredHistory.length}
                totalCount={contextHistory.length}
                searchQuery={searchQuery}
                showThreshold={10}
              />
              
              <div className="space-y-1.5 max-h-full">
                {filteredHistory.map((chat) => {
                  const isActive = false; // No active chat in profile page
                  const isEditing = editingChatId === chat.id.toString();
                  const isDropdownOpen = dropdownChatId === chat.id.toString();
                  
                  return (
                    <CompactChatItem
                      key={chat.id}
                      chat={chat}
                      isActive={isActive}
                      isEditing={isEditing}
                      isDropdownOpen={isDropdownOpen}
                      editingTitle={editingTitle}
                      onSelect={handleSelectChat}
                      onToggleDropdown={handleToggleDropdown}
                      onStartRename={handleStartRename}
                      onRenameChat={handleRenameChat}
                      onCancelRename={handleCancelRename}
                      onDeleteChat={handleDeleteChat}
                      setEditingTitle={setEditingTitle}
                      formatTime={formatTime}
                      getMessagePreview={getMessagePreview}
                    />
                  );
                })}
              </div>
            </>
          </div>
        </div>

        {/* User Profile */}
        <div className="p-5 border-t border-white/5" style={{ backgroundColor: '#09090A' }}>
          <button
            onClick={handleSignOut}
            className="w-full flex items-center gap-3 p-3 rounded-xl transition-all border"
            style={{ backgroundColor: 'transparent', borderColor: 'rgba(255, 255, 255, 0.05)' }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#0D0D0D';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
            }}
          >
            <div className="w-8 h-8 rounded-lg flex items-center justify-center border" style={{ backgroundColor: '#160D14', borderColor: '#44273D' }}>
              <span className="text-xs font-semibold" style={{ color: '#FF7AD0' }}>
                {(() => {
                  try {
                    if (profile?.name && typeof profile.name === 'string' && profile.name.trim()) {
                      return profile.name.trim().split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
                    }
                    if (user?.email && typeof user.email === 'string' && user.email.trim()) {
                      return user.email.trim().slice(0, 2).toUpperCase();
                    }
                    return 'U';
                  } catch (error) {
                    return 'U';
                  }
                })()}
              </span>
            </div>
            <div className="flex-1 min-w-0 text-left">
              <p className="text-sm font-medium text-white truncate">
                {profile?.name || user?.email?.split('@')[0] || 'User'}
              </p>
              <p className="text-xs text-gray-400">Sign Out</p>
            </div>
            <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
          </button>
        </div>
      </aside>

      {/* MAIN CONTENT */}
      <main 
        className={`
            flex-1 flex flex-col h-screen relative z-10 w-full min-w-0 
            transition-all duration-300 ease-in-out
            ${isPinned ? 'pl-[280px]' : 'pl-0'} 
        `}
      >
        <div className="flex-1 overflow-y-auto px-6 py-8">
          <div className="max-w-7xl mx-auto">
            {/* Header */}
            <div className="mb-8">
              <h1 className="text-3xl font-bold text-white mb-2">Profile</h1>
              <p className="text-white/60">Lihat detail profile Anda disini</p>
            </div>

            {/* Profile Info Card */}
            <motion.div
              className="bg-[#0a0a0f]/60 backdrop-blur-xl border border-white/10 rounded-2xl p-8 mb-8"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <div className="flex flex-col lg:flex-row gap-8">
                {/* Profile Picture */}
                <div className="flex flex-col items-center lg:items-start">
                  <div className="w-32 h-32 rounded-3xl bg-[#160D14] border border-[#44273D] flex items-center justify-center text-[#FF7AD0] text-4xl font-bold shadow-xl">
                    {getInitials(profile?.name, user?.email)}
                  </div>
                </div>

                {/* Form Fields */}
                <div className="flex-1 space-y-6">
                  {/* Name Field */}
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-white/70">Nama</label>
                    {isEditing ? (
                      <input
                        type="text"
                        value={editForm.name}
                        onChange={(e) => setEditForm({...editForm, name: e.target.value})}
                        placeholder="Enter your full name"
                        className="w-full px-4 py-3.5 bg-white/[0.05] border border-white/10 rounded-xl text-white placeholder-white/40 focus:outline-none focus:border-purple-500/50 transition-all"
                      />
                    ) : (
                      <div className="w-full px-4 py-3.5 bg-white/[0.03] border border-white/[0.05] rounded-xl text-white/90">
                        {profile?.name || user?.email?.split('@')[0] || 'Nero Swallow Arthur'}
                      </div>
                    )}
                  </div>

                  {/* Email Field */}
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-white/70">Email</label>
                    <div className="w-full px-4 py-3.5 bg-white/[0.03] border border-white/[0.05] rounded-xl text-white/70">
                      {user?.email || 'ner0swall0ww@gmail.com'}
                    </div>
                  </div>

                  {/* Edit/Save Buttons */}
                  <div className="flex gap-3">
                    {!isEditing ? (
                      <button
                        onClick={handleEdit}
                        className="px-6 py-3 bg-gradient-to-r from-purple-500/20 to-pink-500/20 hover:from-purple-500/30 hover:to-pink-500/30 border border-purple-500/20 rounded-xl text-white transition-all"
                      >
                        Edit Profile
                      </button>
                    ) : (
                      <>
                        <button
                          onClick={handleCancel}
                          className="px-6 py-3 bg-white/[0.05] hover:bg-white/[0.08] border border-white/10 rounded-xl text-white/60 hover:text-white/80 transition-all"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={handleSave}
                          className="px-6 py-3 bg-gradient-to-r from-purple-500/20 to-pink-500/20 hover:from-purple-500/30 hover:to-pink-500/30 border border-purple-500/20 rounded-xl text-white transition-all"
                        >
                          Save Changes
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Three Main Actions */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Reference Library */}
              <motion.div
                onClick={() => setIsReferenceLibraryOpen(true)}
                className="group bg-[#0a0a0f]/60 backdrop-blur-xl border border-white/10 rounded-2xl p-6 cursor-pointer hover:border-blue-400/30 transition-all"
                whileHover={{ scale: 1.02, y: -4 }}
              >
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-white">Reference Library</h3>
                  <p className="text-sm text-gray-400">
                    Kelola referensi scenario dan konfigurasi auto reference system
                  </p>
                  <div className="flex items-center justify-between pt-2">
                    <span className="text-sm text-blue-400">Konfigurasi & Telurusi</span>
                    <svg className="w-5 h-5 text-blue-400 transform -rotate-45" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                    </svg>
                  </div>
                </div>
              </motion.div>

              {/* Template */}
              <motion.div
                onClick={() => setIsTemplateModalOpen(true)}
                className="group bg-[#0a0a0f]/60 backdrop-blur-xl border border-white/10 rounded-2xl p-6 cursor-pointer hover:border-emerald-400/30 transition-all"
                whileHover={{ scale: 1.02, y: -4 }}
              >
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-white">Template</h3>
                  <p className="text-sm text-gray-400">
                    Kelola referensi scenario dan konfigurasi auto reference system
                  </p>
                  <div className="flex items-center justify-between pt-2">
                    <span className="text-sm text-emerald-400">Telurusi Template</span>
                    <svg className="w-5 h-5 text-emerald-400 transform -rotate-45" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                    </svg>
                  </div>
                </div>
              </motion.div>

              {/* JIRA Connection */}
              <motion.div
                onClick={handleJiraProjects}
                className="group bg-[#0a0a0f]/60 backdrop-blur-xl border border-white/10 rounded-2xl p-6 cursor-pointer hover:border-amber-400/30 transition-all"
                whileHover={{ scale: 1.02, y: -4 }}
              >
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-white">JIRA Connection</h3>
                  <p className="text-sm text-gray-400">
                    Kelola referensi scenario dan konfigurasi auto reference system
                  </p>
                  <div className="flex items-center justify-between pt-2">
                    <span className="text-sm text-amber-400">
                      {hasJiraConnection ? 'TA-Belvanaufal' : 'Setup Connection'}
                    </span>
                    <svg className="w-5 h-5 text-amber-400 transform -rotate-45" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                    </svg>
                  </div>
                </div>
              </motion.div>
            </div>
          </div>
        </div>
      </main>

      {/* MODALS */}
      <TemplateModal
        isOpen={isTemplateModalOpen}
        onClose={() => setIsTemplateModalOpen(false)}
        onSelectTemplate={(template) => {
          setIsTemplateModalOpen(false);
          navigate('/chat', { state: { initialMessage: template } });
        }}
      />

      <ReferenceLibraryWithAutoSettings
        isOpen={isReferenceLibraryOpen}
        onClose={() => setIsReferenceLibraryOpen(false)}
      />

      <JiraProjectManagementModal
        isOpen={isJiraProjectModalOpen}
        onClose={() => setIsJiraProjectModalOpen(false)}
        onAddNewProject={handleAddNewProject}
      />

      <JiraSetupModal
        isOpen={isJiraSetupModalOpen}
        onClose={closeJiraSetupModal}
        onSkip={closeJiraSetupModal}
        onComplete={closeJiraSetupModal}
      />
    </div>
  );
};

export default Profile;
