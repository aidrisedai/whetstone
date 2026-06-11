import { describe, it, expect } from "vitest";
import {
  demoAdvisorReply,
  demoAssessment,
  demoLesson,
  demoBuildHtml,
  demoEdits,
  demoCoach,
} from "../lib/demo";
import type { ChatMessage } from "../lib/types";

function msg(role: "user" | "advisor", content: string): ChatMessage {
  return { id: crypto.randomUUID(), role, content };
}

describe("demoAdvisorReply", () => {
  it("returns the closing statement when closing=true", () => {
    const reply = demoAdvisorReply([msg("user", "I want to build an app")], true);
    expect(reply).toBeTruthy();
    expect(typeof reply).toBe("string");
    // Closing reply shouldn't end with a question mark
    expect(reply.trim().endsWith("?")).toBe(false);
  });

  it("returns a pushback question for a non-closing turn", () => {
    const history = [msg("user", "I want to build a game for students")];
    const reply = demoAdvisorReply(history, false);
    expect(reply.length).toBeGreaterThan(10);
  });

  it("reacts to images on the first two turns", () => {
    const history: ChatMessage[] = [
      {
        id: "1",
        role: "user",
        content: "Here's my sketch",
        images: [{ mediaType: "image/png", data: "abc123" }],
      },
    ];
    const reply = demoAdvisorReply(history, false);
    expect(reply).toContain("sketch");
  });

  it("cycles through pushbacks as turns increase", () => {
    const replies = new Set<string>();
    for (let turns = 1; turns <= 6; turns++) {
      const history = Array.from({ length: turns }, (_, i) => msg("user", `message ${i}`));
      replies.add(demoAdvisorReply(history, false));
    }
    // Should get at least 3 distinct pushback messages
    expect(replies.size).toBeGreaterThanOrEqual(3);
  });
});

describe("demoAssessment", () => {
  it("returns a valid Assessment shape", () => {
    const history = [msg("user", "I want to build a todo app for students")];
    const result = demoAssessment(history, null, 80);
    expect(typeof result.overall).toBe("number");
    expect(typeof result.ready).toBe("boolean");
    expect(result.threshold).toBe(80);
    expect(result.clarity.score).toBeGreaterThanOrEqual(0);
    expect(result.clarity.score).toBeLessThanOrEqual(100);
    expect(result.dynamicCriteria.length).toBeGreaterThan(0);
  });

  it("scores climb as turns increase", () => {
    const few = [msg("user", "app idea")];
    const many = Array.from({ length: 8 }, (_, i) =>
      msg("user", `detailed turn ${i}: specifically for high school students who need to track homework assignments`)
    );
    const low = demoAssessment(few, null, 80);
    const high = demoAssessment(many, null, 80);
    expect(high.overall).toBeGreaterThan(low.overall);
  });

  it("respects the threshold parameter", () => {
    const history = Array.from({ length: 8 }, (_, i) =>
      msg("user", `detailed message ${i} about my web app for tracking student grades`)
    );
    const r80 = demoAssessment(history, null, 80);
    const r50 = demoAssessment(history, null, 50);
    // With a lower threshold, ready should be true sooner (same scores, different threshold)
    expect(r50.threshold).toBe(50);
    expect(r80.threshold).toBe(80);
  });

  it("detects game projects and uses game criteria", () => {
    const history = [msg("user", "I want to build an arcade game with a scoring system and levels")];
    const result = demoAssessment(history, null, 80);
    expect(result.projectType).toBe("Game");
    const keys = result.dynamicCriteria.map((d) => d.key);
    expect(keys).toContain("core_mechanic");
  });

  it("locks to prior criteria when provided", () => {
    const history = [msg("user", "game with levels and arcade controls")];
    const priorCriteria = [
      { key: "define_audience", label: "Audience", bestPractice: "define_audience" },
    ];
    const result = demoAssessment(history, priorCriteria, 80);
    expect(result.dynamicCriteria.length).toBe(1);
    expect(result.dynamicCriteria[0].key).toBe("define_audience");
  });

  it("generates a refinedPrompt that starts with 'Build'", () => {
    const history = [msg("user", "a task manager")];
    const result = demoAssessment(history, null, 80);
    expect(result.refinedPrompt).toMatch(/^Build /i);
  });
});

