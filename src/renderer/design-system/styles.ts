import { CSSProperties } from 'react';
import { tokens } from './tokens';

// Types
type ButtonVariant = 'primary' | 'secondary' | 'payment';
type ControlButtonVariant = 'play' | 'screenshot' | 'options' | 'drag' | 'payment' | 'chat';
type MessageType = 'user' | 'assistant' | 'screenshot';

// Utility Functions
export const createGlassStyle = (opacity = 0.95): CSSProperties => ({
  background: `rgba(255, 255, 255, ${opacity})`,
  backdropFilter: 'blur(20px)',
  WebkitBackdropFilter: 'blur(20px)',
  boxShadow: '0 8px 32px rgba(0, 0, 0, 0.08)',
  border: '1px solid rgba(255, 255, 255, 0.2)',
});

export const getButtonState = (isPlaying: boolean, variant: ControlButtonVariant): boolean => {
  switch (variant) {
    case 'play':
      return isPlaying;
    case 'drag':
      return isPlaying; // For drag toggle, isPlaying represents showDragCursor
    case 'payment':
      return true; // Payment button is always highlighted until payment is confirmed
    case 'chat':
      return isPlaying; // For chat toggle, isPlaying represents isChat
    case 'screenshot':
    case 'options':
    default:
      return false;
  }
};

// Animation Effects
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

