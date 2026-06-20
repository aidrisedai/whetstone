import Link from "next/link";

export default function NotFound() {
  return (
    <div className="grid min-h-screen place-items-center bg-base px-6">
      <div className="text-center">
        <p className="text-5xl font-bold text-ember">404</p>
        <h1 className="mt-4 text-2xl font-bold text-ink">Page not found</h1>
        <p className="mt-2 text-muted">This page doesn&apos;t exist.</p>
        <Link
          href="/"
          className="mt-6 inline-block rounded-lg bg-ember px-5 py-2.5 text-sm font-semibold text-white shadow-glow hover:bg-ember-deep transition-colors"
        >
          Back to Whetstone
        </Link>
      </div>
    </div>
  );
}
