import { describe, it, expect } from "vitest";
import {
  demoAdvisorReply,
  demoAssessment,
  demoLesson,
  demoBuildHtml,
  demoEdits,
  demoPlan,
  demoCoach,
  demoBuildLesson,
  demoQuiz,
  demoExtendPart,
  demoBoardLesson,
  demoBoardChat,
  demoCodeAsk,
} from "@/lib/demo";
import type { ChatMessage } from "@/lib/types";

function userMsg(content: string): ChatMessage {
  return { id: "u1", role: "user", content };
}

function advisorMsg(content: string): ChatMessage {
  return { id: "a1", role: "advisor", content };
}

const SHORT_HISTORY: ChatMessage[] = [userMsg("I want to build a task tracker app.")];
const MULTI_HISTORY: ChatMessage[] = [
  userMsg("I want to build a task tracker for students."),
  advisorMsg("Who are those students exactly?"),
  userMsg("High school students who need to track their assignments."),
  advisorMsg("What happens when they complete a task?"),
  userMsg("They mark it done and the app shows their progress."),
];

describe("demoAdvisorReply", () => {
  it("returns a non-empty string", () => {
    const reply = demoAdvisorReply(SHORT_HISTORY, false);
    expect(typeof reply).toBe("string");
    expect(reply.length).toBeGreaterThan(0);
  });

  it("returns a closing message when closing=true", () => {
    const reply = demoAdvisorReply(MULTI_HISTORY, true);
    expect(reply).toContain("sharp enough to build");
  });

  it("returns different pushbacks as conversation grows", () => {
    const histories: ChatMessage[][] = [];
    let h: ChatMessage[] = [];
    for (let i = 0; i < 6; i++) {
      h = [...h, userMsg(`Turn ${i + 1}: more details about my app idea.`), advisorMsg("Tell me more.")];
      histories.push([...h]);
    }
    const replies = histories.map((hist) => demoAdvisorReply(hist, false));
    // At least some should differ
    const unique = new Set(replies);
    expect(unique.size).toBeGreaterThan(1);
  });
});

describe("demoAssessment", () => {
  it("returns an Assessment with all required fields", () => {
    const a = demoAssessment(SHORT_HISTORY, null, 80);
    expect(a).toMatchObject({
      projectType: expect.any(String),
      overall: expect.any(Number),
      threshold: 80,
      ready: expect.any(Boolean),
      refinedPrompt: expect.any(String),
      clarity: expect.objectContaining({ score: expect.any(Number) }),
      conciseness: expect.objectContaining({ score: expect.any(Number) }),
      dynamicCriteria: expect.any(Array),
    });
  });

  it("all scores are in range 0..100", () => {
    const a = demoAssessment(MULTI_HISTORY, null, 80);
    expect(a.clarity.score).toBeGreaterThanOrEqual(0);
    expect(a.clarity.score).toBeLessThanOrEqual(100);
    expect(a.conciseness.score).toBeGreaterThanOrEqual(0);
    expect(a.conciseness.score).toBeLessThanOrEqual(100);
    for (const d of a.dynamicCriteria) {
      expect(d.score).toBeGreaterThanOrEqual(0);
      expect(d.score).toBeLessThanOrEqual(100);
    }
  });

  it("locks to prior criteria when provided", () => {
    const prior = [
      { key: "core_mechanic", label: "Core mechanic", bestPractice: "core_mechanic" },
      { key: "success_criteria", label: "Win/lose state", bestPractice: "success_criteria" },
    ];
    const a = demoAssessment(MULTI_HISTORY, prior, 80);
    expect(a.dynamicCriteria).toHaveLength(2);
    expect(a.dynamicCriteria[0].key).toBe("core_mechanic");
    expect(a.dynamicCriteria[1].key).toBe("success_criteria");
  });

  it("overall matches the computed mean of all dimensions", () => {
    const a = demoAssessment(SHORT_HISTORY, null, 80);
    const allScores = [a.clarity.score, a.conciseness.score, ...a.dynamicCriteria.map((d) => d.score)];
    const expectedOverall = Math.round(allScores.reduce((s, n) => s + n, 0) / allScores.length);
    expect(a.overall).toBe(expectedOverall);
  });

  it("score increases as conversation grows", () => {
    const early = demoAssessment(SHORT_HISTORY, null, 80);
    const later = demoAssessment(MULTI_HISTORY, null, 80);
    expect(later.overall).toBeGreaterThan(early.overall);
  });
});

