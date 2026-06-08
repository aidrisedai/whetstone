import { describe, it, expect } from "vitest";
import { toAnthropicMessages, criteriaReuseMessage } from "../lib/messages";
import type { ChatMessage, CriterionSpec } from "../lib/types";

// ── toAnthropicMessages ────────────────────────────────────────────────────
describe("toAnthropicMessages", () => {
  it("maps 'advisor' role to 'assistant'", () => {
    const msgs: ChatMessage[] = [{ id: "1", role: "advisor", content: "Hello!" }];
    const result = toAnthropicMessages(msgs);
    expect(result[0].role).toBe("assistant");
  });

  it("maps 'user' role to 'user'", () => {
    const msgs: ChatMessage[] = [{ id: "1", role: "user", content: "Hi there" }];
    const result = toAnthropicMessages(msgs);
    expect(result[0].role).toBe("user");
  });

  it("creates a text block with the message content", () => {
    const msgs: ChatMessage[] = [{ id: "1", role: "user", content: "My idea" }];
    const result = toAnthropicMessages(msgs);
    const blocks = result[0].content as Array<{ type: string; text: string }>;
    expect(blocks.some((b) => b.type === "text" && b.text === "My idea")).toBe(true);
  });

  it("adds image blocks before text for user messages with attachments", () => {
    const msgs: ChatMessage[] = [
      {
        id: "1",
        role: "user",
        content: "look at this",
        images: [{ mediaType: "image/png", data: "abc123", name: "sketch.png" }],
      },
    ];
    const result = toAnthropicMessages(msgs);
    const blocks = result[0].content as Array<{ type: string }>;
    expect(blocks[0].type).toBe("image");
    expect(blocks[1].type).toBe("text");
  });

  it("does NOT add image blocks for advisor messages", () => {
    const msgs: ChatMessage[] = [
      {
        id: "1",
        role: "advisor",
        content: "great idea",
        images: [{ mediaType: "image/png", data: "abc123" }],
      },
    ];
    const result = toAnthropicMessages(msgs);
    const blocks = result[0].content as Array<{ type: string }>;
    expect(blocks.every((b) => b.type !== "image")).toBe(true);
  });

  it("inserts placeholder when content is empty", () => {
    const msgs: ChatMessage[] = [{ id: "1", role: "user", content: "" }];
    const result = toAnthropicMessages(msgs);
    const blocks = result[0].content as Array<{ type: string; text: string }>;
    expect(blocks.some((b) => b.type === "text" && b.text === "(no content)")).toBe(true);
  });

  it("handles multiple messages in order", () => {
    const msgs: ChatMessage[] = [
      { id: "1", role: "user", content: "pitch" },
      { id: "2", role: "advisor", content: "sharp" },
      { id: "3", role: "user", content: "thanks" },
    ];
    const result = toAnthropicMessages(msgs);
    expect(result).toHaveLength(3);
    expect(result[0].role).toBe("user");
    expect(result[1].role).toBe("assistant");
    expect(result[2].role).toBe("user");
  });
});

// ── criteriaReuseMessage ───────────────────────────────────────────────────
describe("criteriaReuseMessage", () => {
  const prior: CriterionSpec[] = [
    { key: "fun", label: "Fun Factor", bestPractice: "engage users emotionally" },
    { key: "scope", label: "Scope", bestPractice: "build the smallest useful thing" },
  ];

  it("returns a user-role message", () => {
    expect(criteriaReuseMessage(prior).role).toBe("user");
  });

  it("includes all prior criteria keys in the message text", () => {
    const msg = criteriaReuseMessage(prior);
    const blocks = msg.content as Array<{ type: string; text: string }>;
    const text = blocks.find((b) => b.type === "text")?.text ?? "";
    expect(text).toContain("fun");
    expect(text).toContain("scope");
  });

  it("serializes the prior criteria as JSON", () => {
    const msg = criteriaReuseMessage(prior);
    const blocks = msg.content as Array<{ type: string; text: string }>;
    const text = blocks.find((b) => b.type === "text")?.text ?? "";
    // Must be parseable JSON embedded in the message
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    expect(jsonMatch).not.toBeNull();
    const parsed = JSON.parse(jsonMatch![0]);
    expect(parsed).toHaveLength(2);
    expect(parsed[0].key).toBe("fun");
  });
});
