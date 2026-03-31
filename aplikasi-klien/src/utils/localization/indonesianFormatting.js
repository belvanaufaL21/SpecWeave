/**
 * Indonesian Formatting Utilities
 * Date/time, number, and currency formatting for Indonesian locale
 */

// Indonesian locale configuration
const INDONESIAN_LOCALE = 'id-ID';
const TIMEZONE = 'Asia/Jakarta';

/**
 * Format date in Indonesian format (DD/MM/YYYY)
 * @param {Date|string|number} date - Date to format
 * @param {Object} options - Formatting options
 * @returns {string} Formatted date string
 */
export const formatDate = (date, options = {}) => {
  if (!date) return '';
  
  const dateObj = new Date(date);
  if (isNaN(dateObj.getTime())) return '';
  
  const defaultOptions = {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    timeZone: TIMEZONE,
    ...options
  };
  
  try {
    return dateObj.toLocaleDateString(INDONESIAN_LOCALE, defaultOptions);
  } catch (error) {
    // Fallback to manual formatting
    const day = String(dateObj.getDate()).padStart(2, '0');
    const month = String(dateObj.getMonth() + 1).padStart(2, '0');
    const year = dateObj.getFullYear();
    return `${day}/${month}/${year}`;
  }
};

/**
 * Format time in Indonesian format (HH:MM)
 * @param {Date|string|number} date - Date to format
 * @param {Object} options - Formatting options
 * @returns {string} Formatted time string
 */
export const formatTime = (date, options = {}) => {
  if (!date) return '';
  
  const dateObj = new Date(date);
  if (isNaN(dateObj.getTime())) return '';
  
  const defaultOptions = {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: TIMEZONE,
    ...options
  };
  
  try {
    return dateObj.toLocaleTimeString(INDONESIAN_LOCALE, defaultOptions);
  } catch (error) {
    // Fallback to manual formatting
    const hours = String(dateObj.getHours()).padStart(2, '0');
    const minutes = String(dateObj.getMinutes()).padStart(2, '0');
    return `${hours}:${minutes}`;
  }
};

/**
 * Format date and time in Indonesian format (DD/MM/YYYY HH:MM)
 * @param {Date|string|number} date - Date to format
 * @param {Object} options - Formatting options
 * @returns {string} Formatted datetime string
 */
export const formatDateTime = (date, options = {}) => {
  if (!date) return '';
  
  const dateObj = new Date(date);
  if (isNaN(dateObj.getTime())) return '';
  
  const defaultOptions = {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: TIMEZONE,
    ...options
  };
  
  try {
    return dateObj.toLocaleString(INDONESIAN_LOCALE, defaultOptions);
  } catch (error) {
    // Fallback to manual formatting
    const formattedDate = formatDate(date);
    const formattedTime = formatTime(date);
    return `${formattedDate} ${formattedTime}`;
  }
};

/**
 * Format date in long Indonesian format (e.g., "Senin, 15 Januari 2024")
 * @param {Date|string|number} date - Date to format
 * @param {Object} options - Formatting options
 * @returns {string} Formatted long date string
 */
export const formatLongDate = (date, options = {}) => {
  if (!date) return '';
  
  const dateObj = new Date(date);
  if (isNaN(dateObj.getTime())) return '';
  
  const defaultOptions = {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: TIMEZONE,
    ...options
  };
  
  try {
    return dateObj.toLocaleDateString(INDONESIAN_LOCALE, defaultOptions);
  } catch (error) {
    // Fallback with manual Indonesian day/month names
    const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
    const months = [
      'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
      'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
    ];
    
    const dayName = days[dateObj.getDay()];
    const day = dateObj.getDate();
    const monthName = months[dateObj.getMonth()];
    const year = dateObj.getFullYear();
    
    return `${dayName}, ${day} ${monthName} ${year}`;
  }
};

/**
 * Format relative time in Indonesian (e.g., "2 jam yang lalu")
 * @param {Date|string|number} date - Date to format
 * @returns {string} Formatted relative time string
 */
