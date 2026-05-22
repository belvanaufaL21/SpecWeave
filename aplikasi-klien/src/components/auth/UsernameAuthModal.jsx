import { useState } from 'react';
import { FormInput } from '../common/FormField';
import { User, Lock, Eye, EyeOff } from 'lucide-react';
import AuthService from '../../services/auth/AuthService';

const UsernameAuthModal = ({ isOpen, onClose, onSuccess, initialTab = 'login' }) => {
  const [activeTab, setActiveTab] = useState(initialTab);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showPassword, setShowPassword] = useState(false);

  // Form data
  const [formData, setFormData] = useState({
    fullName: '',
    password: ''
  });

  // Validation errors
  const [errors, setErrors] = useState({});

  // Reset form when switching tabs
  const handleTabSwitch = (tab) => {
    setActiveTab(tab);
    setError(null);
    setErrors({});
    setFormData({ fullName: '', password: '' });
  };

  // Validate form
  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.fullName) {
      newErrors.fullName = 'Full name is required';
    } else if (formData.fullName.length < 2) {
      newErrors.fullName = 'Name must be at least 2 characters';
    }
    
    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle login
  const handleLogin = async (e) => {
    e.preventDefault();
    setError(null);
    
    if (!validateForm()) {
      return;
    }
    
    setIsLoading(true);
    
    try {
      // Login with full name and password
      const { error: authError } = await AuthService.signInWithFullName(
        formData.fullName,
        formData.password
      );
      
      if (authError) {
        setError(authError.message || 'Login failed. Please check your credentials.');
      } else {
        if (onSuccess) {
          onSuccess();
        }
      }
    } catch (err) {
      console.error('Login error:', err);
      setError(err.message || 'Login failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle signup
  const handleSignup = async (e) => {
    e.preventDefault();
    setError(null);
    
    if (!validateForm()) {
      return;
    }
    
    setIsLoading(true);
    
    try {
      // Sign up with full name and password
      const { error: authError } = await AuthService.signUpWithFullName(
        formData.fullName,
        formData.password
      );
      
      if (authError) {
        setError(authError.message || 'Sign up failed. Please try again.');
      } else {
        if (onSuccess) {
          onSuccess();
        }
      }
    } catch (err) {
      console.error('Signup error:', err);
      setError(err.message || 'Sign up failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-md bg-[#0D0D0D] border border-white/10 rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="relative p-6 border-b border-white/10">
          <h2 className="text-2xl font-bold text-white text-center">
            {activeTab === 'login' ? 'Login' : 'Sign Up'}
          </h2>
          <button
            onClick={onClose}
            className="absolute top-6 right-6 text-gray-400 hover:text-white transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-white/10">
          <button
            onClick={() => handleTabSwitch('login')}
            className={`flex-1 py-4 text-sm font-semibold transition-all ${
              activeTab === 'login'
                ? 'text-purple-400 border-b-2 border-purple-400 bg-purple-500/5'
                : 'text-gray-400 hover:text-gray-300 hover:bg-white/5'
            }`}
          >
            Login
          </button>
          <button
            onClick={() => handleTabSwitch('signup')}
            className={`flex-1 py-4 text-sm font-semibold transition-all ${
              activeTab === 'signup'
                ? 'text-purple-400 border-b-2 border-purple-400 bg-purple-500/5'
                : 'text-gray-400 hover:text-gray-300 hover:bg-white/5'
            }`}
          >
            Sign Up
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Error Message */}
          {error && (
            <div className="mb-4 p-3 bg-red-900/20 border border-red-500/50 rounded-lg flex items-start gap-2">
              <svg className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-red-300 text-sm">{error}</p>
            </div>
          )}

          {/* Info Message */}
          <div className="mb-4 p-3 bg-blue-900/20 border border-blue-500/50 rounded-lg">
            <p className="text-blue-300 text-xs">
              {activeTab === 'login' 
                ? 'Login with your full name and password. Google users cannot use this method.'
                : 'Create an account with full name and password. This is separate from Google login.'}
            </p>
          </div>

          {/* Form */}
          <form onSubmit={activeTab === 'login' ? handleLogin : handleSignup} className="space-y-6">
            <FormInput
              label="Full Name"
              type="text"
              placeholder="Enter your full name"
              value={formData.fullName}
              onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
              error={errors.fullName}
              hasError={!!errors.fullName}
              required
              icon={<User className="w-5 h-5" />}
            />

            <div className="relative">
              <FormInput
                label="Password"
                type={showPassword ? 'text' : 'password'}
                placeholder={activeTab === 'login' ? 'Enter your password' : 'Create a password (min. 6 characters)'}
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                error={errors.password}
                hasError={!!errors.password}
                required
                icon={<Lock className="w-5 h-5" />}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-[38px] text-gray-400 hover:text-white transition-colors"
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>

            {activeTab === 'login' && (
              <div className="flex items-center justify-between text-sm">
                <label className="flex items-center gap-2 text-gray-400 cursor-pointer">
                  <input
                    type="checkbox"
                    className="w-4 h-4 rounded border-white/20 bg-[#050507] text-purple-500 focus:ring-2 focus:ring-purple-500/20"
                  />
                  <span>Remember me</span>
                </label>
                <button
                  type="button"
                  className="text-purple-400 hover:text-purple-300 transition-colors"
                >
                  Forgot password?
                </button>
              </div>
            )}

            {activeTab === 'signup' && (
              <div className="text-xs text-gray-400">
                By signing up, you agree to our{' '}
                <button type="button" className="text-purple-400 hover:text-purple-300">
                  Terms of Service
                </button>{' '}
                and{' '}
                <button type="button" className="text-purple-400 hover:text-purple-300">
                  Privacy Policy
                </button>
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3.5 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>{activeTab === 'login' ? 'Logging in...' : 'Creating account...'}</span>
                </>
              ) : (
                activeTab === 'login' ? 'Login' : 'Sign Up'
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default UsernameAuthModal;
