import { describe, it, expect } from "vitest";
import { criteriaReuseMessage, toAnthropicMessages } from "@/lib/messages";
import type { ChatMessage, CriterionSpec } from "@/lib/types";

describe("toAnthropicMessages", () => {
  it("maps advisor role to assistant", () => {
    const msgs: ChatMessage[] = [{ id: "1", role: "advisor", content: "Hello" }];
    const result = toAnthropicMessages(msgs);
    expect(result[0].role).toBe("assistant");
  });

  it("maps user role to user", () => {
    const msgs: ChatMessage[] = [{ id: "1", role: "user", content: "Hi" }];
    expect(toAnthropicMessages(msgs)[0].role).toBe("user");
  });

  it("wraps text in a text block", () => {
    const msgs: ChatMessage[] = [{ id: "1", role: "user", content: "What is this?" }];
    const result = toAnthropicMessages(msgs);
    const blocks = result[0].content as { type: string; text?: string }[];
    expect(blocks.some((b) => b.type === "text" && b.text === "What is this?")).toBe(true);
  });

  it("inserts an image block before text for user messages with images", () => {
    const msgs: ChatMessage[] = [
      {
        id: "1",
        role: "user",
        content: "Look at this",
        images: [{ mediaType: "image/png", data: "abc123" }],
      },
    ];
    const result = toAnthropicMessages(msgs);
    const blocks = result[0].content as { type: string }[];
    expect(blocks[0].type).toBe("image");
    expect(blocks[1].type).toBe("text");
  });

  it("does not attach images to advisor (assistant) turns", () => {
    const msgs: ChatMessage[] = [
      {
        id: "1",
        role: "advisor",
        content: "Good",
        images: [{ mediaType: "image/png", data: "data" }],
      },
    ];
    const result = toAnthropicMessages(msgs);
    const blocks = result[0].content as { type: string }[];
    expect(blocks.every((b) => b.type !== "image")).toBe(true);
  });

  it("falls back to a placeholder block for empty content", () => {
    const msgs: ChatMessage[] = [{ id: "1", role: "user", content: "" }];
    const result = toAnthropicMessages(msgs);
    const blocks = result[0].content as { type: string; text?: string }[];
    expect(blocks.length).toBeGreaterThan(0);
    expect(blocks[0].text).toBe("(no content)");
  });

  it("handles a multi-turn history", () => {
    const msgs: ChatMessage[] = [
      { id: "1", role: "user", content: "Pitch" },
      { id: "2", role: "advisor", content: "Sharp question" },
      { id: "3", role: "user", content: "Better answer" },
    ];
    const result = toAnthropicMessages(msgs);
    expect(result).toHaveLength(3);
    expect(result[1].role).toBe("assistant");
  });
});

describe("criteriaReuseMessage", () => {
  const prior: CriterionSpec[] = [
    { key: "core_mechanic", label: "Core mechanic", bestPractice: "core_mechanic" },
    { key: "success_criteria", label: "Win/lose", bestPractice: "success_criteria" },
  ];

  it("returns a user-role message", () => {
    expect(criteriaReuseMessage(prior).role).toBe("user");
  });

  it("serializes the prior criteria into the content", () => {
    const msg = criteriaReuseMessage(prior);
    const content = msg.content as { type: string; text?: string }[];
    const text = content.find((b) => b.type === "text")?.text ?? "";
    expect(text).toContain("core_mechanic");
    expect(text).toContain("success_criteria");
    expect(text).toContain("PREVIOUSLY CHOSEN");
  });
});