describe("demoLesson", () => {
  it("returns a Lesson with title, lesson, and why fields", () => {
    const lesson = demoLesson(SHORT_HISTORY);
    expect(typeof lesson.title).toBe("string");
    expect(typeof lesson.lesson).toBe("string");
    expect(typeof lesson.why).toBe("string");
    expect(lesson.title.length).toBeGreaterThan(0);
  });
});

describe("demoBuildHtml", () => {
  it("returns a string starting with <!DOCTYPE html>", () => {
    const html = demoBuildHtml("Task Tracker", "Build a task tracker for students.");
    expect(html.trimStart()).toMatch(/^<!DOCTYPE html>/i);
  });

  it("includes the project type in the HTML", () => {
    const html = demoBuildHtml("Task Tracker", "Build a task tracker.");
    expect(html).toContain("Task Tracker");
  });

  it("includes a change request banner when provided", () => {
    const html = demoBuildHtml("Task Tracker", "Build it.", "add dark mode");
    expect(html).toContain("add dark mode");
  });

  it("includes demo banner when no change request", () => {
    const html = demoBuildHtml("Task Tracker", "Build it.");
    expect(html).toContain("Demo build");
  });

  it("escapes HTML special characters in project type", () => {
    const html = demoBuildHtml("<script>", "Build it.");
    // User input is escaped in title/heading — raw tag must not appear as h1 or page title
    expect(html).toContain("&lt;script&gt;");
    expect(html).not.toContain("<title><script>");
    expect(html).not.toContain("<h1><script>");
  });
});

describe("demoEdits", () => {
  it("returns an EditResult with summary and at least one edit", () => {
    const result = demoEdits("make the button blue");
    expect(typeof result.summary).toBe("string");
    expect(Array.isArray(result.edits)).toBe(true);
    expect(result.edits.length).toBeGreaterThan(0);
  });

  it("each edit has find and replace strings", () => {
    const result = demoEdits("add a footer");
    for (const edit of result.edits) {
      expect(typeof edit.find).toBe("string");
      expect(typeof edit.replace).toBe("string");
    }
  });
});

describe("demoPlan", () => {
  it("returns a plan with projectName, bigPicture, and parts", () => {
    const plan = demoPlan("Web app", "Build a task tracker.", "Alex", "Minecraft");
    expect(typeof plan.projectName).toBe("string");
    expect(typeof plan.bigPicture).toBe("string");
    expect(Array.isArray(plan.parts)).toBe(true);
    expect(plan.parts.length).toBeGreaterThanOrEqual(1);
  });

  it("each part has all required fields", () => {
    const plan = demoPlan("Web app", "Build it.", "Alex", "");
    for (const part of plan.parts) {
      expect(typeof part.title).toBe("string");
      expect(typeof part.whatItIs).toBe("string");
      expect(typeof part.why).toBe("string");
      expect(typeof part.concept).toBe("string");
      expect(typeof part.buildSpec).toBe("string");
    }
  });

  it("includes the builder's name in bigPicture when provided", () => {
    const plan = demoPlan("Game", "Build a game.", "Sam", "Fortnite");
    expect(plan.bigPicture).toContain("Sam");
  });
});

describe("demoCoach", () => {
  it("returns a CoachNote with all three fields", () => {
    const note = demoCoach(1, "");
    expect(typeof note.whatChanged).toBe("string");
    expect(typeof note.concept).toBe("string");
    expect(typeof note.proTip).toBe("string");
  });

  it("returns different notes for first vs later steps", () => {
    const first = demoCoach(1, "");
    const later = demoCoach(2, "added dark mode");
    expect(later.whatChanged).toContain("added dark mode");
    expect(first.whatChanged).not.toBe(later.whatChanged);
  });
});

