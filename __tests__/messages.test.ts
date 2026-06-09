import { describe, it, expect } from "vitest";
import { toAnthropicMessages, criteriaReuseMessage } from "../lib/messages";

describe("toAnthropicMessages", () => {
  it("maps user role to user", () => {
    const result = toAnthropicMessages([{ id: "1", role: "user", content: "hello" }]);
    expect(result[0].role).toBe("user");
  });

  it("maps advisor role to assistant", () => {
    const result = toAnthropicMessages([{ id: "1", role: "advisor", content: "hi" }]);
    expect(result[0].role).toBe("assistant");
  });

  it("adds a text block for message content", () => {
    const result = toAnthropicMessages([{ id: "1", role: "user", content: "test message" }]);
    const content = result[0].content as Array<{ type: string; text?: string }>;
    expect(content).toContainEqual({ type: "text", text: "test message" });
  });

  it("inserts a fallback block when content is empty", () => {
    const result = toAnthropicMessages([{ id: "1", role: "user", content: "" }]);
    const content = result[0].content as Array<{ type: string; text?: string }>;
    expect(content).toContainEqual({ type: "text", text: "(no content)" });
  });

  it("prepends image blocks for user messages with images", () => {
    const result = toAnthropicMessages([
      { id: "1", role: "user", content: "see this", images: [{ mediaType: "image/png", data: "base64data" }] },
    ]);
    const content = result[0].content as Array<{ type: string }>;
    expect(content[0].type).toBe("image");
    expect(content[1].type).toBe("text");
  });

  it("does not add image blocks for advisor messages (even if images are attached)", () => {
    const result = toAnthropicMessages([
      { id: "1", role: "advisor", content: "hello", images: [{ mediaType: "image/png", data: "abc" }] },
    ]);
    const content = result[0].content as Array<{ type: string }>;
    expect(content.every((b) => b.type !== "image")).toBe(true);
  });

  it("converts a sequence of alternating messages", () => {
    const messages = [
      { id: "1", role: "user" as const, content: "idea" },
      { id: "2", role: "advisor" as const, content: "interesting" },
      { id: "3", role: "user" as const, content: "more detail" },
    ];
    const result = toAnthropicMessages(messages);
    expect(result.map((m) => m.role)).toEqual(["user", "assistant", "user"]);
  });
});

describe("criteriaReuseMessage", () => {
  it("returns a user-role message", () => {
    const msg = criteriaReuseMessage([]);
    expect(msg.role).toBe("user");
  });

  it("embeds the serialized criteria in the text block", () => {
    const prior = [{ key: "feasibility", label: "Feasibility", bestPractice: "good" }];
    const msg = criteriaReuseMessage(prior);
    const text = (msg.content as Array<{ text: string }>)[0].text;
    expect(text).toContain("feasibility");
    expect(text).toContain("Feasibility");
  });

  it("includes instruction to reuse the exact keys", () => {
    const msg = criteriaReuseMessage([]);
    const text = (msg.content as Array<{ text: string }>)[0].text;
    expect(text.toLowerCase()).toContain("reuse");
  });
});
