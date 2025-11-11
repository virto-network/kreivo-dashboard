import { useState, useCallback } from 'react';

export interface NotificationData {
  id: string;
  type: 'success' | 'error';
  title: string;
  message: string;
}

const formatErrorMessage = (error: any): string => {
  if (typeof error === 'string') {
    return error;
  }
  
  if (typeof error === 'object' && error !== null) {
    if (error.type && error.value && typeof error.value === 'object' && error.value.type) {
      return `Error Type: ${error.type}, Value Type: ${error.value.type}`;
    }
    
    if (error.type && error.value && error.value.type) {
      return `Error Type: ${error.type}, Value Type: ${error.value.type}`;
    }
    
    if (error.message) {
      return error.message;
    }
    
    if (error.error) {
      return formatErrorMessage(error.error);
    }
    
    // Fallback: convert to string
    try {
      return JSON.stringify(error);
    } catch {
      return 'Unknown error occurred';
    }
  }
  
  return String(error);
};

export const useNotification = () => {
  const [notifications, setNotifications] = useState<NotificationData[]>([]);

  const showNotification = useCallback((type: 'success' | 'error', title: string, message: string | any) => {
    const id = Date.now().toString();
    const formattedMessage = type === 'error' ? formatErrorMessage(message) : String(message);
    
    const newNotification: NotificationData = {
      id,
      type,
      title,
      message: formattedMessage
    };

    setNotifications(prev => [...prev, newNotification]);
  }, []);

  const removeNotification = useCallback((id: string) => {
    setNotifications(prev => prev.filter(notification => notification.id !== id));
  }, []);

  const showSuccessNotification = useCallback((title: string, message: string) => {
    showNotification('success', title, message);
  }, [showNotification]);

  const showErrorNotification = useCallback((title: string, message: string | any) => {
    showNotification('error', title, message);
  }, [showNotification]);

  return {
    notifications,
    showSuccessNotification,
    showErrorNotification,
    removeNotification
  };
}; 