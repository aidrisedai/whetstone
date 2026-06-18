import { NextRequest, NextResponse } from "next/server";

const WINDOW_MS = 60_000; // 1 minute
const MAX_REQUESTS = 30;

interface Bucket {
  count: number;
  resetAt: number;
}

// In-memory per-IP buckets. Works for single-instance / dev; for multi-instance
// production, swap this Map for a shared store (Redis, Vercel KV, etc.).
const buckets = new Map<string, Bucket>();

export function middleware(req: NextRequest): NextResponse {
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    req.headers.get("x-real-ip") ??
    "127.0.0.1";

  const now = Date.now();
  const bucket = buckets.get(ip);

  if (!bucket || now >= bucket.resetAt) {
    buckets.set(ip, { count: 1, resetAt: now + WINDOW_MS });
    return NextResponse.next();
  }

  if (bucket.count >= MAX_REQUESTS) {
    const retryAfter = Math.ceil((bucket.resetAt - now) / 1000);
    return new NextResponse(
      JSON.stringify({ error: "Rate limit exceeded. Try again shortly." }),
      {
        status: 429,
        headers: {
          "Content-Type": "application/json",
          "Retry-After": String(retryAfter),
          "X-RateLimit-Limit": String(MAX_REQUESTS),
          "X-RateLimit-Reset": String(Math.ceil(bucket.resetAt / 1000)),
        },
      },
    );
  }

  bucket.count++;
  return NextResponse.next();
}

export const config = {
  matcher: "/api/:path*",
};
