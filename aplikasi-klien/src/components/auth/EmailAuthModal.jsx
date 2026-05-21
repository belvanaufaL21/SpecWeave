import { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { FormInput } from '../common/FormField';
import { Mail, Lock, User, Eye, EyeOff, Check } from 'lucide-react';
import AuthService from '../../services/auth/AuthService';

const EmailAuthModal = ({ isOpen, onClose, onSuccess }) => {
  const { signInWithEmail } = useAuth();
  const [activeTab, setActiveTab] = useState('login'); // 'login' or 'signup'
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Sign up steps (1: email, 2: verification code, 3: password, 4: full name)
  const [signupStep, setSignupStep] = useState(1);

  // Form data
  const [loginData, setLoginData] = useState({
    email: '',
    password: ''
  });

  const [signupData, setSignupData] = useState({
    email: '',
    verificationCode: '',
    password: '',
    fullName: ''
  });

  // Validation errors
  const [loginErrors, setLoginErrors] = useState({});
  const [signupErrors, setSignupErrors] = useState({});

  // Reset form when switching tabs
  const handleTabSwitch = (tab) => {
    setActiveTab(tab);
    setError(null);
    setLoginErrors({});
    setSignupErrors({});
    setSignupStep(1); // Reset signup step
  };

  // Validate email format
  const isValidEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  // Validate login form
  const validateLogin = () => {
    const errors = {};
    
    if (!loginData.email) {
      errors.email = 'Email is required';
    } else if (!isValidEmail(loginData.email)) {
      errors.email = 'Invalid email format';
    }
    
    if (!loginData.password) {
      errors.password = 'Password is required';
    } else if (loginData.password.length < 6) {
      errors.password = 'Password must be at least 6 characters';
    }
    
    setLoginErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Validate signup form based on current step
  const validateSignupStep = (step) => {
    const errors = {};
    
    if (step === 1) {
      // Step 1: Email validation
      if (!signupData.email) {
        errors.email = 'Email is required';
      } else if (!isValidEmail(signupData.email)) {
        errors.email = 'Invalid email format';
      }
    } else if (step === 2) {
      // Step 2: Verification code validation
      if (!signupData.verificationCode) {
        errors.verificationCode = 'Verification code is required';
      } else if (signupData.verificationCode.length !== 6) {
        errors.verificationCode = 'Verification code must be 6 digits';
      }
    } else if (step === 3) {
      // Step 3: Password validation
      if (!signupData.password) {
        errors.password = 'Password is required';
      } else if (signupData.password.length < 6) {
        errors.password = 'Password must be at least 6 characters';
      }
    } else if (step === 4) {
      // Step 4: Full name validation
      if (!signupData.fullName) {
        errors.fullName = 'Full name is required';
      } else if (signupData.fullName.length < 2) {
        errors.fullName = 'Name must be at least 2 characters';
      }
    }
    
    setSignupErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Handle login submit
  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    
    if (!validateLogin()) {
      return;
    }
    
    setIsLoading(true);
    
    try {
      const { error: authError } = await signInWithEmail(loginData.email, loginData.password);
      
      if (authError) {
        setError(authError.message || 'Login failed. Please check your credentials.');
      } else {
        // Call onSuccess callback
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

  // Handle signup step navigation
  const handleSignupNext = async () => {
    setError(null);
    
    if (!validateSignupStep(signupStep)) {
      return;
    }
    
    setIsLoading(true);
    
    try {
      if (signupStep === 1) {
        // Step 1: Send OTP to email
        const { error: otpError } = await AuthService.sendOTP(signupData.email);
        
        if (otpError) {
          setError(otpError.message || 'Gagal mengirim kode verifikasi. Silakan coba lagi.');
          setIsLoading(false);
          return;
        }
        
        // Move to step 2
        setSignupStep(2);
      } else if (signupStep === 2) {
        // Step 2: Verify OTP code
        const { error: verifyError } = await AuthService.verifyOTP(
          signupData.email,
          signupData.verificationCode
        );
        
        if (verifyError) {
          setError(verifyError.message || 'Kode verifikasi tidak valid. Silakan coba lagi.');
          setIsLoading(false);
          return;
        }
        
        // Move to step 3
        setSignupStep(3);
      } else if (signupStep === 3) {
        // Step 3: Password set, move to step 4
        setSignupStep(4);
      } else if (signupStep === 4) {
        // Step 4: Complete signup by updating user with password and name
        const { error: signupError } = await AuthService.signUpWithOTP(
          signupData.email,
          signupData.verificationCode,
          signupData.password,
          { full_name: signupData.fullName }
        );
        
        if (signupError) {
          setError(signupError.message || 'Gagal membuat akun. Silakan coba lagi.');
        } else {
          // Call onSuccess callback
          if (onSuccess) {
            onSuccess();
          }
        }
      }
    } catch (err) {
      console.error('Signup error:', err);
      setError(err.message || 'Terjadi kesalahan. Silakan coba lagi.');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle resend OTP
  const handleResendOTP = async () => {
    setError(null);
    setIsLoading(true);
    
    try {
      const { error: otpError } = await AuthService.sendOTP(signupData.email);
      
      if (otpError) {
        setError(otpError.message || 'Gagal mengirim ulang kode. Silakan coba lagi.');
      } else {
        // Show success message (you can add a success state if needed)
        setError(null);
        alert('Kode verifikasi telah dikirim ulang ke email Anda!');
      }
    } catch (err) {
      console.error('Resend OTP error:', err);
      setError(err.message || 'Gagal mengirim ulang kode.');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle signup back button
  const handleSignupBack = () => {
    if (signupStep > 1) {
      setSignupStep(signupStep - 1);
      setError(null);
      setSignupErrors({});
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

          {/* Login Form */}
          {activeTab === 'login' && (
            <form onSubmit={handleLoginSubmit} className="space-y-4">
              <FormInput
                label="Email"
                type="email"
                placeholder="Enter your email"
                value={loginData.email}
                onChange={(e) => setLoginData({ ...loginData, email: e.target.value })}
                error={loginErrors.email}
                hasError={!!loginErrors.email}
                required
                icon={<Mail className="w-5 h-5" />}
              />

              <div className="relative">
                <FormInput
                  label="Password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Enter your password"
                  value={loginData.password}
                  onChange={(e) => setLoginData({ ...loginData, password: e.target.value })}
                  error={loginErrors.password}
                  hasError={!!loginErrors.password}
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

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3.5 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Logging in...</span>
                  </>
                ) : (
                  'Login'
                )}
              </button>
            </form>
          )}

          {/* Signup Form - Multi Step */}
          {activeTab === 'signup' && (
            <div className="space-y-6">
              {/* Step Indicators */}
              <div className="flex items-center justify-center gap-2">
                {[1, 2, 3, 4].map((step) => (
                  <div
                    key={step}
                    className={`w-2.5 h-2.5 rounded-full transition-all duration-300 ${
                      step === signupStep
                        ? 'bg-purple-500 w-8'
                        : step < signupStep
                        ? 'bg-purple-500/50'
                        : 'bg-gray-600'
                    }`}
                  />
                ))}
              </div>

              {/* Step 1: Email */}
              {signupStep === 1 && (
                <div className="space-y-4">
                  <div className="text-center mb-6">
                    <h3 className="text-lg font-semibold text-white mb-2">Masukkan Email Anda</h3>
                    <p className="text-sm text-gray-400">
                      Kami akan mengirimkan kode verifikasi ke email Anda
                    </p>
                  </div>

                  <FormInput
                    label="Email"
                    type="email"
                    placeholder="contoh@email.com"
                    value={signupData.email}
                    onChange={(e) => setSignupData({ ...signupData, email: e.target.value })}
                    error={signupErrors.email}
                    hasError={!!signupErrors.email}
                    required
                    icon={<Mail className="w-5 h-5" />}
                  />

                  <button
                    onClick={handleSignupNext}
                    disabled={isLoading}
                    className="w-full py-3.5 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {isLoading ? (
                      <>
                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        <span>Mengirim kode...</span>
                      </>
                    ) : (
                      'Kirim Kode Verifikasi'
                    )}
                  </button>
                </div>
              )}

              {/* Step 2: Verification Code */}
              {signupStep === 2 && (
                <div className="space-y-4">
                  <div className="text-center mb-6">
                    <h3 className="text-lg font-semibold text-white mb-2">Masukkan Kode Verifikasi</h3>
                    <p className="text-sm text-gray-400">
                      Kode verifikasi telah dikirim ke <span className="text-purple-400">{signupData.email}</span>
                    </p>
                  </div>

                  <FormInput
                    label="Kode Verifikasi"
                    type="text"
                    placeholder="Masukkan 6 digit kode"
                    value={signupData.verificationCode}
                    onChange={(e) => {
                      const value = e.target.value.replace(/\D/g, '').slice(0, 6);
                      setSignupData({ ...signupData, verificationCode: value });
                    }}
                    error={signupErrors.verificationCode}
                    hasError={!!signupErrors.verificationCode}
                    required
                    maxLength={6}
                    className="text-center text-2xl tracking-widest"
                  />

                  <div className="flex gap-3">
                    <button
                      onClick={handleSignupBack}
                      className="flex-1 py-3.5 bg-gray-700 hover:bg-gray-600 text-white font-semibold rounded-xl transition-all duration-300"
                    >
                      Kembali
                    </button>
                    <button
                      onClick={handleSignupNext}
                      disabled={isLoading}
                      className="flex-1 py-3.5 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                      {isLoading ? (
                        <>
                          <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          <span>Memverifikasi...</span>
                        </>
                      ) : (
                        'Verifikasi'
                      )}
                    </button>
                  </div>

                  <button
                    onClick={handleResendOTP}
                    disabled={isLoading}
                    className="w-full text-sm text-purple-400 hover:text-purple-300 transition-colors disabled:opacity-50"
                  >
                    Kirim ulang kode
                  </button>
                </div>
              )}

              {/* Step 3: Password */}
              {signupStep === 3 && (
                <div className="space-y-4">
                  <div className="text-center mb-6">
                    <div className="inline-flex items-center justify-center w-12 h-12 bg-green-500/20 rounded-full mb-3">
                      <Check className="w-6 h-6 text-green-400" />
                    </div>
                    <h3 className="text-lg font-semibold text-white mb-2">Email Terverifikasi!</h3>
                    <p className="text-sm text-gray-400">
                      Sekarang buat password untuk akun Anda
                    </p>
                  </div>

                  <div className="relative">
                    <FormInput
                      label="Password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Minimal 6 karakter"
                      value={signupData.password}
                      onChange={(e) => setSignupData({ ...signupData, password: e.target.value })}
                      error={signupErrors.password}
                      hasError={!!signupErrors.password}
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

                  <div className="flex gap-3">
                    <button
                      onClick={handleSignupBack}
                      className="flex-1 py-3.5 bg-gray-700 hover:bg-gray-600 text-white font-semibold rounded-xl transition-all duration-300"
                    >
                      Kembali
                    </button>
                    <button
                      onClick={handleSignupNext}
                      disabled={isLoading}
                      className="flex-1 py-3.5 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Selanjutnya
                    </button>
                  </div>
                </div>
              )}

              {/* Step 4: Full Name */}
              {signupStep === 4 && (
                <div className="space-y-4">
                  <div className="text-center mb-6">
                    <h3 className="text-lg font-semibold text-white mb-2">Hampir Selesai!</h3>
                    <p className="text-sm text-gray-400">
                      Masukkan nama lengkap Anda
                    </p>
                  </div>

                  <FormInput
                    label="Nama Lengkap"
                    type="text"
                    placeholder="Masukkan nama lengkap Anda"
                    value={signupData.fullName}
                    onChange={(e) => setSignupData({ ...signupData, fullName: e.target.value })}
                    error={signupErrors.fullName}
                    hasError={!!signupErrors.fullName}
                    required
                    icon={<User className="w-5 h-5" />}
                  />

                  <div className="text-xs text-gray-400">
                    Dengan mendaftar, Anda menyetujui{' '}
                    <button type="button" className="text-purple-400 hover:text-purple-300">
                      Syarat & Ketentuan
                    </button>{' '}
                    dan{' '}
                    <button type="button" className="text-purple-400 hover:text-purple-300">
                      Kebijakan Privasi
                    </button>
                  </div>

                  <div className="flex gap-3">
                    <button
                      onClick={handleSignupBack}
                      className="flex-1 py-3.5 bg-gray-700 hover:bg-gray-600 text-white font-semibold rounded-xl transition-all duration-300"
                    >
                      Kembali
                    </button>
                    <button
                      onClick={handleSignupNext}
                      disabled={isLoading}
                      className="flex-1 py-3.5 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                      {isLoading ? (
                        <>
                          <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          <span>Membuat akun...</span>
                        </>
                      ) : (
                        'Selesai'
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default EmailAuthModal;
