import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { registerUser } from '../utils/userValidation';
import { supabase } from '../config/supabase';
import LoadingSpinner from '../components/common/LoadingSpinner';

const AuthCallback = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [status, setStatus] = useState('processing'); // processing, success, error
  const [message, setMessage] = useState('Processing authentication...');
  const [validationComplete, setValidationComplete] = useState(false);

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        // Get auth mode from sessionStorage
        const authMode = sessionStorage.getItem('auth_mode');
        console.log('🔍 [AUTH-CALLBACK] Processing callback with mode:', authMode);
        
        // Check for error parameters first
        const error = searchParams.get('error');
        const errorDescription = searchParams.get('error_description');

        if (error) {
          setStatus('error');
          let errorMessage = 'Authentication failed.';
          
          if (error === 'access_denied') {
            errorMessage = 'Access was denied. Please try again and grant the necessary permissions.';
          } else if (errorDescription) {
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
          console.log('🔍 [AUTH-CALLBACK] OAuth tokens found in URL');
          
          // Just show processing message - validation will happen when user state updates
          setMessage('Processing...');
          return;
        }

        // If no tokens and no user, wait for auth state to update
        if (!user) {
          console.log('❌ [AUTH-CALLBACK] No user and no tokens, waiting...');
          setMessage('Completing authentication...');
          
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

      let authMode = null; // Declare outside try block
      
      try {
        authMode = sessionStorage.getItem('auth_mode');
        console.log('🔍 [AUTH-CALLBACK] Validating user:', user.email, 'Mode:', authMode);

        // CRITICAL: If no auth mode, try to determine from URL or default to signup
        if (!authMode) {
          console.log('⚠️ [AUTH-CALLBACK] No auth mode found - checking URL params');
          
          // Check if there's a mode in URL params as fallback
          const urlMode = searchParams.get('mode');
          if (urlMode && (urlMode === 'signin' || urlMode === 'signup')) {
            console.log('🔄 [AUTH-CALLBACK] Found mode in URL params:', urlMode);
            sessionStorage.setItem('auth_mode', urlMode);
            authMode = urlMode;
          } else {
            // Default to signup for safety - this allows new users to register
            console.log('🔄 [AUTH-CALLBACK] No mode found, defaulting to signup for safety');
            sessionStorage.setItem('auth_mode', 'signup');
            authMode = 'signup';
          }
        }

        // For signin mode - simple validation
        if (authMode === 'signin') {
          console.log('🔍 [AUTH-CALLBACK] Signin mode - checking if user exists');
          setMessage('Checking account...');
          
          try {
            // Simple check: does profile exist?
            const { data: profile, error } = await supabase
              .from('profiles')
              .select('id, email')
              .eq('id', user.id)
              .maybeSingle();
            
            // If there's a database error, don't block the user - allow signin
            if (error && error.code !== 'PGRST116') {
              console.warn('⚠️ [AUTH-CALLBACK] Database error during profile check:', error);
              console.log('✅ [AUTH-CALLBACK] Allowing signin due to database error (fail-safe)');
              setStatus('success');
              setMessage('Access granted.');
              setValidationComplete(true);
              
              setTimeout(() => {
                navigate('/dashboard', { replace: true });
              }, 1500);
              return;
            }
            
            if (!profile) {
              console.log('🚫 [AUTH-CALLBACK] No profile found - blocking signin');
              
              // Get current user info for cleanup
              const currentUserId = user.id;
              const currentUserEmail = user.email;
              
              // Force logout first
              await supabase.auth.signOut();
              
              // Try to cleanup the orphaned user from auth table
              try {
                console.log('🗑️ [AUTH-CALLBACK] Attempting to cleanup orphaned user from auth table');
                
                // Call the cleanup function we created
                const { data: cleanupResult, error: cleanupError } = await supabase
                  .rpc('cleanup_orphaned_auth_users');
                
                if (cleanupError) {
                  console.warn('⚠️ [AUTH-CALLBACK] Cleanup function error:', cleanupError.message);
                  console.log('ℹ️ [AUTH-CALLBACK] User may remain in auth.users table');
                } else if (cleanupResult && cleanupResult.length > 0) {
                  const result = cleanupResult[0];
                  if (result.deleted_count > 0) {
                    console.log(`✅ [AUTH-CALLBACK] Successfully cleaned up ${result.deleted_count} orphaned user(s)`);
                    console.log('📧 [AUTH-CALLBACK] Deleted emails:', result.deleted_emails);
                  } else {
                    console.log('ℹ️ [AUTH-CALLBACK] No orphaned users found to cleanup');
                  }
                }
              } catch (cleanupError) {
                console.warn('⚠️ [AUTH-CALLBACK] Exception during cleanup:', cleanupError.message);
                console.log('ℹ️ [AUTH-CALLBACK] This is expected if cleanup function is not available');
              }
              
              // Set error state
              setStatus('error');
              setMessage('Access denied.');
              setValidationComplete(true);
              
              // Redirect with error
              setTimeout(() => {
                const errorMsg = encodeURIComponent('Access denied. Your Google account is not registered in our system. Please sign up first to create your account.');
                window.location.href = `/?mode=signup&error=signin_blocked&message=${errorMsg}`;
              }, 2000);
              return;
            }
            
            // Profile exists - allow signin
            console.log('✅ [AUTH-CALLBACK] Profile found - signin allowed');
            setStatus('success');
            setMessage('Access granted.');
            setValidationComplete(true);
            
            setTimeout(() => {
              navigate('/dashboard', { replace: true });
            }, 1500);
            
          } catch (validationError) {
            console.error('❌ [AUTH-CALLBACK] Validation error:', validationError);
            
            await supabase.auth.signOut();
            setStatus('error');
            setMessage('Authentication failed.');
            setValidationComplete(true);
            
            setTimeout(() => {
              const errorMsg = encodeURIComponent('Validation failed during sign-in. Please try again.');
              navigate(`/?mode=signin&error=validation_failed&message=${errorMsg}`, { replace: true });
            }, 2000);
            return;
          }
        }

        // For signup mode
        if (authMode === 'signup') {
          console.log('📝 [AUTH-CALLBACK] Signup mode - creating profile if needed');
          
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
              console.log('✅ [AUTH-CALLBACK] Profile already exists for signup');
              profile = existingProfile;
            } else {
              // Create profile with retry logic
              while (!profile && attempts < maxAttempts) {
                attempts++;
                console.log(`📝 [AUTH-CALLBACK] Creating profile (attempt ${attempts}/${maxAttempts})`);
                
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
                    console.log('✅ [AUTH-CALLBACK] Profile created successfully');
                    break;
                  } else if (insertError && insertError.code === '23505') {
                    // Unique violation - profile might have been created by trigger
                    console.log('ℹ️ [AUTH-CALLBACK] Profile might exist due to trigger, checking...');
                    const { data: triggerProfile } = await supabase
                      .from('profiles')
                      .select('id, email')
                      .eq('id', user.id)
                      .maybeSingle();
                    
                    if (triggerProfile) {
                      profile = triggerProfile;
                      console.log('✅ [AUTH-CALLBACK] Found profile created by trigger');
                      break;
                    }
                  } else {
                    console.warn(`⚠️ [AUTH-CALLBACK] Profile creation attempt ${attempts} failed:`, insertError);
                    if (attempts < maxAttempts) {
                      await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second before retry
                    }
                  }
                } catch (createError) {
                  console.warn(`⚠️ [AUTH-CALLBACK] Profile creation attempt ${attempts} error:`, createError);
                  if (attempts < maxAttempts) {
                    await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second before retry
                  }
                }
              }
            }
            
            // Even if profile creation failed, allow signup to proceed
            // The trigger should handle profile creation, and user can still access the app
            if (!profile) {
              console.warn('⚠️ [AUTH-CALLBACK] Profile creation failed after retries, but allowing signup to proceed');
            }
            
          } catch (profileError) {
            console.warn('⚠️ [AUTH-CALLBACK] Profile creation error:', profileError);
            // Don't block signup due to profile creation issues
          }
          
          setStatus('success');
          setMessage('Account created.');
          setValidationComplete(true);
          
          setTimeout(() => {
            navigate('/dashboard', { replace: true });
          }, 1500);
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
        // Clear auth mode after processing, but preserve it briefly for debugging
        if (authMode) {
          console.log('🧹 [AUTH-CALLBACK] Clearing auth mode:', authMode);
          setTimeout(() => {
            sessionStorage.removeItem('auth_mode');
          }, 1000); // Small delay to allow for debugging
        }
      }
    };

    // Only validate if user exists and validation hasn't been completed
    if (user && !validationComplete) {
      validateUser();
    }
  }, [user, validationComplete, navigate]);

  return (
    <div className="min-h-screen bg-[#020203] text-white flex items-center justify-center">
      <div className="text-center max-w-md mx-auto px-4">
        {/* Status Icon */}
        <div className="w-20 h-20 mx-auto mb-6 rounded-2xl flex items-center justify-center shadow-lg">
          {status === 'processing' && (
            <div className="bg-gradient-to-br from-purple-600 to-pink-600 w-full h-full rounded-2xl flex items-center justify-center">
              <div className="w-8 h-8 border-3 border-white/30 border-t-white rounded-full animate-spin"></div>
            </div>
          )}
          
          {status === 'success' && (
            <div className="bg-gradient-to-br from-green-600 to-emerald-600 w-full h-full rounded-2xl flex items-center justify-center shadow-green-500/20">
              <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
          )}
          
          {status === 'error' && (
            <div className="bg-gradient-to-br from-red-600 to-red-700 w-full h-full rounded-2xl flex items-center justify-center shadow-red-500/20">
              <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
          )}
        </div>

        {/* Status Message */}
        <h2 className="text-2xl font-bold text-white mb-4">
          {status === 'processing' && 'Signing You In...'}
          {status === 'success' && 'Access Granted'}
          {status === 'error' && 'Access Denied'}
        </h2>

        <p className="text-gray-400 mb-6">{message}</p>

        {/* Additional error info for sign in failures */}
        {status === 'error' && (message.includes('Account not found') || message.includes('denied') || message.includes('blocked')) && (
          <div className="mb-6 p-4 bg-red-900/20 border border-red-500/50 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <svg className="w-5 h-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
              <span className="text-red-400 font-medium text-sm">Access Denied</span>
            </div>
            <p className="text-red-300 text-sm mb-3">
              Your Google account is not registered in our system. You tried to sign in, but we require users to sign up first.
            </p>
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 bg-red-400 rounded-full"></span>
                <span className="text-red-200">Click "Sign Up with Google" to create your account</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 bg-red-400 rounded-full"></span>
                <span className="text-red-200">After signup, you can use "Sign In with Google" normally</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 bg-red-400 rounded-full"></span>
                <span className="text-red-200">This security measure protects our system from unauthorized access</span>
              </div>
            </div>
          </div>
        )}

        {/* Loading Spinner for processing */}
        {status === 'processing' && (
          <LoadingSpinner size="sm" text="Please wait..." />
        )}

        {/* Manual redirect button for errors */}
        {status === 'error' && (
          <button
            onClick={() => navigate('/', { replace: true })}
            className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
          >
            Return to Login
          </button>
        )}

        {/* Success animation */}
        {status === 'success' && (
          <div className="flex items-center justify-center gap-2 text-sm text-gray-500">
            <div className="w-4 h-4 border-2 border-green-500/30 border-t-green-500 rounded-full animate-spin"></div>
            Redirecting...
          </div>
        )}
      </div>
    </div>
  );
};

export default AuthCallback;