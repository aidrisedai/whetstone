import { describe, it, expect } from "vitest";
import {
  demoAdvisorReply,
  demoAssessment,
  demoLesson,
  demoBuildHtml,
  demoCoach,
  demoEdits,
  demoPlan,
  demoBoardLesson,
  demoBoardChat,
  demoCodeAsk,
  demoQuiz,
  demoExtendPart,
} from "../lib/demo";
import type { ChatMessage } from "../lib/types";

function userMsg(content: string): ChatMessage {
  return { id: "u1", role: "user", content };
}

const shortHistory: ChatMessage[] = [userMsg("I want to build a game with levels")];
const longHistory: ChatMessage[] = [
  userMsg("I want to build a game with levels"),
  { id: "a1", role: "advisor", content: "What kind of game?" },
  userMsg("A puzzle game where you move blocks to solve mazes"),
  { id: "a2", role: "advisor", content: "Nice. Who is it for?" },
  userMsg("For kids aged 8-12 who like Minecraft"),
];
// Six rich user turns — enough content for demo scores to clear DIMENSION_FLOOR (65) at threshold 80.
const richHistory: ChatMessage[] = [
  userMsg("I want to build a puzzle game for kids aged 8-12 where they move colored blocks to create paths through mazes"),
  { id: "a1", role: "advisor", content: "Great concept!" },
  userMsg("The core mechanic is dragging blocks on a grid to create a path from start to finish without getting stuck"),
  { id: "a2", role: "advisor", content: "How do you handle difficulty?" },
  userMsg("Three difficulty levels: easy 4x4 grid, medium 6x6, hard 8x8 with extra obstacles and time limit"),
  { id: "a3", role: "advisor", content: "What makes it fun?" },
  userMsg("Players earn stars for solving in fewer moves and can share their custom maze creations with friends online"),
  { id: "a4", role: "advisor", content: "Who is the exact target user?" },
  userMsg("Kids aged 8-12 who enjoy spatial puzzles and are already familiar with Minecraft-style block mechanics"),
  { id: "a5", role: "advisor", content: "Perfect, very clear!" },
  userMsg("The win state is when all blocks form a complete connected path from the green start tile to the red end tile"),
];

// ── demoAdvisorReply ────────────────────────────────────────────────────────
describe("demoAdvisorReply", () => {
  it("returns a non-empty string for any history", () => {
    const reply = demoAdvisorReply(shortHistory, false);
    expect(typeof reply).toBe("string");
    expect(reply.length).toBeGreaterThan(0);
  });

  it("returns a closing message when closing=true", () => {
    const reply = demoAdvisorReply(longHistory, true);
    expect(reply).toContain("build");
  });

  it("returns different messages for different turn counts", () => {
    const r1 = demoAdvisorReply([userMsg("test 1")], false);
    const r5 = demoAdvisorReply(longHistory, false);
    expect(r1).not.toBe(r5);
  });
});

// ── demoAssessment ──────────────────────────────────────────────────────────
describe("demoAssessment", () => {
  it("returns a valid Assessment shape", () => {
    const a = demoAssessment(shortHistory, null, 80);
    expect(typeof a.overall).toBe("number");
    expect(typeof a.ready).toBe("boolean");
    expect(a.threshold).toBe(80);
    expect(Array.isArray(a.dynamicCriteria)).toBe(true);
    expect(a.dynamicCriteria).toHaveLength(3);
  });

  it("overall is in [0, 100]", () => {
    const a = demoAssessment(longHistory, null, 80);
    expect(a.overall).toBeGreaterThanOrEqual(0);
    expect(a.overall).toBeLessThanOrEqual(100);
  });

  it("score rises with more substantive turns", () => {
    const early = demoAssessment([userMsg("x")], null, 80);
    const later = demoAssessment(longHistory, null, 80);
    expect(later.overall).toBeGreaterThan(early.overall);
  });

  it("locks to priorCriteria specs when supplied", () => {
    const prior = [
      { key: "core_mechanic", label: "Core mechanic", bestPractice: "core_mechanic" },
      { key: "win_state", label: "Win state", bestPractice: "win_state" },
    ];
    const a = demoAssessment(longHistory, prior, 80);
    expect(a.dynamicCriteria).toHaveLength(2);
    expect(a.dynamicCriteria[0].key).toBe("core_mechanic");
  });

  it("ready becomes true after enough substantive engagement", () => {
    // richHistory has 6 user turns with detailed content — base score clears
    // DIMENSION_FLOOR (65) on every dimension, and overall exceeds threshold 80.
    const a = demoAssessment(richHistory, null, 80);
    expect(a.ready).toBe(true);
  });

  it("refinedPrompt is a non-empty string", () => {
    const a = demoAssessment(shortHistory, null, 80);
    expect(typeof a.refinedPrompt).toBe("string");
    expect(a.refinedPrompt.length).toBeGreaterThan(0);
  });
});

