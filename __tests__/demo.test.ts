import { describe, it, expect } from "vitest";
import {
  demoAdvisorReply,
  demoAssessment,
  demoLesson,
  demoBuildHtml,
  demoEdits,
  demoPlan,
  demoQuiz,
  demoExtendPart,
} from "@/lib/demo";
import { DIMENSION_FLOOR } from "@/lib/scoring";
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
  it("returns closing message when closing=true", () => {
    const reply = demoAdvisorReply([userMsg("test")], true);
    expect(reply.length).toBeGreaterThan(0);
    expect(typeof reply).toBe("string");
  });

  it("returns a pushback for a normal turn", () => {
    const reply = demoAdvisorReply([userMsg("I want to build a game")], false);
    expect(reply.length).toBeGreaterThan(0);
  });

  it("reacts to image attachment", () => {
    const msgs: ChatMessage[] = [
      { id: "u1", role: "user", content: "here is my sketch", images: [{ mediaType: "image/png", data: "abc" }] },
    ];
    const reply = demoAdvisorReply(msgs, false);
    expect(reply.length).toBeGreaterThan(0);
  });

  it("returns a string for empty history", () => {
    expect(typeof demoAdvisorReply([], false)).toBe("string");
  });
});

describe("demoAssessment", () => {
  const threshold = 80;

  it("returns an assessment with the correct structure", () => {
    const a = demoAssessment([userMsg("game with levels")], null, threshold);
    expect(typeof a.overall).toBe("number");
    expect(typeof a.ready).toBe("boolean");
    expect(a.threshold).toBe(threshold);
    expect(a.dynamicCriteria.length).toBeGreaterThan(0);
  });

  it("scores increase as turns accumulate", () => {
    const few = [userMsg("app")];
    const many = [
      userMsg("I want a game where you shoot asteroids"),
      advisorMsg("Who exactly?"),
      userMsg("10 year olds on phones who love action games"),
      advisorMsg("Good. What is the win condition?"),
      userMsg("Survive 3 levels, increasing speed"),
      advisorMsg("Tight. What does the app do in 10 seconds?"),
      userMsg("Shows a title screen then immediately starts level 1"),
    ];
    const a1 = demoAssessment(few, null, threshold);
    const a2 = demoAssessment(many, null, threshold);
    expect(a2.overall).toBeGreaterThan(a1.overall);
  });

  it("overall becomes ready after enough engagement", () => {
    const history: ChatMessage[] = [];
    for (let i = 0; i < 12; i++) {
      history.push(userMsg(`This is substantive message number ${i + 1} with enough words to count`));
      history.push(advisorMsg("Good, keep going."));
    }
    const a = demoAssessment(history, null, threshold);
    expect(a.ready).toBe(true);
  });

  it("detects game project type", () => {
    const a = demoAssessment([userMsg("I want to make a puzzle game")], null, threshold);
    expect(a.projectType).toBe("Game");
  });

  it("detects AI assistant project type", () => {
    const a = demoAssessment([userMsg("build me a chatbot assistant")], null, threshold);
    expect(a.projectType).toBe("AI assistant");
  });

  it("defaults to Web app for generic prompts", () => {
    const a = demoAssessment([userMsg("build a website")], null, threshold);
    expect(a.projectType).toBe("Web app");
  });

  it("respects priorCriteria keys", () => {
    const prior = [
      { key: "core_mechanic", label: "Core mechanic", bestPractice: "core_mechanic" },
    ];
    const a = demoAssessment([userMsg("game")], prior, threshold);
    expect(a.dynamicCriteria[0].key).toBe("core_mechanic");
  });

  it("all dimension scores are in 0-100 range", () => {
    const a = demoAssessment([userMsg("build a tracker app")], null, threshold);
    for (const score of [a.clarity.score, a.conciseness.score, ...a.dynamicCriteria.map((d) => d.score)]) {
      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(100);
    }
  });
});

