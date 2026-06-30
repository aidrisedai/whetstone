import { describe, it, expect } from "vitest";
import { demoAdvisorReply, demoAssessment, demoLesson } from "../demo";
import type { ChatMessage } from "../types";

const msg = (role: ChatMessage["role"], content: string): ChatMessage => ({
  id: "x",
  role,
  content,
});

// ── demoAdvisorReply ───────────────────────────────────────────────────────

describe("demoAdvisorReply", () => {
  it("returns a non-empty string for a non-closing turn", () => {
    const history = [msg("user", "I want to build a game for students")];
    const reply = demoAdvisorReply(history, false);
    expect(typeof reply).toBe("string");
    expect(reply.length).toBeGreaterThan(0);
  });

  it("returns the closing message when closing=true", () => {
    const history = [msg("user", "I want to build a quiz app")];
    const reply = demoAdvisorReply(history, true);
    expect(reply).toContain("sharp enough to build");
  });

  it("produces different messages as turn count increases", () => {
    const replies = [1, 2, 3, 4, 5, 6].map((n) => {
      const history = Array.from({ length: n }, (_, i) =>
        msg(i % 2 === 0 ? "user" : "advisor", `message ${i}`),
      );
      return demoAdvisorReply(history, false);
    });
    // Should not all be identical across different turn counts
    const unique = new Set(replies);
    expect(unique.size).toBeGreaterThan(1);
  });
});

// ── demoAssessment ────────────────────────────────────────────────────────

describe("demoAssessment", () => {
  it("returns a valid Assessment shape", () => {
    const history = [msg("user", "I want to build a chatbot for helping students learn math")];
    const result = demoAssessment(history, null, 80);

    expect(typeof result.projectType).toBe("string");
    expect(typeof result.overall).toBe("number");
    expect(result.overall).toBeGreaterThanOrEqual(0);
    expect(result.overall).toBeLessThanOrEqual(100);
    expect(result.clarity.score).toBeGreaterThanOrEqual(0);
    expect(result.conciseness.score).toBeGreaterThanOrEqual(0);
    expect(Array.isArray(result.dynamicCriteria)).toBe(true);
    expect(typeof result.refinedPrompt).toBe("string");
    expect(typeof result.ready).toBe("boolean");
    expect(result.threshold).toBe(80);
  });

  it("scores low on the first turn (abstract idea)", () => {
    const history = [msg("user", "app")];
    const result = demoAssessment(history, null, 80);
    expect(result.overall).toBeLessThan(80);
    expect(result.ready).toBe(false);
  });

  it("scores higher with more substantive turns", () => {
    const shortHistory = [msg("user", "build a game")];
    const longHistory = Array.from({ length: 10 }, (_, i) =>
      msg(i % 2 === 0 ? "user" : "advisor", `substantive content about game design number ${i}`),
    );
    const shortResult = demoAssessment(shortHistory, null, 80);
    const longResult = demoAssessment(longHistory, null, 80);
    expect(longResult.overall).toBeGreaterThan(shortResult.overall);
  });

  it("detects game project type from keywords", () => {
    const history = [msg("user", "build a puzzle arcade game where players solve levels")];
    const result = demoAssessment(history, null, 80);
    expect(result.projectType).toBe("Game");
  });

  it("detects AI assistant project type from keywords", () => {
    const history = [msg("user", "build an ai tutor chatbot companion")];
    const result = demoAssessment(history, null, 80);
    expect(result.projectType).toBe("AI assistant");
  });

  it("reuses prior criteria when provided", () => {
    const history = [msg("user", "game idea")];
    const prior = [
      { key: "my_key", label: "My Label", bestPractice: "my_practice" },
    ];
    const result = demoAssessment(history, prior, 80);
    const keys = result.dynamicCriteria.map((c) => c.key);
    expect(keys).toContain("my_key");
  });
});

// ── demoLesson ────────────────────────────────────────────────────────────

describe("demoLesson", () => {
  it("returns a Lesson with title, lesson, and why fields", () => {
    const history = [msg("user", "build a quiz app for teachers")];
    const result = demoLesson(history);
    expect(typeof result.title).toBe("string");
    expect(typeof result.lesson).toBe("string");
    expect(typeof result.why).toBe("string");
    expect(result.title.length).toBeGreaterThan(0);
  });

  it("varies the 'why' field based on number of turns", () => {
    // short: 1 user turn → "few turns" path
    const short = demoLesson([msg("user", "x")]);
    // long: 5 user turns (threshold is > 4) → detailed path
    const long = demoLesson(
      Array.from({ length: 10 }, (_, i) =>
        msg(i % 2 === 0 ? "user" : "advisor", "content"),
      ),
    );
    expect(short.why).not.toBe(long.why);
  });
});
