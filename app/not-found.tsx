import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 px-4 text-center">
      <div className="grid h-14 w-14 place-items-center rounded-2xl bg-ember/15 text-3xl">
        🔍
      </div>
      <div className="max-w-sm">
        <h1 className="font-display text-xl font-bold text-ink">Page not found</h1>
        <p className="mt-2 text-sm text-muted">
          That URL doesn&apos;t exist. Head back to the forge.
        </p>
      </div>
      <Link
        href="/"
        className="rounded-lg border border-line bg-surface px-4 py-2 text-sm font-medium text-ink transition-colors hover:border-ember/40"
      >
        Back to Whetstone
      </Link>
    </div>
  );
}
