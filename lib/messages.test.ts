import { describe, it, expect } from "vitest";
import { toAnthropicMessages } from "./messages";
import type { ChatMessage } from "./types";

const userMsg = (content: string, id = "u1"): ChatMessage => ({ id, role: "user", content });
const advisorMsg = (content: string, id = "a1"): ChatMessage => ({ id, role: "advisor", content });

describe("toAnthropicMessages", () => {
  it("maps advisor role to assistant", () => {
    const result = toAnthropicMessages([advisorMsg("Hello!")]);
    expect(result[0].role).toBe("assistant");
  });

  it("maps user role to user", () => {
    const result = toAnthropicMessages([userMsg("Hi there")]);
    expect(result[0].role).toBe("user");
  });

  it("produces a text block for message content", () => {
    const result = toAnthropicMessages([userMsg("Build me an app")]);
    const content = result[0].content as Array<{ type: string; text?: string }>;
    expect(content[0]).toMatchObject({ type: "text", text: "Build me an app" });
  });

  it("inserts a placeholder for empty content", () => {
    const msg: ChatMessage = { id: "x", role: "user", content: "" };
    const result = toAnthropicMessages([msg]);
    const content = result[0].content as Array<{ type: string; text?: string }>;
    expect(content[0]).toMatchObject({ type: "text", text: "(no content)" });
  });

  it("includes valid image attachments as vision blocks", () => {
    const msg: ChatMessage = {
      id: "u2",
      role: "user",
      content: "See this",
      images: [{ mediaType: "image/png", data: "abc123", name: "test.png" }],
    };
    const result = toAnthropicMessages([msg]);
    const content = result[0].content as Array<{ type: string; source?: unknown }>;
    expect(content[0].type).toBe("image");
    expect(content[0].source).toMatchObject({ type: "base64", media_type: "image/png", data: "abc123" });
  });

  it("skips images with unsupported MIME types", () => {
    const msg: ChatMessage = {
      id: "u3",
      role: "user",
      content: "See this",
      images: [
        { mediaType: "image/svg+xml", data: "svgdata", name: "icon.svg" },
        { mediaType: "image/png", data: "pngdata", name: "img.png" },
      ],
    };
    const result = toAnthropicMessages([msg]);
    const content = result[0].content as Array<{ type: string; source?: { media_type?: string } }>;
    const imageBlocks = content.filter((b) => b.type === "image");
    expect(imageBlocks).toHaveLength(1);
    expect(imageBlocks[0].source?.media_type).toBe("image/png");
  });

  it("does not include image blocks for advisor messages", () => {
    const msg: ChatMessage = {
      id: "a2",
      role: "advisor",
      content: "Here you go",
      images: [{ mediaType: "image/png", data: "abc", name: "t.png" }],
    };
    const result = toAnthropicMessages([msg]);
    const content = result[0].content as Array<{ type: string }>;
    expect(content.every((b) => b.type !== "image")).toBe(true);
  });

  it("converts a full history correctly", () => {
    const history: ChatMessage[] = [
      userMsg("First message", "u1"),
      advisorMsg("Response", "a1"),
      userMsg("Follow-up", "u2"),
    ];
    const result = toAnthropicMessages(history);
    expect(result.map((r) => r.role)).toEqual(["user", "assistant", "user"]);
  });
});
