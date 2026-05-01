import toast from 'react-hot-toast';

/**
 * Toast notification utilities with consistent styling
 * All notifications follow the same design system with pink theme
 * 
 * Colors:
 * - Background: #160D14
 * - Text: #FF7AD0 (pink)
 * - Border: #44273D (pink border)
 */

const baseStyle = {
  background: '#160D14',
  backdropFilter: 'blur(16px)',
  WebkitBackdropFilter: 'blur(16px)',
  color: '#FF7AD0',
  borderRadius: '12px',
  padding: '18px 24px',
  minWidth: '300px',
  border: '1px solid #44273D',
  boxShadow: '0 10px 40px rgba(255, 122, 208, 0.2)'
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
 * @param {string} userName - User's name
 */
export const showAuthSuccessToast = (userName) => {
  return toast.success(
    (t) => (
      <div className="flex items-center gap-3">
        {/* Success Icon */}
        <div className="flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: '#FF7AD0' }}>
          <svg className="w-5 h-5" style={{ color: '#160D14' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        
        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-base mb-1" style={{ color: '#FFFFFF' }}>Login Berhasil!</div>
          <div className="text-sm" style={{ color: '#FF7AD0' }}>
            Selamat datang, <span className="font-medium">{userName}</span>
          </div>
        </div>

        {/* Close Button */}
        <button
          onClick={() => toast.dismiss(t.id)}
          className="flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center transition-colors"
          style={{ 
            backgroundColor: 'rgba(255, 122, 208, 0.1)',
            color: '#FF7AD0'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = 'rgba(255, 122, 208, 0.2)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'rgba(255, 122, 208, 0.1)';
          }}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    ),
    {
      duration: 4000,
      position: 'top-right',
      style: {
        ...baseStyle,
        minWidth: '340px'
      },
      icon: null
    }
  );
};

/**
 * Show JIRA export success notification
 * Notification with action button (chip) to open JIRA
 * @param {string} issueKey - JIRA issue key
 * @param {string} issueUrl - JIRA issue URL
 * @param {string} epicName - Epic name
 */
export const showJiraExportSuccessToast = (issueKey, issueUrl, epicName) => {
  return toast.success(
    (t) => (
      <div className="flex items-center gap-3">
        {/* JIRA Logo */}
        <div className="flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: '#FF7AD0' }}>
          <svg className="w-5 h-5" style={{ color: '#160D14' }} viewBox="0 0 24 24" fill="currentColor">
            <path d="M11.571 11.513H0a5.218 5.218 0 0 0 5.232 5.215h2.13v2.057A5.215 5.215 0 0 0 12.575 24V12.518a1.005 1.005 0 0 0-1.005-1.005zm5.723-5.756H5.736a5.215 5.215 0 0 0 5.215 5.214h2.129v2.058a5.218 5.218 0 0 0 5.215 5.214V6.758a1.001 1.001 0 0 0-1.001-1.001zM23.013 0H11.455a5.215 5.215 0 0 0 5.215 5.215h2.129v2.057A5.215 5.215 0 0 0 24 12.483V1.005A1.001 1.001 0 0 0 23.013 0z"/>
          </svg>
        </div>
        
        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-base mb-1" style={{ color: '#FFFFFF' }}>Export Berhasil!</div>
          <div className="flex items-center gap-2 text-sm mb-2">
            <span style={{ color: '#FF7AD0' }}>{epicName}:</span>
            <span className="font-mono font-semibold" style={{ color: '#FFFFFF' }}>{issueKey}</span>
          </div>
          
          {/* Action Chip/Button - Only for notifications with external actions */}
          {issueUrl && (
            <a
              href={issueUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors"
              style={{ 
                backgroundColor: 'rgba(255, 122, 208, 0.2)',
                color: '#FF7AD0',
                border: '1px solid #44273D'
              }}
              onClick={() => toast.dismiss(t.id)}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = 'rgba(255, 122, 208, 0.3)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'rgba(255, 122, 208, 0.2)';
              }}
            >
              <span>Buka di JIRA</span>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </a>
          )}
        </div>

        {/* Close Button */}
        <button
          onClick={() => toast.dismiss(t.id)}
          className="flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center transition-colors"
          style={{ 
            backgroundColor: 'rgba(255, 122, 208, 0.1)',
            color: '#FF7AD0'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = 'rgba(255, 122, 208, 0.2)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'rgba(255, 122, 208, 0.1)';
          }}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    ),
    {
      duration: 5000,
      position: 'top-right',
      style: {
        ...baseStyle,
        minWidth: '380px'
      },
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
  jiraExportSuccess: showJiraExportSuccessToast
};
