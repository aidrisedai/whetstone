/**
 * Minimal in-memory rate limiter for the API routes.
 * Not suitable for multi-instance deployments — use Upstash or edge middleware there.
 *
 * Default: 30 requests per minute per IP. Demo mode uses 60 (no API cost).
 */

const WINDOW_MS = 60_000;

interface Bucket {
  count: number;
  reset: number;
}

const buckets = new Map<string, Bucket>();

/** Returns true if the request is within quota, false if it should be 429'd. */
export function checkRateLimit(ip: string, limit: number): boolean {
  const now = Date.now();
  const b = buckets.get(ip);
  if (!b || b.reset < now) {
    buckets.set(ip, { count: 1, reset: now + WINDOW_MS });
    return true;
  }
  if (b.count >= limit) return false;
  b.count += 1;
  return true;
}

/** Extract a best-effort client IP from the incoming request. */
export function clientIp(req: Request): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0].trim() ??
    req.headers.get("x-real-ip") ??
    "unknown"
  );
}
