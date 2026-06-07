import { describe, it, expect } from "vitest";
import { demoAdvisorReply, demoAssessment, demoLesson, demoBuildHtml, demoEdits } from "@/lib/demo";
import type { ChatMessage } from "@/lib/types";

function userMsg(content: string): ChatMessage {
  return { id: "u1", role: "user", content };
}
function advisorMsg(content: string): ChatMessage {
  return { id: "a1", role: "advisor", content };
}

// ---------------------------------------------------------------------------
// demoAdvisorReply
// ---------------------------------------------------------------------------
describe("demoAdvisorReply", () => {
  it("returns a closing message when closing=true", () => {
    const reply = demoAdvisorReply([userMsg("hello")], true);
    expect(reply).toContain("sharp enough to build");
  });

  it("returns a pushback for a regular turn", () => {
    const reply = demoAdvisorReply([userMsg("I want to build a game for students")], false);
    expect(reply.length).toBeGreaterThan(10);
    expect(typeof reply).toBe("string");
  });

  it("uses a different pushback template on the second user turn", () => {
    const history: ChatMessage[] = [
      userMsg("I want to build a tracker"),
      advisorMsg("Great!"),
      userMsg("It tracks homework"),
    ];
    const first = demoAdvisorReply([userMsg("I want to build a tracker")], false);
    const second = demoAdvisorReply(history, false);
    expect(first).not.toBe(second);
  });

  it("returns image-specific reply when history has an image on early turn", () => {
    const history: ChatMessage[] = [
      { id: "u1", role: "user", content: "here's my sketch", images: [{ data: "base64data", mediaType: "image/png" }] },
    ];
    const reply = demoAdvisorReply(history, false);
    expect(reply).toContain("sketch");
  });

  it("cycles to the last pushback template when turns exceed PUSHBACKS length", () => {
    const history: ChatMessage[] = [];
    for (let i = 0; i < 10; i++) {
      history.push(userMsg(`turn ${i} with a specific plan`));
      if (i < 9) history.push(advisorMsg("response"));
    }
    const reply = demoAdvisorReply(history, false);
    expect(typeof reply).toBe("string");
    expect(reply.length).toBeGreaterThan(5);
  });
});

