import { useAppStore } from '../../store';
import { X, CheckCircle2, AlertCircle, Info } from 'lucide-react';

export default function Toasts() {
  const toasts = useAppStore(s => s.ui.toasts);
  const dismiss = useAppStore(s => s.dismissToast);
  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[100] flex flex-col gap-2 w-full max-w-sm pointer-events-none">
      {toasts.map(t => {
        const isSuccess = t.type === 'success';
        const isError = t.type === 'error';
        const isInfo = t.type === 'info';
        return (
          <div
            key={t.id}
            className={`toast-in pointer-events-auto flex items-center gap-3 rounded-xl px-4 py-3 shadow-lg backdrop-blur-lg
              ${isSuccess ? 'bg-emerald-500/15 border border-emerald-400/30 text-emerald-200' : ''}
              ${isError ? 'bg-red-500/15 border border-red-400/30 text-red-200' : ''}
              ${isInfo ? 'bg-sky-500/15 border border-sky-400/30 text-sky-200' : ''}`}
          >
            {isSuccess && <CheckCircle2 size={18} className="shrink-0" />}
            {isError && <AlertCircle size={18} className="shrink-0" />}
            {isInfo && <Info size={18} className="shrink-0" />}
            <span className="flex-1 text-sm font-medium">{t.message}</span>
            <button onClick={() => dismiss(t.id)} className="p-1 -m-1 rounded hover:bg-white/5">
              <X size={14} />
            </button>
          </div>
        );
      })}
    </div>
  );
}
