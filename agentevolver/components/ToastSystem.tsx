
import React, { useEffect } from 'react';
import { Toast } from '../types';
import { CheckCircle2, AlertTriangle, XCircle, Info, X } from 'lucide-react';

interface ToastSystemProps {
  toasts: Toast[];
  removeToast: (id: string) => void;
}

const ToastSystem: React.FC<ToastSystemProps> = ({ toasts, removeToast }) => {
  return (
    <div className="fixed top-4 right-4 z-[110] flex flex-col gap-2 w-80 pointer-events-none">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onRemove={() => removeToast(toast.id)} />
      ))}
    </div>
  );
};

const ToastItem: React.FC<{ toast: Toast; onRemove: () => void }> = ({ toast, onRemove }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onRemove();
    }, 4000);
    return () => clearTimeout(timer);
  }, [toast.id, onRemove]);

  const icons = {
    success: <CheckCircle2 size={20} className="text-emerald-500" />,
    error: <XCircle size={20} className="text-red-500" />,
    warning: <AlertTriangle size={20} className="text-yellow-500" />,
    info: <Info size={20} className="text-blue-500" />,
  };

  const bgs = {
    success: 'bg-slate-900 border-emerald-500/20',
    error: 'bg-slate-900 border-red-500/20',
    warning: 'bg-slate-900 border-yellow-500/20',
    info: 'bg-slate-900 border-blue-500/20',
  };

  return (
    <div className={`pointer-events-auto flex items-start gap-3 p-4 rounded-xl border shadow-2xl animate-in slide-in-from-right-full duration-300 ${bgs[toast.type]}`}>
      <div className="mt-0.5">{icons[toast.type]}</div>
      <div className="flex-1">
        <h4 className="text-sm font-bold text-white">{toast.title}</h4>
        {toast.description && <p className="text-xs text-slate-400 mt-1">{toast.description}</p>}
      </div>
      <button onClick={onRemove} className="text-slate-500 hover:text-white transition-colors">
        <X size={14} />
      </button>
    </div>
  );
};

export default ToastSystem;
