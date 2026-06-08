import { describe, it, expect } from "vitest";
import { toAnthropicMessages, criteriaReuseMessage } from "../lib/messages";
import type { ChatMessage, CriterionSpec } from "../lib/types";

const userMsg = (content: string, id = "u1"): ChatMessage => ({ id, role: "user", content });
const advisorMsg = (content: string, id = "a1"): ChatMessage => ({ id, role: "advisor", content });

describe("toAnthropicMessages", () => {
  it("maps user role to 'user'", () => {
    const [msg] = toAnthropicMessages([userMsg("hello")]);
    expect(msg.role).toBe("user");
  });

  it("maps advisor role to 'assistant'", () => {
    const [msg] = toAnthropicMessages([advisorMsg("hi back")]);
    expect(msg.role).toBe("assistant");
  });

  it("produces a text content block with the message text", () => {
    const [msg] = toAnthropicMessages([userMsg("test message")]);
    const blocks = msg.content as Array<{ type: string; text?: string }>;
    const text = blocks.find((b) => b.type === "text");
    expect(text?.text).toBe("test message");
  });

  it("emits a fallback text block for empty content", () => {
    const [msg] = toAnthropicMessages([userMsg("")]);
    const blocks = msg.content as Array<{ type: string; text?: string }>;
    expect(blocks[0].text).toBe("(no content)");
  });

  it("includes an image block before the text block for user messages with images", () => {
    const msg: ChatMessage = {
      id: "u2",
      role: "user",
      content: "here is my sketch",
      images: [{ mediaType: "image/png", data: "abc123" }],
    };
    const [result] = toAnthropicMessages([msg]);
    const blocks = result.content as Array<{ type: string }>;
    expect(blocks[0].type).toBe("image");
    expect(blocks[1].type).toBe("text");
  });

  it("does not emit image blocks for advisor messages", () => {
    const msg: ChatMessage = {
      id: "a2",
      role: "advisor",
      content: "I see",
      images: [{ mediaType: "image/png", data: "xyz" }],
    };
    const [result] = toAnthropicMessages([msg]);
    const blocks = result.content as Array<{ type: string }>;
    expect(blocks.every((b) => b.type !== "image")).toBe(true);
  });

  it("preserves message order", () => {
    const history: ChatMessage[] = [userMsg("first", "u1"), advisorMsg("second", "a1"), userMsg("third", "u2")];
    const result = toAnthropicMessages(history);
    expect(result.map((m) => m.role)).toEqual(["user", "assistant", "user"]);
  });
});

describe("criteriaReuseMessage", () => {
  const prior: CriterionSpec[] = [
    { key: "clarity", label: "Clarity", bestPractice: "Be specific" },
    { key: "scope", label: "Scope", bestPractice: "Keep it focused" },
  ];

  it("returns a user-role message", () => {
    expect(criteriaReuseMessage(prior).role).toBe("user");
  });

  it("includes all prior criterion keys in the message text", () => {
    const result = criteriaReuseMessage(prior);
    const text = (result.content as Array<{ text: string }>)[0].text;
    expect(text).toContain("clarity");
    expect(text).toContain("scope");
  });

  it("instructs the model to reuse the exact keys", () => {
    const result = criteriaReuseMessage(prior);
    const text = (result.content as Array<{ text: string }>)[0].text;
    expect(text).toContain("reuse");
  });
});
