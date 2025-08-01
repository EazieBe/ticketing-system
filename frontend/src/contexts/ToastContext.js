import React, { createContext, useContext, useState, useCallback } from 'react';
import Toast from '../components/Toast';

const ToastContext = createContext();

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};

export const ToastProvider = ({ children }) => {
  const [toast, setToast] = useState({
    open: false,
    message: '',
    severity: 'info',
    autoHideDuration: 6000
  });

  const showToast = useCallback((message, severity = 'info', autoHideDuration = 6000) => {
    setToast({
      open: true,
      message,
      severity,
      autoHideDuration
    });
  }, []);

  const hideToast = useCallback(() => {
    setToast(prev => ({ ...prev, open: false }));
  }, []);

  const success = useCallback((message, autoHideDuration) => {
    showToast(message, 'success', autoHideDuration);
  }, [showToast]);

  const error = useCallback((message, autoHideDuration) => {
    showToast(message, 'error', autoHideDuration);
  }, [showToast]);

  const warning = useCallback((message, autoHideDuration) => {
    showToast(message, 'warning', autoHideDuration);
  }, [showToast]);

  const info = useCallback((message, autoHideDuration) => {
    showToast(message, 'info', autoHideDuration);
  }, [showToast]);

  const value = {
    showToast,
    hideToast,
    success,
    error,
    warning,
    info
  };

  return (
    <ToastContext.Provider value={value}>
      {children}
      <Toast
        open={toast.open}
        message={toast.message}
        severity={toast.severity}
        autoHideDuration={toast.autoHideDuration}
        onClose={hideToast}
      />
    </ToastContext.Provider>
  );
}; 