describe("demoLesson", () => {
  it("returns a lesson with title, lesson, and why fields", () => {
    const lesson = demoLesson([userMsg("test")]);
    expect(typeof lesson.title).toBe("string");
    expect(typeof lesson.lesson).toBe("string");
    expect(typeof lesson.why).toBe("string");
    expect(lesson.title.length).toBeGreaterThan(0);
  });
});

describe("demoBuildHtml", () => {
  it("produces valid HTML boilerplate", () => {
    const html = demoBuildHtml("Game", "build a shooting game");
    expect(html).toContain("<!DOCTYPE html>");
    expect(html).toContain("</html>");
    expect(html).toContain("Game");
  });

  it("includes the changeRequest banner when provided", () => {
    const html = demoBuildHtml("App", "build something", "add dark mode");
    expect(html).toContain("add dark mode");
  });

  it("escapes HTML in the project type", () => {
    const html = demoBuildHtml("<script>alert(1)</script>", "test");
    expect(html).not.toContain("<script>alert(1)</script>");
  });

  it("escapes HTML in the refinedPrompt", () => {
    const html = demoBuildHtml("App", '<img onerror="x">');
    expect(html).not.toContain('<img onerror="x">');
  });
});

describe("demoEdits", () => {
  it("returns an EditResult with summary and edits", () => {
    const r = demoEdits("add a button");
    expect(typeof r.summary).toBe("string");
    expect(Array.isArray(r.edits)).toBe(true);
    expect(r.edits.length).toBeGreaterThan(0);
  });

  it("each edit has find and replace", () => {
    const r = demoEdits("test change");
    for (const e of r.edits) {
      expect(typeof e.find).toBe("string");
      expect(typeof e.replace).toBe("string");
    }
  });
});

describe("demoPlan", () => {
  it("returns a plan with projectName, bigPicture, and parts", () => {
    const p = demoPlan("Game", "build a game", "Alex", "Minecraft");
    expect(typeof p.projectName).toBe("string");
    expect(typeof p.bigPicture).toBe("string");
    expect(Array.isArray(p.parts)).toBe(true);
    expect(p.parts.length).toBeGreaterThan(0);
  });

  it("includes the builder's name in bigPicture", () => {
    const p = demoPlan("App", "test", "Jordan", "");
    expect(p.bigPicture).toContain("Jordan");
  });

  it("each part has required fields", () => {
    const p = demoPlan("App", "build an app", "", "");
    for (const part of p.parts) {
      expect(typeof part.title).toBe("string");
      expect(typeof part.whatItIs).toBe("string");
      expect(typeof part.concept).toBe("string");
      expect(typeof part.buildSpec).toBe("string");
    }
  });
});

describe("demoQuiz", () => {
  it("returns a checkpoint with questions", () => {
    const cp = demoQuiz("The Stage", "HTML structure");
    expect(typeof cp.intro).toBe("string");
    expect(Array.isArray(cp.questions)).toBe(true);
    expect(cp.questions.length).toBeGreaterThan(0);
  });

  it("each question has required fields", () => {
    const cp = demoQuiz("Part 1", "concept");
    for (const q of cp.questions) {
      expect(typeof q.id).toBe("string");
      expect(typeof q.question).toBe("string");
      expect(Array.isArray(q.options)).toBe(true);
      expect(q.options.length).toBeGreaterThanOrEqual(2);
      expect(q.correctIndex).toBeGreaterThanOrEqual(0);
      expect(q.correctIndex).toBeLessThan(q.options.length);
    }
  });
});

describe("demoExtendPart", () => {
  it("returns a build part with all fields", () => {
    const p = demoExtendPart("add a search bar");
    expect(typeof p.title).toBe("string");
    expect(typeof p.whatItIs).toBe("string");
    expect(typeof p.concept).toBe("string");
    expect(typeof p.buildSpec).toBe("string");
  });

  it("includes the request in the buildSpec", () => {
    const p = demoExtendPart("add dark mode toggle");
    expect(p.buildSpec).toContain("add dark mode toggle");
  });
});
