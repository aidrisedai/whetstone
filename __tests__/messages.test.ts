import { describe, it, expect } from "vitest";
import { toAnthropicMessages, criteriaReuseMessage } from "../lib/messages";
import type { ChatMessage, CriterionSpec } from "../lib/types";

function msg(role: "user" | "advisor", content: string): ChatMessage {
  return { id: "1", role, content };
}

describe("toAnthropicMessages", () => {
  it("maps advisor role to assistant", () => {
    const result = toAnthropicMessages([msg("advisor", "Hello")]);
    expect(result[0].role).toBe("assistant");
  });

  it("maps user role to user", () => {
    const result = toAnthropicMessages([msg("user", "Hi there")]);
    expect(result[0].role).toBe("user");
  });

  it("produces a text block for a plain message", () => {
    const result = toAnthropicMessages([msg("user", "test content")]);
    const content = result[0].content as { type: string; text: string }[];
    expect(content).toContainEqual({ type: "text", text: "test content" });
  });

  it("inserts image blocks before the text block", () => {
    const m: ChatMessage = {
      id: "1",
      role: "user",
      content: "here is my sketch",
      images: [{ mediaType: "image/png", data: "abc123" }],
    };
    const result = toAnthropicMessages([m]);
    const content = result[0].content as { type: string }[];
    expect(content[0].type).toBe("image");
    expect(content[1].type).toBe("text");
  });

  it("emits (no content) placeholder for empty message content", () => {
    const m: ChatMessage = { id: "1", role: "user", content: "" };
    const result = toAnthropicMessages([m]);
    const content = result[0].content as { type: string; text: string }[];
    expect(content[0]).toEqual({ type: "text", text: "(no content)" });
  });

  it("handles a multi-turn conversation", () => {
    const history = [
      msg("user", "first"),
      msg("advisor", "response"),
      msg("user", "follow-up"),
    ];
    const result = toAnthropicMessages(history);
    expect(result.length).toBe(3);
    expect(result[1].role).toBe("assistant");
  });
});

describe("criteriaReuseMessage", () => {
  const specs: CriterionSpec[] = [
    { key: "define_audience", label: "Audience", bestPractice: "define_audience" },
  ];

  it("returns a user role message", () => {
    const result = criteriaReuseMessage(specs);
    expect(result.role).toBe("user");
  });

  it("includes each criterion key in the message body", () => {
    const result = criteriaReuseMessage(specs);
    const content = result.content as { type: string; text: string }[];
    expect(content[0].text).toContain("define_audience");
  });

  it("includes the lock instruction", () => {
    const result = criteriaReuseMessage(specs);
    const text = (result.content as { type: string; text: string }[])[0].text;
    expect(text).toMatch(/reuse these exact keys/i);
  });
});
