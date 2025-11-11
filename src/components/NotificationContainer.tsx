import React from 'react';
import Notification from './Notification';
import { NotificationData } from '../hooks/useNotification';

interface NotificationContainerProps {
  notifications: NotificationData[];
  onRemoveNotification: (id: string) => void;
}

const NotificationContainer: React.FC<NotificationContainerProps> = ({
  notifications,
  onRemoveNotification
}) => {
  return (
    <div className="notification-container">
      {notifications.map((notification, index) => (
        <div
          key={notification.id}
          style={{
            transform: `translateY(${index * 10}px)`,
            zIndex: 10000 - index
          }}
        >
          <Notification
            type={notification.type}
            title={notification.title}
            message={notification.message}
            onClose={() => onRemoveNotification(notification.id)}
          />
        </div>
      ))}
    </div>
  );
};

export default NotificationContainer; 