import React, { useState } from 'react';

const JiraErrorHandler = ({ error, onRetry, onDismiss, context = {} }) => {
  const [showDetails, setShowDetails] = useState(false);
  const [retrying, setRetrying] = useState(false);

  // Categorize error and get appropriate handling
  const getErrorInfo = (error) => {
    if (!error) return null;

    const status = error.status || error.statusCode;
    const message = error.message?.toLowerCase() || '';

    // Authentication errors (401)
    if (status === 401 || message.includes('unauthorized') || message.includes('authentication')) {
      return {
        type: 'authentication',
        title: 'Masalah Autentikasi JIRA',
        description: 'Kredensial JIRA Anda tidak valid atau sudah kedaluwarsa.',
        icon: (
          <svg className="w-5 h-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
        ),
        suggestions: [
          'Periksa kembali email dan API token JIRA Anda',
          'Pastikan API token belum kedaluwarsa',
          'Coba buat API token baru di JIRA',
          'Pastikan akun JIRA Anda masih aktif'
        ],
        actions: [
          { label: 'Buka Pengaturan JIRA', action: 'setup', primary: true },
          { label: 'Buat API Token Baru', action: 'token', external: true }
        ]
      };
    }

    // Authorization errors (403)
    if (status === 403 || message.includes('forbidden') || message.includes('permission')) {
      return {
        type: 'authorization',
        title: 'Akses Ditolak',
        description: 'Anda tidak memiliki izin untuk mengakses resource JIRA ini.',
        icon: (
          <svg className="w-5 h-5 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
          </svg>
        ),
        suggestions: [
          'Hubungi administrator JIRA untuk mendapatkan akses',
          'Periksa apakah Anda memiliki izin untuk project ini',
          'Pastikan resource yang diminta masih ada',
          'Coba dengan project lain yang Anda miliki akses'
        ],
        actions: [
          { label: 'Pilih Project Lain', action: 'project', primary: true },
          { label: 'Hubungi Admin', action: 'contact' }
        ]
      };
    }

    // Not found errors (404, 410)
    if (status === 404 || status === 410 || message.includes('not found') || message.includes('gone')) {
      const isDeprecated = status === 410 || message.includes('gone');
      return {
        type: 'not_found',
        title: isDeprecated ? 'API JIRA Tidak Didukung' : 'Resource Tidak Ditemukan',
        description: isDeprecated 
          ? 'Endpoint API JIRA ini sudah tidak didukung dan perlu diperbarui.'
          : 'Resource JIRA yang diminta tidak ditemukan.',
        icon: (
          <svg className="w-5 h-5 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
        ),
        suggestions: isDeprecated ? [
          'Instance JIRA Anda mungkin perlu diperbarui',
          'Hubungi administrator JIRA untuk update',
          'Coba dengan koneksi JIRA yang lebih baru',
          'Periksa dokumentasi JIRA terbaru'
        ] : [
          'Periksa kembali Project Key yang dimasukkan',
          'Pastikan resource belum dihapus',
          'Coba refresh dan coba lagi',
          'Periksa apakah Anda memiliki akses ke project'
        ],
        actions: [
          { label: 'Coba Lagi', action: 'retry', primary: true },
          { label: 'Periksa Koneksi', action: 'setup' }
        ]
      };
    }

    // Rate limit errors (429)
    if (status === 429 || message.includes('rate limit') || message.includes('too many requests')) {
      return {
        type: 'rate_limit',
        title: 'Terlalu Banyak Permintaan',
        description: 'Anda telah mencapai batas permintaan JIRA. Silakan tunggu sebentar.',
        icon: (
          <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        ),
        suggestions: [
          'Tunggu beberapa menit sebelum mencoba lagi',
          'Kurangi frekuensi permintaan ke JIRA',
          'Hubungi administrator JIRA tentang batas rate limit',
          'Coba lagi dalam 5-10 menit'
        ],
        actions: [
          { label: 'Coba Lagi (5 menit)', action: 'retry_delayed', primary: true },
          { label: 'Tutup', action: 'dismiss' }
        ]
      };
    }

    // Server errors (5xx)
    if (status >= 500 || message.includes('server error') || message.includes('internal error')) {
      return {
        type: 'server_error',
        title: 'Server JIRA Bermasalah',
        description: 'Server JIRA sedang mengalami masalah. Silakan coba lagi nanti.',
        icon: (
          <svg className="w-5 h-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
        ),
        suggestions: [
          'Tunggu beberapa menit dan coba lagi',
          'Periksa status server JIRA',
          'Hubungi administrator JIRA jika masalah berlanjut',
          'Coba akses JIRA langsung di browser'
        ],
        actions: [
          { label: 'Coba Lagi', action: 'retry', primary: true },
          { label: 'Periksa Status JIRA', action: 'status', external: true }
        ]
      };
    }

    // Network errors
    if (message.includes('network') || message.includes('timeout') || message.includes('connection') || message.includes('fetch')) {
      return {
        type: 'network',
        title: 'Masalah Koneksi',
        description: 'Tidak dapat terhubung ke server JIRA. Periksa koneksi internet Anda.',
        icon: (
          <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.141 0M1.394 9.393c5.857-5.857 15.355-5.857 21.213 0" />
          </svg>
        ),
        suggestions: [
          'Periksa koneksi internet Anda',
          'Pastikan URL JIRA sudah benar',
          'Coba akses JIRA langsung di browser',
          'Periksa firewall atau proxy yang mungkin memblokir'
        ],
        actions: [
          { label: 'Coba Lagi', action: 'retry', primary: true },
          { label: 'Periksa Koneksi', action: 'setup' }
        ]
      };
    }

    // Generic/unknown errors
    return {
      type: 'unknown',
      title: 'Terjadi Kesalahan',
      description: 'Terjadi kesalahan yang tidak terduga dengan integrasi JIRA.',
      icon: (
        <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      suggestions: [
        'Coba refresh halaman dan ulangi',
        'Periksa koneksi JIRA Anda',
        'Hubungi support jika masalah berlanjut',
        'Coba lagi dalam beberapa menit'
      ],
      actions: [
        { label: 'Coba Lagi', action: 'retry', primary: true },
        { label: 'Tutup', action: 'dismiss' }
      ]
    };
  };

  const errorInfo = getErrorInfo(error);

  if (!errorInfo) return null;

  const handleAction = async (action) => {
    switch (action) {
      case 'retry':
        if (onRetry) {
          setRetrying(true);
          try {
            await onRetry();
          } finally {
            setRetrying(false);
          }
        }
        break;
      case 'retry_delayed':
        if (onRetry) {
          setRetrying(true);
          // Wait 5 minutes before retry
          setTimeout(async () => {
            try {
              await onRetry();
            } finally {
              setRetrying(false);
            }
          }, 5 * 60 * 1000);
        }
        break;
      case 'setup':
        // Trigger JIRA setup modal
        window.dispatchEvent(new CustomEvent('openJiraSetup'));
        break;
      case 'project':
        // Trigger project selection modal
        window.dispatchEvent(new CustomEvent('openJiraProjectManagement'));
        break;
      case 'token':
        // Open JIRA API token creation page
        window.open('https://id.atlassian.com/manage-profile/security/api-tokens', '_blank');
        break;
      case 'status':
        // Open Atlassian status page
        window.open('https://status.atlassian.com/', '_blank');
        break;
      case 'contact':
        // Could open a contact form or support page
        alert('Hubungi administrator JIRA Anda untuk mendapatkan akses yang diperlukan.');
        break;
      case 'dismiss':
        if (onDismiss) {
          onDismiss();
        }
        break;
      default:
        break;
    }
  };

  return (
    <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 mb-4">
      <div className="flex items-start gap-3">
        {errorInfo.icon}
        <div className="flex-1 min-w-0">
          <h4 className="text-red-400 font-medium text-sm mb-1">{errorInfo.title}</h4>
          <p className="text-red-300 text-sm mb-3">{errorInfo.description}</p>
          
          {/* Action buttons */}
          <div className="flex flex-wrap gap-2 mb-3">
            {errorInfo.actions.map((action, index) => (
              <button
                key={index}
                onClick={() => handleAction(action.action)}
                disabled={retrying}
                className={`px-3 py-1.5 text-xs font-medium rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                  action.primary
                    ? 'bg-red-600/20 border border-red-500/30 text-red-300 hover:bg-red-600/30'
                    : 'text-red-400 hover:text-red-300'
                }`}
              >
                {retrying && action.action.includes('retry') ? (
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 border border-red-300/30 border-t-red-300 rounded-full animate-spin"></div>
                    Mencoba...
                  </div>
                ) : (
                  action.label
                )}
              </button>
            ))}
          </div>

          {/* Troubleshooting suggestions */}
          <div className="mb-3">
            <button
              onClick={() => setShowDetails(!showDetails)}
              className="flex items-center gap-2 text-xs text-red-400 hover:text-red-300 transition-colors"
            >
              <svg 
                className={`w-3 h-3 transition-transform ${showDetails ? 'rotate-90' : ''}`} 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
              {showDetails ? 'Sembunyikan' : 'Lihat'} Panduan Troubleshooting
            </button>
          </div>

          {showDetails && (
            <div className="bg-red-500/5 border border-red-500/10 rounded p-3">
              <h5 className="text-red-400 font-medium text-xs mb-2">Langkah-langkah Troubleshooting:</h5>
              <ul className="space-y-1">
                {errorInfo.suggestions.map((suggestion, index) => (
                  <li key={index} className="text-red-300 text-xs flex items-start gap-2">
                    <span className="text-red-500 mt-0.5">•</span>
                    <span>{suggestion}</span>
                  </li>
                ))}
              </ul>
              
              {/* Technical details */}
              {error.message && (
                <div className="mt-3 pt-3 border-t border-red-500/10">
                  <h6 className="text-red-400 font-medium text-xs mb-1">Detail Teknis:</h6>
                  <p className="text-red-300/70 text-xs font-mono bg-red-500/5 p-2 rounded">
                    {error.message}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
        
        {/* Close button */}
        <button
          onClick={() => handleAction('dismiss')}
          className="text-red-400/60 hover:text-red-400 transition-colors flex-shrink-0"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  );
};

export default JiraErrorHandler;