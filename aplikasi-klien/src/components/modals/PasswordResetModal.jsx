/**
 * Password Reset Modal Component
 * Handles password reset functionality with email sending
 */

import { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { validateEmail } from '../../utils/validation/authValidation';

const PasswordResetModal = ({ isOpen, onClose }) => {
  const { resetPassword } = useAuth();
  
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [validationError, setValidationError] = useState('');

  // Handle email input change with real-time validation
  const handleEmailChange = (value) => {
    setEmail(value);
    setError('');
    setSuccess(false);
    
    // Real-time validation
    if (value.trim()) {
      const validation = validateEmail(value);
      setValidationError(validation.isValid ? '' : validation.error);
    } else {
      setValidationError('');
    }
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validate email
    const emailValidation = validateEmail(email);
    if (!emailValidation.isValid) {
      setValidationError(emailValidation.error);
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      const { error } = await resetPassword(email.trim().toLowerCase());
      
      if (error) {
        if (error.message.includes('rate limit')) {
          setError('Terlalu banyak permintaan reset password. Tunggu beberapa menit sebelum mencoba lagi.');
        } else if (error.message.includes('invalid email')) {
          setError('Format email tidak valid.');
        } else {
          setError('Gagal mengirim email reset password. Silakan coba lagi.');
        }
      } else {
        setSuccess(true);
        setEmail('');
      }
    } catch (err) {
      setError('Terjadi kesalahan. Periksa koneksi internet dan coba lagi.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle modal close
  const handleClose = () => {
    if (!isSubmitting) {
      setEmail('');
      setError('');
      setSuccess(false);
      setValidationError('');
      onClose();
    }
  };

  // Handle backdrop click
  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      handleClose();
    }
  };

  // Handle escape key
  const handleKeyDown = (e) => {
    if (e.key === 'Escape') {
      handleClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={handleBackdropClick}
      onKeyDown={handleKeyDown}
      tabIndex={-1}
    >
      <div className="bg-[#0a0a0f]/95 backdrop-blur-xl border border-white/10 rounded-2xl p-6 sm:p-8 w-full max-w-md shadow-2xl">
        
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-bold text-white">
            {success ? 'Email Terkirim' : 'Reset Password'}
          </h3>
          <button
            onClick={handleClose}
            disabled={isSubmitting}
            className="text-gray-400 hover:text-white transition-colors p-1 disabled:opacity-50"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {success ? (
          /* Success State */
          <div className="text-center">
            <div className="w-16 h-16 bg-green-600/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            
            <h4 className="text-lg font-semibold text-white mb-2">
              Email Reset Password Terkirim
            </h4>
            
            <p className="text-gray-400 text-sm mb-6">
              Kami telah mengirim link reset password ke email Anda. 
              Periksa inbox dan ikuti instruksi untuk mengatur password baru.
            </p>

            <div className="bg-blue-900/20 border border-blue-500/50 rounded-lg p-4 mb-6">
              <div className="flex items-start gap-3">
                <svg className="w-5 h-5 text-blue-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div className="text-sm">
                  <p className="text-blue-300 font-medium mb-1">Tips:</p>
                  <ul className="text-blue-200 space-y-1">
                    <li>• Periksa folder spam jika email tidak ditemukan</li>
                    <li>• Link reset berlaku selama 1 jam</li>
                    <li>• Gunakan password yang kuat saat reset</li>
                  </ul>
                </div>
              </div>
            </div>

            <button
              onClick={handleClose}
              className="w-full py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl font-semibold hover:opacity-90 transition-opacity"
            >
              Tutup
            </button>
          </div>
        ) : (
          /* Reset Form */
          <div>
            <p className="text-gray-400 text-sm mb-6">
              Masukkan email akun Anda dan kami akan mengirim link untuk reset password.
            </p>

            {/* Error Message */}
            {error && (
              <div className="mb-4 p-3 bg-red-900/20 border border-red-500/50 rounded-lg">
                <p className="text-red-400 text-sm">{error}</p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Email Field */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-gray-400 ml-1 uppercase tracking-wider">
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
                    value={email}
                    onChange={(e) => handleEmailChange(e.target.value)}
                    placeholder="nama@perusahaan.com"
                    className={`w-full pl-12 pr-4 py-3.5 bg-[#050507] border rounded-xl text-white placeholder-gray-600 focus:outline-none focus:bg-[#0c0c12] transition-all duration-300 text-sm font-medium ${
                      validationError 
                        ? 'border-red-500/50 focus:border-red-500/50 focus:ring-2 focus:ring-red-500/20' 
                        : 'border-white/10 focus:border-purple-500/50 focus:ring-2 focus:ring-purple-500/20'
                    }`}
                    disabled={isSubmitting}
                    required
                    autoFocus
                  />
                </div>
                {validationError && (
                  <p className="text-red-400 text-xs mt-1 ml-1">{validationError}</p>
                )}
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isSubmitting || !email.trim() || validationError}
                className="w-full py-3.5 bg-gradient-to-r from-purple-600 to-pink-600 rounded-xl text-center font-bold text-white shadow-lg shadow-purple-500/30 hover:shadow-purple-500/50 hover:opacity-90 transition-all duration-300 transform hover:-translate-y-0.5 active:scale-[0.98] text-sm tracking-wide border border-white/10 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
              >
                {isSubmitting ? (
                  <div className="flex items-center justify-center">
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2"></div>
                    Mengirim Email...
                  </div>
                ) : (
                  <>
                    Kirim Link Reset Password
                    <svg className="w-4 h-4 inline-block ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                    </svg>
                  </>
                )}
              </button>

              {/* Cancel Button */}
              <button
                type="button"
                onClick={handleClose}
                disabled={isSubmitting}
                className="w-full py-3 text-gray-400 hover:text-white transition-colors text-sm font-medium disabled:opacity-50"
              >
                Batal
              </button>
            </form>

            {/* Info */}
            <div className="mt-6 p-4 bg-gray-900/20 border border-gray-500/20 rounded-lg">
              <div className="flex items-start gap-3">
                <svg className="w-5 h-5 text-gray-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div className="text-sm">
                  <p className="text-gray-300 font-medium mb-1">Catatan Keamanan:</p>
                  <p className="text-gray-400">
                    Link reset password hanya berlaku selama 1 jam dan hanya dapat digunakan sekali. 
                    Jika Anda tidak meminta reset password, abaikan email ini.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PasswordResetModal;