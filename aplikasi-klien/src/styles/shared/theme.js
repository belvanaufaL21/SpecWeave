/**
 * Theme Configuration
 * Centralized theme system with consistent design tokens
 */

// Color palette
export const colors = {
  // Primary colors
  primary: {
    50: '#f0f9ff',
    100: '#e0f2fe',
    200: '#bae6fd',
    300: '#7dd3fc',
    400: '#38bdf8',
    500: '#0ea5e9',
    600: '#0284c7',
    700: '#0369a1',
    800: '#075985',
    900: '#0c4a6e',
    950: '#082f49'
  },
  
  // Secondary colors (purple/pink gradient)
  secondary: {
    50: '#fdf4ff',
    100: '#fae8ff',
    200: '#f5d0fe',
    300: '#f0abfc',
    400: '#e879f9',
    500: '#d946ef',
    600: '#c026d3',
    700: '#a21caf',
    800: '#86198f',
    900: '#701a75',
    950: '#4a044e'
  },
  
  // Neutral colors
  gray: {
    50: '#f9fafb',
    100: '#f3f4f6',
    200: '#e5e7eb',
    300: '#d1d5db',
    400: '#9ca3af',
    500: '#6b7280',
    600: '#4b5563',
    700: '#374151',
    800: '#1f2937',
    900: '#111827',
    950: '#030712'
  },
  
  // Dark theme colors
  dark: {
    50: '#f8fafc',
    100: '#f1f5f9',
    200: '#e2e8f0',
    300: '#cbd5e1',
    400: '#94a3b8',
    500: '#64748b',
    600: '#475569',
    700: '#334155',
    800: '#1e293b',
    900: '#0f172a',
    950: '#020617'
  },
  
  // Semantic colors
  success: {
    50: '#f0fdf4',
    100: '#dcfce7',
    200: '#bbf7d0',
    300: '#86efac',
    400: '#4ade80',
    500: '#22c55e',
    600: '#16a34a',
    700: '#15803d',
    800: '#166534',
    900: '#14532d'
  },
  
  warning: {
    50: '#fffbeb',
    100: '#fef3c7',
    200: '#fde68a',
    300: '#fcd34d',
    400: '#fbbf24',
    500: '#f59e0b',
    600: '#d97706',
    700: '#b45309',
    800: '#92400e',
    900: '#78350f'
  },
  
  error: {
    50: '#fef2f2',
    100: '#fee2e2',
    200: '#fecaca',
    300: '#fca5a5',
    400: '#f87171',
    500: '#ef4444',
    600: '#dc2626',
    700: '#b91c1c',
    800: '#991b1b',
    900: '#7f1d1d'
  },
  
  info: {
    50: '#eff6ff',
    100: '#dbeafe',
    200: '#bfdbfe',
    300: '#93c5fd',
    400: '#60a5fa',
    500: '#3b82f6',
    600: '#2563eb',
    700: '#1d4ed8',
    800: '#1e40af',
    900: '#1e3a8a'
  }
};

// Typography scale
export const typography = {
  fontFamily: {
    sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
    mono: ['JetBrains Mono', 'Fira Code', 'Monaco', 'Consolas', 'monospace'],
    display: ['Cal Sans', 'Inter', 'system-ui', 'sans-serif']
  },
  
  fontSize: {
    xs: ['0.75rem', { lineHeight: '1rem' }],
    sm: ['0.875rem', { lineHeight: '1.25rem' }],
    base: ['1rem', { lineHeight: '1.5rem' }],
    lg: ['1.125rem', { lineHeight: '1.75rem' }],
    xl: ['1.25rem', { lineHeight: '1.75rem' }],
    '2xl': ['1.5rem', { lineHeight: '2rem' }],
    '3xl': ['1.875rem', { lineHeight: '2.25rem' }],
    '4xl': ['2.25rem', { lineHeight: '2.5rem' }],
    '5xl': ['3rem', { lineHeight: '1' }],
    '6xl': ['3.75rem', { lineHeight: '1' }],
    '7xl': ['4.5rem', { lineHeight: '1' }],
    '8xl': ['6rem', { lineHeight: '1' }],
    '9xl': ['8rem', { lineHeight: '1' }]
  },
  
  fontWeight: {
    thin: '100',
    extralight: '200',
    light: '300',
    normal: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
    extrabold: '800',
    black: '900'
  },
  
  letterSpacing: {
    tighter: '-0.05em',
    tight: '-0.025em',
    normal: '0em',
    wide: '0.025em',
    wider: '0.05em',
    widest: '0.1em'
  },
  
  lineHeight: {
    none: '1',
    tight: '1.25',
    snug: '1.375',
    normal: '1.5',
    relaxed: '1.625',
    loose: '2'
  }
};

