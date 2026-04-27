import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const LoginSignup = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, signInWithGoogle } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // Get initial message from landing page if any
  const initialMessage = location.state?.initialMessage || '';

  // Redirect if already authenticated
  useEffect(() => {
    if (user) {
      navigate('/chat', { replace: true });
    }
  }, [user, navigate]);

  const handleGoogleAuth = async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Always use 'signup' mode - this allows both new and existing users
      const { error: authError } = await signInWithGoogle('signup');
      
      if (authError) {
        // Check if user cancelled the popup/flow
        // Common error messages when user cancels:
        // - "popup_closed_by_user"
        // - "access_denied"
        // - User closed the popup
        const isCancelled = 
          authError.message?.includes('popup_closed_by_user') ||
          authError.message?.includes('access_denied') ||
          authError.message?.includes('closed') ||
          authError.message?.includes('cancelled');
        
        if (isCancelled) {
          // User cancelled - just reset loading state, no error message
          console.log('User cancelled authentication');
          setIsLoading(false);
          return;
        }
        
        // Real error - show error message
        setError(authError.message || 'Authentication failed. Please try again.');
        setIsLoading(false);
      }
      // If successful, user will be redirected via AuthCallback
    } catch (err) {
      // Check if it's a cancellation
      const isCancelled = 
        err.message?.includes('popup_closed_by_user') ||
        err.message?.includes('access_denied') ||
        err.message?.includes('closed') ||
        err.message?.includes('cancelled');
      
      if (isCancelled) {
        // User cancelled - just reset loading state
        console.log('User cancelled authentication');
        setIsLoading(false);
        return;
      }
      
      setError('An unexpected error occurred. Please try again.');
      setIsLoading(false);
    }
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
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M11.53 2C11.53 2 10.07 3.45 10.07 5.46C10.07 7.47 11.53 8.93 11.53 8.93L15.07 12.47C15.07 12.47 16.53 11.02 16.53 9C16.53 6.99 15.07 5.54 15.07 5.54L11.53 2Z" fill="#2684FF"/>
              <path d="M8.47 8.93C8.47 8.93 7.01 10.38 7.01 12.4C7.01 14.41 8.47 15.87 8.47 15.87L12 19.4C12 19.4 13.46 17.95 13.46 15.93C13.46 13.92 12 12.47 12 12.47L8.47 8.93Z" fill="url(#jira-gradient)"/>
              <defs>
                <linearGradient id="jira-gradient" x1="7.01" y1="8.93" x2="13.46" y2="19.4" gradientUnits="userSpaceOnUse">
                  <stop stopColor="#2684FF"/>
                  <stop offset="1" stopColor="#0052CC"/>
                </linearGradient>
              </defs>
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

            {/* Google Sign In Button with description */}
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

              <p className="text-sm text-gray-400">
                Use your Google account to Login/Sign up
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
