/**
 * Calculate token status based on expiry date
 * @param {string|Date} expiryDate - Token expiry date
 * @returns {Object} Status object with type, label, color, and days remaining
 */
export const calculateTokenStatus = (expiryDate) => {
  if (!expiryDate) {
    return {
      type: 'unknown',
      label: 'Unknown',
      color: 'gray',
      icon: '⚪',
      daysRemaining: null
    };
  }

  const now = new Date();
  now.setHours(0, 0, 0, 0); // Reset to start of day for accurate comparison
  
  const expiry = new Date(expiryDate);
  expiry.setHours(0, 0, 0, 0);
  
  const daysUntilExpiry = Math.ceil((expiry - now) / (1000 * 60 * 60 * 24));

  if (daysUntilExpiry < 0) {
    return {
      type: 'expired',
      label: 'Token Expired',
      color: 'red',
      icon: '🔴',
      daysRemaining: daysUntilExpiry
    };
  }

  if (daysUntilExpiry === 0) {
    return {
      type: 'expiring_today',
      label: 'Expires Today',
      color: 'red',
      icon: '🔴',
      daysRemaining: 0
    };
  }

  if (daysUntilExpiry <= 7) {
    return {
      type: 'expiring_soon',
      label: `Expires in ${daysUntilExpiry} day${daysUntilExpiry !== 1 ? 's' : ''}`,
      color: 'yellow',
      icon: '🟡',
      daysRemaining: daysUntilExpiry
    };
  }

  if (daysUntilExpiry <= 30) {
    return {
      type: 'valid',
      label: `Expires in ${daysUntilExpiry} days`,
      color: 'green',
      icon: '🟢',
      daysRemaining: daysUntilExpiry
    };
  }

  return {
    type: 'valid',
    label: `Valid (${daysUntilExpiry} days left)`,
    color: 'green',
    icon: '🟢',
    daysRemaining: daysUntilExpiry
  };
};

/**
 * Get status badge classes based on token status
 * @param {string} statusType - Status type (valid, expiring_soon, expired, unknown)
 * @returns {Object} Tailwind classes for badge
 */
export const getTokenStatusBadgeClasses = (statusType) => {
  const baseClasses = 'px-2 py-0.5 text-xs rounded border';
  
  switch (statusType) {
    case 'expired':
    case 'expiring_today':
      return {
        container: `${baseClasses} bg-red-500/20 text-red-400 border-red-500/30`,
        icon: 'text-red-400'
      };
    case 'expiring_soon':
      return {
        container: `${baseClasses} bg-yellow-500/20 text-yellow-400 border-yellow-500/30`,
        icon: 'text-yellow-400'
      };
    case 'valid':
      return {
        container: `${baseClasses} bg-green-500/20 text-green-400 border-green-500/30`,
        icon: 'text-green-400'
      };
    case 'unknown':
    default:
      return {
        container: `${baseClasses} bg-gray-500/20 text-gray-400 border-gray-500/30`,
        icon: 'text-gray-400'
      };
  }
};

/**
 * Format expiry date for display
 * @param {string|Date} expiryDate - Token expiry date
 * @returns {string} Formatted date string
 */
export const formatExpiryDate = (expiryDate) => {
  if (!expiryDate) return 'Not set';
  
  const date = new Date(expiryDate);
  const options = { year: 'numeric', month: 'short', day: 'numeric' };
  return date.toLocaleDateString('en-US', options);
};

/**
 * Check if token needs warning notification
 * @param {string|Date} expiryDate - Token expiry date
 * @param {string|Date} lastWarningDate - Last warning date
 * @returns {boolean} True if warning should be shown
 */
export const shouldShowExpiryWarning = (expiryDate, lastWarningDate) => {
  if (!expiryDate) return false;
  
  const status = calculateTokenStatus(expiryDate);
  
  // Don't warn for valid tokens with more than 7 days
  if (status.type === 'valid' && status.daysRemaining > 7) {
    return false;
  }
  
  // Always warn for expired tokens
  if (status.type === 'expired' || status.type === 'expiring_today') {
    return true;
  }
  
  // For expiring soon, check if we've warned in the last 24 hours
  if (status.type === 'expiring_soon') {
    if (!lastWarningDate) return true;
    
    const lastWarning = new Date(lastWarningDate);
    const now = new Date();
    const hoursSinceWarning = (now - lastWarning) / (1000 * 60 * 60);
    
    // Show warning again if it's been more than 24 hours
    return hoursSinceWarning >= 24;
  }
  
  return false;
};
