import React, { useEffect } from 'react';

export interface NotificationProps {
  type: 'success' | 'error';
  title: string;
  message: string;
  onClose: () => void;
  duration?: number;
}

const Notification: React.FC<NotificationProps> = ({
  type,
  title,
  message,
  onClose,
  duration = 4000
}) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, duration);

    return () => clearTimeout(timer);
  }, [duration, onClose]);

  const icon = type === 'success' ? (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12"></polyline>
    </svg>
  ) : (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18"></line>
      <line x1="6" y1="6" x2="18" y2="18"></line>
    </svg>
  );

  return (
    <div className={`${type}-notification`}>
      <div className={`${type}-icon`}>
        {icon}
      </div>
      <div className="success-content">
        <div className="success-title">{title}</div>
        <div className="success-message">{message}</div>
      </div>
    </div>
  );
};

export default Notification; 