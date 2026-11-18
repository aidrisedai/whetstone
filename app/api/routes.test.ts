/**
 * Contract tests for every API route, run in demo mode.
 *
 * The unit suite in lib/ covers the pure helpers, but nothing exercised the 15
 * handlers themselves — so a route could stop answering, drop a field the
 * client destructures, or 500 on a wrong-typed body, and typecheck + build
 * would both stay green. These pin the two things every route owes its caller:
 * a valid payload gets 200 with the shape lib/clientApi.ts reads, and a
 * malformed one gets a 4xx with a message, never an unhandled 500.
 *
 * WHETSTONE_DEMO is forced before the handlers load so the suite never reaches
 * the real API, even on a machine that has ANTHROPIC_API_KEY set.
 */
process.env.WHETSTONE_DEMO = "1";

import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";

import { post, ROUTES, STREAMS } from "./routeFixtures";

/** `body` with every text field (and the first chat message) blown up to half a megabyte. */
function oversized(body: Record<string, unknown>): Record<string, unknown> {
  const huge = "x".repeat(500_000);
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(body)) {
    if (typeof value === "string") out[key] = huge;
    else if (key === "history" && Array.isArray(value)) out[key] = [{ role: "user", content: huge }, ...value.slice(1)];
    else out[key] = value;
  }
  return out;
}

describe.each(ROUTES)("POST /api/%s", (_name, modPath, validBody, keys) => {
  let POST: (req: Request) => Promise<Response>;
  beforeAll(async () => {
    POST = (await import(modPath)).POST;
  });

  it("answers 200 with the payload the client reads", async () => {
    const res = await post(POST, validBody);
    expect(res.status).toBe(200);
    const json = (await res.json()) as Record<string, unknown>;
    for (const key of keys) expect(json).toHaveProperty(key);
  });

  it("rejects a body that isn't a JSON object", async () => {
    for (const bad of ["not json at all", "42", "[1,2]", "null"]) {
      const res = await post(POST, bad);
      expect(res.status).toBeGreaterThanOrEqual(400);
      expect(res.status).toBeLessThan(500);
    }
  });

  it("refuses megabytes of text instead of passing them to the model", async () => {
    const res = await post(POST, oversized(validBody));
    expect(res.status).toBeGreaterThanOrEqual(400);
    expect(res.status).toBeLessThan(500);
    expect(((await res.json()) as { error?: string }).error).toBeTruthy();
  });

  it("never 500s when a field carries the wrong type", async () => {
    const wrongTypes = [42, true, null, [], {}];
    for (const key of Object.keys(validBody)) {
      for (const value of wrongTypes) {
        const res = await post(POST, { ...validBody, [key]: value });
        expect(
          res.status,
          `${_name}: { ${key}: ${JSON.stringify(value)} } produced ${res.status}`,
        ).toBeLessThan(500);
      }
    }
  });
});

describe.each(STREAMS)("POST /api/%s (streaming)", (_name, modPath, validBody) => {
  let POST: (req: Request) => Promise<Response>;
  beforeAll(async () => {
    POST = (await import(modPath)).POST;
  });

  it("streams a non-empty text body", async () => {
    const res = await post(POST, validBody);
    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toMatch(/text\/plain/);
    const text = await res.text();
    expect(text.trim().length).toBeGreaterThan(20);
  });

  it("refuses megabytes of text without streaming", async () => {
    const res = await post(POST, oversized(validBody));
    expect(res.status).toBeGreaterThanOrEqual(400);
    expect(res.status).toBeLessThan(500);
  });

  it("rejects a malformed body without streaming", async () => {
    const res = await post(POST, "not json at all");
    expect(res.status).toBeGreaterThanOrEqual(400);
    expect(res.status).toBeLessThan(500);
  });
});

describe("/api/speak", () => {
  it("reports whether the HD voice is configured", async () => {
    const { GET } = await import("./speak/route");
    const res = GET();
    expect(res.status).toBe(200);
    expect(await res.json()).toHaveProperty("configured");
  });

  it("returns 204 so the client falls back to the browser voice when unconfigured", async () => {
    const { POST } = await import("./speak/route");
    const res = await post(POST, { text: "Hello builders" });
    // 204 with no Google key; 200 audio if an operator has one configured.
    expect([200, 204]).toContain(res.status);
  });

  it("rejects an empty or wrong-typed `text`", async () => {
    const { POST } = await import("./speak/route");
    for (const bad of [{ text: "" }, { text: 42 }, { text: null }, {}]) {
      const res = await post(POST, bad);
      expect(res.status).toBeGreaterThanOrEqual(400);
      expect(res.status).toBeLessThan(500);
    }
  });
});

/**
 * The webhook is the hands-free hand-off, so it must fire exactly once per
 * export. The build workspace re-requests the deep link every time it opens;
 * without `linkOnly` each visit re-delivered the prompt to the operator's
 * pipeline.
 */
describe("/api/export webhook", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    delete process.env.BUILDER_WEBHOOK_URL;
  });

  const setup = () => {
    process.env.BUILDER_WEBHOOK_URL = "https://hooks.example.test/whetstone";
    const fetchMock = vi.fn(async () => new Response(null, { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    return fetchMock;
  };

  it("delivers the prompt on a real export", async () => {
    const fetchMock = setup();
    const { POST } = await import("./export/route");
    const res = await post(POST, { refinedPrompt: "Build a habit tracker." });
    expect(await res.json()).toMatchObject({ webhook: "sent" });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("returns the deep link without delivering when linkOnly is set", async () => {
    const fetchMock = setup();
    const { POST } = await import("./export/route");
    const res = await post(POST, { refinedPrompt: "Build a habit tracker.", linkOnly: true });
    const json = (await res.json()) as { builderUrl: string; webhook: string };
    expect(json.webhook).toBe("skipped");
    expect(json.builderUrl).toMatch(/^https:\/\//);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("refuses an oversized prompt instead of relaying it", async () => {
    const fetchMock = setup();
    const { POST } = await import("./export/route");
    const res = await post(POST, { refinedPrompt: "x".repeat(20_001) });
    expect(res.status).toBe(413);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

/**
 * Every handler needs an explicit maxDuration. Next defaults these to the
 * platform's function timeout (10-15s on Vercel), which the 16k-token Opus
 * routes cannot finish inside — they'd be killed in production while passing
 * every test and building clean.
 */
describe("route config", () => {
  const ALL = [...ROUTES.map(([n, p]) => [n, p] as const), ...STREAMS.map(([n, p]) => [n, p] as const), ["speak", "./speak/route"] as const];

  it.each(ALL)("/api/%s declares a maxDuration", async (_name, modPath) => {
    const mod = (await import(modPath)) as { maxDuration?: unknown };
    expect(typeof mod.maxDuration).toBe("number");
    expect(mod.maxDuration as number).toBeGreaterThan(15);
  });

  it("gives the 16k-token build routes the longest budget", async () => {
    for (const p of ["./build/route", "./lesson-build/route"]) {
      const mod = (await import(p)) as { maxDuration: number };
      expect(mod.maxDuration).toBeGreaterThanOrEqual(300);
    }
  });
});
