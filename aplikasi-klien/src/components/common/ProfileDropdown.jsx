import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';

const ProfileDropdown = ({ onSignOut, onOpenProfile, onOpenUserGuide }) => {
  const { user, profile, loading } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleSignOut = () => {
    setIsOpen(false);
    onSignOut();
  };

  const handleOpenProfile = () => {
    setIsOpen(false);
    onOpenProfile();
  };

  const handleOpenUserGuide = () => {
    setIsOpen(false);
    onOpenUserGuide();
  };

  // Don't render if user is not loaded yet
  if (!user || loading) {
    return (
      <div className="flex items-center gap-3 p-2 rounded-lg">
        <div className="w-8 h-8 rounded-full bg-gray-600 animate-pulse"></div>
        <div className="text-sm">
          <div className="w-20 h-4 bg-gray-600 rounded animate-pulse mb-1"></div>
          <div className="w-16 h-3 bg-gray-700 rounded animate-pulse"></div>
        </div>
      </div>
    );
  }

  const getInitials = () => {
    try {
      if (profile?.name && typeof profile.name === 'string' && profile.name.trim()) {
        return profile.name.trim().charAt(0).toUpperCase();
      }
      if (user?.email && typeof user.email === 'string' && user.email.trim()) {
        return user.email.trim().charAt(0).toUpperCase();
      }
      return 'U';
    } catch (error) {
      return 'U';
    }
  };

  const getDisplayName = () => {
    try {
      if (profile?.name && typeof profile.name === 'string' && profile.name.trim()) {
        return profile.name.trim();
      }
      if (user?.email && typeof user.email === 'string' && user.email.trim()) {
        return user.email.trim();
      }
      return 'User';
    } catch (error) {
      return 'User';
    }
  };

  const getUserRole = () => {
    try {
      if (profile?.role && typeof profile.role === 'string') {
        return profile.role;
      }
      return 'user';
    } catch (error) {
      return 'user';
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Profile Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-3 p-2 rounded-lg hover:bg-white/5 transition-colors"
      >
        <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-purple-600 to-blue-600 flex items-center justify-center text-xs font-bold text-white border border-white/10 shadow-lg">
          {getInitials()}
        </div>
        <div className="text-sm text-left">
          <p className="text-white font-medium truncate max-w-32">{getDisplayName()}</p>
          <p className="text-gray-400 text-xs capitalize">{getUserRole()}</p>
        </div>
        <svg 
          className={`w-4 h-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-56 bg-[#1a1a24] border border-white/10 rounded-xl shadow-xl z-50 backdrop-blur-xl">
          <div className="p-4 border-b border-white/10">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-purple-600 to-blue-600 flex items-center justify-center text-sm font-bold text-white shadow-lg">
                {getInitials()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate">
                  {getDisplayName()}
                </p>
                <p className="text-xs text-gray-400 truncate">
                  {user?.email}
                </p>
              </div>
            </div>
          </div>
          
          <div className="py-2">
            <button
              onClick={handleOpenProfile}
              className="w-full px-4 py-3 text-left text-sm text-gray-300 hover:text-white hover:bg-white/5 transition-colors flex items-center gap-3"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              <div>
                <div className="font-medium">Profile</div>
                <div className="text-xs text-gray-500">Manage account settings</div>
              </div>
            </button>

            <button
              onClick={handleOpenUserGuide}
              className="w-full px-4 py-3 text-left text-sm text-gray-300 hover:text-white hover:bg-white/5 transition-colors flex items-center gap-3"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
              <div>
                <div className="font-medium">User Guide</div>
                <div className="text-xs text-gray-500">Help and documentation</div>
              </div>
            </button>
            
            <div className="border-t border-white/10 my-2"></div>
            
            <button
              onClick={handleSignOut}
              className="w-full px-4 py-3 text-left text-sm text-gray-300 hover:text-white hover:bg-white/5 transition-colors flex items-center gap-3"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              <div>
                <div className="font-medium">Sign Out</div>
                <div className="text-xs text-gray-500">Log out of your account</div>
              </div>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProfileDropdown;