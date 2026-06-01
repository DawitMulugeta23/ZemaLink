import { useState } from 'react';

export default function ErrorMessage({ message, onRetry }) {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  return (
    <div className="rounded-xl border border-red-500/30 bg-red-500/10 backdrop-blur-sm p-4 flex items-start gap-3 animate-slide-up">
      <div className="shrink-0 mt-0.5">
        <svg className="w-5 h-5 text-red-400" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
        </svg>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-red-300">{message}</p>
        {onRetry && (
          <button
            onClick={onRetry}
            className="mt-2 text-xs font-medium text-red-400 hover:text-red-300 transition-colors underline underline-offset-2"
          >
            Try again
          </button>
        )}
      </div>
      <button
        onClick={() => setDismissed(true)}
        className="shrink-0 p-1 rounded-lg hover:bg-red-500/10 transition-colors"
        aria-label="Dismiss error"
      >
        <svg className="w-4 h-4 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
}
