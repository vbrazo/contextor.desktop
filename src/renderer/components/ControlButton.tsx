import React, { ReactNode } from 'react';
import { styles, getButtonState } from '../design-system/styles';

interface ControlButtonProps {
  onClick: () => void;
  children: ReactNode;
  variant: 'drag' | 'payment' | 'play' | 'screenshot' | 'options' | 'chat';
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
    e.stopPropagation();
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
