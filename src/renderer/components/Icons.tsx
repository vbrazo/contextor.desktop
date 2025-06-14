import React from 'react';
import { styles } from '../design-system/styles';

export const MicrophoneIcon: React.FC = () => (
  <svg style={styles.icon} viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
    <rect width="20" height="20" fill="none"/>
    <path d="M10 14C11.6569 14 13 12.6569 13 11V6C13 4.34315 11.6569 3 10 3C8.34315 3 7 4.34315 7 6V11C7 12.6569 8.34315 14 10 14Z" stroke="white" strokeWidth="1.5"/>
    <path d="M5 11V11.5C5 14.2614 7.23858 16.5 10 16.5C12.7614 16.5 15 14.2614 15 11.5V11" stroke="white" strokeWidth="1.5"/>
    <path d="M10 16.5V19" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
    <path d="M8 19H12" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
  </svg>
);

export const CameraIcon: React.FC = () => (
  <svg style={styles.icon} viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
    <path d="M17.5 7.5H15.8333L14.1667 5H5.83333L4.16667 7.5H2.5C1.39583 7.5 0.5 8.39583 0.5 9.5V15.5C0.5 16.6042 1.39583 17.5 2.5 17.5H17.5C18.6042 17.5 19.5 16.6042 19.5 15.5V9.5C19.5 8.39583 18.6042 7.5 17.5 7.5Z" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M10 14.1667C11.3807 14.1667 12.5 13.0474 12.5 11.6667C12.5 10.2859 11.3807 9.16667 10 9.16667C8.61929 9.16667 7.5 10.2859 7.5 11.6667C7.5 13.0474 8.61929 14.1667 10 14.1667Z" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

export const CreditCardIcon: React.FC = () => (
  <svg style={styles.icon} viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
    <rect x="2" y="4" width="16" height="12" rx="2" ry="2" stroke="white" strokeWidth="1.5" fill="none"/>
    <path d="M2 8H18" stroke="white" strokeWidth="1.5"/>
    <path d="M4 12H6" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
    <path d="M8 12H12" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
  </svg>
);

export const DragIcon: React.FC = () => (
  <svg style={styles.icon} viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
    <path d="M10 3L7 6H9V9H6L9 12V10H11V13L14 10H12V7H15L12 4V6H10V3Z" stroke="white" strokeWidth="1.5" fill="none"/>
    <path d="M7.5 7.5L12.5 12.5" stroke="white" strokeWidth="1" strokeLinecap="round"/>
    <path d="M12.5 7.5L7.5 12.5" stroke="white" strokeWidth="1" strokeLinecap="round"/>
  </svg>
);

export const OptionsIcon: React.FC = () => (
  <svg style={styles.icon} viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
    <circle cx="10" cy="5" r="1.5" fill="currentColor"/>
    <circle cx="10" cy="10" r="1.5" fill="currentColor"/>
    <circle cx="10" cy="15" r="1.5" fill="currentColor"/>
  </svg>
);

export const CrownIcon: React.FC = () => (
  <svg style={styles.icon} viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
    <path d="M10 3L8 7L4 5L6 10H14L16 5L12 7L10 3Z" stroke="white" strokeWidth="1.5" fill="none"/>
    <path d="M6 10L14 10L13 13H7L6 10Z" stroke="white" strokeWidth="1.5" fill="none"/>
    <circle cx="10" cy="6" r="1" fill="white"/>
    <circle cx="6" cy="8" r="0.5" fill="white"/>
    <circle cx="14" cy="8" r="0.5" fill="white"/>
  </svg>
); 