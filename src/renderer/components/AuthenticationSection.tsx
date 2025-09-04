import React from 'react';
import { ModalButton } from './ModalButton';

interface AuthenticationSectionProps {
  onLoginClick: () => void;
  onRegisterClick: () => void;
}

export const AuthenticationSection: React.FC<AuthenticationSectionProps> = ({
  onLoginClick,
  onRegisterClick
}) => {
  return (
    <div style={{
      flex: 1,
      display: 'flex',
      gap: '16px',
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '16px',
      textAlign: 'center',
      color: 'white',
      backdropFilter: 'blur(10px)',
      border: '1px solid rgba(255, 255, 255, 0.1)',
      backgroundColor: 'black'
    }}>
      <ModalButton
        onClick={onLoginClick}
        style={{
          color: 'black',
          fontWeight: 500,
          fontSize: '14px',
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.2)',
          padding: '8px 16px',
        }}
        onMouseEnter={e => {
          e.currentTarget.style.transform = 'translateY(-1px)';
          e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.3)';
        }}
        onMouseLeave={e => {
          e.currentTarget.style.transform = 'translateY(0)';
          e.currentTarget.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.2)';
        }}
      >
        Login
      </ModalButton>
      <ModalButton
        onClick={onRegisterClick}
        style={{
          color: 'black',
          fontWeight: 500,
          fontSize: '14px',
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.2)',
          padding: '8px 16px',
        }}
        onMouseEnter={e => {
          e.currentTarget.style.transform = 'translateY(-1px)';
          e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.3)';
        }}
        onMouseLeave={e => {
          e.currentTarget.style.transform = 'translateY(0)';
          e.currentTarget.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.2)';
        }}
      >
        Register
      </ModalButton>
    </div>
  );
};