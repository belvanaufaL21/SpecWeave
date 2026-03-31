/**
 * Format Utility Functions
 * Reusable formatting functions for display purposes
 */

/**
 * Format number with commas
 */
export const formatNumber = (num, options = {}) => {
  const {
    decimals = 0,
    locale = 'en-US',
    currency = null,
    percentage = false
  } = options;

  if (num == null || isNaN(num)) return '0';

  const number = Number(num);

  if (currency) {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals
    }).format(number);
  }

  if (percentage) {
    return new Intl.NumberFormat(locale, {
      style: 'percent',
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals
    }).format(number);
  }

  return new Intl.NumberFormat(locale, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  }).format(number);
};

/**
 * Format file size
 */
export const formatFileSize = (bytes, decimals = 2) => {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];

  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
};

/**
 * Format date
 */
export const formatDate = (date, format = 'default', locale = 'en-US') => {
  if (!date) return '';

  const dateObj = date instanceof Date ? date : new Date(date);
  if (isNaN(dateObj.getTime())) return '';

  const formats = {
    default: { year: 'numeric', month: 'short', day: 'numeric' },
    short: { month: 'short', day: 'numeric' },
    long: { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' },
    time: { hour: '2-digit', minute: '2-digit' },
    datetime: { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric', 
      hour: '2-digit', 
      minute: '2-digit' 
    },
    iso: null // Special case for ISO string
  };

  if (format === 'iso') {
    return dateObj.toISOString();
  }

  return new Intl.DateTimeFormat(locale, formats[format] || formats.default).format(dateObj);
};

/**
 * Format relative time (e.g., "2 hours ago")
 */
export const formatRelativeTime = (date, locale = 'en-US') => {
  if (!date) return '';

  const dateObj = date instanceof Date ? date : new Date(date);
  if (isNaN(dateObj.getTime())) return '';

  const now = new Date();
  const diffInSeconds = Math.floor((now - dateObj) / 1000);

  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });

  const intervals = [
    { label: 'year', seconds: 31536000 },
    { label: 'month', seconds: 2592000 },
    { label: 'week', seconds: 604800 },
    { label: 'day', seconds: 86400 },
    { label: 'hour', seconds: 3600 },
    { label: 'minute', seconds: 60 },
    { label: 'second', seconds: 1 }
  ];

  for (const interval of intervals) {
    const count = Math.floor(diffInSeconds / interval.seconds);
    if (count !== 0) {
      return rtf.format(-count, interval.label);
    }
  }

  return rtf.format(0, 'second');
};

/**
 * Format duration (e.g., "2h 30m")
 */
