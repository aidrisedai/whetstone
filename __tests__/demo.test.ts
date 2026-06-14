import { describe, it, expect } from "vitest";
import { demoAdvisorReply, demoAssessment } from "@/lib/demo";
import type { ChatMessage, CriterionSpec } from "@/lib/types";

const userMsg = (content: string): ChatMessage => ({
  id: "u1",
  role: "user",
  content,
});
const advisorMsg = (content: string): ChatMessage => ({
  id: "a1",
  role: "advisor",
  content,
});

describe("demoAdvisorReply", () => {
  it("returns the closing message when closing=true", () => {
    const reply = demoAdvisorReply([userMsg("a game app")], true);
    expect(reply).toContain("sharp enough to build");
  });

  it("returns a pushback question for the first user turn", () => {
    const history = [userMsg("I want to build a tracker for students")];
    const reply = demoAdvisorReply(history, false);
    expect(typeof reply).toBe("string");
    expect(reply.length).toBeGreaterThan(20);
  });

  it("varies reply based on turn count", () => {
    const history1 = [userMsg("build a game"), advisorMsg("?")];
    const history2 = [
      userMsg("build a game"),
      advisorMsg("?"),
      userMsg("turn 2"),
      advisorMsg("?"),
    ];
    const reply1 = demoAdvisorReply(history1, false);
    const reply2 = demoAdvisorReply(history2, false);
    // The replies should use different pushback templates
    expect(reply1).not.toBe(reply2);
  });

  it("returns an image-specific reply when the first turn includes an image", () => {
    const history: ChatMessage[] = [
      {
        id: "u1",
        role: "user",
        content: "here is my sketch",
        images: [{ mediaType: "image/png", data: "abc123" }],
      },
    ];
    const reply = demoAdvisorReply(history, false);
    expect(reply).toContain("sketch");
  });
});

describe("demoAssessment", () => {
  const shortHistory = [userMsg("I want to build a game")];
  const priorCriteria: CriterionSpec[] = [
    { key: "core_mechanic", label: "Core mechanic", bestPractice: "core_mechanic" },
    { key: "success_criteria", label: "Win / lose state", bestPractice: "success_criteria" },
    { key: "specify_output_format", label: "Look & feel", bestPractice: "specify_output_format" },
  ];

  it("returns an assessment with the correct shape", () => {
    const result = demoAssessment(shortHistory, null, 80);
    expect(typeof result.overall).toBe("number");
    expect(typeof result.ready).toBe("boolean");
    expect(result.clarity).toBeDefined();
    expect(result.conciseness).toBeDefined();
    expect(Array.isArray(result.dynamicCriteria)).toBe(true);
    expect(typeof result.refinedPrompt).toBe("string");
  });

  it("stamps the correct threshold", () => {
    const result = demoAssessment(shortHistory, null, 75);
    expect(result.threshold).toBe(75);
  });

  it("reuses prior criteria when provided", () => {
    const result = demoAssessment(shortHistory, priorCriteria, 80);
    expect(result.dynamicCriteria).toHaveLength(3);
    expect(result.dynamicCriteria[0].key).toBe("core_mechanic");
  });

  it("score climbs with more turns, eventually crossing threshold", () => {
    // Build a history long enough that the demo score crosses 80
    const manyTurns: ChatMessage[] = [];
    for (let i = 0; i < 12; i++) {
      manyTurns.push(
        userMsg(`Turn ${i}: I want to build a game for teens that teaches programming through puzzles`),
        advisorMsg("Tell me more")
      );
    }
    const result = demoAssessment(manyTurns, null, 80);
    expect(result.ready).toBe(true);
  });

  it("detects game projects and assigns game-appropriate criteria", () => {
    const gameHistory = [userMsg("I want to build a puzzle game with score and levels")];
    const result = demoAssessment(gameHistory, null, 80);
    expect(result.projectType).toBe("Game");
    const keys = result.dynamicCriteria.map((d) => d.key);
    expect(keys).toContain("core_mechanic");
  });

  it("returns overall that matches deterministic computation (never trusts model)", () => {
    const result = demoAssessment(shortHistory, null, 80);
    const scores = [
      result.clarity.score,
      result.conciseness.score,
      ...result.dynamicCriteria.map((d) => d.score),
    ];
    const expectedOverall = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
    expect(result.overall).toBe(expectedOverall);
  });
});
