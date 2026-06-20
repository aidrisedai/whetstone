import { describe, it, expect } from "vitest";
import {
  demoAdvisorReply,
  demoAssessment,
  demoLesson,
  demoBuildHtml,
  demoPlan,
  demoExtendPart,
} from "../demo";
import type { ChatMessage } from "../types";

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

// ── demoAdvisorReply ───────────────────────────────────────────────────────

describe("demoAdvisorReply", () => {
  it("returns a non-empty string", () => {
    const reply = demoAdvisorReply([userMsg("I want to build a game")], false);
    expect(typeof reply).toBe("string");
    expect(reply.length).toBeGreaterThan(0);
  });

  it("returns the closing message when closing=true", () => {
    const reply = demoAdvisorReply([userMsg("hello")], true);
    expect(reply).toContain("forge it");
  });

  it("reacts to image attachments on early turns", () => {
    const history: ChatMessage[] = [
      { id: "u1", role: "user", content: "here is my sketch", images: [{ mediaType: "image/png", data: "abc" }] },
    ];
    const reply = demoAdvisorReply(history, false);
    expect(reply).toContain("sketch");
  });

  it("cycles through pushbacks as turn count rises", () => {
    const history: ChatMessage[] = [];
    for (let i = 0; i < 6; i++) {
      history.push(userMsg(`message ${i}`));
      history.push(advisorMsg("reply"));
    }
    const reply = demoAdvisorReply(history, false);
    expect(typeof reply).toBe("string");
    expect(reply.length).toBeGreaterThan(10);
  });
});

// ── demoAssessment ─────────────────────────────────────────────────────────

describe("demoAssessment", () => {
  it("returns a valid Assessment shape", () => {
    const a = demoAssessment([userMsg("I want to build a chatbot for students")], null, 80);
    expect(typeof a.overall).toBe("number");
    expect(typeof a.ready).toBe("boolean");
    expect(typeof a.projectType).toBe("string");
    expect(typeof a.refinedPrompt).toBe("string");
    expect(Array.isArray(a.dynamicCriteria)).toBe(true);
  });

  it("all scores are clamped to 0-100", () => {
    const a = demoAssessment([userMsg("build a tracker dashboard")], null, 80);
    const all = [a.clarity.score, a.conciseness.score, ...a.dynamicCriteria.map((d) => d.score)];
    for (const s of all) {
      expect(s).toBeGreaterThanOrEqual(0);
      expect(s).toBeLessThanOrEqual(100);
    }
  });

  it("detects Game type from keywords", () => {
    const a = demoAssessment([userMsg("I want to build a puzzle game for mobile")], null, 80);
    expect(a.projectType).toBe("Game");
  });

  it("detects AI assistant type from keywords", () => {
    const a = demoAssessment([userMsg("an AI tutor for learning Python")], null, 80);
    expect(a.projectType).toBe("AI assistant");
  });

  it("falls back to Web app type for unrecognized input", () => {
    const a = demoAssessment([userMsg("a thing for organizing my life")], null, 80);
    expect(a.projectType).toBe("Web app");
  });

  it("locks dynamic criteria when priorCriteria provided", () => {
    const prior = [
      { key: "core_mechanic", label: "Core mechanic", bestPractice: "core_mechanic" },
      { key: "success_criteria", label: "Win / lose state", bestPractice: "success_criteria" },
    ];
    const a = demoAssessment([userMsg("a puzzle game")], prior, 80);
    expect(a.dynamicCriteria.map((d) => d.key)).toEqual(["core_mechanic", "success_criteria"]);
  });

  it("overall climbs as conversation gets richer", () => {
    const short = [userMsg("app")];
    const rich = Array.from({ length: 8 }, (_, i) =>
      userMsg(`I am building a project management tool for remote teams — the core feature is ${i} asynchronous standups`)
    );
    const shortScore = demoAssessment(short, null, 80).overall;
    const richScore = demoAssessment(rich, null, 80).overall;
    expect(richScore).toBeGreaterThan(shortScore);
  });
});

// ── demoLesson ─────────────────────────────────────────────────────────────

describe("demoLesson", () => {
  it("returns a Lesson with title, lesson, why", () => {
    const l = demoLesson([userMsg("hello")]);
    expect(typeof l.title).toBe("string");
    expect(typeof l.lesson).toBe("string");
    expect(typeof l.why).toBe("string");
  });

  it("adjusts 'why' based on turn count", () => {
    const short = demoLesson([userMsg("hi")]);
    const long = demoLesson(Array.from({ length: 6 }, () => userMsg("more context")));
    expect(short.why).not.toBe(long.why);
  });
});

// ── demoBuildHtml ──────────────────────────────────────────────────────────

describe("demoBuildHtml", () => {
  it("returns a string containing <!DOCTYPE html>", () => {
    const html = demoBuildHtml("Game", "Build a puzzle game", undefined);
    expect(html).toContain("<!DOCTYPE html>");
  });

  it("includes the project type in the output", () => {
    const html = demoBuildHtml("Data tool", "Track my budget", undefined);
    expect(html).toContain("Data tool");
  });

  it("escapes HTML in projectType to prevent XSS", () => {
    const html = demoBuildHtml('<script>alert(1)</script>', "safe prompt", undefined);
    expect(html).not.toContain("<script>alert(1)</script>");
    expect(html).toContain("&lt;script&gt;");
  });

  it("includes changeRequest note when provided", () => {
    const html = demoBuildHtml("App", "a thing", "add dark mode");
    expect(html).toContain("add dark mode");
  });

  it("shows demo API-key prompt when no changeRequest", () => {
    const html = demoBuildHtml("App", "a thing", undefined);
    expect(html).toContain("ANTHROPIC_API_KEY");
  });
});

// ── demoPlan ───────────────────────────────────────────────────────────────

describe("demoPlan", () => {
  it("returns a plan with exactly 3 parts", () => {
    const plan = demoPlan("Game", "Build a game", "Alice", "Minecraft");
    expect(plan.parts).toHaveLength(3);
  });

  it("includes the builder's name in bigPicture when provided", () => {
    const plan = demoPlan("App", "a thing", "Bob", "");
    expect(plan.bigPicture).toContain("Bob");
  });

  it("includes the game reference when favoriteGame is set", () => {
    const plan = demoPlan("App", "a thing", "Alice", "Fortnite");
    expect(plan.bigPicture).toContain("Fortnite");
  });

  it("every part has title, whatItIs, why, concept, buildSpec", () => {
    const plan = demoPlan("App", "a thing", "", "");
    for (const part of plan.parts) {
      expect(typeof part.title).toBe("string");
      expect(typeof part.whatItIs).toBe("string");
      expect(typeof part.why).toBe("string");
      expect(typeof part.concept).toBe("string");
      expect(typeof part.buildSpec).toBe("string");
    }
  });
});

// ── demoExtendPart ─────────────────────────────────────────────────────────

describe("demoExtendPart", () => {
  it("returns a part with required fields", () => {
    const part = demoExtendPart("add a dark mode toggle");
    expect(typeof part.title).toBe("string");
    expect(typeof part.whatItIs).toBe("string");
    expect(typeof part.buildSpec).toBe("string");
    expect(part.buildSpec).toContain("add a dark mode toggle");
  });
});
