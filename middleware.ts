import { NextRequest, NextResponse } from "next/server";

/**
 * In-memory sliding-window rate limiter for API routes.
 *
 * Limits by IP address. Expensive AI routes (advisor, build, speak, board)
 * get a tighter cap than lighter endpoints. Works in a single-instance
 * deployment; for multi-instance, replace with a Redis-backed store.
 */

interface Window {
  count: number;
  resetAt: number;
}

const store = new Map<string, Window>();

// Prune stale entries once per 5 minutes so the Map doesn't grow unboundedly.
let lastPrune = Date.now();
function maybePrune(now: number): void {
  if (now - lastPrune < 5 * 60 * 1000) return;
  lastPrune = now;
  for (const [key, win] of store) {
    if (now >= win.resetAt) store.delete(key);
  }
}

function limit(key: string, maxRequests: number, windowMs: number): boolean {
  const now = Date.now();
  maybePrune(now);

  const win = store.get(key);
  if (!win || now >= win.resetAt) {
    store.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  win.count += 1;
  if (win.count > maxRequests) return false;
  return true;
}

/** Extract the best available client IP from the request headers. */
function clientIp(req: NextRequest): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "unknown"
  );
}

// Routes that trigger expensive model calls (Opus 4.8) — tighter limit.
const EXPENSIVE = new Set([
  "/api/advisor",
  "/api/build",
  "/api/board",
  "/api/board-chat",
  "/api/lesson-build",
  "/api/plan",
  "/api/quiz",
  "/api/score",
  "/api/lesson",
  "/api/extend",
]);

const WINDOW_MS = 60_000; // 1 minute
const EXPENSIVE_MAX = 20; // expensive AI routes: 20 req/min
const STANDARD_MAX = 60; // lighter routes: 60 req/min

export function middleware(req: NextRequest): NextResponse {
  const { pathname } = req.nextUrl;
  if (!pathname.startsWith("/api/")) return NextResponse.next();

  const ip = clientIp(req);
  const max = EXPENSIVE.has(pathname) ? EXPENSIVE_MAX : STANDARD_MAX;
  const key = `${ip}:${pathname}`;

  if (!limit(key, max, WINDOW_MS)) {
    return new NextResponse(
      JSON.stringify({ error: "Too many requests. Please wait a moment and try again." }),
      {
        status: 429,
        headers: {
          "Content-Type": "application/json",
          "Retry-After": "60",
        },
      },
    );
  }

  return NextResponse.next();
}

export const config = {
  matcher: "/api/:path*",
};
