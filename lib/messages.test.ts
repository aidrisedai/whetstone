import { describe, it, expect } from "vitest";
import { toAnthropicMessages, criteriaReuseMessage } from "./messages";
import type { ChatMessage } from "./types";

const msg = (role: "user" | "advisor", content: string): ChatMessage => ({
  id: "test-id",
  role,
  content,
});

describe("toAnthropicMessages", () => {
  it("maps user role to 'user'", () => {
    const [result] = toAnthropicMessages([msg("user", "hello")]);
    expect(result.role).toBe("user");
  });

  it("maps advisor role to 'assistant'", () => {
    const [result] = toAnthropicMessages([msg("advisor", "hi there")]);
    expect(result.role).toBe("assistant");
  });

  it("wraps text content in a text block", () => {
    const [result] = toAnthropicMessages([msg("user", "hello")]);
    expect(result.content).toEqual([{ type: "text", text: "hello" }]);
  });

  it("emits '(no content)' when content is empty", () => {
    const [result] = toAnthropicMessages([msg("user", "")]);
    const blocks = result.content as Array<{ type: string; text: string }>;
    expect(blocks).toEqual([{ type: "text", text: "(no content)" }]);
  });

  it("adds image blocks BEFORE the text block for user messages with images", () => {
    const msgWithImage: ChatMessage = {
      id: "1",
      role: "user",
      content: "check this out",
      images: [{ mediaType: "image/png", data: "abc123" }],
    };
    const [result] = toAnthropicMessages([msgWithImage]);
    const blocks = result.content as Array<{ type: string }>;
    expect(blocks[0].type).toBe("image");
    expect(blocks[1].type).toBe("text");
    expect(blocks).toHaveLength(2);
  });

  it("does not add image blocks for advisor messages even if images present", () => {
    const advisorMsg: ChatMessage = {
      id: "2",
      role: "advisor",
      content: "here you go",
      images: [{ mediaType: "image/png", data: "abc123" }],
    };
    const [result] = toAnthropicMessages([advisorMsg]);
    const blocks = result.content as Array<{ type: string }>;
    expect(blocks.every((b) => b.type === "text")).toBe(true);
  });

  it("preserves message order in the output array", () => {
    const history = [msg("user", "first"), msg("advisor", "second"), msg("user", "third")];
    const result = toAnthropicMessages(history);
    expect(result.map((r) => r.role)).toEqual(["user", "assistant", "user"]);
  });

  it("trims whitespace from content before wrapping", () => {
    const [result] = toAnthropicMessages([msg("user", "  hello  ")]);
    const blocks = result.content as Array<{ type: string; text: string }>;
    expect(blocks[0].text).toBe("hello");
  });
});

describe("criteriaReuseMessage", () => {
  const prior = [
    { key: "clarity", label: "Clarity", bestPractice: "Be specific" },
    { key: "scope", label: "Scope", bestPractice: "Keep it focused" },
  ];

  it("returns a user-role message", () => {
    expect(criteriaReuseMessage(prior).role).toBe("user");
  });

  it("content is a single text block", () => {
    const result = criteriaReuseMessage(prior);
    const blocks = result.content as Array<{ type: string; text: string }>;
    expect(blocks).toHaveLength(1);
    expect(blocks[0].type).toBe("text");
  });

  it("serializes the prior criteria into the message text", () => {
    const result = criteriaReuseMessage(prior);
    const text = (result.content as Array<{ type: string; text: string }>)[0].text;
    expect(text).toContain('"key": "clarity"');
    expect(text).toContain('"label": "Scope"');
    expect(text).toContain("PREVIOUSLY CHOSEN DYNAMIC DIMENSIONS");
  });
});
