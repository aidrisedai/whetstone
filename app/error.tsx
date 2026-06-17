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
    console.error(error);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f5f0e8] p-8">
      <div className="max-w-md text-center space-y-6">
        <div className="text-5xl">⚠️</div>
        <h1 className="text-2xl font-bold text-[#1a1a1a]">Something went wrong</h1>
        <p className="text-[#555]">
          {error.message || "An unexpected error occurred. Please try again."}
        </p>
        <button
          onClick={reset}
          className="px-6 py-3 bg-[#1a1a1a] text-white rounded-xl font-semibold hover:bg-[#333] transition-colors"
        >
          Try again
        </button>
      </div>
    </div>
  );
}
