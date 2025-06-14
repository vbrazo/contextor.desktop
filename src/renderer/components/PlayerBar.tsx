import React, { forwardRef } from 'react';
import { styles } from '../design-system/styles';
import { ControlButton } from './ControlButton';
import { MicrophoneIcon, CameraIcon, CreditCardIcon, CrownIcon } from './Icons';

interface PlayerBarProps {
  isHovered: boolean;
  isPlaying: boolean;
  isPaid: boolean;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
  onPlayClick: () => void;
  onScreenshotClick: () => void;
  onOptionsClick: () => void;
  onPayClick: () => void;
  onCrownClick: () => void;
}

export const PlayerBar = forwardRef<HTMLDivElement, PlayerBarProps>(
  ({ 
    isHovered, 
    isPlaying, 
    isPaid,
    onMouseEnter, 
    onMouseLeave, 
    onPlayClick, 
    onScreenshotClick,
    onOptionsClick,
    onPayClick,
    onCrownClick
  }, ref) => {
    return (
      <div
        ref={ref}
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
        style={styles.playerBar(isHovered)}
        className="draggable-area"
      > 
        <div style={styles.controlsContainer} className="no-drag">
          {!isPaid ? (
            <ControlButton 
              onClick={onPayClick} 
              variant="payment" 
              isPlaying={isPlaying}
            >
              <CreditCardIcon />
            </ControlButton>
          ) : (
            <ControlButton 
              onClick={onCrownClick} 
              variant="options" 
              isPlaying={isPlaying}
            >
              <CrownIcon />
            </ControlButton>
          )}
          {/* <ControlButton 
            onClick={onPlayClick} 
            variant="play" 
            isPlaying={isPlaying}
          >
            <MicrophoneIcon />
          </ControlButton> */}
          <ControlButton 
            onClick={onScreenshotClick} 
            variant="screenshot" 
            isPlaying={isPlaying}
          >
            <CameraIcon />
          </ControlButton>
        </div>
      </div>
    );
  }
); 