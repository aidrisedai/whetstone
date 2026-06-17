import { describe, it, expect } from "vitest";
import {
  demoAdvisorReply,
  demoAssessment,
  demoLesson,
  demoBuildHtml,
  demoCoach,
  demoEdits,
  demoPlan,
  demoExtendPart,
  demoBoardLesson,
  demoBoardChat,
  demoCodeAsk,
} from "@/lib/demo";
import type { ChatMessage } from "@/lib/types";

const userMsg = (content: string): ChatMessage => ({ id: "u1", role: "user", content });
const advMsg = (content: string): ChatMessage => ({ id: "a1", role: "advisor", content });

describe("demoAdvisorReply", () => {
  it("returns a closing message when closing=true", () => {
    const reply = demoAdvisorReply([userMsg("hello")], true);
    expect(reply.length).toBeGreaterThan(10);
    expect(typeof reply).toBe("string");
  });

  it("returns a pushback message for regular turns", () => {
    const reply = demoAdvisorReply([userMsg("I want to build a game")], false);
    expect(reply.length).toBeGreaterThan(10);
  });

  it("reacts differently to image attachments on early turns", () => {
    const msg: ChatMessage = { id: "u1", role: "user", content: "here is my sketch", images: [{ mediaType: "image/png", data: "abc" }] };
    const reply = demoAdvisorReply([msg], false);
    expect(reply).toContain("sketch");
  });
});

describe("demoAssessment", () => {
  it("returns a valid assessment with required fields", () => {
    const a = demoAssessment([userMsg("I want to build a task tracker")], null, 80);
    expect(a.projectType).toBeTruthy();
    expect(typeof a.overall).toBe("number");
    expect(typeof a.ready).toBe("boolean");
    expect(a.threshold).toBe(80);
    expect(a.clarity.score).toBeGreaterThanOrEqual(0);
    expect(a.conciseness.score).toBeGreaterThanOrEqual(0);
    expect(a.dynamicCriteria.length).toBeGreaterThan(0);
    expect(a.refinedPrompt).toBeTruthy();
  });

  it("detects project type from keywords", () => {
    const game = demoAssessment([userMsg("I want to build a game with levels and score")], null, 80);
    expect(game.projectType).toBe("Game");

    const ai = demoAssessment([userMsg("I want to build a chatbot assistant")], null, 80);
    expect(ai.projectType).toBe("AI assistant");

    const data = demoAssessment([userMsg("I want to build a dashboard with analytics and charts")], null, 80);
    expect(data.projectType).toBe("Data tool");
  });

  it("scores rise with more substantive user turns", () => {
    const short = demoAssessment([userMsg("app")], null, 80);
    const detailed = demoAssessment(
      Array.from({ length: 6 }, (_, i) => userMsg(`I want to build a specific tool for students to track their homework and grades, turn ${i}`)),
      null,
      80,
    );
    expect(detailed.overall).toBeGreaterThan(short.overall);
  });

  it("reuses prior criteria when provided", () => {
    const prior = [{ key: "core_mechanic", label: "Core mechanic", bestPractice: "core_mechanic" }];
    const a = demoAssessment([userMsg("game idea")], prior, 80);
    expect(a.dynamicCriteria[0].key).toBe("core_mechanic");
  });
});

describe("demoLesson", () => {
  it("returns a lesson with title, lesson, and why", () => {
    const l = demoLesson([userMsg("hi"), advMsg("ok"), userMsg("better")]);
    expect(l.title).toBeTruthy();
    expect(l.lesson).toBeTruthy();
    expect(l.why).toBeTruthy();
  });
});

describe("demoBuildHtml", () => {
  it("returns a valid standalone HTML file", () => {
    const html = demoBuildHtml("Task App", "Build a task tracker", undefined);
    expect(html).toContain("<!DOCTYPE html>");
    expect(html).toContain("</html>");
    expect(html).toContain("Task App");
    expect(html).not.toContain("<script src=");
  });

  it("mentions changeRequest in the banner when provided", () => {
    const html = demoBuildHtml("App", "prompt", "add dark mode");
    expect(html).toContain("add dark mode");
  });

  it("escapes HTML entities in inputs", () => {
    const html = demoBuildHtml('<script>alert(1)</script>', 'prompt', undefined);
    expect(html).not.toContain('<script>alert(1)</script>');
  });
});

describe("demoCoach", () => {
  it("returns a CoachNote for the first step", () => {
    const note = demoCoach(1, "initial build");
    expect(note.whatChanged).toBeTruthy();
    expect(note.concept).toBeTruthy();
    expect(note.proTip).toBeTruthy();
  });

  it("returns a change-request note for later steps", () => {
    const note = demoCoach(2, "add a dark mode");
    expect(note.whatChanged).toContain("add a dark mode");
  });
});

describe("demoEdits", () => {
  it("returns an EditResult with at least one edit", () => {
    const result = demoEdits("change the color");
    expect(result.summary).toBeTruthy();
    expect(result.edits.length).toBeGreaterThan(0);
    expect(result.edits[0].find).toBeTruthy();
    expect(typeof result.edits[0].replace).toBe("string");
  });
});

describe("demoPlan", () => {
  it("returns a plan with 3 parts for a demo web app", () => {
    const plan = demoPlan("Web app", "Build a web app", "Alex", "Minecraft");
    expect(plan.projectName).toBeTruthy();
    expect(plan.bigPicture).toBeTruthy();
    expect(plan.parts.length).toBe(3);
    plan.parts.forEach((p) => {
      expect(p.title).toBeTruthy();
      expect(p.buildSpec).toBeTruthy();
    });
  });

  it("includes builder name in bigPicture", () => {
    const plan = demoPlan("App", "prompt", "Jamie", "Fortnite");
    expect(plan.bigPicture).toContain("Jamie");
  });
});

describe("demoExtendPart", () => {
  it("returns a BuildPart (without id) for a request", () => {
    const part = demoExtendPart("add a search bar");
    expect(part.title).toBeTruthy();
    expect(part.whatItIs).toContain("add a search bar");
    expect(part.buildSpec).toContain("add a search bar");
  });
});

describe("demoBoardLesson", () => {
  const part = { title: "🏗️ The Stage", whatItIs: "The main screen", concept: "The screen", buildSpec: "Build the skeleton" };

  it("returns a BoardLesson with steps and closing", () => {
    const bl = demoBoardLesson(part, "My App");
    expect(bl.boardTitle).toBeTruthy();
    expect(bl.steps.length).toBeGreaterThan(0);
    expect(bl.closing).toBeTruthy();
    bl.steps.forEach((s) => {
      expect(s.say).toBeTruthy();
      expect(Array.isArray(s.items)).toBe(true);
    });
  });
});

describe("demoBoardChat", () => {
  it("returns a reply to a question", () => {
    const r = demoBoardChat("Why do we need this?");
    expect(r.reply).toBeTruthy();
  });

  it("returns a reply to a statement", () => {
    const r = demoBoardChat("Oh I see now!");
    expect(r.reply).toBeTruthy();
  });
});

describe("demoCodeAsk", () => {
  it("returns a reply to a question about code", () => {
    const r = demoCodeAsk("What does getElementById do?", "const list = document.getElementById('list');");
    expect(r.reply).toBeTruthy();
  });

  it("optionally returns a highlightHint substring of the code", () => {
    const code = "const myVariable = document.getElementById('list');";
    const r = demoCodeAsk("what is this?", code);
    if (r.highlightHint) {
      expect(code.includes(r.highlightHint) || r.highlightHint === null).toBe(true);
    }
  });
});
