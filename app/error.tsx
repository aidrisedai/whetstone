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
    console.error("[Whetstone] Unhandled error:", error);
  }, [error]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-4 text-center">
      <span className="text-5xl">⚠️</span>
      <h2 className="font-display text-2xl font-bold text-ink">Something went wrong</h2>
      <p className="max-w-sm text-muted">
        {error.message || "An unexpected error occurred. Your idea is safe — try starting a new session."}
      </p>
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
