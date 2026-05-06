import toast from 'react-hot-toast';

/**
 * Toast notification utilities with consistent styling
 * All notifications follow the same design system with purple theme
 * 
 * Colors:
 * - Background: #120C18
 * - Text: #C27AFF (purple)
 * - Border: #2C1A43 (purple border)
 */

const baseStyle = {
  background: '#120C18',
  color: '#C27AFF',
  borderRadius: '12px',
  padding: '10px 8px',
  border: '1px solid #2C1A43',
  width: '250px',
  height: 'fit-content',
  boxShadow: 'none'
};

/**
 * Show success notification
 * @param {string|React.Component} message - Message to display
 * @param {object} options - Additional toast options
 */
export const showSuccessToast = (message, options = {}) => {
  return toast.success(message, {
    duration: 4000,
    position: 'top-right',
    style: {
      ...baseStyle,
    },
    iconTheme: {
      primary: '#FF7AD0',
      secondary: '#160D14',
    },
    ...options
  });
};

/**
 * Show error notification
 * @param {string|React.Component} message - Message to display
 * @param {object} options - Additional toast options
 */
export const showErrorToast = (message, options = {}) => {
  return toast.error(message, {
    duration: 5000,
    position: 'top-right',
    style: {
      ...baseStyle,
    },
    iconTheme: {
      primary: '#FF7AD0',
      secondary: '#160D14',
    },
    ...options
  });
};

/**
 * Show info notification
 * @param {string|React.Component} message - Message to display
 * @param {object} options - Additional toast options
 */
export const showInfoToast = (message, options = {}) => {
  return toast(message, {
    duration: 4000,
    position: 'top-right',
    icon: 'ℹ️',
    style: {
      ...baseStyle,
    },
    ...options
  });
};

/**
 * Show warning notification
 * @param {string|React.Component} message - Message to display
 * @param {object} options - Additional toast options
 */
export const showWarningToast = (message, options = {}) => {
  return toast(message, {
    duration: 4000,
    position: 'top-right',
    icon: '⚠️',
    style: {
      ...baseStyle,
    },
    ...options
  });
};

/**
 * Show custom notification with icon
 * @param {string|React.Component} message - Message to display
 * @param {object} options - Additional toast options including icon
 */
export const showCustomToast = (message, options = {}) => {
  return toast(message, {
    duration: 4000,
    position: 'top-right',
    style: {
      ...baseStyle,
    },
    ...options
  });
};

/**
 * Show authentication success notification
 * Simple notification without action button - just icon, title, subtitle, and close
 * Uses unique ID to prevent duplicates
 * @param {string} userName - User's name
 */
