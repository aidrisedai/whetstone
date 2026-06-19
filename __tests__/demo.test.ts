import { describe, it, expect } from "vitest";
import {
  demoAdvisorReply,
  demoAssessment,
  demoLesson,
  demoCoach,
  demoEdits,
  demoBuildHtml,
  demoQuiz,
  demoExtendPart,
} from "@/lib/demo";
import type { ChatMessage } from "@/lib/types";

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
  it("returns a non-empty string for a basic user message", () => {
    const reply = demoAdvisorReply([userMsg("I want to build a tracker app")], false);
    expect(typeof reply).toBe("string");
    expect(reply.length).toBeGreaterThan(0);
  });

  it("returns the closing sign-off when closing=true", () => {
    const reply = demoAdvisorReply([userMsg("My app is for students")], true);
    expect(reply).toContain("sharp enough to build");
  });

  it("reacts to an image attachment", () => {
    const msg: ChatMessage = {
      id: "u1",
      role: "user",
      content: "Here's my sketch",
      images: [{ mediaType: "image/png", data: "abc123" }],
    };
    const reply = demoAdvisorReply([msg], false);
    expect(reply).toContain("sketch");
  });

  it("cycles through pushbacks across turns", () => {
    const history: ChatMessage[] = [];
    const replies: string[] = [];
    for (let i = 0; i < 4; i++) {
      history.push(userMsg(`message ${i}`));
      history.push(advisorMsg("ok"));
      replies.push(demoAdvisorReply([...history], false));
    }
    // Not all replies should be identical (they cycle through PUSHBACKS)
    const unique = new Set(replies);
    expect(unique.size).toBeGreaterThan(1);
  });
});

describe("demoAssessment", () => {
  it("returns a valid Assessment shape", () => {
    const history = [userMsg("Build a budget tracker"), advisorMsg("Interesting")];
    const a = demoAssessment(history, null, 80);
    expect(typeof a.overall).toBe("number");
    expect(a.overall).toBeGreaterThanOrEqual(0);
    expect(a.overall).toBeLessThanOrEqual(100);
    expect(typeof a.ready).toBe("boolean");
    expect(typeof a.refinedPrompt).toBe("string");
    expect(a.dynamicCriteria.length).toBeGreaterThan(0);
  });

  it("scores climb as more substantive turns are given", () => {
    const short = [userMsg("app")];
    const long = [
      userMsg("Build a budget tracker for college students who want to track daily spending by category, with charts and weekly summaries"),
      advisorMsg("Good start"),
      userMsg("The users are college students aged 18-22 who live on tight budgets and want to avoid overdrafts"),
      advisorMsg("Sharper"),
      userMsg("Done means: user adds an expense, sees it in the right category, and the weekly bar chart updates instantly"),
    ];
    const shortA = demoAssessment(short, null, 80);
    const longA = demoAssessment(long, null, 80);
    expect(longA.overall).toBeGreaterThan(shortA.overall);
  });

  it("respects priorCriteria to lock dimensions", () => {
    const history = [userMsg("Build a game")];
    const prior = [
      { key: "core_mechanic", label: "Core mechanic", bestPractice: "core_mechanic" },
    ];
    const a = demoAssessment(history, prior, 80);
    expect(a.dynamicCriteria[0].key).toBe("core_mechanic");
  });

  it("marks ready=false for a very short description", () => {
    const a = demoAssessment([userMsg("app")], null, 80);
    expect(a.ready).toBe(false);
  });
});

describe("demoLesson", () => {
  it("returns a Lesson with title, lesson, and why", () => {
    const l = demoLesson([userMsg("a"), advisorMsg("b")]);
    expect(typeof l.title).toBe("string");
    expect(typeof l.lesson).toBe("string");
    expect(typeof l.why).toBe("string");
  });

  it("title is non-empty", () => {
    expect(demoLesson([userMsg("x")]).title.length).toBeGreaterThan(0);
  });
});

describe("demoCoach", () => {
  it("returns a CoachNote for step 1", () => {
    const c = demoCoach(1, "");
    expect(typeof c.whatChanged).toBe("string");
    expect(typeof c.concept).toBe("string");
    expect(typeof c.proTip).toBe("string");
  });

  it("mentions the change request for later steps", () => {
    const c = demoCoach(2, "add dark mode");
    expect(c.whatChanged).toContain("add dark mode");
  });
});

describe("demoEdits", () => {
  it("returns an EditResult with summary and edits array", () => {
    const r = demoEdits("add a footer");
    expect(typeof r.summary).toBe("string");
    expect(Array.isArray(r.edits)).toBe(true);
    expect(r.edits.length).toBeGreaterThan(0);
  });

  it("uses </body> as the find anchor", () => {
    expect(r().edits[0].find).toBe("</body>");
  });

  function r() {
    return demoEdits("test");
  }
});

describe("demoBuildHtml", () => {
  it("produces a valid HTML document string", () => {
    const html = demoBuildHtml("Web app", "Build a tracker");
    expect(html.startsWith("<!DOCTYPE html>")).toBe(true);
    expect(html.endsWith("</html>")).toBe(true);
  });

  it("includes the project type in the output", () => {
    const html = demoBuildHtml("Game", "Build a puzzle");
    expect(html).toContain("Game");
  });
});

describe("demoQuiz", () => {
  it("returns a Checkpoint with at least one question", () => {
    const cp = demoQuiz("The Stage", "The screen");
    expect(cp.questions.length).toBeGreaterThan(0);
    expect(typeof cp.intro).toBe("string");
  });

  it("each question has the required fields", () => {
    const { questions } = demoQuiz("t", "c");
    for (const q of questions) {
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
  it("returns a BuildPart shape (without id)", () => {
    const p = demoExtendPart("add a search bar");
    expect(typeof p.title).toBe("string");
    expect(typeof p.whatItIs).toBe("string");
    expect(typeof p.concept).toBe("string");
    expect(typeof p.buildSpec).toBe("string");
  });

  it("includes the request text somewhere in the part", () => {
    const p = demoExtendPart("add dark mode");
    const all = JSON.stringify(p).toLowerCase();
    expect(all).toContain("add dark mode");
  });
});