export const formatRelativeTime = (date) => {
  if (!date) return '';
  
  const dateObj = new Date(date);
  if (isNaN(dateObj.getTime())) return '';
  
  const now = new Date();
  const diffInSeconds = Math.floor((now - dateObj) / 1000);
  
  // Future dates
  if (diffInSeconds < 0) {
    const absDiff = Math.abs(diffInSeconds);
    if (absDiff < 60) return 'dalam beberapa detik';
    if (absDiff < 3600) return `dalam ${Math.floor(absDiff / 60)} menit`;
    if (absDiff < 86400) return `dalam ${Math.floor(absDiff / 3600)} jam`;
    return `dalam ${Math.floor(absDiff / 86400)} hari`;
  }
  
  // Past dates
  if (diffInSeconds < 60) {
    return 'baru saja';
  } else if (diffInSeconds < 3600) {
    const minutes = Math.floor(diffInSeconds / 60);
    return `${minutes} menit yang lalu`;
  } else if (diffInSeconds < 86400) {
    const hours = Math.floor(diffInSeconds / 3600);
    return `${hours} jam yang lalu`;
  } else if (diffInSeconds < 604800) {
    const days = Math.floor(diffInSeconds / 86400);
    return `${days} hari yang lalu`;
  } else if (diffInSeconds < 2592000) {
    const weeks = Math.floor(diffInSeconds / 604800);
    return `${weeks} minggu yang lalu`;
  } else if (diffInSeconds < 31536000) {
    const months = Math.floor(diffInSeconds / 2592000);
    return `${months} bulan yang lalu`;
  } else {
    const years = Math.floor(diffInSeconds / 31536000);
    return `${years} tahun yang lalu`;
  }
};

/**
 * Format number with Indonesian thousand separators
 * @param {number} number - Number to format
 * @param {Object} options - Formatting options
 * @returns {string} Formatted number string
 */
export const formatNumber = (number, options = {}) => {
  if (number === null || number === undefined || isNaN(number)) return '0';
  
  const defaultOptions = {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
    ...options
  };
  
  try {
    return new Intl.NumberFormat(INDONESIAN_LOCALE, defaultOptions).format(number);
  } catch (error) {
    // Fallback to manual formatting
    const parts = number.toFixed(defaultOptions.maximumFractionDigits).split('.');
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    return parts.join(',');
  }
};

/**
 * Format currency in Indonesian Rupiah
 * @param {number} amount - Amount to format
 * @param {Object} options - Formatting options
 * @returns {string} Formatted currency string
 */
export const formatCurrency = (amount, options = {}) => {
  if (amount === null || amount === undefined || isNaN(amount)) return 'Rp 0';
  
  const defaultOptions = {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
    ...options
  };
  
  try {
    return new Intl.NumberFormat(INDONESIAN_LOCALE, defaultOptions).format(amount);
  } catch (error) {
    // Fallback to manual formatting
    const formattedNumber = formatNumber(amount, { maximumFractionDigits: 0 });
    return `Rp ${formattedNumber}`;
  }
};

/**
 * Format percentage in Indonesian format
 * @param {number} value - Value to format as percentage (0-1 or 0-100)
 * @param {Object} options - Formatting options
 * @returns {string} Formatted percentage string
 */
export const formatPercentage = (value, options = {}) => {
  if (value === null || value === undefined || isNaN(value)) return '0%';
  
  const defaultOptions = {
    style: 'percent',
    minimumFractionDigits: 0,
    maximumFractionDigits: 1,
    ...options
  };
  
  // Assume value is already in percentage format (0-100) if > 1
  const percentValue = value > 1 ? value / 100 : value;
  
  try {
    return new Intl.NumberFormat(INDONESIAN_LOCALE, defaultOptions).format(percentValue);
  } catch (error) {
    // Fallback to manual formatting
    const percentage = Math.round(percentValue * 100 * 10) / 10;
    return `${percentage}%`;
  }
};

/**
 * Format file size in Indonesian format
 * @param {number} bytes - File size in bytes
 * @param {number} decimals - Number of decimal places
 * @returns {string} Formatted file size string
 */
export const formatFileSize = (bytes, decimals = 1) => {
  if (bytes === 0) return '0 Byte';
  if (!bytes || isNaN(bytes)) return '0 Byte';
  
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Byte', 'KB', 'MB', 'GB', 'TB', 'PB'];
  
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  const size = parseFloat((bytes / Math.pow(k, i)).toFixed(dm));
  
  return `${formatNumber(size, { maximumFractionDigits: dm })} ${sizes[i]}`;
};

