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
    setFormData({ fullName: '', password: '' }); // Reset form data
    setShowPassword(false);
  };

  // Real-time validation
  const validateField = (name, value) => {
    const newErrors = { ...errors };
    
    switch (name) {
      case 'fullName':
        if (!value) {
          newErrors.fullName = 'Full name is required';
        } else if (value.length < 2) {
          newErrors.fullName = 'Name must be at least 2 characters';
        } else {
          delete newErrors.fullName;
        }
        break;
      case 'password':
        if (!value) {
          newErrors.password = 'Password is required';
        } else if (value.length < 6) {
          newErrors.password = 'Password must be at least 6 characters';
        } else {
          delete newErrors.password;
        }
        break;
      default:
        break;
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Real-time validation
    validateField(name, value);
    setError(null);
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
        // Check if it's a rate limit error
        if (authError.code === 'RATE_LIMIT' || authError.message?.includes('rate limit')) {
          setError(
            '⏱️ Too many attempts. Please wait 5-10 minutes before trying again. ' +
            'If you already have an account, try logging in instead.'
          );
        } else {
          setError(authError.message || 'Sign up failed. Please try again.');
        }
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

          {/* Rate Limit Warning */}
          <div className="mb-4 p-3 bg-yellow-900/20 border border-yellow-500/50 rounded-lg">
            <p className="text-yellow-300 text-xs">
              ⚠️ Limited to 3-5 sign ups per hour. If you get an error, please wait 5-10 minutes.
            </p>
          </div>

          {/* Form */}
          <form onSubmit={activeTab === 'login' ? handleLogin : handleSignup} className="space-y-6">
            <FormInput
              label="Full Name"
              type="text"
              name="fullName"
              placeholder="Enter your full name"
              value={formData.fullName}
              onChange={handleInputChange}
              error={errors.fullName}
              hasError={!!errors.fullName}
              required
              icon={<User className="w-5 h-5" />}
            />

            <div className="relative">
              <FormInput
                label="Password"
                type={showPassword ? 'text' : 'password'}
                name="password"
                placeholder={activeTab === 'login' ? 'Enter your password' : 'Create a password (min. 6 characters)'}
                value={formData.password}
                onChange={handleInputChange}
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

            <button
              type="submit"
              disabled={isLoading || Object.keys(errors).length > 0 || !formData.fullName || !formData.password}
              className="w-full py-3 bg-[#160D14] border border-[#44273D] text-[#FF7AD0] rounded-lg font-medium hover:bg-[#1a1016] transition-all duration-200 disabled:bg-[#09090A] disabled:border-white/5 disabled:text-white/10 disabled:cursor-not-allowed flex items-center justify-center gap-2"
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
