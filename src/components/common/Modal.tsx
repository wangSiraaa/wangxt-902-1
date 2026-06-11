import React from 'react';
import { X } from 'lucide-react';

interface Props {
  open: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  children: React.ReactNode;
  maxWidth?: string;
}

export default function Modal({ open, onClose, title, children, maxWidth = 'max-w-lg' }: Props) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
      <div className="absolute inset-0 modal-backdrop bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className={`relative modal-panel w-full ${maxWidth} glass-card shadow-2xl overflow-hidden`}>
        {title && (
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-700/40">
            <div className="font-display font-semibold text-lg">{title}</div>
            <button onClick={onClose} className="btn-ghost btn !px-2 !py-1.5">
              <X size={18} />
            </button>
          </div>
        )}
        <div className="p-5 max-h-[80vh] overflow-y-auto scrollbar-thin">
          {children}
        </div>
      </div>
    </div>
  );
}
