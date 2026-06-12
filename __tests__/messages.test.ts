import { describe, it, expect } from "vitest";
import { toAnthropicMessages, criteriaReuseMessage } from "@/lib/messages";
import type { ChatMessage, CriterionSpec } from "@/lib/types";

describe("toAnthropicMessages", () => {
  it("maps advisor role to assistant", () => {
    const msg: ChatMessage = { id: "1", role: "advisor", content: "Hello" };
    const result = toAnthropicMessages([msg]);
    expect(result[0].role).toBe("assistant");
  });

  it("maps user role to user", () => {
    const msg: ChatMessage = { id: "1", role: "user", content: "Hi" };
    const result = toAnthropicMessages([msg]);
    expect(result[0].role).toBe("user");
  });

  it("produces a text block for message content", () => {
    const msg: ChatMessage = { id: "1", role: "user", content: "Hello there" };
    const result = toAnthropicMessages([msg]);
    const content = result[0].content as { type: string; text: string }[];
    expect(content.some((b) => b.type === "text" && b.text === "Hello there")).toBe(true);
  });

  it("adds image blocks before text for user messages with images", () => {
    const msg: ChatMessage = {
      id: "1",
      role: "user",
      content: "look",
      images: [{ mediaType: "image/png", data: "abc123" }],
    };
    const result = toAnthropicMessages([msg]);
    const content = result[0].content as { type: string }[];
    expect(content[0].type).toBe("image");
    expect(content[1].type).toBe("text");
  });

  it("does not add image blocks for advisor messages", () => {
    const msg: ChatMessage = {
      id: "1",
      role: "advisor",
      content: "response",
      images: [{ mediaType: "image/png", data: "abc123" }],
    };
    const result = toAnthropicMessages([msg]);
    const content = result[0].content as { type: string }[];
    expect(content.every((b) => b.type !== "image")).toBe(true);
  });

  it("falls back to '(no content)' when content is empty", () => {
    const msg: ChatMessage = { id: "1", role: "user", content: "   " };
    const result = toAnthropicMessages([msg]);
    const content = result[0].content as { type: string; text: string }[];
    expect(content.some((b) => b.text === "(no content)")).toBe(true);
  });
});

describe("criteriaReuseMessage", () => {
  it("returns a user-role message", () => {
    const prior: CriterionSpec[] = [{ key: "scope", label: "Scope", bestPractice: "bp" }];
    const msg = criteriaReuseMessage(prior);
    expect(msg.role).toBe("user");
  });

  it("serializes the criteria in the message body", () => {
    const prior: CriterionSpec[] = [{ key: "scope", label: "Scope", bestPractice: "bp" }];
    const msg = criteriaReuseMessage(prior);
    const content = msg.content as { type: string; text: string }[];
    expect(content[0].text).toContain("scope");
  });
});
