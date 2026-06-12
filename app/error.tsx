"use client";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 px-4 text-center">
      <div className="space-y-2">
        <h2 className="font-display text-2xl font-bold text-ink">Something went wrong</h2>
        <p className="text-sm text-muted">{error.message || "An unexpected error occurred."}</p>
      </div>
      <button
        type="button"
        onClick={reset}
        className="rounded-lg border border-ember/40 bg-ember/10 px-4 py-2 text-sm font-medium text-ember transition-colors hover:bg-ember/20"
      >
        Try again
      </button>
    </div>
  );
}
