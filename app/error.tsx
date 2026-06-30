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
      <div className="text-5xl">⚠️</div>
      <div>
        <h1 className="font-display text-2xl font-bold text-ink">Something went wrong</h1>
        <p className="mt-1 text-muted">
          {error.message || "An unexpected error occurred. Try again or refresh the page."}
        </p>
      </div>
      <button
        type="button"
        onClick={reset}
        className="rounded-xl bg-gradient-to-br from-ember-soft to-ember-deep px-6 py-2.5 font-semibold text-base shadow-glow transition-transform hover:scale-[1.02]"
      >
        Try again
      </button>
    </div>
  );
}
