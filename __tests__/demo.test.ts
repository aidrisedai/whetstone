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
import type { ChatMessage } from "@/lib/types";

const msg = (role: "user" | "advisor", content: string): ChatMessage => ({
  id: `${role}-1`,
  role,
  content,
});

describe("demoAdvisorReply", () => {
  it("returns a closing message when closing=true", () => {
    const reply = demoAdvisorReply([msg("user", "hello")], true);
    expect(reply.length).toBeGreaterThan(0);
    expect(typeof reply).toBe("string");
  });

  it("returns a pushback when closing=false", () => {
    const reply = demoAdvisorReply([msg("user", "I want to build a productivity tracker")], false);
    expect(reply.length).toBeGreaterThan(0);
    expect(typeof reply).toBe("string");
  });

  it("references a salient word from the user message", () => {
    const reply = demoAdvisorReply([msg("user", "I want to build a marketplace platform")], false);
    // The reply should reference 'marketplace' or 'platform' (longest non-stopword)
    expect(reply.toLowerCase()).toMatch(/marketplace|platform/);
  });

  it("returns an image-aware reply on turn 1 when an image is present", () => {
    const history: ChatMessage[] = [
      {
        id: "u1",
        role: "user",
        content: "here is my sketch",
        images: [{ mediaType: "image/png", data: "base64data" }],
      },
    ];
    const reply = demoAdvisorReply(history, false);
    expect(reply).toMatch(/sketch|screen|layout/i);
  });

  it("progresses through different pushbacks across turns", () => {
    const history: ChatMessage[] = [];
    const replies = new Set<string>();
    for (let i = 0; i < 6; i++) {
      history.push(msg("user", `turn ${i} — building a dashboard for tracking fitness goals`));
      replies.add(demoAdvisorReply(history, false));
    }
    // Different turns → different templates
    expect(replies.size).toBeGreaterThan(1);
  });
});

describe("demoAssessment", () => {
  const baseHistory = [msg("user", "I want to build a game where players collect planets")];

  it("returns a valid Assessment shape", () => {
    const result = demoAssessment(baseHistory, null, 80);
    expect(typeof result.overall).toBe("number");
    expect(typeof result.ready).toBe("boolean");
    expect(result.threshold).toBe(80);
    expect(result.clarity).toBeDefined();
    expect(result.conciseness).toBeDefined();
    expect(Array.isArray(result.dynamicCriteria)).toBe(true);
    expect(typeof result.refinedPrompt).toBe("string");
    expect(result.refinedPrompt.length).toBeGreaterThan(0);
  });

  it("scores climb with more engagement", () => {
    const shortHistory = [msg("user", "game")];
    const longHistory = [
      msg("user", "I want to build a space exploration game where players collect and trade planets. It is for kids 10-12 years old who love Minecraft. The goal is to gather rare planets before opponents."),
      msg("advisor", "Good start."),
      msg("user", "The player wins by having the highest-value planet collection after 10 rounds. Each planet has rarity and resource values. Trading is optional but strategic."),
      msg("advisor", "Okay."),
      msg("user", "The core mechanic is turn-based: pick a sector, mine resources, and upgrade your ship. No PvP — it is cooperative or solo. The map is procedurally generated each game."),
    ];
    const shortScore = demoAssessment(shortHistory, null, 80).overall;
    const longScore = demoAssessment(longHistory, null, 80).overall;
    expect(longScore).toBeGreaterThan(shortScore);
  });

  it("detects game project type", () => {
    const result = demoAssessment([msg("user", "build a puzzle game for mobile")], null, 80);
    expect(result.projectType).toBe("Game");
    expect(result.dynamicCriteria.some((c) => c.key === "core_mechanic")).toBe(true);
  });

  it("detects AI assistant project type", () => {
    const result = demoAssessment([msg("user", "build a chatbot assistant for school")], null, 80);
    expect(result.projectType).toBe("AI assistant");
  });

  it("detects data tool project type", () => {
    const result = demoAssessment([msg("user", "build a dashboard to track budget data")], null, 80);
    expect(result.projectType).toBe("Data tool");
  });

  it("defaults to Web app type for unrecognized projects", () => {
    const result = demoAssessment([msg("user", "build a community platform for neighbors")], null, 80);
    expect(result.projectType).toBe("Web app");
  });

  it("reuses prior criteria when provided", () => {
    const prior = [
      { key: "core_mechanic", label: "Core mechanic", bestPractice: "core_mechanic" },
      { key: "success_criteria", label: "Win/lose state", bestPractice: "success_criteria" },
    ];
    const result = demoAssessment(baseHistory, prior, 80);
    expect(result.dynamicCriteria.map((c) => c.key)).toEqual(["core_mechanic", "success_criteria"]);
  });

  it("all dimension scores are in [0, 100]", () => {
    const result = demoAssessment(baseHistory, null, 80);
    for (const d of [result.clarity, result.conciseness, ...result.dynamicCriteria]) {
      expect(d.score).toBeGreaterThanOrEqual(0);
      expect(d.score).toBeLessThanOrEqual(100);
    }
  });

  it("can cross the export threshold with enough engagement", () => {
    const rich: ChatMessage[] = [];
    for (let i = 0; i < 12; i++) {
      rich.push(msg("user", `Turn ${i}: I want to build a planet-collecting game for 10-12 year olds who love Minecraft. Players explore sectors, mine resources, and trade with opponents. The win condition is highest planet value after 10 rounds. Each planet has rarity, resource type, and strategic value. The UI is a grid map with animated tokens. Cooperative and solo modes are supported.`));
    }
    const result = demoAssessment(rich, null, 80);
    expect(result.ready).toBe(true);
  });
});

