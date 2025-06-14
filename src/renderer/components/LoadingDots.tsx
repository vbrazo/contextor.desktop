import React from 'react';

export const LoadingDots: React.FC = () => (
  <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
    <div style={{
      width: '6px',
      height: '6px',
      borderRadius: '50%',
      backgroundColor: 'currentColor',
      animation: 'pulse 1.4s ease-in-out infinite both',
      animationDelay: '0s'
    }} />
    <div style={{
      width: '6px',
      height: '6px',
      borderRadius: '50%',
      backgroundColor: 'currentColor',
      animation: 'pulse 1.4s ease-in-out infinite both',
      animationDelay: '0.2s'
    }} />
    <div style={{
      width: '6px',
      height: '6px',
      borderRadius: '50%',
      backgroundColor: 'currentColor',
      animation: 'pulse 1.4s ease-in-out infinite both',
      animationDelay: '0.4s'
    }} />
  </div>
); 