// ---------------------------------------------------------------------------
// demoAssessment
// ---------------------------------------------------------------------------
describe("demoAssessment", () => {
  it("returns a valid Assessment shape", () => {
    const history = [userMsg("I want to build a homework tracker for high school students")];
    const result = demoAssessment(history, null, 80);
    expect(typeof result.overall).toBe("number");
    expect(typeof result.ready).toBe("boolean");
    expect(result.threshold).toBe(80);
    expect(result.clarity).toBeDefined();
    expect(result.conciseness).toBeDefined();
    expect(Array.isArray(result.dynamicCriteria)).toBe(true);
    expect(typeof result.refinedPrompt).toBe("string");
  });

  it("score starts low on first turn", () => {
    const result = demoAssessment([userMsg("app")], null, 80);
    expect(result.overall).toBeLessThan(60);
  });

  it("score climbs with more turns", () => {
    const few: ChatMessage[] = [userMsg("I want to build an app")];
    const many: ChatMessage[] = [];
    for (let i = 0; i < 8; i++) {
      many.push(userMsg(`I'm building a homework tracker for 10th graders at public schools in NYC who lose points for forgetting assignments turn ${i}`));
      if (i < 7) many.push(advisorMsg("response"));
    }
    const lowResult = demoAssessment(few, null, 80);
    const highResult = demoAssessment(many, null, 80);
    expect(highResult.overall).toBeGreaterThan(lowResult.overall);
  });

  it("respects priorCriteria to lock dimension keys", () => {
    const prior = [
      { key: "core_mechanic", label: "Core mechanic", bestPractice: "core_mechanic" },
      { key: "success_criteria", label: "Win / lose state", bestPractice: "success_criteria" },
    ];
    const result = demoAssessment([userMsg("a game")], prior, 80);
    expect(result.dynamicCriteria).toHaveLength(2);
    expect(result.dynamicCriteria[0].key).toBe("core_mechanic");
    expect(result.dynamicCriteria[1].key).toBe("success_criteria");
  });

  it("detects a game project and picks game-specific criteria", () => {
    const result = demoAssessment([userMsg("I want to build a puzzle game with levels and scores")], null, 80);
    expect(result.projectType).toBe("Game");
    expect(result.dynamicCriteria.some((c) => c.key === "core_mechanic")).toBe(true);
  });

  it("detects an AI assistant project", () => {
    const result = demoAssessment([userMsg("I want to build an AI chatbot tutor")], null, 80);
    expect(result.projectType).toBe("AI assistant");
  });

  it("all dimension scores are clamped to 0–100", () => {
    const history = [userMsg("build something")];
    const result = demoAssessment(history, null, 80);
    const scores = [result.clarity.score, result.conciseness.score, ...result.dynamicCriteria.map((d) => d.score)];
    for (const s of scores) {
      expect(s).toBeGreaterThanOrEqual(0);
      expect(s).toBeLessThanOrEqual(100);
    }
  });

  it("marks ready=true for a very engaged session", () => {
    const history: ChatMessage[] = [];
    for (let i = 0; i < 12; i++) {
      history.push(
        userMsg(
          `Turn ${i}: I want to build a homework-tracking application specifically for high school students. ` +
            `It will let students log assignments, set deadlines, and receive reminders. ` +
            `Success means they never miss a submission again.`,
        ),
      );
      if (i < 11) history.push(advisorMsg("Good, keep going."));
    }
    const result = demoAssessment(history, null, 80);
    expect(result.ready).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// demoLesson
// ---------------------------------------------------------------------------
describe("demoLesson", () => {
  it("returns a lesson with title, lesson, and why fields", () => {
    const lesson = demoLesson([userMsg("hello")]);
    expect(typeof lesson.title).toBe("string");
    expect(typeof lesson.lesson).toBe("string");
    expect(typeof lesson.why).toBe("string");
  });

  it("returns a different 'why' for short vs long sessions", () => {
    const short = demoLesson([userMsg("a"), userMsg("b")]);
    const long: ChatMessage[] = [];
    for (let i = 0; i < 6; i++) long.push(userMsg(`msg ${i}`));
    const longLesson = demoLesson(long);
    expect(short.why).not.toBe(longLesson.why);
  });
});

// ---------------------------------------------------------------------------
// demoBuildHtml
// ---------------------------------------------------------------------------
describe("demoBuildHtml", () => {
  it("returns a string containing a valid HTML skeleton", () => {
    const html = demoBuildHtml("Game", "Build a puzzle game", undefined);
    expect(html).toContain("<!DOCTYPE html>");
    expect(html).toContain("</html>");
  });

  it("escapes projectType in the output", () => {
    const html = demoBuildHtml('<script>alert(1)</script>', "prompt", undefined);
    expect(html).not.toContain("<script>alert(1)</script>");
    expect(html).toContain("&lt;script&gt;");
  });

  it("includes change request in the banner when provided", () => {
    const html = demoBuildHtml("App", "prompt", "change the color to red");
    expect(html).toContain("change the color to red");
  });

  it("shows demo setup notice when no change request", () => {
    const html = demoBuildHtml("App", "prompt", undefined);
    expect(html).toContain("ANTHROPIC_API_KEY");
  });
});

// ---------------------------------------------------------------------------
// demoEdits
// ---------------------------------------------------------------------------
describe("demoEdits", () => {
  it("returns an EditResult with summary and edits array", () => {
    const result = demoEdits("make it dark mode");
    expect(typeof result.summary).toBe("string");
    expect(Array.isArray(result.edits)).toBe(true);
    expect(result.edits.length).toBeGreaterThan(0);
  });

  it("each edit has find and replace fields", () => {
    const result = demoEdits("anything");
    for (const edit of result.edits) {
      expect(typeof edit.find).toBe("string");
      expect(typeof edit.replace).toBe("string");
    }
  });

  it("escapes HTML special characters in the injected replace string", () => {
    const result = demoEdits('<img src=x onerror="alert(1)">');
    // The replace string is injected into the page DOM, so < > and " must be entity-escaped.
    // &lt;img means the tag cannot be parsed as an actual element.
    expect(result.edits[0].replace).toContain("&lt;img");
    expect(result.edits[0].replace).toContain("&gt;");
    // Unescaped double-quote around the attribute value would allow injection — must not appear.
    expect(result.edits[0].replace).not.toContain('onerror="alert');
  });
});
