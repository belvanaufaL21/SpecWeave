import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { registerUser } from '../utils/userValidation';
import { supabase } from '../config/supabase';
import AppLoader from '../components/common/AppLoader';
import { showAuthSuccessToast } from '../utils/toastNotifications';

const AuthCallback = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [status, setStatus] = useState('processing'); // processing, success, error
  const [message, setMessage] = useState(''); // Start with empty message
  const [validationComplete, setValidationComplete] = useState(false);

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        // Get auth mode from sessionStorage
        const authMode = sessionStorage.getItem('auth_mode');
        
        // Check for error parameters first
        const error = searchParams.get('error');
        const errorDescription = searchParams.get('error_description');

        if (error) {
          // Check if user cancelled/denied access
          if (error === 'access_denied') {
            // User cancelled - redirect immediately without showing error
            console.log('User cancelled authentication');
            setStatus('processing');
            setMessage(''); // No message for cancellation
            setTimeout(() => {
              navigate('/login', { replace: true });
            }, 500); // Brief delay to show loader
            return;
          }
          
          // Real error - show error message
          setStatus('error');
          let errorMessage = 'Authentication failed.';
          
          if (errorDescription) {
            errorMessage = errorDescription;
          }
          
          setMessage(errorMessage);
          
          setTimeout(() => {
            navigate('/', { replace: true });
          }, 3000);
          return;
        }

        // Check for successful authentication tokens
        const accessToken = searchParams.get('access_token');
        const refreshToken = searchParams.get('refresh_token');
        
        if (accessToken || refreshToken) {
          // Just show processing without message - validation will happen when user state updates
          setMessage('');
          return;
        }

        // If no tokens and no user, wait for auth state to update
        if (!user) {
          setMessage('');
          
          setTimeout(() => {
            if (!user) {
              setStatus('error');
              setMessage('Authentication incomplete. Please try signing in again.');
              setTimeout(() => {
                navigate('/', { replace: true });
              }, 3000);
            }
          }, 5000);
          return;
        }

      } catch (error) {
        console.error('❌ [AUTH-CALLBACK] Callback processing error:', error);
        setStatus('error');
        setMessage('An unexpected error occurred during authentication. Please try again.');
        
        setTimeout(() => {
          navigate('/', { replace: true });
        }, 3000);
      }
    };

    // Add delay to ensure proper initialization
    const timeoutId = setTimeout(handleAuthCallback, 500);
    
    return () => clearTimeout(timeoutId);
  }, [searchParams, navigate]);

  // Separate effect for user validation - this runs when user state changes
  useEffect(() => {
    const validateUser = async () => {
      if (!user || validationComplete) return;

      let authMode = null;
      
      try {
        authMode = sessionStorage.getItem('auth_mode');
        
        // SIMPLIFIED: Always use signup mode - this allows both new and existing users
        if (!authMode) {
          sessionStorage.setItem('auth_mode', 'signup');
          authMode = 'signup';
        }

        // For signup mode (which now handles both new and existing users)
        if (authMode === 'signup') {
          if (user.email) {
            registerUser(user.email);
          }
          
          // Ensure profile exists with retry logic
          try {
            let profile = null;
            let attempts = 0;
            const maxAttempts = 3;
            
            // Try to find existing profile first
            const { data: existingProfile } = await supabase
              .from('profiles')
              .select('id, email')
              .eq('id', user.id)
              .maybeSingle();
            
            if (existingProfile) {
              profile = existingProfile;
              setMessage('');
            } else {
              setMessage('');
              
              // Create profile with retry logic
              while (!profile && attempts < maxAttempts) {
                attempts++;
                
                try {
                  const newProfile = {
                    id: user.id,
                    email: user.email,
                    name: user.user_metadata?.name || user.user_metadata?.full_name || user.email,
                    avatar_url: user.user_metadata?.avatar_url || user.user_metadata?.picture,
                    role: 'user',
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                  };
                  
                  const { data: insertedProfile, error: insertError } = await supabase
                    .from('profiles')
                    .insert([newProfile])
                    .select()
                    .single();
                  
                  if (insertedProfile && !insertError) {
                    profile = insertedProfile;
                    break;
                  } else if (insertError && insertError.code === '23505') {
                    // Unique violation - profile might have been created by trigger
                    const { data: triggerProfile } = await supabase
                      .from('profiles')
                      .select('id, email')
                      .eq('id', user.id)
                      .maybeSingle();
                    
                    if (triggerProfile) {
                      profile = triggerProfile;
                      break;
                    }
                  } else {
                    console.warn(`⚠️ [AUTH-CALLBACK] Profile creation attempt ${attempts} failed:`, insertError);
                    if (attempts < maxAttempts) {
                      await new Promise(resolve => setTimeout(resolve, 1000));
                    }
                  }
                } catch (createError) {
                  console.warn(`⚠️ [AUTH-CALLBACK] Profile creation attempt ${attempts} error:`, createError);
                  if (attempts < maxAttempts) {
                    await new Promise(resolve => setTimeout(resolve, 1000));
                  }
                }
              }
            }
            
            // Even if profile creation failed, allow access
            if (!profile) {
              console.warn('⚠️ [AUTH-CALLBACK] Profile creation failed after retries, but allowing access');
            }
            
          } catch (profileError) {
            console.warn('⚠️ [AUTH-CALLBACK] Profile creation error:', profileError);
          }
          
          setStatus('success');
          setMessage('');
          setValidationComplete(true);
          
          // Show success notification with user name
          const userName = user.user_metadata?.name || user.user_metadata?.full_name || user.email?.split('@')[0] || 'User';
          showAuthSuccessToast(userName);
          
          // Longer delay for smoother animation
          setTimeout(() => {
            navigate('/chat', { replace: true });
          }, 2000);
        }

      } catch (error) {
        console.error('❌ [AUTH-CALLBACK] User validation error:', error);
        setStatus('error');
        setMessage('Authentication failed.');
        setValidationComplete(true);
        
        setTimeout(() => {
          navigate('/', { replace: true });
        }, 3000);
      } finally {
        if (authMode) {
          setTimeout(() => {
            sessionStorage.removeItem('auth_mode');
          }, 1000);
        }
      }
    };

    if (user && !validationComplete) {
      validateUser();
    }
  }, [user, validationComplete, navigate]);

  return (
    <div className="min-h-screen bg-[#020203] text-white flex items-center justify-center relative overflow-hidden">
      {/* Background gradients - sama dengan LoginSignup */}
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] w-[50vw] h-[50vh] bg-[radial-gradient(circle_at_center,rgba(147,51,234,0.08)_0%,rgba(0,0,0,0)_70%)] blur-[100px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50vw] h-[50vh] bg-[radial-gradient(circle_at_center,rgba(236,72,153,0.08)_0%,rgba(0,0,0,0)_70%)] blur-[100px]" />
      </div>

      <div className="text-center max-w-md mx-auto px-4 relative z-10">
        {/* Processing State */}
        {status === 'processing' && (
          <AppLoader message={message} size="lg" showMessage={message !== ''} />
        )}
        
        {/* Success State */}
        {status === 'success' && (
          <div className="animate-[fade-in_0.5s_ease-out]">
            <div className="mb-8">
              <img 
                src="/logo.png"
                alt="SpecWeave"
                className="w-32 h-32 mx-auto rounded-2xl"
              />
            </div>
          </div>
        )}
        
        {/* Error State */}
        {status === 'error' && (
          <div className="animate-[fade-in_0.5s_ease-out]">
            <div className="mb-8">
              <img 
                src="/logo.png"
                alt="SpecWeave"
                className="w-32 h-32 mx-auto rounded-2xl opacity-50"
              />
            </div>
            <h2 className="text-3xl font-bold text-white mb-4">
              Login Tidak Berhasil
            </h2>
            <p className="text-gray-400 text-lg mb-8">{message}</p>
            
            <button
              onClick={() => navigate('/login', { replace: true })}
              className="px-8 py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white rounded-xl font-semibold transition-all duration-300 shadow-lg hover:shadow-xl"
            >
              Kembali ke Login
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default AuthCallback;