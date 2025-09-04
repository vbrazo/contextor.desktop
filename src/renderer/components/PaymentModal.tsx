import React from 'react';
import { ModalButton } from './ModalButton';

interface PaymentModalProps {
  onClose: () => void;
  onUpgrade: () => void;
}

export const PaymentModal: React.FC<PaymentModalProps> = ({ onClose, onUpgrade }) => {
  return (
    <div style={{
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.8)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      backdropFilter: 'blur(10px)',
    }}>
      <div style={{
        background: 'black',
        borderRadius: '12px',
        padding: '24px',
        maxWidth: '300px',
        textAlign: 'center',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
      }}>
        <h3 style={{
          margin: '0 0 12px 0',
          fontSize: '18px',
          color: 'white',
          fontWeight: '600',
          fontFamily: 'Helvetica, "Helvetica Neue", Arial, sans-serif',
        }}>
          It's time to upgrade
        </h3>
        <p style={{
          margin: '0 0 20px 0',
          fontSize: '14px',
          color: 'rgba(255, 255, 255, 0.7)',
          lineHeight: '1.4',
          fontFamily: 'Helvetica, "Helvetica Neue", Arial, sans-serif',
        }}>
          You've reached your plan limit. Upgrade your plan to continue and unlock unlimited interviews
        </p>
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          gap: '10px',
        }}>
          <ModalButton onClick={onClose}>
            Got it!
          </ModalButton>
          <ModalButton onClick={onUpgrade}>
            Upgrade Now
          </ModalButton>
        </div>
      </div>
    </div>
  );
}; 