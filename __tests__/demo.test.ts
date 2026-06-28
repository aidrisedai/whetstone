import { describe, it, expect } from "vitest";
import {
  demoAdvisorReply,
  demoAssessment,
  demoLesson,
  demoBuildHtml,
  demoEdits,
  demoPlan,
  demoExtendPart,
} from "../lib/demo";
import type { ChatMessage } from "../lib/types";

const userMsg = (content: string): ChatMessage => ({
  id: "u1",
  role: "user",
  content,
});
const advisorMsg = (content: string): ChatMessage => ({
  id: "a1",
  role: "advisor",
  content,
});

describe("demoAdvisorReply", () => {
  it("returns the closing line when closing=true", () => {
    const reply = demoAdvisorReply([userMsg("test")], true);
    expect(reply).toContain("sharp enough to build");
  });

  it("returns a pushback for regular turns", () => {
    const reply = demoAdvisorReply([userMsg("I want to build a quiz app")], false);
    expect(typeof reply).toBe("string");
    expect(reply.length).toBeGreaterThan(10);
  });

  it("references an image when one is present in turn 1-2", () => {
    const history: ChatMessage[] = [
      {
        id: "u1",
        role: "user",
        content: "here is my sketch",
        images: [{ mediaType: "image/png", data: "abc" }],
      },
    ];
    const reply = demoAdvisorReply(history, false);
    expect(reply).toContain("sketch");
  });
});

describe("demoAssessment", () => {
  const history = [
    userMsg("I want to build a tracker app for students to track their homework assignments"),
    advisorMsg("Interesting. Who exactly?"),
    userMsg("High school students, specifically to track due dates and subjects with reminders"),
  ];

  it("returns a valid Assessment shape", () => {
    const a = demoAssessment(history, null, 80);
    expect(typeof a.overall).toBe("number");
    expect(a.overall).toBeGreaterThanOrEqual(0);
    expect(a.overall).toBeLessThanOrEqual(100);
    expect(typeof a.ready).toBe("boolean");
    expect(a.threshold).toBe(80);
    expect(a.dynamicCriteria.length).toBeGreaterThan(0);
    expect(a.refinedPrompt.length).toBeGreaterThan(0);
  });

  it("locks to priorCriteria when provided", () => {
    const prior = [{ key: "core_mechanic", label: "Core mechanic", bestPractice: "core_mechanic" }];
    const a = demoAssessment(history, prior, 80);
    expect(a.dynamicCriteria).toHaveLength(1);
    expect(a.dynamicCriteria[0].key).toBe("core_mechanic");
  });

  it("score increases with more conversation turns", () => {
    const short = [userMsg("make an app")];
    const long = Array.from({ length: 8 }, (_, i) =>
      i % 2 === 0 ? userMsg(`turn ${i} adding more detail`) : advisorMsg("response"),
    );
    const aShort = demoAssessment(short, null, 80);
    const aLong = demoAssessment(long, null, 80);
    expect(aLong.overall).toBeGreaterThan(aShort.overall);
  });

  it("scores are within 0-100", () => {
    const a = demoAssessment(history, null, 80);
    expect(a.clarity.score).toBeGreaterThanOrEqual(0);
    expect(a.clarity.score).toBeLessThanOrEqual(100);
    expect(a.conciseness.score).toBeGreaterThanOrEqual(0);
    expect(a.conciseness.score).toBeLessThanOrEqual(100);
    for (const d of a.dynamicCriteria) {
      expect(d.score).toBeGreaterThanOrEqual(0);
      expect(d.score).toBeLessThanOrEqual(100);
    }
  });
});

describe("demoLesson", () => {
  it("returns a Lesson with required fields", () => {
    const lesson = demoLesson([userMsg("idea"), advisorMsg("push"), userMsg("sharper")]);
    expect(typeof lesson.title).toBe("string");
    expect(lesson.title.length).toBeGreaterThan(0);
    expect(typeof lesson.lesson).toBe("string");
    expect(typeof lesson.why).toBe("string");
  });
});

describe("demoBuildHtml", () => {
  it("returns a valid HTML document", () => {
    const html = demoBuildHtml("Homework Tracker", "Build a tracker for students");
    expect(html).toContain("<!DOCTYPE html>");
    expect(html).toContain("</html>");
    expect(html).toContain("<body");
    expect(html).toContain("<script"); // inline script is required for the interactive app
  });

  it("escapes special characters in projectType and prompt", () => {
    const html = demoBuildHtml('<script>alert(1)</script>', 'bad & "chars"');
    expect(html).not.toContain("<script>alert(1)</script>");
  });

  it("includes a changeRequest banner when provided", () => {
    const html = demoBuildHtml("App", "Prompt", "add dark mode");
    expect(html).toContain("add dark mode");
  });
});

describe("demoEdits", () => {
  it("returns an EditResult with summary and edits", () => {
    const result = demoEdits("add a button");
    expect(typeof result.summary).toBe("string");
    expect(Array.isArray(result.edits)).toBe(true);
    expect(result.edits.length).toBeGreaterThan(0);
    expect(typeof result.edits[0].find).toBe("string");
    expect(typeof result.edits[0].replace).toBe("string");
  });
});

describe("demoPlan", () => {
  it("returns a plan with 3 parts", () => {
    const plan = demoPlan("Web App", "A tracker app", "Alex", "Minecraft");
    expect(plan.parts).toHaveLength(3);
    expect(typeof plan.projectName).toBe("string");
    expect(typeof plan.bigPicture).toBe("string");
    for (const p of plan.parts) {
      expect(typeof p.title).toBe("string");
      expect(typeof p.whatItIs).toBe("string");
      expect(typeof p.buildSpec).toBe("string");
      expect(typeof p.concept).toBe("string");
    }
  });

  it("includes a game analogy when favoriteGame is given", () => {
    const plan = demoPlan("App", "Prompt", "Jordan", "Fortnite");
    expect(plan.bigPicture).toContain("Fortnite");
  });
});

describe("demoExtendPart", () => {
  it("returns a valid BuildPart shape (without id)", () => {
    const part = demoExtendPart("add a search bar");
    expect(typeof part.title).toBe("string");
    expect(typeof part.whatItIs).toBe("string");
    expect(typeof part.why).toBe("string");
    expect(typeof part.concept).toBe("string");
    expect(typeof part.buildSpec).toBe("string");
    expect(part.buildSpec).toContain("add a search bar");
  });
});
