import { CSSProperties } from 'react';
import { tokens } from './tokens';

// Style generator functions
export const createGlassStyle = (opacity = 0.95): CSSProperties => ({
  background: `rgba(255, 255, 255, ${opacity})`,
  backdropFilter: 'blur(20px)',
  WebkitBackdropFilter: 'blur(20px)',
  boxShadow: '0 8px 32px rgba(0, 0, 0, 0.08)',
  border: '1px solid rgba(255, 255, 255, 0.2)',
});

// Hover effect classes
export const hoverEffects = {
  messageHover: {
    transform: 'translateY(-1px)',
  },
  buttonHover: {
    transform: 'translateY(-1px)',
  },
  playerBarHover: {
    transform: 'translateY(-4px) scale(1.02)',
  },
} as const;

// Component style presets
export const styles = {
  // Layout
  container: {
    position: 'absolute' as const,
    top: 0,
    left: 0,
    width: '400px',
    height: 'auto',
    display: 'flex' as const,
    flexDirection: 'row' as const,
    background: 'transparent',
    pointerEvents: 'none' as const,
  },

  floatingContainer: {
    position: 'relative',
    zIndex: tokens.zIndex.app,
    cursor: 'move',
    userSelect: 'none',
    WebkitUserSelect: 'none',
    display: 'flex',
    flexDirection: 'column',
    pointerEvents: 'auto',
    width: '400px',
    height: 'auto',
    transition: 'transform 0.2s ease-in-out',
  } as CSSProperties,

  // Insights Panel
  insightsPanel: {
    ...createGlassStyle(0.98),
    width: '400px',
    padding: 0,
    height: '400px',
    borderTopLeftRadius: '24px',
    borderTopRightRadius: '24px',
    boxSizing: 'border-box' as const,
    userSelect: 'none',
    display: 'flex',
    flexDirection: 'column',
    position: 'relative' as const,
    overflow: 'hidden',
    backgroundColor: 'rgba(248, 250, 252, 0.98)',
    cursor: 'grab',
    transition: 'all 0.2s ease-in-out',
  },

  // Chat Messages Container
  messagesContainer: {
    flex: 1,
    overflowY: 'auto',
    overflowX: 'hidden',
    padding: tokens.spacing.md,
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacing.md,
    backgroundColor: 'rgba(248, 250, 252, 1)',
    scrollbarWidth: 'thin',
    '&::-webkit-scrollbar': {
      width: '6px',
    },
    '&::-webkit-scrollbar-thumb': {
      backgroundColor: 'rgba(0, 0, 0, 0.2)',
      borderRadius: '3px',
    },
  } as CSSProperties,

  // Message Bubbles
  messageUser: {
    alignSelf: 'flex-end',
    maxWidth: '80%',
    padding: `${tokens.spacing.md} ${tokens.spacing.lg}`,
    background: 'linear-gradient(135deg, #007AFF, #0055FF)',
    color: 'white',
    borderRadius: '20px 20px 4px 20px',
    fontSize: tokens.typography.fontSize.sm,
    lineHeight: tokens.typography.lineHeight.normal,
    wordWrap: 'break-word',
    boxShadow: '0 2px 8px rgba(0, 122, 255, 0.2)',
    transition: 'transform 0.2s ease-in-out',
  } as CSSProperties,

  messageAssistant: {
    alignSelf: 'flex-start',
    maxWidth: '80%',
    padding: `${tokens.spacing.md} ${tokens.spacing.lg}`,
    background: 'rgba(255, 255, 255, 0.95)',
    color: tokens.colors.text.primary,
    borderRadius: '20px 20px 20px 4px',
    fontSize: tokens.typography.fontSize.sm,
    lineHeight: tokens.typography.lineHeight.normal,
    wordWrap: 'break-word',
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.05)',
    border: '1px solid rgba(0, 0, 0, 0.06)',
    transition: 'transform 0.2s ease-in-out',
  } as CSSProperties,

  messageScreenshot: {
    alignSelf: 'flex-start',
    maxWidth: '90%',
    padding: 0,
    background: 'rgba(255, 255, 255, 0.95)',
    borderRadius: '16px',
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.08)',
    border: '1px solid rgba(0, 0, 0, 0.06)',
    overflow: 'hidden',
    transition: 'transform 0.2s ease-in-out',
  } as CSSProperties,

  // Chat Input Area
  chatInputContainer: {
    padding: tokens.spacing.md,
    borderTop: '1px solid rgba(0, 0, 0, 0.06)',
    background: 'rgba(255, 255, 255, 0.98)',
    display: 'flex',
    gap: tokens.spacing.sm,
    alignItems: 'flex-end',
    backdropFilter: 'blur(10px)',
    WebkitBackdropFilter: 'blur(10px)',
  } as CSSProperties,

  chatInput: {
    flex: 1,
    padding: `${tokens.spacing.sm} ${tokens.spacing.md}`,
    borderRadius: '20px',
    border: '1px solid rgba(0, 0, 0, 0.1)',
    fontSize: tokens.typography.fontSize.sm,
    fontFamily: tokens.typography.fontFamily.system,
    outline: 'none',
    resize: 'none' as const,
    height: '40px',
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    transition: 'all 0.2s ease-in-out',
    '&:focus': {
      borderColor: '#007AFF',
      boxShadow: '0 0 0 2px rgba(0, 122, 255, 0.1)',
    },
  } as CSSProperties,

  sendButton: (disabled: boolean): CSSProperties => ({
    padding: `${tokens.spacing.sm} ${tokens.spacing.lg}`,
    borderRadius: '20px',
    border: 'none',
    background: disabled ? 'rgba(0, 0, 0, 0.1)' : 'linear-gradient(135deg, #007AFF, #0055FF)',
    color: 'white',
    cursor: disabled ? 'not-allowed' : 'pointer',
    fontSize: tokens.typography.fontSize.sm,
    fontWeight: tokens.typography.fontWeight.medium,
    transition: 'all 0.2s ease-in-out',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: '60px',
    height: '40px',
    fontFamily: tokens.typography.fontFamily.system,
    boxShadow: disabled ? 'none' : '0 2px 8px rgba(0, 122, 255, 0.2)',
  }),

  loadingText: {
    fontSize: tokens.typography.fontSize.sm,
    color: tokens.colors.text.loading,
    textAlign: 'center' as const,
    padding: tokens.spacing.xl,
  },

  // Legacy styles for backward compatibility
  insightsText: {
    whiteSpace: 'pre-line' as const,
    fontSize: tokens.typography.fontSize.sm,
    color: tokens.colors.text.primary,
    marginTop: 0,
    lineHeight: tokens.typography.lineHeight.normal,
    fontFamily: tokens.typography.fontFamily.system,
    overflowY: 'auto',
    overflowX: 'hidden',
    flex: 1,
    padding: tokens.spacing.sm,
    height: '100%',
    position: 'relative' as const,
    cursor: 'auto',
    backgroundColor: 'rgba(248, 250, 252, 1)',
  },

  // Player Bar
  playerBarWrapper: {
    width: '100%',
    display: 'flex',
    justifyContent: 'center',
    position: 'absolute',
    left: 0,
    bottom: 0,
    pointerEvents: 'none',
  },

  playerBar: (isHovered: boolean): CSSProperties => ({
    background: 'rgba(0, 0, 0, 0.8)',
    backdropFilter: 'blur(20px)',
    WebkitBackdropFilter: 'blur(20px)',
    borderBottomLeftRadius: '24px',
    borderBottomRightRadius: '24px',
    boxShadow: '0 -4px 24px rgba(0, 0, 0, 0.2)',
    width: '240px',
    height: '64px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '0',
    boxSizing: 'border-box',
    fontFamily: tokens.typography.fontFamily.system,
    zIndex: tokens.zIndex.controls,
    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
    transform: isHovered ? 'translateY(-4px) scale(1.02)' : 'translateY(0) scale(1)',
    cursor: 'default',
    pointerEvents: 'auto',
    border: '1px solid rgba(255, 255, 255, 0.1)',
  }),

  controlsContainer: {
    display: 'flex' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    gap: tokens.spacing.lg,
    flex: 0,
    height: 'auto',
    width: 'auto',
  },

  // Buttons
  button: (isActive: boolean, variant: 'primary' | 'secondary' | 'payment' = 'secondary'): CSSProperties => ({
    padding: `${tokens.spacing.xs} ${tokens.spacing.md}`,
    borderRadius: '20px',
    border: 'none',
    background: variant === 'payment' 
      ? 'linear-gradient(135deg, #FF6B35, #FF8F35)'
      : isActive 
        ? 'linear-gradient(135deg, #007AFF, #0055FF)'
        : 'rgba(0, 0, 0, 0.1)',
    color: tokens.colors.text.inverse,
    cursor: 'pointer',
    minWidth: '40px',
    fontSize: tokens.typography.fontSize.sm,
    fontWeight: tokens.typography.fontWeight.medium,
    transition: 'all 0.2s ease-in-out',
    boxShadow: variant === 'payment' 
      ? '0 4px 16px rgba(255, 107, 53, 0.4)'
      : isActive 
        ? '0 4px 12px rgba(0, 122, 255, 0.3)'
        : 'none',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontFamily: tokens.typography.fontFamily.system,
    animation: variant === 'payment' ? 'pulse 2s infinite' : 'none',
  }),

  // Icons
  icon: {
    width: '20px',
    height: '20px',
    fill: 'none',
    transition: 'transform 0.2s ease-in-out',
  },
} as const;

// Utility functions
export const getButtonState = (isPlaying: boolean, variant: 'play' | 'screenshot' | 'options' | 'drag' | 'payment') => {
  switch (variant) {
    case 'play':
      return isPlaying;
    case 'drag':
      return isPlaying; // For drag toggle, isPlaying represents showDragCursor
    case 'payment':
      return true; // Payment button is always highlighted until payment is confirmed
    case 'screenshot':
    case 'options':
    default:
      return false;
  }
}; 