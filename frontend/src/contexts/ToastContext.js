import React, { createContext, useContext, useState, useCallback, useRef } from 'react';
import { Snackbar, Alert } from '@mui/material';

const ToastContext = createContext();

// Dedupe: don't show the same error message again within this window (stops "lots of errors flashing")
const ERROR_DEDUPE_MS = 4000;

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const lastErrorRef = useRef({ message: '', at: 0 });

  const removeToast = useCallback((id) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  }, []);

  const addToast = useCallback((message, severity = 'info', duration = 6000) => {
    const safeMessage = typeof message === 'string' ? message : JSON.stringify(message);
    // Dedupe errors: same message within ERROR_DEDUPE_MS = skip adding another
    if (severity === 'error') {
      const now = Date.now();
      const same = lastErrorRef.current.message === safeMessage && (now - lastErrorRef.current.at) < ERROR_DEDUPE_MS;
      if (same) return;
      lastErrorRef.current = { message: safeMessage, at: now };
    }
    const id = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    setToasts(prev => [...prev, { id, message: safeMessage, severity, duration }]);

    setTimeout(() => {
      removeToast(id);
    }, duration);
  }, [removeToast]);

  const success = useCallback((message, duration) => {
    addToast(message, 'success', duration);
  }, [addToast]);

  const error = useCallback((message, duration) => {
    addToast(message, 'error', duration);
  }, [addToast]);

  const warning = useCallback((message, duration) => {
    addToast(message, 'warning', duration);
  }, [addToast]);

  const info = useCallback((message, duration) => {
    addToast(message, 'info', duration);
  }, [addToast]);

  const value = {
    toasts,
    addToast,
    removeToast,
    success,
    error,
    warning,
    info,
  };

  return (
    <ToastContext.Provider value={value}>
      {children}
      {toasts.map((toast) => (
        <Snackbar
          key={toast.id}
          open={true}
          autoHideDuration={toast.duration}
          onClose={() => removeToast(toast.id)}
          anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
        >
          <Alert
            onClose={() => removeToast(toast.id)}
            severity={toast.severity}
            variant="filled"
            sx={{ width: '100%' }}
          >
            {toast.message}
          </Alert>
        </Snackbar>
      ))}
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
} 