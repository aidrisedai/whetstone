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

import { beforeAll, describe, expect, it } from "vitest";

const post = (handler: (req: Request) => Promise<Response>, body: unknown) =>
  handler(
    new Request("http://localhost/api/test", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: typeof body === "string" ? body : JSON.stringify(body),
    }),
  );

const history = [
  { role: "user", content: "I want to build a habit tracker for teens." },
  { role: "assistant", content: "Who is it for, and what breaks today?" },
  { role: "user", content: "High schoolers who forget which subject to revise." },
];

const part = {
  title: "The habit list",
  whatItIs: "A list of habits on screen",
  concept: "arrays",
  buildSpec: "Render an array of habit strings into <li> elements.",
};

/** Every route: [name, module path, a valid body, the keys the client reads]. */
const ROUTES: Array<[string, string, Record<string, unknown>, string[]]> = [
  ["score", "./score/route", { history, priorCriteria: null }, ["projectType", "refinedPrompt", "overall", "ready"]],
  ["lesson", "./lesson/route", { history }, ["title", "lesson", "why"]],
  ["export", "./export/route", { refinedPrompt: "Build a habit tracker." }, ["builderName", "builderUrl"]],
  [
    "coach",
    "./coach/route",
    { refinedPrompt: "Build a habit tracker.", projectType: "web app", step: 1, changeRequest: "" },
    ["whatChanged", "concept", "proTip"],
  ],
  [
    "plan",
    "./plan/route",
    {
      refinedPrompt: "Build a habit tracker.",
      projectType: "web app",
      name: "Sam",
      favoriteGame: "Minecraft",
      knownConcepts: [],
    },
    ["projectName", "bigPicture", "parts"],
  ],
  [
    "board",
    "./board/route",
    {
      projectName: "HabitHero",
      bigPicture: "Track habits",
      part,
      partNumber: 1,
      totalParts: 3,
      name: "Sam",
      favoriteGame: "Minecraft",
    },
    ["partTitle", "boardTitle", "steps"],
  ],
  [
    "board-chat",
    "./board-chat/route",
    {
      projectName: "HabitHero",
      part: { title: part.title, concept: part.concept },
      boardSoFar: "arrays hold many things",
      studentSaid: "why an array?",
    },
    ["reply", "boardItem"],
  ],
  [
    "lesson-build",
    "./lesson-build/route",
    {
      projectName: "HabitHero",
      bigPicture: "Track habits",
      projectType: "web app",
      partNumber: 1,
      totalParts: 3,
      part,
      currentCode: "",
      favoriteGame: "Minecraft",
      name: "Sam",
    },
    ["partTitle", "intro", "beats", "outro", "concept"],
  ],
  [
    "code-ask",
    "./code-ask/route",
    {
      projectName: "HabitHero",
      partTitle: part.title,
      beatLabel: "the array",
      beatCode: "const habits = [];",
      fileSoFar: "<html></html>",
      studentSaid: "what does const mean?",
    },
    ["reply", "highlightHint"],
  ],
  [
    "quiz",
    "./quiz/route",
    {
      projectName: "HabitHero",
      refinedPrompt: "Build a habit tracker.",
      partTitle: part.title,
      concept: "arrays",
      newCode: "const habits = ['read'];",
      name: "Sam",
    },
    ["partTitle", "questions"],
  ],
  [
    "extend",
    "./extend/route",
    {
      projectName: "HabitHero",
      refinedPrompt: "Build a habit tracker.",
      request: "add streaks",
      currentCode: "<html></html>",
      knownConcepts: ["arrays"],
    },
    ["title", "whatItIs", "concept", "buildSpec"],
  ],
  [
    "edit",
    "./edit/route",
    {
      refinedPrompt: "Build a habit tracker.",
      projectType: "web app",
      currentCode: "<html><body><h1>Hi</h1></body></html>",
      changeRequest: "make the heading say Habits",
    },
    ["summary", "edits"],
  ],
];

/** The two streaming routes answer with text, not JSON, so they get their own checks. */
const STREAMS: Array<[string, string, Record<string, unknown>]> = [
  ["advisor", "./advisor/route", { history, phase: "dialogue" }],
  ["build", "./build/route", { refinedPrompt: "Build a habit tracker.", projectType: "web app" }],
];

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