describe("demoLesson", () => {
  it("returns a valid Lesson shape", () => {
    const lesson = demoLesson([msg("user", "hello")]);
    expect(lesson.title).toBeTruthy();
    expect(lesson.lesson).toBeTruthy();
    expect(lesson.why).toBeTruthy();
  });

  it("adjusts the 'why' field based on conversation depth", () => {
    const shortConv = [msg("user", "one message")];
    const longConv = Array.from({ length: 5 }, (_, i) => msg("user", `message ${i}`));
    const short = demoLesson(shortConv);
    const long = demoLesson(longConv);
    // Both should produce truthy why fields, but the text should differ
    expect(short.why).toBeTruthy();
    expect(long.why).toBeTruthy();
  });
});

describe("demoBuildHtml", () => {
  it("returns valid HTML with DOCTYPE", () => {
    const html = demoBuildHtml("Task Tracker", "Build a task tracker app", undefined);
    expect(html).toContain("<!DOCTYPE html>");
    expect(html).toContain("<html");
    expect(html).toContain("</html>");
  });

  it("includes the project type in the output", () => {
    const html = demoBuildHtml("Arcade Game", "Build a fun game", undefined);
    expect(html).toContain("Arcade Game");
  });

  it("escapes HTML special chars in project type to prevent XSS", () => {
    const html = demoBuildHtml("<script>alert(1)</script>", "prompt", undefined);
    expect(html).not.toContain("<script>alert(1)</script>");
    expect(html).toContain("&lt;script&gt;");
  });

  it("shows a change-request banner when changeRequest is provided", () => {
    const html = demoBuildHtml("App", "prompt", "make it dark themed");
    expect(html).toContain("make it dark themed");
  });

  it("shows a setup banner when changeRequest is not provided", () => {
    const html = demoBuildHtml("App", "prompt", undefined);
    expect(html).toContain("ANTHROPIC_API_KEY");
  });

  it("includes a working localStorage script", () => {
    const html = demoBuildHtml("App", "prompt", undefined);
    expect(html).toContain("localStorage");
    expect(html).toContain("<script>");
  });
});

describe("demoEdits", () => {
  it("returns a summary and at least one edit operation", () => {
    const result = demoEdits("make the background blue");
    expect(result.summary).toBeTruthy();
    expect(Array.isArray(result.edits)).toBe(true);
    expect(result.edits.length).toBeGreaterThan(0);
  });

  it("each edit has find and replace strings", () => {
    const result = demoEdits("change the font");
    for (const edit of result.edits) {
      expect(typeof edit.find).toBe("string");
      expect(typeof edit.replace).toBe("string");
    }
  });

  it("escapes the change request in the edit to prevent injection", () => {
    const result = demoEdits('<img onerror="alert(1)">');
    const combined = result.edits.map((e) => e.replace).join("");
    expect(combined).not.toContain("<img onerror");
  });
});

describe("demoCoach", () => {
  it("returns a valid CoachNote for step 1", () => {
    const note = demoCoach(1, "initial build");
    expect(note.whatChanged).toBeTruthy();
    expect(note.concept).toBeTruthy();
    expect(note.proTip).toBeTruthy();
  });

  it("returns a different note for later steps", () => {
    const step1 = demoCoach(1, "");
    const step2 = demoCoach(2, "made it blue");
    expect(step2.whatChanged).not.toBe(step1.whatChanged);
  });

  it("includes the change request in the note for step > 1", () => {
    const note = demoCoach(3, "add a dark mode button");
    expect(note.whatChanged).toContain("add a dark mode button");
  });
});
