import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 px-4 text-center">
      <div className="text-5xl">🪨</div>
      <div>
        <h1 className="font-display text-2xl font-bold text-ink">Page not found</h1>
        <p className="mt-1 text-muted">This page doesn&apos;t exist. Head back and keep building.</p>
      </div>
      <Link
        href="/"
        className="rounded-xl bg-gradient-to-br from-ember-soft to-ember-deep px-6 py-2.5 font-semibold text-base shadow-glow transition-transform hover:scale-[1.02]"
      >
        Back to Whetstone
      </Link>
    </div>
  );
}
