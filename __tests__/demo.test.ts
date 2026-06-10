import { describe, it, expect } from "vitest";
import {
  demoAdvisorReply,
  demoAssessment,
  demoLesson,
  demoBuildHtml,
  demoEdits,
  demoPlan,
} from "../lib/demo";
import type { ChatMessage, CriterionSpec } from "../lib/types";

const userMsg = (content: string): ChatMessage => ({
  id: "1",
  role: "user",
  content,
});

const advisorMsg = (content: string): ChatMessage => ({
  id: "2",
  role: "advisor",
  content,
});

describe("demoAdvisorReply", () => {
  it("returns the closing note when phase=closing", () => {
    const reply = demoAdvisorReply([userMsg("my app idea")], true);
    expect(reply).toContain("sharp enough to build");
  });

  it("returns a pushback for regular turns", () => {
    const reply = demoAdvisorReply([userMsg("I want to build a tracker app")], false);
    expect(reply.length).toBeGreaterThan(20);
  });

  it("reacts to an image in the history", () => {
    const history: ChatMessage[] = [
      { id: "1", role: "user", content: "here's my idea", images: [{ mediaType: "image/png", data: "abc" }] },
    ];
    const reply = demoAdvisorReply(history, false);
    expect(reply).toContain("sketch");
  });
});

describe("demoAssessment", () => {
  it("returns a valid Assessment shape", () => {
    const result = demoAssessment([userMsg("build a game")], null, 80);
    expect(result).toHaveProperty("clarity");
    expect(result).toHaveProperty("conciseness");
    expect(result).toHaveProperty("dynamicCriteria");
    expect(result).toHaveProperty("overall");
    expect(result).toHaveProperty("ready");
    expect(result).toHaveProperty("threshold");
    expect(result.threshold).toBe(80);
  });

  it("detects a game project type", () => {
    const result = demoAssessment([userMsg("I want to build a game where players score points")], null, 80);
    expect(result.projectType).toBe("Game");
  });

  it("uses prior criteria when provided", () => {
    const prior: CriterionSpec[] = [
      { key: "custom_key", label: "Custom", bestPractice: "be_clear_and_direct" },
    ];
    const result = demoAssessment([userMsg("build a chatbot")], prior, 80);
    expect(result.dynamicCriteria.map((d) => d.key)).toContain("custom_key");
  });

  it("scores climb with more user engagement", () => {
    const few = [userMsg("app")];
    const many = [
      userMsg("I want to build a fitness tracking app for runners who train for marathons"),
      advisorMsg("Who exactly?"),
      userMsg("Adult amateur runners aged 25–45 training for their first marathon, needing a weekly plan"),
      advisorMsg("And what does success look like?"),
      userMsg("They finish the marathon without injury — the app sends them daily check-ins and adjusts the plan"),
    ];
    const low = demoAssessment(few, null, 80);
    const high = demoAssessment(many, null, 80);
    expect(high.overall).toBeGreaterThan(low.overall);
  });

  it("all dimension scores are in range 0-100", () => {
    const result = demoAssessment([userMsg("build a data dashboard for students")], null, 80);
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
  it("returns a lesson with title, lesson, and why fields", () => {
    const result = demoLesson([userMsg("my idea"), advisorMsg("sharpen"), userMsg("better idea")]);
    expect(result).toHaveProperty("title");
    expect(result).toHaveProperty("lesson");
    expect(result).toHaveProperty("why");
    expect(result.title.length).toBeGreaterThan(0);
  });
});

describe("demoBuildHtml", () => {
  it("returns a self-contained HTML document", () => {
    const html = demoBuildHtml("Web app", "Build a todo list app");
    expect(html).toMatch(/<!DOCTYPE html/i);
    expect(html).toMatch(/<\/html>/i);
    expect(html).toMatch(/<body/i);
  });

  it("includes the project type in the output", () => {
    const html = demoBuildHtml("My Tracker", "Track things");
    expect(html).toContain("My Tracker");
  });

  it("shows the change request when provided", () => {
    const html = demoBuildHtml("App", "Build it", "add a dark mode toggle");
    expect(html).toContain("dark mode toggle");
  });

  it("escapes HTML entities in inputs to prevent XSS", () => {
    const html = demoBuildHtml('<script>alert("xss")</script>', "Build it");
    expect(html).not.toContain("<script>alert");
    expect(html).toContain("&lt;script&gt;");
  });
});

describe("demoEdits", () => {
  it("returns a valid EditResult shape", () => {
    const result = demoEdits("change the color to blue");
    expect(result).toHaveProperty("summary");
    expect(result).toHaveProperty("edits");
    expect(Array.isArray(result.edits)).toBe(true);
    expect(result.edits.length).toBeGreaterThan(0);
  });

  it("edits target </body> as an anchor", () => {
    const result = demoEdits("add a button");
    expect(result.edits[0].find).toBe("</body>");
    expect(result.edits[0].replace).toContain("</body>");
  });
});

describe("demoPlan", () => {
  it("returns a plan with 3 parts", () => {
    const plan = demoPlan("Web app", "Build a tracker", "Alex", "Minecraft");
    expect(plan.parts).toHaveLength(3);
  });

  it("includes the project name in the bigPicture", () => {
    const plan = demoPlan("Fitness app", "Build something", "", "");
    expect(plan.bigPicture.toLowerCase()).toContain("fitness");
  });

  it("includes the favorite game when provided", () => {
    const plan = demoPlan("Game", "Build a game", "Sam", "Fortnite");
    expect(plan.bigPicture).toContain("Fortnite");
  });

  it("each part has required fields", () => {
    const plan = demoPlan("App", "Build it", "", "");
    for (const part of plan.parts) {
      expect(part).toHaveProperty("title");
      expect(part).toHaveProperty("whatItIs");
      expect(part).toHaveProperty("why");
      expect(part).toHaveProperty("concept");
      expect(part).toHaveProperty("buildSpec");
    }
  });
});
