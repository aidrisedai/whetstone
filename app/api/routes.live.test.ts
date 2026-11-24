/**
 * Live-path tests for the routes that call Claude.
 *
 * routes.test.ts pins every route in demo mode, which returns before the model
 * call — so the code a keyed deployment actually runs (building the request,
 * reading the reply, turning a failure into a message) had no coverage at all.
 * These run the same handlers with a key set and the SDK client swapped for a
 * fake that answers from the JSON schema each request carries. No network.
 */
process.env.ANTHROPIC_API_KEY = "test-key";
delete process.env.WHETSTONE_DEMO;

import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { post, ROUTES, STREAMS } from "./routeFixtures";

type Schema = {
  type?: string;
  enum?: unknown[];
  properties?: Record<string, Schema>;
  items?: Schema;
};

interface ModelRequest {
  model: string;
  max_tokens: number;
  system: unknown;
  messages: unknown[];
  output_config?: { format?: { type: string; schema: Schema } };
}

const APP = "<!DOCTYPE html>\n<html><body><h1>Habits</h1></body></html>\n";

/**
 * The smallest value that satisfies a schema — what a well-behaved model
 * returns. Code is a whole app, since /api/lesson-build rejects anything less.
 */
function sample(schema: Schema, key = ""): unknown {
  if (schema.enum) return schema.enum[0];
  switch (schema.type) {
    case "object":
      return Object.fromEntries(Object.entries(schema.properties ?? {}).map(([k, v]) => [k, sample(v, k)]));
    case "array":
      return schema.items ? [sample(schema.items, key)] : [];
    case "integer":
    case "number":
      return 1;
    case "boolean":
      return true;
    default:
      return key === "code" ? APP : "text";
  }
}

const message = (text: string, stop_reason = "end_turn") => ({
  content: text ? [{ type: "text", text }] : [],
  stop_reason,
});

const fake = vi.hoisted(() => ({
  requests: [] as unknown[],
  create: null as null | ((req: unknown) => unknown),
  stream: null as null | ((req: unknown) => unknown),
}));

vi.mock("@/lib/anthropic", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/anthropic")>()),
  getClient: () => ({
    messages: {
      create: async (req: unknown) => {
        fake.requests.push(req);
        return fake.create!(req);
      },
      stream: (req: unknown) => {
        fake.requests.push(req);
        return fake.stream!(req);
      },
    },
  }),
}));

/** A stream the way the SDK hands one back: text deltas, then the final message. */
function textStream(chunks: string[], fail?: Error) {
  return {
    async *[Symbol.asyncIterator]() {
      for (const text of chunks) {
        yield { type: "content_block_delta", delta: { type: "text_delta", text } };
      }
      if (fail) throw fail;
    },
    finalMessage: async () => message(chunks.join("")),
  };
}

beforeEach(() => {
  fake.requests.length = 0;
  fake.create = (req) => message(JSON.stringify(sample((req as ModelRequest).output_config!.format!.schema)));
  fake.stream = () => textStream(["Who is it ", "for?"]);
});

// /api/export only builds a hand-off link; it never calls the model.
const MODEL_ROUTES = ROUTES.filter(([name]) => name !== "export");

describe.each(MODEL_ROUTES)("POST /api/%s with a key set", (_name, modPath, validBody, keys) => {
  let POST: (req: Request) => Promise<Response>;
  beforeAll(async () => {
    ({ POST } = await import(modPath));
  });

  it("asks the model for schema-shaped JSON and returns what the client reads", async () => {
    const res = await post(POST, validBody);
    expect(res.status).toBe(200);
    const json = await res.json();
    for (const key of keys) expect(json).toHaveProperty(key);

    expect(fake.requests).toHaveLength(1);
    const req = fake.requests[0] as ModelRequest;
    expect(req.model).toMatch(/^claude-/);
    expect(req.max_tokens).toBeGreaterThan(0);
    expect(req.messages.length).toBeGreaterThan(0);
    expect(req.output_config?.format?.type).toBe("json_schema");
  });

  it("answers 502 with a message when the reply is cut off at the token limit", async () => {
    fake.create = () => message('{"half":', "max_tokens");
    const res = await post(POST, validBody);
    expect(res.status).toBe(502);
    expect((await res.json()).error).toMatch(/cut off|too big/i);
  });

  it("answers 502 with a message when the model refuses or returns no text", async () => {
    fake.create = () => message("", "refusal");
    const res = await post(POST, validBody);
    expect(res.status).toBe(502);
    expect((await res.json()).error).toEqual(expect.any(String));
  });

  it("answers 502 with a message when the reply isn't JSON", async () => {
    fake.create = () => message("Sorry, I can't do that.");
    const res = await post(POST, validBody);
    expect(res.status).toBe(502);
    expect((await res.json()).error).toEqual(expect.any(String));
  });

  it("answers 502 with a message when the API call fails", async () => {
    fake.create = () => {
      throw new Error("529 overloaded");
    };
    const res = await post(POST, validBody);
    expect(res.status).toBe(502);
    expect((await res.json()).error).toEqual(expect.any(String));
  });
});

describe.each(STREAMS)("POST /api/%s with a key set", (_name, modPath, validBody) => {
  let POST: (req: Request) => Promise<Response>;
  beforeAll(async () => {
    ({ POST } = await import(modPath));
  });

  it("streams the model's text through as it arrives", async () => {
    const res = await post(POST, validBody);
    expect(res.status).toBe(200);
    expect(await res.text()).toBe("Who is it for?");
    expect((fake.requests[0] as ModelRequest).model).toMatch(/^claude-/);
  });

  it("ends the stream with a visible warning when the model call fails midway", async () => {
    fake.stream = () => textStream(["Who is "], new Error("connection reset"));
    const res = await post(POST, validBody);
    const text = await res.text();
    expect(text).toContain("Who is ");
    expect(text).toContain("⚠️");
  });
});

describe("POST /api/score with a key set", () => {
  it("computes overall and readiness itself instead of trusting the model", async () => {
    const { POST } = await import("./score/route");
    const dim = { score: 90, rationale: "r", suggestion: "s" };
    fake.create = () =>
      message(
        JSON.stringify({
          projectType: "Web app",
          clarity: dim,
          conciseness: { ...dim, score: 40 },
          dynamicCriteria: [{ key: "scope", label: "Scope", bestPractice: "be specific", ...dim }],
          refinedPrompt: "Build a habit tracker.",
          // A model that volunteers its own verdict must not be believed.
          overall: 100,
          ready: true,
        }),
      );
    const json = await (await post(POST, ROUTES[0][2])).json();
    expect(json.overall).toBeLessThan(100);
    expect(json.ready).toBe(false);
  });
});
