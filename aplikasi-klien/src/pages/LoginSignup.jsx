import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { FormInput } from '../components/common/FormField';
import { User, Lock, Eye, EyeOff } from 'lucide-react';
import AuthService from '../services/auth/AuthService';

const LoginSignup = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, signInWithGoogle } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('login'); // 'login' or 'signup'
  const [showPassword, setShowPassword] = useState(false);

  // Form data
  const [formData, setFormData] = useState({
    fullName: '',
    password: ''
  });

  // Validation errors
  const [errors, setErrors] = useState({});

  // Get initial message from landing page if any
  const initialMessage = location.state?.initialMessage || '';

  // Redirect if already authenticated
  useEffect(() => {
    if (user) {
      navigate('/chat', { replace: true });
    }
  }, [user, navigate]);

  // Reset loading state when component mounts (handles back navigation)
  useEffect(() => {
    // Check if we're returning from OAuth redirect
    const isReturningFromOAuth = sessionStorage.getItem('oauth_in_progress');
    
    if (isReturningFromOAuth) {
      // User returned without completing OAuth (pressed back button)
      console.log('Detected return from OAuth without completion');
      sessionStorage.removeItem('oauth_in_progress');
      setIsLoading(false);
    }
    
    // Handle browser back button navigation (pageshow event)
    const handlePageShow = (event) => {
      // event.persisted is true when page is loaded from bfcache (back/forward cache)
      if (event.persisted) {
        console.log('Page loaded from bfcache (back button pressed)');
        const oauthInProgress = sessionStorage.getItem('oauth_in_progress');
        if (oauthInProgress) {
          console.log('Resetting loading state after back navigation');
          sessionStorage.removeItem('oauth_in_progress');
          setIsLoading(false);
        }
      }
    };
    
    window.addEventListener('pageshow', handlePageShow);
    
    return () => {
      // Cleanup on unmount
      window.removeEventListener('pageshow', handlePageShow);
      setIsLoading(false);
    };
  }, []);

  const handleGoogleAuth = async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Mark that OAuth is in progress
      sessionStorage.setItem('oauth_in_progress', 'true');
      
      // signInWithGoogle uses redirect flow, so it will redirect the page
      // The loading state will persist during redirect, which is expected
      const { error: authError } = await signInWithGoogle('signup');
      
      if (authError) {
        // Remove OAuth in progress flag on error
        sessionStorage.removeItem('oauth_in_progress');
        
        // Only handle actual errors, not cancellations
        console.error('Authentication error:', authError);
        setError(authError.message || 'Authentication failed. Please try again.');
        setIsLoading(false);
      }
      // If successful, page will redirect to Google OAuth
      // oauth_in_progress flag will be cleared when user returns (in useEffect)
    } catch (err) {
      // Remove OAuth in progress flag on error
      sessionStorage.removeItem('oauth_in_progress');
      
      console.error('Unexpected authentication error:', err);
      setError('An unexpected error occurred. Please try again.');
      setIsLoading(false);
    }
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

  // Handle manual auth (login or signup)
  const handleManualAuth = async (e) => {
    e.preventDefault();
    setError(null);
    
    if (!validateForm()) {
      return;
    }
    
    setIsLoading(true);
    
    try {
      let result;
      
      if (activeTab === 'login') {
        // Login
        result = await AuthService.signInWithFullName(
          formData.fullName,
          formData.password
        );
      } else {
        // Sign up
        result = await AuthService.signUpWithFullName(
          formData.fullName,
          formData.password
        );
      }
      
      if (result.error) {
        setError(result.error.message || `${activeTab === 'login' ? 'Login' : 'Sign up'} failed. Please try again.`);
      } else {
        // Success - navigation will be handled by AuthContext
        navigate('/chat', { replace: true });
      }
    } catch (err) {
      console.error('Manual auth error:', err);
      setError(err.message || 'An error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleTabSwitch = (tab) => {
    setActiveTab(tab);
    setError(null);
    setErrors({});
  };

  return (
    <div className="min-h-screen bg-[#020203] text-white overflow-hidden relative">
      {/* Background gradients - sama dengan Dashboard */}
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] w-[50vw] h-[50vh] bg-[radial-gradient(circle_at_center,rgba(147,51,234,0.08)_0%,rgba(0,0,0,0)_70%)] blur-[100px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50vw] h-[50vh] bg-[radial-gradient(circle_at_center,rgba(236,72,153,0.08)_0%,rgba(0,0,0,0)_70%)] blur-[100px]" />
      </div>

      {/* Content */}
      <div className="relative z-10 min-h-screen flex items-center justify-center px-6">
        <div className="w-full max-w-2xl text-center">
          {/* Integration badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm mb-8 border" style={{ backgroundColor: '#120C18', borderColor: '#2C1A43', color: '#FFFFFF' }}>
            <svg className="w-4 h-4 text-[#2684FF]" viewBox="0 0 24 24" fill="currentColor">
              <path d="M11.571 11.513H0a5.218 5.218 0 0 0 5.232 5.215h2.13v2.057A5.215 5.215 0 0 0 12.575 24V12.518a1.005 1.005 0 0 0-1.005-1.005zm5.723-5.756H5.736a5.215 5.215 0 0 0 5.215 5.214h2.129v2.058a5.218 5.218 0 0 0 5.215 5.214V6.758a1.001 1.001 0 0 0-1.001-1.001zM23.013 0H11.455a5.215 5.215 0 0 0 5.215 5.215h2.129v2.057A5.215 5.215 0 0 0 24 12.483V1.005A1.001 1.001 0 0 0 23.013 0z"/>
            </svg>
            Integration with JIRA
          </div>

          {/* Main Title */}
          <h1 className="text-5xl sm:text-6xl font-bold mb-6 leading-tight">
            From User Story to Gherkin
          </h1>

          {/* Subtitle */}
          <p className="text-gray-400 text-lg mb-12 max-w-3xl mx-auto">
            Konversi user story jadi skenario Gherkin yang rapi, konsisten, dan siap dipakai QA & Dev.
          </p>

          {/* Auth Section */}
          <div className="max-w-md mx-auto">
            {/* Error Message */}
            {error && (
              <div className="mb-6 p-4 bg-red-900/20 border border-red-500/50 rounded-lg flex items-start gap-3">
                <svg className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-red-300 text-sm">{error}</p>
              </div>
            )}

            {/* Manual Auth Form Container */}
            <div className="bg-transparent border border-white/5 rounded-2xl p-6 mb-6">
              {/* Tabs */}
              <div className="flex border-b border-white/5 mb-6">
                <button
                  onClick={() => handleTabSwitch('login')}
                  className={`flex-1 py-3 text-sm font-semibold transition-all ${
                    activeTab === 'login'
                      ? 'text-purple-400 border-b-2 border-purple-400'
                      : 'text-gray-400 hover:text-gray-300'
                  }`}
                >
                  Login
                </button>
                <button
                  onClick={() => handleTabSwitch('signup')}
                  className={`flex-1 py-3 text-sm font-semibold transition-all ${
                    activeTab === 'signup'
                      ? 'text-purple-400 border-b-2 border-purple-400'
                      : 'text-gray-400 hover:text-gray-300'
                  }`}
                >
                  Sign Up
                </button>
              </div>

              {/* Info Message */}
              <div className="mb-4 p-3 bg-blue-900/20 border border-blue-500/50 rounded-lg">
                <p className="text-blue-300 text-xs">
                  {activeTab === 'login' 
                    ? 'Login with your full name and password. Google users cannot use this method.'
                    : 'Create an account with full name and password. This is separate from Google login.'}
                </p>
              </div>

              {/* Form */}
              <form onSubmit={handleManualAuth} className="space-y-4">
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

            {/* Divider */}
            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-white/10"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-4 bg-[#020203] text-gray-400">or</span>
              </div>
            </div>

            {/* Google Sign In Button */}
            <div className="space-y-3">
              <button
                onClick={handleGoogleAuth}
                disabled={isLoading}
                className="w-full flex items-center justify-between px-6 py-4 rounded-xl font-semibold transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl group border"
                style={{ backgroundColor: '#160D14', borderColor: '#44273D', color: '#FF7AD0' }}
              >
                <span className="text-left flex-1">
                  {isLoading ? 'Processing...' : 'Login/Sign up with Google'}
                </span>
                {!isLoading && (
                  <svg className="w-5 h-5 transform group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: '#FF7AD0' }}>
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                )}
                {isLoading && (
                  <div className="w-5 h-5 border-2 border-t-white rounded-full animate-spin" style={{ borderColor: 'rgba(255, 122, 208, 0.3)', borderTopColor: '#FF7AD0' }} />
                )}
              </button>

              <p className="text-sm text-gray-400 text-center">
                Use your Google account to login or sign up
              </p>
            </div>

            {/* Initial Message Preview (if from landing) */}
            {initialMessage && (
              <div className="mt-8 p-4 bg-white/5 border border-white/10 rounded-lg text-left">
                <p className="text-xs text-gray-500 mb-2">Your user story:</p>
                <p className="text-sm text-gray-300 line-clamp-3">{initialMessage}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginSignup;
