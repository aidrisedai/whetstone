import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

// Simple in-memory rate limiter: 60 API requests per minute per IP.
// This guard is intentionally lightweight (no external store) — it protects
// a single-instance deployment from accidental credit burn and casual abuse.
// For multi-instance deployments, swap in Redis or an edge rate-limit service.
const WINDOW_MS = 60_000;
const MAX_REQUESTS = 60;

const counters = new Map<string, { count: number; resetAt: number }>();

function clientIp(req: NextRequest): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0].trim() ??
    req.headers.get("x-real-ip") ??
    "unknown"
  );
}

export function middleware(req: NextRequest): NextResponse {
  const ip = clientIp(req);
  const now = Date.now();
  const entry = counters.get(ip);

  if (!entry || now > entry.resetAt) {
    counters.set(ip, { count: 1, resetAt: now + WINDOW_MS });
    return NextResponse.next();
  }

  entry.count += 1;
  if (entry.count > MAX_REQUESTS) {
    return new NextResponse(JSON.stringify({ error: "Too many requests — slow down a bit." }), {
      status: 429,
      headers: {
        "Content-Type": "application/json",
        "Retry-After": String(Math.ceil((entry.resetAt - now) / 1000)),
      },
    });
  }

  return NextResponse.next();
}

export const config = {
  // Only rate-limit the API routes — the UI assets are unaffected.
  matcher: ["/api/:path*"],
};
