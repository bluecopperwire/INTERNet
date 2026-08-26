import React from 'react';
import { useToastStore } from '../../stores/useToastStore';
import type { ToastType } from '../../stores/useToastStore';
import { CheckCircle2, AlertCircle, Info, AlertTriangle, X } from 'lucide-react';

const icons: Record<ToastType, React.ReactNode> = {
  success: <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />,
  error: <AlertCircle className="w-5 h-5 text-rose-500 shrink-0" />,
  warning: <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0" />,
  info: <Info className="w-5 h-5 text-blue-500 shrink-0" />,
};

const bgColors: Record<ToastType, string> = {
  success: 'bg-white border-emerald-200 text-slate-800 shadow-emerald-500/10',
  error: 'bg-white border-rose-200 text-slate-800 shadow-rose-500/10',
  warning: 'bg-white border-amber-200 text-slate-800 shadow-amber-500/10',
  info: 'bg-white border-blue-200 text-slate-800 shadow-blue-500/10',
};

export const ToastViewport: React.FC = () => {
  const { toasts, removeToast } = useToastStore();

  if (toasts.length === 0) return null;

  return (
    <div
      aria-live="polite"
      aria-atomic="true"
      className="fixed bottom-5 right-5 z-50 flex flex-col gap-2 max-w-md w-full pointer-events-none px-4"
    >
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`pointer-events-auto flex items-center justify-between gap-3 p-4 rounded-xl border shadow-lg transition-all duration-300 transform translate-y-0 ${bgColors[toast.type]}`}
        >
          <div className="flex items-center gap-3">
            {icons[toast.type]}
            <p className="text-sm font-medium leading-snug">{toast.message}</p>
          </div>
          <button
            onClick={() => removeToast(toast.id)}
            className="text-slate-400 hover:text-slate-600 transition-colors p-1 rounded-lg hover:bg-slate-100"
            aria-label="Dismiss notification"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ))}
    </div>
  );
};
