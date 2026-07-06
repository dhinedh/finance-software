import React, { createContext, useContext, useState, useCallback } from 'react';
import { CheckCircle2, AlertTriangle, XCircle, Info, X } from 'lucide-react';

type ToastType = 'success' | 'error' | 'warning' | 'info';

interface Toast {
  id: number;
  message: string;
  type: ToastType;
}

interface ToastContextType {
  showToast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback((message: string, type: ToastType = 'success') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);

    // Auto dismiss after 4 seconds
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4000);
  }, []);

  const removeToast = (id: number) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      
      {/* Toast Overlay Container */}
      <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 w-full max-w-sm pointer-events-none">
        {toasts.map(toast => {
          let bgColor = 'bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100';
          let Icon = Info;
          let iconColor = 'text-blue-500';

          if (toast.type === 'success') {
            bgColor = 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800/30 text-emerald-900 dark:text-emerald-300';
            Icon = CheckCircle2;
            iconColor = 'text-emerald-500';
          } else if (toast.type === 'error') {
            bgColor = 'bg-rose-50 dark:bg-rose-950/30 border-rose-200 dark:border-rose-800/30 text-rose-900 dark:text-rose-300';
            Icon = XCircle;
            iconColor = 'text-rose-500';
          } else if (toast.type === 'warning') {
            bgColor = 'bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800/30 text-amber-900 dark:text-amber-300';
            Icon = AlertTriangle;
            iconColor = 'text-amber-500';
          }

          return (
            <div
              key={toast.id}
              className={`flex items-start gap-3 p-4 rounded-xl border shadow-lg pointer-events-auto transition-all transform duration-300 animate-slide-in ${bgColor}`}
            >
              <Icon className={`w-5 h-5 mt-0.5 shrink-0 ${iconColor}`} />
              <div className="flex-1 text-sm font-medium">{toast.message}</div>
              <button
                onClick={() => removeToast(toast.id)}
                className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};
