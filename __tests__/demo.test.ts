import { describe, it, expect } from "vitest";
import {
  demoAdvisorReply,
  demoLesson,
  demoPlan,
  demoCoach,
  demoEdits,
  demoExtendPart,
  demoBoardChat,
  demoCodeAsk,
} from "@/lib/demo";
import type { ChatMessage } from "@/lib/types";

function msg(role: "user" | "advisor", content: string): ChatMessage {
  return { id: `${role}-1`, role, content };
}

describe("demoAdvisorReply", () => {
  it("returns the closing sign-off when closing=true", () => {
    const history = [msg("user", "build an app")];
    const reply = demoAdvisorReply(history, true);
    expect(reply).toBeTruthy();
    expect(typeof reply).toBe("string");
    // Closing replies shouldn't ask a question at the end
    expect(reply.endsWith("?")).toBe(false);
  });

  it("returns a pushback for a normal turn", () => {
    const history = [msg("user", "I want to build a tracker app for students")];
    const reply = demoAdvisorReply(history, false);
    expect(reply).toBeTruthy();
    expect(typeof reply).toBe("string");
  });

  it("reacts to an image attachment", () => {
    const history: ChatMessage[] = [
      {
        id: "u-1",
        role: "user",
        content: "here is my sketch",
        images: [{ mediaType: "image/png", data: "base64data" }],
      },
    ];
    const reply = demoAdvisorReply(history, false);
    expect(reply).toBeTruthy();
  });
});

describe("demoLesson", () => {
  it("returns a lesson with title, lesson, and why", () => {
    const history = [msg("user", "I want to build a game")];
    const lesson = demoLesson(history);
    expect(typeof lesson.title).toBe("string");
    expect(lesson.title.length).toBeGreaterThan(0);
    expect(typeof lesson.lesson).toBe("string");
    expect(typeof lesson.why).toBe("string");
  });
});

describe("demoPlan", () => {
  it("returns a plan with projectName, bigPicture, and 3 parts", () => {
    const plan = demoPlan("Game", "Build a game", "Alex", "Minecraft");
    expect(plan.projectName).toBeTruthy();
    expect(plan.bigPicture).toBeTruthy();
    expect(plan.parts).toHaveLength(3);
    for (const p of plan.parts) {
      expect(p.title).toBeTruthy();
      expect(p.whatItIs).toBeTruthy();
      expect(p.buildSpec).toBeTruthy();
    }
  });

  it("works with empty name and game", () => {
    const plan = demoPlan("Web app", "Build an app", "", "");
    expect(plan.projectName).toBeTruthy();
    expect(plan.parts.length).toBeGreaterThan(0);
  });
});

describe("demoCoach", () => {
  it("returns a coach note for step 1", () => {
    const note = demoCoach(1, "");
    expect(note.whatChanged).toBeTruthy();
    expect(note.concept).toBeTruthy();
    expect(note.proTip).toBeTruthy();
  });

  it("returns a coach note for later steps", () => {
    const note = demoCoach(2, "add dark mode");
    expect(note.whatChanged).toContain("dark mode");
  });
});

describe("demoEdits", () => {
  it("returns a summary and at least one edit", () => {
    const result = demoEdits("add a search bar");
    expect(result.summary).toBeTruthy();
    expect(result.edits.length).toBeGreaterThan(0);
    for (const e of result.edits) {
      expect(typeof e.find).toBe("string");
      expect(typeof e.replace).toBe("string");
    }
  });

  it("escapes HTML in the change request", () => {
    const result = demoEdits("<script>alert(1)</script>");
    // The find string is </body> which is a safe anchor, not user input
    expect(result.edits[0].find).toBe("</body>");
    // The replace should have the XSS attempt escaped
    expect(result.edits[0].replace).not.toContain("<script>");
  });
});

describe("demoExtendPart", () => {
  it("returns a part with all required fields", () => {
    const part = demoExtendPart("add a leaderboard");
    expect(part.title).toBeTruthy();
    expect(part.whatItIs).toBeTruthy();
    expect(part.why).toBeTruthy();
    expect(part.concept).toBeTruthy();
    expect(part.buildSpec).toBeTruthy();
    expect(part.buildSpec).toContain("leaderboard");
  });
});

describe("demoBoardChat", () => {
  it("returns a reply and optional board item for a question", () => {
    const result = demoBoardChat("what does this do?");
    expect(typeof result.reply).toBe("string");
    // boardItem can be null or a BoardItem
  });

  it("returns a reply for a statement", () => {
    const result = demoBoardChat("that makes sense");
    expect(typeof result.reply).toBe("string");
  });
});

describe("demoCodeAsk", () => {
  it("returns a reply and optional highlight hint for a question", () => {
    const result = demoCodeAsk("what does getElementById do?", "const list = document.getElementById('list');");
    expect(typeof result.reply).toBe("string");
  });

  it("handles empty beat code", () => {
    const result = demoCodeAsk("explain this", "");
    expect(typeof result.reply).toBe("string");
  });
});
