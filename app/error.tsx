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
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 px-4 text-center">
      <div className="flex flex-col items-center gap-3">
        <span className="text-4xl">⚠️</span>
        <h2 className="font-display text-2xl font-bold text-ink">Something went wrong</h2>
        <p className="max-w-md text-sm text-muted">
          {error.message || "An unexpected error occurred. Your idea is still sharp — try again."}
        </p>
      </div>
      <button
        type="button"
        onClick={reset}
        className="rounded-lg border border-ember/40 bg-ember/10 px-5 py-2 text-sm font-medium text-ember transition-colors hover:bg-ember/20"
      >
        Try again
      </button>
    </div>
  );
}
