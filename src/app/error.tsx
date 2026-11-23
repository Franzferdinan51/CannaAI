'use client';

import { useEffect } from 'react';
import { getLogger } from '@/lib/logger-browser';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    getLogger().error('app_error_boundary', { error: error.message, digest: error.digest });
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0a0a0a]">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-white mb-4">Something went wrong!</h2>
        <button
          onClick={() => reset()}
          className="px-4 py-2 bg-[#00ff88] text-black rounded hover:bg-[#00dd77] transition"
        >
          Try again
        </button>
      </div>
    </div>
  );
}
