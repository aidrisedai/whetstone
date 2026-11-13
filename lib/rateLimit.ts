/**
 * A small fixed-window rate limiter for the API routes. Every route can spend
 * model tokens, so an open deployment needs a ceiling on how fast one caller
 * can hit them.
 *
 * State lives in this process's memory: it holds for a single `next start`
 * server, but each serverless instance counts on its own. Treat it as a guard
 * against runaway loops and casual abuse, not as a billing control.
 */

export const DEFAULT_RATE_LIMIT = 300;
export const RATE_WINDOW_MS = 60_000;
/** Beyond this many tracked callers, expired windows are swept on the next hit. */
const SWEEP_AT = 5_000;

export interface RateDecision {
  allowed: boolean;
  /** Seconds until the caller's window resets. */
  retryAfter: number;
}

/**
 * Requests allowed per caller per minute. `WHETSTONE_RATE_LIMIT=0` turns the
 * limiter off; anything unparseable falls back to the default.
 */
export function resolveRateLimit(raw: string | undefined): number {
  if (raw === undefined || raw.trim() === "") return DEFAULT_RATE_LIMIT;
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 0) return DEFAULT_RATE_LIMIT;
  return Math.floor(n);
}

/**
 * The caller's address, read from the forwarding headers. Those are only
 * trustworthy behind a host or reverse proxy that overwrites them (Vercel
 * does); on a server exposed directly, a caller can set its own and dodge the
 * limit — put a proxy in front, or enforce limits there instead.
 */
export function clientKey(headers: Headers): string {
  const forwarded = headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || headers.get("x-real-ip")?.trim() || "unknown";
}

export function createRateLimiter(limit: number, windowMs = RATE_WINDOW_MS) {
  const windows = new Map<string, { count: number; resetAt: number }>();

  return function check(key: string, now = Date.now()): RateDecision {
    if (limit <= 0) return { allowed: true, retryAfter: 0 };

    if (windows.size > SWEEP_AT) {
      for (const [k, w] of windows) if (w.resetAt <= now) windows.delete(k);
    }

    const current = windows.get(key);
    if (!current || current.resetAt <= now) {
      windows.set(key, { count: 1, resetAt: now + windowMs });
      return { allowed: true, retryAfter: 0 };
    }

    current.count += 1;
    const retryAfter = Math.max(1, Math.ceil((current.resetAt - now) / 1000));
    return { allowed: current.count <= limit, retryAfter: current.count <= limit ? 0 : retryAfter };
  };
}
