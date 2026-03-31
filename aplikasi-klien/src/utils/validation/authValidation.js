/**
 * Enhanced Authentication Validation Utilities
 * Provides comprehensive validation for email, password, and other auth fields
 */

/**
 * Enhanced email validation with comprehensive format checking
 * @param {string} email - Email to validate
 * @returns {Object} - Validation result with isValid and error message
 */
export const validateEmail = (email) => {
  if (!email || !email.trim()) {
    return {
      isValid: false,
      error: 'Email wajib diisi'
    };
  }

  const trimmedEmail = email.trim();

  // Basic format validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(trimmedEmail)) {
    return {
      isValid: false,
      error: 'Format email tidak valid'
    };
  }

  // More comprehensive email validation
  const advancedEmailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
  if (!advancedEmailRegex.test(trimmedEmail)) {
    return {
      isValid: false,
      error: 'Format email tidak valid'
    };
  }

  // Check for common invalid patterns
  if (trimmedEmail.includes('..') || trimmedEmail.startsWith('.') || trimmedEmail.endsWith('.')) {
    return {
      isValid: false,
      error: 'Format email tidak valid'
    };
  }

  // Check email length
  if (trimmedEmail.length > 254) {
    return {
      isValid: false,
      error: 'Email terlalu panjang'
    };
  }

  // Check local part length (before @)
  const localPart = trimmedEmail.split('@')[0];
  if (localPart.length > 64) {
    return {
      isValid: false,
      error: 'Format email tidak valid'
    };
  }

  return {
    isValid: true,
    error: null
  };
};

/**
 * Enhanced password validation with strength checking
 * @param {string} password - Password to validate
 * @returns {Object} - Validation result with isValid, error, and strength details
 */
export const validatePassword = (password) => {
  if (!password) {
    return {
      isValid: false,
      error: 'Password wajib diisi',
      strength: {
        minLength: false,
        hasUpperCase: false,
        hasLowerCase: false,
        hasNumbers: false,
        hasSpecialChars: false,
        score: 0
      }
    };
  }

  const strength = {
    minLength: password.length >= 8,
    hasUpperCase: /[A-Z]/.test(password),
    hasLowerCase: /[a-z]/.test(password),
    hasNumbers: /\d/.test(password),
    hasSpecialChars: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password),
    score: 0
  };

  // Calculate strength score
  if (strength.minLength) strength.score += 1;
  if (strength.hasUpperCase) strength.score += 1;
  if (strength.hasLowerCase) strength.score += 1;
  if (strength.hasNumbers) strength.score += 1;
  if (strength.hasSpecialChars) strength.score += 1;

  // Check minimum requirements
  if (!strength.minLength) {
    return {
      isValid: false,
      error: 'Password minimal 8 karakter',
      strength
    };
  }

  if (!strength.hasUpperCase) {
    return {
      isValid: false,
      error: 'Password harus mengandung huruf besar',
      strength
    };
  }

  if (!strength.hasLowerCase) {
    return {
      isValid: false,
      error: 'Password harus mengandung huruf kecil',
      strength
    };
  }

  if (!strength.hasNumbers) {
    return {
      isValid: false,
      error: 'Password harus mengandung angka',
      strength
    };
  }

  // Check for common weak passwords
  const commonPasswords = [
    'password', '12345678', 'qwerty123', 'abc12345', 
    'password123', '123456789', 'qwertyuiop'
  ];
  
  if (commonPasswords.includes(password.toLowerCase())) {
    return {
      isValid: false,
      error: 'Password terlalu umum, gunakan kombinasi yang lebih unik',
      strength
    };
  }

  // Check for sequential characters
  if (/123456|abcdef|qwerty/i.test(password)) {
    return {
      isValid: false,
      error: 'Hindari urutan karakter yang mudah ditebak',
      strength
    };
  }

  return {
    isValid: true,
    error: null,
    strength
  };
};

/**
 * Validate name field
 * @param {string} name - Name to validate
 * @returns {Object} - Validation result
 */
export const validateName = (name) => {
  if (!name || !name.trim()) {
    return {
      isValid: false,
      error: 'Nama lengkap wajib diisi'
    };
  }

  const trimmedName = name.trim();

  if (trimmedName.length < 2) {
    return {
      isValid: false,
      error: 'Nama minimal 2 karakter'
    };
  }

  if (trimmedName.length > 100) {
    return {
      isValid: false,
      error: 'Nama terlalu panjang (maksimal 100 karakter)'
    };
  }

  // Check for valid characters (letters, spaces, hyphens, apostrophes)
  const nameRegex = /^[a-zA-Z\s\-'\.]+$/;
  if (!nameRegex.test(trimmedName)) {
    return {
      isValid: false,
      error: 'Nama hanya boleh mengandung huruf, spasi, tanda hubung, dan apostrof'
    };
  }

  return {
    isValid: true,
    error: null
  };
};

/**
 * Validate password confirmation
 * @param {string} password - Original password
 * @param {string} confirmPassword - Password confirmation
 * @returns {Object} - Validation result
 */
export const validatePasswordConfirmation = (password, confirmPassword) => {
  if (!confirmPassword) {
    return {
      isValid: false,
      error: 'Konfirmasi password wajib diisi'
    };
  }

  if (password !== confirmPassword) {
    return {
      isValid: false,
      error: 'Password tidak cocok'
    };
  }

  return {
    isValid: true,
    error: null
  };
};

/**
 * Get password strength level as text
 * @param {Object} strength - Password strength object
 * @returns {Object} - Strength level and color
 */
export const getPasswordStrengthLevel = (strength) => {
  if (!strength) {
    return { level: 'Tidak ada', color: 'text-gray-500' };
  }

  switch (strength.score) {
    case 0:
    case 1:
      return { level: 'Sangat Lemah', color: 'text-red-500' };
    case 2:
      return { level: 'Lemah', color: 'text-orange-500' };
    case 3:
      return { level: 'Sedang', color: 'text-yellow-500' };
    case 4:
      return { level: 'Kuat', color: 'text-blue-500' };
    case 5:
      return { level: 'Sangat Kuat', color: 'text-green-500' };
    default:
      return { level: 'Tidak diketahui', color: 'text-gray-500' };
  }
};

/**
 * Real-time validation for form fields
 * @param {Object} formData - Form data object
 * @param {boolean} isSignup - Whether this is signup form
 * @returns {Object} - Validation results for all fields
 */
export const validateAuthForm = (formData, isSignup = false) => {
  const errors = {};
  let isFormValid = true;

  // Email validation
  const emailValidation = validateEmail(formData.email);
  if (!emailValidation.isValid) {
    errors.email = emailValidation.error;
    isFormValid = false;
  }

  // Password validation
  const passwordValidation = validatePassword(formData.password);
  if (!passwordValidation.isValid) {
    errors.password = passwordValidation.error;
    isFormValid = false;
  }

  // Signup-specific validations
  if (isSignup) {
    // Name validation
    const nameValidation = validateName(formData.name);
    if (!nameValidation.isValid) {
      errors.name = nameValidation.error;
      isFormValid = false;
    }

    // Password confirmation validation
    const confirmPasswordValidation = validatePasswordConfirmation(
      formData.password, 
      formData.confirmPassword
    );
    if (!confirmPasswordValidation.isValid) {
      errors.confirmPassword = confirmPasswordValidation.error;
      isFormValid = false;
    }
  }

  return {
    errors,
    isFormValid,
    passwordStrength: passwordValidation.strength
  };
};