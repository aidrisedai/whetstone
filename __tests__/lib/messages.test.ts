import { describe, it, expect } from "vitest";
import { toAnthropicMessages, criteriaReuseMessage } from "@/lib/messages";
import type { ChatMessage } from "@/lib/types";

describe("toAnthropicMessages", () => {
  it("maps user role to 'user'", () => {
    const history: ChatMessage[] = [{ id: "1", role: "user", content: "Hello" }];
    const result = toAnthropicMessages(history);
    expect(result[0].role).toBe("user");
  });

  it("maps advisor role to 'assistant'", () => {
    const history: ChatMessage[] = [{ id: "1", role: "advisor", content: "Hi there" }];
    const result = toAnthropicMessages(history);
    expect(result[0].role).toBe("assistant");
  });

  it("wraps text content in a text block", () => {
    const history: ChatMessage[] = [{ id: "1", role: "user", content: "My idea" }];
    const result = toAnthropicMessages(history);
    const blocks = result[0].content as { type: string; text: string }[];
    expect(blocks).toContainEqual({ type: "text", text: "My idea" });
  });

  it("inserts a fallback text block for empty content", () => {
    const history: ChatMessage[] = [{ id: "1", role: "user", content: "   " }];
    const result = toAnthropicMessages(history);
    const blocks = result[0].content as { type: string; text: string }[];
    expect(blocks[0]).toEqual({ type: "text", text: "(no content)" });
  });

  it("prepends image blocks for user messages with attachments", () => {
    const history: ChatMessage[] = [
      {
        id: "1",
        role: "user",
        content: "Look at this",
        images: [{ mediaType: "image/png", data: "base64data", name: "sketch.png" }],
      },
    ];
    const result = toAnthropicMessages(history);
    const blocks = result[0].content as { type: string }[];
    expect(blocks[0].type).toBe("image");
    expect(blocks[1].type).toBe("text");
  });

  it("does not attach images for advisor messages", () => {
    const history: ChatMessage[] = [
      {
        id: "1",
        role: "advisor",
        content: "I see",
        images: [{ mediaType: "image/png", data: "base64data", name: "img.png" }],
      },
    ];
    const result = toAnthropicMessages(history);
    const blocks = result[0].content as { type: string }[];
    expect(blocks.every((b) => b.type !== "image")).toBe(true);
  });

  it("converts a two-turn conversation correctly", () => {
    const history: ChatMessage[] = [
      { id: "1", role: "user", content: "pitch" },
      { id: "2", role: "advisor", content: "sharp!" },
    ];
    const result = toAnthropicMessages(history);
    expect(result[0].role).toBe("user");
    expect(result[1].role).toBe("assistant");
  });
});

describe("criteriaReuseMessage", () => {
  const prior = [
    { key: "impact", label: "Impact", bestPractice: "Reach many" },
    { key: "feasibility", label: "Feasibility", bestPractice: "Buildable in a week" },
  ];

  it("returns a user role message", () => {
    const msg = criteriaReuseMessage(prior);
    expect(msg.role).toBe("user");
  });

  it("includes the prior criteria JSON in the message body", () => {
    const msg = criteriaReuseMessage(prior);
    const blocks = msg.content as { type: string; text: string }[];
    const text = blocks[0].text;
    expect(text).toContain("impact");
    expect(text).toContain("feasibility");
  });

  it("instructs the model to reuse keys verbatim", () => {
    const msg = criteriaReuseMessage(prior);
    const blocks = msg.content as { type: string; text: string }[];
    expect(blocks[0].text).toContain("reuse these exact keys");
  });
});
