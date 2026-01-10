import React, { createContext, useContext, useState, useCallback } from 'react';
import { Toast, ToastConfig, ToastType } from '@/components/ui/Toast';

interface ToastState {
  visible: boolean;
  message: string;
  type: ToastType;
  duration: number;
}

interface ToastContextValue {
  showToast: (config: ToastConfig) => void;
  hideToast: () => void;
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toast, setToast] = useState<ToastState>({
    visible: false,
    message: '',
    type: 'info',
    duration: 2500,
  });

  const showToast = useCallback((config: ToastConfig) => {
    setToast({
      visible: true,
      message: config.message,
      type: config.type || 'info',
      duration: config.duration || 2500,
    });
  }, []);

  const hideToast = useCallback(() => {
    setToast((prev) => ({ ...prev, visible: false }));
  }, []);

  return (
    <ToastContext.Provider value={{ showToast, hideToast }}>
      {children}
      <Toast
        visible={toast.visible}
        message={toast.message}
        type={toast.type}
        duration={toast.duration}
        onHide={hideToast}
      />
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}
