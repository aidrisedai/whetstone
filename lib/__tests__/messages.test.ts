import { describe, it, expect } from "vitest";
import { toAnthropicMessages, criteriaReuseMessage } from "../messages";
import type { ChatMessage, CriterionSpec } from "../types";

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
  it("maps user → user", () => {
    const [msg] = toAnthropicMessages([userMsg("hello")]);
    expect(msg.role).toBe("user");
  });

  it("maps advisor → assistant", () => {
    const [msg] = toAnthropicMessages([advisorMsg("hi back")]);
    expect(msg.role).toBe("assistant");
  });

  it("wraps text in a text block", () => {
    const [msg] = toAnthropicMessages([userMsg("hi")]);
    const blocks = Array.isArray(msg.content) ? msg.content : [];
    expect(blocks.some((b) => b.type === "text" && "text" in b && b.text === "hi")).toBe(true);
  });

  it("produces a placeholder when content is empty", () => {
    const [msg] = toAnthropicMessages([userMsg("")]);
    const blocks = Array.isArray(msg.content) ? msg.content : [];
    expect(blocks.some((b) => b.type === "text" && "text" in b && b.text === "(no content)")).toBe(true);
  });

  it("prepends image blocks for user messages with images", () => {
    const msgWithImage: ChatMessage = {
      id: "u1",
      role: "user",
      content: "look at this",
      images: [{ mediaType: "image/png", data: "base64abc", name: "sketch.png" }],
    };
    const [msg] = toAnthropicMessages([msgWithImage]);
    const blocks = Array.isArray(msg.content) ? msg.content : [];
    expect(blocks[0].type).toBe("image");
    expect(blocks[1].type).toBe("text");
  });

  it("does not add image blocks for advisor messages", () => {
    const [msg] = toAnthropicMessages([advisorMsg("fine")]);
    const blocks = Array.isArray(msg.content) ? msg.content : [];
    expect(blocks.every((b) => b.type !== "image")).toBe(true);
  });

  it("preserves message order", () => {
    const msgs = [userMsg("a", "u1"), advisorMsg("b", "a1"), userMsg("c", "u2")];
    const result = toAnthropicMessages(msgs);
    expect(result.map((m) => m.role)).toEqual(["user", "assistant", "user"]);
  });
});

describe("criteriaReuseMessage", () => {
  const prior: CriterionSpec[] = [
    { key: "audience", label: "Audience", bestPractice: "define_audience" },
    { key: "scope", label: "Scope", bestPractice: "set_constraints_and_scope" },
  ];

  it("returns a user-role message", () => {
    expect(criteriaReuseMessage(prior).role).toBe("user");
  });

  it("encodes all prior criteria in the message text", () => {
    const msg = criteriaReuseMessage(prior);
    const blocks = Array.isArray(msg.content) ? msg.content : [];
    const textBlock = blocks.find((b) => b.type === "text");
    const text = textBlock && "text" in textBlock ? textBlock.text : "";
    expect(text).toContain("audience");
    expect(text).toContain("scope");
    expect(text).toContain("define_audience");
  });
});
