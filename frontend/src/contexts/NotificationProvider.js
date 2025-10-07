import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import useWebSocket from '../hooks/useWebSocket';
import { getWebSocketFullUrl } from '../config';
import { useDataSync } from './DataSyncContext';

const NotificationContext = createContext();

export function NotificationProvider({ children }) {
  const [notifications, setNotifications] = useState([]);
  const [isConnected, setIsConnected] = useState(false);
  const wsUrl = getWebSocketFullUrl();
  const { triggerRefresh } = useDataSync();

  // Handle WebSocket messages and create notifications
  const handleWebSocketMessage = useCallback((message) => {
    if (!message || !message.type) return;

    // Trigger data refresh for all subscribed components
    triggerRefresh('all', message);

    // Create notification based on message type
    let notificationMessage = '';
    let notificationType = 'info';

    switch (message.type) {
      case 'ticket':
        if (message.action === 'create') {
          notificationMessage = 'New ticket created';
          notificationType = 'info';
        } else if (message.action === 'update') {
          notificationMessage = 'Ticket updated';
          notificationType = 'info';
        } else if (message.action === 'delete') {
          notificationMessage = 'Ticket deleted';
          notificationType = 'warning';
        } else if (message.action === 'claimed') {
          notificationMessage = 'Ticket claimed';
          notificationType = 'success';
        } else if (message.action === 'approval') {
          notificationMessage = 'Ticket approval updated';
          notificationType = 'info';
        } else if (message.action === 'checked_in') {
          notificationMessage = 'Field tech checked in';
          notificationType = 'success';
        } else if (message.action === 'checked_out') {
          notificationMessage = 'Field tech checked out';
          notificationType = 'info';
        } else if (message.action === 'costs_updated') {
          notificationMessage = 'Ticket costs updated';
          notificationType = 'info';
        }
        break;

      case 'comment':
        if (message.action === 'create') {
          notificationMessage = 'New comment added';
          notificationType = 'info';
        } else if (message.action === 'update') {
          notificationMessage = 'Comment updated';
          notificationType = 'info';
        } else if (message.action === 'delete') {
          notificationMessage = 'Comment deleted';
          notificationType = 'warning';
        }
        break;

      case 'time_entry':
        if (message.action === 'create') {
          notificationMessage = 'Time entry logged';
          notificationType = 'info';
        } else if (message.action === 'update') {
          notificationMessage = 'Time entry updated';
          notificationType = 'info';
        } else if (message.action === 'delete') {
          notificationMessage = 'Time entry deleted';
          notificationType = 'warning';
        }
        break;

      case 'shipment':
        if (message.action === 'create') {
          notificationMessage = 'New shipment created';
          notificationType = 'info';
        }
        break;

      case 'site':
        if (message.action === 'create') {
          notificationMessage = 'New site added';
          notificationType = 'success';
        }
        break;

      case 'fieldTech':
        if (message.action === 'create') {
          notificationMessage = 'New field tech added';
          notificationType = 'success';
        }
        break;

      case 'task':
        if (message.action === 'create') {
          notificationMessage = 'New task created';
          notificationType = 'info';
        }
        break;

      case 'equipment':
        if (message.action === 'create') {
          notificationMessage = 'New equipment added';
          notificationType = 'success';
        }
        break;

      case 'sla_rule':
        if (message.action === 'create') {
          notificationMessage = 'New SLA rule created';
          notificationType = 'info';
        }
        break;

      case 'site_equipment':
        if (message.action === 'create') {
          notificationMessage = 'Equipment added to site';
          notificationType = 'success';
        }
        break;

      case 'attachment':
        if (message.action === 'uploaded') {
          notificationMessage = 'File attachment uploaded';
          notificationType = 'info';
        } else if (message.action === 'updated') {
          notificationMessage = 'File attachment updated';
          notificationType = 'info';
        } else if (message.action === 'deleted') {
          notificationMessage = 'File attachment deleted';
          notificationType = 'warning';
        }
        break;

      default:
        return; // Don't create notification for unknown types
    }

    if (notificationMessage) {
      const newNotification = {
        id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        message: notificationMessage,
        type: notificationType,
        read: false,
        timestamp: new Date()
      };

      setNotifications(prev => {
        // Check for duplicate messages in the last 5 seconds
        const recentTime = new Date(Date.now() - 5000);
        const isDuplicate = prev.some(notif => 
          notif.message === notificationMessage && 
          notif.timestamp > recentTime
        );
        
        if (isDuplicate) {
          console.log('Duplicate notification prevented:', notificationMessage);
          return prev; // Don't add duplicate
        }
        
        return [newNotification, ...prev].slice(0, 50); // Keep last 50
      });
    }
  }, [triggerRefresh]);

  // Connect to WebSocket for global notifications and data sync
  useWebSocket(
    wsUrl,
    handleWebSocketMessage,
    (error) => {
      console.error('Global WebSocket error:', error);
      setIsConnected(false);
    },
    () => {
      console.log('Global WebSocket connected');
      setIsConnected(true);
    },
    () => {
      console.log('Global WebSocket disconnected');
      setIsConnected(false);
    }
  );

  const markAsRead = useCallback((notificationId) => {
    setNotifications(prev =>
      prev.map(notif =>
        notif.id === notificationId ? { ...notif, read: true } : notif
      )
    );
  }, []);

  const markAllAsRead = useCallback(() => {
    setNotifications(prev =>
      prev.map(notif => ({ ...notif, read: true }))
    );
  }, []);

  const clearAll = useCallback(() => {
    setNotifications([]);
  }, []);

  const clearNotification = useCallback((notificationId) => {
    setNotifications(prev => prev.filter(notif => notif.id !== notificationId));
  }, []);

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        isConnected,
        markAsRead,
        markAllAsRead,
        clearAll,
        clearNotification
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within NotificationProvider');
  }
  return context;
}

