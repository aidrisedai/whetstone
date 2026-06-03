import { describe, it, expect } from "vitest";
import { demoAdvisorReply, demoAssessment, demoLesson } from "./demo";
import type { ChatMessage } from "./types";

function userMsg(content: string): ChatMessage {
  return { id: "u1", role: "user", content };
}
function advisorMsg(content: string): ChatMessage {
  return { id: "a1", role: "advisor", content };
}

// ---------------------------------------------------------------------------
// demoAdvisorReply
// ---------------------------------------------------------------------------
describe("demoAdvisorReply", () => {
  it("returns a non-empty string", () => {
    const reply = demoAdvisorReply([userMsg("I want to build an app")], false);
    expect(typeof reply).toBe("string");
    expect(reply.length).toBeGreaterThan(0);
  });

  it("returns a closing message when closing=true", () => {
    const reply = demoAdvisorReply([userMsg("My idea is a task manager")], true);
    expect(reply.toLowerCase()).toMatch(/sharp|habit|build|forge/);
  });

  it("varies reply based on turn count", () => {
    const shortHistory = [userMsg("game")];
    const longHistory = [
      userMsg("game"), advisorMsg("q1"), userMsg("puzzle"), advisorMsg("q2"),
      userMsg("score system"), advisorMsg("q3"), userMsg("leaderboard"),
    ];
    const r1 = demoAdvisorReply(shortHistory, false);
    const r2 = demoAdvisorReply(longHistory, false);
    expect(r1).not.toBe(r2);
  });

  it("includes image-aware reply on first image turn", () => {
    const history: ChatMessage[] = [
      {
        id: "u1",
        role: "user",
        content: "here is my sketch",
        images: [{ mediaType: "image/png", data: "abc" }],
      },
    ];
    const reply = demoAdvisorReply(history, false);
    expect(reply.toLowerCase()).toMatch(/sketch|screen|layout|see/);
  });
});

// ---------------------------------------------------------------------------
// demoAssessment
// ---------------------------------------------------------------------------
describe("demoAssessment", () => {
  const singleTurn = [userMsg("build a game for kids")];

  it("returns a valid Assessment shape", () => {
    const a = demoAssessment(singleTurn, null, 80);
    expect(typeof a.overall).toBe("number");
    expect(typeof a.ready).toBe("boolean");
    expect(a.clarity).toBeDefined();
    expect(a.conciseness).toBeDefined();
    expect(Array.isArray(a.dynamicCriteria)).toBe(true);
  });

  it("overall is within 0-100", () => {
    const a = demoAssessment(singleTurn, null, 80);
    expect(a.overall).toBeGreaterThanOrEqual(0);
    expect(a.overall).toBeLessThanOrEqual(100);
  });

  it("score grows with more substantive turns", () => {
    const short = demoAssessment([userMsg("app")], null, 80);
    const rich = demoAssessment(
      [
        userMsg("I want to build a task tracker app for high school students who need to manage homework across multiple subjects"),
        advisorMsg("q"),
        userMsg("The user is a 16-year-old who forgets deadlines; done means zero missed assignments in a week"),
      ],
      null,
      80,
    );
    expect(rich.overall).toBeGreaterThan(short.overall);
  });

  it("reuses prior criteria when provided", () => {
    const prior = [
      { key: "define_audience", label: "Audience", bestPractice: "define_audience" },
    ];
    const a = demoAssessment(singleTurn, prior, 80);
    expect(a.dynamicCriteria.map((d) => d.key)).toContain("define_audience");
  });

  it("stamps the correct threshold", () => {
    const a = demoAssessment(singleTurn, null, 75);
    expect(a.threshold).toBe(75);
  });
});

// ---------------------------------------------------------------------------
// demoLesson
// ---------------------------------------------------------------------------
describe("demoLesson", () => {
  it("returns a lesson with title, lesson, and why fields", () => {
    const l = demoLesson([userMsg("my idea")]);
    expect(typeof l.title).toBe("string");
    expect(typeof l.lesson).toBe("string");
    expect(typeof l.why).toBe("string");
    expect(l.title.length).toBeGreaterThan(0);
  });

  it("why mentions the depth of the session for longer histories", () => {
    const long = Array.from({ length: 6 }, (_, i) =>
      i % 2 === 0 ? userMsg(`turn ${i}`) : advisorMsg(`reply ${i}`),
    );
    const l = demoLesson(long);
    expect(l.why.toLowerCase()).toMatch(/turn|sharp|vague|score/);
  });
});
