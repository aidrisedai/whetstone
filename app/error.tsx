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
    console.error("[whetstone] unhandled error:", error);
  }, [error]);

  return (
    <div className="min-h-screen bg-base flex items-center justify-center p-6">
      <div className="max-w-md w-full bg-panel border border-line rounded-2xl p-8 text-center">
        <div className="text-4xl mb-4">⚠️</div>
        <h1 className="font-display text-xl font-bold text-ink mb-2">Something went wrong</h1>
        <p className="text-muted text-sm mb-6">
          {error.message || "An unexpected error occurred. Try refreshing or starting over."}
        </p>
        <button
          onClick={reset}
          className="px-5 py-2 rounded-xl bg-ember text-white text-sm font-semibold hover:bg-ember-deep transition-colors"
        >
          Try again
        </button>
      </div>
    </div>
  );
}
