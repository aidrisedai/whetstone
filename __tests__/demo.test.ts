import { describe, it, expect } from "vitest";
import { demoAdvisorReply, demoAssessment, demoLesson } from "../lib/demo";
import type { ChatMessage } from "../lib/types";

function msg(role: "user" | "advisor", content: string): ChatMessage {
  return { id: "t", role, content };
}

const history1 = [msg("user", "I want to build an app for students")];
const history3 = [
  msg("user", "A quiz app for high school students studying for exams"),
  msg("advisor", "Push back."),
  msg("user", "They need instant feedback and a score so they can track progress"),
];

describe("demoAdvisorReply", () => {
  it("returns a non-empty string", () => {
    const r = demoAdvisorReply(history1, false);
    expect(typeof r).toBe("string");
    expect(r.length).toBeGreaterThan(10);
  });

  it("returns a closing message when closing=true", () => {
    const r = demoAdvisorReply(history1, true);
    expect(r).toMatch(/sharp|build|forge/i);
  });

  it("returns a different message at different turn depths", () => {
    const r1 = demoAdvisorReply(history1, false);
    const r3 = demoAdvisorReply(history3, false);
    expect(r1).not.toBe(r3);
  });
});

describe("demoAssessment", () => {
  it("returns a valid Assessment shape", () => {
    const a = demoAssessment(history1, null, 80);
    expect(a).toHaveProperty("clarity");
    expect(a).toHaveProperty("conciseness");
    expect(a).toHaveProperty("dynamicCriteria");
    expect(a).toHaveProperty("overall");
    expect(a).toHaveProperty("ready");
    expect(a).toHaveProperty("threshold");
    expect(a).toHaveProperty("refinedPrompt");
    expect(a).toHaveProperty("projectType");
  });

  it("stamps the supplied threshold", () => {
    const a = demoAssessment(history1, null, 70);
    expect(a.threshold).toBe(70);
  });

  it("all scores are in 0–100", () => {
    const a = demoAssessment(history3, null, 80);
    expect(a.clarity.score).toBeGreaterThanOrEqual(0);
    expect(a.clarity.score).toBeLessThanOrEqual(100);
    expect(a.conciseness.score).toBeGreaterThanOrEqual(0);
    for (const d of a.dynamicCriteria) {
      expect(d.score).toBeGreaterThanOrEqual(0);
      expect(d.score).toBeLessThanOrEqual(100);
    }
  });

  it("scores rise with more substantive turns", () => {
    const a1 = demoAssessment(history1, null, 80);
    const a3 = demoAssessment(history3, null, 80);
    expect(a3.overall).toBeGreaterThan(a1.overall);
  });

  it("reuses prior criteria when supplied", () => {
    const prior = [
      { key: "core_mechanic", label: "Core mechanic", bestPractice: "core_mechanic" },
      { key: "success_criteria", label: "Win / lose state", bestPractice: "success_criteria" },
    ];
    const a = demoAssessment(history1, prior, 80);
    expect(a.dynamicCriteria.map((d) => d.key)).toEqual(["core_mechanic", "success_criteria"]);
  });

  it("detects game-type projects", () => {
    const gameHistory = [msg("user", "I want to build a puzzle arcade game with levels")];
    const a = demoAssessment(gameHistory, null, 80);
    expect(a.projectType).toBe("Game");
  });

  it("overall equals the mean of all dimension scores", () => {
    const a = demoAssessment(history1, null, 80);
    const scores = [a.clarity.score, a.conciseness.score, ...a.dynamicCriteria.map((d) => d.score)];
    const expected = Math.round(scores.reduce((s, n) => s + n, 0) / scores.length);
    expect(a.overall).toBe(expected);
  });
});

describe("demoLesson", () => {
  it("returns a valid Lesson shape", () => {
    const l = demoLesson(history1);
    expect(l).toHaveProperty("title");
    expect(l).toHaveProperty("lesson");
    expect(l).toHaveProperty("why");
    expect(typeof l.title).toBe("string");
    expect(l.title.length).toBeGreaterThan(0);
  });

  it("returns different 'why' depending on turn count", () => {
    const short = demoLesson([msg("user", "one turn")]);
    const long = demoLesson([
      msg("user", "t1"), msg("advisor", "a1"),
      msg("user", "t2"), msg("advisor", "a2"),
      msg("user", "t3"), msg("advisor", "a3"),
      msg("user", "t4"), msg("advisor", "a4"),
      msg("user", "t5"),
    ]);
    expect(short.why).not.toBe(long.why);
  });
});
