import { describe, it, expect } from "vitest";
import { toAnthropicMessages, criteriaReuseMessage } from "../messages";
import type { ChatMessage } from "../types";

const userMsg = (content: string): ChatMessage => ({
  id: "u1",
  role: "user",
  content,
});

const advisorMsg = (content: string): ChatMessage => ({
  id: "a1",
  role: "advisor",
  content,
});

describe("toAnthropicMessages", () => {
  it("maps user role to 'user' and advisor role to 'assistant'", () => {
    const result = toAnthropicMessages([userMsg("hi"), advisorMsg("hello")]);
    expect(result[0].role).toBe("user");
    expect(result[1].role).toBe("assistant");
  });

  it("wraps text content in a text block", () => {
    const result = toAnthropicMessages([userMsg("test message")]);
    const content = result[0].content as { type: string; text: string }[];
    expect(content).toContainEqual({ type: "text", text: "test message" });
  });

  it("inserts a placeholder block when content is empty", () => {
    const result = toAnthropicMessages([userMsg("")]);
    const content = result[0].content as { type: string; text: string }[];
    expect(content).toContainEqual({ type: "text", text: "(no content)" });
  });

  it("includes image blocks for user messages with images", () => {
    const msg: ChatMessage = {
      id: "u2",
      role: "user",
      content: "look at this",
      images: [{ mediaType: "image/png", data: "abc123", name: "test.png" }],
    };
    const result = toAnthropicMessages([msg]);
    const content = result[0].content as { type: string }[];
    const imageBlock = content.find((b) => b.type === "image");
    expect(imageBlock).toBeDefined();
  });

  it("does not include image blocks for advisor messages", () => {
    const result = toAnthropicMessages([advisorMsg("reply")]);
    const content = result[0].content as { type: string }[];
    expect(content.some((b) => b.type === "image")).toBe(false);
  });

  it("trims whitespace from content", () => {
    const result = toAnthropicMessages([userMsg("  trimmed  ")]);
    const content = result[0].content as { type: string; text: string }[];
    expect(content[0].text).toBe("trimmed");
  });
});

describe("criteriaReuseMessage", () => {
  const prior = [
    { key: "scope", label: "Scope", bestPractice: "bp1" },
    { key: "impact", label: "Impact", bestPractice: "bp2" },
  ];

  it("returns a user-role message", () => {
    const msg = criteriaReuseMessage(prior);
    expect(msg.role).toBe("user");
  });

  it("includes all criterion keys in the message text", () => {
    const msg = criteriaReuseMessage(prior);
    const content = msg.content as { type: string; text: string }[];
    const text = content[0].text;
    expect(text).toContain("scope");
    expect(text).toContain("impact");
  });

  it("instructs the model to reuse dimensions verbatim", () => {
    const msg = criteriaReuseMessage(prior);
    const content = msg.content as { type: string; text: string }[];
    expect(content[0].text.toLowerCase()).toContain("reuse");
  });
});