export const showAuthSuccessToast = (userName) => {
  // Use unique ID to prevent duplicate toasts
  const toastId = 'auth-success-toast';
  
  // Dismiss any existing auth success toast first
  toast.dismiss(toastId);
  
  return toast.success(
    (t) => (
      <div className="flex items-start gap-3">
        {/* Success Icon - Aligned with title */}
        <div className="flex-shrink-0 w-5 h-5 rounded-md flex items-center justify-center" style={{ backgroundColor: '#2C1A43', border: '1px solid #2C1A43' }}>
          <svg className="w-3 h-3" style={{ color: '#C27AFF' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        
        {/* Content and Close Button in same row */}
        <div className="flex-1 min-w-0 flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="font-semibold text-sm leading-tight" style={{ color: '#FFFFFF' }}>Login Berhasil!</div>
            <div className="text-xs leading-tight mt-2" style={{ color: '#C27AFF' }}>
              Selamat datang di SpecWeave!
            </div>
          </div>

          {/* Close Button - Aligned with title */}
          <button
            onClick={() => toast.dismiss(t.id)}
            className="flex-shrink-0 w-4 h-4 flex items-center justify-center transition-opacity"
            style={{ 
              color: '#C27AFF',
              opacity: 0.5
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.opacity = '1';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.opacity = '0.5';
            }}
          >
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>
    ),
    {
      id: toastId, // Use unique ID to prevent duplicates
      duration: 4000,
      position: 'top-right',
      style: {
        ...baseStyle
      },
      className: '',
      icon: null
    }
  );
};

/**
 * Show JIRA export success notification
 * Displays epic name and issue key with link to JIRA
 * @param {string} issueKey - JIRA issue key
 * @param {string} issueUrl - JIRA issue URL
 * @param {string} epicName - Epic name
 */
export const showJiraExportSuccessToast = (issueKey, issueUrl, epicName) => {
  return toast.success(
    (t) => (
      <div className="flex items-start gap-3">
        {/* JIRA Logo - Aligned with title */}
        <div className="flex-shrink-0 w-5 h-5 rounded-md flex items-center justify-center" style={{ backgroundColor: '#2C1A43', border: '1px solid #2C1A43' }}>
          <svg className="w-3 h-3" style={{ color: '#C27AFF' }} viewBox="0 0 24 24" fill="currentColor">
            <path d="M11.571 11.513H0a5.218 5.218 0 0 0 5.232 5.215h2.13v2.057A5.215 5.215 0 0 0 12.575 24V12.518a1.005 1.005 0 0 0-1.005-1.005zm5.723-5.756H5.736a5.215 5.215 0 0 0 5.215 5.214h2.129v2.058a5.218 5.218 0 0 0 5.215 5.214V6.758a1.001 1.001 0 0 0-1.001-1.001zM23.013 0H11.455a5.215 5.215 0 0 0 5.215 5.215h2.129v2.057A5.215 5.215 0 0 0 24 12.483V1.005A1.001 1.001 0 0 0 23.013 0z"/>
          </svg>
        </div>
        
        {/* Content and Close Button */}
        <div className="flex-1 min-w-0 flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="font-semibold text-sm leading-tight" style={{ color: '#FFFFFF' }}>Export Berhasil</div>
            {issueUrl && (
              <a
                href={issueUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs leading-tight mt-2 transition-colors"
                style={{ color: '#C27AFF' }}
                onClick={() => toast.dismiss(t.id)}
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = '#C27AFF';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = '#C27AFF';
                }}
              >
                <span>{epicName}: {issueKey}</span>
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </a>
            )}
          </div>

          {/* Close Button - Aligned with title */}
          <button
            onClick={() => toast.dismiss(t.id)}
            className="flex-shrink-0 w-4 h-4 flex items-center justify-center transition-opacity"
            style={{ 
              color: '#C27AFF',
              opacity: 0.5
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.opacity = '1';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.opacity = '0.5';
            }}
          >
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>
    ),
    {
      duration: 5000,
      position: 'top-right',
      style: {
        ...baseStyle,
        width: 'fit-content',
        maxWidth: '400px',
        paddingLeft: '10px',
        paddingRight: '10px'
      },
      className: '',
      icon: null
    }
  );
};

/**
 * Show JIRA export failed notification
 * Displays error message with suggestion to check integration
 */
export const showJiraExportFailedToast = () => {
  return toast.error(
    (t) => (
      <div className="flex items-start gap-3">
        {/* Error Icon - Aligned with title */}
        <div className="flex-shrink-0 w-5 h-5 rounded-md flex items-center justify-center" style={{ backgroundColor: '#4A1A1A', border: '1px solid #4A1A1A' }}>
          <svg className="w-3 h-3" style={{ color: '#FF6B6B' }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10"/>
            <line x1="15" y1="9" x2="9" y2="15"/>
            <line x1="9" y1="9" x2="15" y2="15"/>
          </svg>
        </div>
        
        {/* Content and Close Button */}
        <div className="flex-1 min-w-0 flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="font-semibold text-sm leading-tight" style={{ color: '#FFFFFF' }}>Export Gagal</div>
            <div className="text-xs leading-tight mt-2" style={{ color: '#FF6B6B' }}>
              Pastikan kembali Integrasi JIRA atau coba ganti Project/Epic Anda
            </div>
          </div>

          {/* Close Button - Aligned with title */}
          <button
            onClick={() => toast.dismiss(t.id)}
            className="flex-shrink-0 w-4 h-4 flex items-center justify-center transition-opacity"
            style={{ 
              color: '#FF6B6B',
              opacity: 0.5
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.opacity = '1';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.opacity = '0.5';
            }}
          >
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>
    ),
    {
      duration: 5000,
      position: 'top-right',
      style: {
        ...baseStyle,
        background: '#140D0C',
        border: '1px solid #3E2827',
        width: 'fit-content',
        maxWidth: '400px',
        paddingLeft: '10px',
        paddingRight: '10px'
      },
      className: '',
      icon: null
    }
  );
};

/**
 * Show profile update success notification
 * Custom styling with #160D14 background and #44273D border
 */
export const showProfileUpdateSuccessToast = () => {
  // Use unique ID to prevent duplicate toasts
  const toastId = 'profile-update-success-toast';
  
  // Dismiss any existing profile update toast first
  toast.dismiss(toastId);
  
  return toast.success(
    (t) => (
      <div className="flex items-start gap-3">
        {/* Success Icon - Aligned with title */}
        <div className="flex-shrink-0 w-5 h-5 rounded-md flex items-center justify-center" style={{ backgroundColor: '#44273D', border: '1px solid #44273D' }}>
          <svg className="w-3 h-3" style={{ color: '#FF7AD0' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        
        {/* Content and Close Button in same row */}
        <div className="flex-1 min-w-0 flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="font-semibold text-sm leading-tight" style={{ color: '#FFFFFF' }}>Edit Berhasil</div>
            <div className="text-xs leading-tight mt-2" style={{ color: '#44273D' }}>
              Profile telah diperbarui
            </div>
          </div>

          {/* Close Button - Aligned with title */}
          <button
            onClick={() => toast.dismiss(t.id)}
            className="flex-shrink-0 w-4 h-4 flex items-center justify-center transition-opacity"
            style={{ 
              color: '#FF7AD0',
              opacity: 0.5
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.opacity = '1';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.opacity = '0.5';
            }}
          >
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>
    ),
    {
      id: toastId, // Use unique ID to prevent duplicates
      duration: 4000,
      position: 'top-right',
      style: {
        background: '#160D14',
        color: '#FFFFFF',
        borderRadius: '12px',
        padding: '10px 8px',
        border: '1px solid #44273D',
        width: '250px',
        height: 'fit-content',
        boxShadow: 'none'
      },
      className: '',
      icon: null
    }
  );
};

export default {
  success: showSuccessToast,
  error: showErrorToast,
  info: showInfoToast,
  warning: showWarningToast,
  custom: showCustomToast,
  authSuccess: showAuthSuccessToast,
  jiraExportSuccess: showJiraExportSuccessToast,
  jiraExportFailed: showJiraExportFailedToast,
  profileUpdateSuccess: showProfileUpdateSuccessToast
};
