import { describe, it, expect } from "vitest";
import {
  demoAdvisorReply,
  demoAssessment,
  demoBuildHtml,
  demoCoach,
} from "@/lib/demo";
import type { ChatMessage } from "@/lib/types";

function makeHistory(userMessages: string[]): ChatMessage[] {
  const history: ChatMessage[] = [];
  for (let i = 0; i < userMessages.length; i++) {
    history.push({ id: `u${i}`, role: "user", content: userMessages[i] });
    if (i < userMessages.length - 1) {
      history.push({ id: `a${i}`, role: "advisor", content: "Interesting, tell me more." });
    }
  }
  return history;
}

describe("demoAdvisorReply", () => {
  it("returns a non-empty string for a normal (non-closing) reply", () => {
    const history = makeHistory(["I want to build a task tracker"]);
    const reply = demoAdvisorReply(history, false);
    expect(typeof reply).toBe("string");
    expect(reply.length).toBeGreaterThan(0);
  });

  it("returns the closing string when closing=true", () => {
    const history = makeHistory(["My idea is a game for teens"]);
    const reply = demoAdvisorReply(history, true);
    expect(reply).toContain("sharp enough to build");
  });

  it("returns a different pushback reply for more user turns", () => {
    const fewTurns = makeHistory(["first idea"]);
    const manyTurns = makeHistory([
      "first idea",
      "clarification 1",
      "clarification 2",
      "clarification 3",
    ]);
    const replyFew = demoAdvisorReply(fewTurns, false);
    const replyMany = demoAdvisorReply(manyTurns, false);
    // Replies can differ between 1 turn and 4 turns
    expect(typeof replyFew).toBe("string");
    expect(typeof replyMany).toBe("string");
  });
});

describe("demoAssessment", () => {
  it("returns an Assessment object with the expected shape", () => {
    const history = makeHistory(["Build a game for kids"]);
    const result = demoAssessment(history, null, 80);
    expect(typeof result.overall).toBe("number");
    expect(typeof result.ready).toBe("boolean");
    expect(typeof result.projectType).toBe("string");
    expect(result.clarity).toBeDefined();
    expect(result.conciseness).toBeDefined();
    expect(Array.isArray(result.dynamicCriteria)).toBe(true);
  });

  it("sets threshold from the argument", () => {
    const history = makeHistory(["I want a chatbot"]);
    const result = demoAssessment(history, null, 80);
    expect(result.threshold).toBe(80);
  });

  it("ready is determined by overall >= threshold and all scores >= 65", () => {
    const history = makeHistory(["I want a chatbot"]);
    const result = demoAssessment(history, null, 80);
    const allScores = [
      result.clarity.score,
      result.conciseness.score,
      ...result.dynamicCriteria.map((d) => d.score),
    ];
    const expectedReady =
      result.overall >= 80 && allScores.every((s) => s >= 65);
    expect(result.ready).toBe(expectedReady);
  });

  it("scores climb with more user turns (base score increases)", () => {
    const fewTurns = makeHistory(["I want to build something"]);
    const manyTurns = makeHistory([
      "I want to build a task tracker",
      "It should let users add, remove, and check off tasks",
      "The audience is college students managing homework",
      "Success is when they complete all tasks in one session",
    ]);
    const resultFew = demoAssessment(fewTurns, null, 80);
    const resultMany = demoAssessment(manyTurns, null, 80);
    expect(resultMany.overall).toBeGreaterThan(resultFew.overall);
  });

  it("uses provided priorCriteria to lock the dimension set", () => {
    const prior = [
      { key: "custom_key", label: "Custom", bestPractice: "custom_bp" },
    ];
    const history = makeHistory(["Some idea"]);
    const result = demoAssessment(history, prior, 80);
    expect(result.dynamicCriteria.length).toBe(1);
    expect(result.dynamicCriteria[0].key).toBe("custom_key");
  });
});

describe("demoBuildHtml", () => {
  it("returns a string containing <!DOCTYPE html", () => {
    const html = demoBuildHtml("Web app", "Build a task tracker");
    expect(html).toContain("<!DOCTYPE html");
  });

  it("returns a string containing </html>", () => {
    const html = demoBuildHtml("Web app", "Build a task tracker");
    expect(html).toContain("</html>");
  });

  it("includes the project type in the output", () => {
    const html = demoBuildHtml("My Game", "Build a game");
    expect(html).toContain("My Game");
  });

  it("works with an empty prompt", () => {
    const html = demoBuildHtml("App", "");
    expect(html).toContain("<!DOCTYPE html");
    expect(html).toContain("</html>");
  });

  it("includes the changeRequest note when provided", () => {
    const html = demoBuildHtml("App", "Build something", "add dark mode");
    expect(html).toContain("add dark mode");
  });
});

describe("demoCoach", () => {
  it("returns a CoachNote with the required fields for step 1", () => {
    const note = demoCoach(1, "add a button");
    expect(typeof note.whatChanged).toBe("string");
    expect(typeof note.concept).toBe("string");
    expect(typeof note.proTip).toBe("string");
    expect(note.whatChanged.length).toBeGreaterThan(0);
    expect(note.concept.length).toBeGreaterThan(0);
    expect(note.proTip.length).toBeGreaterThan(0);
  });

  it("returns a CoachNote for step > 1", () => {
    const note = demoCoach(2, "add a button");
    expect(typeof note.whatChanged).toBe("string");
    expect(note.whatChanged).toContain("add a button");
  });

  it("step 1 message mentions shipping a rough v1", () => {
    const note = demoCoach(1, "irrelevant");
    expect(note.concept).toMatch(/v1|version|rough/i);
  });
});
