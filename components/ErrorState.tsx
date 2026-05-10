'use client';

interface ErrorStateProps {
  message: string;
  onRetry?: () => void;
}

export default function ErrorState({ message, onRetry }: ErrorStateProps) {
  return (
    <div className="rounded-xl border border-red-200 bg-red-50 p-5 text-center">
      <p className="text-2xl mb-2">⚠️</p>
      <p className="font-semibold text-red-700 mb-1">Something went wrong</p>
      <p className="text-sm text-red-600 mb-4">{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="text-sm px-4 py-2 rounded-lg bg-red-100 text-red-700 hover:bg-red-200 transition-colors"
        >
          Try again
        </button>
      )}
    </div>
  );
}
