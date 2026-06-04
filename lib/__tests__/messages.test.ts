import { describe, it, expect } from "vitest";
import { toAnthropicMessages, criteriaReuseMessage } from "../messages";
import type { ChatMessage, CriterionSpec } from "../types";

const userMsg = (content: string): ChatMessage => ({
  id: "u1",
  role: "user",
  content,
});
const advisorMsg = (content: string): ChatMessage => ({
  id: "a1",
  role: "advisor",
  content,
});

describe("toAnthropicMessages", () => {
  it("maps 'user' role to 'user'", () => {
    const result = toAnthropicMessages([userMsg("hello")]);
    expect(result[0].role).toBe("user");
  });

  it("maps 'advisor' role to 'assistant'", () => {
    const result = toAnthropicMessages([advisorMsg("hi there")]);
    expect(result[0].role).toBe("assistant");
  });

  it("wraps content in a text block", () => {
    const result = toAnthropicMessages([userMsg("test message")]);
    const blocks = result[0].content as Array<{ type: string; text?: string }>;
    expect(blocks[0].type).toBe("text");
    expect(blocks[0].text).toBe("test message");
  });

  it("prepends image blocks for user messages with images", () => {
    const msgWithImg: ChatMessage = {
      id: "u1",
      role: "user",
      content: "here is my sketch",
      images: [{ mediaType: "image/png", data: "base64data" }],
    };
    const result = toAnthropicMessages([msgWithImg]);
    const blocks = result[0].content as Array<{ type: string }>;
    expect(blocks[0].type).toBe("image");
    expect(blocks[1].type).toBe("text");
  });

  it("does not add image blocks for advisor messages", () => {
    const msg: ChatMessage = {
      id: "a1",
      role: "advisor",
      content: "reply",
      images: [{ mediaType: "image/png", data: "base64data" }],
    };
    const result = toAnthropicMessages([msg]);
    const blocks = result[0].content as Array<{ type: string }>;
    expect(blocks.every((b) => b.type !== "image")).toBe(true);
  });

  it("falls back to '(no content)' when content is empty", () => {
    const emptyMsg: ChatMessage = { id: "u1", role: "user", content: "" };
    const result = toAnthropicMessages([emptyMsg]);
    const blocks = result[0].content as Array<{ type: string; text?: string }>;
    const textBlock = blocks.find((b) => b.type === "text");
    expect(textBlock?.text).toBe("(no content)");
  });

  it("handles a multi-turn conversation", () => {
    const history: ChatMessage[] = [
      userMsg("I want to build a game"),
      advisorMsg("What kind of game?"),
      userMsg("A puzzle game for kids"),
    ];
    const result = toAnthropicMessages(history);
    expect(result).toHaveLength(3);
    expect(result[0].role).toBe("user");
    expect(result[1].role).toBe("assistant");
    expect(result[2].role).toBe("user");
  });
});

describe("criteriaReuseMessage", () => {
  const prior: CriterionSpec[] = [
    { key: "core_mechanic", label: "Core mechanic", bestPractice: "core_mechanic" },
    { key: "success_criteria", label: "Win/lose state", bestPractice: "success_criteria" },
  ];

  it("returns a user-role message", () => {
    const msg = criteriaReuseMessage(prior);
    expect(msg.role).toBe("user");
  });

  it("includes the criteria keys in the message text", () => {
    const msg = criteriaReuseMessage(prior);
    const blocks = msg.content as Array<{ type: string; text?: string }>;
    const text = blocks.find((b) => b.type === "text")?.text ?? "";
    expect(text).toContain("core_mechanic");
    expect(text).toContain("success_criteria");
  });

  it("instructs the model to reuse the prior criteria", () => {
    const msg = criteriaReuseMessage(prior);
    const blocks = msg.content as Array<{ type: string; text?: string }>;
    const text = blocks.find((b) => b.type === "text")?.text ?? "";
    expect(text.toLowerCase()).toContain("reuse");
  });
});