// Spacing scale
export const spacing = {
  px: '1px',
  0: '0px',
  0.5: '0.125rem',
  1: '0.25rem',
  1.5: '0.375rem',
  2: '0.5rem',
  2.5: '0.625rem',
  3: '0.75rem',
  3.5: '0.875rem',
  4: '1rem',
  5: '1.25rem',
  6: '1.5rem',
  7: '1.75rem',
  8: '2rem',
  9: '2.25rem',
  10: '2.5rem',
  11: '2.75rem',
  12: '3rem',
  14: '3.5rem',
  16: '4rem',
  20: '5rem',
  24: '6rem',
  28: '7rem',
  32: '8rem',
  36: '9rem',
  40: '10rem',
  44: '11rem',
  48: '12rem',
  52: '13rem',
  56: '14rem',
  60: '15rem',
  64: '16rem',
  72: '18rem',
  80: '20rem',
  96: '24rem'
};

// Border radius
export const borderRadius = {
  none: '0px',
  sm: '0.125rem',
  DEFAULT: '0.25rem',
  md: '0.375rem',
  lg: '0.5rem',
  xl: '0.75rem',
  '2xl': '1rem',
  '3xl': '1.5rem',
  full: '9999px'
};

// Shadows
export const boxShadow = {
  sm: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
  DEFAULT: '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
  md: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
  lg: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
  xl: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
  '2xl': '0 25px 50px -12px rgb(0 0 0 / 0.25)',
  inner: 'inset 0 2px 4px 0 rgb(0 0 0 / 0.05)',
  none: 'none',
  
  // Custom shadows for dark theme
  'dark-sm': '0 1px 2px 0 rgb(0 0 0 / 0.3)',
  'dark-md': '0 4px 6px -1px rgb(0 0 0 / 0.3), 0 2px 4px -2px rgb(0 0 0 / 0.3)',
  'dark-lg': '0 10px 15px -3px rgb(0 0 0 / 0.3), 0 4px 6px -4px rgb(0 0 0 / 0.3)',
  'dark-xl': '0 20px 25px -5px rgb(0 0 0 / 0.3), 0 8px 10px -6px rgb(0 0 0 / 0.3)',
  
  // Colored shadows
  'primary': '0 4px 14px 0 rgb(14 165 233 / 0.25)',
  'secondary': '0 4px 14px 0 rgb(217 70 239 / 0.25)',
  'success': '0 4px 14px 0 rgb(34 197 94 / 0.25)',
  'warning': '0 4px 14px 0 rgb(245 158 11 / 0.25)',
  'error': '0 4px 14px 0 rgb(239 68 68 / 0.25)'
};

// Breakpoints
export const screens = {
  xs: '475px',
  sm: '640px',
  md: '768px',
  lg: '1024px',
  xl: '1280px',
  '2xl': '1536px'
};

// Z-index scale
export const zIndex = {
  auto: 'auto',
  0: '0',
  10: '10',
  20: '20',
  30: '30',
  40: '40',
  50: '50',
  
  // Semantic z-index values
  dropdown: '1000',
  sticky: '1020',
  fixed: '1030',
  'modal-backdrop': '1040',
  modal: '1050',
  popover: '1060',
  tooltip: '1070',
  toast: '1080'
};