export const formatDuration = (milliseconds, format = 'short') => {
  if (!milliseconds || milliseconds < 0) return '0s';

  const seconds = Math.floor(milliseconds / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  const remainingHours = hours % 24;
  const remainingMinutes = minutes % 60;
  const remainingSeconds = seconds % 60;

  if (format === 'long') {
    const parts = [];
    if (days > 0) parts.push(`${days} day${days !== 1 ? 's' : ''}`);
    if (remainingHours > 0) parts.push(`${remainingHours} hour${remainingHours !== 1 ? 's' : ''}`);
    if (remainingMinutes > 0) parts.push(`${remainingMinutes} minute${remainingMinutes !== 1 ? 's' : ''}`);
    if (remainingSeconds > 0 && parts.length === 0) parts.push(`${remainingSeconds} second${remainingSeconds !== 1 ? 's' : ''}`);
    return parts.join(', ');
  }

  // Short format
  const parts = [];
  if (days > 0) parts.push(`${days}d`);
  if (remainingHours > 0) parts.push(`${remainingHours}h`);
  if (remainingMinutes > 0) parts.push(`${remainingMinutes}m`);
  if (remainingSeconds > 0 && parts.length === 0) parts.push(`${remainingSeconds}s`);
  
  return parts.join(' ');
};

/**
 * Format percentage
 */
export const formatPercentage = (value, decimals = 1) => {
  if (value == null || isNaN(value)) return '0%';
  return `${Number(value * 100).toFixed(decimals)}%`;
};

/**
 * Format phone number
 */
export const formatPhoneNumber = (phoneNumber, format = 'US') => {
  if (!phoneNumber) return '';

  const cleaned = phoneNumber.replace(/\D/g, '');

  if (format === 'US') {
    if (cleaned.length === 10) {
      return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
    }
    if (cleaned.length === 11 && cleaned[0] === '1') {
      return `+1 (${cleaned.slice(1, 4)}) ${cleaned.slice(4, 7)}-${cleaned.slice(7)}`;
    }
  }

  return phoneNumber; // Return original if can't format
};

/**
 * Format credit card number
 */
export const formatCreditCard = (cardNumber) => {
  if (!cardNumber) return '';

  const cleaned = cardNumber.replace(/\D/g, '');
  const groups = cleaned.match(/.{1,4}/g) || [];
  
  return groups.join(' ').substr(0, 19); // Max 16 digits + 3 spaces
};

/**
 * Format text to title case
 */
export const toTitleCase = (str) => {
  if (!str) return '';
  
  return str.replace(/\w\S*/g, (txt) => 
    txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase()
  );
};

/**
 * Format text to sentence case
 */
export const toSentenceCase = (str) => {
  if (!str) return '';
  
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
};

/**
 * Format text to kebab case
 */
export const toKebabCase = (str) => {
  if (!str) return '';
  
  return str
    .replace(/([a-z])([A-Z])/g, '$1-$2')
    .replace(/[\s_]+/g, '-')
    .toLowerCase();
};

/**
 * Format text to camel case
 */
export const toCamelCase = (str) => {
  if (!str) return '';
  
  return str
    .replace(/(?:^\w|[A-Z]|\b\w)/g, (word, index) => 
      index === 0 ? word.toLowerCase() : word.toUpperCase()
    )
    .replace(/\s+/g, '');
};

/**
 * Format text to snake case
 */
export const toSnakeCase = (str) => {
  if (!str) return '';
  
  return str
    .replace(/([a-z])([A-Z])/g, '$1_$2')
    .replace(/[\s-]+/g, '_')
    .toLowerCase();
};

/**
 * Truncate text with ellipsis
 */
export const truncateText = (text, maxLength, suffix = '...') => {
  if (!text || text.length <= maxLength) return text;
  
  return text.substring(0, maxLength - suffix.length) + suffix;
};

/**
 * Format address
 */
export const formatAddress = (address) => {
  if (!address || typeof address !== 'object') return '';

  const parts = [
    address.street,
    address.city,
    address.state,
    address.zipCode,
    address.country
  ].filter(Boolean);

  return parts.join(', ');
};

/**
 * Format name
 */
export const formatName = (firstName, lastName, format = 'full') => {
  if (!firstName && !lastName) return '';

  switch (format) {
    case 'first':
      return firstName || '';
    case 'last':
      return lastName || '';
    case 'initials':
      return `${firstName?.[0] || ''}${lastName?.[0] || ''}`.toUpperCase();
    case 'lastFirst':
      return [lastName, firstName].filter(Boolean).join(', ');
    case 'full':
    default:
      return [firstName, lastName].filter(Boolean).join(' ');
  }
};

/**
 * Format score with color coding
 */
export const formatScore = (score, type = 'meteor') => {
  if (score == null || isNaN(score)) return { value: 'N/A', color: 'gray' };

  const numScore = Number(score);
  let color = 'gray';
  
  if (type === 'meteor') {
    // METEOR scores: 0-1, higher is better
    if (numScore >= 0.8) color = 'green';
    else if (numScore >= 0.6) color = 'yellow';
    else if (numScore >= 0.4) color = 'orange';
    else color = 'red';
  } else if (type === 'sentence_bert') {
    // Sentence-BERT scores: -1 to 1, higher is better
    if (numScore >= 0.8) color = 'green';
    else if (numScore >= 0.5) color = 'yellow';
    else if (numScore >= 0.2) color = 'orange';
    else color = 'red';
  }

  return {
    value: numScore.toFixed(3),
    color,
    percentage: type === 'meteor' ? formatPercentage(numScore) : null
  };
};

/**
 * Format list with proper conjunctions
 */
export const formatList = (items, conjunction = 'and') => {
  if (!Array.isArray(items) || items.length === 0) return '';
  
  if (items.length === 1) return items[0];
  if (items.length === 2) return `${items[0]} ${conjunction} ${items[1]}`;
  
  const lastItem = items[items.length - 1];
  const otherItems = items.slice(0, -1);
  
  return `${otherItems.join(', ')}, ${conjunction} ${lastItem}`;
};

/**
 * Format JSON for display
 */
export const formatJson = (obj, indent = 2) => {
  try {
    return JSON.stringify(obj, null, indent);
  } catch (error) {
    return String(obj);
  }
};

/**
 * Format error message
 */
export const formatErrorMessage = (error) => {
  if (!error) return 'Unknown error occurred';
  
  if (typeof error === 'string') return error;
  if (error.message) return error.message;
  if (error.error) return error.error;
  
  return 'An error occurred';
};