// ── demoLesson ──────────────────────────────────────────────────────────────
describe("demoLesson", () => {
  it("returns a Lesson with title, lesson, and why", () => {
    const l = demoLesson(longHistory);
    expect(typeof l.title).toBe("string");
    expect(typeof l.lesson).toBe("string");
    expect(typeof l.why).toBe("string");
    expect(l.title.length).toBeGreaterThan(0);
  });
});

// ── demoBuildHtml ────────────────────────────────────────────────────────────
describe("demoBuildHtml", () => {
  it("returns a valid HTML document string", () => {
    const html = demoBuildHtml("Game", "Build a puzzle game.", undefined);
    expect(html).toContain("<!DOCTYPE html>");
    expect(html).toContain("</html>");
    expect(html).toContain("Game");
  });

  it("includes the changeRequest in the banner when provided", () => {
    const html = demoBuildHtml("App", "An app.", "Add dark mode");
    expect(html).toContain("Add dark mode");
  });

  it("shows the no-API-key banner when no changeRequest", () => {
    const html = demoBuildHtml("App", "An app.", undefined);
    expect(html).toContain("ANTHROPIC_API_KEY");
  });

  it("escapes HTML entities in the projectType and prompt", () => {
    const html = demoBuildHtml("<script>", 'x & y "z"', undefined);
    // User-supplied values must be escaped; the template's own <script> tag is fine.
    expect(html).toContain("<title>&lt;script&gt;</title>");
    expect(html).toContain("x &amp; y &quot;z&quot;");
  });
});

// ── demoCoach ─────────────────────────────────────────────────────────────
describe("demoCoach", () => {
  it("returns a CoachNote with all three fields for step 1", () => {
    const note = demoCoach(1, "");
    expect(typeof note.whatChanged).toBe("string");
    expect(typeof note.concept).toBe("string");
    expect(typeof note.proTip).toBe("string");
  });

  it("returns a different CoachNote for step 2+", () => {
    const n1 = demoCoach(1, "");
    const n2 = demoCoach(2, "add a timer");
    expect(n2.whatChanged).not.toBe(n1.whatChanged);
  });

  it("includes the changeRequest in step 2+ note", () => {
    const note = demoCoach(2, "add dark mode");
    expect(note.whatChanged).toContain("add dark mode");
  });
});

// ── demoEdits ─────────────────────────────────────────────────────────────
describe("demoEdits", () => {
  it("returns an EditResult with summary and edits array", () => {
    const result = demoEdits("change the colour");
    expect(typeof result.summary).toBe("string");
    expect(Array.isArray(result.edits)).toBe(true);
    expect(result.edits.length).toBeGreaterThan(0);
  });

  it("each edit has find and replace strings", () => {
    const { edits } = demoEdits("add button");
    for (const e of edits) {
      expect(typeof e.find).toBe("string");
      expect(typeof e.replace).toBe("string");
    }
  });
});

