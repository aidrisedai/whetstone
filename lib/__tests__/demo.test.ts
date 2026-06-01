import { describe, it, expect } from "vitest";
import {
  demoAdvisorReply,
  demoAssessment,
  demoLesson,
  demoEdits,
  demoExtendPart,
} from "../demo";
import type { ChatMessage } from "../types";

const user = (content: string): ChatMessage => ({ id: "u1", role: "user", content });
const advisor = (content: string): ChatMessage => ({ id: "a1", role: "advisor", content });

describe("demoAdvisorReply", () => {
  it("returns closing message when phase is closing", () => {
    const reply = demoAdvisorReply([user("great idea")], true);
    expect(reply).toBeTruthy();
    expect(typeof reply).toBe("string");
    expect(reply.length).toBeGreaterThan(10);
  });

  it("returns a pushback question for normal turns", () => {
    const reply = demoAdvisorReply([user("I want to build a tracker app")], false);
    expect(reply).toBeTruthy();
    expect(typeof reply).toBe("string");
  });

  it("returns different pushbacks on successive turns", () => {
    const history1 = [user("idea one")];
    const history2 = [user("idea one"), advisor("pushback"), user("idea refined")];
    const r1 = demoAdvisorReply(history1, false);
    const r2 = demoAdvisorReply(history2, false);
    // Different pushbacks for turn 1 vs turn 2
    expect(r1).not.toBe(r2);
  });

  it("handles image attachment in early turns", () => {
    const msgWithImage: ChatMessage = {
      id: "u1",
      role: "user",
      content: "here is my sketch",
      images: [{ mediaType: "image/png", data: "abc123" }],
    };
    const reply = demoAdvisorReply([msgWithImage], false);
    expect(reply).toBeTruthy();
  });
});

describe("demoAssessment", () => {
  it("returns a valid Assessment shape", () => {
    const a = demoAssessment([user("I want to build a game")], null, 80);
    expect(a).toHaveProperty("projectType");
    expect(a).toHaveProperty("clarity");
    expect(a).toHaveProperty("conciseness");
    expect(a).toHaveProperty("dynamicCriteria");
    expect(a).toHaveProperty("refinedPrompt");
    expect(a).toHaveProperty("overall");
    expect(a).toHaveProperty("ready");
    expect(a).toHaveProperty("threshold");
  });

  it("overall score is within 0–100", () => {
    const a = demoAssessment([user("build a chatbot for my school")], null, 80);
    expect(a.overall).toBeGreaterThanOrEqual(0);
    expect(a.overall).toBeLessThanOrEqual(100);
  });

  it("stamp threshold from argument", () => {
    const a = demoAssessment([user("anything")], null, 75);
    expect(a.threshold).toBe(75);
  });

  it("increases score with more substantive user turns", () => {
    const short = [user("app")];
    const long = [user("app"), advisor("q"), user("A detailed answer about my specific users and their goal")];
    const s1 = demoAssessment(short, null, 80).overall;
    const s2 = demoAssessment(long, null, 80).overall;
    expect(s2).toBeGreaterThanOrEqual(s1);
  });

  it("reuses prior criteria when provided", () => {
    const prior = [{ key: "core_mechanic", label: "Core mechanic", bestPractice: "core_mechanic" }];
    const a = demoAssessment([user("build a game")], prior, 80);
    expect(a.dynamicCriteria.map((d) => d.key)).toContain("core_mechanic");
  });

  it("detects game project type", () => {
    const a = demoAssessment([user("build a puzzle game")], null, 80);
    expect(a.projectType).toBe("Game");
  });

  it("detects AI assistant project type", () => {
    const a = demoAssessment([user("I want a chatbot assistant")], null, 80);
    expect(a.projectType).toBe("AI assistant");
  });

  it("falls back to Web app for unrecognised projects", () => {
    const a = demoAssessment([user("something entirely new zxy")], null, 80);
    expect(a.projectType).toBe("Web app");
  });
});

describe("demoLesson", () => {
  it("returns a lesson with title, lesson, and why", () => {
    const l = demoLesson([user("idea")]);
    expect(l).toHaveProperty("title");
    expect(l).toHaveProperty("lesson");
    expect(l).toHaveProperty("why");
    expect(typeof l.title).toBe("string");
  });

  it("returns a different 'why' for longer sessions", () => {
    const short = demoLesson([user("idea")]);
    const long = demoLesson([
      user("a"), advisor("q"), user("b"), advisor("q"), user("c"),
      advisor("q"), user("d"), advisor("q"), user("e"),
    ]);
    expect(short.why).not.toBe(long.why);
  });
});

describe("demoEdits", () => {
  it("returns summary and at least one edit", () => {
    const result = demoEdits("change the color to red");
    expect(result.summary).toBeTruthy();
    expect(Array.isArray(result.edits)).toBe(true);
    expect(result.edits.length).toBeGreaterThan(0);
  });

  it("each edit has find and replace strings", () => {
    const { edits } = demoEdits("add a footer");
    for (const e of edits) {
      expect(typeof e.find).toBe("string");
      expect(typeof e.replace).toBe("string");
    }
  });
});

describe("demoExtendPart", () => {
  it("returns a valid BuildPart shape (without id)", () => {
    const p = demoExtendPart("add dark mode");
    expect(p).toHaveProperty("title");
    expect(p).toHaveProperty("whatItIs");
    expect(p).toHaveProperty("why");
    expect(p).toHaveProperty("concept");
    expect(p).toHaveProperty("buildSpec");
  });

  it("incorporates the request text in buildSpec", () => {
    const { buildSpec } = demoExtendPart("add a search bar");
    expect(buildSpec).toContain("add a search bar");
  });
});
