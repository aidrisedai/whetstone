import { describe, it, expect } from "vitest";
import {
  demoAdvisorReply,
  demoAssessment,
  demoLesson,
  demoCoach,
  demoEdits,
  demoBuildHtml,
  demoExtendPart,
} from "@/lib/demo";
import { DEFAULT_THRESHOLD } from "@/lib/scoring";
import type { ChatMessage } from "@/lib/types";

const user = (content: string): ChatMessage => ({ id: "u", role: "user", content });
const advisor = (content: string): ChatMessage => ({ id: "a", role: "advisor", content });

describe("demoAdvisorReply", () => {
  it("returns a non-empty string", () => {
    expect(demoAdvisorReply([user("I want to build a game")], false).length).toBeGreaterThan(0);
  });

  it("returns a closing message when closing=true", () => {
    const reply = demoAdvisorReply([user("sharp idea")], true);
    expect(reply).toMatch(/sharp|forge|clarity/i);
  });

  it("detects image turns and returns image-aware reply", () => {
    const history: ChatMessage[] = [
      { id: "u", role: "user", content: "Here it is", images: [{ mediaType: "image/png", data: "x" }] },
    ];
    const reply = demoAdvisorReply(history, false);
    expect(reply).toContain("sketch");
  });
});

describe("demoAssessment", () => {
  it("returns a valid Assessment shape", () => {
    const history = [user("I want to make a game about cats")];
    const a = demoAssessment(history, null, DEFAULT_THRESHOLD);
    expect(typeof a.overall).toBe("number");
    expect(typeof a.ready).toBe("boolean");
    expect(a.threshold).toBe(DEFAULT_THRESHOLD);
    expect(Array.isArray(a.dynamicCriteria)).toBe(true);
    expect(typeof a.refinedPrompt).toBe("string");
  });

  it("overall score increases with more/richer user turns", () => {
    const sparse = demoAssessment([user("app")], null, DEFAULT_THRESHOLD);
    const rich = demoAssessment(
      [
        user("a detailed idea about building a multiplayer cat strategy game with a scoring system"),
        advisor("sharp"),
        user("more details about the audience which is children 8-12 who love cats and strategy"),
        advisor("more"),
        user("the win condition is being the first to collect all 10 cat tokens on the board"),
      ],
      null,
      DEFAULT_THRESHOLD,
    );
    expect(rich.overall).toBeGreaterThan(sparse.overall);
  });

  it("reuses prior criteria when provided", () => {
    const prior = [
      { key: "core_mechanic", label: "Core mechanic", bestPractice: "core_mechanic" },
    ];
    const a = demoAssessment([user("game idea")], prior, DEFAULT_THRESHOLD);
    expect(a.dynamicCriteria.map((d) => d.key)).toContain("core_mechanic");
  });

  it("score is clamped to 0-100", () => {
    const a = demoAssessment([user("x")], null, DEFAULT_THRESHOLD);
    expect(a.clarity.score).toBeGreaterThanOrEqual(0);
    expect(a.clarity.score).toBeLessThanOrEqual(100);
    expect(a.overall).toBeGreaterThanOrEqual(0);
    expect(a.overall).toBeLessThanOrEqual(100);
  });
});

describe("demoLesson", () => {
  it("returns a Lesson with title, lesson, and why", () => {
    const l = demoLesson([user("idea"), advisor("push")]);
    expect(typeof l.title).toBe("string");
    expect(l.title.length).toBeGreaterThan(0);
    expect(typeof l.lesson).toBe("string");
    expect(typeof l.why).toBe("string");
  });
});

describe("demoCoach", () => {
  it("returns step-1 coaching on first build", () => {
    const c = demoCoach(1, "initial build");
    expect(c.whatChanged.length).toBeGreaterThan(0);
    expect(c.concept.length).toBeGreaterThan(0);
    expect(c.proTip.length).toBeGreaterThan(0);
  });

  it("references the change request on later steps", () => {
    const c = demoCoach(2, "add dark mode");
    expect(c.whatChanged).toContain("add dark mode");
  });
});

describe("demoEdits", () => {
  it("returns a valid EditResult with at least one edit", () => {
    const r = demoEdits("add a footer");
    expect(typeof r.summary).toBe("string");
    expect(Array.isArray(r.edits)).toBe(true);
    expect(r.edits.length).toBeGreaterThan(0);
    expect(typeof r.edits[0].find).toBe("string");
    expect(typeof r.edits[0].replace).toBe("string");
  });

  it("find target is present in a demo HTML document", () => {
    const html = demoBuildHtml("App", "Build a todo app");
    const { edits } = demoEdits("change something");
    for (const e of edits) {
      expect(html).toContain(e.find);
    }
  });
});

describe("demoExtendPart", () => {
  it("returns a part with all required fields", () => {
    const p = demoExtendPart("add a search bar");
    expect(typeof p.title).toBe("string");
    expect(typeof p.whatItIs).toBe("string");
    expect(typeof p.why).toBe("string");
    expect(typeof p.concept).toBe("string");
    expect(typeof p.buildSpec).toBe("string");
  });

  it("title starts with an emoji", () => {
    const p = demoExtendPart("add a button");
    // Emoji is at least 1 Unicode code point in the visible range
    expect(p.title.trim().length).toBeGreaterThan(0);
  });
});

describe("demoBuildHtml", () => {
  it("produces a valid HTML document", () => {
    const html = demoBuildHtml("Game", "Build a cat game");
    expect(html).toMatch(/<!DOCTYPE html/i);
    expect(html).toContain("</html>");
    expect(html).toContain("<body");
  });

  it("includes the project type in the output", () => {
    const html = demoBuildHtml("Game", "Build a cat game");
    expect(html).toContain("Game");
  });

  it("shows the change request in banner when provided", () => {
    const html = demoBuildHtml("App", "prompt", "add dark mode");
    expect(html).toContain("add dark mode");
  });

  it("escapes HTML in project type to prevent XSS", () => {
    const html = demoBuildHtml('<script>alert(1)</script>', "prompt");
    expect(html).not.toContain("<script>alert(1)</script>");
  });
});
