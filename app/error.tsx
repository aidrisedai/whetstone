"use client";

import { useEffect } from "react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="min-h-screen bg-base flex items-center justify-center p-8">
      <div className="max-w-md text-center space-y-4">
        <p className="text-2xl font-display font-bold text-ink">Something went wrong</p>
        <p className="text-muted text-sm">{error.message || "An unexpected error occurred."}</p>
        <button
          onClick={reset}
          className="mt-4 px-6 py-2 rounded-lg bg-ember text-white font-semibold text-sm hover:opacity-90 transition"
        >
          Try again
        </button>
      </div>
    </div>
  );
}
