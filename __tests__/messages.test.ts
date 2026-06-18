import { describe, it, expect } from "vitest";
import { toAnthropicMessages } from "../lib/messages";
import type { ChatMessage } from "../lib/types";

const userMsg = (content: string, images?: ChatMessage["images"]): ChatMessage => ({
  id: "u1",
  role: "user",
  content,
  images,
});

const advisorMsg = (content: string): ChatMessage => ({
  id: "a1",
  role: "advisor",
  content,
});

describe("toAnthropicMessages", () => {
  it("maps advisor role to assistant", () => {
    const result = toAnthropicMessages([advisorMsg("hello")]);
    expect(result[0].role).toBe("assistant");
  });

  it("maps user role to user", () => {
    const result = toAnthropicMessages([userMsg("hi")]);
    expect(result[0].role).toBe("user");
  });

  it("creates a text block for message content", () => {
    const result = toAnthropicMessages([userMsg("my idea")]);
    const blocks = result[0].content as { type: string; text?: string }[];
    expect(blocks.some((b) => b.type === "text" && b.text === "my idea")).toBe(true);
  });

  it("includes image blocks before text for user messages", () => {
    const result = toAnthropicMessages([
      userMsg("describe this", [{ mediaType: "image/png", data: "abc123", name: "sketch.png" }]),
    ]);
    const blocks = result[0].content as { type: string }[];
    expect(blocks[0].type).toBe("image");
    expect(blocks[1].type).toBe("text");
  });

  it("filters out images with unsupported media types", () => {
    const result = toAnthropicMessages([
      userMsg("hi", [{ mediaType: "image/bmp", data: "xxx" }]),
    ]);
    const blocks = result[0].content as { type: string }[];
    expect(blocks.every((b) => b.type !== "image")).toBe(true);
  });

  it("inserts placeholder text when both content and images are empty", () => {
    const result = toAnthropicMessages([{ id: "u1", role: "user", content: "" }]);
    const blocks = result[0].content as { type: string; text?: string }[];
    expect(blocks.some((b) => b.text === "(no content)")).toBe(true);
  });

  it("does not add image blocks for advisor messages", () => {
    // The type system prevents it, but verify at runtime too.
    const msg: ChatMessage = { id: "a1", role: "advisor", content: "ok" };
    const result = toAnthropicMessages([msg]);
    const blocks = result[0].content as { type: string }[];
    expect(blocks.every((b) => b.type !== "image")).toBe(true);
  });
});
