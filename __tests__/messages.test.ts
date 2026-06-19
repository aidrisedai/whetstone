import { describe, it, expect } from "vitest";
import { toAnthropicMessages, criteriaReuseMessage } from "@/lib/messages";
import type { ChatMessage, CriterionSpec } from "@/lib/types";

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
    const result = toAnthropicMessages([advisorMsg("Hi there!")]);
    expect(result[0].role).toBe("assistant");
  });

  it("maps user role to user", () => {
    const result = toAnthropicMessages([userMsg("Hello")]);
    expect(result[0].role).toBe("user");
  });

  it("produces a text block for a plain text message", () => {
    const result = toAnthropicMessages([userMsg("Hello")]);
    const content = result[0].content as Array<{ type: string; text?: string }>;
    expect(content).toHaveLength(1);
    expect(content[0].type).toBe("text");
    expect(content[0].text).toBe("Hello");
  });

  it("prepends image blocks before text for user messages with images", () => {
    const msg = userMsg("Look at this", [
      { mediaType: "image/png", data: "abc123", name: "shot.png" },
    ]);
    const result = toAnthropicMessages([msg]);
    const content = result[0].content as Array<{ type: string }>;
    expect(content[0].type).toBe("image");
    expect(content[1].type).toBe("text");
  });

  it("does not attach images to advisor messages", () => {
    const result = toAnthropicMessages([advisorMsg("text")]);
    const content = result[0].content as Array<{ type: string }>;
    expect(content.every((b) => b.type !== "image")).toBe(true);
  });

  it("falls back to (no content) for empty content string", () => {
    const result = toAnthropicMessages([userMsg("")]);
    const content = result[0].content as Array<{ type: string; text?: string }>;
    const textBlock = content.find((b) => b.type === "text");
    expect(textBlock?.text).toBe("(no content)");
  });

  it("handles an empty history", () => {
    expect(toAnthropicMessages([])).toEqual([]);
  });
});

describe("criteriaReuseMessage", () => {
  const specs: CriterionSpec[] = [
    { key: "originality", label: "Originality", bestPractice: "Be creative" },
    { key: "scope", label: "Scope", bestPractice: "Stay focused" },
  ];

  it("returns a user-role message", () => {
    const result = criteriaReuseMessage(specs);
    expect(result.role).toBe("user");
  });

  it("embeds the criteria JSON in the message text", () => {
    const result = criteriaReuseMessage(specs);
    const content = result.content as Array<{ type: string; text?: string }>;
    const text = content[0].text ?? "";
    expect(text).toContain("originality");
    expect(text).toContain("Scope");
    expect(text).toContain("PREVIOUSLY CHOSEN DYNAMIC DIMENSIONS");
  });
});
