import { describe, it, expect } from "vitest";
import { toAnthropicMessages } from "./messages";
import type { ChatMessage } from "./types";

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
  it("maps user role correctly", () => {
    const result = toAnthropicMessages([userMsg("hello")]);
    expect(result[0].role).toBe("user");
  });

  it("maps advisor role to assistant", () => {
    const result = toAnthropicMessages([advisorMsg("hi back")]);
    expect(result[0].role).toBe("assistant");
  });

  it("produces a text block for each message", () => {
    const result = toAnthropicMessages([userMsg("hello")]);
    const blocks = result[0].content as Array<{ type: string; text?: string }>;
    expect(blocks.some((b) => b.type === "text" && b.text === "hello")).toBe(true);
  });

  it("inserts a placeholder for empty content", () => {
    const result = toAnthropicMessages([{ id: "x", role: "user", content: "" }]);
    const blocks = result[0].content as Array<{ type: string; text?: string }>;
    expect(blocks[0].text).toBe("(no content)");
  });

  it("includes valid image blocks before the text block", () => {
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

  it("strips images with an invalid MIME type", () => {
    const msg: ChatMessage = {
      id: "u1",
      role: "user",
      content: "bad image",
      images: [{ mediaType: "application/pdf", data: "abc123" }],
    };
    const result = toAnthropicMessages([msg]);
    const blocks = result[0].content as Array<{ type: string }>;
    expect(blocks.every((b) => b.type !== "image")).toBe(true);
  });
});
