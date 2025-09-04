// Design System Tokens
export const tokens = {
  // Colors
  colors: {
    primary: {
      main: '#FF2D55',
      background: 'rgba(255, 45, 85, 0.1)',
      shadow: 'rgba(255, 45, 85, 0.3)',
    },
    neutral: {
      white: '#FFFFFF',
      gray50: '#F9FAFB',
      gray100: '#F3F4F6',
      gray200: '#E5E7EB',
      gray300: '#D1D5DB',
      gray400: '#9CA3AF',
      gray500: '#6B7280',
      gray600: '#4B5563',
      gray700: '#374151',
      gray800: '#1F2937',
      gray900: '#111827',
      black: '#000000',
    },
    surface: {
      glass: 'rgba(255, 255, 255, 0.95)',
      glassLight: 'rgba(255, 255, 255, 0.1)',
      dark: 'rgba(28, 28, 30, 0.95)',
      transparent: 'transparent',
    },
    text: {
      primary: '#1F2937',
      secondary: '#6B7280',
      tertiary: '#9CA3AF',
      inverse: '#FFFFFF',
      loading: '#9CA3AF',
    },
  },

  // Spacing
  spacing: {
    xs: '4px',
    sm: '8px',
    md: '12px',
    lg: '16px',
    xl: '20px',
    '2xl': '24px',
    '3xl': '32px',
    '4xl': '40px',
    '5xl': '48px',
  },

  // Typography
  typography: {
    fontFamily: {
      system: 'Helvetica, "Helvetica Neue", Arial, sans-serif',
    },
    fontSize: {
      xs: '12px',
      sm: '14px',
      base: '16px',
      lg: '18px',
      xl: '20px',
      '2xl': '24px',
    },
    fontWeight: {
      normal: '400',
      medium: '500',
      semibold: '600',
      bold: '700',
    },
    lineHeight: {
      tight: '1.2',
      normal: '1.5',
      relaxed: '1.7',
    },
  },

  // Border Radius
  borderRadius: {
    sm: '4px',
    md: '8px',
    lg: '12px',
    xl: '16px',
    '2xl': '20px',
    full: '9999px',
  },

  // Shadows
  shadows: {
    sm: '0 2px 4px rgba(0, 0, 0, 0.1)',
    md: '0 4px 12px rgba(0, 0, 0, 0.15)',
    lg: '0 8px 24px rgba(0, 0, 0, 0.2)',
    xl: '0 12px 32px rgba(0, 0, 0, 0.25)',
  },

  // Blur
  blur: {
    sm: 'blur(4px)',
    md: 'blur(8px)',
    lg: 'blur(10px)',
    xl: 'blur(16px)',
  },

  // Transitions
  transitions: {
    fast: 'all 0.1s ease',
    normal: 'all 0.2s ease',
    slow: 'all 0.3s ease',
  },

  // Z-index
  zIndex: {
    modal: 1000,
    overlay: 900,
    dropdown: 800,
    header: 700,
    fixed: 600,
    app: 30,
    controls: 20,
    base: 1,
  },
} as const;

export type Tokens = typeof tokens;
