"use client";

import { useEffect } from "react";

export default function Error({ error, reset }: { error: Error; reset: () => void }) {
  useEffect(() => {
    console.error("[Whetstone] unhandled render error:", error);
  }, [error]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-8 text-center">
      <p className="text-lg font-semibold text-ink">Something went wrong.</p>
      <p className="max-w-sm text-sm text-muted">{error.message}</p>
      <button
        type="button"
        onClick={reset}
        className="rounded-lg border border-line px-4 py-2 text-sm text-ink hover:border-ember/60"
      >
        Try again
      </button>
    </div>
  );
}
