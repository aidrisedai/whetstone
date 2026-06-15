import { describe, it, expect } from "vitest";
import {
  demoAdvisorReply,
  demoAssessment,
  demoLesson,
  demoBuildHtml,
  demoEdits,
} from "./demo";
import type { ChatMessage } from "./types";
import { DIMENSION_FLOOR } from "./scoring";

const uid = () => Math.random().toString(36).slice(2);
const userMsg = (content: string): ChatMessage => ({ id: uid(), role: "user", content });
const advisorMsg = (content: string): ChatMessage => ({ id: uid(), role: "advisor", content });

describe("demoAdvisorReply", () => {
  it("returns a non-empty string", () => {
    const reply = demoAdvisorReply([userMsg("I want to build an app for students")], false);
    expect(typeof reply).toBe("string");
    expect(reply.length).toBeGreaterThan(0);
  });

  it("returns the closing message when phase=closing", () => {
    const reply = demoAdvisorReply([userMsg("some idea")], true);
    expect(reply).toContain("sharp enough to build");
  });

  it("picks a different pushback based on turn count", () => {
    const history1 = [userMsg("I want to build a game")];
    const history3 = [
      userMsg("I want to build a game"),
      advisorMsg("ok"),
      userMsg("a fun puzzle"),
      advisorMsg("ok"),
      userMsg("for mobile"),
    ];
    const r1 = demoAdvisorReply(history1, false);
    const r3 = demoAdvisorReply(history3, false);
    // Different turn counts should produce different pushbacks
    expect(r1).not.toBe(r3);
  });

  it("mentions image context when the first message has an image", () => {
    const history: ChatMessage[] = [
      {
        id: uid(),
        role: "user",
        content: "here's my sketch",
        images: [{ mediaType: "image/png", data: "abc" }],
      },
    ];
    const reply = demoAdvisorReply(history, false);
    expect(reply.toLowerCase()).toMatch(/sketch|screen|layout/);
  });
});

describe("demoAssessment", () => {
  it("returns a valid Assessment shape", () => {
    const history = [userMsg("Build a game tracker for high school esports teams")];
    const result = demoAssessment(history, null, 80);
    expect(result).toHaveProperty("overall");
    expect(result).toHaveProperty("clarity");
    expect(result).toHaveProperty("conciseness");
    expect(result).toHaveProperty("dynamicCriteria");
    expect(result).toHaveProperty("refinedPrompt");
    expect(result).toHaveProperty("ready");
    expect(result).toHaveProperty("threshold", 80);
  });

  it("scores start low and increase with engagement", () => {
    const thin = [userMsg("app")];
    const rich = [
      userMsg("I want to build a budget tracker for high school students who want to track weekly spending on lunch, snacks, and school supplies"),
      advisorMsg("Who exactly and what does done look like?"),
      userMsg("High school freshmen aged 14-16. Done means they can set a weekly budget, log expenses by category, and see which category is over budget with a red alert"),
    ];
    const low = demoAssessment(thin, null, 80);
    const high = demoAssessment(rich, null, 80);
    expect(high.overall).toBeGreaterThan(low.overall);
  });

  it("reuses prior criteria when provided", () => {
    const priorCriteria = [
      { key: "core_mechanic", label: "Core mechanic", bestPractice: "core_mechanic" },
    ];
    const result = demoAssessment([userMsg("game")], priorCriteria, 80);
    const keys = result.dynamicCriteria.map((d) => d.key);
    expect(keys).toContain("core_mechanic");
  });

  it("all scores are in 0-100 range", () => {
    const history = [userMsg("Build anything")];
    const result = demoAssessment(history, null, 80);
    expect(result.clarity.score).toBeGreaterThanOrEqual(0);
    expect(result.clarity.score).toBeLessThanOrEqual(100);
    expect(result.conciseness.score).toBeGreaterThanOrEqual(0);
    expect(result.conciseness.score).toBeLessThanOrEqual(100);
    for (const d of result.dynamicCriteria) {
      expect(d.score).toBeGreaterThanOrEqual(0);
      expect(d.score).toBeLessThanOrEqual(100);
    }
  });

  it("ready=true only when overall>=threshold AND all dims>=floor", () => {
    // Use many rich turns to push scores high enough for ready=true
    const msgs: ChatMessage[] = [];
    const bigContent = "I am building a budget tracker for high school freshmen aged 14-16 to track weekly spending on lunch, snacks, and school supplies. Done means they can set a $50 weekly budget, log expenses by category, and see a red alert when any category exceeds its limit.";
    for (let i = 0; i < 8; i++) {
      msgs.push(userMsg(bigContent));
      msgs.push(advisorMsg("Good, keep going."));
    }
    const result = demoAssessment(msgs, null, 80);
    if (result.ready) {
      expect(result.overall).toBeGreaterThanOrEqual(result.threshold);
      const minScore = Math.min(...[result.clarity.score, result.conciseness.score, ...result.dynamicCriteria.map((d) => d.score)]);
      expect(minScore).toBeGreaterThanOrEqual(DIMENSION_FLOOR);
    }
  });
});

describe("demoLesson", () => {
  it("returns title, lesson, and why", () => {
    const result = demoLesson([userMsg("my idea"), advisorMsg("push"), userMsg("refined")]);
    expect(result).toHaveProperty("title");
    expect(result).toHaveProperty("lesson");
    expect(result).toHaveProperty("why");
    expect(result.title.length).toBeGreaterThan(0);
  });
});

describe("demoBuildHtml", () => {
  it("returns valid HTML starting with DOCTYPE", () => {
    const html = demoBuildHtml("Web app", "Build a tracker");
    expect(html.trim()).toMatch(/^<!DOCTYPE html>/i);
  });

  it("includes the project type as the title", () => {
    const html = demoBuildHtml("Budget Tracker", "Track your money");
    expect(html).toContain("Budget Tracker");
  });

  it("mentions the change request when provided", () => {
    const html = demoBuildHtml("App", "some prompt", "add a dark mode toggle");
    expect(html).toContain("dark mode toggle");
  });

  it("escapes HTML special characters in projectType", () => {
    const html = demoBuildHtml('<script>alert(1)</script>', "prompt");
    expect(html).not.toContain("<script>alert(1)</script>");
    expect(html).toContain("&lt;script&gt;");
  });
});

describe("demoEdits", () => {
  it("returns a summary and at least one edit", () => {
    const result = demoEdits("change the background color to blue");
    expect(result).toHaveProperty("summary");
    expect(Array.isArray(result.edits)).toBe(true);
    expect(result.edits.length).toBeGreaterThan(0);
  });

  it("each edit has find and replace strings", () => {
    const result = demoEdits("add a footer");
    for (const edit of result.edits) {
      expect(typeof edit.find).toBe("string");
      expect(typeof edit.replace).toBe("string");
    }
  });
});
