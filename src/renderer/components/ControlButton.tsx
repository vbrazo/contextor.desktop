import React, { ReactNode } from 'react';
import { styles, getButtonState } from '../design-system/styles';

interface ControlButtonProps {
  onClick: () => void;
  children: ReactNode;
  variant: 'play' | 'screenshot' | 'options' | 'drag' | 'payment';
  isPlaying?: boolean;
  className?: string;
}

export const ControlButton: React.FC<ControlButtonProps> = ({
  onClick,
  children,
  variant,
  isPlaying = false,
  className = 'no-drag',
}) => {
  const isActive = getButtonState(isPlaying, variant);

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent drag when clicking buttons
    onClick();
  };

  return (
    <button
      onClick={handleClick}
      className={className}
      style={styles.button(isActive, variant === 'payment' ? 'payment' : 'secondary')}
    >
      {children}
    </button>
  );
}; 