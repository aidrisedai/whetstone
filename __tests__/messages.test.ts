import { describe, it, expect } from "vitest";
import { toAnthropicMessages, criteriaReuseMessage } from "../lib/messages";
import type { ChatMessage, CriterionSpec } from "../lib/types";

const userMsg = (content: string, id = "u1"): ChatMessage => ({ id, role: "user", content });
const advisorMsg = (content: string, id = "a1"): ChatMessage => ({ id, role: "advisor", content });

describe("toAnthropicMessages", () => {
  it("maps user role to 'user'", () => {
    const result = toAnthropicMessages([userMsg("hello")]);
    expect(result[0].role).toBe("user");
  });

  it("maps advisor role to 'assistant'", () => {
    const result = toAnthropicMessages([advisorMsg("Hi there")]);
    expect(result[0].role).toBe("assistant");
  });

  it("creates a text block for plain messages", () => {
    const result = toAnthropicMessages([userMsg("test")]);
    const blocks = result[0].content as { type: string; text: string }[];
    expect(blocks).toContainEqual({ type: "text", text: "test" });
  });

  it("inserts a placeholder for empty content", () => {
    const msg: ChatMessage = { id: "e1", role: "user", content: "" };
    const result = toAnthropicMessages([msg]);
    const blocks = result[0].content as { type: string; text: string }[];
    expect(blocks[0].text).toBe("(no content)");
  });

  it("trims whitespace from content", () => {
    const result = toAnthropicMessages([userMsg("  hello  ")]);
    const blocks = result[0].content as { type: string; text: string }[];
    expect(blocks[0].text).toBe("hello");
  });

  it("adds image blocks before the text block for user messages with images", () => {
    const msg: ChatMessage = {
      id: "i1",
      role: "user",
      content: "see this",
      images: [{ mediaType: "image/png", data: "abc123", name: "shot.png" }],
    };
    const result = toAnthropicMessages([msg]);
    const blocks = result[0].content as { type: string }[];
    expect(blocks[0].type).toBe("image");
    expect(blocks[1].type).toBe("text");
  });

  it("does NOT add image blocks for advisor messages", () => {
    const msg: ChatMessage = {
      id: "a2",
      role: "advisor",
      content: "nice",
      images: [{ mediaType: "image/png", data: "abc", name: "x.png" }],
    };
    const result = toAnthropicMessages([msg]);
    const blocks = result[0].content as { type: string }[];
    expect(blocks.every((b) => b.type !== "image")).toBe(true);
  });

  it("converts an entire conversation in order", () => {
    const history: ChatMessage[] = [
      userMsg("Idea 1", "u1"),
      advisorMsg("Pushback", "a1"),
      userMsg("Clarification", "u2"),
    ];
    const result = toAnthropicMessages(history);
    expect(result.map((r) => r.role)).toEqual(["user", "assistant", "user"]);
  });
});

describe("criteriaReuseMessage", () => {
  const prior: CriterionSpec[] = [
    { key: "audience", label: "Audience", bestPractice: "audience" },
    { key: "scope", label: "Scope", bestPractice: "scope" },
  ];

  it("returns a user role message", () => {
    const msg = criteriaReuseMessage(prior);
    expect(msg.role).toBe("user");
  });

  it("embeds the prior criteria as JSON in the message text", () => {
    const msg = criteriaReuseMessage(prior);
    const content = msg.content as { type: string; text: string }[];
    const text = content[0].text;
    expect(text).toContain('"audience"');
    expect(text).toContain('"scope"');
  });

  it("produces valid JSON in the message text", () => {
    const msg = criteriaReuseMessage(prior);
    const content = msg.content as { type: string; text: string }[];
    const text = content[0].text;
    const jsonStart = text.indexOf("[");
    expect(() => JSON.parse(text.slice(jsonStart))).not.toThrow();
  });
});
