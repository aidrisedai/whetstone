import { describe, it, expect } from "vitest";
import { toAnthropicMessages, criteriaReuseMessage } from "@/lib/messages";
import type { ChatMessage, CriterionSpec } from "@/lib/types";

// ---------------------------------------------------------------------------
// toAnthropicMessages
// ---------------------------------------------------------------------------
describe("toAnthropicMessages", () => {
  it("maps 'user' role to 'user'", () => {
    const msgs: ChatMessage[] = [{ id: "1", role: "user", content: "hello" }];
    const result = toAnthropicMessages(msgs);
    expect(result[0].role).toBe("user");
  });

  it("maps 'advisor' role to 'assistant'", () => {
    const msgs: ChatMessage[] = [{ id: "1", role: "advisor", content: "hi there" }];
    const result = toAnthropicMessages(msgs);
    expect(result[0].role).toBe("assistant");
  });

  it("produces a text block for a message with content", () => {
    const msgs: ChatMessage[] = [{ id: "1", role: "user", content: "hello" }];
    const result = toAnthropicMessages(msgs);
    const blocks = result[0].content as { type: string; text: string }[];
    expect(blocks).toEqual(expect.arrayContaining([{ type: "text", text: "hello" }]));
  });

  it("inserts image blocks before the text block for user messages", () => {
    const msgs: ChatMessage[] = [
      {
        id: "1",
        role: "user",
        content: "look at this",
        images: [{ mediaType: "image/png", data: "base64data", name: "img.png" }],
      },
    ];
    const result = toAnthropicMessages(msgs);
    const blocks = result[0].content as { type: string }[];
    expect(blocks[0].type).toBe("image");
    expect(blocks[1].type).toBe("text");
  });

  it("does NOT attach images to advisor (assistant) messages", () => {
    const msgs: ChatMessage[] = [
      {
        id: "1",
        role: "advisor",
        content: "reply",
        images: [{ mediaType: "image/png", data: "data", name: "img.png" }],
      },
    ];
    const result = toAnthropicMessages(msgs);
    const blocks = result[0].content as { type: string }[];
    expect(blocks.every((b) => b.type !== "image")).toBe(true);
  });

  it("falls back to '(no content)' when content is empty and no images", () => {
    const msgs: ChatMessage[] = [{ id: "1", role: "user", content: "" }];
    const result = toAnthropicMessages(msgs);
    const blocks = result[0].content as { type: string; text: string }[];
    expect(blocks[0]).toEqual({ type: "text", text: "(no content)" });
  });

  it("converts a sequence of alternating roles correctly", () => {
    const msgs: ChatMessage[] = [
      { id: "1", role: "user", content: "question" },
      { id: "2", role: "advisor", content: "answer" },
      { id: "3", role: "user", content: "follow up" },
    ];
    const result = toAnthropicMessages(msgs);
    expect(result.map((m) => m.role)).toEqual(["user", "assistant", "user"]);
  });
});

// ---------------------------------------------------------------------------
// criteriaReuseMessage
// ---------------------------------------------------------------------------
describe("criteriaReuseMessage", () => {
  const prior: CriterionSpec[] = [
    { key: "scope", label: "Scope", bestPractice: "Keep it tight" },
    { key: "users", label: "Users", bestPractice: "Name the audience" },
  ];

  it("returns a user-role message", () => {
    expect(criteriaReuseMessage(prior).role).toBe("user");
  });

  it("includes the serialized criteria in the text", () => {
    const msg = criteriaReuseMessage(prior);
    const text = (msg.content as { type: string; text: string }[])[0].text;
    expect(text).toContain("scope");
    expect(text).toContain("Scope");
    expect(text).toContain("Keep it tight");
  });

  it("instructs the model to reuse keys verbatim", () => {
    const msg = criteriaReuseMessage(prior);
    const text = (msg.content as { type: string; text: string }[])[0].text;
    expect(text.toLowerCase()).toContain("reuse");
  });
});
