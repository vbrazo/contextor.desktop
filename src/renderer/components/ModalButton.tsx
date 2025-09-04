import React, { ButtonHTMLAttributes } from 'react';

interface ModalButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
}

export const ModalButton: React.FC<ModalButtonProps> = ({ children, style, ...props }) => (
  <button
    {...props}
    style={{
      padding: '10px 24px',
      borderRadius: '8px',
      border: 'none',
      backgroundColor: 'white',
      color: 'black',
      fontSize: '14px',
      fontWeight: 500,
      cursor: 'pointer',
      transition: 'all 0.2s ease',
      fontFamily: 'Helvetica, "Helvetica Neue", Arial, sans-serif',
      ...(style || {}),
    }}
    onMouseEnter={e => {
      e.currentTarget.style.opacity = '0.8';
      if (props.onMouseEnter) props.onMouseEnter(e);
    }}
    onMouseLeave={e => {
      e.currentTarget.style.opacity = '1';
      if (props.onMouseLeave) props.onMouseLeave(e);
    }}
  >
    {children}
  </button>
); 