import { describe, expect, it } from "vitest";
import { DEFAULT_RATE_LIMIT, clientKey, createRateLimiter, resolveRateLimit } from "./rateLimit";

describe("resolveRateLimit", () => {
  it("falls back to the default when unset or unparseable", () => {
    expect(resolveRateLimit(undefined)).toBe(DEFAULT_RATE_LIMIT);
    expect(resolveRateLimit("")).toBe(DEFAULT_RATE_LIMIT);
    expect(resolveRateLimit("lots")).toBe(DEFAULT_RATE_LIMIT);
    expect(resolveRateLimit("-5")).toBe(DEFAULT_RATE_LIMIT);
  });

  it("reads a configured limit, with 0 meaning off", () => {
    expect(resolveRateLimit("40")).toBe(40);
    expect(resolveRateLimit("12.9")).toBe(12);
    expect(resolveRateLimit("0")).toBe(0);
  });
});

describe("clientKey", () => {
  it("takes the first forwarded address", () => {
    expect(clientKey(new Headers({ "x-forwarded-for": "203.0.113.7, 10.0.0.1" }))).toBe("203.0.113.7");
  });

  it("falls back to x-real-ip, then to one shared bucket", () => {
    expect(clientKey(new Headers({ "x-real-ip": "198.51.100.2" }))).toBe("198.51.100.2");
    expect(clientKey(new Headers())).toBe("unknown");
  });
});

describe("createRateLimiter", () => {
  it("allows up to the limit, then refuses with a retry hint", () => {
    const check = createRateLimiter(3, 60_000);
    expect(check("a", 0).allowed).toBe(true);
    expect(check("a", 1_000).allowed).toBe(true);
    expect(check("a", 2_000).allowed).toBe(true);
    expect(check("a", 30_000)).toEqual({ allowed: false, retryAfter: 30 });
  });

  it("counts each caller separately", () => {
    const check = createRateLimiter(1, 60_000);
    expect(check("a", 0).allowed).toBe(true);
    expect(check("a", 1).allowed).toBe(false);
    expect(check("b", 2).allowed).toBe(true);
  });

  it("opens a fresh window once the old one expires", () => {
    const check = createRateLimiter(1, 60_000);
    expect(check("a", 0).allowed).toBe(true);
    expect(check("a", 59_999).allowed).toBe(false);
    expect(check("a", 60_000).allowed).toBe(true);
  });

  it("never refuses when the limit is 0", () => {
    const check = createRateLimiter(0);
    for (let i = 0; i < 50; i++) expect(check("a", i).allowed).toBe(true);
  });
});
