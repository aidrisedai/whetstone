import { describe, it, expect } from "vitest";
import {
  demoAdvisorReply,
  demoAssessment,
  demoLesson,
  demoCoach,
  demoEdits,
  demoBuildHtml,
} from "@/lib/demo";
import type { ChatMessage } from "@/lib/types";

const userMsg = (content: string, images?: ChatMessage["images"]): ChatMessage => ({
  id: "u1",
  role: "user",
  content,
  images,
});
const advisorMsg = (content: string): ChatMessage => ({ id: "a1", role: "advisor", content });

describe("demoAdvisorReply", () => {
  it("returns the closing message when closing=true", () => {
    const reply = demoAdvisorReply([userMsg("test")], true);
    expect(reply.length).toBeGreaterThan(10);
    expect(reply).toMatch(/sharp/i);
  });

  it("returns an image-aware reply on first image turn", () => {
    const history = [
      userMsg("here is my sketch", [{ mediaType: "image/png", data: "abc", name: "sketch.png" }]),
    ];
    const reply = demoAdvisorReply(history, false);
    expect(reply.toLowerCase()).toMatch(/sketch|screen|layout/);
  });

  it("returns a pushback for normal turns", () => {
    const history = [userMsg("I want to build a game for kids")];
    const reply = demoAdvisorReply(history, false);
    expect(reply.length).toBeGreaterThan(20);
  });

  it("cycles through pushback templates as turns increase", () => {
    const replies = new Set<string>();
    for (let i = 1; i <= 6; i++) {
      const history = Array.from({ length: i }, () => userMsg("I want to build an app"));
      replies.add(demoAdvisorReply(history, false));
    }
    expect(replies.size).toBeGreaterThan(1);
  });
});

describe("demoAssessment", () => {
  const history = [userMsg("build a game"), advisorMsg("tell me more"), userMsg("a puzzle game for kids aged 8-12")];

  it("returns a valid Assessment shape", () => {
    const a = demoAssessment(history, null, 80);
    expect(typeof a.overall).toBe("number");
    expect(a.overall).toBeGreaterThanOrEqual(0);
    expect(a.overall).toBeLessThanOrEqual(100);
    expect(a.dynamicCriteria.length).toBeGreaterThan(0);
  });

  it("scores climb as conversation length grows", () => {
    const short = [userMsg("game")];
    const long = Array.from({ length: 10 }, (_, i) =>
      i % 2 === 0 ? userMsg("I want to build a detailed puzzle game for kids who love math") : advisorMsg("tell me more"),
    );
    const shortScore = demoAssessment(short, null, 80).overall;
    const longScore = demoAssessment(long, null, 80).overall;
    expect(longScore).toBeGreaterThanOrEqual(shortScore);
  });

  it("threshold is stamped on the result", () => {
    const a = demoAssessment(history, null, 75);
    expect(a.threshold).toBe(75);
  });

  it("locks dynamic criteria when prior criteria are provided", () => {
    const prior = [{ key: "core_mechanic", label: "Core mechanic", bestPractice: "core_mechanic" }];
    const a = demoAssessment(history, prior, 80);
    expect(a.dynamicCriteria.map((d) => d.key)).toContain("core_mechanic");
  });
});

describe("demoLesson", () => {
  it("returns a Lesson with title, lesson, and why", () => {
    const l = demoLesson([userMsg("test")]);
    expect(typeof l.title).toBe("string");
    expect(typeof l.lesson).toBe("string");
    expect(typeof l.why).toBe("string");
  });

  it("adapts the 'why' based on turn count", () => {
    const fewTurns = [userMsg("a"), userMsg("b")];
    const manyTurns = Array.from({ length: 6 }, () => userMsg("x"));
    const shortWhy = demoLesson(fewTurns).why;
    const longWhy = demoLesson(manyTurns).why;
    expect(shortWhy).not.toBe(longWhy);
  });
});

describe("demoCoach", () => {
  it("returns an intro note on step 1", () => {
    const note = demoCoach(1, "initial");
    expect(note.concept).toBeDefined();
    expect(note.proTip).toBeDefined();
  });

  it("references the change request in later steps", () => {
    const note = demoCoach(2, "add dark mode");
    expect(note.whatChanged).toContain("add dark mode");
  });
});

describe("demoEdits", () => {
  it("returns an EditResult with a summary and at least one edit op", () => {
    const result = demoEdits("change the button color to blue");
    expect(result.summary).toBeDefined();
    expect(result.edits.length).toBeGreaterThan(0);
  });

  it("each edit has find and replace strings", () => {
    const result = demoEdits("add a footer");
    for (const op of result.edits) {
      expect(typeof op.find).toBe("string");
      expect(typeof op.replace).toBe("string");
    }
  });
});

describe("demoBuildHtml", () => {
  it("returns a non-empty HTML string", () => {
    const html = demoBuildHtml("Game", "Build a puzzle game", undefined);
    expect(html.startsWith("<!DOCTYPE html>")).toBe(true);
    expect(html.length).toBeGreaterThan(200);
  });

  it("includes the project type in the title", () => {
    const html = demoBuildHtml("Tracker", "Build a tracker", undefined);
    expect(html).toContain("Tracker");
  });

  it("includes a change banner when changeRequest is provided", () => {
    const html = demoBuildHtml("App", "prompt", "add dark mode");
    expect(html).toContain("add dark mode");
  });

  it("escapes HTML in project type to prevent XSS", () => {
    const html = demoBuildHtml("<script>alert(1)</script>", "prompt", undefined);
    expect(html).not.toContain("<script>alert(1)</script>");
    expect(html).toContain("&lt;script&gt;");
  });
});