/**
 * Format duration in Indonesian format
 * @param {number} milliseconds - Duration in milliseconds
 * @returns {string} Formatted duration string
 */
export const formatDuration = (milliseconds) => {
  if (!milliseconds || isNaN(milliseconds)) return '0 detik';
  
  const seconds = Math.floor(milliseconds / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  
  if (days > 0) {
    return `${days} hari ${hours % 24} jam`;
  } else if (hours > 0) {
    return `${hours} jam ${minutes % 60} menit`;
  } else if (minutes > 0) {
    return `${minutes} menit ${seconds % 60} detik`;
  } else {
    return `${seconds} detik`;
  }
};

/**
 * Format phone number in Indonesian format
 * @param {string} phoneNumber - Phone number to format
 * @returns {string} Formatted phone number string
 */
export const formatPhoneNumber = (phoneNumber) => {
  if (!phoneNumber) return '';
  
  // Remove all non-digit characters
  const cleaned = phoneNumber.replace(/\D/g, '');
  
  // Handle Indonesian phone numbers
  if (cleaned.startsWith('62')) {
    // International format: +62 xxx xxxx xxxx
    const match = cleaned.match(/^(62)(\d{3})(\d{4})(\d{4})$/);
    if (match) {
      return `+${match[1]} ${match[2]} ${match[3]} ${match[4]}`;
    }
  } else if (cleaned.startsWith('0')) {
    // Local format: 0xxx xxxx xxxx
    const match = cleaned.match(/^(0\d{3})(\d{4})(\d{4})$/);
    if (match) {
      return `${match[1]} ${match[2]} ${match[3]}`;
    }
  }
  
  // Return original if no pattern matches
  return phoneNumber;
};

/**
 * Parse Indonesian date format (DD/MM/YYYY) to Date object
 * @param {string} dateString - Date string in DD/MM/YYYY format
 * @returns {Date|null} Parsed Date object or null if invalid
 */
export const parseIndonesianDate = (dateString) => {
  if (!dateString) return null;
  
  const match = dateString.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!match) return null;
  
  const [, day, month, year] = match;
  const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
  
  // Validate the date
  if (date.getDate() !== parseInt(day) || 
      date.getMonth() !== parseInt(month) - 1 || 
      date.getFullYear() !== parseInt(year)) {
    return null;
  }
  
  return date;
};

/**
 * Get current date in Indonesian format
 * @returns {string} Current date in DD/MM/YYYY format
 */
export const getCurrentDate = () => {
  return formatDate(new Date());
};

/**
 * Get current time in Indonesian format
 * @returns {string} Current time in HH:MM format
 */
export const getCurrentTime = () => {
  return formatTime(new Date());
};

/**
 * Get current datetime in Indonesian format
 * @returns {string} Current datetime in DD/MM/YYYY HH:MM format
 */
export const getCurrentDateTime = () => {
  return formatDateTime(new Date());
};

/**
 * Check if a date string is in valid Indonesian format
 * @param {string} dateString - Date string to validate
 * @returns {boolean} True if valid Indonesian date format
 */
export const isValidIndonesianDate = (dateString) => {
  return parseIndonesianDate(dateString) !== null;
};

/**
 * Format age in Indonesian
 * @param {Date|string|number} birthDate - Birth date
 * @returns {string} Formatted age string
 */
export const formatAge = (birthDate) => {
  if (!birthDate) return '';
  
  const birth = new Date(birthDate);
  if (isNaN(birth.getTime())) return '';
  
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--;
  }
  
  return `${age} tahun`;
};

// Export all formatting functions
export default {
  formatDate,
  formatTime,
  formatDateTime,
  formatLongDate,
  formatRelativeTime,
  formatNumber,
  formatCurrency,
  formatPercentage,
  formatFileSize,
  formatDuration,
  formatPhoneNumber,
  parseIndonesianDate,
  getCurrentDate,
  getCurrentTime,
  getCurrentDateTime,
  isValidIndonesianDate,
  formatAge
};