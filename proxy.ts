import { NextRequest, NextResponse } from "next/server";

// In-memory rate limiter: 30 requests/minute per IP for most routes,
// 8/minute for the expensive model routes (build, score, lesson, plan, board).
// Replace with a Redis-backed store (e.g. Upstash) for multi-instance deployments.

const WINDOW_MS = 60_000;
const GENERAL_LIMIT = 30;
const EXPENSIVE_LIMIT = 8;

const EXPENSIVE_ROUTES = new Set([
  "/api/build",
  "/api/score",
  "/api/lesson",
  "/api/plan",
  "/api/board",
  "/api/lesson-build",
]);

interface Bucket {
  count: number;
  resetAt: number;
}

// Two stores — one per tier — to allow different limits.
const general = new Map<string, Bucket>();
const expensive = new Map<string, Bucket>();

function check(store: Map<string, Bucket>, key: string, limit: number): boolean {
  const now = Date.now();
  let bucket = store.get(key);
  if (!bucket || now >= bucket.resetAt) {
    bucket = { count: 0, resetAt: now + WINDOW_MS };
    store.set(key, bucket);
  }
  bucket.count += 1;
  return bucket.count <= limit;
}

export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (!pathname.startsWith("/api/")) return NextResponse.next();

  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    req.headers.get("x-real-ip") ??
    "unknown";

  const isExpensive = EXPENSIVE_ROUTES.has(pathname);
  const store = isExpensive ? expensive : general;
  const limit = isExpensive ? EXPENSIVE_LIMIT : GENERAL_LIMIT;
  const key = `${ip}:${pathname}`;

  if (!check(store, key, limit)) {
    return new NextResponse(JSON.stringify({ error: "Too many requests — slow down a bit." }), {
      status: 429,
      headers: {
        "Content-Type": "application/json",
        "Retry-After": "60",
      },
    });
  }

  return NextResponse.next();
}

export const config = {
  matcher: "/api/:path*",
};
