/**
 * Enhanced Authentication Form Component
 * Handles sign-in/sign-up with real-time validation and Indonesian error messages
 */

import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { 
  validateAuthForm, 
  getPasswordStrengthLevel 
} from '../../utils/validation/authValidation';
import sessionManager from '../../utils/session/sessionManager';
import PasswordResetModal from '../modals/PasswordResetModal';
import { 
  AUTH_ERRORS, 
  SUCCESS_MESSAGES, 
  getUserFriendlyError 
} from '../../utils/localization';

const AuthForm = ({ 
  isSignup, 
  onToggleMode, 
  error, 
  setError, 
  successMessage, 
  setSuccessMessage,
  isSubmitting,
  setIsSubmitting 
}) => {
  const { signInWithEmail, signInWithGoogle, signUp } = useAuth();
  
  // Form state
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    name: '',
    confirmPassword: '',
    rememberMe: false,
    showPassword: false
  });

  // Real-time validation state
  const [validationErrors, setValidationErrors] = useState({});
  const [isFormValid, setIsFormValid] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState(null);
  
  // Password reset modal state
  const [showPasswordResetModal, setShowPasswordResetModal] = useState(false);

  // Real-time validation using enhanced validation utilities
  useEffect(() => {
    const validation = validateAuthForm(formData, isSignup);
    
    setValidationErrors(validation.errors);
    setIsFormValid(validation.isFormValid && formData.email && formData.password);
    setPasswordStrength(validation.passwordStrength);
  }, [formData, isSignup]);

  // Handle input changes
  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setError('');
    setSuccessMessage('');
  };

  // Handle form submission with session management
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!isFormValid) {
      setError('Mohon perbaiki kesalahan pada form');
      return;
    }

    setError('');
    setIsSubmitting(true);

    try {
      if (isSignup) {
        const { data, error } = await signUp(
          formData.email.trim().toLowerCase(), 
          formData.password, 
          { name: formData.name.trim() }
        );
        
        if (error) {
          setError(getUserFriendlyError(error));
        } else if (data.user) {
          // For signup, always set remember me to true for better UX
          sessionManager.setRememberMe(true);
          setSuccessMessage(SUCCESS_MESSAGES.REGISTER_SUCCESS);
        }
      } else {
        const { data, error } = await signInWithEmail(
          formData.email.trim().toLowerCase(), 
          formData.password
        );
        
        if (error) {
          setError(getUserFriendlyError(error));
        } else if (data.user) {
          // Set session management based on remember me preference
          sessionManager.setRememberMe(formData.rememberMe);
          sessionManager.initialize();
        }
      }
    } catch (err) {
      setError('Terjadi kesalahan. Periksa koneksi internet dan coba lagi.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Google authentication with enhanced error handling
  const handleGoogleAuth = async () => {
    setError('');
    setSuccessMessage('');
    setIsSubmitting(true);
    
    try {
      const mode = isSignup ? 'signup' : 'signin';
      
      // Show appropriate loading message
      setSuccessMessage(isSignup ? 'Mengarahkan ke Google untuk membuat akun...' : 'Mengarahkan ke Google untuk masuk...');
      
      // Store auth mode for callback validation
      sessionStorage.setItem('auth_mode', mode);
      
      // Add timeout for OAuth initiation
      const oauthPromise = signInWithGoogle(mode);
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('OAuth initiation timeout')), 10000)
      );
      
      const { error } = await Promise.race([oauthPromise, timeoutPromise]);
      
      if (error) {
        setError(getUserFriendlyError(error));
        setSuccessMessage('');
      }
    } catch (err) {
      console.error('Google OAuth error:', err);
      
      setError(getUserFriendlyError(err));
      
      setSuccessMessage('');
    } finally {
      // Reset loading state after a brief delay to show the message
      setTimeout(() => {
        setIsSubmitting(false);
        setSuccessMessage('');
      }, 1000);
    }
  };

  // Handle password reset
  const handlePasswordReset = (e) => {
    e.preventDefault();
    setShowPasswordResetModal(true);
  };

  // Password strength indicator with enhanced display
  const strengthLevel = getPasswordStrengthLevel(passwordStrength);

  return (
    <>
      <div className="w-full max-w-[500px] bg-[#0a0a0f]/80 backdrop-blur-xl border border-white/10 rounded-[2rem] p-8 sm:p-10 shadow-2xl relative overflow-hidden group hover:border-purple-500/20 transition-colors duration-500">
      
      {/* Header */}
      <div className="text-center mb-8 relative">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-tr from-purple-500/10 to-pink-500/10 border border-white/10 mb-5 shadow-lg shadow-purple-500/5">
          <svg className="w-7 h-7 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
          </svg>
        </div>
        <h3 className="text-2xl font-bold text-white mb-2 tracking-tight">
          {isSignup ? 'Buat Akun Baru' : 'Masuk ke Akun'}
        </h3>
        <p className="text-gray-400 text-sm">
          {isSignup ? 'Bergabung dengan SpecWeave untuk mulai membuat scenarios' : 'Masuk ke akun SpecWeave yang sudah ada'}
        </p>
      </div>

      {/* Warning/Welcome Messages */}
      {!isSignup && (
        <div className="mb-6 p-4 bg-yellow-900/20 border border-yellow-500/50 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <svg className="w-5 h-5 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
            <span className="text-yellow-400 font-medium text-sm">Perhatian</span>
          </div>
          <p className="text-yellow-300 text-sm">
            Anda hanya bisa masuk jika sudah pernah membuat akun sebelumnya. 
            Jika belum punya akun, silakan{' '}
            <button 
              onClick={onToggleMode} 
              className="underline hover:text-yellow-200 font-medium"
            >
              daftar terlebih dahulu
            </button>.
          </p>
        </div>
      )}

      {isSignup && (
        <div className="mb-6 p-4 bg-green-900/20 border border-green-500/50 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="text-green-400 font-medium text-sm">Selamat Datang!</span>
          </div>
          <p className="text-green-300 text-sm">
            Buat akun baru untuk mulai menggunakan SpecWeave. 
            Gratis dan mudah - hanya butuh beberapa detik!
          </p>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="mb-6 p-4 bg-red-900/20 border border-red-500/50 rounded-lg">
          <p className="text-red-400 text-sm">{error}</p>
        </div>
      )}

      {/* Success Message */}
      {successMessage && (
        <div className="mb-6 p-4 bg-green-900/20 border border-green-500/50 rounded-lg">
          <p className="text-green-400 text-sm">{successMessage}</p>
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-5 relative z-10">
        {/* Name Field (Signup only) */}
        {isSignup && (
          <div className="space-y-1.5">
            <label className="text-[11px] font-semibold text-gray-400 ml-1 uppercase tracking-wider">
              Nama Lengkap
            </label>
            <div className="relative group">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <svg className="h-5 w-5 text-gray-500 group-focus-within:text-purple-400 transition-colors duration-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                placeholder="Nama lengkap Anda"
                className={`w-full pl-12 pr-4 py-3.5 bg-[#050507] border rounded-xl text-white placeholder-gray-600 focus:outline-none focus:bg-[#0c0c12] transition-all duration-300 text-sm font-medium ${
                  validationErrors.name 
                    ? 'border-red-500/50 focus:border-red-500/50 focus:ring-2 focus:ring-red-500/20' 
                    : 'border-white/10 focus:border-purple-500/50 focus:ring-2 focus:ring-purple-500/20'
                }`}
                disabled={isSubmitting}
              />
            </div>
            {validationErrors.name && (
              <p className="text-red-400 text-xs mt-1 ml-1">{validationErrors.name}</p>
            )}
          </div>
        )}

        {/* Email Field */}
        <div className="space-y-1.5">
          <label className="text-[11px] font-semibold text-gray-400 ml-1 uppercase tracking-wider">
            Email
          </label>
          <div className="relative group">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <svg className="h-5 w-5 text-gray-500 group-focus-within:text-purple-400 transition-colors duration-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" />
              </svg>
            </div>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => handleInputChange('email', e.target.value)}
              placeholder="nama@perusahaan.com"
              className={`w-full pl-12 pr-4 py-3.5 bg-[#050507] border rounded-xl text-white placeholder-gray-600 focus:outline-none focus:bg-[#0c0c12] transition-all duration-300 text-sm font-medium ${
                validationErrors.email 
                  ? 'border-red-500/50 focus:border-red-500/50 focus:ring-2 focus:ring-red-500/20' 
                  : 'border-white/10 focus:border-purple-500/50 focus:ring-2 focus:ring-purple-500/20'
              }`}
              disabled={isSubmitting}
              required
            />
          </div>
          {validationErrors.email && (
            <p className="text-red-400 text-xs mt-1 ml-1">{validationErrors.email}</p>
          )}
        </div>

        {/* Password Field */}
        <div className="space-y-1.5">
          <label className="text-[11px] font-semibold text-gray-400 ml-1 uppercase tracking-wider">
            Password
          </label>
          <div className="relative group">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <svg className="h-5 w-5 text-gray-500 group-focus-within:text-purple-400 transition-colors duration-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <input
              type={formData.showPassword ? "text" : "password"}
              value={formData.password}
              onChange={(e) => handleInputChange('password', e.target.value)}
              placeholder="••••••••"
              className={`w-full pl-12 pr-12 py-3.5 bg-[#050507] border rounded-xl text-white placeholder-gray-600 focus:outline-none focus:bg-[#0c0c12] transition-all duration-300 text-sm font-medium ${
                validationErrors.password 
                  ? 'border-red-500/50 focus:border-red-500/50 focus:ring-2 focus:ring-red-500/20' 
                  : 'border-white/10 focus:border-purple-500/50 focus:ring-2 focus:ring-purple-500/20'
              }`}
              disabled={isSubmitting}
              required
            />
            <button 
              type="button"
              onClick={() => handleInputChange('showPassword', !formData.showPassword)}
              className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-500 hover:text-white transition-colors focus:outline-none"
              disabled={isSubmitting}
            >
              {formData.showPassword ? (
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                </svg>
              ) : (
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
              )}
            </button>
          </div>
          {validationErrors.password && (
            <p className="text-red-400 text-xs mt-1 ml-1">{validationErrors.password}</p>
          )}
          
          {/* Password Strength Indicator (Signup only) */}
          {isSignup && formData.password && (
            <div className="mt-2">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs text-gray-500">Kekuatan password:</p>
                <span className={`text-xs font-medium ${strengthLevel.color}`}>
                  {strengthLevel.level}
                </span>
              </div>
              <div className="space-y-1">
                <div className={`flex items-center gap-2 text-xs ${passwordStrength?.minLength ? 'text-green-400' : 'text-gray-500'}`}>
                  <div className={`w-1.5 h-1.5 rounded-full ${passwordStrength?.minLength ? 'bg-green-400' : 'bg-gray-600'}`} />
                  Minimal 8 karakter
                </div>
                <div className={`flex items-center gap-2 text-xs ${passwordStrength?.hasUpperCase ? 'text-green-400' : 'text-gray-500'}`}>
                  <div className={`w-1.5 h-1.5 rounded-full ${passwordStrength?.hasUpperCase ? 'bg-green-400' : 'bg-gray-600'}`} />
                  Huruf besar
                </div>
                <div className={`flex items-center gap-2 text-xs ${passwordStrength?.hasLowerCase ? 'text-green-400' : 'text-gray-500'}`}>
                  <div className={`w-1.5 h-1.5 rounded-full ${passwordStrength?.hasLowerCase ? 'bg-green-400' : 'bg-gray-600'}`} />
                  Huruf kecil
                </div>
                <div className={`flex items-center gap-2 text-xs ${passwordStrength?.hasNumbers ? 'text-green-400' : 'text-gray-500'}`}>
                  <div className={`w-1.5 h-1.5 rounded-full ${passwordStrength?.hasNumbers ? 'bg-green-400' : 'bg-gray-600'}`} />
                  Angka
                </div>
                {passwordStrength?.hasSpecialChars && (
                  <div className="flex items-center gap-2 text-xs text-green-400">
                    <div className="w-1.5 h-1.5 rounded-full bg-green-400" />
                    Karakter khusus (bonus)
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Confirm Password Field (Signup only) */}
        {isSignup && (
          <div className="space-y-1.5">
            <label className="text-[11px] font-semibold text-gray-400 ml-1 uppercase tracking-wider">
              Konfirmasi Password
            </label>
            <div className="relative group">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <svg className="h-5 w-5 text-gray-500 group-focus-within:text-purple-400 transition-colors duration-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <input
                type="password"
                value={formData.confirmPassword}
                onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
                placeholder="••••••••"
                className={`w-full pl-12 pr-4 py-3.5 bg-[#050507] border rounded-xl text-white placeholder-gray-600 focus:outline-none focus:bg-[#0c0c12] transition-all duration-300 text-sm font-medium ${
                  validationErrors.confirmPassword 
                    ? 'border-red-500/50 focus:border-red-500/50 focus:ring-2 focus:ring-red-500/20' 
                    : 'border-white/10 focus:border-purple-500/50 focus:ring-2 focus:ring-purple-500/20'
                }`}
                disabled={isSubmitting}
                required
              />
            </div>
            {validationErrors.confirmPassword && (
              <p className="text-red-400 text-xs mt-1 ml-1">{validationErrors.confirmPassword}</p>
            )}
          </div>
        )}

        {/* Submit Button */}
        <button
          type="submit"
          disabled={isSubmitting || !isFormValid}
          className="block w-full py-3.5 mt-4 bg-gradient-to-r from-purple-600 to-pink-600 rounded-xl text-center font-bold text-white shadow-lg shadow-purple-500/30 hover:shadow-purple-500/50 hover:opacity-90 transition-all duration-300 transform hover:-translate-y-0.5 active:scale-[0.98] text-sm tracking-wide border border-white/10 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
        >
          {isSubmitting ? (
            <div className="flex items-center justify-center">
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2"></div>
              {isSignup ? 'Membuat Akun...' : 'Masuk...'}
            </div>
          ) : (
            <>
              {isSignup ? 'Buat Akun Baru' : 'Masuk ke Akun'}
              <svg className="w-4 h-4 inline-block ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
              </svg>
            </>
          )}
        </button>

        {/* Remember Me (Login only) */}
        {!isSignup && (
          <div className="flex items-center justify-between text-xs text-gray-400 pt-1">
            <label className="flex items-center gap-2 cursor-pointer hover:text-white transition-colors group select-none">
              <div className={`w-4 h-4 rounded border flex items-center justify-center transition-all ${
                formData.rememberMe ? 'bg-purple-600 border-purple-600' : 'border-gray-600 bg-transparent group-hover:border-gray-400'
              }`}>
                {formData.rememberMe && (
                  <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </div>
              <input 
                type="checkbox" 
                className="hidden" 
                checked={formData.rememberMe} 
                onChange={e => handleInputChange('rememberMe', e.target.checked)} 
              />
              <span>Ingat saya</span>
            </label>
            <a 
              href="#" 
              onClick={handlePasswordReset}
              className="hover:text-purple-400 transition-colors font-medium"
            >
              Lupa password?
            </a>
          </div>
        )}

        {/* Divider */}
        <div className="relative py-3">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-white/10"></div>
          </div>
          <div className="relative flex justify-center">
            <span className="px-3 bg-[#0a0a0f] text-[10px] uppercase tracking-widest text-gray-500 font-bold">
              atau lanjutkan dengan
            </span>
          </div>
        </div>

        {/* Google Auth Button */}
        <button 
          type="button"
          onClick={handleGoogleAuth}
          disabled={isSubmitting}
          className="w-full py-3 bg-white hover:bg-gray-100 text-black rounded-xl font-bold text-sm transition-all duration-300 flex items-center justify-center gap-3 shadow-lg transform active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none disabled:hover:bg-white"
        >
          {isSubmitting ? (
            <div className="flex items-center justify-center">
              <div className="w-5 h-5 border-2 border-gray-400 border-t-gray-800 rounded-full animate-spin mr-2"></div>
              {successMessage ? (
                <span className="text-sm">{successMessage.replace('...', '')}</span>
              ) : (
                <span>{isSignup ? 'Mengarahkan...' : 'Memproses...'}</span>
              )}
            </div>
          ) : (
            <>
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              <span>{isSignup ? 'Daftar dengan Google' : 'Masuk dengan Google'}</span>
            </>
          )}
        </button>

        {/* Auth Mode Toggle */}
        <div className="text-center pt-4">
          <p className="text-gray-400 text-sm">
            {isSignup ? 'Sudah punya akun SpecWeave?' : 'Belum punya akun SpecWeave?'}{' '}
            <button
              type="button"
              onClick={onToggleMode}
              className="text-purple-400 hover:text-purple-300 font-medium transition-colors"
              disabled={isSubmitting}
            >
              {isSignup ? 'Masuk ke akun yang ada' : 'Buat akun baru'}
            </button>
          </p>
        </div>
      </form>
      </div>

      {/* Password Reset Modal */}
      <PasswordResetModal 
        isOpen={showPasswordResetModal}
        onClose={() => setShowPasswordResetModal(false)}
      />
    </>
  );
};

export default AuthForm;