import { describe, it, expect } from "vitest";
import {
  demoAdvisorReply,
  demoAssessment,
  demoLesson,
  demoBuildHtml,
  demoCoach,
  demoEdits,
  demoPlan,
} from "../demo";
import type { ChatMessage } from "../types";

function userMsg(content: string): ChatMessage {
  return { id: "u1", role: "user", content };
}
function advisorMsg(content: string): ChatMessage {
  return { id: "a1", role: "advisor", content };
}

const SHORT_HISTORY: ChatMessage[] = [userMsg("I want to build a quiz app for high school students")];
const LONG_HISTORY: ChatMessage[] = [
  userMsg("Build a game where players compete to answer coding trivia"),
  advisorMsg("Who exactly is playing?"),
  userMsg("Kids aged 12-15 who are learning to code, in a classroom setting"),
  advisorMsg("What makes them keep coming back?"),
  userMsg("A leaderboard, badges, and a streak mechanic"),
  advisorMsg("Good — what's the ONE thing they do in the first 30 seconds?"),
  userMsg("They pick a topic and answer their first question right away"),
];

describe("demoAdvisorReply", () => {
  it("returns a non-empty string", () => {
    expect(demoAdvisorReply(SHORT_HISTORY, false)).toBeTruthy();
  });
  it("returns closing message when phase is closing", () => {
    const reply = demoAdvisorReply(SHORT_HISTORY, true);
    expect(reply.length).toBeGreaterThan(10);
    expect(reply).not.toContain("⚠️");
  });
  it("reacts to images in history", () => {
    const history: ChatMessage[] = [
      { id: "u1", role: "user", content: "here is my sketch", images: [{ mediaType: "image/png", data: "abc" }] },
    ];
    const reply = demoAdvisorReply(history, false);
    expect(reply.length).toBeGreaterThan(5);
  });
  it("advances pushback with each turn", () => {
    const r1 = demoAdvisorReply(SHORT_HISTORY, false);
    const r2 = demoAdvisorReply(LONG_HISTORY, false);
    expect(r1).not.toBe(r2);
  });
});

describe("demoAssessment", () => {
  it("returns a valid Assessment shape", () => {
    const a = demoAssessment(SHORT_HISTORY, null, 80);
    expect(typeof a.overall).toBe("number");
    expect(a.overall).toBeGreaterThanOrEqual(0);
    expect(a.overall).toBeLessThanOrEqual(100);
    expect(a.clarity.score).toBeGreaterThanOrEqual(0);
    expect(a.refinedPrompt).toBeTruthy();
    expect(typeof a.ready).toBe("boolean");
    expect(a.threshold).toBe(80);
  });

  it("score rises with more substantive turns", () => {
    const a1 = demoAssessment(SHORT_HISTORY, null, 80);
    const a2 = demoAssessment(LONG_HISTORY, null, 80);
    expect(a2.overall).toBeGreaterThan(a1.overall);
  });

  it("reuses priorCriteria keys when provided", () => {
    const prior = [{ key: "core_mechanic", label: "Core mechanic", bestPractice: "core_mechanic" }];
    const a = demoAssessment(SHORT_HISTORY, prior, 80);
    expect(a.dynamicCriteria[0].key).toBe("core_mechanic");
  });

  it("detects game projects and assigns game criteria", () => {
    const history = [userMsg("a multiplayer arcade game where players dodge enemies for a high score")];
    const a = demoAssessment(history, null, 80);
    expect(a.projectType).toBe("Game");
  });
});

describe("demoLesson", () => {
  it("returns title, lesson, why fields", () => {
    const l = demoLesson(SHORT_HISTORY);
    expect(l.title).toBeTruthy();
    expect(l.lesson).toBeTruthy();
    expect(l.why).toBeTruthy();
  });
});

describe("demoBuildHtml", () => {
  it("returns a valid HTML document", () => {
    const html = demoBuildHtml("Quiz App", "Build a quiz for students");
    expect(html).toContain("<!DOCTYPE html>");
    expect(html).toContain("</html>");
    expect(html).toContain("Quiz App");
  });
  it("includes a change note when changeRequest is provided", () => {
    const html = demoBuildHtml("App", "prompt", "add dark mode");
    expect(html).toContain("add dark mode");
  });
  it("sanitizes XSS in projectType and refinedPrompt", () => {
    const html = demoBuildHtml("<script>alert(1)</script>", "<img onerror='x'>");
    // Raw tags are escaped — no executable script or event handler
    expect(html).not.toContain("<script>alert(1)</script>");
    // The < and > brackets around the img tag must be escaped
    expect(html).not.toContain("<img onerror");
    // The encoded form is present, meaning the text is rendered safely
    expect(html).toContain("&lt;script&gt;");
    expect(html).toContain("&lt;img");
  });
});

describe("demoCoach", () => {
  it("returns first-build feedback for step 1", () => {
    const note = demoCoach(1, "");
    expect(note.whatChanged).toBeTruthy();
    expect(note.concept).toBeTruthy();
    expect(note.proTip).toBeTruthy();
  });
  it("returns change-specific feedback for later steps", () => {
    const note = demoCoach(2, "add dark mode");
    expect(note.whatChanged).toContain("add dark mode");
  });
});

describe("demoEdits", () => {
  it("returns a summary and at least one edit", () => {
    const result = demoEdits("add dark mode");
    expect(result.summary).toBeTruthy();
    expect(result.edits.length).toBeGreaterThan(0);
    expect(result.edits[0].find).toBeTruthy();
    expect(typeof result.edits[0].replace).toBe("string");
  });
  it("applies its own edit to a minimal HTML document", () => {
    const html = "<html><body>hello</body></html>";
    const { edits } = demoEdits("test");
    const hasMatchingEdit = edits.some((e) => html.includes(e.find));
    expect(hasMatchingEdit).toBe(true);
  });
});

describe("demoPlan", () => {
  it("returns projectName, bigPicture, and 3 parts", () => {
    const plan = demoPlan("Quiz App", "Build a quiz", "Alex", "Minecraft");
    expect(plan.projectName).toBeTruthy();
    expect(plan.bigPicture).toBeTruthy();
    expect(plan.parts).toHaveLength(3);
  });
  it("includes the builder's name in bigPicture when provided", () => {
    const plan = demoPlan("App", "prompt", "Alex", "");
    expect(plan.bigPicture).toContain("Alex");
  });
  it("includes a game analogy when favoriteGame is provided", () => {
    const plan = demoPlan("App", "prompt", "", "Minecraft");
    expect(plan.bigPicture).toContain("Minecraft");
  });
  it("each part has the required fields", () => {
    const plan = demoPlan("App", "prompt", "", "");
    for (const part of plan.parts) {
      expect(part.title).toBeTruthy();
      expect(part.whatItIs).toBeTruthy();
      expect(part.why).toBeTruthy();
      expect(part.concept).toBeTruthy();
      expect(part.buildSpec).toBeTruthy();
    }
  });
});
