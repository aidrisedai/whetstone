import { describe, it, expect } from "vitest";
import { toAnthropicMessages, criteriaReuseMessage } from "../messages";
import type { ChatMessage, CriterionSpec } from "../types";

const userMsg = (content: string, id = "u1"): ChatMessage => ({ id, role: "user", content });
const advisorMsg = (content: string, id = "a1"): ChatMessage => ({ id, role: "advisor", content });

describe("toAnthropicMessages", () => {
  it("maps user role to 'user' and advisor role to 'assistant'", () => {
    const result = toAnthropicMessages([userMsg("hi"), advisorMsg("hello")]);
    expect(result[0].role).toBe("user");
    expect(result[1].role).toBe("assistant");
  });

  it("creates a text block for message content", () => {
    const result = toAnthropicMessages([userMsg("what should I build?")]);
    const content = result[0].content as { type: string; text: string }[];
    expect(content.some((b) => b.type === "text" && b.text === "what should I build?")).toBe(true);
  });

  it("includes image blocks before text for user messages with attachments", () => {
    const msg: ChatMessage = {
      id: "u1",
      role: "user",
      content: "here's my sketch",
      images: [{ mediaType: "image/png", data: "abc123" }],
    };
    const result = toAnthropicMessages([msg]);
    const content = result[0].content as { type: string }[];
    expect(content[0].type).toBe("image");
    expect(content[1].type).toBe("text");
  });

  it("does NOT include image blocks for advisor messages", () => {
    const msg: ChatMessage = {
      id: "a1",
      role: "advisor",
      content: "looks good",
      images: [{ mediaType: "image/png", data: "abc123" }],
    };
    const result = toAnthropicMessages([msg]);
    const content = result[0].content as { type: string }[];
    expect(content.every((b) => b.type !== "image")).toBe(true);
  });

  it("returns a placeholder for messages with no content", () => {
    const msg: ChatMessage = { id: "u1", role: "user", content: "" };
    const result = toAnthropicMessages([msg]);
    const content = result[0].content as { type: string; text: string }[];
    expect(content[0].text).toBe("(no content)");
  });

  it("trims whitespace from message content", () => {
    const result = toAnthropicMessages([userMsg("  hello  ")]);
    const content = result[0].content as { type: string; text: string }[];
    expect(content[0].text).toBe("hello");
  });
});

describe("criteriaReuseMessage", () => {
  const specs: CriterionSpec[] = [
    { key: "audience", label: "Audience", bestPractice: "define_audience" },
  ];

  it("returns a user-role message", () => {
    const msg = criteriaReuseMessage(specs);
    expect(msg.role).toBe("user");
  });

  it("includes the JSON representation of the prior specs", () => {
    const msg = criteriaReuseMessage(specs);
    const content = msg.content as { type: string; text: string }[];
    expect(content[0].text).toContain('"audience"');
    expect(content[0].text).toContain("define_audience");
  });

  it("mentions the instruction to reuse keys verbatim", () => {
    const msg = criteriaReuseMessage(specs);
    const content = msg.content as { type: string; text: string }[];
    expect(content[0].text.toLowerCase()).toContain("reuse");
  });
});
