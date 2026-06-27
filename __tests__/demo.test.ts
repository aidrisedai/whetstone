import { describe, it, expect } from "vitest";
import {
  demoAdvisorReply,
  demoAssessment,
  demoPlan,
  demoLesson,
  demoCoach,
  demoExtendPart,
} from "../lib/demo";
import type { ChatMessage } from "../lib/types";

const userMsg = (content: string): ChatMessage => ({ role: "user", content, id: "u1" });
const assistantMsg = (content: string): ChatMessage => ({ role: "advisor", content, id: "a1" });

const shortHistory: ChatMessage[] = [userMsg("I want to build a game")];
const longHistory: ChatMessage[] = [
  userMsg("I want to build a multiplayer game for teens"),
  assistantMsg("Tell me more about the core mechanic."),
  userMsg("Players compete in quiz rounds about science topics, fastest correct answer wins points"),
  assistantMsg("Good — what does a successful first session look like?"),
  userMsg("A player joins, completes 3 rounds, sees their leaderboard ranking"),
];

describe("demoAdvisorReply", () => {
  it("returns a string for short history", () => {
    const reply = demoAdvisorReply(shortHistory, false);
    expect(typeof reply).toBe("string");
    expect(reply.length).toBeGreaterThan(10);
  });

  it("returns closing message when closing=true", () => {
    const reply = demoAdvisorReply(longHistory, true);
    expect(reply).toContain("sharp enough to build");
  });

  it("escalates pushback through turns", () => {
    const reply1 = demoAdvisorReply(shortHistory, false);
    const reply5 = demoAdvisorReply(longHistory, false);
    expect(reply1).not.toBe(reply5);
  });
});

describe("demoAssessment", () => {
  it("returns a valid Assessment shape", () => {
    const result = demoAssessment(shortHistory, null, 80);
    expect(typeof result.overall).toBe("number");
    expect(result.overall).toBeGreaterThanOrEqual(0);
    expect(result.overall).toBeLessThanOrEqual(100);
    expect(typeof result.ready).toBe("boolean");
    expect(result.threshold).toBe(80);
  });

  it("scores climb with more turns and content", () => {
    const shortResult = demoAssessment(shortHistory, null, 80);
    const longResult = demoAssessment(longHistory, null, 80);
    expect(longResult.overall).toBeGreaterThan(shortResult.overall);
  });

  it("respects the threshold", () => {
    const result = demoAssessment(longHistory, null, 80);
    expect(result.threshold).toBe(80);
  });

  it("includes dynamic criteria", () => {
    const result = demoAssessment(longHistory, null, 80);
    expect(result.dynamicCriteria.length).toBeGreaterThan(0);
  });

  it("locks criteria when prior is provided", () => {
    const prior = [{ key: "core_mechanic", label: "Core mechanic", bestPractice: "core_mechanic" }];
    const result = demoAssessment(longHistory, prior, 80);
    expect(result.dynamicCriteria.map((d) => d.key)).toContain("core_mechanic");
  });
});

describe("demoPlan", () => {
  it("returns projectName, bigPicture, and parts", () => {
    const result = demoPlan("Game", "A quiz game", "Alex", "Minecraft");
    expect(result.projectName).toBeTruthy();
    expect(result.bigPicture).toBeTruthy();
    expect(Array.isArray(result.parts)).toBe(true);
    expect(result.parts.length).toBeGreaterThan(0);
  });

  it("includes the builder name in bigPicture when provided", () => {
    const result = demoPlan("Game", "A quiz game", "Alex", "Minecraft");
    expect(result.bigPicture).toContain("Alex");
  });

  it("includes favorite game reference when provided", () => {
    const result = demoPlan("Game", "A quiz game", "Alex", "Minecraft");
    expect(result.bigPicture).toContain("Minecraft");
  });

  it("each part has required fields", () => {
    const result = demoPlan("Web app", "A todo app", "", "");
    for (const part of result.parts) {
      expect(part.title).toBeTruthy();
      expect(part.whatItIs).toBeTruthy();
      expect(part.concept).toBeTruthy();
      expect(part.buildSpec).toBeTruthy();
    }
  });
});

describe("demoLesson", () => {
  it("returns a lesson with title, lesson, and why", () => {
    const result = demoLesson(longHistory);
    expect(result.title).toBeTruthy();
    expect(result.lesson).toBeTruthy();
    expect(result.why).toBeTruthy();
  });
});

describe("demoCoach", () => {
  it("returns step 1 intro message", () => {
    const result = demoCoach(1, "");
    expect(result.whatChanged).toBeTruthy();
    expect(result.concept).toBeTruthy();
    expect(result.proTip).toBeTruthy();
  });

  it("returns later step message", () => {
    const result = demoCoach(2, "add dark mode");
    expect(result.whatChanged).toContain("add dark mode");
  });
});

describe("demoExtendPart", () => {
  it("returns a valid part shape", () => {
    const result = demoExtendPart("add a leaderboard");
    expect(result.title).toBeTruthy();
    expect(result.whatItIs).toContain("add a leaderboard");
    expect(result.concept).toBeTruthy();
    expect(result.buildSpec).toBeTruthy();
  });
});
