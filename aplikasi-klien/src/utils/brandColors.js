/**
 * SpecWeave Brand Color Utilities
 * 
 * This module provides color validation and utilities to ensure
 * consistent use of SpecWeave brand colors (purple-pink gradient)
 * throughout the application.
 */

/**
 * SpecWeave Brand Color Palette
 * ONLY these colors should be used in the Testing UI
 */
export const SPECWEAVE_COLORS = {
  // Primary gradient - ONLY THESE COLORS
  primary: {
    from: 'purple-600',
    via: 'purple-500',
    to: 'pink-600'
  },
  
  // Secondary gradient
  secondary: {
    from: 'purple-400',
    to: 'pink-400'
  },
  
  // Accent colors - ONLY purple and pink
  accent: {
    purple: {
      light: 'purple-400',
      DEFAULT: 'purple-500',
      dark: 'purple-600'
    },
    pink: {
      light: 'pink-400',
      DEFAULT: 'pink-500',
      dark: 'pink-600'
    }
  },
  
  // Background colors - neutral only
  background: {
    dark: '#020203',
    card: 'slate-800/50',
    hover: 'white/10'
  },
  
  // Text colors - neutral only
  text: {
    primary: 'white',
    secondary: 'gray-300',
    muted: 'gray-400'
  }
};

/**
 * FORBIDDEN COLORS - DO NOT USE
 * These colors are not part of the SpecWeave brand palette
 */
export const FORBIDDEN_COLORS = [
  'blue', 'green', 'red', 'orange', 'yellow', 'teal', 'cyan', 
  'indigo', 'violet', 'fuchsia', 'rose', 'emerald', 'lime', 'amber'
];

/**
 * Validate that a color class is within the SpecWeave brand palette
 * 
 * @param {string} colorClass - Tailwind color class (e.g., 'purple-500', 'pink-400')
 * @returns {boolean} - True if color is valid brand color, false otherwise
 * 
 * @example
 * isValidBrandColor('purple-500') // true
 * isValidBrandColor('blue-500')   // false
 * isValidBrandColor('gray-400')   // true (neutral allowed)
 */
export function isValidBrandColor(colorClass) {
  if (!colorClass || typeof colorClass !== 'string') {
    return false;
  }

  // Allow purple-400 through purple-600
  if (/^purple-(400|500|600)/.test(colorClass)) {
    return true;
  }
  
  // Allow pink-400 through pink-600
  if (/^pink-(400|500|600)/.test(colorClass)) {
    return true;
  }
  
  // Allow neutral colors (gray, slate, white, black, transparent)
  if (/^(gray|slate|white|black|transparent)/.test(colorClass)) {
    return true;
  }
  
  // Everything else is forbidden
  return false;
}

/**
 * Get brand color for semantic states
 * Replaces traditional semantic colors (red/green/yellow/blue) with brand colors
 * 
 * @param {string} state - Semantic state ('success', 'error', 'warning', 'info')
 * @returns {string} - Brand color class for the state
 * 
 * @example
 * getBrandColorForState('success') // 'purple-500' (instead of green)
 * getBrandColorForState('error')   // 'pink-500' (instead of red)
 */
export function getBrandColorForState(state) {
  const stateColors = {
    success: 'purple-500',  // Use purple instead of green
    error: 'pink-500',      // Use pink instead of red
    warning: 'purple-400',  // Use light purple instead of yellow
    info: 'purple-600'      // Use dark purple instead of blue
  };
  
  return stateColors[state] || 'purple-500';
}

/**
 * Get gradient classes for test types
 * 
 * @param {string} testType - Test type ('meteor' or 'sentence_bert')
 * @returns {object} - Gradient configuration
 */
export function getTestTypeGradient(testType) {
  const gradients = {
    meteor: {
      from: 'purple-600',
      to: 'purple-500',
      text: 'purple-300',
      bg: 'purple-500/10',
      border: 'purple-500/20'
    },
    sentence_bert: {
      from: 'pink-600',
      to: 'pink-500',
      text: 'pink-300',
      bg: 'pink-500/10',
      border: 'pink-500/20'
    }
  };
  
  return gradients[testType] || gradients.meteor;
}

/**
 * Validate color usage in a component
 * Scans for forbidden color patterns in className strings
 * 
 * @param {string} classNames - Space-separated className string
 * @returns {object} - Validation result with isValid flag and violations array
 * 
 * @example
 * validateColorUsage('bg-blue-500 text-white') 
 * // { isValid: false, violations: ['blue'] }
 */
export function validateColorUsage(classNames) {
  if (!classNames || typeof classNames !== 'string') {
    return { isValid: true, violations: [] };
  }

  const violations = [];
  
  // Check for forbidden colors
  FORBIDDEN_COLORS.forEach(color => {
    const pattern = new RegExp(`\\b${color}-\\d+`, 'g');
    if (pattern.test(classNames)) {
      violations.push(color);
    }
  });
  
  return {
    isValid: violations.length === 0,
    violations: [...new Set(violations)] // Remove duplicates
  };
}

/**
 * Get quality level color (for score displays)
 * Maps quality scores to brand colors
 * 
 * @param {number} score - Quality score (0-1)
 * @returns {string} - Brand color class
 */
export function getQualityLevelColor(score) {
  if (!score && score !== 0) return 'gray-400';
  if (score >= 0.7) return 'purple-400';  // Excellent - purple
  if (score >= 0.5) return 'purple-300';  // Good - light purple
  return 'pink-400';                       // Needs improvement - pink
}

export default {
  SPECWEAVE_COLORS,
  FORBIDDEN_COLORS,
  isValidBrandColor,
  getBrandColorForState,
  getTestTypeGradient,
  validateColorUsage,
  getQualityLevelColor
};