describe("demoQuiz", () => {
  it("returns a Checkpoint with intro and questions", () => {
    const quiz = demoQuiz("🏗️ The Stage", "HTML basics");
    expect(typeof quiz.intro).toBe("string");
    expect(Array.isArray(quiz.questions)).toBe(true);
    expect(quiz.questions.length).toBeGreaterThan(0);
  });

  it("each question has the required fields", () => {
    const quiz = demoQuiz("Part 1", "arrays");
    for (const q of quiz.questions) {
      expect(typeof q.id).toBe("string");
      expect(typeof q.question).toBe("string");
      expect(Array.isArray(q.options)).toBe(true);
      expect(q.options.length).toBeGreaterThanOrEqual(2);
      expect(typeof q.correctIndex).toBe("number");
      expect(q.correctIndex).toBeGreaterThanOrEqual(0);
      expect(q.correctIndex).toBeLessThan(q.options.length);
    }
  });
});

describe("demoExtendPart", () => {
  it("returns a BuildPart-like object with all required fields", () => {
    const part = demoExtendPart("add a search bar");
    expect(typeof part.title).toBe("string");
    expect(typeof part.whatItIs).toBe("string");
    expect(typeof part.why).toBe("string");
    expect(typeof part.concept).toBe("string");
    expect(typeof part.buildSpec).toBe("string");
  });

  it("includes the request text in buildSpec", () => {
    const part = demoExtendPart("add a dark mode toggle");
    expect(part.buildSpec).toContain("add a dark mode toggle");
  });
});

describe("demoBoardLesson", () => {
  const part = {
    title: "🏗️ The Stage",
    whatItIs: "The main screen",
    concept: "HTML skeleton",
    buildSpec: "Create the page shell.",
  };

  it("returns a BoardLesson with all required fields", () => {
    const lesson = demoBoardLesson(part, "My App Quest");
    expect(typeof lesson.partTitle).toBe("string");
    expect(typeof lesson.boardTitle).toBe("string");
    expect(typeof lesson.closing).toBe("string");
    expect(Array.isArray(lesson.steps)).toBe(true);
    expect(lesson.steps.length).toBeGreaterThan(0);
  });

  it("each step has say and items", () => {
    const lesson = demoBoardLesson(part, "My App");
    for (const step of lesson.steps) {
      expect(typeof step.say).toBe("string");
      expect(Array.isArray(step.items)).toBe(true);
    }
  });
});

describe("demoBoardChat", () => {
  it("returns reply and boardItem for a question", () => {
    const result = demoBoardChat("What does forEach do?");
    expect(typeof result.reply).toBe("string");
    expect(result.reply.length).toBeGreaterThan(0);
    // boardItem may be null or an object — just check it's not undefined
    expect(result.boardItem !== undefined).toBe(true);
  });

  it("returns a non-null boardItem for a question", () => {
    const result = demoBoardChat("Why do we use arrays?");
    expect(result.boardItem).not.toBeNull();
  });

  it("returns null boardItem for a non-question comment", () => {
    const result = demoBoardChat("This is cool!");
    expect(result.boardItem).toBeNull();
  });
});

describe("demoCodeAsk", () => {
  it("returns reply and highlightHint", () => {
    const result = demoCodeAsk("What does this do?", "const list = document.getElementById('list');");
    expect(typeof result.reply).toBe("string");
    expect(result.reply.length).toBeGreaterThan(0);
    // highlightHint is a string or null
    expect(typeof result.highlightHint === "string" || result.highlightHint === null).toBe(true);
  });

  it("returns a non-null highlightHint for a question about code", () => {
    const result = demoCodeAsk("Why is getElementById used here?", "const list = document.getElementById('list');");
    expect(result.highlightHint).not.toBeNull();
  });
});
