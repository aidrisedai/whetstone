import { describe, it, expect } from "vitest";
import { demoAdvisorReply, demoAssessment, demoLesson, demoBuildHtml } from "@/lib/demo";
import type { ChatMessage } from "@/lib/types";

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
  it("returns the closing message when phase is closing", () => {
    const reply = demoAdvisorReply([userMsg("hello")], true);
    expect(reply).toMatch(/sharp enough to build/i);
  });

  it("returns a pushback for normal turns", () => {
    const reply = demoAdvisorReply([userMsg("I want to build a game")], false);
    expect(typeof reply).toBe("string");
    expect(reply.length).toBeGreaterThan(10);
  });

  it("reacts to an image attachment", () => {
    const history: ChatMessage[] = [
      { id: "u1", role: "user", content: "here's my sketch", images: [{ mediaType: "image/png", data: "abc" }] },
    ];
    const reply = demoAdvisorReply(history, false);
    expect(reply).toMatch(/sketch/i);
  });

  it("advances through pushbacks as turns increase", () => {
    const history: ChatMessage[] = [
      userMsg("turn 1"), advisorMsg("r1"),
      userMsg("turn 2"), advisorMsg("r2"),
      userMsg("turn 3"), advisorMsg("r3"),
      userMsg("turn 4"),
    ];
    const reply = demoAdvisorReply(history, false);
    expect(typeof reply).toBe("string");
    expect(reply.length).toBeGreaterThan(0);
  });
});

describe("demoAssessment", () => {
  it("returns a valid Assessment shape", () => {
    const history = [userMsg("I want to build a todo app"), advisorMsg("Who is it for?")];
    const result = demoAssessment(history, null, 80);
    expect(result).toHaveProperty("projectType");
    expect(result).toHaveProperty("clarity");
    expect(result).toHaveProperty("conciseness");
    expect(result).toHaveProperty("dynamicCriteria");
    expect(result).toHaveProperty("overall");
    expect(result).toHaveProperty("ready");
    expect(result).toHaveProperty("threshold", 80);
    expect(result).toHaveProperty("refinedPrompt");
  });

  it("scores rise with more substantive turns", () => {
    const shortHistory = [userMsg("app")];
    const longHistory = Array.from({ length: 6 }, (_, i) =>
      i % 2 === 0
        ? userMsg(`turn ${i} with lots of specific detail about the audience and core mechanic`)
        : advisorMsg("push back")
    );
    const shortResult = demoAssessment(shortHistory, null, 80);
    const longResult = demoAssessment(longHistory, null, 80);
    expect(longResult.overall).toBeGreaterThan(shortResult.overall);
  });

  it("locks to prior criteria when provided", () => {
    const priorCriteria = [
      { key: "core_mechanic", label: "Core mechanic", bestPractice: "core_mechanic" },
    ];
    const history = [userMsg("I want to build a puzzle game")];
    const result = demoAssessment(history, priorCriteria, 80);
    expect(result.dynamicCriteria[0].key).toBe("core_mechanic");
  });

  it("detects game project type", () => {
    const history = [userMsg("I want to build a game with levels and scores")];
    const result = demoAssessment(history, null, 80);
    expect(result.projectType).toBe("Game");
  });

  it("scores are all in 0-100 range", () => {
    const history = [userMsg("I want to build a chatbot assistant for students")];
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

describe("demoLesson", () => {
  it("returns a Lesson with title, lesson, and why", () => {
    const result = demoLesson([userMsg("hello")]);
    expect(result).toHaveProperty("title");
    expect(result).toHaveProperty("lesson");
    expect(result).toHaveProperty("why");
  });

  it("varies the why based on number of turns", () => {
    const shortHistory = [userMsg("hi")];
    const longHistory = [
      userMsg("t1"), advisorMsg("r1"),
      userMsg("t2"), advisorMsg("r2"),
      userMsg("t3"), advisorMsg("r3"),
      userMsg("t4"), advisorMsg("r4"),
      userMsg("t5"),
    ];
    const shortLesson = demoLesson(shortHistory);
    const longLesson = demoLesson(longHistory);
    expect(shortLesson.why).not.toBe(longLesson.why);
  });
});

describe("demoBuildHtml", () => {
  it("returns a complete HTML document", () => {
    const html = demoBuildHtml("Todo App", "Build a todo tracker");
    expect(html).toMatch(/^<!DOCTYPE html>/);
    expect(html).toContain("</html>");
    expect(html).toContain("Todo App");
  });

  it("escapes HTML special characters in projectType", () => {
    const html = demoBuildHtml('<script>alert(1)</script>', "prompt");
    expect(html).not.toContain("<script>alert(1)</script>");
    expect(html).toContain("&lt;script&gt;");
  });

  it("includes the changeRequest note when provided", () => {
    const html = demoBuildHtml("App", "prompt", "add dark mode");
    expect(html).toContain("add dark mode");
  });

  it("includes the demo banner when no changeRequest", () => {
    const html = demoBuildHtml("App", "prompt");
    expect(html).toContain("Demo build");
  });
});
