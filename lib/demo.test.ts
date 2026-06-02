import { describe, it, expect } from "vitest";
import {
  demoAdvisorReply,
  demoAssessment,
  demoLesson,
  demoEdits,
  demoExtendPart,
  demoBuildHtml,
} from "./demo";
import type { ChatMessage } from "./types";

function userMsg(content: string, id = "u1"): ChatMessage {
  return { id, role: "user", content };
}
function advisorMsg(content = "ok"): ChatMessage {
  return { id: "a1", role: "advisor", content };
}

describe("demoAdvisorReply", () => {
  it("returns a non-empty string for a single user turn", () => {
    const reply = demoAdvisorReply([userMsg("I want to build a game tracker")], false);
    expect(typeof reply).toBe("string");
    expect(reply.length).toBeGreaterThan(0);
  });

  it("returns the closing message when closing=true", () => {
    const reply = demoAdvisorReply([userMsg("idea")], true);
    expect(reply).toContain("sharp enough to build");
  });

  it("cycles through pushbacks as turn count increases", () => {
    const history: ChatMessage[] = [];
    const replies = new Set<string>();
    for (let i = 0; i < 6; i++) {
      history.push(userMsg(`msg ${i}`, `u${i}`));
      replies.add(demoAdvisorReply(history, false));
    }
    expect(replies.size).toBeGreaterThan(1);
  });

  it("reacts to images in early turns", () => {
    const history: ChatMessage[] = [
      { id: "u1", role: "user", content: "here is my sketch", images: [{ mediaType: "image/png", data: "abc" }] },
    ];
    const reply = demoAdvisorReply(history, false);
    expect(reply.toLowerCase()).toContain("sketch");
  });
});

describe("demoAssessment", () => {
  it("returns a valid Assessment shape", () => {
    const a = demoAssessment([userMsg("build a game")], null, 80);
    expect(a).toHaveProperty("overall");
    expect(a).toHaveProperty("ready");
    expect(a).toHaveProperty("threshold", 80);
    expect(a).toHaveProperty("clarity");
    expect(a).toHaveProperty("conciseness");
    expect(a).toHaveProperty("dynamicCriteria");
    expect(a).toHaveProperty("refinedPrompt");
    expect(typeof a.overall).toBe("number");
    expect(a.overall).toBeGreaterThanOrEqual(0);
    expect(a.overall).toBeLessThanOrEqual(100);
  });

  it("score rises as conversation gets richer", () => {
    const short = demoAssessment([userMsg("app")], null, 80);
    const rich = demoAssessment(
      [
        userMsg("I want to build a score tracker app for my basketball team at school"),
        advisorMsg(),
        userMsg("It helps players track their stats. They can add games and see their shooting percentage"),
        advisorMsg(),
        userMsg("Users are ages 12-16 on youth teams. Success is adding a game and seeing updated stats"),
      ],
      null,
      80,
    );
    expect(rich.overall).toBeGreaterThan(short.overall);
  });

  it("locks criteria to priorCriteria when provided", () => {
    const prior = [
      { key: "core_mechanic", label: "Core mechanic", bestPractice: "core_mechanic" },
    ];
    const a = demoAssessment([userMsg("game idea")], prior, 80);
    expect(a.dynamicCriteria[0].key).toBe("core_mechanic");
  });

  it("detects game projects", () => {
    const a = demoAssessment([userMsg("I want to build a puzzle game with levels and scoring")], null, 80);
    expect(a.projectType).toBe("Game");
  });

  it("detects AI assistant projects", () => {
    const a = demoAssessment([userMsg("build a chatbot tutor for math")], null, 80);
    expect(a.projectType).toBe("AI assistant");
  });

  it("detects data tool projects", () => {
    const a = demoAssessment([userMsg("a dashboard to track my budget")], null, 80);
    expect(a.projectType).toBe("Data tool");
  });

  it("falls back to Web app for unrecognized project types", () => {
    const a = demoAssessment([userMsg("a tool for making friends")], null, 80);
    expect(a.projectType).toBe("Web app");
  });
});

describe("demoLesson", () => {
  it("returns a Lesson with title, lesson, and why", () => {
    const l = demoLesson([userMsg("build something")]);
    expect(l).toHaveProperty("title");
    expect(l).toHaveProperty("lesson");
    expect(l).toHaveProperty("why");
  });

  it("adapts the 'why' for longer conversations", () => {
    const long: ChatMessage[] = Array.from({ length: 10 }, (_, i) => userMsg(`msg ${i}`, `u${i}`));
    const short: ChatMessage[] = [userMsg("idea")];
    expect(demoLesson(long).why).not.toBe(demoLesson(short).why);
  });
});

describe("demoEdits", () => {
  it("returns an EditResult with summary and at least one edit", () => {
    const r = demoEdits("change the color to red");
    expect(r).toHaveProperty("summary");
    expect(Array.isArray(r.edits)).toBe(true);
    expect(r.edits.length).toBeGreaterThan(0);
    expect(r.edits[0]).toHaveProperty("find");
    expect(r.edits[0]).toHaveProperty("replace");
  });

  it("includes the change request in the injected banner", () => {
    const r = demoEdits("add dark mode");
    expect(r.edits[0].replace).toContain("add dark mode");
  });

  it("handles an empty change request without throwing", () => {
    expect(() => demoEdits("")).not.toThrow();
  });
});

describe("demoExtendPart", () => {
  it("returns a BuildPart shape (without id)", () => {
    const p = demoExtendPart("add a leaderboard");
    expect(p).toHaveProperty("title");
    expect(p).toHaveProperty("whatItIs");
    expect(p).toHaveProperty("why");
    expect(p).toHaveProperty("concept");
    expect(p).toHaveProperty("buildSpec");
  });

  it("incorporates the request text", () => {
    const p = demoExtendPart("add a leaderboard");
    expect(p.whatItIs).toContain("add a leaderboard");
  });
});

describe("demoBuildHtml", () => {
  it("returns a complete self-contained HTML document", () => {
    const html = demoBuildHtml("Game", "Build a quiz game", undefined);
    expect(html).toMatch(/<!DOCTYPE html/i);
    expect(html).toContain("</html>");
    expect(html).toContain("<body");
    expect(html).toContain("</body>");
  });

  it("includes a demo banner when no changeRequest is given", () => {
    const html = demoBuildHtml("App", "Build something", undefined);
    expect(html).toContain("Demo build");
  });

  it("reflects the changeRequest in the banner", () => {
    const html = demoBuildHtml("App", "Build something", "make it dark");
    expect(html).toContain("make it dark");
  });

  it("escapes HTML in the refined prompt to prevent XSS", () => {
    const html = demoBuildHtml("App", '<script>alert("xss")</script>', undefined);
    expect(html).not.toContain("<script>alert");
    expect(html).toContain("&lt;script&gt;");
  });

  it("escapes HTML in the project type", () => {
    const html = demoBuildHtml('<img onerror="x">', "prompt", undefined);
    expect(html).not.toContain('<img onerror="x">');
  });
});
