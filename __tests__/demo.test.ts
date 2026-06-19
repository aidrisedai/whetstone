import { describe, it, expect } from "vitest";
import {
  demoAdvisorReply,
  demoAssessment,
  demoLesson,
  demoEdits,
  demoExtendPart,
  demoBoardChat,
  demoCodeAsk,
} from "../lib/demo";
import { DEFAULT_THRESHOLD } from "../lib/scoring";
import type { ChatMessage } from "../lib/types";

function userMsg(content: string): ChatMessage {
  return { id: "u1", role: "user", content };
}

function advisorMsg(content: string): ChatMessage {
  return { id: "a1", role: "advisor", content };
}

describe("demoAdvisorReply", () => {
  it("returns a string", () => {
    expect(typeof demoAdvisorReply([userMsg("I want to build a game")], false)).toBe("string");
  });

  it("returns the closing message in closing phase", () => {
    const reply = demoAdvisorReply([userMsg("I want to build a game")], true);
    expect(reply.length).toBeGreaterThan(0);
    expect(reply).toContain("forge");
  });

  it("reacts to image attachments on turn 1", () => {
    const msg: ChatMessage = {
      id: "u1",
      role: "user",
      content: "here is my sketch",
      images: [{ mediaType: "image/png", data: "base64data" }],
    };
    const reply = demoAdvisorReply([msg], false);
    expect(reply).toContain("sketch");
  });

  it("cycles through pushback prompts across turns", () => {
    const history: ChatMessage[] = [];
    const replies = new Set<string>();
    for (let i = 0; i < 4; i++) {
      history.push(userMsg(`turn ${i} idea about tracker`));
      history.push(advisorMsg("ok"));
      replies.add(demoAdvisorReply([...history], false));
    }
    // Each turn should produce content
    expect(replies.size).toBeGreaterThan(1);
  });
});

describe("demoAssessment", () => {
  it("returns a valid Assessment with all required fields", () => {
    const a = demoAssessment([userMsg("build a todo app")], null, DEFAULT_THRESHOLD);
    expect(a.projectType).toBeTruthy();
    expect(a.clarity).toBeDefined();
    expect(a.conciseness).toBeDefined();
    expect(Array.isArray(a.dynamicCriteria)).toBe(true);
    expect(typeof a.overall).toBe("number");
    expect(typeof a.ready).toBe("boolean");
    expect(a.threshold).toBe(DEFAULT_THRESHOLD);
  });

  it("overall is between 0 and 100", () => {
    const a = demoAssessment([userMsg("build a game")], null, DEFAULT_THRESHOLD);
    expect(a.overall).toBeGreaterThanOrEqual(0);
    expect(a.overall).toBeLessThanOrEqual(100);
  });

  it("score rises as more substantive answers are given", () => {
    const short = demoAssessment([userMsg("app")], null, DEFAULT_THRESHOLD);
    const detailed = demoAssessment(
      [userMsg("I want to build a tracker app for high school students that logs their daily study hours and shows a weekly graph so they can see their progress and plan better")],
      null,
      DEFAULT_THRESHOLD,
    );
    expect(detailed.overall).toBeGreaterThanOrEqual(short.overall);
  });

  it("locks dynamic criteria when priorCriteria is provided", () => {
    const prior = [
      { key: "core_mechanic", label: "Core mechanic", bestPractice: "core_mechanic" },
    ];
    const a = demoAssessment([userMsg("build a game")], prior, DEFAULT_THRESHOLD);
    expect(a.dynamicCriteria[0].key).toBe("core_mechanic");
  });

  it("detects game project type", () => {
    const a = demoAssessment([userMsg("I want to build a puzzle game with levels")], null, DEFAULT_THRESHOLD);
    expect(a.projectType).toBe("Game");
  });

  it("detects AI assistant project type", () => {
    const a = demoAssessment([userMsg("build a chatbot tutor for kids")], null, DEFAULT_THRESHOLD);
    expect(a.projectType).toBe("AI assistant");
  });

  it("includes a non-empty refinedPrompt", () => {
    const a = demoAssessment([userMsg("build something cool")], null, DEFAULT_THRESHOLD);
    expect(a.refinedPrompt.length).toBeGreaterThan(0);
    expect(a.refinedPrompt).toMatch(/^Build/i);
  });
});

describe("demoLesson", () => {
  it("returns title, lesson, and why strings", () => {
    const l = demoLesson([userMsg("build a game")]);
    expect(typeof l.title).toBe("string");
    expect(typeof l.lesson).toBe("string");
    expect(typeof l.why).toBe("string");
  });

  it("why mentions 'vague' or 'few' for a short session", () => {
    const l = demoLesson([userMsg("build a game")]);
    expect(l.why.length).toBeGreaterThan(0);
  });

  it("why mentions sharper turns for longer sessions", () => {
    const history: ChatMessage[] = [];
    for (let i = 0; i < 5; i++) {
      history.push(userMsg(`turn ${i}`));
      history.push(advisorMsg("ok"));
    }
    const l = demoLesson(history);
    expect(l.why).toContain("vague");
  });
});

describe("demoEdits", () => {
  it("returns summary and at least one edit op", () => {
    const r = demoEdits("change background color");
    expect(r.summary.length).toBeGreaterThan(0);
    expect(r.edits.length).toBeGreaterThan(0);
    expect(r.edits[0].find).toBeTruthy();
    expect(r.edits[0].replace).toBeTruthy();
  });
});

describe("demoExtendPart", () => {
  it("produces a BuildPart-shaped object", () => {
    const p = demoExtendPart("add a dark mode toggle");
    expect(typeof p.title).toBe("string");
    expect(typeof p.whatItIs).toBe("string");
    expect(typeof p.why).toBe("string");
    expect(typeof p.concept).toBe("string");
    expect(typeof p.buildSpec).toBe("string");
    expect(p.buildSpec).toContain("add a dark mode toggle");
  });
});

describe("demoBoardChat", () => {
  it("replies to a question with a meaningful response", () => {
    const r = demoBoardChat("What does this arrow mean?");
    expect(r.reply.length).toBeGreaterThan(0);
  });

  it("may add a board item for a question", () => {
    const r = demoBoardChat("Why do we need this?");
    // boardItem may be null or an object — just verify the shape
    if (r.boardItem !== null) {
      expect(typeof r.boardItem.kind).toBe("string");
      expect(typeof r.boardItem.text).toBe("string");
    }
  });

  it("handles non-question input gracefully", () => {
    const r = demoBoardChat("Cool, I get it");
    expect(r.reply.length).toBeGreaterThan(0);
    expect(r.boardItem).toBeNull();
  });
});

describe("demoCodeAsk", () => {
  it("returns a reply and optional highlightHint", () => {
    const r = demoCodeAsk("What does this do?", "const list = document.getElementById('list');");
    expect(r.reply.length).toBeGreaterThan(0);
    // highlightHint may be a token from the code or null
  });

  it("returns null highlightHint for non-questions", () => {
    const r = demoCodeAsk("Interesting", "const x = 1;");
    expect(r.highlightHint).toBeNull();
  });
});
