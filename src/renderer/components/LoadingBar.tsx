import React from 'react';

interface LoadingBarProps {
  isLoading: boolean;
  message: string;
}

export const LoadingBar: React.FC<LoadingBarProps> = ({ isLoading, message }) => {
  if (!isLoading) return null;
  
  return (
    <>
      {/* Centered loading indicator */}
      <div style={{
        position: 'absolute',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        backgroundColor: 'rgba(0, 0, 0, 0.9)',
        borderRadius: '12px',
        padding: '20px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '12px',
        color: 'white',
        backdropFilter: 'blur(10px)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        zIndex: 1000,
        minWidth: '120px',
        textAlign: 'center',
        fontFamily: 'Helvetica, "Helvetica Neue", Arial, sans-serif',
      }}>
        <div style={{
          width: '24px',
          height: '24px',
          borderTop: '3px solid #007AFF',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite',
        }} />
        <span style={{ fontSize: '12px' }}>{message}</span>
      </div>

      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </>
  );
}; 