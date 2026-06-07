import { describe, it, expect } from "vitest";
import { toAnthropicMessages, criteriaReuseMessage } from "../lib/messages";
import type { ChatMessage, CriterionSpec } from "../lib/types";

// ---------------------------------------------------------------------------
// toAnthropicMessages
// ---------------------------------------------------------------------------
describe("toAnthropicMessages", () => {
  it("maps 'advisor' role to 'assistant'", () => {
    const msgs: ChatMessage[] = [
      { id: "1", role: "advisor", content: "Hello there!" },
    ];
    const result = toAnthropicMessages(msgs);
    expect(result[0].role).toBe("assistant");
  });

  it("maps 'user' role to 'user'", () => {
    const msgs: ChatMessage[] = [{ id: "1", role: "user", content: "My idea" }];
    const result = toAnthropicMessages(msgs);
    expect(result[0].role).toBe("user");
  });

  it("produces a text block from message content", () => {
    const msgs: ChatMessage[] = [{ id: "1", role: "user", content: "hello" }];
    const result = toAnthropicMessages(msgs);
    expect(result[0].content).toEqual([{ type: "text", text: "hello" }]);
  });

  it("trims whitespace from content", () => {
    const msgs: ChatMessage[] = [{ id: "1", role: "user", content: "  hi  " }];
    const [{ content }] = toAnthropicMessages(msgs);
    const block = (content as { type: string; text: string }[])[0];
    expect(block.text).toBe("hi");
  });

  it("inserts image blocks before the text block for user messages", () => {
    const msgs: ChatMessage[] = [
      {
        id: "1",
        role: "user",
        content: "check this",
        images: [{ mediaType: "image/png", data: "abc123", name: "sketch.png" }],
      },
    ];
    const [{ content }] = toAnthropicMessages(msgs);
    const blocks = content as { type: string }[];
    expect(blocks[0].type).toBe("image");
    expect(blocks[1].type).toBe("text");
  });

  it("does NOT add image blocks for advisor messages", () => {
    const msgs: ChatMessage[] = [
      {
        id: "1",
        role: "advisor",
        content: "Great sketch!",
        images: [{ mediaType: "image/png", data: "abc123" }],
      },
    ];
    const [{ content }] = toAnthropicMessages(msgs);
    const blocks = content as { type: string }[];
    expect(blocks.every((b) => b.type !== "image")).toBe(true);
  });

  it("produces '(no content)' fallback for empty content and no images", () => {
    const msgs: ChatMessage[] = [{ id: "1", role: "user", content: "" }];
    const [{ content }] = toAnthropicMessages(msgs);
    const block = (content as { type: string; text: string }[])[0];
    expect(block.text).toBe("(no content)");
  });

  it("handles multiple messages in order", () => {
    const msgs: ChatMessage[] = [
      { id: "1", role: "user", content: "A" },
      { id: "2", role: "advisor", content: "B" },
      { id: "3", role: "user", content: "C" },
    ];
    const result = toAnthropicMessages(msgs);
    expect(result.map((m) => m.role)).toEqual(["user", "assistant", "user"]);
  });

  it("returns empty array for empty input", () => {
    expect(toAnthropicMessages([])).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// criteriaReuseMessage
// ---------------------------------------------------------------------------
describe("criteriaReuseMessage", () => {
  const prior: CriterionSpec[] = [
    { key: "engagement", label: "Engagement", bestPractice: "Hook the user" },
  ];

  it("returns a user-role message", () => {
    expect(criteriaReuseMessage(prior).role).toBe("user");
  });

  it("contains the serialized prior criteria in the text", () => {
    const msg = criteriaReuseMessage(prior);
    const content = msg.content as { type: string; text: string }[];
    expect(content[0].text).toContain("engagement");
    expect(content[0].text).toContain("Engagement");
  });

  it("includes the instruction to reuse exact keys/labels/bestPractice", () => {
    const msg = criteriaReuseMessage(prior);
    const content = msg.content as { type: string; text: string }[];
    expect(content[0].text).toContain("PREVIOUSLY CHOSEN DYNAMIC DIMENSIONS");
  });

  it("serializes multiple criteria", () => {
    const multi: CriterionSpec[] = [
      { key: "a", label: "A", bestPractice: "bp-a" },
      { key: "b", label: "B", bestPractice: "bp-b" },
    ];
    const msg = criteriaReuseMessage(multi);
    const text = (msg.content as { type: string; text: string }[])[0].text;
    expect(text).toContain('"key": "a"');
    expect(text).toContain('"key": "b"');
  });
});
