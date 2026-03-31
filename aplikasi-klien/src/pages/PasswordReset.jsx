/**
 * Password Reset Page Component
 * Handles password reset form when user clicks the reset link
 */

import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { validatePassword, getPasswordStrengthLevel } from '../utils/validation/authValidation';
import LoadingSpinner from '../components/common/LoadingSpinner';

const PasswordReset = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { updatePassword } = useAuth();

  const [formData, setFormData] = useState({
    password: '',
    confirmPassword: '',
    showPassword: false
  });

  const [validationErrors, setValidationErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [isValidToken, setIsValidToken] = useState(null); // null = checking, true = valid, false = invalid

  // Check if reset token is valid
  useEffect(() => {
    const checkToken = async () => {
      const accessToken = searchParams.get('access_token');
      const refreshToken = searchParams.get('refresh_token');
      const type = searchParams.get('type');

      if (!accessToken || !refreshToken || type !== 'recovery') {
        setIsValidToken(false);
        setError('Link reset password tidak valid atau sudah kedaluwarsa.');
        return;
      }

      try {
        // The tokens are automatically handled by Supabase auth
        setIsValidToken(true);
      } catch (err) {
        setIsValidToken(false);
        setError('Link reset password tidak valid atau sudah kedaluwarsa.');
      }
    };

    checkToken();
  }, [searchParams]);

  // Real-time validation
  useEffect(() => {
    const errors = {};

    // Password validation
    const passwordValidation = validatePassword(formData.password);
    if (formData.password && !passwordValidation.isValid) {
      errors.password = passwordValidation.error;
    }

    // Confirm password validation
    if (formData.confirmPassword && formData.password !== formData.confirmPassword) {
      errors.confirmPassword = 'Password tidak cocok';
    }

    setValidationErrors(errors);
  }, [formData]);

  // Handle input changes
  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setError('');
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validate form
    const passwordValidation = validatePassword(formData.password);
    if (!passwordValidation.isValid) {
      setValidationErrors({ password: passwordValidation.error });
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setValidationErrors({ confirmPassword: 'Password tidak cocok' });
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      const { error } = await updatePassword(formData.password);

      if (error) {
        if (error.message.includes('weak password')) {
          setError('Password terlalu lemah. Gunakan kombinasi huruf besar, kecil, dan angka.');
        } else if (error.message.includes('same password')) {
          setError('Password baru tidak boleh sama dengan password lama.');
        } else {
          setError('Gagal mengubah password. Silakan coba lagi.');
        }
      } else {
        setSuccess(true);
        // Redirect to login after 3 seconds
        setTimeout(() => {
          navigate('/?message=' + encodeURIComponent('Password berhasil diubah. Silakan masuk dengan password baru.'));
        }, 3000);
      }
    } catch (err) {
      setError('Terjadi kesalahan. Silakan coba lagi.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Get password strength
  const passwordValidation = validatePassword(formData.password);
  const strengthLevel = getPasswordStrengthLevel(passwordValidation.strength);

  // Loading state while checking token
  if (isValidToken === null) {
    return (
      <div className="min-h-screen bg-[#020203] text-white flex items-center justify-center">
        <div className="text-center">
          <LoadingSpinner size="lg" text="Memverifikasi link reset password..." />
        </div>
      </div>
    );
  }

  // Invalid token state
  if (isValidToken === false) {
    return (
      <div className="min-h-screen bg-[#020203] text-white flex items-center justify-center">
        <div className="text-center max-w-md mx-auto px-4">
          <div className="w-20 h-20 bg-red-600/20 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-10 h-10 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          
          <h2 className="text-2xl font-bold text-white mb-4">Link Tidak Valid</h2>
          <p className="text-gray-400 mb-6">{error}</p>
          
          <button
            onClick={() => navigate('/')}
            className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
          >
            Kembali ke Login
          </button>
        </div>
      </div>
    );
  }

  // Success state
  if (success) {
    return (
      <div className="min-h-screen bg-[#020203] text-white flex items-center justify-center">
        <div className="text-center max-w-md mx-auto px-4">
          <div className="w-20 h-20 bg-green-600/20 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-10 h-10 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          
          <h2 className="text-2xl font-bold text-white mb-4">Password Berhasil Diubah</h2>
          <p className="text-gray-400 mb-6">
            Password Anda telah berhasil diubah. Anda akan diarahkan ke halaman login.
          </p>
          
          <div className="flex items-center justify-center gap-2 text-sm text-gray-500">
            <div className="w-4 h-4 border-2 border-green-500/30 border-t-green-500 rounded-full animate-spin"></div>
            Mengarahkan...
          </div>
        </div>
      </div>
    );
  }

  // Reset form
  return (
    <div className="min-h-screen bg-[#020203] text-white flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-[#0a0a0f]/80 backdrop-blur-xl border border-white/10 rounded-2xl p-8 shadow-2xl">
          
          {/* Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-tr from-purple-500/10 to-pink-500/10 border border-white/10 mb-5 shadow-lg shadow-purple-500/5">
              <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <h3 className="text-2xl font-bold text-white mb-2">Buat Password Baru</h3>
            <p className="text-gray-400 text-sm">
              Masukkan password baru untuk akun Anda
            </p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-6 p-4 bg-red-900/20 border border-red-500/50 rounded-lg">
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            
            {/* New Password Field */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-gray-400 ml-1 uppercase tracking-wider">
                Password Baru
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
                  autoFocus
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
              
              {/* Password Strength Indicator */}
              {formData.password && (
                <div className="mt-2">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs text-gray-500">Kekuatan password:</p>
                    <span className={`text-xs font-medium ${strengthLevel.color}`}>
                      {strengthLevel.level}
                    </span>
                  </div>
                  <div className="space-y-1">
                    <div className={`flex items-center gap-2 text-xs ${passwordValidation.strength?.minLength ? 'text-green-400' : 'text-gray-500'}`}>
                      <div className={`w-1.5 h-1.5 rounded-full ${passwordValidation.strength?.minLength ? 'bg-green-400' : 'bg-gray-600'}`} />
                      Minimal 8 karakter
                    </div>
                    <div className={`flex items-center gap-2 text-xs ${passwordValidation.strength?.hasUpperCase ? 'text-green-400' : 'text-gray-500'}`}>
                      <div className={`w-1.5 h-1.5 rounded-full ${passwordValidation.strength?.hasUpperCase ? 'bg-green-400' : 'bg-gray-600'}`} />
                      Huruf besar
                    </div>
                    <div className={`flex items-center gap-2 text-xs ${passwordValidation.strength?.hasLowerCase ? 'text-green-400' : 'text-gray-500'}`}>
                      <div className={`w-1.5 h-1.5 rounded-full ${passwordValidation.strength?.hasLowerCase ? 'bg-green-400' : 'bg-gray-600'}`} />
                      Huruf kecil
                    </div>
                    <div className={`flex items-center gap-2 text-xs ${passwordValidation.strength?.hasNumbers ? 'text-green-400' : 'text-gray-500'}`}>
                      <div className={`w-1.5 h-1.5 rounded-full ${passwordValidation.strength?.hasNumbers ? 'bg-green-400' : 'bg-gray-600'}`} />
                      Angka
                    </div>
                    {passwordValidation.strength?.hasSpecialChars && (
                      <div className="flex items-center gap-2 text-xs text-green-400">
                        <div className="w-1.5 h-1.5 rounded-full bg-green-400" />
                        Karakter khusus (bonus)
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Confirm Password Field */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-gray-400 ml-1 uppercase tracking-wider">
                Konfirmasi Password Baru
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

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting || Object.keys(validationErrors).length > 0 || !formData.password || !formData.confirmPassword}
              className="block w-full py-3.5 mt-6 bg-gradient-to-r from-purple-600 to-pink-600 rounded-xl text-center font-bold text-white shadow-lg shadow-purple-500/30 hover:shadow-purple-500/50 hover:opacity-90 transition-all duration-300 transform hover:-translate-y-0.5 active:scale-[0.98] text-sm tracking-wide border border-white/10 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
            >
              {isSubmitting ? (
                <div className="flex items-center justify-center">
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2"></div>
                  Mengubah Password...
                </div>
              ) : (
                <>
                  Ubah Password
                  <svg className="w-4 h-4 inline-block ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                  </svg>
                </>
              )}
            </button>

            {/* Back to Login */}
            <div className="text-center pt-4">
              <button
                type="button"
                onClick={() => navigate('/')}
                className="text-gray-400 hover:text-purple-400 font-medium transition-colors text-sm"
                disabled={isSubmitting}
              >
                Kembali ke Login
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default PasswordReset;