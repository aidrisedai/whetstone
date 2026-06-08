import { describe, it, expect } from "vitest";
import {
  demoAdvisorReply,
  demoAssessment,
  demoLesson,
  demoBuildHtml,
  demoCoach,
  demoEdits,
  demoPlan,
  demoQuiz,
  demoExtendPart,
} from "@/lib/demo";
import type { ChatMessage } from "@/lib/types";

function msg(role: "user" | "assistant", content: string): ChatMessage {
  return { id: "t", role, content };
}

const threeUserTurns: ChatMessage[] = [
  msg("user", "I want to build a task tracker for developers"),
  msg("assistant", "Interesting — who exactly?"),
  msg("user", "Solo devs who lose track of todos across projects"),
  msg("assistant", "What does done look like?"),
  msg("user", "A clean list that persists and lets them mark things done"),
];

describe("demoAdvisorReply", () => {
  it("returns a non-empty string", () => {
    expect(demoAdvisorReply(threeUserTurns, false).length).toBeGreaterThan(0);
  });

  it("returns the closing remark when closing=true", () => {
    const reply = demoAdvisorReply(threeUserTurns, true);
    expect(reply).toMatch(/sharp enough to build/i);
  });

  it("responds to image attachments on early turns", () => {
    const withImage: ChatMessage[] = [
      { id: "t", role: "user", content: "here is my sketch", images: [{ mediaType: "image/png", data: "abc", name: "sketch.png" }] },
    ];
    const reply = demoAdvisorReply(withImage, false);
    expect(reply.length).toBeGreaterThan(0);
  });

  it("cycles through pushbacks based on turn count", () => {
    const earlyCycling = demoAdvisorReply([msg("user", "I want to build a quiz game app")], false);
    expect(earlyCycling.length).toBeGreaterThan(0);
  });
});

describe("demoAssessment", () => {
  it("returns a valid Assessment shape", () => {
    const a = demoAssessment(threeUserTurns, null, 80);
    expect(typeof a.overall).toBe("number");
    expect(a.overall).toBeGreaterThanOrEqual(0);
    expect(a.overall).toBeLessThanOrEqual(100);
    expect(typeof a.ready).toBe("boolean");
    expect(a.dynamicCriteria.length).toBeLessThanOrEqual(3);
    expect(a.refinedPrompt.length).toBeGreaterThan(0);
  });

  it("detects game project type from history", () => {
    const history = [msg("user", "I want to build a puzzle game with levels and scores")];
    const a = demoAssessment(history, null, 80);
    expect(a.projectType).toBe("Game");
    expect(a.dynamicCriteria.some((d) => d.key === "core_mechanic")).toBe(true);
  });

  it("detects AI assistant project type", () => {
    const history = [msg("user", "I want to build an AI chatbot tutor")];
    const a = demoAssessment(history, null, 80);
    expect(a.projectType).toBe("AI assistant");
  });

  it("defaults to Web app when no pattern matches", () => {
    const history = [msg("user", "I want to make something cool for my friends")];
    const a = demoAssessment(history, null, 80);
    expect(a.projectType).toBe("Web app");
  });

  it("reuses prior criteria when provided", () => {
    const prior = [
      { key: "custom_key", label: "Custom", bestPractice: "custom_key" },
    ];
    const a = demoAssessment(threeUserTurns, prior, 80);
    expect(a.dynamicCriteria.some((d) => d.key === "custom_key")).toBe(true);
  });

  it("scores rise with more user engagement (more turns)", () => {
    const few = demoAssessment([msg("user", "Hi")], null, 80);
    const many = demoAssessment(
      Array.from({ length: 8 }, (_, i) => msg("user", `Turn ${i}: adding detail to my task manager idea`)),
      null,
      80,
    );
    expect(many.overall).toBeGreaterThan(few.overall);
  });

  it("keeps all scores within 0–100", () => {
    const a = demoAssessment(threeUserTurns, null, 80);
    const scores = [a.clarity.score, a.conciseness.score, ...a.dynamicCriteria.map((d) => d.score)];
    for (const s of scores) {
      expect(s).toBeGreaterThanOrEqual(0);
      expect(s).toBeLessThanOrEqual(100);
    }
  });
});

