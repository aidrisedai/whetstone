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
    <div className="min-h-screen flex items-center justify-center bg-stone-950 text-stone-100 p-8">
      <div className="max-w-md text-center space-y-4">
        <div className="text-4xl">⚙️</div>
        <h1 className="text-xl font-semibold">Something went wrong</h1>
        <p className="text-stone-400 text-sm">
          {error.message || "An unexpected error occurred."}
        </p>
        <button
          onClick={reset}
          className="mt-4 px-6 py-2 rounded-lg bg-amber-500 text-stone-950 font-semibold hover:bg-amber-400 transition-colors"
        >
          Try again
        </button>
      </div>
    </div>
  );
}
