import React, { createContext, useContext, useState, useCallback } from 'react';

const DataSyncContext = createContext();

/**
 * Global Data Synchronization Context
 * 
 * Provides real-time data updates across the entire application
 * All components can subscribe to data changes and auto-refresh
 * 
 * NOTE: WebSocket connection is managed by NotificationProvider
 * This context only manages update triggers
 */
export function DataSyncProvider({ children }) {
  const [updateTriggers, setUpdateTriggers] = useState({
    tickets: 0,
    sites: 0,
    shipments: 0,
    users: 0,
    fieldTechs: 0,
    inventory: 0,
    comments: 0,
    timeEntries: 0,
    all: 0
  });

  // Trigger a manual refresh for specific data type
  const triggerRefresh = useCallback((dataType = 'all', message = null) => {
    setUpdateTriggers(prev => {
      const updated = { ...prev, all: prev.all + 1 };

      // If message provided, update based on type
      if (message && message.type) {
        switch (message.type) {
          case 'ticket':
            updated.tickets = prev.tickets + 1;
            break;
          case 'site':
            updated.sites = prev.sites + 1;
            break;
          case 'shipment':
            updated.shipments = prev.shipments + 1;
            break;
          case 'user':
            updated.users = prev.users + 1;
            break;
          case 'field_tech':
            updated.fieldTechs = prev.fieldTechs + 1;
            break;
          case 'inventory':
            updated.inventory = prev.inventory + 1;
            break;
          case 'comment':
            updated.comments = prev.comments + 1;
            updated.tickets = prev.tickets + 1; // Also refresh tickets
            break;
          case 'time_entry':
            updated.timeEntries = prev.timeEntries + 1;
            updated.tickets = prev.tickets + 1; // Also refresh tickets
            break;
          case 'attachment':
            updated.tickets = prev.tickets + 1;
            break;
          default:
            break;
        }
      } else {
        // Manual trigger for specific data type
        updated[dataType] = prev[dataType] + 1;
      }

      return updated;
    });
  }, []);

  return (
    <DataSyncContext.Provider value={{ updateTriggers, triggerRefresh }}>
      {children}
    </DataSyncContext.Provider>
  );
}

export function useDataSync(dataType = 'all') {
  const context = useContext(DataSyncContext);
  if (!context) {
    throw new Error('useDataSync must be used within DataSyncProvider');
  }

  // Return the trigger count for the specific data type or 'all'
  return {
    updateTrigger: context.updateTriggers[dataType] || context.updateTriggers.all,
    triggerRefresh: context.triggerRefresh,
    allTriggers: context.updateTriggers
  };
}