describe("demoLesson", () => {
  it("returns title, lesson, and why strings", () => {
    const l = demoLesson(threeUserTurns);
    expect(l.title.length).toBeGreaterThan(0);
    expect(l.lesson.length).toBeGreaterThan(0);
    expect(l.why.length).toBeGreaterThan(0);
  });
});

describe("demoBuildHtml", () => {
  it("returns a string containing DOCTYPE", () => {
    const html = demoBuildHtml("Task Tracker", "Build a task tracker", undefined);
    expect(html).toMatch(/<!DOCTYPE html/i);
  });

  it("includes the project type in the output", () => {
    const html = demoBuildHtml("Quiz Game", "Build a quiz game", undefined);
    expect(html).toContain("Quiz Game");
  });

  it("includes change request banner when provided", () => {
    const html = demoBuildHtml("My App", "Build it", "add dark mode");
    expect(html).toContain("add dark mode");
  });

  it("includes demo mode banner when no change request", () => {
    const html = demoBuildHtml("My App", "Build it", undefined);
    expect(html).toContain("ANTHROPIC_API_KEY");
  });

  it("escapes HTML in project type to prevent injection", () => {
    const html = demoBuildHtml("<script>alert(1)</script>", "p", undefined);
    expect(html).not.toContain("<script>alert(1)</script>");
    expect(html).toContain("&lt;script&gt;");
  });
});

describe("demoCoach", () => {
  it("returns first-step encouragement for step 1", () => {
    const c = demoCoach(1, "");
    expect(c.whatChanged.length).toBeGreaterThan(0);
    expect(c.concept.length).toBeGreaterThan(0);
    expect(c.proTip.length).toBeGreaterThan(0);
  });

  it("includes the change request for later steps", () => {
    const c = demoCoach(2, "add a counter");
    expect(c.whatChanged).toContain("add a counter");
  });
});

describe("demoEdits", () => {
  it("returns a summary and at least one edit", () => {
    const r = demoEdits("add a header");
    expect(r.summary.length).toBeGreaterThan(0);
    expect(r.edits.length).toBeGreaterThanOrEqual(1);
    expect(typeof r.edits[0].find).toBe("string");
    expect(typeof r.edits[0].replace).toBe("string");
  });
});

describe("demoPlan", () => {
  it("returns projectName, bigPicture, and 3 parts", () => {
    const p = demoPlan("Web app", "Build a tracker", "Alex", "Minecraft");
    expect(p.projectName.length).toBeGreaterThan(0);
    expect(p.bigPicture.length).toBeGreaterThan(0);
    expect(p.parts).toHaveLength(3);
  });

  it("names the user in bigPicture when provided", () => {
    const p = demoPlan("Game", "Build a game", "Sam", "");
    expect(p.bigPicture).toContain("Sam");
  });

  it("references the favorite game when provided", () => {
    const p = demoPlan("Game", "Build a game", "", "Zelda");
    expect(p.bigPicture).toContain("Zelda");
  });
});

describe("demoQuiz", () => {
  it("returns a checkpoint with 2 questions", () => {
    const q = demoQuiz("The Stage", "HTML basics");
    expect(q.questions).toHaveLength(2);
    q.questions.forEach((question) => {
      expect(question.options.length).toBeGreaterThanOrEqual(2);
      expect(question.correctIndex).toBeGreaterThanOrEqual(0);
      expect(question.correctIndex).toBeLessThan(question.options.length);
    });
  });
});

describe("demoExtendPart", () => {
  it("returns a valid BuildPart shape", () => {
    const p = demoExtendPart("add a dark mode toggle");
    expect(p.title.length).toBeGreaterThan(0);
    expect(p.whatItIs.length).toBeGreaterThan(0);
    expect(p.why.length).toBeGreaterThan(0);
    expect(p.buildSpec).toContain("add a dark mode toggle");
  });
});
