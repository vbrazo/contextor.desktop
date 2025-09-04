import React, { RefObject } from 'react';
import { CrownIcon, ChatIcon } from './Icons';

interface PlayerBarProps {
  playerBarRef: RefObject<HTMLDivElement>;
  onCrownClick: () => void;
  onChatClick: () => void;
  isUserActionLoading: boolean;
}

export const PlayerBar: React.FC<PlayerBarProps> = ({
  playerBarRef,
  onCrownClick,
  onChatClick,
  isUserActionLoading
}) => {
  return (
    <div
      ref={playerBarRef}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '16px',
        padding: '16px',
        backgroundColor: 'black',
        backdropFilter: 'blur(10px)',
        border: '1px solid black',
        position: 'relative',
      }}
      className="draggable-area"
    >
      <button
        onClick={onCrownClick}
        style={{
          padding: '10px',
          backgroundColor: 'rgba(255, 255, 255, 0.1)',
          color: 'white',
          border: 'none',
          borderRadius: '8px',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '40px',
          height: '40px',
          transition: 'all 0.2s ease',
        }}
        className="no-drag"
      >
        <CrownIcon />
      </button>
      <button
        onClick={onChatClick}
        disabled={isUserActionLoading}
        style={{
          padding: '10px',
          backgroundColor: isUserActionLoading ? 'rgba(255, 255, 255, 0.05)' : 'rgba(255, 255, 255, 0.1)',
          color: 'white',
          border: 'none',
          borderRadius: '8px',
          cursor: isUserActionLoading ? 'not-allowed' : 'pointer',
          opacity: isUserActionLoading ? 0.6 : 1,
          transition: 'all 0.2s ease',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '40px',
          height: '40px',
        }}
        className="no-drag"
      >
        <ChatIcon />
      </button>
    </div>
  );
}; 