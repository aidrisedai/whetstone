import { describe, it, expect } from "vitest";
import {
  demoAdvisorReply,
  demoAssessment,
  demoLesson,
  demoEdits,
  demoBuildHtml,
} from "../lib/demo";
import type { ChatMessage } from "../lib/types";

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
  it("returns a closing message when closing=true", () => {
    const reply = demoAdvisorReply([userMsg("an idea")], true);
    expect(reply.length).toBeGreaterThan(0);
    expect(typeof reply).toBe("string");
  });

  it("returns a pushback based on turns", () => {
    const history = [userMsg("I want to build a game for kids")];
    const reply = demoAdvisorReply(history, false);
    expect(typeof reply).toBe("string");
    expect(reply.length).toBeGreaterThan(0);
  });

  it("responds to image turns with a sketch-aware message", () => {
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
  it("returns a valid Assessment structure", () => {
    const history = [userMsg("I want to build a tracker for fitness"), advisorMsg("Tell me more"), userMsg("Users can log workouts daily")];
    const result = demoAssessment(history, null, 80);
    expect(result.overall).toBeGreaterThanOrEqual(0);
    expect(result.overall).toBeLessThanOrEqual(100);
    expect(typeof result.ready).toBe("boolean");
    expect(result.threshold).toBe(80);
    expect(result.clarity.score).toBeGreaterThanOrEqual(0);
    expect(result.conciseness.score).toBeGreaterThanOrEqual(0);
    expect(Array.isArray(result.dynamicCriteria)).toBe(true);
    expect(typeof result.refinedPrompt).toBe("string");
    expect(result.refinedPrompt.length).toBeGreaterThan(0);
  });

  it("score grows with more user turns", () => {
    const few = [userMsg("tracker")];
    const many = [
      userMsg("tracker"),
      advisorMsg("q"),
      userMsg("fitness tracker for teens"),
      advisorMsg("q"),
      userMsg("they can log sets, reps, weight and see weekly charts"),
      advisorMsg("q"),
      userMsg("they want to know if they are improving over time"),
    ];
    const fewResult = demoAssessment(few, null, 80);
    const manyResult = demoAssessment(many, null, 80);
    expect(manyResult.overall).toBeGreaterThan(fewResult.overall);
  });

  it("locks criteria when priorCriteria is provided", () => {
    const prior = [
      { key: "audience", label: "Audience", bestPractice: "define_audience" },
    ];
    const result = demoAssessment([userMsg("a data tool")], prior, 80);
    expect(result.dynamicCriteria).toHaveLength(1);
    expect(result.dynamicCriteria[0].key).toBe("audience");
  });

  it("auto-detects game project type from keywords", () => {
    const history = [userMsg("I want to build a puzzle game with levels and scores")];
    const result = demoAssessment(history, null, 80);
    expect(result.projectType).toBe("Game");
  });
});

describe("demoLesson", () => {
  it("returns a lesson with title, lesson, and why", () => {
    const result = demoLesson([userMsg("an idea"), advisorMsg("q"), userMsg("clarified")]);
    expect(typeof result.title).toBe("string");
    expect(typeof result.lesson).toBe("string");
    expect(typeof result.why).toBe("string");
    expect(result.title.length).toBeGreaterThan(0);
  });
});

describe("demoEdits", () => {
  it("returns a summary and at least one edit", () => {
    const result = demoEdits("add a dark mode toggle");
    expect(typeof result.summary).toBe("string");
    expect(Array.isArray(result.edits)).toBe(true);
    expect(result.edits.length).toBeGreaterThan(0);
    expect(typeof result.edits[0].find).toBe("string");
    expect(typeof result.edits[0].replace).toBe("string");
  });
});

describe("demoBuildHtml", () => {
  it("returns a non-empty HTML string", () => {
    const html = demoBuildHtml("Fitness Tracker", "Build a fitness tracker for teens");
    expect(html.startsWith("<!DOCTYPE html>")).toBe(true);
    expect(html).toContain("Fitness Tracker");
  });

  it("includes changeRequest banner when provided", () => {
    const html = demoBuildHtml("App", "prompt", "add dark mode");
    expect(html).toContain("add dark mode");
  });

  it("escapes HTML in projectType and refinedPrompt user values", () => {
    const html = demoBuildHtml("<script>alert(1)</script>", "<img onerror=alert(1)>", undefined);
    // The user-supplied title should be escaped in the <h1> and <title>
    expect(html).toContain("&lt;script&gt;alert(1)&lt;/script&gt;");
    // The sub paragraph should also escape the img tag
    expect(html).toContain("&lt;img onerror=alert(1)&gt;");
  });
});
