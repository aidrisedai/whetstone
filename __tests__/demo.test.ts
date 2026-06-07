import { describe, it, expect } from "vitest";
import {
  demoAdvisorReply,
  demoAssessment,
  demoLesson,
  demoBuildHtml,
  demoCoach,
  demoEdits,
  demoPlan,
  demoQuiz,
  demoExtendPart,
} from "../lib/demo";
import type { ChatMessage } from "../lib/types";

function userMsg(content: string, id = "u1"): ChatMessage {
  return { id, role: "user", content };
}

function advisorMsg(content: string, id = "a1"): ChatMessage {
  return { id, role: "advisor", content };
}

const twoTurnHistory: ChatMessage[] = [
  userMsg("I want to build a todo app for students"),
  advisorMsg("What specific problem does it solve?"),
  userMsg("Students forget their homework assignments"),
];

describe("demoAdvisorReply", () => {
  it("returns a non-empty string", () => {
    const reply = demoAdvisorReply(twoTurnHistory, false);
    expect(typeof reply).toBe("string");
    expect(reply.length).toBeGreaterThan(0);
  });

  it("returns a closing message when closing=true", () => {
    const reply = demoAdvisorReply(twoTurnHistory, true);
    expect(reply).toContain("sharp enough");
  });

  it("returns image-specific reply when history contains user image", () => {
    const withImage: ChatMessage[] = [
      { id: "u1", role: "user", content: "here is my sketch", images: [{ mediaType: "image/png", data: "abc123" }] },
    ];
    const reply = demoAdvisorReply(withImage, false);
    expect(reply).toContain("sketch");
  });

  it("escalates pushback based on turn count", () => {
    const oneTurn = [userMsg("build a game")];
    const fourTurns = [
      userMsg("build a game"),
      advisorMsg("q"),
      userMsg("a racing game"),
      advisorMsg("q2"),
      userMsg("you race other players"),
    ];
    const r1 = demoAdvisorReply(oneTurn, false);
    const r4 = demoAdvisorReply(fourTurns, false);
    // Different pushback at different turn counts — just check they're different strings
    expect(r1).not.toBe(r4);
  });
});

describe("demoAssessment", () => {
  it("returns a valid Assessment shape", () => {
    const result = demoAssessment(twoTurnHistory, null, 80);
    expect(result).toHaveProperty("projectType");
    expect(result).toHaveProperty("clarity");
    expect(result).toHaveProperty("conciseness");
    expect(result).toHaveProperty("dynamicCriteria");
    expect(result).toHaveProperty("refinedPrompt");
    expect(result).toHaveProperty("overall");
    expect(result).toHaveProperty("ready");
    expect(result).toHaveProperty("threshold", 80);
  });

  it("scores rise as conversation grows", () => {
    const short = [userMsg("build an app")];
    const long = Array.from({ length: 8 }, (_, i) =>
      i % 2 === 0 ? userMsg(`answer ${i} with lots of detail about the specific user`) : advisorMsg("q"),
    );
    const s1 = demoAssessment(short, null, 80).overall;
    const s8 = demoAssessment(long, null, 80).overall;
    expect(s8).toBeGreaterThan(s1);
  });

  it("locks criteria to priorCriteria when provided", () => {
    const prior = [
      { key: "core_mechanic", label: "Core mechanic", bestPractice: "core_mechanic" },
    ];
    const result = demoAssessment(twoTurnHistory, prior, 80);
    expect(result.dynamicCriteria.map((c) => c.key)).toEqual(["core_mechanic"]);
  });

  it("detects game project type from history", () => {
    const gameHistory = [userMsg("I want to make a puzzle game with levels and scoring")];
    const result = demoAssessment(gameHistory, null, 80);
    expect(result.projectType).toBe("Game");
  });

  it("overall score is clamped 0-100", () => {
    const result = demoAssessment(twoTurnHistory, null, 80);
    expect(result.overall).toBeGreaterThanOrEqual(0);
    expect(result.overall).toBeLessThanOrEqual(100);
  });

  it("ready is false on a brand-new single-word idea", () => {
    const result = demoAssessment([userMsg("app")], null, 80);
    expect(result.ready).toBe(false);
  });
});

describe("demoLesson", () => {
  it("returns a Lesson with title, lesson, why", () => {
    const lesson = demoLesson(twoTurnHistory);
    expect(lesson).toHaveProperty("title");
    expect(lesson).toHaveProperty("lesson");
    expect(lesson).toHaveProperty("why");
    expect(lesson.title.length).toBeGreaterThan(0);
  });

  it("returns slightly different why for long vs short conversations", () => {
    const short = demoLesson([userMsg("app"), advisorMsg("q")]);
    const long = demoLesson(Array.from({ length: 12 }, (_, i) =>
      i % 2 === 0 ? userMsg(`msg ${i}`) : advisorMsg("q"),
    ));
    expect(short.why).not.toBe(long.why);
  });
});

