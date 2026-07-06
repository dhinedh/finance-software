import React, { useEffect } from 'react';
import { X } from 'lucide-react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  onConfirm?: () => void;
  confirmLabel?: string;
  confirmDisabled?: boolean;
  type?: 'info' | 'danger' | 'success';
}

const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
  onConfirm,
  confirmLabel = 'Confirm',
  confirmDisabled = false,
  type = 'info'
}) => {
  // Close modal on Escape key press
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleEscape);
    }

    return () => {
      document.body.style.overflow = 'unset';
      window.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/60 backdrop-blur-sm">
      <div 
        className="w-full max-w-md bg-white dark:bg-[#0c0c0f] rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-2xl overflow-hidden transform transition-all animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between p-5 border-b border-zinc-100 dark:border-zinc-800">
          <h3 className="text-lg font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
            {title}
          </h3>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-5 overflow-y-auto max-h-[70vh]">
          {children}
        </div>

        {/* Modal Footer (only show if onConfirm is provided) */}
        {onConfirm && (
          <div className="flex items-center justify-end gap-3 p-5 bg-zinc-50 dark:bg-[#0c0c0f]/50 border-t border-zinc-100 dark:border-zinc-800">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-semibold rounded-lg border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 bg-white dark:bg-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={onConfirm}
              disabled={confirmDisabled}
              className={`px-4 py-2 text-sm font-semibold rounded-lg text-white transition-colors flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed ${
                type === 'danger'
                  ? 'bg-rose-600 hover:bg-rose-700 active:bg-rose-800 shadow-sm shadow-rose-600/10'
                  : type === 'success'
                  ? 'bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 shadow-sm shadow-emerald-600/10'
                  : 'bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 shadow-sm shadow-indigo-600/10'
              }`}
            >
              {confirmLabel}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Modal;
