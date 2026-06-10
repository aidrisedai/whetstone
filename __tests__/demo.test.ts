import { describe, it, expect } from "vitest";
import { demoAdvisorReply, demoAssessment, demoLesson } from "../lib/demo";
import type { ChatMessage } from "../lib/types";

const userMsg = (content: string, id = "u1"): ChatMessage => ({
  id,
  role: "user",
  content,
});

const advisorMsg = (content: string, id = "a1"): ChatMessage => ({
  id,
  role: "advisor",
  content,
});

describe("demoAdvisorReply", () => {
  it("returns a closing reply in the closing phase", () => {
    const history = [userMsg("I want to build a game tracker")];
    const reply = demoAdvisorReply(history, true);
    expect(typeof reply).toBe("string");
    expect(reply.length).toBeGreaterThan(20);
  });

  it("returns an image-aware reply when first turn has an image", () => {
    const history: ChatMessage[] = [
      { id: "u1", role: "user", content: "here's my sketch", images: [{ mediaType: "image/png", data: "abc123" }] },
    ];
    const reply = demoAdvisorReply(history, false);
    expect(reply).toMatch(/sketch|screen|draw|see/i);
  });

  it("returns a pushback based on salient word", () => {
    const history = [userMsg("I want to build a tracker for games")];
    const reply = demoAdvisorReply(history, false);
    expect(typeof reply).toBe("string");
    expect(reply.length).toBeGreaterThan(10);
  });

  it("advances through pushback variants with more turns", () => {
    const history: ChatMessage[] = [];
    const replies = new Set<string>();
    for (let i = 0; i < 6; i++) {
      history.push(userMsg(`Turn ${i}: my app is about gaming and players`, `u${i}`));
      history.push(advisorMsg("interesting", `a${i}`));
      replies.add(demoAdvisorReply(history, false));
    }
    // Should produce at least 2 distinct replies across 6 turns
    expect(replies.size).toBeGreaterThan(1);
  });
});

describe("demoAssessment", () => {
  it("returns a valid Assessment shape", () => {
    const history = [userMsg("Build a game tracker for my friends")];
    const result = demoAssessment(history, null, 80);
    expect(result).toMatchObject({
      projectType: expect.any(String),
      clarity: { score: expect.any(Number), rationale: expect.any(String), suggestion: expect.any(String) },
      conciseness: { score: expect.any(Number), rationale: expect.any(String), suggestion: expect.any(String) },
      dynamicCriteria: expect.any(Array),
      refinedPrompt: expect.any(String),
      overall: expect.any(Number),
      ready: expect.any(Boolean),
      threshold: 80,
    });
  });

  it("scores climb with more substantive turns", () => {
    const shortHistory = [userMsg("build an app")];
    const longHistory = [
      userMsg("build an app"),
      advisorMsg("who is it for?"),
      userMsg("It is for teenagers who want to track their game scores, and success means they can view their history on any device. Scope is small: just score entry and list view for v1."),
      advisorMsg("good"),
      userMsg("The key user flow is: enter a score with game name, see sorted history. No social features, no accounts, just localStorage for v1."),
    ];
    const shortScore = demoAssessment(shortHistory, null, 80).overall;
    const longScore = demoAssessment(longHistory, null, 80).overall;
    expect(longScore).toBeGreaterThan(shortScore);
  });

  it("detects game project type", () => {
    const history = [userMsg("I want to build a puzzle game with levels and a score")];
    const result = demoAssessment(history, null, 80);
    expect(result.projectType).toBe("Game");
  });

  it("detects AI assistant project type", () => {
    const history = [userMsg("I want to build a chatbot tutor for math")];
    const result = demoAssessment(history, null, 80);
    expect(result.projectType).toBe("AI assistant");
  });

  it("uses prior criteria when provided (stable scoreboard)", () => {
    const prior = [
      { key: "k1", label: "Custom", bestPractice: "bp1" },
      { key: "k2", label: "Other", bestPractice: "bp2" },
    ];
    const history = [userMsg("Build a web app")];
    const result = demoAssessment(history, prior, 80);
    const keys = result.dynamicCriteria.map((d) => d.key);
    expect(keys).toEqual(["k1", "k2"]);
  });

  it("all scores are clamped between 0 and 100", () => {
    const history = [userMsg("test")];
    const result = demoAssessment(history, null, 80);
    const scores = [
      result.clarity.score,
      result.conciseness.score,
      ...result.dynamicCriteria.map((d) => d.score),
      result.overall,
    ];
    for (const s of scores) {
      expect(s).toBeGreaterThanOrEqual(0);
      expect(s).toBeLessThanOrEqual(100);
    }
  });
});

describe("demoLesson", () => {
  it("returns a valid Lesson shape", () => {
    const history = [userMsg("Build a game"), advisorMsg("ok")];
    const result = demoLesson(history);
    expect(result).toMatchObject({
      title: expect.any(String),
      lesson: expect.any(String),
      why: expect.any(String),
    });
    expect(result.title.length).toBeGreaterThan(3);
    expect(result.lesson.length).toBeGreaterThan(20);
    expect(result.why.length).toBeGreaterThan(10);
  });

  it("produces a distinct 'why' for short vs long sessions", () => {
    const short = [userMsg("quick idea")];
    const long = Array.from({ length: 5 }, (_, i) => [
      userMsg(`turn ${i}`, `u${i}`),
      advisorMsg("ok", `a${i}`),
    ]).flat();
    expect(demoLesson(short).why).not.toBe(demoLesson(long).why);
  });
});
