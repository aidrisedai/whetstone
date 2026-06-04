import { describe, it, expect } from "vitest";
import {
  demoAdvisorReply,
  demoAssessment,
  demoLesson,
  demoBuildHtml,
  demoCoach,
  demoEdits,
  demoPlan,
  demoBuildLesson,
  demoQuiz,
  demoExtendPart,
} from "../demo";
import type { ChatMessage } from "../types";

const msg = (role: "user" | "advisor", content: string): ChatMessage => ({
  id: `${role}_1`,
  role,
  content,
});

const userHistory: ChatMessage[] = [
  msg("user", "I want to build a todo app for students in high school"),
  msg("advisor", "Which students? Doing what?"),
  msg("user", "Students managing their homework and assignments"),
];

describe("demoAdvisorReply", () => {
  it("returns a non-empty string for a normal turn", () => {
    const reply = demoAdvisorReply(userHistory, false);
    expect(typeof reply).toBe("string");
    expect(reply.length).toBeGreaterThan(0);
  });

  it("returns a closing reply when closing=true", () => {
    const reply = demoAdvisorReply(userHistory, true);
    expect(typeof reply).toBe("string");
    expect(reply.length).toBeGreaterThan(0);
  });

  it("returns a string even for a single-message history", () => {
    const reply = demoAdvisorReply([msg("user", "app idea")], false);
    expect(typeof reply).toBe("string");
    expect(reply.length).toBeGreaterThan(0);
  });

  it("handles image-bearing messages without crashing", () => {
    const histWithImg: ChatMessage[] = [
      {
        id: "u1",
        role: "user",
        content: "Here is my sketch",
        images: [{ mediaType: "image/png", data: "abc123" }],
      },
    ];
    const reply = demoAdvisorReply(histWithImg, false);
    expect(typeof reply).toBe("string");
  });
});

describe("demoAssessment", () => {
  it("returns a valid assessment shape", () => {
    const a = demoAssessment(userHistory, null, 80);
    expect(typeof a.projectType).toBe("string");
    expect(typeof a.overall).toBe("number");
    expect(a.overall).toBeGreaterThanOrEqual(0);
    expect(a.overall).toBeLessThanOrEqual(100);
    expect(typeof a.ready).toBe("boolean");
    expect(a.threshold).toBe(80);
    expect(Array.isArray(a.dynamicCriteria)).toBe(true);
    expect(a.dynamicCriteria.length).toBeGreaterThanOrEqual(1);
    expect(typeof a.refinedPrompt).toBe("string");
  });

  it("reuses prior criteria when provided", () => {
    const prior = [
      { key: "core_mechanic", label: "Core mechanic", bestPractice: "core_mechanic" },
    ];
    const a = demoAssessment(userHistory, prior, 80);
    expect(a.dynamicCriteria[0].key).toBe("core_mechanic");
  });

  it("score climbs with more user turns", () => {
    const short = [msg("user", "app")];
    const long = [
      msg("user", "I want to build a comprehensive homework tracker for high school students to manage their assignments across all subjects, with due dates, reminders, and grade tracking features"),
      msg("advisor", "Which students?"),
      msg("user", "High school juniors and seniors aged 16-18 who need to balance 6+ subjects and extracurriculars. Success means they never miss a deadline in a given week."),
      msg("advisor", "Good. What's the one thing they can't do today?"),
      msg("user", "They can't see all their deadlines in one place across different teachers' systems. We provide a unified view with smart reminders."),
    ];
    const shortScore = demoAssessment(short, null, 80).overall;
    const longScore = demoAssessment(long, null, 80).overall;
    expect(longScore).toBeGreaterThan(shortScore);
  });

  it("all scores are clamped to 0-100", () => {
    const a = demoAssessment(userHistory, null, 80);
    const allScores = [
      a.clarity.score,
      a.conciseness.score,
      ...a.dynamicCriteria.map((d) => d.score),
    ];
    for (const s of allScores) {
      expect(s).toBeGreaterThanOrEqual(0);
      expect(s).toBeLessThanOrEqual(100);
    }
  });
});

describe("demoLesson", () => {
  it("returns a lesson with title, lesson, and why", () => {
    const l = demoLesson(userHistory);
    expect(typeof l.title).toBe("string");
    expect(l.title.length).toBeGreaterThan(0);
    expect(typeof l.lesson).toBe("string");
    expect(typeof l.why).toBe("string");
  });
});

describe("demoBuildHtml", () => {
  it("returns a string starting with <!DOCTYPE html>", () => {
    const html = demoBuildHtml("Game", "Build a quiz game", undefined);
    expect(html.trim().startsWith("<!DOCTYPE html>")).toBe(true);
  });

  it("includes the project type in the output", () => {
    const html = demoBuildHtml("Todo App", "Build a todo app", undefined);
    expect(html).toContain("Todo App");
  });

  it("includes change request note when provided", () => {
    const html = demoBuildHtml("App", "Build it", "add dark mode");
    expect(html).toContain("add dark mode");
  });

  it("closes the HTML document properly", () => {
    const html = demoBuildHtml("App", "Build it", undefined);
    expect(html.trim().endsWith("</html>")).toBe(true);
  });

  it("does not include raw HTML injection from prompt", () => {
    const html = demoBuildHtml("<script>bad</script>", "<img onerror=x>", undefined);
    // The XSS characters should be escaped in the output
    expect(html).not.toContain("<script>bad</script>");
    expect(html).not.toContain("<img onerror=x>");
  });
});

