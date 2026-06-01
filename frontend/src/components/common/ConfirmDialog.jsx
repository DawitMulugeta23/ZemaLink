import { useState, useEffect, useRef } from 'react';
import { useTheme } from '../../context/ThemeContext';

const VARIANT_ICONS = {
  danger: {
    path: 'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z',
    outer: 'from-red-500 to-rose-600',
    shadow: 'shadow-red-500/25',
  },
  warning: {
    path: 'M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
    outer: 'from-amber-500 to-orange-600',
    shadow: 'shadow-amber-500/25',
  },
  info: {
    path: 'M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
    outer: 'from-blue-500 to-indigo-600',
    shadow: 'shadow-blue-500/25',
  },
};

export default function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title = 'Confirm',
  message = 'Are you sure?',
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'info',
}) {
  const { isDark } = useTheme();
  const [busy, setBusy] = useState(false);
  const confirmRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      setBusy(false);
      setTimeout(() => confirmRef.current?.focus(), 100);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const handler = (e) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const icon = VARIANT_ICONS[variant] || VARIANT_ICONS.info;

  const handleConfirm = async () => {
    setBusy(true);
    try {
      await onConfirm();
    } finally {
      setBusy(false);
      onClose();
    }
  };

  const handleBackdrop = (e) => {
    if (e.target === e.currentTarget && !busy) onClose();
  };

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in"
      onClick={handleBackdrop}
    >
      <div
        className={`relative w-full max-w-sm rounded-2xl border shadow-2xl overflow-hidden animate-slide-up ${
          isDark
            ? 'bg-slate-900/95 border-white/10 backdrop-blur-2xl'
            : 'bg-white/95 border-slate-200 backdrop-blur-2xl'
        }`}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
      >
        <div className="p-6 text-center">
          <div className={`mx-auto mb-4 w-16 h-16 rounded-full bg-gradient-to-br ${icon.outer} flex items-center justify-center shadow-xl ${icon.shadow}`}>
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={icon.path} />
            </svg>
          </div>

          <h3
            id="confirm-dialog-title"
            className={`text-lg font-bold mb-2 ${isDark ? 'text-white' : 'text-slate-900'}`}
          >
            {title}
          </h3>
          <p className={`text-sm leading-relaxed ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
            {message}
          </p>
        </div>

        <div className={`flex gap-3 px-6 pb-6`}>
          <button
            onClick={onClose}
            disabled={busy}
            className={`flex-1 py-3 rounded-xl border text-sm font-medium transition-all disabled:opacity-50 ${
              isDark
                ? 'border-white/10 text-slate-300 hover:bg-white/5'
                : 'border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            {cancelText}
          </button>
          <button
            ref={confirmRef}
            onClick={handleConfirm}
            disabled={busy}
            className={`flex-1 py-3 rounded-xl text-sm font-semibold text-white transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed bg-gradient-to-r ${icon.outer} shadow-lg ${icon.shadow} hover:scale-[1.02] active:scale-[0.98]`}
          >
            {busy ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                {confirmText}...
              </span>
            ) : confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
