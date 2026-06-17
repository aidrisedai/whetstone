import { describe, it, expect } from "vitest";
import { demoAdvisorReply, demoAssessment, demoLesson } from "../lib/demo";
import type { ChatMessage } from "../lib/types";

const msg = (role: ChatMessage["role"], content: string): ChatMessage => ({
  id: `${role}-1`,
  role,
  content,
});

describe("demoAdvisorReply", () => {
  it("returns a string for any history", () => {
    const history = [msg("user", "I want to build a game tracker app")];
    const reply = demoAdvisorReply(history, false);
    expect(typeof reply).toBe("string");
    expect(reply.length).toBeGreaterThan(0);
  });

  it("returns the closing message when closing=true", () => {
    const reply = demoAdvisorReply([msg("user", "ok")], true);
    expect(reply).toContain("sharp enough to build");
  });

  it("returns an image-aware reply on first turn with image", () => {
    const history: ChatMessage[] = [
      {
        id: "u1",
        role: "user",
        content: "Here is my sketch",
        images: [{ mediaType: "image/png", data: "base64data" }],
      },
    ];
    const reply = demoAdvisorReply(history, false);
    expect(reply).toContain("sketch");
  });

  it("cycles through different pushbacks on later turns", () => {
    const history: ChatMessage[] = [];
    const replies = new Set<string>();
    for (let i = 0; i < 6; i++) {
      history.push(msg("user", `turn ${i} about my social networking platform for students`));
      history.push(msg("advisor", "response"));
      replies.add(demoAdvisorReply([...history], false));
    }
    expect(replies.size).toBeGreaterThan(1);
  });
});

describe("demoAssessment", () => {
  const history = [
    msg("user", "I want to build a budget tracker for college students"),
    msg("advisor", "Who specifically?"),
    msg("user", "Students who overspend on food and want weekly spending limits"),
  ];

  it("returns a valid Assessment shape", () => {
    const a = demoAssessment(history, null, 80);
    expect(a).toHaveProperty("clarity");
    expect(a).toHaveProperty("conciseness");
    expect(a).toHaveProperty("dynamicCriteria");
    expect(a).toHaveProperty("overall");
    expect(a).toHaveProperty("ready");
    expect(a).toHaveProperty("threshold");
    expect(a.threshold).toBe(80);
  });

  it("scores rise with more substantive history", () => {
    const short = [msg("user", "app")];
    const long = Array.from({ length: 6 }, (_, i) =>
      msg("user", `turn ${i} I want to build a budget tracker for college students with weekly limits`)
    );
    const shortScore = demoAssessment(short, null, 80).overall;
    const longScore = demoAssessment(long, null, 80).overall;
    expect(longScore).toBeGreaterThan(shortScore);
  });

  it("respects prior criteria if provided", () => {
    const prior = [
      { key: "core_mechanic", label: "Core mechanic", bestPractice: "core_mechanic" },
    ];
    const a = demoAssessment(history, prior, 80);
    expect(a.dynamicCriteria).toHaveLength(1);
    expect(a.dynamicCriteria[0].key).toBe("core_mechanic");
  });

  it("clamps scores to 0-100", () => {
    const a = demoAssessment(history, null, 80);
    for (const d of [a.clarity, a.conciseness, ...a.dynamicCriteria]) {
      expect(d.score).toBeGreaterThanOrEqual(0);
      expect(d.score).toBeLessThanOrEqual(100);
    }
  });
});

describe("demoLesson", () => {
  it("returns a Lesson with title, lesson, and why", () => {
    const lesson = demoLesson([msg("user", "idea"), msg("advisor", "response")]);
    expect(lesson).toHaveProperty("title");
    expect(lesson).toHaveProperty("lesson");
    expect(lesson).toHaveProperty("why");
    expect(lesson.title.length).toBeGreaterThan(0);
  });
});