describe("demoCoach", () => {
  it("returns a coaching card for step 1", () => {
    const c = demoCoach(1, "initial build");
    expect(typeof c.whatChanged).toBe("string");
    expect(typeof c.concept).toBe("string");
    expect(typeof c.proTip).toBe("string");
  });

  it("returns a coaching card for later steps", () => {
    const c = demoCoach(3, "add search bar");
    expect(c.whatChanged).toContain("add search bar");
  });
});

describe("demoEdits", () => {
  it("returns an EditResult with summary and edits", () => {
    const result = demoEdits("change the title");
    expect(typeof result.summary).toBe("string");
    expect(Array.isArray(result.edits)).toBe(true);
    expect(result.edits.length).toBeGreaterThan(0);
    expect(typeof result.edits[0].find).toBe("string");
    expect(typeof result.edits[0].replace).toBe("string");
  });
});

describe("demoPlan", () => {
  it("returns a plan with projectName, bigPicture, and parts", () => {
    const plan = demoPlan("Game", "Build a quiz game", "Alex", "Minecraft");
    expect(typeof plan.projectName).toBe("string");
    expect(typeof plan.bigPicture).toBe("string");
    expect(Array.isArray(plan.parts)).toBe(true);
    expect(plan.parts.length).toBeGreaterThanOrEqual(1);
  });

  it("includes the builder's name in bigPicture when provided", () => {
    const plan = demoPlan("App", "Build it", "Jordan", "Fortnite");
    expect(plan.bigPicture).toContain("Jordan");
  });

  it("includes the game reference when provided", () => {
    const plan = demoPlan("App", "Build it", "Sam", "Roblox");
    expect(plan.bigPicture).toContain("Roblox");
  });

  it("each part has all required fields", () => {
    const plan = demoPlan("App", "Build it", "", "");
    for (const p of plan.parts) {
      expect(typeof p.title).toBe("string");
      expect(typeof p.whatItIs).toBe("string");
      expect(typeof p.why).toBe("string");
      expect(typeof p.concept).toBe("string");
      expect(typeof p.buildSpec).toBe("string");
    }
  });
});

describe("demoBuildLesson", () => {
  const args = {
    part: { title: "🏗️ The Stage", whatItIs: "The main screen", concept: "The screen", buildSpec: "Create HTML shell" },
    partNumber: 1,
    currentCode: "",
    projectName: "My App",
  };

  it("returns a BuildLesson with beats for part 1 (no existing code)", () => {
    const lesson = demoBuildLesson(args);
    expect(typeof lesson.intro).toBe("string");
    expect(Array.isArray(lesson.beats)).toBe(true);
    expect(lesson.beats.length).toBeGreaterThan(0);
    expect(typeof lesson.outro).toBe("string");
    expect(typeof lesson.concept).toBe("string");
  });

  it("beats concatenated form a valid HTML document for part 1", () => {
    const lesson = demoBuildLesson(args);
    const assembled = lesson.beats.map((b) => b.code).join("");
    expect(assembled.trim().startsWith("<!DOCTYPE html>")).toBe(true);
    expect(assembled.trim().endsWith("</html>")).toBe(true);
  });

  it("marks later-part beats correctly when existing code is provided", () => {
    const existingCode =
      '<!DOCTYPE html><html lang="en"><head><title>App</title></head><body></body></html>';
    const laterArgs = { ...args, partNumber: 2, currentCode: existingCode };
    const lesson = demoBuildLesson(laterArgs);
    expect(lesson.beats.some((b) => !b.isNew)).toBe(true);
    expect(lesson.beats.some((b) => b.isNew)).toBe(true);
  });
});

describe("demoQuiz", () => {
  it("returns a checkpoint with partTitle, intro, and questions", () => {
    const quiz = demoQuiz("🏗️ The Stage", "The screen");
    expect(quiz.partTitle).toBe("🏗️ The Stage");
    expect(typeof quiz.intro).toBe("string");
    expect(Array.isArray(quiz.questions)).toBe(true);
    expect(quiz.questions.length).toBeGreaterThanOrEqual(1);
  });

  it("each question has all required fields", () => {
    const quiz = demoQuiz("Part", "Concept");
    for (const q of quiz.questions) {
      expect(typeof q.question).toBe("string");
      expect(Array.isArray(q.options)).toBe(true);
      expect(q.options.length).toBeGreaterThanOrEqual(2);
      expect(typeof q.correctIndex).toBe("number");
      expect(q.correctIndex).toBeGreaterThanOrEqual(0);
      expect(q.correctIndex).toBeLessThan(q.options.length);
      expect(typeof q.explainCorrect).toBe("string");
      expect(typeof q.explainWrong).toBe("string");
    }
  });
});

describe("demoExtendPart", () => {
  it("returns a part with all required fields", () => {
    const part = demoExtendPart("add a search bar");
    expect(typeof part.title).toBe("string");
    expect(typeof part.whatItIs).toBe("string");
    expect(typeof part.why).toBe("string");
    expect(typeof part.concept).toBe("string");
    expect(typeof part.buildSpec).toBe("string");
  });

  it("reflects the request in the returned part", () => {
    const part = demoExtendPart("add dark mode toggle");
    expect(part.whatItIs).toContain("add dark mode toggle");
  });
});
