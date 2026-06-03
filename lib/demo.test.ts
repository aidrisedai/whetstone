import { describe, it, expect } from "vitest";
import {
  demoAdvisorReply,
  demoAssessment,
  demoLesson,
  demoBuildHtml,
  demoEdits,
} from "./demo";
import type { ChatMessage } from "./types";

function userMsg(content: string, images?: ChatMessage["images"]): ChatMessage {
  return { id: "u1", role: "user", content, images };
}

function advisorMsg(content: string): ChatMessage {
  return { id: "a1", role: "advisor", content };
}

// ── demoAdvisorReply ──────────────────────────────────────────────────────────

describe("demoAdvisorReply", () => {
  it("returns a non-empty string", () => {
    const history: ChatMessage[] = [userMsg("I want to build a todo app")];
    expect(demoAdvisorReply(history, false)).toBeTruthy();
  });

  it("returns a closing message when closing=true", () => {
    const history: ChatMessage[] = [userMsg("final idea")];
    const reply = demoAdvisorReply(history, true);
    expect(reply).toContain("sharp enough to build");
  });

  it("reacts to an image attachment in early turns", () => {
    const history: ChatMessage[] = [
      userMsg("here is my sketch", [{ mediaType: "image/png", data: "abc123" }]),
    ];
    const reply = demoAdvisorReply(history, false);
    expect(reply).toMatch(/sketch|screen|layout/i);
  });

  it("cycles through pushback prompts across turns", () => {
    const r1 = demoAdvisorReply([userMsg("turn 1")], false);
    const r2 = demoAdvisorReply([userMsg("t1"), advisorMsg("ok"), userMsg("turn 2")], false);
    expect(typeof r1).toBe("string");
    expect(typeof r2).toBe("string");
    expect(r1).not.toBe(r2);
  });
});

// ── demoAssessment ────────────────────────────────────────────────────────────

describe("demoAssessment", () => {
  it("returns a valid Assessment shape", () => {
    const a = demoAssessment([userMsg("game with levels")], null, 80);
    expect(a).toHaveProperty("clarity");
    expect(a).toHaveProperty("conciseness");
    expect(a).toHaveProperty("dynamicCriteria");
    expect(a).toHaveProperty("overall");
    expect(a).toHaveProperty("ready");
    expect(a).toHaveProperty("threshold");
    expect(a).toHaveProperty("refinedPrompt");
    expect(a).toHaveProperty("projectType");
  });

  it("keeps all scores in [0, 100]", () => {
    const a = demoAssessment([userMsg("an app")], null, 80);
    const scores = [
      a.clarity.score,
      a.conciseness.score,
      ...a.dynamicCriteria.map((d) => d.score),
      a.overall,
    ];
    for (const s of scores) {
      expect(s).toBeGreaterThanOrEqual(0);
      expect(s).toBeLessThanOrEqual(100);
    }
  });

  it("scores climb with more substantive turns", () => {
    const short = demoAssessment([userMsg("app")], null, 80);
    const longHistory: ChatMessage[] = Array.from({ length: 8 }, (_, i) =>
      i % 2 === 0
        ? userMsg(`detailed idea turn ${i} with lots of specifics about the users and goals`)
        : advisorMsg("push"),
    );
    const rich = demoAssessment(longHistory, null, 80);
    expect(rich.overall).toBeGreaterThanOrEqual(short.overall);
  });

  it("reuses priorCriteria keys when provided", () => {
    const prior = [
      { key: "core_mechanic", label: "Core mechanic", bestPractice: "core_mechanic" },
      { key: "success_criteria", label: "Win state", bestPractice: "success_criteria" },
    ];
    const a = demoAssessment([userMsg("game")], prior, 80);
    const keys = a.dynamicCriteria.map((d) => d.key);
    expect(keys).toContain("core_mechanic");
    expect(keys).toContain("success_criteria");
  });

  it("detects game project type from user messages", () => {
    const a = demoAssessment([userMsg("a puzzle game with levels and score")], null, 80);
    expect(a.projectType).toBe("Game");
  });

  it("falls back to Web app project type for unrecognized input", () => {
    const a = demoAssessment([userMsg("a tool for organizing recipes")], null, 80);
    expect(a.projectType).toBe("Web app");
  });

  it("stamps the given threshold", () => {
    const a = demoAssessment([userMsg("x")], null, 75);
    expect(a.threshold).toBe(75);
  });
});

// ── demoLesson ────────────────────────────────────────────────────────────────

describe("demoLesson", () => {
  it("returns a Lesson with title, lesson, and why", () => {
    const l = demoLesson([userMsg("idea")]);
    expect(l).toHaveProperty("title");
    expect(l).toHaveProperty("lesson");
    expect(l).toHaveProperty("why");
    expect(l.title.length).toBeGreaterThan(0);
    expect(l.lesson.length).toBeGreaterThan(0);
    expect(l.why.length).toBeGreaterThan(0);
  });
});

// ── demoBuildHtml ─────────────────────────────────────────────────────────────

describe("demoBuildHtml", () => {
  it("starts with <!DOCTYPE html>", () => {
    const html = demoBuildHtml("Game", "Build a game", undefined);
    expect(html.trimStart()).toMatch(/^<!DOCTYPE html>/i);
  });

  it("contains the project type in the output", () => {
    const html = demoBuildHtml("Tracker", "Build a tracker", undefined);
    expect(html).toContain("Tracker");
  });

  it("escapes HTML entities in projectType to prevent XSS", () => {
    const html = demoBuildHtml('<script>alert(1)</script>', "prompt", undefined);
    expect(html).not.toContain("<script>alert(1)</script>");
    expect(html).toContain("&lt;script&gt;");
  });

  it("escapes HTML entities in refinedPrompt", () => {
    const html = demoBuildHtml("App", '<img src=x onerror="evil()">', undefined);
    expect(html).not.toContain('<img src=x onerror="evil()">');
  });

  it("includes the changeRequest note when provided", () => {
    const html = demoBuildHtml("App", "prompt", "add a dark mode");
    expect(html).toContain("add a dark mode");
  });

  it("closes with </html>", () => {
    const html = demoBuildHtml("App", "prompt", undefined);
    expect(html.trimEnd()).toMatch(/<\/html>$/i);
  });
});

// ── demoEdits ─────────────────────────────────────────────────────────────────

describe("demoEdits", () => {
  it("returns an EditResult with summary and edits", () => {
    const result = demoEdits("change the button colour");
    expect(result).toHaveProperty("summary");
    expect(result).toHaveProperty("edits");
    expect(Array.isArray(result.edits)).toBe(true);
    expect(result.edits.length).toBeGreaterThan(0);
  });

  it("each edit has find and replace strings", () => {
    const result = demoEdits("anything");
    for (const edit of result.edits) {
      expect(typeof edit.find).toBe("string");
      expect(typeof edit.replace).toBe("string");
    }
  });

  it("find targets a real HTML anchor (</body>)", () => {
    const result = demoEdits("test");
    expect(result.edits[0].find).toBe("</body>");
  });
});
