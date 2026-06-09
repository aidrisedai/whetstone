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
} from "@/lib/demo";
import type { ChatMessage } from "@/lib/types";

function userMsg(content: string): ChatMessage {
  return { id: "u1", role: "user", content };
}
function advisorMsg(content: string): ChatMessage {
  return { id: "a1", role: "advisor", content };
}

const singleTurn: ChatMessage[] = [userMsg("I want to build a todo app")];
const multiTurn: ChatMessage[] = [
  userMsg("I want to build a fitness tracker"),
  advisorMsg("Who exactly is this for?"),
  userMsg("For busy parents who want to log 5-minute workouts"),
  advisorMsg("Good. What does success look like in week one?"),
  userMsg("They've logged at least 3 workouts and feel less guilty"),
];

describe("demoAdvisorReply", () => {
  it("returns a non-empty string", () => {
    const reply = demoAdvisorReply(singleTurn, false);
    expect(typeof reply).toBe("string");
    expect(reply.length).toBeGreaterThan(10);
  });

  it("returns a closing message when closing=true", () => {
    const reply = demoAdvisorReply(multiTurn, true);
    expect(reply).toContain("sharp");
  });

  it("advances through different pushbacks across turns", () => {
    const r1 = demoAdvisorReply([userMsg("app for students")], false);
    const r2 = demoAdvisorReply(
      [userMsg("app for students"), advisorMsg("..."), userMsg("ok narrowed it down")],
      false,
    );
    expect(r1).not.toBe(r2);
  });
});

describe("demoAssessment", () => {
  it("returns a valid assessment structure", () => {
    const a = demoAssessment(singleTurn, null, 80);
    expect(typeof a.overall).toBe("number");
    expect(typeof a.ready).toBe("boolean");
    expect(a.threshold).toBe(80);
    expect(Array.isArray(a.dynamicCriteria)).toBe(true);
    expect(typeof a.clarity.score).toBe("number");
  });

  it("score increases with more substantive turns", () => {
    const early = demoAssessment([userMsg("app")], null, 80);
    const later = demoAssessment(multiTurn, null, 80);
    expect(later.overall).toBeGreaterThan(early.overall);
  });

  it("overall is always 0–100", () => {
    for (let i = 1; i <= 20; i++) {
      const history = Array.from({ length: i }, (_, j) =>
        userMsg("some detailed idea that is getting more specific over time ".repeat(j + 1)),
      );
      const a = demoAssessment(history, null, 80);
      expect(a.overall).toBeGreaterThanOrEqual(0);
      expect(a.overall).toBeLessThanOrEqual(100);
    }
  });

  it("reuses prior criteria when provided", () => {
    const prior = [{ key: "core_mechanic", label: "Core mechanic", bestPractice: "core_mechanic" }];
    const a = demoAssessment(multiTurn, prior, 80);
    expect(a.dynamicCriteria[0].key).toBe("core_mechanic");
  });

  it("detects game projects and picks game criteria", () => {
    const gameHistory = [userMsg("I want to build a puzzle game with levels and a score")];
    const a = demoAssessment(gameHistory, null, 80);
    expect(a.projectType).toBe("Game");
  });
});

describe("demoLesson", () => {
  it("returns a lesson with title, lesson, and why", () => {
    const lesson = demoLesson(multiTurn);
    expect(typeof lesson.title).toBe("string");
    expect(typeof lesson.lesson).toBe("string");
    expect(typeof lesson.why).toBe("string");
    expect(lesson.title.length).toBeGreaterThan(0);
  });
});

describe("demoBuildHtml", () => {
  it("returns valid HTML with a doctype", () => {
    const html = demoBuildHtml("Web app", "Build a todo list");
    expect(html).toMatch(/^<!DOCTYPE html>/i);
    expect(html).toContain("</html>");
  });

  it("escapes the project type in the output", () => {
    const html = demoBuildHtml("<script>alert(1)</script>", "prompt");
    expect(html).not.toContain("<script>alert(1)</script>");
  });

  it("includes the change request note when provided", () => {
    const html = demoBuildHtml("App", "prompt", "add dark mode");
    expect(html).toContain("add dark mode");
  });
});

describe("demoCoach", () => {
  it("returns a coach note for step 1", () => {
    const note = demoCoach(1, "Initial build");
    expect(typeof note.whatChanged).toBe("string");
    expect(typeof note.concept).toBe("string");
    expect(typeof note.proTip).toBe("string");
  });

  it("returns a different note for later steps", () => {
    const n1 = demoCoach(1, "");
    const n2 = demoCoach(2, "add dark mode");
    expect(n1.whatChanged).not.toBe(n2.whatChanged);
  });
});

describe("demoEdits", () => {
  it("returns a summary and edits array", () => {
    const result = demoEdits("change the colour");
    expect(typeof result.summary).toBe("string");
    expect(Array.isArray(result.edits)).toBe(true);
    expect(result.edits.length).toBeGreaterThan(0);
    expect(typeof result.edits[0].find).toBe("string");
    expect(typeof result.edits[0].replace).toBe("string");
  });

  it("escapes the changeRequest to prevent injection in the banner", () => {
    const result = demoEdits('<img src=x onerror="alert(1)">');
    expect(result.edits[0].replace).not.toContain("<img src=x onerror");
  });
});

describe("demoPlan", () => {
  it("returns a plan with projectName, bigPicture, and 3 parts", () => {
    const plan = demoPlan("Web app", "Build a tracker", "Alex", "Minecraft");
    expect(typeof plan.projectName).toBe("string");
    expect(typeof plan.bigPicture).toBe("string");
    expect(Array.isArray(plan.parts)).toBe(true);
    expect(plan.parts.length).toBe(3);
  });

  it("includes the builder's name in bigPicture when given", () => {
    const plan = demoPlan("App", "prompt", "Jordan", "");
    expect(plan.bigPicture).toContain("Jordan");
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

  it("includes the request in the buildSpec", () => {
    const part = demoExtendPart("add dark mode toggle");
    expect(part.buildSpec).toContain("add dark mode toggle");
  });
});
