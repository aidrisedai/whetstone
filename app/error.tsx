"use client";

import { useEffect } from "react";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Surface the error in dev so it's easy to spot.
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 px-4 text-center">
      <div className="grid h-14 w-14 place-items-center rounded-2xl bg-warn/15 text-3xl">
        ⚠️
      </div>
      <div className="max-w-sm">
        <h1 className="font-display text-xl font-bold text-ink">Something went wrong</h1>
        <p className="mt-2 text-sm text-muted">
          {error.message || "An unexpected error occurred. Try refreshing or starting a new session."}
        </p>
        {error.digest && (
          <p className="mt-1 font-mono text-[10px] text-muted/60">{error.digest}</p>
        )}
      </div>
      <button
        type="button"
        onClick={reset}
        className="rounded-lg border border-line bg-surface px-4 py-2 text-sm font-medium text-ink transition-colors hover:border-ember/40"
      >
        Try again
      </button>
    </div>
  );
}
