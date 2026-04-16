'use client';

import { useEffect } from 'react';

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function GlobalError({ error, reset }: ErrorProps) {
  useEffect(() => {
    console.error('App crashed:', error);
  }, [error]);

  const handleResetData = () => {
    try {
      localStorage.removeItem('warehouse_data');
    } catch (err) {
      console.warn('Failed to clear warehouse_data:', err);
    }
    reset();
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
      <div className="max-w-md w-full bg-white border border-gray-200 rounded-lg shadow-sm p-6">
        <h1 className="text-lg font-bold text-red-700 mb-2">Something went wrong</h1>
        <p className="text-sm text-gray-600 mb-4">
          The warehouse app encountered an unexpected error. You can retry, or reset the stored
          warehouse data if it may be corrupted.
        </p>
        {error.message && (
          <pre className="text-xs bg-gray-100 border rounded p-2 mb-4 overflow-x-auto">
            {error.message}
          </pre>
        )}
        <div className="flex gap-2">
          <button
            onClick={reset}
            className="px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm font-medium"
          >
            Try again
          </button>
          <button
            onClick={handleResetData}
            className="px-3 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300 text-sm font-medium"
          >
            Reset data & reload
          </button>
        </div>
      </div>
    </div>
  );
}
