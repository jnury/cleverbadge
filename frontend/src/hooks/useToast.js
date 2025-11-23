import { useState, useCallback } from 'react';

let toastId = 0;

export const useToast = () => {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((message, type = 'success') => {
    const id = toastId++;
    setToasts(prev => [...prev, { id, message, type }]);
  }, []);

  const removeToast = useCallback((id) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  }, []);

  return {
    toasts,
    addToast,
    removeToast,
    showSuccess: (msg) => addToast(msg, 'success'),
    showError: (msg) => addToast(msg, 'error'),
    showInfo: (msg) => addToast(msg, 'info'),
    showWarning: (msg) => addToast(msg, 'warning')
  };
};
