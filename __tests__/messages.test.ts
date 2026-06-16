import { describe, it, expect } from "vitest";
import { toAnthropicMessages, criteriaReuseMessage } from "../lib/messages";
import type { ChatMessage, CriterionSpec } from "../lib/types";

function userMsg(content: string, id = "u1"): ChatMessage {
  return { id, role: "user", content };
}

function advisorMsg(content: string, id = "a1"): ChatMessage {
  return { id, role: "advisor", content };
}

// ─── toAnthropicMessages ──────────────────────────────────────────────────────

describe("toAnthropicMessages", () => {
  it("maps 'advisor' role to 'assistant'", () => {
    const result = toAnthropicMessages([advisorMsg("Hello!")]);
    expect(result[0].role).toBe("assistant");
  });

  it("maps 'user' role to 'user'", () => {
    const result = toAnthropicMessages([userMsg("Hi there")]);
    expect(result[0].role).toBe("user");
  });

  it("produces a text block for a plain user message", () => {
    const result = toAnthropicMessages([userMsg("My idea is a game")]);
    const content = result[0].content as Array<{ type: string; text?: string }>;
    expect(content).toHaveLength(1);
    expect(content[0].type).toBe("text");
    expect(content[0].text).toBe("My idea is a game");
  });

  it("prepends image blocks before the text block for user messages with images", () => {
    const msg: ChatMessage = {
      id: "u1",
      role: "user",
      content: "Here is a sketch",
      images: [{ mediaType: "image/png", data: "abc123" }],
    };
    const result = toAnthropicMessages([msg]);
    const content = result[0].content as Array<{ type: string }>;
    expect(content[0].type).toBe("image");
    expect(content[1].type).toBe("text");
  });

  it("does not attach images to advisor/assistant messages", () => {
    const msg: ChatMessage = {
      id: "a1",
      role: "advisor",
      content: "Great idea!",
      images: [{ mediaType: "image/png", data: "abc" }],
    };
    const result = toAnthropicMessages([msg]);
    const content = result[0].content as Array<{ type: string }>;
    // Only text block — images are ignored for advisor turns
    expect(content.every((b) => b.type === "text")).toBe(true);
  });

  it("inserts a fallback text block when content is empty", () => {
    const msg: ChatMessage = { id: "u1", role: "user", content: "" };
    const result = toAnthropicMessages([msg]);
    const content = result[0].content as Array<{ type: string; text?: string }>;
    const textBlock = content.find((b) => b.type === "text");
    expect(textBlock?.text).toBe("(no content)");
  });

  it("trims whitespace-only content before inserting fallback", () => {
    const msg: ChatMessage = { id: "u1", role: "user", content: "   " };
    const result = toAnthropicMessages([msg]);
    const content = result[0].content as Array<{ type: string; text?: string }>;
    const textBlock = content.find((b) => b.type === "text");
    expect(textBlock?.text).toBe("(no content)");
  });

  it("converts a full conversation in order", () => {
    const history: ChatMessage[] = [
      userMsg("My idea", "u1"),
      advisorMsg("Tell me more", "a1"),
      userMsg("It is a game", "u2"),
    ];
    const result = toAnthropicMessages(history);
    expect(result.map((m) => m.role)).toEqual(["user", "assistant", "user"]);
  });
});

// ─── criteriaReuseMessage ─────────────────────────────────────────────────────

describe("criteriaReuseMessage", () => {
  const prior: CriterionSpec[] = [
    { key: "impact", label: "Impact", bestPractice: "..." },
    { key: "feasibility", label: "Feasibility", bestPractice: "..." },
  ];

  it("returns a user-role message", () => {
    const result = criteriaReuseMessage(prior);
    expect(result.role).toBe("user");
  });

  it("includes the serialized prior criteria in the message text", () => {
    const result = criteriaReuseMessage(prior);
    const content = result.content as Array<{ type: string; text?: string }>;
    const text = content[0].text ?? "";
    expect(text).toContain("impact");
    expect(text).toContain("feasibility");
    expect(text).toContain("PREVIOUSLY CHOSEN DYNAMIC DIMENSIONS");
  });
});