// Animation durations
export const transitionDuration = {
  75: '75ms',
  100: '100ms',
  150: '150ms',
  200: '200ms',
  300: '300ms',
  500: '500ms',
  700: '700ms',
  1000: '1000ms'
};

// Animation timing functions
export const transitionTimingFunction = {
  linear: 'linear',
  in: 'cubic-bezier(0.4, 0, 1, 1)',
  out: 'cubic-bezier(0, 0, 0.2, 1)',
  'in-out': 'cubic-bezier(0.4, 0, 0.2, 1)',
  
  // Custom easing functions
  'ease-in-back': 'cubic-bezier(0.36, 0, 0.66, -0.56)',
  'ease-out-back': 'cubic-bezier(0.34, 1.56, 0.64, 1)',
  'ease-in-out-back': 'cubic-bezier(0.68, -0.6, 0.32, 1.6)',
  
  'ease-in-circ': 'cubic-bezier(0.55, 0, 1, 0.45)',
  'ease-out-circ': 'cubic-bezier(0, 0.55, 0.45, 1)',
  'ease-in-out-circ': 'cubic-bezier(0.85, 0, 0.15, 1)',
  
  'ease-in-expo': 'cubic-bezier(0.7, 0, 0.84, 0)',
  'ease-out-expo': 'cubic-bezier(0.16, 1, 0.3, 1)',
  'ease-in-out-expo': 'cubic-bezier(0.87, 0, 0.13, 1)'
};

// Theme variants
export const themes = {
  light: {
    background: colors.gray[50],
    surface: colors.gray[100],
    card: '#ffffff',
    text: {
      primary: colors.gray[900],
      secondary: colors.gray[600],
      muted: colors.gray[500]
    },
    border: colors.gray[200],
    input: {
      background: '#ffffff',
      border: colors.gray[300],
      focus: colors.primary[500]
    }
  },
  
  dark: {
    background: colors.dark[950],
    surface: colors.dark[900],
    card: colors.dark[800],
    text: {
      primary: colors.gray[100],
      secondary: colors.gray[300],
      muted: colors.gray[400]
    },
    border: colors.dark[700],
    input: {
      background: colors.dark[800],
      border: colors.dark[600],
      focus: colors.primary[400]
    }
  }
};

// Component variants
export const componentVariants = {
  button: {
    primary: {
      background: `linear-gradient(135deg, ${colors.primary[600]}, ${colors.secondary[600]})`,
      hover: `linear-gradient(135deg, ${colors.primary[700]}, ${colors.secondary[700]})`,
      text: '#ffffff',
      shadow: boxShadow.primary
    },
    secondary: {
      background: colors.dark[800],
      hover: colors.dark[700],
      text: '#ffffff',
      border: `1px solid ${colors.gray[600]}`
    },
    outline: {
      background: 'transparent',
      hover: `${colors.primary[500]}10`,
      text: colors.primary[500],
      border: `2px solid ${colors.primary[500]}`
    },
    ghost: {
      background: 'transparent',
      hover: `${colors.gray[100]}`,
      text: colors.gray[700]
    }
  },
  
  input: {
    default: {
      background: `${colors.dark[800]}80`,
      border: colors.gray[600],
      focus: colors.primary[500],
      text: '#ffffff',
      placeholder: colors.gray[400]
    },
    error: {
      border: colors.error[500],
      focus: colors.error[500]
    }
  },
  
  card: {
    default: {
      background: `${colors.dark[950]}95`,
      border: `${colors.gray[100]}10`,
      shadow: boxShadow['dark-lg']
    },
    elevated: {
      background: `${colors.dark[900]}95`,
      border: `${colors.gray[100]}20`,
      shadow: boxShadow['dark-xl']
    }
  }
};

// Export complete theme object
export const theme = {
  colors,
  typography,
  spacing,
  borderRadius,
  boxShadow,
  screens,
  zIndex,
  transitionDuration,
  transitionTimingFunction,
  themes,
  componentVariants
};

export default theme;