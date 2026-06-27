import { describe, it, expect } from "vitest";
import { toAnthropicMessages, criteriaReuseMessage } from "../lib/messages";
import type { ChatMessage } from "../lib/types";

const msg = (role: ChatMessage["role"], content: string, images?: ChatMessage["images"]): ChatMessage => ({
  id: "test",
  role,
  content,
  images,
});

describe("toAnthropicMessages", () => {
  it("maps advisor role to assistant", () => {
    const result = toAnthropicMessages([msg("advisor", "hello")]);
    expect(result[0].role).toBe("assistant");
  });

  it("maps user role to user", () => {
    const result = toAnthropicMessages([msg("user", "hello")]);
    expect(result[0].role).toBe("user");
  });

  it("creates a text block for content", () => {
    const result = toAnthropicMessages([msg("user", "hello")]);
    const blocks = result[0].content as Array<{ type: string; text?: string }>;
    expect(blocks).toContainEqual({ type: "text", text: "hello" });
  });

  it("trims whitespace from content", () => {
    const result = toAnthropicMessages([msg("user", "  hello  ")]);
    const blocks = result[0].content as Array<{ type: string; text?: string }>;
    expect(blocks).toContainEqual({ type: "text", text: "hello" });
  });

  it("adds image blocks before text for user messages", () => {
    const images = [{ mediaType: "image/png", data: "base64data" }];
    const result = toAnthropicMessages([msg("user", "caption", images)]);
    const blocks = result[0].content as Array<{ type: string }>;
    expect(blocks[0].type).toBe("image");
    expect(blocks[1].type).toBe("text");
  });

  it("does not add image blocks for advisor messages", () => {
    const images = [{ mediaType: "image/png", data: "base64data" }];
    const result = toAnthropicMessages([msg("advisor", "reply", images)]);
    const blocks = result[0].content as Array<{ type: string }>;
    expect(blocks.every((b) => b.type !== "image")).toBe(true);
  });

  it("uses (no content) placeholder for empty messages", () => {
    const result = toAnthropicMessages([msg("user", "")]);
    const blocks = result[0].content as Array<{ type: string; text?: string }>;
    expect(blocks).toContainEqual({ type: "text", text: "(no content)" });
  });

  it("handles an empty history array", () => {
    expect(toAnthropicMessages([])).toEqual([]);
  });
});

describe("criteriaReuseMessage", () => {
  it("returns a user-role message", () => {
    const result = criteriaReuseMessage([]);
    expect(result.role).toBe("user");
  });

  it("includes the serialized prior criteria in the content", () => {
    const prior = [{ key: "clarity", label: "Clarity", bestPractice: "bp" }];
    const result = criteriaReuseMessage(prior);
    const blocks = result.content as Array<{ type: string; text: string }>;
    expect(blocks[0].text).toContain('"clarity"');
    expect(blocks[0].text).toContain("Clarity");
  });
});
