"use client";

import { useEffect } from "react";

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="grid min-h-screen place-items-center bg-base px-6">
      <div className="text-center">
        <p className="text-5xl font-bold text-ember">⚠</p>
        <h1 className="mt-4 text-2xl font-bold text-ink">Something went wrong</h1>
        <p className="mt-2 text-muted">An unexpected error occurred. Your progress was not lost.</p>
        <button
          type="button"
          onClick={reset}
          className="mt-6 rounded-lg bg-ember px-5 py-2.5 text-sm font-semibold text-white shadow-glow hover:bg-ember-deep transition-colors"
        >
          Try again
        </button>
      </div>
    </div>
  );
}
