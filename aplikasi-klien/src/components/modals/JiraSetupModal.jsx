import { useState, useEffect } from 'react';
import { jiraService } from '../../services/jiraService';
import { useJira } from '../../contexts/JiraContext';
import JiraErrorHandler from '../common/JiraErrorHandler';
import { useJiraErrorHandler } from '../../hooks/useJiraErrorHandler';
import CustomDatePicker from './Customdatepicker';

const JiraSetupModal = ({ isOpen, onClose, onSkip, onComplete }) => {
  const { refreshConnections } = useJira();
  const { handleJiraOperation, errors, removeError } = useJiraErrorHandler();
  const [step, setStep] = useState(3); // 3: Credentials, 5: Success
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [validationErrors, setValidationErrors] = useState({});
  const [formData, setFormData] = useState({
    jiraUrl: '',
    email: '',
    apiToken: '',
    projectKey: '',
    tokenExpiresAt: ''
  });

  // Reset modal state when opened
  useEffect(() => {
    if (isOpen) {
      setStep(3);
      setError('');
      setValidationErrors({});
      setLoading(false);
      setFormData({
        jiraUrl: '',
        email: '',
        apiToken: '',
        projectKey: '',
        tokenExpiresAt: ''
      });
    }
  }, [isOpen]);

  // Real-time validation
  const validateField = (name, value) => {
    const errors = { ...validationErrors };
    
    switch (name) {
      case 'jiraUrl':
        if (!value) {
          errors.jiraUrl = 'URL JIRA wajib diisi';
        } else if (!value.match(/^https?:\/\/.+/)) {
          errors.jiraUrl = 'URL harus dimulai dengan http:// atau https://';
        } else {
          delete errors.jiraUrl;
        }
        break;
      case 'email':
        if (!value) {
          errors.email = 'Email wajib diisi';
        } else if (!value.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
          errors.email = 'Format email tidak valid';
        } else {
          delete errors.email;
        }
        break;
      case 'apiToken':
        if (!value) {
          errors.apiToken = 'API Token wajib diisi';
        } else if (value.length < 10) {
          errors.apiToken = 'API Token terlalu pendek';
        } else {
          delete errors.apiToken;
        }
        break;
      case 'projectKey':
        if (!value) {
          errors.projectKey = 'Project Key wajib diisi';
        } else if (!value.match(/^[A-Z][A-Z0-9]*$/)) {
          errors.projectKey = 'Project Key harus huruf kapital dan angka (contoh: PROJ)';
        } else {
          delete errors.projectKey;
        }
        break;
      case 'tokenExpiresAt':
        if (!value) {
          errors.tokenExpiresAt = 'Token Expiry Date wajib diisi';
        } else {
          const expiryDate = new Date(value);
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          
          const oneYearFromNow = new Date(today);
          oneYearFromNow.setFullYear(oneYearFromNow.getFullYear() + 1);
          
          if (expiryDate < today) {
            errors.tokenExpiresAt = 'Token sudah kedaluwarsa';
          } else if (expiryDate > oneYearFromNow) {
            errors.tokenExpiresAt = 'Token maksimal 1 tahun dari hari ini';
          } else {
            delete errors.tokenExpiresAt;
          }
        }
        break;
      default:
        break;
    }
    
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Real-time validation
    validateField(name, value);
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validate all fields
    const isValid = ['jiraUrl', 'email', 'apiToken', 'projectKey', 'tokenExpiresAt'].every(field => 
      validateField(field, formData[field])
    );
    
    if (!isValid) {
      setError('Harap perbaiki kesalahan pada form');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Test connection and create connection in one step
      const testResult = await handleJiraOperation(
        () => jiraService.testConnection({
          jiraUrl: formData.jiraUrl,
          email: formData.email,
          apiToken: formData.apiToken,
          projectKey: formData.projectKey
        }),
        { operationName: 'testConnection', formData }
      );

      if (!testResult.success) {
        setError(getErrorMessage(testResult.error || 'Gagal menghubungkan ke JIRA'));
        setLoading(false);
        return;
      }

      // Save project name from test result
      const projectName = testResult.data?.projectName || formData.projectKey;

      // Create connection if test successful
      const connectionData = {
        jiraUrl: formData.jiraUrl,
        email: formData.email,
        apiToken: formData.apiToken,
        projectKey: formData.projectKey,
        projectName: projectName
      };

      // Add token expiry date if provided
      if (formData.tokenExpiresAt) {
        connectionData.tokenExpiresAt = formData.tokenExpiresAt;
      }

      const result = await jiraService.createConnection(connectionData);
      
      console.log('Create connection result:', result);
      
      if (result.success) {
        setStep(5); // Success step
        
        // Refresh connections in context
        await refreshConnections();
        
        setTimeout(() => {
          onComplete();
        }, 2000);
      } else {
        setError(getErrorMessage(result.error || 'Gagal membuat koneksi JIRA'));
      }
    } catch (err) {
      console.error('Connection error:', err);
      setError(getErrorMessage(err.message || 'Terjadi kesalahan saat menghubungkan ke JIRA'));
    } finally {
      setLoading(false);
    }
  };

  // Get user-friendly error messages in Indonesian
  const getErrorMessage = (error) => {
    const errorStr = String(error || '').toLowerCase();
    
    // Check for duplicate project error (special handling)
    if (errorStr.includes('sudah terhubung') || errorStr.includes('duplicate')) {
      return error; // Return as-is for duplicate errors
    }
    
    if (errorStr.includes('401') || errorStr.includes('unauthorized')) {
      return 'Email atau API Token tidak valid. Periksa kembali kredensial Anda.';
    } else if (errorStr.includes('403') || errorStr.includes('forbidden')) {
      return 'Akses ditolak. Pastikan Anda memiliki izin untuk mengakses project ini.';
    } else if (errorStr.includes('404') || errorStr.includes('not found')) {
      return 'Project Key tidak ditemukan. Periksa kembali kode project JIRA Anda.';
    } else if (errorStr.includes('network') || errorStr.includes('fetch') || errorStr.includes('failed to fetch')) {
      return 'Tidak dapat terhubung ke JIRA. Periksa URL dan koneksi internet Anda.';
    } else if (errorStr.includes('cors')) {
      return 'Masalah CORS. Pastikan URL JIRA Anda benar dan dapat diakses.';
    } else if (errorStr.includes('timeout')) {
      return 'Koneksi timeout. Server JIRA tidak merespons, coba lagi.';
    } else {
      return 'Data project JIRA tidak valid. Periksa kembali URL, Email, API Token, dan Project Key Anda.';
    }
  };

  const handleSkip = () => {
    onSkip();
  };

  const handleSetupLater = () => {
    onSkip();
  };

  if (!isOpen) return null;

  // Hitung min & max date untuk picker (hari ini s/d 1 tahun dari hari ini)
  const todayISO = new Date().toISOString().split('T')[0];
  const maxDateISO = (() => {
    const maxDate = new Date();
    maxDate.setFullYear(maxDate.getFullYear() + 1);
    return maxDate.toISOString().split('T')[0];
  })();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-[#09090A] border border-white/5 rounded-xl max-w-2xl w-full mx-auto max-h-[80vh] overflow-y-auto shadow-2xl transform transition-all duration-200 animate-in fade-in zoom-in-95">
        
        {/* Step 3: Credentials Form */}
        {step === 3 && (
          <div className="p-8 relative">
            {/* Close Button */}
            <button
              onClick={onClose}
              className="absolute top-4 right-4 p-2 text-gray-400 hover:text-white transition-colors rounded-lg hover:bg-white/5"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            
            <div className="mb-6">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl bg-[#160D14] border border-[#44273D] flex items-center justify-center flex-shrink-0">
                  <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M11.571 11.513H0a5.218 5.218 0 0 0 5.232 5.215h2.13v2.057A5.215 5.215 0 0 0 12.575 24V12.518a1.005 1.005 0 0 0-1.005-1.005zm5.723-5.756H5.736a5.215 5.215 0 0 0 5.215 5.214h2.129v2.058a5.218 5.218 0 0 0 5.215 5.214V6.758a1.001 1.001 0 0 0-1.001-1.001zM23.013 0H11.455a5.215 5.215 0 0 0 5.215 5.215h2.129v2.057A5.215 5.215 0 0 0 24 12.483V1.005A1.001 1.001 0 0 0 23.013 0z"/>
                  </svg>
                </div>
                <h2 className="text-xl font-bold text-white">Setup Project JIRA</h2>
              </div>
              <p className="text-gray-400 text-sm">
                Hubungkan project JIRA Anda untuk membuat user story dan subtask secara otomatis
              </p>
            </div>

            {error && (
              <div className={`mb-4 p-3 rounded-lg ${
                error.toLowerCase().includes('sudah terhubung') || error.toLowerCase().includes('duplicate')
                  ? 'bg-[#160D14] border border-[#44273D]'
                  : 'bg-red-500/10 border border-red-500/20'
              }`}>
                <p className={`text-sm ${
                  error.toLowerCase().includes('sudah terhubung') || error.toLowerCase().includes('duplicate')
                    ? 'text-[#FF7AD0]'
                    : 'text-red-400'
                }`}>{error}</p>
              </div>
            )}

            {/* JIRA Error Handler */}
            {errors.map((errorItem) => (
              <JiraErrorHandler
                key={errorItem.id}
                error={errorItem.error}
                context={errorItem.context}
                onRetry={() => {
                  return handleSubmit({ preventDefault: () => {} });
                }}
                onDismiss={() => removeError(errorItem.id)}
              />
            ))}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  URL JIRA <span className="text-red-400">*</span>
                </label>
                <input
                  type="url"
                  name="jiraUrl"
                  value={formData.jiraUrl}
                  onChange={handleInputChange}
                  placeholder="https://perusahaan.atlassian.net"
                  className={`w-full px-4 py-3 bg-[#0D0D0D] border rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-0 focus:bg-[#0D0D0D] transition-all ${
                    validationErrors.jiraUrl ? 'border-red-500/50 focus:border-red-500' : 'border-white/5 focus:border-white/50'
                  }`}
                  required
                />
                <div className="flex items-center justify-between mt-1">
                  <p className="text-xs text-gray-500">
                    URL instance JIRA Anda (Cloud atau Server)
                  </p>
                  {validationErrors.jiraUrl && (
                    <p className="text-red-400 text-xs">{validationErrors.jiraUrl}</p>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Email <span className="text-red-400">*</span>
                </label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  placeholder="email.anda@perusahaan.com"
                  className={`w-full px-4 py-3 bg-[#0D0D0D] border rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-0 focus:bg-[#0D0D0D] transition-all ${
                    validationErrors.email ? 'border-red-500/50 focus:border-red-500' : 'border-white/5 focus:border-white/50'
                  }`}
                  required
                />
                <div className="flex items-center justify-between mt-1">
                  <p className="text-xs text-gray-500">
                    Email akun JIRA Anda
                  </p>
                  {validationErrors.email && (
                    <p className="text-red-400 text-xs">{validationErrors.email}</p>
                  )}
                </div>
              </div>

              {/* API Token and Token Expiry Date - 2 Grid Layout */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* API Token */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2 flex items-center justify-between">
                    <span>
                      API Token <span className="text-red-400">*</span>
                    </span>
                    <a 
                      href="https://id.atlassian.com/manage-profile/security/api-tokens" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="inline-flex items-center text-white hover:text-gray-300 transition-colors"
                      title="Buat API Token"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                      </svg>
                    </a>
                  </label>
                  <input
                    type="password"
                    name="apiToken"
                    value={formData.apiToken}
                    onChange={handleInputChange}
                    placeholder="API Token JIRA Anda"
                    className={`w-full px-4 py-3 bg-[#0D0D0D] border rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-0 focus:bg-[#0D0D0D] transition-all ${
                      validationErrors.apiToken ? 'border-red-500/50 focus:border-red-500' : 'border-white/5 focus:border-white/50'
                    }`}
                    required
                  />
                  {validationErrors.apiToken && (
                    <p className="text-red-400 text-xs mt-1">{validationErrors.apiToken}</p>
                  )}
                </div>

                {/* Token Expiry Date — sekarang menggunakan CustomDatePicker */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Token Expiry Date <span className="text-red-400">*</span>
                  </label>
                  <CustomDatePicker
                    name="tokenExpiresAt"
                    value={formData.tokenExpiresAt}
                    onChange={handleInputChange}
                    minDate={todayISO}
                    maxDate={maxDateISO}
                    hasError={!!validationErrors.tokenExpiresAt}
                    placeholder="dd / mm / yyyy"
                  />
                  {validationErrors.tokenExpiresAt ? (
                    <p className="text-red-400 text-xs mt-1">{validationErrors.tokenExpiresAt}</p>
                  ) : (
                    <p className="text-xs text-gray-500 mt-1">
                      Wajib diisi. Maksimal 1 tahun dari hari ini.
                    </p>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Project Key <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  name="projectKey"
                  value={formData.projectKey}
                  onChange={handleInputChange}
                  placeholder="PROJ"
                  className={`w-full px-4 py-3 bg-[#0D0D0D] border rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-0 focus:bg-[#0D0D0D] transition-all ${
                    validationErrors.projectKey ? 'border-red-500/50 focus:border-red-500' : 'border-white/5 focus:border-white/50'
                  }`}
                  required
                />
                <div className="flex items-center justify-between mt-1">
                  <p className="text-xs text-gray-500">
                    Kode project JIRA (huruf kapital, contoh: PROJ, DEV)
                  </p>
                  {validationErrors.projectKey && (
                    <p className="text-red-400 text-xs">{validationErrors.projectKey}</p>
                  )}
                </div>
              </div>

              <div className="pt-4">
                <button
                  type="submit"
                  disabled={loading || Object.keys(validationErrors).length > 0 || !formData.jiraUrl || !formData.email || !formData.apiToken || !formData.projectKey || !formData.tokenExpiresAt}
                  className="w-full px-4 py-3 bg-[#160D14] border border-[#44273D] text-[#FF7AD0] rounded-lg font-medium hover:bg-[#1a1016] transition-all duration-200 disabled:bg-[#0D0D0D] disabled:border-white/5 disabled:text-white/10 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-[#FF7AD0]/30 border-t-[#FF7AD0] rounded-full animate-spin"></div>
                      Menghubungkan...
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                      </svg>
                      Hubungkan
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Step 5: Success */}
        {step === 5 && (
          <div className="p-8 text-center bg-[#09090A] border border-white/5 rounded-xl">
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-[#160D14] border border-[#44273D] flex items-center justify-center shadow-lg">
              <svg className="w-8 h-8 text-[#FF7AD0]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-white mb-2">JIRA Berhasil Terhubung!</h2>
            <p className="text-gray-400 mb-6">
              Akun JIRA Anda telah berhasil terhubung. Sekarang Anda dapat membuat user story dan subtask secara otomatis.
            </p>
            <div className="flex items-center justify-center gap-2 text-sm text-gray-500">
              <div className="w-4 h-4 border-2 border-[#FF7AD0]/30 border-t-[#FF7AD0] rounded-full animate-spin"></div>
              Mengarahkan ke dashboard...
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default JiraSetupModal;