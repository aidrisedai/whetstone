import { describe, it, expect } from "vitest";
import { demoAdvisorReply, demoAssessment, demoLesson, demoBuildHtml, demoEdits } from "./demo";
import type { ChatMessage } from "./types";

function userMsg(content: string): ChatMessage {
  return { id: "u1", role: "user", content };
}

describe("demoAdvisorReply", () => {
  it("returns closing message when closing=true", () => {
    const reply = demoAdvisorReply([userMsg("an app")], true);
    expect(reply).toContain("sharp enough to build");
  });

  it("returns a pushback for a fresh history", () => {
    const reply = demoAdvisorReply([userMsg("I want to build an app for students")], false);
    expect(reply.length).toBeGreaterThan(10);
  });

  it("reacts to image in early turns", () => {
    const msgs: ChatMessage[] = [
      { id: "u1", role: "user", content: "here is my sketch", images: [{ mediaType: "image/png", data: "abc" }] },
    ];
    const reply = demoAdvisorReply(msgs, false);
    expect(reply).toContain("sketch");
  });
});

describe("demoAssessment", () => {
  const threshold = 80;

  it("returns a valid Assessment shape", () => {
    const a = demoAssessment([userMsg("a game for teens")], null, threshold);
    expect(a).toHaveProperty("overall");
    expect(a).toHaveProperty("ready");
    expect(a).toHaveProperty("threshold", threshold);
    expect(a.dynamicCriteria.length).toBeGreaterThan(0);
  });

  it("overall climbs with more turns", () => {
    const few = demoAssessment([userMsg("a game")], null, threshold);
    const many = demoAssessment(
      [
        userMsg("a game"),
        { id: "a1", role: "advisor", content: "who is it for?" },
        userMsg("for kids age 8-10 who love puzzles, to practice math facts through timed quiz levels"),
        { id: "a2", role: "advisor", content: "nice, what does done look like?" },
        userMsg("three levels, star rating, local high score, offline playable"),
      ],
      null,
      threshold,
    );
    expect(many.overall).toBeGreaterThan(few.overall);
  });

  it("reuses prior criteria when provided", () => {
    const prior = [
      { key: "core_mechanic", label: "Core mechanic", bestPractice: "core_mechanic" },
      { key: "success_criteria", label: "Win/lose", bestPractice: "success_criteria" },
    ];
    const a = demoAssessment([userMsg("a game")], prior, threshold);
    expect(a.dynamicCriteria.map((d) => d.key)).toEqual(["core_mechanic", "success_criteria"]);
  });

  it("all dimension scores are clamped 0-100", () => {
    const a = demoAssessment([userMsg("x")], null, threshold);
    for (const score of [a.clarity.score, a.conciseness.score, ...a.dynamicCriteria.map((d) => d.score)]) {
      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(100);
    }
  });
});

describe("demoLesson", () => {
  it("returns a Lesson with all required fields", () => {
    const l = demoLesson([userMsg("an app")]);
    expect(l).toHaveProperty("title");
    expect(l).toHaveProperty("lesson");
    expect(l).toHaveProperty("why");
    expect(l.title.length).toBeGreaterThan(0);
  });
});

describe("demoBuildHtml", () => {
  it("returns valid HTML starting with DOCTYPE", () => {
    const html = demoBuildHtml("Game", "Build a quiz game.", undefined);
    expect(html.trimStart()).toMatch(/^<!DOCTYPE html>/i);
  });

  it("escapes HTML in projectType and refinedPrompt", () => {
    const html = demoBuildHtml('<script>evil</script>', '"xss"', undefined);
    // User-supplied content is escaped in the HTML context (title/h1/sub).
    expect(html).toContain("&lt;script&gt;evil&lt;/script&gt;");
    expect(html).toContain("&quot;xss&quot;");
    // The raw unescaped tag must not appear in any user-controlled slot.
    expect(html).not.toContain("<h1><script>");
  });

  it("includes changeRequest in banner when provided", () => {
    const html = demoBuildHtml("App", "prompt", "make it blue");
    expect(html).toContain("make it blue");
  });
});

describe("demoEdits", () => {
  it("returns a summary and at least one edit", () => {
    const result = demoEdits("change background to dark");
    expect(result.summary).toContain("change background to dark");
    expect(result.edits.length).toBeGreaterThan(0);
    expect(result.edits[0]).toHaveProperty("find");
    expect(result.edits[0]).toHaveProperty("replace");
  });

  it("escapes HTML in changeRequest within the edit replace", () => {
    const result = demoEdits('<script>alert(1)</script>');
    expect(result.edits[0].replace).not.toContain("<script>");
  });
});
