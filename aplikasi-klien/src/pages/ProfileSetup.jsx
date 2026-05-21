import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { FormInput } from '../components/common/FormField';
import { User } from 'lucide-react';

const ProfileSetup = () => {
  const navigate = useNavigate();
  const { user, profile, updateProfile } = useAuth();
  const [fullName, setFullName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // Redirect if not authenticated
  useEffect(() => {
    if (!user) {
      navigate('/', { replace: true });
    }
  }, [user, navigate]);

  // Pre-fill with Google name if available
  useEffect(() => {
    if (user?.user_metadata?.name || user?.user_metadata?.full_name) {
      setFullName(user.user_metadata.name || user.user_metadata.full_name);
    }
  }, [user]);

  // Redirect if profile already has name
  useEffect(() => {
    if (profile?.name && profile.name !== user?.email) {
      navigate('/chat', { replace: true });
    }
  }, [profile, user, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (!fullName || fullName.trim().length < 2) {
      setError('Please enter a valid full name (at least 2 characters)');
      return;
    }

    setIsLoading(true);

    try {
      const { error: updateError } = await updateProfile(user, {
        name: fullName.trim()
      });

      if (updateError) {
        setError(updateError.message || 'Failed to update profile');
      } else {
        // Success! Navigate to chat
        navigate('/chat', { replace: true });
      }
    } catch (err) {
      console.error('Profile setup error:', err);
      setError(err.message || 'An error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#020203] text-white overflow-hidden relative">
      {/* Background gradients */}
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] w-[50vw] h-[50vh] bg-[radial-gradient(circle_at_center,rgba(147,51,234,0.08)_0%,rgba(0,0,0,0)_70%)] blur-[100px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50vw] h-[50vh] bg-[radial-gradient(circle_at_center,rgba(236,72,153,0.08)_0%,rgba(0,0,0,0)_70%)] blur-[100px]" />
      </div>

      {/* Content */}
      <div className="relative z-10 min-h-screen flex items-center justify-center px-6">
        <div className="w-full max-w-md">
          {/* Card */}
          <div className="bg-[#0D0D0D] border border-white/10 rounded-2xl shadow-2xl p-8">
            {/* Header */}
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-purple-500/20 rounded-full mb-4">
                <User className="w-8 h-8 text-purple-400" />
              </div>
              <h1 className="text-3xl font-bold mb-2">Welcome! 👋</h1>
              <p className="text-gray-400">
                Please enter your full name to complete your profile
              </p>
            </div>

            {/* Error Message */}
            {error && (
              <div className="mb-6 p-4 bg-red-900/20 border border-red-500/50 rounded-lg flex items-start gap-3">
                <svg className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-red-300 text-sm">{error}</p>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-6">
              <FormInput
                label="Full Name"
                type="text"
                placeholder="Enter your full name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
                icon={<User className="w-5 h-5" />}
                autoFocus
              />

              <div className="text-xs text-gray-400">
                This name will be displayed throughout the application. You can change it later in settings.
              </div>

              <button
                type="submit"
                disabled={isLoading || !fullName.trim()}
                className="w-full py-3.5 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : (
                  'Continue'
                )}
              </button>
            </form>
          </div>

          {/* Info */}
          <div className="mt-6 text-center">
            <p className="text-sm text-gray-500">
              Logged in with Google • {user?.email}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfileSetup;
