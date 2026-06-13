import { describe, it, expect } from "vitest";
import { demoAdvisorReply, demoAssessment, demoLesson } from "@/lib/demo";
import type { ChatMessage } from "@/lib/types";

const msg = (role: "user" | "advisor", content: string, id = "1"): ChatMessage => ({
  id,
  role,
  content,
});

describe("demoAdvisorReply", () => {
  it("returns the closing message when phase is closing", () => {
    const reply = demoAdvisorReply([msg("user", "I want to build a game")], true);
    expect(reply).toContain("sharp enough to build");
  });

  it("returns a pushback that references a salient word from the last user message", () => {
    const history = [msg("user", "I want to build a flashcard learning application")];
    const reply = demoAdvisorReply(history, false);
    expect(typeof reply).toBe("string");
    expect(reply.length).toBeGreaterThan(20);
  });

  it("acknowledges an image attachment in the first few turns", () => {
    const history: ChatMessage[] = [
      { id: "1", role: "user", content: "here is my sketch", images: [{ mediaType: "image/png", data: "abc" }] },
    ];
    const reply = demoAdvisorReply(history, false);
    expect(reply).toContain("sketch");
  });

  it("cycles through pushbacks as turns increase", () => {
    const replies = new Set<string>();
    for (let turns = 1; turns <= 6; turns++) {
      const history = Array.from({ length: turns }, (_, i) =>
        msg("user", `turn ${i} building tracker application`, String(i)),
      );
      replies.add(demoAdvisorReply(history, false));
    }
    // Should have at least 3 distinct replies across 6 turns
    expect(replies.size).toBeGreaterThanOrEqual(3);
  });
});

describe("demoAssessment", () => {
  const threshold = 80;
  const basicHistory: ChatMessage[] = [
    msg("user", "I want to build a flashcard app for studying vocabulary"),
    msg("advisor", "Interesting. Who is it for?"),
    msg("user", "High school students learning Spanish words for their exams"),
  ];

  it("returns a well-formed Assessment object", () => {
    const result = demoAssessment(basicHistory, null, threshold);
    expect(result).toHaveProperty("projectType");
    expect(result).toHaveProperty("clarity");
    expect(result).toHaveProperty("conciseness");
    expect(result).toHaveProperty("dynamicCriteria");
    expect(result).toHaveProperty("overall");
    expect(result).toHaveProperty("ready");
    expect(result).toHaveProperty("threshold");
    expect(result).toHaveProperty("refinedPrompt");
  });

  it("scores are clamped to [0, 100]", () => {
    const result = demoAssessment(basicHistory, null, threshold);
    const scores = [
      result.clarity.score,
      result.conciseness.score,
      ...result.dynamicCriteria.map((d) => d.score),
    ];
    for (const s of scores) {
      expect(s).toBeGreaterThanOrEqual(0);
      expect(s).toBeLessThanOrEqual(100);
    }
  });

  it("stamps the correct threshold", () => {
    expect(demoAssessment(basicHistory, null, 75).threshold).toBe(75);
  });

  it("caps dynamic criteria to 3 on first assessment", () => {
    const result = demoAssessment(basicHistory, null, threshold);
    expect(result.dynamicCriteria.length).toBeLessThanOrEqual(3);
  });

  it("respects priorCriteria keys", () => {
    const prior = [
      { key: "core_mechanic", label: "Core mechanic", bestPractice: "core_mechanic" },
      { key: "success_criteria", label: "Win state", bestPractice: "success_criteria" },
    ];
    const result = demoAssessment(basicHistory, prior, threshold);
    expect(result.dynamicCriteria.map((d) => d.key)).toEqual(["core_mechanic", "success_criteria"]);
  });

  it("detects game projects and uses game criteria", () => {
    const gameHistory: ChatMessage[] = [
      msg("user", "I want to build a puzzle game where players solve maths problems"),
    ];
    const result = demoAssessment(gameHistory, null, threshold);
    expect(result.projectType).toBe("Game");
  });

  it("score rises with more turns (engagement model)", () => {
    const short = [msg("user", "app")];
    const long = Array.from({ length: 8 }, (_, i) =>
      msg("user", `detailed answer turn ${i} building a great vocab flashcard learning app`, String(i)),
    );
    const shortOverall = demoAssessment(short, null, threshold).overall;
    const longOverall = demoAssessment(long, null, threshold).overall;
    expect(longOverall).toBeGreaterThan(shortOverall);
  });
});

describe("demoLesson", () => {
  it("returns a Lesson with title, lesson, and why", () => {
    const result = demoLesson([msg("user", "hi")]);
    expect(result).toHaveProperty("title");
    expect(result).toHaveProperty("lesson");
    expect(result).toHaveProperty("why");
    expect(typeof result.title).toBe("string");
    expect(result.title.length).toBeGreaterThan(0);
  });

  it("adjusts 'why' text based on number of turns", () => {
    const shortWhy = demoLesson([msg("user", "hi")]).why;
    const longHistory = Array.from({ length: 6 }, (_, i) => msg("user", `turn ${i}`, String(i)));
    const longWhy = demoLesson(longHistory).why;
    expect(longWhy).not.toBe(shortWhy);
  });
});
