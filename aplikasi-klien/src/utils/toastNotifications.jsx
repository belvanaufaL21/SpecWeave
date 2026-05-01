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
  color: '#FF7AD0',
  borderRadius: '12px',
  padding: '10px 8px',
  border: '1px solid #44273D',
  boxShadow: '0 10px 40px rgba(255, 122, 208, 0.2)',
  width: '320px',
  height: 'fit-content'
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
      <div className="flex items-start gap-2">
        {/* Success Icon - Same size as title text */}
        <div className="flex-shrink-0 w-5 h-5 rounded-md flex items-center justify-center mt-0.5" style={{ backgroundColor: '#FF7AD0' }}>
          <svg className="w-3 h-3" style={{ color: '#160D14' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        
        {/* Content and Close Button in same row */}
        <div className="flex-1 min-w-0 flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="font-semibold text-sm leading-tight" style={{ color: '#FFFFFF' }}>Login Berhasil!</div>
            <div className="text-xs leading-tight mt-2" style={{ color: '#FF7AD0' }}>
              SpecWeave siap!
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
        ...baseStyle
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
      <div className="flex items-start gap-2">
        {/* JIRA Logo - Same size as title text */}
        <div className="flex-shrink-0 w-5 h-5 rounded-md flex items-center justify-center mt-0.5" style={{ backgroundColor: '#FF7AD0' }}>
          <svg className="w-3 h-3" style={{ color: '#160D14' }} viewBox="0 0 24 24" fill="currentColor">
            <path d="M11.571 11.513H0a5.218 5.218 0 0 0 5.232 5.215h2.13v2.057A5.215 5.215 0 0 0 12.575 24V12.518a1.005 1.005 0 0 0-1.005-1.005zm5.723-5.756H5.736a5.215 5.215 0 0 0 5.215 5.214h2.129v2.058a5.218 5.218 0 0 0 5.215 5.214V6.758a1.001 1.001 0 0 0-1.001-1.001zM23.013 0H11.455a5.215 5.215 0 0 0 5.215 5.215h2.129v2.057A5.215 5.215 0 0 0 24 12.483V1.005A1.001 1.001 0 0 0 23.013 0z"/>
          </svg>
        </div>
        
        {/* Content and Close Button */}
        <div className="flex-1 min-w-0 flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="font-semibold text-sm leading-tight" style={{ color: '#FFFFFF' }}>Export Berhasil!</div>
            <div className="flex items-center gap-1.5 text-xs leading-tight mt-2">
              <span style={{ color: '#FF7AD0' }}>{epicName}:</span>
              <span className="font-mono font-semibold" style={{ color: '#FFFFFF' }}>{issueKey}</span>
            </div>
            
            {/* Action Chip/Button - Smaller */}
            {issueUrl && (
              <a
                href={issueUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium transition-colors mt-1.5"
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
                <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
      duration: 5000,
      position: 'top-right',
      style: {
        ...baseStyle
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
