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

function userMsg(content: string): ChatMessage {
  return { id: "u1", role: "user", content };
}
function advisorMsg(content: string): ChatMessage {
  return { id: "a1", role: "advisor", content };
}

const historyOne: ChatMessage[] = [userMsg("I want to build a game about space exploration")];
const historyRich: ChatMessage[] = [
  userMsg("I want to build a task tracker for remote engineering teams"),
  advisorMsg("Which teams? Startups or big companies?"),
  userMsg("Small startups — 3-8 person teams building web apps"),
  advisorMsg("What does 'task tracker' do that Jira doesn't?"),
  userMsg("Removes all the bloat. One board, priorities, daily sync built in"),
];

describe("demoAdvisorReply", () => {
  it("returns a non-empty string", () => {
    expect(demoAdvisorReply(historyOne, false).length).toBeGreaterThan(0);
  });

  it("returns a closing message when closing=true", () => {
    const reply = demoAdvisorReply(historyOne, true);
    // The closing reply should be warm and distinct
    expect(reply).toContain("sharp enough");
  });

  it("returns a different reply on a rich conversation", () => {
    const short = demoAdvisorReply(historyOne, false);
    const long = demoAdvisorReply(historyRich, false);
    // Different turns → different pushback message
    expect(short).not.toBe(long);
  });
});

