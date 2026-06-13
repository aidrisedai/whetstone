import { describe, it, expect } from "vitest";
import {
  demoAdvisorReply,
  demoAssessment,
  demoLesson,
  demoPlan,
  demoEdits,
  demoCoach,
  demoBuildHtml,
} from "@/lib/demo";
import type { ChatMessage } from "@/lib/types";

const userMsg = (content: string): ChatMessage => ({
  id: "u1",
  role: "user",
  content,
});

const history = (msgs: ChatMessage[]): ChatMessage[] => msgs;

describe("demoAdvisorReply", () => {
  it("returns a closing message when phase is closing", () => {
    const reply = demoAdvisorReply(history([userMsg("hello")]), true);
    expect(typeof reply).toBe("string");
    expect(reply.length).toBeGreaterThan(20);
    expect(reply).not.toContain("?"); // closing doesn't ask another question
  });

  it("returns a pushback question on normal turns", () => {
    const reply = demoAdvisorReply(history([userMsg("I want to build an app for students")]), false);
    expect(typeof reply).toBe("string");
    expect(reply.length).toBeGreaterThan(10);
  });

  it("responds to images on early turns", () => {
    const msgWithImage: ChatMessage = {
      id: "u1",
      role: "user",
      content: "here is my mockup",
      images: [{ mediaType: "image/png", data: "abc123" }],
    };
    const reply = demoAdvisorReply(history([msgWithImage]), false);
    expect(typeof reply).toBe("string");
    expect(reply).toContain("sketch");
  });
});

describe("demoAssessment", () => {
  it("returns a valid Assessment with all required fields", () => {
    const h = history([userMsg("Build a todo app for students")]);
    const a = demoAssessment(h, null, 80);
    expect(typeof a.overall).toBe("number");
    expect(a.overall).toBeGreaterThanOrEqual(0);
    expect(a.overall).toBeLessThanOrEqual(100);
    expect(typeof a.ready).toBe("boolean");
    expect(a.threshold).toBe(80);
    expect(typeof a.clarity.score).toBe("number");
    expect(typeof a.conciseness.score).toBe("number");
    expect(Array.isArray(a.dynamicCriteria)).toBe(true);
    expect(a.dynamicCriteria.length).toBeGreaterThan(0);
    expect(typeof a.refinedPrompt).toBe("string");
    expect(a.refinedPrompt.length).toBeGreaterThan(0);
  });

  it("reuses prior criteria when supplied", () => {
    const h = history([userMsg("Build a game")]);
    const prior = [
      { key: "core_mechanic", label: "Core mechanic", bestPractice: "core_mechanic" },
      { key: "success_criteria", label: "Win/lose", bestPractice: "success_criteria" },
    ];
    const a = demoAssessment(h, prior, 80);
    expect(a.dynamicCriteria.length).toBe(2);
    expect(a.dynamicCriteria[0].key).toBe("core_mechanic");
    expect(a.dynamicCriteria[1].key).toBe("success_criteria");
  });

  it("scores rise with more user turns and content", () => {
    const thin = history([userMsg("app")]);
    const rich = history([
      userMsg("I want to build a productivity tracker for high school students"),
      { id: "a1", role: "advisor", content: "Who exactly?" },
      userMsg("Specifically, 10th graders managing homework and extracurriculars, tracking time per subject"),
      { id: "a2", role: "advisor", content: "What does done look like?" },
      userMsg("They can see a weekly report showing which subjects they're falling behind on and get nudged to rebalance"),
    ]);
    const aThin = demoAssessment(thin, null, 80);
    const aRich = demoAssessment(rich, null, 80);
    expect(aRich.overall).toBeGreaterThan(aThin.overall);
  });

  it("detects game-type projects and picks game criteria", () => {
    const h = history([userMsg("I want to build a puzzle game with levels and a score system")]);
    const a = demoAssessment(h, null, 80);
    expect(a.projectType).toBe("Game");
    expect(a.dynamicCriteria.some((d) => d.key === "core_mechanic")).toBe(true);
  });
});

describe("demoLesson", () => {
  it("returns a lesson with title, lesson, and why", () => {
    const h = history([userMsg("hello"), { id: "a1", role: "advisor", content: "push" }]);
    const l = demoLesson(h);
    expect(typeof l.title).toBe("string");
    expect(typeof l.lesson).toBe("string");
    expect(typeof l.why).toBe("string");
  });
});

describe("demoPlan", () => {
  it("returns a plan with projectName, bigPicture, and 3 parts", () => {
    const p = demoPlan("Web app", "Build a task tracker", "Alex", "Minecraft");
    expect(typeof p.projectName).toBe("string");
    expect(typeof p.bigPicture).toBe("string");
    expect(Array.isArray(p.parts)).toBe(true);
    expect(p.parts.length).toBe(3);
  });

  it("each part has all required fields", () => {
    const { parts } = demoPlan("Game", "Build a game", "", "");
    for (const part of parts) {
      expect(typeof part.title).toBe("string");
      expect(typeof part.whatItIs).toBe("string");
      expect(typeof part.why).toBe("string");
      expect(typeof part.concept).toBe("string");
      expect(typeof part.buildSpec).toBe("string");
    }
  });
});

describe("demoEdits", () => {
  it("returns a valid EditResult with summary and edits", () => {
    const r = demoEdits("add a dark mode toggle");
    expect(typeof r.summary).toBe("string");
    expect(Array.isArray(r.edits)).toBe(true);
    expect(r.edits.length).toBeGreaterThan(0);
    for (const e of r.edits) {
      expect(typeof e.find).toBe("string");
      expect(typeof e.replace).toBe("string");
    }
  });

  it("the find string targets </body>", () => {
    const r = demoEdits("anything");
    expect(r.edits[0].find).toBe("</body>");
  });
});

describe("demoCoach", () => {
  it("returns a coaching note for step 1 (initial build)", () => {
    const note = demoCoach(1, "");
    expect(typeof note.whatChanged).toBe("string");
    expect(typeof note.concept).toBe("string");
    expect(typeof note.proTip).toBe("string");
  });

  it("returns a change-specific note for later steps", () => {
    const note = demoCoach(2, "add a search bar");
    expect(note.whatChanged).toContain("add a search bar");
  });
});

describe("demoBuildHtml", () => {
  it("returns a valid self-contained HTML document", () => {
    const html = demoBuildHtml("Todo App", "Build a todo app for students");
    expect(html).toMatch(/<!DOCTYPE html/i);
    expect(html).toContain("</html>");
    expect(html).toContain("<body");
    expect(html).toContain("<script");
    expect(html).toContain("<style");
  });

  it("includes the project type as a heading", () => {
    const html = demoBuildHtml("Budget Tracker", "Track monthly expenses");
    expect(html).toContain("Budget Tracker");
  });

  it("shows change request in banner when provided", () => {
    const html = demoBuildHtml("My App", "prompt", "add dark mode");
    expect(html).toContain("add dark mode");
  });

  it("does not contain external URLs (offline requirement)", () => {
    const html = demoBuildHtml("App", "prompt");
    // No CDN or external resource links
    expect(html).not.toMatch(/https?:\/\//);
  });
});
