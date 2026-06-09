import { describe, it, expect } from "vitest";
import { toAnthropicMessages, criteriaReuseMessage } from "@/lib/messages";
import type { ChatMessage, CriterionSpec } from "@/lib/types";

// ── toAnthropicMessages ───────────────────────────────────────────────────────

function userMsg(content: string, id = "u1"): ChatMessage {
  return { id, role: "user", content };
}
function advisorMsg(content: string, id = "a1"): ChatMessage {
  return { id, role: "advisor", content };
}

describe("toAnthropicMessages", () => {
  it("maps user role to 'user'", () => {
    const [msg] = toAnthropicMessages([userMsg("hello")]);
    expect(msg.role).toBe("user");
  });

  it("maps advisor role to 'assistant'", () => {
    const [msg] = toAnthropicMessages([advisorMsg("hi there")]);
    expect(msg.role).toBe("assistant");
  });

  it("produces a text block for a plain text message", () => {
    const [msg] = toAnthropicMessages([userMsg("hello")]);
    const content = msg.content as Array<{ type: string; text?: string }>;
    expect(content).toHaveLength(1);
    expect(content[0].type).toBe("text");
    expect(content[0].text).toBe("hello");
  });

  it("produces (no content) text block for empty/whitespace messages", () => {
    const [msg] = toAnthropicMessages([userMsg("   ")]);
    const content = msg.content as Array<{ type: string; text?: string }>;
    expect(content[0].text).toBe("(no content)");
  });

  it("prepends image blocks before the text block for user messages with images", () => {
    const msg: ChatMessage = {
      id: "u1",
      role: "user",
      content: "check this out",
      images: [{ mediaType: "image/png", data: "base64data==" }],
    };
    const [result] = toAnthropicMessages([msg]);
    const content = result.content as Array<{ type: string }>;
    expect(content[0].type).toBe("image");
    expect(content[1].type).toBe("text");
  });

  it("does not add image blocks for advisor messages even when images are present", () => {
    const msg: ChatMessage = {
      id: "a1",
      role: "advisor",
      content: "here you go",
      images: [{ mediaType: "image/png", data: "base64data==" }],
    };
    const [result] = toAnthropicMessages([msg]);
    const content = result.content as Array<{ type: string }>;
    expect(content.every((b) => b.type === "text")).toBe(true);
  });

  it("converts a full conversation in order", () => {
    const history: ChatMessage[] = [
      userMsg("idea: a chess app", "u1"),
      advisorMsg("who is this for?", "a1"),
      userMsg("teens who want to learn", "u2"),
    ];
    const result = toAnthropicMessages(history);
    expect(result[0].role).toBe("user");
    expect(result[1].role).toBe("assistant");
    expect(result[2].role).toBe("user");
  });
});

// ── criteriaReuseMessage ──────────────────────────────────────────────────────

describe("criteriaReuseMessage", () => {
  const prior: CriterionSpec[] = [
    { key: "usefulness", label: "Usefulness", bestPractice: "Target a real need" },
  ];

  it("has role user", () => {
    expect(criteriaReuseMessage(prior).role).toBe("user");
  });

  it("encodes prior criteria as JSON inside the text block", () => {
    const msg = criteriaReuseMessage(prior);
    const content = msg.content as Array<{ type: string; text?: string }>;
    expect(content[0].type).toBe("text");
    const text = content[0].text ?? "";
    expect(text).toContain("usefulness");
    expect(text).toContain("Target a real need");
  });
});
