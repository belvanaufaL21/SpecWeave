import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../contexts/AuthContext';
import toast from 'react-hot-toast';

const ProfileModal = ({ isOpen, onClose }) => {
  const { user, profile, updateProfile, updatePassword } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [showPasswordSection, setShowPasswordSection] = useState(false);
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [editForm, setEditForm] = useState({
    name: (profile?.name && typeof profile.name === 'string') ? profile.name : '',
    email: (user?.email && typeof user.email === 'string') ? user.email : ''
  });

  const handleEdit = () => {
    try {
      setEditForm({
        name: (profile?.name && typeof profile.name === 'string') ? profile.name : '',
        email: (user?.email && typeof user.email === 'string') ? user.email : ''
      });
      setIsEditing(true);
    } catch (error) {
      setEditForm({
        name: '',
        email: ''
      });
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
      setEditForm({
        name: '',
        email: ''
      });
    }
  };

  const handlePasswordChange = async () => {
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast.error('New passwords do not match');
      return;
    }

    if (passwordForm.newPassword.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }

    try {
      const result = await updatePassword(passwordForm.newPassword);
      if (result.error) {
        toast.error('Failed to update password: ' + result.error.message);
      } else {
        toast.success('Password updated successfully!');
        setPasswordForm({
          currentPassword: '',
          newPassword: '',
          confirmPassword: ''
        });
        setShowPasswordSection(false);
      }
    } catch (error) {
      toast.error('Failed to update password');
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

  if (!user) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <motion.div
            className="relative overflow-hidden bg-[#16161e] border border-white/10 rounded-3xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl"
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ duration: 0.3 }}
          >
            {/* Subtle gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-br from-purple-500/[0.03] via-transparent to-blue-500/[0.03] pointer-events-none" />
            
            {/* Header */}
            <div className="relative z-10 flex items-center justify-between p-8 pb-6 border-b border-white/10">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-purple-500/20 to-blue-500/20 border border-white/10 flex items-center justify-center backdrop-blur-sm">
                  <svg className="w-6 h-6 text-white/80" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-white">Profile Settings</h2>
                  <p className="text-sm text-white/60 mt-1">Manage your account information</p>
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                {!isEditing ? (
                  <motion.button
                    onClick={handleEdit}
                    className="flex items-center gap-2 px-4 py-2.5 bg-white/[0.08] hover:bg-white/[0.12] border border-white/10 hover:border-white/20 rounded-xl text-sm text-white/80 hover:text-white transition-all duration-200 backdrop-blur-sm"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                    Edit Profile
                  </motion.button>
                ) : (
                  <div className="flex items-center gap-3">
                    <motion.button
                      onClick={handleCancel}
                      className="px-4 py-2.5 bg-white/[0.05] hover:bg-white/[0.08] border border-white/10 rounded-xl text-sm text-white/60 hover:text-white/80 transition-all duration-200"
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      Cancel
                    </motion.button>
                    <motion.button
                      onClick={handleSave}
                      className="px-4 py-2.5 bg-gradient-to-r from-purple-500/20 to-blue-500/20 hover:from-purple-500/30 hover:to-blue-500/30 border border-purple-500/20 hover:border-purple-500/30 rounded-xl text-sm text-white transition-all duration-200"
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      Save Changes
                    </motion.button>
                  </div>
                )}
                
                <button
                  onClick={onClose}
                  className="p-2 text-gray-400 hover:text-white transition-colors rounded-lg hover:bg-white/5"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="relative z-10 p-8">
              <div className="flex flex-col lg:flex-row gap-8">
                {/* Profile Picture Section */}
                <div className="flex flex-col items-center lg:items-start">
                  <div className="relative group">
                    <div className="w-32 h-32 rounded-3xl bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center text-white text-4xl font-bold shadow-xl shadow-purple-500/20 transition-all duration-300 group-hover:shadow-purple-500/30 group-hover:scale-105">
                      {getInitials(profile?.name, user?.email)}
                    </div>
                    <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-purple-400 to-blue-400 opacity-0 group-hover:opacity-20 transition-opacity duration-300" />
                  </div>
                  <button className="mt-6 text-sm text-purple-400 hover:text-purple-300 transition-colors font-medium">
                    Change Avatar
                  </button>
                </div>

                {/* Form Fields */}
                <div className="flex-1 space-y-6">
                  {/* Name Field */}
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-white/70">Full Name</label>
                    {isEditing ? (
                      <motion.input
                        type="text"
                        value={editForm.name}
                        onChange={(e) => setEditForm({...editForm, name: e.target.value})}
                        placeholder="Enter your full name"
                        className="w-full px-4 py-3.5 bg-white/[0.05] border border-white/10 rounded-xl text-white placeholder-white/40 focus:outline-none focus:border-purple-500/50 focus:bg-white/[0.08] transition-all duration-200 backdrop-blur-sm"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 0.2 }}
                      />
                    ) : (
                    <div className="w-full px-4 py-3.5 bg-white/[0.03] border border-white/[0.05] rounded-xl text-white/90">
                        {profile?.name || (
                          <span className="text-white/40">Not set</span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Email Field */}
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-white/70">Email Address</label>
                    <div className="w-full px-4 py-3.5 bg-white/[0.03] border border-white/[0.05] rounded-xl text-white/70 flex items-center justify-between">
                      <span>{user?.email || 'No email'}</span>
                      <span className="text-xs text-white/40 bg-white/[0.05] px-2 py-1 rounded-lg">Read only</span>
                    </div>
                  </div>

                  {/* Password Section */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="block text-sm font-medium text-white/70">Password</label>
                      <button
                        onClick={() => setShowPasswordSection(!showPasswordSection)}
                        className="text-sm text-purple-400 hover:text-purple-300 transition-colors font-medium"
                      >
                        {showPasswordSection ? 'Hide' : 'Change Password'}
                      </button>
                    </div>
                    
                    {!showPasswordSection ? (
                      <div className="w-full px-4 py-3.5 bg-white/[0.03] border border-white/[0.05] rounded-xl text-white/70 flex items-center justify-between">
                        <span>••••••••••••</span>
                        <span className="text-xs text-white/40 bg-white/[0.05] px-2 py-1 rounded-lg">Hidden</span>
                      </div>
                    ) : (
                      <motion.div 
                        className="space-y-4 p-6 bg-white/[0.03] border border-white/[0.08] rounded-xl backdrop-blur-sm"
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.3 }}
                      >
                        <input
                          type="password"
                          placeholder="Current password"
                          value={passwordForm.currentPassword}
                          onChange={(e) => setPasswordForm({...passwordForm, currentPassword: e.target.value})}
                          className="w-full px-4 py-3 bg-white/[0.05] border border-white/10 rounded-xl text-white placeholder-white/40 focus:outline-none focus:border-purple-500/50 text-sm transition-all duration-200"
                        />
                        <input
                          type="password"
                          placeholder="New password"
                          value={passwordForm.newPassword}
                          onChange={(e) => setPasswordForm({...passwordForm, newPassword: e.target.value})}
                          className="w-full px-4 py-3 bg-white/[0.05] border border-white/10 rounded-xl text-white placeholder-white/40 focus:outline-none focus:border-purple-500/50 text-sm transition-all duration-200"
                        />
                        <input
                          type="password"
                          placeholder="Confirm new password"
                          value={passwordForm.confirmPassword}
                          onChange={(e) => setPasswordForm({...passwordForm, confirmPassword: e.target.value})}
                          className="w-full px-4 py-3 bg-white/[0.05] border border-white/10 rounded-xl text-white placeholder-white/40 focus:outline-none focus:border-purple-500/50 text-sm transition-all duration-200"
                        />
                        <div className="flex gap-3 pt-2">
                          <motion.button
                            onClick={() => setShowPasswordSection(false)}
                            className="flex-1 px-4 py-2.5 bg-white/[0.05] hover:bg-white/[0.08] border border-white/10 rounded-xl text-sm text-white/60 hover:text-white/80 transition-all duration-200"
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                          >
                            Cancel
                          </motion.button>
                          <motion.button
                            onClick={handlePasswordChange}
                            className="flex-1 px-4 py-2.5 bg-gradient-to-r from-purple-500/20 to-blue-500/20 hover:from-purple-500/30 hover:to-blue-500/30 border border-purple-500/20 hover:border-purple-500/30 rounded-xl text-sm text-white transition-all duration-200"
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                          >
                            Update Password
                          </motion.button>
                        </div>
                      </motion.div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default ProfileModal;