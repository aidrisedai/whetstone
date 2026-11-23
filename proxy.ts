import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { clientKey, createRateLimiter, resolveRateLimit } from "@/lib/rateLimit";

// Every API route can spend model tokens, so cap how fast one caller can hit
// them. See lib/rateLimit.ts for what this does and doesn't protect against.
const check = createRateLimiter(resolveRateLimit(process.env.WHETSTONE_RATE_LIMIT));

export function proxy(request: NextRequest) {
  const { allowed, retryAfter } = check(clientKey(request.headers));
  if (allowed) return NextResponse.next();

  return NextResponse.json(
    { error: `Whoa — too many requests at once. Give it ${retryAfter} seconds and try again.` },
    { status: 429, headers: { "Retry-After": String(retryAfter) } },
  );
}

export const config = {
  matcher: "/api/:path*",
};
