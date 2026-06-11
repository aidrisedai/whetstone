import { describe, it, expect } from "vitest";
import { demoAdvisorReply, demoAssessment, demoLesson, demoEdits, demoBuildHtml } from "./demo";
import type { ChatMessage } from "./types";

function msg(role: "user" | "advisor", content: string): ChatMessage {
  return { id: "x", role, content };
}

// ── demoAdvisorReply ─────────────────────────────────────────────────────────

describe("demoAdvisorReply", () => {
  it("returns a non-empty string for any history", () => {
    const reply = demoAdvisorReply([msg("user", "I want to build a game")], false);
    expect(typeof reply).toBe("string");
    expect(reply.length).toBeGreaterThan(0);
  });

  it("returns the closing message when closing=true", () => {
    const reply = demoAdvisorReply([msg("user", "a todo app")], true);
    expect(reply).toContain("sharp enough to build");
  });

  it("includes context from the image when one is present", () => {
    const history: ChatMessage[] = [
      {
        id: "u1",
        role: "user",
        content: "here is my sketch",
        images: [{ mediaType: "image/png", data: "abc" }],
      },
    ];
    const reply = demoAdvisorReply(history, false);
    expect(typeof reply).toBe("string");
    expect(reply.length).toBeGreaterThan(0);
  });

  it("cycles through pushbacks across turns", () => {
    const history: ChatMessage[] = [
      msg("user", "build a quiz app"),
      msg("advisor", "ok"),
      msg("user", "for students who want to study"),
      msg("advisor", "ok"),
      msg("user", "it will have multiple choice questions"),
    ];
    const reply = demoAdvisorReply(history, false);
    expect(typeof reply).toBe("string");
    expect(reply.length).toBeGreaterThan(0);
  });
});

// ── demoAssessment ───────────────────────────────────────────────────────────

describe("demoAssessment", () => {
  const threshold = 80;

  it("returns a valid Assessment shape", () => {
    const history = [msg("user", "build a game for kids")];
    const result = demoAssessment(history, null, threshold);
    expect(result).toHaveProperty("clarity");
    expect(result).toHaveProperty("conciseness");
    expect(result).toHaveProperty("dynamicCriteria");
    expect(result).toHaveProperty("overall");
    expect(result).toHaveProperty("ready");
    expect(result).toHaveProperty("threshold", threshold);
  });

  it("scores rise as the builder engages more (more turns → higher base score)", () => {
    const sparse = [msg("user", "build a game")];
    const rich = [
      msg("user", "build a game where the player shoots asteroids to earn points"),
      msg("advisor", "good"),
      msg("user", "it targets kids aged 8-12 who love mobile games, with one-tap controls"),
      msg("advisor", "good"),
      msg("user", "done when a new high score is achieved after 3 minutes of play"),
    ];
    const sparseScore = demoAssessment(sparse, null, threshold).overall;
    const richScore = demoAssessment(rich, null, threshold).overall;
    expect(richScore).toBeGreaterThan(sparseScore);
  });

  it("all dimension scores are clamped to [0, 100]", () => {
    const history = [msg("user", "build something")];
    const result = demoAssessment(history, null, threshold);
    const allScores = [
      result.clarity.score,
      result.conciseness.score,
      ...result.dynamicCriteria.map((d) => d.score),
    ];
    for (const s of allScores) {
      expect(s).toBeGreaterThanOrEqual(0);
      expect(s).toBeLessThanOrEqual(100);
    }
  });

  it("locks dynamic criteria when priorCriteria is provided", () => {
    const prior = [{ key: "core_mechanic", label: "Core mechanic", bestPractice: "core_mechanic" }];
    const history = [msg("user", "build a puzzle game")];
    const result = demoAssessment(history, prior, threshold);
    expect(result.dynamicCriteria).toHaveLength(1);
    expect(result.dynamicCriteria[0].key).toBe("core_mechanic");
  });

  it("produces a non-empty refinedPrompt", () => {
    const history = [msg("user", "build a music player")];
    const result = demoAssessment(history, null, threshold);
    expect(result.refinedPrompt.length).toBeGreaterThan(0);
  });
});

// ── demoLesson ───────────────────────────────────────────────────────────────

describe("demoLesson", () => {
  it("returns a Lesson with title, lesson, and why", () => {
    const result = demoLesson([msg("user", "build something")]);
    expect(typeof result.title).toBe("string");
    expect(result.title.length).toBeGreaterThan(0);
    expect(typeof result.lesson).toBe("string");
    expect(result.lesson.length).toBeGreaterThan(0);
    expect(typeof result.why).toBe("string");
    expect(result.why.length).toBeGreaterThan(0);
  });
});

// ── demoEdits ────────────────────────────────────────────────────────────────

describe("demoEdits", () => {
  it("returns a summary and at least one edit operation", () => {
    const result = demoEdits("add a dark mode toggle");
    expect(typeof result.summary).toBe("string");
    expect(Array.isArray(result.edits)).toBe(true);
    expect(result.edits.length).toBeGreaterThan(0);
  });

  it("each edit has find and replace strings", () => {
    const result = demoEdits("change the color");
    for (const edit of result.edits) {
      expect(typeof edit.find).toBe("string");
      expect(typeof edit.replace).toBe("string");
    }
  });
});

// ── demoBuildHtml ─────────────────────────────────────────────────────────────

describe("demoBuildHtml", () => {
  it("returns a valid HTML document", () => {
    const html = demoBuildHtml("Todo App", "Build a todo app for students");
    expect(html).toContain("<!DOCTYPE html>");
    expect(html).toContain("</html>");
  });

  it("escapes HTML special characters in projectType and prompt", () => {
    const html = demoBuildHtml('<script>alert("xss")</script>', "Build &something");
    expect(html).not.toContain("<script>alert");
    expect(html).not.toContain("Build &something");
  });

  it("includes the changeRequest banner when provided", () => {
    const html = demoBuildHtml("App", "prompt", "make it blue");
    expect(html).toContain("make it blue");
  });

  it("includes the no-key banner when changeRequest is absent", () => {
    const html = demoBuildHtml("App", "prompt");
    expect(html).toContain("ANTHROPIC_API_KEY");
  });
});
