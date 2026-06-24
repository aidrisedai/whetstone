import { describe, expect, it } from "vitest";
import {
  demoAdvisorReply,
  demoAssessment,
  demoLesson,
  demoBuildHtml,
  demoEdits,
  demoCoach,
} from "@/lib/demo";
import type { ChatMessage } from "@/lib/types";

const userMsg = (content: string): ChatMessage => ({ id: "u1", role: "user", content });
const advisorMsg = (content: string): ChatMessage => ({ id: "a1", role: "advisor", content });

describe("demoAdvisorReply", () => {
  it("returns a closing message for closing phase", () => {
    const history = [userMsg("my idea"), advisorMsg("interesting")];
    const reply = demoAdvisorReply(history, true);
    expect(reply.length).toBeGreaterThan(20);
    expect(typeof reply).toBe("string");
  });

  it("returns a pushback for dialogue phase", () => {
    const history = [userMsg("I want to build a game")];
    const reply = demoAdvisorReply(history, false);
    expect(reply.length).toBeGreaterThan(10);
  });

  it("handles image attachments in history", () => {
    const history: ChatMessage[] = [
      { id: "u1", role: "user", content: "here is my sketch", images: [{ mediaType: "image/png", data: "abc" }] },
    ];
    const reply = demoAdvisorReply(history, false);
    expect(reply.includes("sketch") || reply.includes("screen") || reply.length > 5).toBe(true);
  });

  it("cycles through pushbacks based on turn count", () => {
    const manyTurns: ChatMessage[] = [];
    for (let i = 0; i < 8; i++) {
      manyTurns.push(userMsg(`turn ${i} about tracking`));
      if (i < 7) manyTurns.push(advisorMsg("ok"));
    }
    const reply = demoAdvisorReply(manyTurns, false);
    expect(typeof reply).toBe("string");
    expect(reply.length).toBeGreaterThan(10);
  });
});

describe("demoAssessment", () => {
  it("returns a valid assessment shape", () => {
    const history = [userMsg("I want to build a chat app for students")];
    const result = demoAssessment(history, null, 80);
    expect(result).toHaveProperty("projectType");
    expect(result).toHaveProperty("clarity");
    expect(result).toHaveProperty("conciseness");
    expect(result).toHaveProperty("dynamicCriteria");
    expect(result).toHaveProperty("overall");
    expect(result).toHaveProperty("ready");
    expect(result).toHaveProperty("threshold");
    expect(result.threshold).toBe(80);
  });

  it("all scores are in 0-100 range", () => {
    const history = [userMsg("game tracker app")];
    const result = demoAssessment(history, null, 80);
    expect(result.clarity.score).toBeGreaterThanOrEqual(0);
    expect(result.clarity.score).toBeLessThanOrEqual(100);
    expect(result.conciseness.score).toBeGreaterThanOrEqual(0);
    expect(result.conciseness.score).toBeLessThanOrEqual(100);
  });

  it("score increases with more turns", () => {
    const few = [userMsg("build app")];
    const many = [
      userMsg("I want to build a budget tracker for high school students"),
      advisorMsg("Who are the users?"),
      userMsg("Students aged 15-18 who get allowances and want to track expenses"),
      advisorMsg("What is success?"),
      userMsg("User can add expenses and see a weekly chart showing where money went"),
    ];
    const resultFew = demoAssessment(few, null, 80);
    const resultMany = demoAssessment(many, null, 80);
    expect(resultMany.overall).toBeGreaterThan(resultFew.overall);
  });

  it("detects game projects and uses game-specific criteria", () => {
    const history = [userMsg("a puzzle game where players solve mazes")];
    const result = demoAssessment(history, null, 80);
    expect(result.projectType).toBe("Game");
    expect(result.dynamicCriteria.some((d) => d.key === "core_mechanic")).toBe(true);
  });

  it("detects chatbot projects", () => {
    const history = [userMsg("an AI tutoring assistant for students")];
    const result = demoAssessment(history, null, 80);
    expect(result.projectType).toBe("AI assistant");
  });

  it("respects prior criteria (locked dimensions)", () => {
    const history = [userMsg("game tracker")];
    const prior = [
      { key: "custom_key", label: "Custom", bestPractice: "custom_key" },
    ];
    const result = demoAssessment(history, prior, 80);
    expect(result.dynamicCriteria[0].key).toBe("custom_key");
  });
});

describe("demoLesson", () => {
  it("returns a valid lesson shape", () => {
    const history = [userMsg("app idea")];
    const lesson = demoLesson(history);
    expect(lesson).toHaveProperty("title");
    expect(lesson).toHaveProperty("lesson");
    expect(lesson).toHaveProperty("why");
    expect(lesson.title.length).toBeGreaterThan(0);
    expect(lesson.lesson.length).toBeGreaterThan(0);
  });

  it("varies why based on turn count", () => {
    const short = [userMsg("idea")];
    const longHistory = Array.from({ length: 5 }, (_, i) => userMsg(`turn ${i}`));
    const l1 = demoLesson(short);
    const l2 = demoLesson(longHistory);
    expect(l2.why).not.toBe(l1.why);
  });
});

describe("demoBuildHtml", () => {
  it("returns a valid HTML string", () => {
    const html = demoBuildHtml("Game", "Build a game tracker");
    expect(html).toContain("<!DOCTYPE html>");
    expect(html).toContain("</html>");
    expect(html).toContain("Game");
  });

  it("includes the change request in a banner when provided", () => {
    const html = demoBuildHtml("App", "Build an app", "add dark mode");
    expect(html).toContain("add dark mode");
  });

  it("escapes HTML special characters in projectType", () => {
    const html = demoBuildHtml('<script>alert("xss")</script>', "prompt");
    expect(html).not.toContain("<script>alert(");
    expect(html).toContain("&lt;script&gt;");
  });
});

describe("demoEdits", () => {
  it("returns an EditResult with at least one edit", () => {
    const result = demoEdits("add dark mode");
    expect(result).toHaveProperty("summary");
    expect(result).toHaveProperty("edits");
    expect(result.edits.length).toBeGreaterThan(0);
  });

  it("find target exists in the base demo HTML so edit can land", () => {
    const html = demoBuildHtml("App", "build an app");
    const result = demoEdits("my change");
    expect(html).toContain(result.edits[0].find);
  });
});

describe("demoCoach", () => {
  it("returns step 1 note for initial build", () => {
    const note = demoCoach(1, "Initial build");
    expect(note).toHaveProperty("whatChanged");
    expect(note).toHaveProperty("concept");
    expect(note).toHaveProperty("proTip");
  });

  it("returns iteration note for later steps", () => {
    const note = demoCoach(2, "add search bar");
    expect(note.whatChanged).toContain("add search bar");
  });
});
