import { describe, it, expect } from "vitest";
import { demoAdvisorReply, demoAssessment, demoBuildHtml } from "@/lib/demo";
import type { ChatMessage } from "@/lib/types";

const userMsg = (content: string, id = "u1"): ChatMessage => ({
  id,
  role: "user",
  content,
});
const advisorMsg = (content: string, id = "a1"): ChatMessage => ({
  id,
  role: "advisor",
  content,
});

describe("demoAdvisorReply", () => {
  it("returns a non-empty string for any history", () => {
    const history = [userMsg("I want to build a todo app")];
    const reply = demoAdvisorReply(history, false);
    expect(typeof reply).toBe("string");
    expect(reply.length).toBeGreaterThan(10);
  });

  it("returns the closing reply when phase is closing", () => {
    const history = [userMsg("todo app")];
    const reply = demoAdvisorReply(history, true);
    expect(reply).toContain("sharp enough to build");
  });

  it("returns an image-aware reply when message has an image", () => {
    const history: ChatMessage[] = [
      {
        id: "u1",
        role: "user",
        content: "here's my sketch",
        images: [{ mediaType: "image/png", data: "abc123" }],
      },
    ];
    const reply = demoAdvisorReply(history, false);
    expect(reply).toContain("sketch");
  });

  it("cycles through pushbacks as turns increase", () => {
    const buildHistory = (n: number): ChatMessage[] => {
      const msgs: ChatMessage[] = [];
      for (let i = 0; i < n; i++) {
        msgs.push(userMsg(`turn ${i}`, `u${i}`));
        msgs.push(advisorMsg(`reply ${i}`, `a${i}`));
      }
      return msgs;
    };
    const reply1 = demoAdvisorReply(buildHistory(1), false);
    const reply3 = demoAdvisorReply(buildHistory(3), false);
    expect(reply1).not.toBe(reply3);
  });
});

describe("demoAssessment", () => {
  it("returns a valid Assessment shape", () => {
    const history = [userMsg("I want to build a todo app")];
    const result = demoAssessment(history, null, 80);
    expect(result).toHaveProperty("clarity");
    expect(result).toHaveProperty("conciseness");
    expect(result).toHaveProperty("dynamicCriteria");
    expect(result).toHaveProperty("overall");
    expect(result).toHaveProperty("ready");
    expect(result).toHaveProperty("threshold", 80);
    expect(result).toHaveProperty("refinedPrompt");
  });

  it("overall is within 0–100", () => {
    const history = [userMsg("game with levels")];
    const result = demoAssessment(history, null, 80);
    expect(result.overall).toBeGreaterThanOrEqual(0);
    expect(result.overall).toBeLessThanOrEqual(100);
  });

  it("score climbs with more user turns", () => {
    const few = [userMsg("game")];
    const many = [
      userMsg("game", "u1"), advisorMsg("reply", "a1"),
      userMsg("game", "u2"), advisorMsg("reply", "a2"),
      userMsg("game", "u3"), advisorMsg("reply", "a3"),
      userMsg("game", "u4"), advisorMsg("reply", "a4"),
      userMsg("game", "u5"),
    ];
    const scoreFew = demoAssessment(few, null, 80).overall;
    const scoreMany = demoAssessment(many, null, 80).overall;
    expect(scoreMany).toBeGreaterThan(scoreFew);
  });

  it("locks dynamic criteria to prior when provided", () => {
    const history = [userMsg("todo app")];
    const prior = [
      { key: "core_mechanic", label: "Core mechanic", bestPractice: "core_mechanic" },
    ];
    const result = demoAssessment(history, prior, 80);
    expect(result.dynamicCriteria[0].key).toBe("core_mechanic");
    expect(result.dynamicCriteria[0].label).toBe("Core mechanic");
  });
});

describe("demoBuildHtml", () => {
  it("returns a non-empty HTML string", () => {
    const html = demoBuildHtml("App", "a todo app");
    expect(typeof html).toBe("string");
    expect(html.length).toBeGreaterThan(100);
  });

  it("contains DOCTYPE and body", () => {
    const html = demoBuildHtml("App", "a todo app");
    expect(html).toMatch(/<!DOCTYPE html/i);
    expect(html).toMatch(/<body/i);
  });

  it("produces different output for different project types", () => {
    const appHtml = demoBuildHtml("App", "a web app");
    const gameHtml = demoBuildHtml("Game", "a platformer game");
    expect(appHtml).not.toBe(gameHtml);
  });
});