// Component Style Presets
export const styles = {
  // Layout Components
  container: {
    position: 'absolute' as const,
    top: 0,
    left: 0,
    display: 'flex' as const,
    flexDirection: 'row' as const,
    background: 'transparent',
    pointerEvents: 'none' as const,
    overflow: 'hidden',
    maxHeight: '100vh',
    width: '100%',
    maxWidth: '100vw',
    height: '100%',
  },

  floatingContainer: {
    position: 'relative',
    zIndex: tokens.zIndex.app,
    cursor: 'move',
    width: '100%',
    userSelect: 'none',
    WebkitUserSelect: 'none',
    display: 'flex',
    flexDirection: 'column',
    pointerEvents: 'auto',
    height: 'auto',
    transition: 'transform 0.2s ease-in-out',
    overflow: 'hidden',
    backgroundColor: 'black',
    maxWidth: '100%',
    maxHeight: '100vh',
  } as CSSProperties,

  // Chat Components
  insightsPanel: {
    ...createGlassStyle(0.98),
    padding: '5px',
    height: '400px',
    borderTopLeftRadius: '0px',
    borderTopRightRadius: '0px',
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

  messagesContainer: {
    flex: 1,
    overflowY: 'scroll',
    width: '100%',
    overflowX: 'hidden',
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacing.md,
    backgroundColor: 'rgba(248, 250, 252, 1)',
    scrollbarWidth: 'thin',
    height: 'calc(100% - 60px)', // Subtract input container height
    '&::-webkit-scrollbar': {
      width: '6px',
    },
    '&::-webkit-scrollbar-thumb': {
      backgroundColor: 'rgba(0, 0, 0, 0.2)',
      borderRadius: '3px',
    },
    '&::-webkit-scrollbar-track': {
      backgroundColor: 'transparent',
    },
  } as CSSProperties,

  // Message Styles
  messageUser: {
    alignSelf: 'flex-end',
    maxWidth: '75%',
    padding: '5px',
    background: 'linear-gradient(135deg, #DCF8C6 0%, #B9F5A7 100%)',
    color: '#222',
    borderRadius: '16px 16px 4px 16px',
    fontSize: tokens.typography.fontSize.sm,
    lineHeight: tokens.typography.lineHeight.normal,
    wordWrap: 'break-word',
    boxShadow: '0 1px 2px rgba(0,0,0,0.08)',
    border: '1px solid #e2e2e2',
    transition: 'transform 0.2s ease-in-out',
  } as CSSProperties,

  messageAssistant: {
    alignSelf: 'flex-start',
    maxWidth: '75%',
    padding: '5px 5px',
    background: 'linear-gradient(135deg, #fff 80%, #f0f0f0 100%)',
    color: tokens.colors.text.primary,
    borderRadius: '16px 16px 16px 4px',
    fontSize: tokens.typography.fontSize.sm,
    lineHeight: tokens.typography.lineHeight.normal,
    wordWrap: 'break-word',
    boxShadow: '0 1px 2px rgba(0,0,0,0.06)',
    marginBottom: '2px',
    border: '1px solid #e2e2e2',
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

  cameraButton: {
    padding: '10px',
    backgroundColor: '#000000',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    opacity: 1,
    transition: 'all 0.2s ease',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '40px',
    height: '40px',
  } as CSSProperties,

  // Input Components
  chatInputContainer: {
    width: '100%',
    padding: '5px',
    borderTop: '1px solid rgba(0, 0, 0, 0.06)',
    background: 'rgba(255, 255, 255, 0.98)',
    display: 'flex',
    gap: '4px',
    alignItems: 'center',
    backdropFilter: 'blur(10px)',
    WebkitBackdropFilter: 'blur(10px)',
    height: '50px', // Fixed height for input container
    flexShrink: 0, // Prevent input container from shrinking
  } as CSSProperties,

  chatInput: {
    flex: 1,
    padding: `5px`,
    borderRadius: '20px',
    border: '1px solid rgba(0, 0, 0, 0.1)',
    fontSize: tokens.typography.fontSize.sm,
    fontFamily: 'Helvetica, "Helvetica Neue", Arial, sans-serif',
    outline: 'none',
    resize: 'none' as const,
    height: '22px',
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    transition: 'all 0.2s ease-in-out',
    '&:focus': {
      borderColor: '#007AFF',
      boxShadow: '0 0 0 2px rgba(0, 122, 255, 0.1)',
    },
  } as CSSProperties,

  sendButton: (disabled: boolean): CSSProperties => ({
    margin: '5px',
    borderRadius: '20px',
    border: 'none',
    background: disabled ? 'rgba(0, 0, 0, 0.1)' : '#000000',
    color: 'white',
    cursor: disabled ? 'not-allowed' : 'pointer',
    fontSize: tokens.typography.fontSize.sm,
    fontWeight: tokens.typography.fontWeight.medium,
    transition: 'all 0.2s ease-in-out',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: '50px',
    height: '40px',
    fontFamily: 'Helvetica, "Helvetica Neue", Arial, sans-serif',
    boxShadow: disabled ? 'none' : '0 2px 8px #000000',
  }),

  // Player Bar Components
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
    borderBottomLeftRadius: '0px',
    borderBottomRightRadius: '0px',
    boxShadow: '0 -4px 24px rgba(0, 0, 0, 0.2)',
    height: '64px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '0',
    boxSizing: 'border-box',
    fontFamily: 'Helvetica, "Helvetica Neue", Arial, sans-serif',
    zIndex: tokens.zIndex.controls,
    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
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

  // Button Components
  button: (isActive: boolean, variant: ButtonVariant = 'secondary'): CSSProperties => ({
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
    fontFamily: 'Helvetica, "Helvetica Neue", Arial, sans-serif',
    animation: variant === 'payment' ? 'pulse 2s infinite' : 'none',
  }),

  // Icon Components
  icon: {
    width: '20px',
    height: '20px',
    fill: 'none',
    transition: 'transform 0.2s ease-in-out',
  },

  // Audio Recorder Styles
  errorBanner: {
    background: 'linear-gradient(135deg, #ff6b6b 0%, #ee5a52 100%)',
    color: 'white',
    padding: '8px 12px',
    borderRadius: '8px',
    marginBottom: '8px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    fontSize: tokens.typography.fontSize.sm,
    boxShadow: '0 2px 8px rgba(255, 107, 107, 0.3)',
  } as CSSProperties,

  errorDismissButton: {
    background: 'none',
    border: 'none',
    color: 'white',
    fontSize: '18px',
    cursor: 'pointer',
    padding: '0 4px',
    borderRadius: '4px',
    transition: 'background-color 0.2s ease',
    ':hover': {
      backgroundColor: 'rgba(255, 255, 255, 0.2)',
    },
  } as CSSProperties,

  recordingStatus: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '8px 12px',
    background: 'rgba(255, 255, 255, 0.95)',
    borderRadius: '8px',
    marginBottom: '8px',
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
  } as CSSProperties,

  recordingIndicator: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    color: '#e74c3c',
    fontWeight: 'bold',
    fontSize: tokens.typography.fontSize.sm,
  } as CSSProperties,

  pulseDot: {
    width: '8px',
    height: '8px',
    borderRadius: '50%',
    backgroundColor: '#e74c3c',
    animation: 'pulse 1.5s ease-in-out infinite',
  } as CSSProperties,

  recordingDuration: {
    fontFamily: 'monospace',
    fontSize: tokens.typography.fontSize.sm,
    color: '#666',
    fontWeight: 'bold',
  } as CSSProperties,

  audioSources: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
    marginBottom: '12px',
  } as CSSProperties,

  sourceStatus: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '4px 8px',
    background: 'rgba(255, 255, 255, 0.8)',
    borderRadius: '6px',
    fontSize: tokens.typography.fontSize.xs,
  } as CSSProperties,

  recordButton: {
    background: 'linear-gradient(135deg, #4CAF50 0%, #45a049 100%)',
    color: 'white',
    border: 'none',
    borderRadius: '12px',
    padding: '12px 20px',
    cursor: 'pointer',
    fontSize: tokens.typography.fontSize.sm,
    fontWeight: 'bold',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    transition: 'all 0.2s ease-in-out',
    boxShadow: '0 4px 12px rgba(76, 175, 80, 0.3)',
    width: '100%',
    justifyContent: 'center',
  } as CSSProperties,

  recordButtonRecording: {
    background: 'linear-gradient(135deg, #e74c3c 0%, #c0392b 100%)',
    boxShadow: '0 4px 12px rgba(231, 76, 60, 0.3)',
    transform: 'scale(1.02)',
  } as CSSProperties,

  recordButtonDisabled: {
    background: '#ccc',
    cursor: 'not-allowed',
    boxShadow: 'none',
    opacity: 0.6,
  } as CSSProperties,

  stopIcon: {
    width: '16px',
    height: '16px',
    backgroundColor: 'white',
    borderRadius: '2px',
  } as CSSProperties,

  micIcon: {
    fontSize: '16px',
  } as CSSProperties,

  instructions: {
    marginTop: '12px',
    padding: '8px 12px',
    background: 'rgba(255, 255, 255, 0.9)',
    borderRadius: '8px',
    fontSize: tokens.typography.fontSize.xs,
    color: '#666',
    lineHeight: '1.4',
  } as CSSProperties,
} as const;