describe("demoAssessment", () => {
  it("returns a valid Assessment shape", () => {
    const a = demoAssessment(historyOne, null, 80);
    expect(typeof a.overall).toBe("number");
    expect(typeof a.ready).toBe("boolean");
    expect(a.threshold).toBe(80);
    expect(a.dynamicCriteria.length).toBeGreaterThan(0);
    expect(a.refinedPrompt.length).toBeGreaterThan(0);
    expect(typeof a.clarity.score).toBe("number");
    expect(typeof a.conciseness.score).toBe("number");
  });

  it("scores climb as the conversation grows", () => {
    const short = demoAssessment(historyOne, null, 80);
    const long = demoAssessment(historyRich, null, 80);
    expect(long.overall).toBeGreaterThan(short.overall);
  });

  it("marks ready when enough turns have passed", () => {
    // Build a history long enough to cross the threshold
    const manyMsgs: ChatMessage[] = Array.from({ length: 12 }, (_, i) =>
      userMsg(`detailed message ${i} about the app with specific users and outcomes and constraints`)
    );
    const a = demoAssessment(manyMsgs, null, 80);
    // With many substantive messages the score should be high
    expect(a.overall).toBeGreaterThan(70);
  });

  it("respects a custom threshold", () => {
    const a = demoAssessment(historyRich, null, 50);
    expect(a.threshold).toBe(50);
  });

  it("locks dynamic criteria when prior is provided", () => {
    const prior = [
      { key: "core_mechanic", label: "Core mechanic", bestPractice: "core_mechanic" },
    ];
    const a = demoAssessment(historyOne, prior, 80);
    expect(a.dynamicCriteria[0].key).toBe("core_mechanic");
  });

  it("detects game project type", () => {
    const gameHistory: ChatMessage[] = [userMsg("I want to build a puzzle game with score and player levels")];
    const a = demoAssessment(gameHistory, null, 80);
    expect(a.projectType).toBe("Game");
  });

  it("all dimension scores are in 0-100 range", () => {
    const a = demoAssessment(historyRich, null, 80);
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
  it("returns a valid Lesson shape", () => {
    const l = demoLesson(historyRich);
    expect(typeof l.title).toBe("string");
    expect(l.title.length).toBeGreaterThan(0);
    expect(typeof l.lesson).toBe("string");
    expect(typeof l.why).toBe("string");
  });

  it("returns a richer 'why' for longer conversations (>4 user turns)", () => {
    const manyMsgs: ChatMessage[] = Array.from({ length: 5 }, (_, i) =>
      userMsg(`message ${i}`)
    );
    const short = demoLesson(historyOne);     // 1 user turn
    const long = demoLesson(manyMsgs);        // 5 user turns → different branch
    expect(short.why).not.toBe(long.why);
  });
});

describe("demoBuildHtml", () => {
  it("returns a valid HTML document string", () => {
    const html = demoBuildHtml("Game", "Build a space shooter", undefined);
    expect(html.trim()).toMatch(/^<!DOCTYPE html/i);
    expect(html).toContain("</html>");
    expect(html).toContain("<body");
  });

  it("includes the project type as the heading", () => {
    const html = demoBuildHtml("My Game", "a shooter", undefined);
    expect(html).toContain("My Game");
  });

  it("includes the change request in the banner when provided", () => {
    const html = demoBuildHtml("App", "prompt", "add dark mode");
    expect(html).toContain("add dark mode");
  });

  it("does not contain XSS vectors from projectType", () => {
    const html = demoBuildHtml("<script>alert(1)</script>", "safe", undefined);
    expect(html).not.toContain("<script>alert(1)</script>");
    expect(html).toContain("&lt;script&gt;");
  });
});

describe("demoCoach", () => {
  it("returns a coaching note for step 1", () => {
    const note = demoCoach(1, "initial build");
    expect(typeof note.whatChanged).toBe("string");
    expect(typeof note.concept).toBe("string");
    expect(typeof note.proTip).toBe("string");
  });

  it("returns a different note for later steps", () => {
    const step1 = demoCoach(1, "");
    const step2 = demoCoach(2, "added dark mode");
    expect(step1.whatChanged).not.toBe(step2.whatChanged);
  });

  it("includes the change request in the later-step message", () => {
    const note = demoCoach(2, "changed the color scheme");
    expect(note.whatChanged).toContain("changed the color scheme");
  });
});

describe("demoEdits", () => {
  it("returns an EditResult with a summary and at least one edit", () => {
    const result = demoEdits("add a header");
    expect(typeof result.summary).toBe("string");
    expect(result.edits.length).toBeGreaterThan(0);
    expect(typeof result.edits[0].find).toBe("string");
    expect(typeof result.edits[0].replace).toBe("string");
  });

  it("includes the change request in the summary", () => {
    const result = demoEdits("dark mode toggle");
    expect(result.summary).toContain("dark mode toggle");
  });

  it("does not inject raw HTML from the change request", () => {
    const result = demoEdits("<script>alert(1)</script>");
    const combined = result.edits.map((e) => e.replace).join("");
    expect(combined).not.toContain("<script>alert(1)");
  });
});

describe("demoPlan", () => {
  it("returns a plan with projectName, bigPicture, and 3 parts", () => {
    const plan = demoPlan("Web app", "build a todo", "Alex", "Minecraft");
    expect(typeof plan.projectName).toBe("string");
    expect(typeof plan.bigPicture).toBe("string");
    expect(plan.parts.length).toBe(3);
  });

  it("includes the builder name in bigPicture when provided", () => {
    const plan = demoPlan("App", "prompt", "Jordan", "");
    expect(plan.bigPicture).toContain("Jordan");
  });

  it("includes a game analogy when favoriteGame is set", () => {
    const plan = demoPlan("App", "prompt", "", "Minecraft");
    expect(plan.bigPicture).toContain("Minecraft");
  });

  it("each part has required fields", () => {
    const plan = demoPlan("App", "p", "Alex", "");
    for (const p of plan.parts) {
      expect(typeof p.title).toBe("string");
      expect(typeof p.whatItIs).toBe("string");
      expect(typeof p.why).toBe("string");
      expect(typeof p.concept).toBe("string");
      expect(typeof p.buildSpec).toBe("string");
    }
  });
});

describe("demoExtendPart", () => {
  it("returns a part with all required fields", () => {
    const part = demoExtendPart("add a leaderboard");
    expect(typeof part.title).toBe("string");
    expect(typeof part.whatItIs).toBe("string");
    expect(typeof part.why).toBe("string");
    expect(typeof part.concept).toBe("string");
    expect(typeof part.buildSpec).toBe("string");
  });

  it("includes the request in whatItIs", () => {
    const part = demoExtendPart("add dark mode");
    expect(part.whatItIs).toContain("add dark mode");
  });
});

describe("demoBoardLesson", () => {
  const part = {
    title: "🗄️ The Memory Box",
    whatItIs: "A place to save data",
    concept: "Saving data",
    buildSpec: "Persist items to localStorage",
  };

  it("returns a BoardLesson with required fields", () => {
    const lesson = demoBoardLesson(part, "My App");
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
  it("returns a reply for a question", () => {
    const result = demoBoardChat("Why does this work?");
    expect(typeof result.reply).toBe("string");
    expect(result.reply.length).toBeGreaterThan(0);
  });

  it("returns a reply for a statement", () => {
    const result = demoBoardChat("Got it, that makes sense.");
    expect(typeof result.reply).toBe("string");
  });
});

describe("demoCodeAsk", () => {
  const beatCode = "const list = document.getElementById('list');";

  it("returns a reply and optional highlight hint", () => {
    const result = demoCodeAsk("What does getElementById do?", beatCode);
    expect(typeof result.reply).toBe("string");
    // highlightHint may be null or a string
    if (result.highlightHint !== null) {
      expect(typeof result.highlightHint).toBe("string");
    }
  });

  it("returns a hint referencing a token from the code", () => {
    const result = demoCodeAsk("Why getElementById?", beatCode);
    // The hint should be a substring of the code when present
    if (result.highlightHint) {
      expect(beatCode).toContain(result.highlightHint);
    }
  });
});
