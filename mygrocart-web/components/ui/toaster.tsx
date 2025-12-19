'use client';

import { useToast } from '@/components/ui/use-toast';
import { X, Check, AlertTriangle } from 'lucide-react';
import { useEffect } from 'react';

interface Toast {
  id: string;
  title?: string;
  description?: string;
  variant?: 'default' | 'success' | 'destructive';
  duration?: number;
}

export function Toaster() {
  const { toasts, dismiss } = useToast();

  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 pointer-events-none">
      {toasts.map((toast) => {
        const isSuccess = toast.variant === 'success';
        const isDestructive = toast.variant === 'destructive';

        return (
          <ToastItem
            key={toast.id}
            toast={toast}
            isSuccess={isSuccess}
            isDestructive={isDestructive}
            onDismiss={() => dismiss(toast.id)}
          />
        );
      })}
    </div>
  );
}

function ToastItem({
  toast,
  isSuccess,
  isDestructive,
  onDismiss,
}: {
  toast: Toast;
  isSuccess: boolean;
  isDestructive: boolean;
  onDismiss: () => void;
}) {
  useEffect(() => {
    const duration = toast.duration || 5000;
    const timer = setTimeout(() => {
      onDismiss();
    }, duration);

    return () => clearTimeout(timer);
  }, [toast.duration, onDismiss]);

  const bgColor = isSuccess
    ? 'bg-green-50 border-green-200'
    : isDestructive
    ? 'bg-red-50 border-red-200'
    : 'bg-white border-gray-200';

  const iconColor = isSuccess
    ? 'text-green-600'
    : isDestructive
    ? 'text-red-600'
    : 'text-gray-600';

  const Icon = isSuccess ? Check : isDestructive ? AlertTriangle : null;

  return (
    <div
      className={`pointer-events-auto w-full max-w-md rounded-lg border p-4 shadow-lg ${bgColor} animate-in slide-in-from-top-5 duration-300`}
    >
      <div className="flex items-start gap-3">
        {Icon && <Icon className={`w-5 h-5 flex-shrink-0 mt-0.5 ${iconColor}`} />}
        <div className="flex-1">
          {toast.title && (
            <div className="font-semibold text-gray-900 mb-1">{toast.title}</div>
          )}
          {toast.description && (
            <div className="text-sm text-gray-700">{toast.description}</div>
          )}
        </div>
        <button
          onClick={onDismiss}
          className="flex-shrink-0 text-gray-500 hover:text-gray-700 transition-colors"
          aria-label="Close notification"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
