import { describe, it, expect } from "vitest";
import { demoAdvisorReply, demoAssessment, demoLesson } from "@/lib/demo";
import type { ChatMessage } from "@/lib/types";

const userMsg = (content: string): ChatMessage => ({ id: "u1", role: "user", content });
const advisorMsg = (content: string): ChatMessage => ({ id: "a1", role: "advisor", content });

describe("demoAdvisorReply", () => {
  it("returns a non-empty string for any history", () => {
    const history = [userMsg("I want to build an app for students")];
    const reply = demoAdvisorReply(history, false);
    expect(typeof reply).toBe("string");
    expect(reply.length).toBeGreaterThan(0);
  });

  it("returns a closing message when closing=true", () => {
    const history = [userMsg("here is my idea")];
    const reply = demoAdvisorReply(history, true);
    expect(reply).toContain("sharp enough to build");
  });

  it("reacts to images in early turns", () => {
    const history: ChatMessage[] = [
      { id: "u1", role: "user", content: "here is my sketch", images: [{ mediaType: "image/png", data: "abc" }] },
    ];
    const reply = demoAdvisorReply(history, false);
    expect(reply).toContain("sketch");
  });

  it("progresses through pushbacks across turns", () => {
    const history = [
      userMsg("idea one"),
      advisorMsg("q1"),
      userMsg("answer two"),
      advisorMsg("q2"),
      userMsg("answer three"),
    ];
    const reply = demoAdvisorReply(history, false);
    expect(typeof reply).toBe("string");
    expect(reply.length).toBeGreaterThan(0);
  });
});

describe("demoAssessment", () => {
  it("returns a valid Assessment shape", () => {
    const history = [userMsg("I want to build a game")];
    const a = demoAssessment(history, null, 80);
    expect(a.overall).toBeGreaterThanOrEqual(0);
    expect(a.overall).toBeLessThanOrEqual(100);
    expect(a.clarity.score).toBeGreaterThanOrEqual(0);
    expect(a.conciseness.score).toBeGreaterThanOrEqual(0);
    expect(a.dynamicCriteria.length).toBeGreaterThanOrEqual(1);
    expect(typeof a.refinedPrompt).toBe("string");
    expect(typeof a.ready).toBe("boolean");
    expect(a.threshold).toBe(80);
  });

  it("detects game type from content", () => {
    const history = [userMsg("a puzzle game for kids")];
    const a = demoAssessment(history, null, 80);
    expect(a.projectType).toBe("Game");
  });

  it("detects chatbot type from content", () => {
    const history = [userMsg("an AI assistant for homework")];
    const a = demoAssessment(history, null, 80);
    expect(a.projectType).toBe("AI assistant");
  });

  it("defaults to Web app when no type detected", () => {
    const history = [userMsg("a platform for organizing events")];
    const a = demoAssessment(history, null, 80);
    expect(a.projectType).toBe("Web app");
  });

  it("reaches ready=true after enough substantive turns", () => {
    const history: ChatMessage[] = [];
    for (let i = 0; i < 10; i++) {
      history.push(userMsg("very specific answer number " + i + " with lots of extra detail about the specific user audience and success criteria and constraints and scope"));
    }
    const a = demoAssessment(history, null, 80);
    expect(a.ready).toBe(true);
  });

  it("reuses prior criteria when provided", () => {
    const prior = [
      { key: "core_mechanic", label: "Core mechanic", bestPractice: "core_mechanic" },
      { key: "success_criteria", label: "Success criteria", bestPractice: "success_criteria" },
    ];
    const history = [userMsg("a game")];
    const a = demoAssessment(history, prior, 80);
    expect(a.dynamicCriteria.map((d) => d.key)).toEqual(["core_mechanic", "success_criteria"]);
  });
});

describe("demoLesson", () => {
  it("returns a valid Lesson shape", () => {
    const history = [userMsg("my idea")];
    const lesson = demoLesson(history);
    expect(typeof lesson.title).toBe("string");
    expect(lesson.title.length).toBeGreaterThan(0);
    expect(typeof lesson.lesson).toBe("string");
    expect(typeof lesson.why).toBe("string");
  });
});
