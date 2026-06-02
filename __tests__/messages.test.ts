import { describe, it, expect } from "vitest";
import { toAnthropicMessages, criteriaReuseMessage } from "@/lib/messages";
import type { ChatMessage, CriterionSpec } from "@/lib/types";

function userMsg(content: string, id = "u1"): ChatMessage {
  return { id, role: "user", content };
}

function advisorMsg(content: string, id = "a1"): ChatMessage {
  return { id, role: "advisor", content };
}

describe("toAnthropicMessages", () => {
  it("maps user role correctly", () => {
    const result = toAnthropicMessages([userMsg("hello")]);
    expect(result[0].role).toBe("user");
  });

  it("maps advisor role to assistant", () => {
    const result = toAnthropicMessages([advisorMsg("hi there")]);
    expect(result[0].role).toBe("assistant");
  });

  it("produces a text block for plain content", () => {
    const result = toAnthropicMessages([userMsg("hello")]);
    const blocks = result[0].content as Array<{ type: string; text?: string }>;
    expect(blocks).toHaveLength(1);
    expect(blocks[0].type).toBe("text");
    expect(blocks[0].text).toBe("hello");
  });

  it("prepends image blocks before text for user messages with images", () => {
    const msg: ChatMessage = {
      id: "u1",
      role: "user",
      content: "here is my sketch",
      images: [{ mediaType: "image/png", data: "abc123", name: "sketch.png" }],
    };
    const result = toAnthropicMessages([msg]);
    const blocks = result[0].content as Array<{ type: string }>;
    expect(blocks[0].type).toBe("image");
    expect(blocks[1].type).toBe("text");
  });

  it("does not add image blocks to advisor messages", () => {
    const msg: ChatMessage = {
      id: "a1",
      role: "advisor",
      content: "nice sketch",
      images: [{ mediaType: "image/png", data: "abc123" }],
    };
    const result = toAnthropicMessages([msg]);
    const blocks = result[0].content as Array<{ type: string }>;
    expect(blocks.every((b) => b.type !== "image")).toBe(true);
  });

  it("inserts (no content) text block for empty content", () => {
    const msg: ChatMessage = { id: "u1", role: "user", content: "" };
    const result = toAnthropicMessages([msg]);
    const blocks = result[0].content as Array<{ type: string; text?: string }>;
    expect(blocks[0].text).toBe("(no content)");
  });

  it("handles multi-turn history preserving order", () => {
    const history: ChatMessage[] = [
      userMsg("idea A", "u1"),
      advisorMsg("good start", "a1"),
      userMsg("more detail", "u2"),
    ];
    const result = toAnthropicMessages(history);
    expect(result[0].role).toBe("user");
    expect(result[1].role).toBe("assistant");
    expect(result[2].role).toBe("user");
  });
});

describe("criteriaReuseMessage", () => {
  it("returns a user role message", () => {
    const prior: CriterionSpec[] = [{ key: "a", label: "Alpha", bestPractice: "bp" }];
    const msg = criteriaReuseMessage(prior);
    expect(msg.role).toBe("user");
  });

  it("includes the criteria as JSON", () => {
    const prior: CriterionSpec[] = [{ key: "focus", label: "Focus", bestPractice: "bp-focus" }];
    const msg = criteriaReuseMessage(prior);
    const content = msg.content as Array<{ type: string; text: string }>;
    expect(content[0].text).toContain('"focus"');
    expect(content[0].text).toContain('"Focus"');
  });
});
