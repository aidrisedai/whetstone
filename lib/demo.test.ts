import { describe, it, expect } from "vitest";
import { demoAdvisorReply, demoAssessment, demoLesson } from "./demo";
import type { ChatMessage } from "./types";

function userMsg(content: string, id = "u1"): ChatMessage {
  return { id, role: "user", content };
}

function advisorMsg(content: string, id = "a1"): ChatMessage {
  return { id, role: "advisor", content };
}

// ── demoAdvisorReply ───────────────────────────────────────────────────────

describe("demoAdvisorReply", () => {
  it("returns a closing note when closing=true", () => {
    const reply = demoAdvisorReply([], true);
    expect(reply.length).toBeGreaterThan(10);
    expect(typeof reply).toBe("string");
  });

  it("returns a pushback (not the closing) when closing=false", () => {
    const history: ChatMessage[] = [userMsg("I want to build a game")];
    const reply = demoAdvisorReply(history, false);
    expect(reply).not.toBe(demoAdvisorReply([], true));
    expect(reply.length).toBeGreaterThan(10);
  });

  it("is deterministic: same history → same reply", () => {
    const history: ChatMessage[] = [userMsg("I want to build a task tracker")];
    expect(demoAdvisorReply(history, false)).toBe(demoAdvisorReply(history, false));
  });

  it("mentions an image when the user attached one", () => {
    const history: ChatMessage[] = [
      {
        id: "u1",
        role: "user",
        content: "Here is my sketch",
        images: [{ mediaType: "image/png", data: "abc" }],
      },
    ];
    const reply = demoAdvisorReply(history, false);
    expect(reply.toLowerCase()).toContain("sketch");
  });

  it("cycles through pushback variants as turns increase", () => {
    const replies = new Set<string>();
    for (let i = 1; i <= 6; i++) {
      const history: ChatMessage[] = Array.from({ length: i }, (_, j) =>
        userMsg(`turn ${j + 1} about the chatbot`, `u${j}`),
      );
      replies.add(demoAdvisorReply(history, false));
    }
    // At least 3 distinct replies across 6 turns
    expect(replies.size).toBeGreaterThanOrEqual(3);
  });
});

// ── demoAssessment ─────────────────────────────────────────────────────────

describe("demoAssessment", () => {
  it("returns a valid Assessment shape", () => {
    const a = demoAssessment([userMsg("build a todo app")], null, 80);
    expect(typeof a.overall).toBe("number");
    expect(typeof a.ready).toBe("boolean");
    expect(typeof a.refinedPrompt).toBe("string");
    expect(a.clarity.score).toBeGreaterThanOrEqual(0);
    expect(a.clarity.score).toBeLessThanOrEqual(100);
  });

  it("overall climbs with more user turns", () => {
    const few = demoAssessment([userMsg("short")], null, 80).overall;
    const more = demoAssessment(
      [userMsg("I want to build a game with levels and scoring for kids aged 10-14")],
      null,
      80,
    ).overall;
    expect(more).toBeGreaterThanOrEqual(few);
  });

  it("crosses threshold after enough substantive turns", () => {
    const history: ChatMessage[] = [];
    for (let i = 0; i < 8; i++) {
      history.push(userMsg("A detailed response about target audience, success criteria, and scope for my data dashboard project.", `u${i}`));
      history.push(advisorMsg("Good, keep going.", `a${i}`));
    }
    const a = demoAssessment(history, null, 80);
    expect(a.ready).toBe(true);
  });

  it("stamps the correct threshold", () => {
    const a = demoAssessment([userMsg("idea")], null, 75);
    expect(a.threshold).toBe(75);
  });

  it("detects a Game project type from keywords", () => {
    const a = demoAssessment([userMsg("I want to build a puzzle game with levels")], null, 80);
    expect(a.projectType).toBe("Game");
  });

  it("detects an AI assistant project type", () => {
    const a = demoAssessment([userMsg("I want to build a chatbot tutor")], null, 80);
    expect(a.projectType).toBe("AI assistant");
  });

  it("detects a Data tool project type", () => {
    const a = demoAssessment([userMsg("I want to build a budget tracker dashboard")], null, 80);
    expect(a.projectType).toBe("Data tool");
  });

  it("defaults to Web app when no keyword matches", () => {
    const a = demoAssessment([userMsg("I want to build something cool")], null, 80);
    expect(a.projectType).toBe("Web app");
  });

  it("locks criteria from priorCriteria when provided", () => {
    const prior = [
      { key: "my_key", label: "My Label", bestPractice: "my_bp" },
    ];
    const a = demoAssessment([userMsg("build a game")], prior, 80);
    expect(a.dynamicCriteria[0].key).toBe("my_key");
    expect(a.dynamicCriteria[0].label).toBe("My Label");
  });

  it("all scores are clamped 0–100", () => {
    const a = demoAssessment([userMsg("x")], null, 80);
    const all = [a.clarity.score, a.conciseness.score, ...a.dynamicCriteria.map((d) => d.score)];
    for (const s of all) {
      expect(s).toBeGreaterThanOrEqual(0);
      expect(s).toBeLessThanOrEqual(100);
    }
  });
});

// ── demoLesson ─────────────────────────────────────────────────────────────

describe("demoLesson", () => {
  it("returns a lesson with title, lesson, and why", () => {
    const l = demoLesson([userMsg("idea")]);
    expect(typeof l.title).toBe("string");
    expect(typeof l.lesson).toBe("string");
    expect(typeof l.why).toBe("string");
    expect(l.title.length).toBeGreaterThan(0);
  });

  it("returns different 'why' for short vs long sessions", () => {
    const short = demoLesson([userMsg("x"), userMsg("y")]);
    const long = demoLesson(
      Array.from({ length: 10 }, (_, i) => userMsg(`turn ${i}`, `u${i}`)),
    );
    expect(short.why).not.toBe(long.why);
  });
});
