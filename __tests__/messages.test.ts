import { describe, it, expect } from "vitest";
import { toAnthropicMessages, criteriaReuseMessage } from "../lib/messages";
import type { ChatMessage, CriterionSpec } from "../lib/types";

const userMsg = (content: string, id = "u1"): ChatMessage => ({
  id,
  role: "user",
  content,
});

const advisorMsg = (content: string, id = "a1"): ChatMessage => ({
  id,
  role: "advisor",
  content,
});

describe("toAnthropicMessages", () => {
  it("maps user role to user", () => {
    const [msg] = toAnthropicMessages([userMsg("hello")]);
    expect(msg.role).toBe("user");
  });

  it("maps advisor role to assistant", () => {
    const [msg] = toAnthropicMessages([advisorMsg("hello")]);
    expect(msg.role).toBe("assistant");
  });

  it("creates a text block for message content", () => {
    const [msg] = toAnthropicMessages([userMsg("hello")]);
    const blocks = msg.content as Array<{ type: string; text: string }>;
    expect(blocks).toContainEqual({ type: "text", text: "hello" });
  });

  it("prepends image blocks before text on user messages", () => {
    const msg: ChatMessage = {
      id: "u1",
      role: "user",
      content: "here is my sketch",
      images: [{ mediaType: "image/png", data: "abc123" }],
    };
    const [result] = toAnthropicMessages([msg]);
    const blocks = result.content as Array<{ type: string }>;
    expect(blocks[0].type).toBe("image");
    expect(blocks[1].type).toBe("text");
  });

  it("does not add image blocks for advisor messages", () => {
    const msg: ChatMessage = {
      id: "a1",
      role: "advisor",
      content: "no images",
      images: [{ mediaType: "image/png", data: "abc123" }],
    };
    const [result] = toAnthropicMessages([msg]);
    const blocks = result.content as Array<{ type: string }>;
    expect(blocks.every((b) => b.type !== "image")).toBe(true);
  });

  it("falls back to '(no content)' when content is empty", () => {
    const msg: ChatMessage = { id: "u1", role: "user", content: "   " };
    const [result] = toAnthropicMessages([msg]);
    const blocks = result.content as Array<{ type: string; text: string }>;
    expect(blocks[0]).toEqual({ type: "text", text: "(no content)" });
  });

  it("converts a multi-turn conversation", () => {
    const history = [userMsg("idea"), advisorMsg("tell me more"), userMsg("more detail")];
    const result = toAnthropicMessages(history);
    expect(result.map((m) => m.role)).toEqual(["user", "assistant", "user"]);
  });
});

describe("criteriaReuseMessage", () => {
  const prior: CriterionSpec[] = [
    { key: "scope", label: "Scope", bestPractice: "focused" },
    { key: "originality", label: "Originality", bestPractice: "unique" },
  ];

  it("returns a user-role message", () => {
    const msg = criteriaReuseMessage(prior);
    expect(msg.role).toBe("user");
  });

  it("contains the serialized prior criteria", () => {
    const msg = criteriaReuseMessage(prior);
    const blocks = msg.content as Array<{ type: string; text: string }>;
    const text = blocks[0].text;
    expect(text).toContain("scope");
    expect(text).toContain("originality");
  });

  it("includes the reuse instruction", () => {
    const msg = criteriaReuseMessage(prior);
    const blocks = msg.content as Array<{ type: string; text: string }>;
    expect(blocks[0].text).toContain("PREVIOUSLY CHOSEN DYNAMIC DIMENSIONS");
  });
});
