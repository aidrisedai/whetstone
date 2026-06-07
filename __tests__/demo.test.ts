import { describe, it, expect } from "vitest";
import {
  demoAdvisorReply,
  demoAssessment,
  demoLesson,
  demoBuildHtml,
  demoEdits,
  demoPlan,
  demoQuiz,
  demoCodeAsk,
  demoBoardChat,
} from "@/lib/demo";
import type { ChatMessage } from "@/lib/types";

function userMsg(content: string, id = "u1"): ChatMessage {
  return { id, role: "user", content };
}
function advisorMsg(content: string, id = "a1"): ChatMessage {
  return { id, role: "advisor", content };
}

describe("demoAdvisorReply", () => {
  it("returns a closing reply when closing=true", () => {
    const reply = demoAdvisorReply([userMsg("test")], true);
    expect(typeof reply).toBe("string");
    expect(reply.length).toBeGreaterThan(0);
  });
  it("returns a pushback for a normal turn", () => {
    const history = [userMsg("I want to build a tracking app")];
    const reply = demoAdvisorReply(history, false);
    expect(typeof reply).toBe("string");
    expect(reply.length).toBeGreaterThan(0);
  });
  it("returns the image pushback on first turn with an image", () => {
    const history: ChatMessage[] = [
      {
        id: "u1",
        role: "user",
        content: "here is my sketch",
        images: [{ mediaType: "image/png", data: "abc123" }],
      },
    ];
    const reply = demoAdvisorReply(history, false);
    expect(reply).toContain("sketch");
  });
});

describe("demoAssessment", () => {
  it("returns a valid Assessment shape", () => {
    const history = [
      userMsg("I want to build a game"),
      advisorMsg("Tell me more"),
      userMsg("It's a puzzle game for kids"),
    ];
    const assessment = demoAssessment(history, null, 80);
    expect(typeof assessment.overall).toBe("number");
    expect(assessment.overall).toBeGreaterThanOrEqual(0);
    expect(assessment.overall).toBeLessThanOrEqual(100);
    expect(typeof assessment.ready).toBe("boolean");
    expect(assessment.threshold).toBe(80);
    expect(Array.isArray(assessment.dynamicCriteria)).toBe(true);
    expect(assessment.dynamicCriteria.length).toBeGreaterThan(0);
  });

  it("score rises as more turns are added", () => {
    const few = demoAssessment([userMsg("app idea")], null, 80);
    const many: ChatMessage[] = Array.from({ length: 8 }, (_, i) =>
      userMsg(`turn ${i}: detailed explanation of my specific idea for users who need X`, `u${i}`),
    );
    const lots = demoAssessment(many, null, 80);
    expect(lots.overall).toBeGreaterThan(few.overall);
  });

  it("re-uses prior criteria when provided", () => {
    const prior = [
      { key: "core_mechanic", label: "Core mechanic", bestPractice: "core_mechanic" },
    ];
    const history = [userMsg("game idea")];
    const a = demoAssessment(history, prior, 80);
    expect(a.dynamicCriteria[0].key).toBe("core_mechanic");
  });
});

describe("demoLesson", () => {
  it("returns a Lesson with title, lesson, and why", () => {
    const lesson = demoLesson([userMsg("idea")]);
    expect(typeof lesson.title).toBe("string");
    expect(typeof lesson.lesson).toBe("string");
    expect(typeof lesson.why).toBe("string");
    expect(lesson.title.length).toBeGreaterThan(0);
  });
  it("adjusts 'why' based on number of turns", () => {
    const shortHistory = [userMsg("idea")];
    const longHistory: ChatMessage[] = Array.from({ length: 6 }, (_, i) =>
      userMsg(`turn ${i}`, `u${i}`),
    );
    const short = demoLesson(shortHistory);
    const long = demoLesson(longHistory);
    expect(short.why).not.toBe(long.why);
  });
});

describe("demoBuildHtml", () => {
  it("returns a valid HTML string", () => {
    const html = demoBuildHtml("Tracker", "Build a tracker app");
    expect(html).toContain("<!DOCTYPE html>");
    expect(html).toContain("Tracker");
  });
  it("escapes HTML in projectType", () => {
    const html = demoBuildHtml("<script>alert(1)</script>", "prompt");
    expect(html).not.toContain("<script>alert(1)</script>");
    expect(html).toContain("&lt;script&gt;");
  });
  it("includes change note when changeRequest is provided", () => {
    const html = demoBuildHtml("App", "prompt", "add dark mode");
    expect(html).toContain("add dark mode");
  });
});

describe("demoEdits", () => {
  it("returns an EditResult with at least one edit", () => {
    const result = demoEdits("make it dark");
    expect(Array.isArray(result.edits)).toBe(true);
    expect(result.edits.length).toBeGreaterThan(0);
    expect(typeof result.summary).toBe("string");
  });
  it("edit targets </body>", () => {
    const result = demoEdits("change color");
    expect(result.edits[0].find).toBe("</body>");
  });
});

describe("demoPlan", () => {
  it("returns a plan with 3 parts", () => {
    const plan = demoPlan("Tracker", "Build a tracker", "Alex", "Minecraft");
    expect(plan.parts).toHaveLength(3);
    expect(typeof plan.projectName).toBe("string");
    expect(typeof plan.bigPicture).toBe("string");
  });
  it("personalises bigPicture with the user's name", () => {
    const plan = demoPlan("App", "prompt", "Jordan", "Roblox");
    expect(plan.bigPicture).toContain("Jordan");
  });
  it("handles empty name gracefully", () => {
    const plan = demoPlan("App", "prompt", "", "");
    expect(typeof plan.bigPicture).toBe("string");
  });
});

describe("demoQuiz", () => {
  it("returns a Checkpoint with two questions", () => {
    const q = demoQuiz("🏗️ The Stage", "The screen");
    expect(q.questions).toHaveLength(2);
    expect(typeof q.intro).toBe("string");
    expect(typeof q.partTitle).toBe("string");
  });
  it("all questions have the required fields", () => {
    const q = demoQuiz("Part", "Concept");
    for (const question of q.questions) {
      expect(typeof question.id).toBe("string");
      expect(typeof question.question).toBe("string");
      expect(Array.isArray(question.options)).toBe(true);
      expect(question.options.length).toBeGreaterThanOrEqual(2);
      expect(typeof question.correctIndex).toBe("number");
    }
  });
});

describe("demoBoardChat", () => {
  it("returns a reply for a question", () => {
    const r = demoBoardChat("Why does this work?");
    expect(typeof r.reply).toBe("string");
    expect(r.reply.length).toBeGreaterThan(0);
  });
  it("returns a reply for a non-question", () => {
    const r = demoBoardChat("That's cool");
    expect(typeof r.reply).toBe("string");
    expect(r.boardItem).toBeNull();
  });
});

describe("demoCodeAsk", () => {
  it("returns a reply and possible highlight for a question", () => {
    const r = demoCodeAsk("What does this do?", "const list = document.getElementById('list');");
    expect(typeof r.reply).toBe("string");
  });
  it("returns a reply for a non-question", () => {
    const r = demoCodeAsk("I see", "const x = 1;");
    expect(typeof r.reply).toBe("string");
    expect(r.highlightHint).toBeNull();
  });
});
