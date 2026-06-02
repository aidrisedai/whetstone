import { describe, expect, it } from "vitest";
import { demoAdvisorReply, demoAssessment } from "../lib/demo";
import type { ChatMessage } from "../lib/types";

function userMsg(content: string): ChatMessage {
  return { id: "u1", role: "user", content };
}

function advisorMsg(content: string): ChatMessage {
  return { id: "a1", role: "advisor", content };
}

// ── demoAdvisorReply ──────────────────────────────────────────────────────

describe("demoAdvisorReply", () => {
  it("returns a non-empty string for a single user turn", () => {
    const reply = demoAdvisorReply([userMsg("I want to build a game")], false);
    expect(typeof reply).toBe("string");
    expect(reply.length).toBeGreaterThan(10);
  });

  it("returns a closing message when closing=true", () => {
    const reply = demoAdvisorReply([userMsg("An app for students")], true);
    expect(reply).toContain("sharp enough to build");
  });

  it("returns a different reply when an image is attached (first two turns)", () => {
    const history: ChatMessage[] = [
      { id: "u1", role: "user", content: "Here's my sketch", images: [{ mediaType: "image/png", data: "abc" }] },
    ];
    const reply = demoAdvisorReply(history, false);
    expect(reply).toContain("sketch");
  });

  it("advances through pushback prompts with more turns", () => {
    const history: ChatMessage[] = [];
    for (let i = 0; i < 6; i++) {
      history.push(userMsg(`turn ${i + 1}`));
      history.push(advisorMsg("pushback"));
    }
    const reply = demoAdvisorReply(history, false);
    expect(reply.length).toBeGreaterThan(0);
  });
});

// ── demoAssessment ────────────────────────────────────────────────────────

describe("demoAssessment", () => {
  it("returns a valid assessment shape", () => {
    const history = [userMsg("Build a task tracker")];
    const result = demoAssessment(history, null, 80);
    expect(result).toMatchObject({
      projectType: expect.any(String),
      clarity: expect.objectContaining({ score: expect.any(Number) }),
      conciseness: expect.objectContaining({ score: expect.any(Number) }),
      dynamicCriteria: expect.any(Array),
      refinedPrompt: expect.any(String),
      overall: expect.any(Number),
      ready: expect.any(Boolean),
      threshold: 80,
    });
  });

  it("scores rise with more substantive turns", () => {
    const sparse = [userMsg("app")];
    const rich = Array.from({ length: 6 }, (_, i) =>
      userMsg(`Turn ${i + 1}: specific, detailed, thoughtful answer with real context about the user and scope`),
    );
    const lowScore = demoAssessment(sparse, null, 80).overall;
    const highScore = demoAssessment(rich, null, 80).overall;
    expect(highScore).toBeGreaterThan(lowScore);
  });

  it("detects game projects and sets appropriate criteria keys", () => {
    const history = [userMsg("I want to make a puzzle game with levels and a score")];
    const result = demoAssessment(history, null, 80);
    expect(result.projectType).toBe("Game");
    const keys = result.dynamicCriteria.map((d) => d.key);
    expect(keys).toContain("core_mechanic");
  });

  it("reuses prior criteria when provided", () => {
    const history = [userMsg("Build a chatbot")];
    const prior = [
      { key: "define_audience", label: "Audience", bestPractice: "define_audience" },
      { key: "success_criteria", label: "Success", bestPractice: "success_criteria" },
    ];
    const result = demoAssessment(history, prior, 80);
    expect(result.dynamicCriteria.map((d) => d.key)).toEqual(["define_audience", "success_criteria"]);
  });

  it("marks ready=true after enough substantive turns", () => {
    const history = Array.from({ length: 10 }, (_, i) =>
      userMsg(`Detailed answer turn ${i + 1} — clearly, concisely, with real user context and scope`),
    );
    const result = demoAssessment(history, null, 80);
    expect(result.ready).toBe(true);
  });

  it("all dimension scores stay within 0..100", () => {
    const history = [userMsg("app idea")];
    const result = demoAssessment(history, null, 80);
    const scores = [
      result.clarity.score,
      result.conciseness.score,
      ...result.dynamicCriteria.map((d) => d.score),
    ];
    for (const s of scores) {
      expect(s).toBeGreaterThanOrEqual(0);
      expect(s).toBeLessThanOrEqual(100);
    }
  });
});
