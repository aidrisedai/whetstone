/**
 * API route smoke tests — all run in demo mode (WHETSTONE_DEMO=1) so no
 * real API key is required. These tests verify that each route:
 *   1. Accepts valid input and returns the expected shape/status
 *   2. Rejects invalid input with a 400 error
 */
import { describe, it, expect, beforeAll } from "vitest";

// Force demo mode before any module is imported
beforeAll(() => {
  process.env.WHETSTONE_DEMO = "1";
});

// Helper to call a route handler directly
async function callRoute(
  handlerPath: string,
  body: unknown,
): Promise<{ status: number; json: unknown }> {
  const mod = await import(handlerPath);
  const req = new Request("http://localhost/api/test", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const res: Response = await mod.POST(req);
  let json: unknown;
  try {
    json = await res.json();
  } catch {
    json = null;
  }
  return { status: res.status, json };
}

const validHistory = [
  { id: "1", role: "user", content: "I want to build a flashcard study app for high school students" },
  { id: "2", role: "advisor", content: "Interesting — who specifically?" },
  { id: "3", role: "user", content: "Students studying Spanish vocabulary for their exams" },
];

// ── /api/score ────────────────────────────────────────────────────────────────

describe("POST /api/score", () => {
  it("returns a valid Assessment with required fields", async () => {
    const { status, json } = await callRoute("@/app/api/score/route", { history: validHistory });
    expect(status).toBe(200);
    const a = json as Record<string, unknown>;
    expect(a).toHaveProperty("projectType");
    expect(a).toHaveProperty("clarity");
    expect(a).toHaveProperty("conciseness");
    expect(a).toHaveProperty("dynamicCriteria");
    expect(a).toHaveProperty("overall");
    expect(a).toHaveProperty("ready");
    expect(a).toHaveProperty("threshold");
    expect(a).toHaveProperty("refinedPrompt");
  });

  it("overall is a number between 0 and 100", async () => {
    const { json } = await callRoute("@/app/api/score/route", { history: validHistory });
    const overall = (json as Record<string, unknown>).overall as number;
    expect(overall).toBeGreaterThanOrEqual(0);
    expect(overall).toBeLessThanOrEqual(100);
  });

  it("returns 400 for missing history", async () => {
    const { status } = await callRoute("@/app/api/score/route", {});
    expect(status).toBe(400);
  });

  it("returns 400 for empty history array", async () => {
    const { status } = await callRoute("@/app/api/score/route", { history: [] });
    expect(status).toBe(400);
  });

  it("accepts priorCriteria and locks dynamic dimensions to them", async () => {
    const prior = [
      { key: "core_mechanic", label: "Core mechanic", bestPractice: "core_mechanic" },
    ];
    const { status, json } = await callRoute("@/app/api/score/route", {
      history: validHistory,
      priorCriteria: prior,
    });
    expect(status).toBe(200);
    const criteria = (json as Record<string, unknown>).dynamicCriteria as Array<{ key: string }>;
    expect(criteria.map((c) => c.key)).toEqual(["core_mechanic"]);
  });
});

// ── /api/lesson ───────────────────────────────────────────────────────────────

describe("POST /api/lesson", () => {
  it("returns a valid Lesson with title, lesson, and why", async () => {
    const { status, json } = await callRoute("@/app/api/lesson/route", { history: validHistory });
    expect(status).toBe(200);
    const l = json as Record<string, unknown>;
    expect(l).toHaveProperty("title");
    expect(l).toHaveProperty("lesson");
    expect(l).toHaveProperty("why");
    expect(typeof l.title).toBe("string");
    expect((l.title as string).length).toBeGreaterThan(0);
  });

  it("returns 400 for empty history", async () => {
    const { status } = await callRoute("@/app/api/lesson/route", { history: [] });
    expect(status).toBe(400);
  });
});

// ── /api/advisor (streaming) ──────────────────────────────────────────────────

describe("POST /api/advisor", () => {
  it("returns a streaming text response in demo mode", async () => {
    const mod = await import("@/app/api/advisor/route");
    const req = new Request("http://localhost/api/advisor", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ history: validHistory }),
    });
    const res: Response = await mod.POST(req);
    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toContain("text/plain");

    // Consume the stream and verify we get non-empty text
    const text = await res.text();
    expect(text.length).toBeGreaterThan(0);
  });

  it("returns 400 for empty history", async () => {
    const mod = await import("@/app/api/advisor/route");
    const req = new Request("http://localhost/api/advisor", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ history: [] }),
    });
    const res: Response = await mod.POST(req);
    expect(res.status).toBe(400);
  });

  it("returns a closing reply when phase=closing", async () => {
    const mod = await import("@/app/api/advisor/route");
    const req = new Request("http://localhost/api/advisor", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ history: validHistory, phase: "closing" }),
    });
    const res: Response = await mod.POST(req);
    expect(res.status).toBe(200);
    const text = await res.text();
    expect(text).toContain("sharp enough to build");
  });
});
