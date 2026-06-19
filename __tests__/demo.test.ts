import { describe, it, expect } from "vitest";
import { demoAdvisorReply, demoAssessment, demoLesson, demoBuildHtml, demoEdits } from "@/lib/demo";
import type { ChatMessage } from "@/lib/types";

function userMsg(content: string): ChatMessage {
  return { id: "u1", role: "user", content };
}
function advisorMsg(content: string): ChatMessage {
  return { id: "a1", role: "advisor", content };
}

describe("demoAdvisorReply", () => {
  it("returns closing message when closing=true", () => {
    const reply = demoAdvisorReply([userMsg("hello")], true);
    expect(reply.toLowerCase()).toMatch(/sharp|build|forge/);
  });

  it("returns a pushback for a normal turn", () => {
    const reply = demoAdvisorReply([userMsg("I want to build a game tracker app")], false);
    expect(reply.length).toBeGreaterThan(20);
  });

  it("reacts to images on early turns", () => {
    const history: ChatMessage[] = [
      { id: "u1", role: "user", content: "here's my sketch", images: [{ mediaType: "image/png", data: "abc" }] },
    ];
    const reply = demoAdvisorReply(history, false);
    expect(reply).toMatch(/sketch|screen|see/i);
  });

  it("cycles through pushback templates based on turn count", () => {
    const history: ChatMessage[] = [
      userMsg("a"), advisorMsg("b"),
      userMsg("c"), advisorMsg("d"),
      userMsg("e"),
    ];
    const reply = demoAdvisorReply(history, false);
    expect(reply.length).toBeGreaterThan(10);
  });
});

describe("demoAssessment", () => {
  it("returns a fully finalized assessment with overall and ready", () => {
    const a = demoAssessment([userMsg("build a game")], null, 80);
    expect(a.overall).toBeGreaterThanOrEqual(0);
    expect(typeof a.ready).toBe("boolean");
    expect(a.threshold).toBe(80);
    expect(a.clarity.score).toBeGreaterThanOrEqual(0);
    expect(a.conciseness.score).toBeGreaterThanOrEqual(0);
  });

  it("detects game project type and picks appropriate criteria", () => {
    const a = demoAssessment([userMsg("I want to build a puzzle game")], null, 80);
    expect(a.projectType).toBe("Game");
    expect(a.dynamicCriteria.some((c) => c.key === "core_mechanic")).toBe(true);
  });

  it("score climbs with more engagement (more turns and chars)", () => {
    const thin = demoAssessment([userMsg("app")], null, 80);
    const rich = demoAssessment(
      [
        userMsg("I want to make a budget tracker for high school students"),
        advisorMsg("who specifically?"),
        userMsg("students aged 14–18 who get allowances and want to save for specific goals like a new game or sneakers"),
      ],
      null,
      80,
    );
    expect(rich.overall).toBeGreaterThan(thin.overall);
  });

  it("reuses prior criteria when provided", () => {
    const prior = [
      { key: "define_audience", label: "Audience", bestPractice: "define_audience" },
      { key: "success_criteria", label: "Success", bestPractice: "success_criteria" },
    ];
    const a = demoAssessment([userMsg("build a tool")], prior, 80);
    expect(a.dynamicCriteria.map((c) => c.key)).toEqual(["define_audience", "success_criteria"]);
  });
});

describe("demoLesson", () => {
  it("returns a lesson with title, lesson, and why", () => {
    const l = demoLesson([userMsg("test"), advisorMsg("good")]);
    expect(l.title.length).toBeGreaterThan(0);
    expect(l.lesson.length).toBeGreaterThan(0);
    expect(l.why.length).toBeGreaterThan(0);
  });
});

describe("demoBuildHtml", () => {
  it("produces a self-contained HTML file", () => {
    const html = demoBuildHtml("Game", "Build a simple quiz game.", undefined);
    expect(html).toMatch(/<!DOCTYPE html/i);
    expect(html).toMatch(/<\/html>/i);
    expect(html).not.toMatch(/https?:\/\//); // no external requests
  });

  it("escapes user-supplied HTML in projectType and refinedPrompt", () => {
    const html = demoBuildHtml("<script>alert(1)</script>", '<img onerror="xss">', undefined);
    // User input must be HTML-escaped so it can't inject tags
    expect(html).toMatch(/&lt;script&gt;/);
    expect(html).toMatch(/&lt;img/);
    // The raw unescaped user payload must not be present verbatim
    expect(html).not.toMatch(/<script>alert\(1\)<\/script>/);
    expect(html).not.toMatch(/onerror="xss"/);
  });

  it("includes changeRequest note in banner when provided", () => {
    const html = demoBuildHtml("App", "prompt", "add dark mode");
    expect(html).toMatch(/add dark mode/);
  });
});

describe("demoEdits", () => {
  it("returns a valid EditResult with at least one edit", () => {
    const result = demoEdits("add a footer");
    expect(result.edits.length).toBeGreaterThan(0);
    expect(result.edits[0].find).toBeTruthy();
    expect(result.edits[0].replace).toBeTruthy();
    expect(result.summary.length).toBeGreaterThan(0);
  });

  it("escapes HTML in the change request so output is safe", () => {
    const result = demoEdits('<script>alert("xss")</script>');
    // The replacement text must not contain raw unescaped script tags
    expect(result.edits[0].replace).not.toMatch(/<script>/i);
  });
});
