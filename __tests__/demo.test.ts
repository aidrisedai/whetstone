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
  demoExtendPart,
} from "@/lib/demo";
import type { ChatMessage } from "@/lib/types";

function userMsg(content: string): ChatMessage {
  return { id: "u1", role: "user", content };
}
function advisorMsg(content: string): ChatMessage {
  return { id: "a1", role: "advisor", content };
}

// ── demoAdvisorReply ─────────────────────────────────────────────────────────

describe("demoAdvisorReply", () => {
  it("returns a non-empty string", () => {
    const reply = demoAdvisorReply([userMsg("I want to build a game")], false);
    expect(typeof reply).toBe("string");
    expect(reply.length).toBeGreaterThan(0);
  });

  it("returns a closing message when closing=true", () => {
    const reply = demoAdvisorReply([userMsg("done")], true);
    expect(reply).toContain("forge");
  });

  it("returns an image-specific reply on the first two user turns with an image", () => {
    const msg: ChatMessage = {
      id: "u1",
      role: "user",
      content: "here is my sketch",
      images: [{ mediaType: "image/png", data: "abc" }],
    };
    const reply = demoAdvisorReply([msg], false);
    expect(reply).toContain("sketch");
  });

  it("cycles through pushbacks based on turn count", () => {
    const history: ChatMessage[] = [];
    for (let i = 0; i < 6; i++) {
      history.push(userMsg(`answer ${i}`));
      history.push(advisorMsg("ok"));
    }
    const reply = demoAdvisorReply(history, false);
    expect(reply.length).toBeGreaterThan(0);
  });
});

// ── demoAssessment ───────────────────────────────────────────────────────────

describe("demoAssessment", () => {
  it("returns a valid Assessment shape", () => {
    const history = [userMsg("I want to build a game"), advisorMsg("ok")];
    const a = demoAssessment(history, null, 80);
    expect(typeof a.overall).toBe("number");
    expect(a.overall).toBeGreaterThanOrEqual(0);
    expect(a.overall).toBeLessThanOrEqual(100);
    expect(typeof a.ready).toBe("boolean");
    expect(a.threshold).toBe(80);
    expect(a.dynamicCriteria.length).toBeGreaterThanOrEqual(2);
    expect(typeof a.refinedPrompt).toBe("string");
  });

  it("score climbs with more user engagement", () => {
    const short = [userMsg("game")];
    const long = Array.from({ length: 6 }, (_, i) =>
      i % 2 === 0
        ? userMsg("I want to build a game with levels and scores for kids aged 10-12 who love action")
        : advisorMsg("ok"),
    );
    const aShort = demoAssessment(short, null, 80);
    const aLong = demoAssessment(long, null, 80);
    expect(aLong.overall).toBeGreaterThan(aShort.overall);
  });

  it("uses prior criteria when provided", () => {
    const history = [userMsg("game"), advisorMsg("ok")];
    const prior = [
      { key: "core_mechanic", label: "Core mechanic", bestPractice: "core_mechanic" },
      { key: "success_criteria", label: "Win / lose state", bestPractice: "success_criteria" },
    ];
    const a = demoAssessment(history, prior, 80);
    expect(a.dynamicCriteria.map((d) => d.key)).toEqual(["core_mechanic", "success_criteria"]);
  });

  it("detects different project types", () => {
    const game = demoAssessment([userMsg("I want to build a game")], null, 80);
    const ai = demoAssessment([userMsg("I want to build a chatbot assistant")], null, 80);
    const data = demoAssessment([userMsg("I want to build a dashboard tracker")], null, 80);
    expect(game.projectType).toBe("Game");
    expect(ai.projectType).toBe("AI assistant");
    expect(data.projectType).toBe("Data tool");
  });

  it("falls back to Web app for unrecognized type", () => {
    const a = demoAssessment([userMsg("I want to build something cool")], null, 80);
    expect(a.projectType).toBe("Web app");
  });
});

// ── demoLesson ───────────────────────────────────────────────────────────────

describe("demoLesson", () => {
  it("returns a lesson with title, lesson, and why fields", () => {
    const history = [userMsg("game idea"), advisorMsg("ok")];
    const lesson = demoLesson(history);
    expect(typeof lesson.title).toBe("string");
    expect(typeof lesson.lesson).toBe("string");
    expect(typeof lesson.why).toBe("string");
    expect(lesson.title.length).toBeGreaterThan(0);
  });

  it("varies the why field based on turn count", () => {
    const short = [userMsg("a"), advisorMsg("b")];
    const long = Array.from({ length: 10 }, (_, i) =>
      i % 2 === 0 ? userMsg("thing") : advisorMsg("ok"),
    );
    const l1 = demoLesson(short);
    const l2 = demoLesson(long);
    expect(l2.why).not.toBe(l1.why);
  });
});

// ── demoBuildHtml ────────────────────────────────────────────────────────────

describe("demoBuildHtml", () => {
  it("returns a valid HTML document string", () => {
    const html = demoBuildHtml("Game", "Build a game", undefined);
    expect(html).toContain("<!DOCTYPE html>");
    expect(html).toContain("</html>");
    expect(html).toContain("Game");
  });

  it("includes the change request note when provided", () => {
    const html = demoBuildHtml("App", "Build something", "Add dark mode");
    expect(html).toContain("Add dark mode");
  });

  it("escapes user-supplied HTML in project type and prompt", () => {
    const html = demoBuildHtml("<script>alert(1)</script>", "alert('xss')", undefined);
    // User input must be escaped in the output (title, h1)
    expect(html).toContain("&lt;script&gt;");
    // The raw, unescaped user tag must not appear as a live tag
    expect(html).not.toContain("<script>alert(1)</script>");
  });
});