describe("demoBuildHtml", () => {
  it("returns valid HTML starting with DOCTYPE", () => {
    const html = demoBuildHtml("Todo App", "Build a todo app", undefined);
    expect(html.trimStart()).toMatch(/^<!DOCTYPE html>/i);
  });

  it("includes the project type in the output", () => {
    const html = demoBuildHtml("Puzzle Game", "Build a puzzle game");
    expect(html).toContain("Puzzle Game");
  });

  it("includes a change-request banner when changeRequest is provided", () => {
    const html = demoBuildHtml("App", "prompt", "add dark mode");
    expect(html).toContain("add dark mode");
  });

  it("escapes HTML in project type to prevent injection", () => {
    const html = demoBuildHtml("<script>alert(1)</script>", "prompt");
    expect(html).not.toContain("<script>alert(1)</script>");
    expect(html).toContain("&lt;script&gt;");
  });

  it("contains core interactive elements", () => {
    const html = demoBuildHtml("App", "prompt");
    expect(html).toContain("<input");
    expect(html).toContain("<button");
    expect(html).toContain("localStorage");
  });
});

describe("demoCoach", () => {
  it("returns a CoachNote with whatChanged, concept, proTip", () => {
    const note = demoCoach(1, "");
    expect(note).toHaveProperty("whatChanged");
    expect(note).toHaveProperty("concept");
    expect(note).toHaveProperty("proTip");
  });

  it("includes the change request on step > 1", () => {
    const note = demoCoach(2, "make it dark mode");
    expect(note.whatChanged).toContain("make it dark mode");
  });

  it("gives first-build coaching on step 1", () => {
    const note = demoCoach(1, "");
    expect(note.whatChanged).toContain("first version");
  });
});

describe("demoEdits", () => {
  it("returns an EditResult with summary and edits array", () => {
    const result = demoEdits("add dark mode");
    expect(result).toHaveProperty("summary");
    expect(Array.isArray(result.edits)).toBe(true);
    expect(result.edits.length).toBeGreaterThan(0);
  });

  it("each edit has find and replace strings", () => {
    const { edits } = demoEdits("change color");
    for (const e of edits) {
      expect(typeof e.find).toBe("string");
      expect(typeof e.replace).toBe("string");
      expect(e.find.length).toBeGreaterThan(0);
    }
  });

  it("escapes HTML in the change request", () => {
    const { edits } = demoEdits('<script>alert("xss")</script>');
    const allReplace = edits.map((e) => e.replace).join("");
    expect(allReplace).not.toContain("<script>");
  });
});

describe("demoPlan", () => {
  it("returns a plan with projectName, bigPicture, and parts", () => {
    const plan = demoPlan("Web app", "build a tracker", "Alex", "Minecraft");
    expect(plan).toHaveProperty("projectName");
    expect(plan).toHaveProperty("bigPicture");
    expect(Array.isArray(plan.parts)).toBe(true);
    expect(plan.parts.length).toBeGreaterThan(0);
  });

  it("includes the builder's name in bigPicture when provided", () => {
    const plan = demoPlan("App", "prompt", "Jordan", "");
    expect(plan.bigPicture).toContain("Jordan");
  });

  it("includes a game analogy in bigPicture when favorite game provided", () => {
    const plan = demoPlan("App", "prompt", "", "Minecraft");
    expect(plan.bigPicture).toContain("Minecraft");
  });

  it("each part has required fields", () => {
    const { parts } = demoPlan("App", "prompt", "", "");
    for (const p of parts) {
      expect(p).toHaveProperty("title");
      expect(p).toHaveProperty("whatItIs");
      expect(p).toHaveProperty("why");
      expect(p).toHaveProperty("concept");
      expect(p).toHaveProperty("buildSpec");
    }
  });
});

describe("demoQuiz", () => {
  it("returns a Checkpoint with intro and questions", () => {
    const quiz = demoQuiz("🏗️ The Stage", "The screen");
    expect(quiz).toHaveProperty("intro");
    expect(Array.isArray(quiz.questions)).toBe(true);
    expect(quiz.questions.length).toBeGreaterThan(0);
  });

  it("each question has required fields", () => {
    const { questions } = demoQuiz("Part 1", "DOM");
    for (const q of questions) {
      expect(q).toHaveProperty("id");
      expect(q).toHaveProperty("question");
      expect(Array.isArray(q.options)).toBe(true);
      expect(q.options.length).toBeGreaterThanOrEqual(2);
      expect(typeof q.correctIndex).toBe("number");
      expect(q).toHaveProperty("explainCorrect");
      expect(q).toHaveProperty("explainWrong");
    }
  });
});

describe("demoExtendPart", () => {
  it("returns a part shape with all required fields", () => {
    const part = demoExtendPart("add dark mode toggle");
    expect(part).toHaveProperty("title");
    expect(part).toHaveProperty("whatItIs");
    expect(part).toHaveProperty("why");
    expect(part).toHaveProperty("concept");
    expect(part).toHaveProperty("buildSpec");
  });

  it("reflects the request in whatItIs and buildSpec", () => {
    const part = demoExtendPart("add a counter");
    expect(part.whatItIs).toContain("add a counter");
    expect(part.buildSpec).toContain("add a counter");
  });
});