describe("demoLesson", () => {
  it("returns a valid Lesson shape", () => {
    const lesson = demoLesson([msg("user", "I built a tracker")]);
    expect(typeof lesson.title).toBe("string");
    expect(typeof lesson.lesson).toBe("string");
    expect(typeof lesson.why).toBe("string");
    expect(lesson.title.length).toBeGreaterThan(0);
  });

  it("adjusts the 'why' based on number of turns", () => {
    const shortHistory = [msg("user", "hi")];
    const longHistory = Array.from({ length: 6 }, (_, i) => msg("user", `turn ${i}`));
    const short = demoLesson(shortHistory).why;
    const long = demoLesson(longHistory).why;
    // The long path explicitly mentions "started vague and got sharper every turn"
    expect(long).toMatch(/vague|sharper|every turn/i);
    // Short history uses a different branch
    expect(short).not.toMatch(/every turn/i);
  });
});

describe("demoCoach", () => {
  it("returns an initial build coaching note for step 1", () => {
    const note = demoCoach(1, "add a button");
    expect(typeof note.whatChanged).toBe("string");
    expect(typeof note.concept).toBe("string");
    expect(typeof note.proTip).toBe("string");
  });

  it("returns an iteration note for step > 1", () => {
    const note = demoCoach(2, "change the color to blue");
    expect(note.whatChanged).toContain("change the color to blue");
  });
});

describe("demoEdits", () => {
  it("returns a summary and at least one edit", () => {
    const result = demoEdits("make the button red");
    expect(typeof result.summary).toBe("string");
    expect(Array.isArray(result.edits)).toBe(true);
    expect(result.edits.length).toBeGreaterThan(0);
  });

  it("each edit has find and replace strings", () => {
    const result = demoEdits("change font size");
    for (const edit of result.edits) {
      expect(typeof edit.find).toBe("string");
      expect(typeof edit.replace).toBe("string");
    }
  });

  it("the replacement HTML mentions the change request", () => {
    const result = demoEdits("add dark mode");
    const allReplace = result.edits.map((e) => e.replace).join(" ");
    expect(allReplace).toContain("add dark mode");
  });
});

describe("demoBuildHtml", () => {
  it("returns a non-empty HTML string", () => {
    const html = demoBuildHtml("Task tracker", "Track your tasks and goals.", undefined);
    expect(typeof html).toBe("string");
    expect(html).toContain("<!DOCTYPE html>");
    expect(html).toContain("<title>");
  });

  it("includes the project title in the output", () => {
    const html = demoBuildHtml("Planet Explorer", "Explore planets.", undefined);
    expect(html).toContain("Planet Explorer");
  });

  it("shows a change-request banner when one is provided", () => {
    const html = demoBuildHtml("Task tracker", "Track tasks", "add dark mode");
    expect(html).toContain("add dark mode");
  });

  it("shows a demo banner when no change request", () => {
    const html = demoBuildHtml("Task tracker", "Track tasks", undefined);
    expect(html).toContain("Demo build");
  });

  it("is a functional interactive app with JavaScript", () => {
    const html = demoBuildHtml("Tracker", "Track things", undefined);
    expect(html).toContain("<script>");
    expect(html).toContain("localStorage");
  });
});

describe("demoExtendPart", () => {
  it("returns a valid build part shape", () => {
    const part = demoExtendPart("add a search bar");
    expect(typeof part.title).toBe("string");
    expect(typeof part.whatItIs).toBe("string");
    expect(typeof part.why).toBe("string");
    expect(typeof part.concept).toBe("string");
    expect(typeof part.buildSpec).toBe("string");
  });

  it("embeds the request in the build spec", () => {
    const part = demoExtendPart("add dark mode toggle");
    expect(part.buildSpec).toContain("add dark mode toggle");
  });
});