// ── demoCoach ────────────────────────────────────────────────────────────────

describe("demoCoach", () => {
  it("returns a CoachNote with all three fields", () => {
    const note = demoCoach(1, "");
    expect(typeof note.whatChanged).toBe("string");
    expect(typeof note.concept).toBe("string");
    expect(typeof note.proTip).toBe("string");
  });

  it("step 1 gives an initial build note", () => {
    const note = demoCoach(1, "");
    expect(note.whatChanged).toContain("first version");
  });

  it("step 2+ includes the change request", () => {
    const note = demoCoach(2, "add dark mode");
    expect(note.whatChanged).toContain("add dark mode");
  });
});

// ── demoEdits ────────────────────────────────────────────────────────────────

describe("demoEdits", () => {
  it("returns an EditResult with summary and edits", () => {
    const result = demoEdits("change button color");
    expect(typeof result.summary).toBe("string");
    expect(Array.isArray(result.edits)).toBe(true);
    expect(result.edits.length).toBeGreaterThan(0);
    expect(typeof result.edits[0].find).toBe("string");
    expect(typeof result.edits[0].replace).toBe("string");
  });
});

// ── demoPlan ─────────────────────────────────────────────────────────────────

describe("demoPlan", () => {
  it("returns a plan with projectName, bigPicture, and parts", () => {
    const plan = demoPlan("Web app", "Build a tracker", "Alex", "Minecraft");
    expect(typeof plan.projectName).toBe("string");
    expect(typeof plan.bigPicture).toBe("string");
    expect(Array.isArray(plan.parts)).toBe(true);
    expect(plan.parts.length).toBeGreaterThan(0);
  });

  it("includes the builder name in bigPicture", () => {
    const plan = demoPlan("App", "Build a thing", "Sam", "Roblox");
    expect(plan.bigPicture).toContain("Sam");
  });

  it("includes favorite game reference when provided", () => {
    const plan = demoPlan("App", "Build a thing", "Sam", "Minecraft");
    expect(plan.bigPicture).toContain("Minecraft");
  });

  it("each part has required fields", () => {
    const plan = demoPlan("App", "prompt", "", "");
    for (const part of plan.parts) {
      expect(typeof part.title).toBe("string");
      expect(typeof part.whatItIs).toBe("string");
      expect(typeof part.why).toBe("string");
      expect(typeof part.concept).toBe("string");
      expect(typeof part.buildSpec).toBe("string");
    }
  });
});

// ── demoBoardLesson ──────────────────────────────────────────────────────────

describe("demoBoardLesson", () => {
  const part = { title: "The Stage", whatItIs: "the main screen", concept: "DOM", buildSpec: "create the shell" };

  it("returns a BoardLesson with required shape", () => {
    const lesson = demoBoardLesson(part, "My App");
    expect(typeof lesson.partTitle).toBe("string");
    expect(typeof lesson.boardTitle).toBe("string");
    expect(Array.isArray(lesson.steps)).toBe(true);
    expect(lesson.steps.length).toBeGreaterThan(0);
    expect(typeof lesson.closing).toBe("string");
  });

  it("each step has say and items", () => {
    const lesson = demoBoardLesson(part, "My App");
    for (const step of lesson.steps) {
      expect(typeof step.say).toBe("string");
      expect(Array.isArray(step.items)).toBe(true);
    }
  });
});

// ── demoBoardChat ────────────────────────────────────────────────────────────

describe("demoBoardChat", () => {
  it("returns a reply and optional boardItem", () => {
    const result = demoBoardChat("What does getElementById do?");
    expect(typeof result.reply).toBe("string");
    // boardItem can be BoardItem | null
  });

  it("recognizes a question and gives a clarifying reply", () => {
    const result = demoBoardChat("Why do we use an array?");
    expect(result.reply.length).toBeGreaterThan(0);
  });

  it("handles non-question input", () => {
    const result = demoBoardChat("Cool!");
    expect(result.reply.length).toBeGreaterThan(0);
  });
});

// ── demoCodeAsk ──────────────────────────────────────────────────────────────

describe("demoCodeAsk", () => {
  it("returns reply and highlightHint", () => {
    const result = demoCodeAsk("What does this line do?", "const list = document.getElementById('list');");
    expect(typeof result.reply).toBe("string");
    // highlightHint is string | null
  });

  it("extracts a token from beatCode for a question", () => {
    const result = demoCodeAsk("What is this?", "getElementById('list')");
    expect(result.reply.length).toBeGreaterThan(0);
  });
});

// ── demoExtendPart ───────────────────────────────────────────────────────────

describe("demoExtendPart", () => {
  it("returns a BuildPart shape (without id)", () => {
    const part = demoExtendPart("Add a dark mode toggle");
    expect(typeof part.title).toBe("string");
    expect(typeof part.whatItIs).toBe("string");
    expect(typeof part.why).toBe("string");
    expect(typeof part.concept).toBe("string");
    expect(typeof part.buildSpec).toBe("string");
  });

  it("includes the request text in the part", () => {
    const part = demoExtendPart("Add a confetti animation");
    expect(part.whatItIs).toContain("Add a confetti animation");
  });
});