// ── demoPlan ──────────────────────────────────────────────────────────────
describe("demoPlan", () => {
  it("returns projectName, bigPicture, and parts", () => {
    const plan = demoPlan("Game", "Build a game.", "Alex", "Minecraft");
    expect(typeof plan.projectName).toBe("string");
    expect(typeof plan.bigPicture).toBe("string");
    expect(Array.isArray(plan.parts)).toBe(true);
    expect(plan.parts.length).toBeGreaterThanOrEqual(1);
  });

  it("includes the builder name in bigPicture when provided", () => {
    const plan = demoPlan("App", "Build an app.", "Jordan", "");
    expect(plan.bigPicture).toContain("Jordan");
  });

  it("includes the game name in bigPicture when provided", () => {
    const plan = demoPlan("App", "Build an app.", "", "Roblox");
    expect(plan.bigPicture).toContain("Roblox");
  });

  it("each part has required fields", () => {
    const { parts } = demoPlan("Game", "Build a game.", "Alex", "");
    for (const p of parts) {
      expect(typeof p.title).toBe("string");
      expect(typeof p.whatItIs).toBe("string");
      expect(typeof p.why).toBe("string");
      expect(typeof p.buildSpec).toBe("string");
    }
  });
});

// ── demoBoardLesson ────────────────────────────────────────────────────────
describe("demoBoardLesson", () => {
  const part = {
    title: "The Stage",
    whatItIs: "The main screen",
    concept: "The screen",
    buildSpec: "Build a header",
  };

  it("returns a BoardLesson with steps", () => {
    const lesson = demoBoardLesson(part, "My App");
    expect(Array.isArray(lesson.steps)).toBe(true);
    expect(lesson.steps.length).toBeGreaterThan(0);
  });

  it("each step has a say string and items array", () => {
    const lesson = demoBoardLesson(part, "My App");
    for (const step of lesson.steps) {
      expect(typeof step.say).toBe("string");
      expect(Array.isArray(step.items)).toBe(true);
    }
  });

  it("includes the part title in the boardTitle", () => {
    const lesson = demoBoardLesson(part, "My App");
    expect(lesson.boardTitle).toContain("Stage");
  });
});

// ── demoBoardChat ──────────────────────────────────────────────────────────
describe("demoBoardChat", () => {
  it("returns reply and boardItem for a question", () => {
    const result = demoBoardChat("Why does this matter?");
    expect(typeof result.reply).toBe("string");
    expect(result.reply.length).toBeGreaterThan(0);
  });

  it("returns null boardItem for a non-question statement", () => {
    const result = demoBoardChat("That makes sense!");
    expect(result.boardItem).toBeNull();
  });

  it("returns a boardItem for a question", () => {
    const result = demoBoardChat("What is a loop?");
    expect(result.boardItem).not.toBeNull();
  });
});

// ── demoCodeAsk ────────────────────────────────────────────────────────────
describe("demoCodeAsk", () => {
  it("returns a reply string", () => {
    const result = demoCodeAsk("Why does getElementById work?", "const list = document.getElementById('list');");
    expect(typeof result.reply).toBe("string");
    expect(result.reply.length).toBeGreaterThan(0);
  });

  it("returns a non-null highlightHint for questions about code", () => {
    // The hint is the first 4+-char token in the beat code; "const" matches first.
    const result = demoCodeAsk("What is getElementById?", "const list = document.getElementById('list');");
    expect(result.highlightHint).not.toBeNull();
    expect(typeof result.highlightHint).toBe("string");
  });

  it("handles non-question input", () => {
    const result = demoCodeAsk("Looks good to me", "const x = 1;");
    expect(typeof result.reply).toBe("string");
  });
});

// ── demoQuiz ───────────────────────────────────────────────────────────────
describe("demoQuiz", () => {
  it("returns a Checkpoint with questions", () => {
    const quiz = demoQuiz("The Stage", "The screen");
    expect(Array.isArray(quiz.questions)).toBe(true);
    expect(quiz.questions.length).toBeGreaterThan(0);
  });

  it("each question has required fields", () => {
    const { questions } = demoQuiz("Part", "Concept");
    for (const q of questions) {
      expect(typeof q.id).toBe("string");
      expect(typeof q.question).toBe("string");
      expect(Array.isArray(q.options)).toBe(true);
      expect(typeof q.correctIndex).toBe("number");
    }
  });
});

// ── demoExtendPart ──────────────────────────────────────────────────────────
describe("demoExtendPart", () => {
  it("returns a BuildPart (sans id) for any request", () => {
    const part = demoExtendPart("add a dark mode toggle");
    expect(typeof part.title).toBe("string");
    expect(typeof part.whatItIs).toBe("string");
    expect(part.whatItIs).toContain("add a dark mode toggle");
  });
});
