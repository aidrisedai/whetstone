import { describe, it, expect } from "vitest";
import { demoAdvisorReply, demoAssessment, demoLesson, demoEdits, demoPlan } from "./demo";
import type { ChatMessage } from "./types";

const userMsg = (content: string, id = "u1"): ChatMessage => ({
  id,
  role: "user",
  content,
});
const advMsg = (content: string, id = "a1"): ChatMessage => ({
  id,
  role: "advisor",
  content,
});

describe("demoAdvisorReply", () => {
  it("returns a closing message when closing=true", () => {
    const reply = demoAdvisorReply([], true);
    expect(reply.length).toBeGreaterThan(10);
    expect(reply.toLowerCase()).toContain("sharp");
  });

  it("returns a pushback on the first turn", () => {
    const history = [userMsg("I want to build a todo app")];
    const reply = demoAdvisorReply(history, false);
    expect(reply.length).toBeGreaterThan(10);
  });

  it("rotates through pushbacks as turns increase", () => {
    const replies = new Set<string>();
    for (let i = 1; i <= 6; i++) {
      const history: ChatMessage[] = [];
      for (let j = 0; j < i; j++) history.push(userMsg(`msg ${j}`, `u${j}`));
      replies.add(demoAdvisorReply(history, false));
    }
    // 6 distinct pushback templates should produce 6 distinct replies
    expect(replies.size).toBeGreaterThan(1);
  });

  it("gives image-specific reply on turn 1 when an image is attached", () => {
    const history: ChatMessage[] = [
      {
        id: "u1",
        role: "user",
        content: "here's my sketch",
        images: [{ mediaType: "image/png", data: "base64data" }],
      },
    ];
    const reply = demoAdvisorReply(history, false);
    expect(reply.toLowerCase()).toContain("sketch");
  });
});

describe("demoAssessment", () => {
  it("returns a valid Assessment shape", () => {
    const history = [userMsg("I want to build a game about space exploration")];
    const result = demoAssessment(history, null, 80);
    expect(result).toHaveProperty("overall");
    expect(result).toHaveProperty("ready");
    expect(result).toHaveProperty("clarity");
    expect(result).toHaveProperty("conciseness");
    expect(result.dynamicCriteria.length).toBeGreaterThan(0);
  });

  it("all scores are in 0-100 range", () => {
    const history = Array.from({ length: 5 }, (_, i) => userMsg(`message ${i}`, `u${i}`));
    const result = demoAssessment(history, null, 80);
    expect(result.clarity.score).toBeGreaterThanOrEqual(0);
    expect(result.clarity.score).toBeLessThanOrEqual(100);
    expect(result.conciseness.score).toBeGreaterThanOrEqual(0);
    expect(result.conciseness.score).toBeLessThanOrEqual(100);
    for (const d of result.dynamicCriteria) {
      expect(d.score).toBeGreaterThanOrEqual(0);
      expect(d.score).toBeLessThanOrEqual(100);
    }
  });

  it("detects game project type", () => {
    const history = [userMsg("I want to build a puzzle game with levels and a score")];
    const result = demoAssessment(history, null, 80);
    expect(result.projectType).toBe("Game");
  });

  it("detects AI assistant project type", () => {
    const history = [userMsg("I want to build an AI chatbot tutor for kids")];
    const result = demoAssessment(history, null, 80);
    expect(result.projectType).toBe("AI assistant");
  });

  it("defaults to Web app when no keywords match", () => {
    const history = [userMsg("I want to build something cool for my friend")];
    const result = demoAssessment(history, null, 80);
    expect(result.projectType).toBe("Web app");
  });

  it("respects priorCriteria — locks dimension keys across turns", () => {
    const history = [userMsg("I want to build a web app")];
    const firstResult = demoAssessment(history, null, 80);
    const prior = firstResult.dynamicCriteria.map(({ key, label, bestPractice }) => ({
      key,
      label,
      bestPractice,
    }));
    const secondResult = demoAssessment(
      [...history, advMsg("good start", "a1"), userMsg("more details", "u2")],
      prior,
      80,
    );
    const firstKeys = firstResult.dynamicCriteria.map((d) => d.key);
    const secondKeys = secondResult.dynamicCriteria.map((d) => d.key);
    expect(secondKeys).toEqual(firstKeys);
  });

  it("score rises with more engagement", () => {
    const short = [userMsg("build a thing")];
    const long = Array.from({ length: 8 }, (_, i) =>
      userMsg("I want to build a detailed app with lots of features for my school project", `u${i}`),
    );
    const scoreShort = demoAssessment(short, null, 80).overall;
    const scoreLong = demoAssessment(long, null, 80).overall;
    expect(scoreLong).toBeGreaterThan(scoreShort);
  });

  it("ready=true when enough engagement crosses threshold", () => {
    const history = Array.from({ length: 12 }, (_, i) =>
      userMsg("detailed message to push score up with lots of words to increase richness score beyond threshold", `u${i}`),
    );
    const result = demoAssessment(history, null, 80);
    expect(result.ready).toBe(true);
  });
});

describe("demoLesson", () => {
  it("returns a Lesson with non-empty fields", () => {
    const history = [userMsg("some idea")];
    const lesson = demoLesson(history);
    expect(lesson.title.length).toBeGreaterThan(0);
    expect(lesson.lesson.length).toBeGreaterThan(0);
    expect(lesson.why.length).toBeGreaterThan(0);
  });

  it("returns a different 'why' for longer sessions", () => {
    const short = demoLesson([userMsg("quick")]);
    const long = demoLesson(
      Array.from({ length: 6 }, (_, i) => userMsg("msg", `u${i}`)),
    );
    expect(long.why).not.toBe(short.why);
  });
});

describe("demoEdits", () => {
  it("returns an edit that patches </body>", () => {
    const result = demoEdits("make the background blue");
    expect(result.edits.length).toBeGreaterThan(0);
    expect(result.edits[0].find).toContain("</body>");
  });

  it("includes the change request in the edit replace text", () => {
    const result = demoEdits("add a button");
    expect(result.edits[0].replace).toContain("add a button");
  });
});

describe("demoPlan", () => {
  it("returns exactly 3 parts", () => {
    const plan = demoPlan("Web app", "build something", "Alex", "Minecraft");
    expect(plan.parts).toHaveLength(3);
  });

  it("includes the builder name in bigPicture when provided", () => {
    const plan = demoPlan("Web app", "build something", "Sam", "");
    expect(plan.bigPicture).toContain("Sam");
  });

  it("includes the favorite game in bigPicture", () => {
    const plan = demoPlan("Web app", "build something", "", "Zelda");
    expect(plan.bigPicture).toContain("Zelda");
  });

  it("uses projectType in the project name", () => {
    const plan = demoPlan("Game", "build a game", "", "");
    expect(plan.projectName.toLowerCase()).toContain("game");
  });
});
