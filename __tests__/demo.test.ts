import { describe, it, expect } from "vitest";
import {
  demoAdvisorReply,
  demoAssessment,
  demoLesson,
  demoBuildHtml,
  demoEdits,
  demoCoach,
} from "@/lib/demo";
import type { ChatMessage } from "@/lib/types";

function userMsg(content: string, id = "u1"): ChatMessage {
  return { id, role: "user", content };
}

function advisorMsg(content: string, id = "a1"): ChatMessage {
  return { id, role: "advisor", content };
}

// ── demoAdvisorReply ──────────────────────────────────────────────────────────

describe("demoAdvisorReply", () => {
  it("returns a closing sign-off when phase is closing", () => {
    const reply = demoAdvisorReply([userMsg("my app idea")], true);
    expect(typeof reply).toBe("string");
    expect(reply.length).toBeGreaterThan(10);
  });

  it("returns a pushback string for normal turns", () => {
    const reply = demoAdvisorReply([userMsg("I want to build a game")], false);
    expect(typeof reply).toBe("string");
    expect(reply.length).toBeGreaterThan(10);
  });

  it("mentions the image when user sends one with ≤2 turns", () => {
    const history: ChatMessage[] = [
      {
        id: "u1",
        role: "user",
        content: "here is my sketch",
        images: [{ mediaType: "image/png", data: "abc" }],
      },
    ];
    const reply = demoAdvisorReply(history, false);
    expect(reply.toLowerCase()).toMatch(/sketch|screen|layout|see/);
  });

  it("cycles through pushback templates as turn count rises", () => {
    const history: ChatMessage[] = [];
    const replies = new Set<string>();
    for (let i = 0; i < 6; i++) {
      history.push(userMsg(`turn ${i}`, `u${i}`));
      history.push(advisorMsg("ok", `a${i}`));
      replies.add(demoAdvisorReply(history, false));
    }
    // At least 2 distinct replies across 6 turns
    expect(replies.size).toBeGreaterThanOrEqual(2);
  });
});

// ── demoAssessment ────────────────────────────────────────────────────────────

describe("demoAssessment", () => {
  it("returns a valid Assessment with all required fields", () => {
    const a = demoAssessment([userMsg("Build a game for me")], null, 80);
    expect(typeof a.overall).toBe("number");
    expect(typeof a.ready).toBe("boolean");
    expect(a.threshold).toBe(80);
    expect(a.clarity).toBeDefined();
    expect(a.conciseness).toBeDefined();
    expect(Array.isArray(a.dynamicCriteria)).toBe(true);
    expect(typeof a.refinedPrompt).toBe("string");
  });

  it("scores climb as history grows and becomes richer", () => {
    const shortHistory = [userMsg("hi")];
    const longHistory = Array.from({ length: 5 }, (_, i) =>
      userMsg(
        `Turn ${i}: I want to build a quiz app for high-school students studying for exams, where they can upload their notes and get graded practice questions back`,
        `u${i}`,
      ),
    );
    const short = demoAssessment(shortHistory, null, 80);
    const long = demoAssessment(longHistory, null, 80);
    expect(long.overall).toBeGreaterThan(short.overall);
  });

  it("detects game-type projects and picks game criteria", () => {
    const a = demoAssessment([userMsg("a game about puzzles")], null, 80);
    expect(a.projectType).toBe("Game");
    const keys = a.dynamicCriteria.map((d) => d.key);
    expect(keys).toContain("core_mechanic");
  });

  it("detects chatbot projects and picks AI criteria", () => {
    const a = demoAssessment([userMsg("an AI tutor bot for students")], null, 80);
    expect(a.projectType).toBe("AI assistant");
  });

  it("honours prior criteria — reuses them instead of re-picking", () => {
    const prior = [{ key: "define_audience", label: "Audience", bestPractice: "define_audience" }];
    const a = demoAssessment([userMsg("a game with levels and scoring")], prior, 80);
    // Even though this looks like a game, prior criteria are locked.
    const keys = a.dynamicCriteria.map((d) => d.key);
    expect(keys).toEqual(["define_audience"]);
  });

  it("scores all dimensions as numbers between 0 and 100", () => {
    const a = demoAssessment([userMsg("test")], null, 80);
    [a.clarity.score, a.conciseness.score, ...a.dynamicCriteria.map((d) => d.score)].forEach((s) => {
      expect(s).toBeGreaterThanOrEqual(0);
      expect(s).toBeLessThanOrEqual(100);
    });
  });
});

// ── demoLesson ────────────────────────────────────────────────────────────────

describe("demoLesson", () => {
  it("returns a lesson with title, lesson, and why", () => {
    const l = demoLesson([userMsg("test")]);
    expect(typeof l.title).toBe("string");
    expect(l.title.length).toBeGreaterThan(0);
    expect(typeof l.lesson).toBe("string");
    expect(typeof l.why).toBe("string");
  });

  it("produces different 'why' depending on number of turns", () => {
    const few = demoLesson([userMsg("hi")]);
    const many = demoLesson(
      Array.from({ length: 8 }, (_, i) => userMsg(`turn ${i}`, `u${i}`)),
    );
    // The two "why" strings should differ.
    expect(few.why).not.toBe(many.why);
  });
});

// ── demoBuildHtml ─────────────────────────────────────────────────────────────

describe("demoBuildHtml", () => {
  it("returns a complete HTML document", () => {
    const html = demoBuildHtml("Game", "Build a puzzle game", undefined);
    expect(html).toMatch(/<!DOCTYPE html/i);
    expect(html).toContain("</html>");
  });

  it("escapes the projectType to prevent XSS", () => {
    const html = demoBuildHtml('<script>alert(1)</script>', "test", undefined);
    expect(html).not.toContain("<script>alert(1)</script>");
    expect(html).toContain("&lt;script&gt;");
  });

  it("includes a banner about the change when changeRequest is provided", () => {
    const html = demoBuildHtml("App", "prompt", "add dark mode");
    expect(html).toContain("add dark mode");
  });

  it("mentions demo mode in the default banner", () => {
    const html = demoBuildHtml("App", "prompt", undefined);
    expect(html.toLowerCase()).toContain("demo");
  });
});

// ── demoEdits ─────────────────────────────────────────────────────────────────

describe("demoEdits", () => {
  it("returns a summary and a list of edits", () => {
    const result = demoEdits("add a button");
    expect(typeof result.summary).toBe("string");
    expect(Array.isArray(result.edits)).toBe(true);
    expect(result.edits.length).toBeGreaterThan(0);
  });

  it("each edit has find and replace strings", () => {
    const result = demoEdits("change colour");
    for (const edit of result.edits) {
      expect(typeof edit.find).toBe("string");
      expect(typeof edit.replace).toBe("string");
    }
  });
});

// ── demoCoach ─────────────────────────────────────────────────────────────────

describe("demoCoach", () => {
  it("returns whatChanged, concept, and proTip strings", () => {
    const note = demoCoach(1, "");
    expect(typeof note.whatChanged).toBe("string");
    expect(typeof note.concept).toBe("string");
    expect(typeof note.proTip).toBe("string");
  });

  it("first step note is about turning a prompt into a v1", () => {
    const note = demoCoach(1, "initial build");
    expect(note.whatChanged.toLowerCase()).toMatch(/prompt|version|v1|working/);
  });

  it("later step note references the change request", () => {
    const note = demoCoach(2, "add dark mode");
    expect(note.whatChanged).toContain("add dark mode");
  });
});
