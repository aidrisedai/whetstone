import { describe, it, expect } from "vitest";
import { toAnthropicMessages, criteriaReuseMessage } from "@/lib/messages";
import type { ChatMessage, CriterionSpec } from "@/lib/types";

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

// --- toAnthropicMessages ---

describe("toAnthropicMessages", () => {
  it("maps user role to 'user'", () => {
    const [msg] = toAnthropicMessages([userMsg("hello")]);
    expect(msg.role).toBe("user");
  });

  it("maps advisor role to 'assistant'", () => {
    const [msg] = toAnthropicMessages([advisorMsg("hi there")]);
    expect(msg.role).toBe("assistant");
  });

  it("produces a single text block for a plain message", () => {
    const [msg] = toAnthropicMessages([userMsg("pitch me")]);
    const blocks = msg.content as Array<{ type: string; text?: string }>;
    expect(blocks).toHaveLength(1);
    expect(blocks[0].type).toBe("text");
    expect(blocks[0].text).toBe("pitch me");
  });

  it("trims whitespace from content", () => {
    const [msg] = toAnthropicMessages([userMsg("  spaced  ")]);
    const blocks = msg.content as Array<{ type: string; text?: string }>;
    expect(blocks[0].text).toBe("spaced");
  });

  it("produces a '(no content)' placeholder for empty messages", () => {
    const [msg] = toAnthropicMessages([userMsg("")]);
    const blocks = msg.content as Array<{ type: string; text?: string }>;
    expect(blocks[0].text).toBe("(no content)");
  });

  it("prepends image blocks before the text block when images are present", () => {
    const msg: ChatMessage = {
      id: "u1",
      role: "user",
      content: "look at this",
      images: [{ mediaType: "image/png", data: "abc123", name: "test.png" }],
    };
    const [result] = toAnthropicMessages([msg]);
    const blocks = result.content as Array<{ type: string }>;
    expect(blocks[0].type).toBe("image");
    expect(blocks[1].type).toBe("text");
  });

  it("skips images with invalid media types", () => {
    const msg: ChatMessage = {
      id: "u1",
      role: "user",
      content: "text",
      images: [{ mediaType: "image/bmp", data: "xyz" }],
    };
    const [result] = toAnthropicMessages([msg]);
    const blocks = result.content as Array<{ type: string }>;
    // Only the text block should be present
    expect(blocks.every((b) => b.type !== "image")).toBe(true);
  });

  it("does not attach images to advisor messages", () => {
    const msg: ChatMessage = {
      id: "a1",
      role: "advisor",
      content: "here's my reply",
      // This shouldn't happen in practice, but must not crash
      images: [{ mediaType: "image/png", data: "x" }],
    };
    const [result] = toAnthropicMessages([msg]);
    const blocks = result.content as Array<{ type: string }>;
    expect(blocks.every((b) => b.type !== "image")).toBe(true);
  });

  it("preserves turn order", () => {
    const history: ChatMessage[] = [
      userMsg("first", "u1"),
      advisorMsg("reply", "a1"),
      userMsg("second", "u2"),
    ];
    const result = toAnthropicMessages(history);
    expect(result.map((m) => m.role)).toEqual(["user", "assistant", "user"]);
  });
});

// --- criteriaReuseMessage ---

describe("criteriaReuseMessage", () => {
  const prior: CriterionSpec[] = [
    { key: "feasibility", label: "Feasibility", bestPractice: "Can it be built?" },
    { key: "novelty", label: "Novelty", bestPractice: "Is it original?" },
  ];

  it("returns a user-role message", () => {
    const msg = criteriaReuseMessage(prior);
    expect(msg.role).toBe("user");
  });

  it("contains a text block with the serialized criteria", () => {
    const msg = criteriaReuseMessage(prior);
    const blocks = msg.content as Array<{ type: string; text?: string }>;
    expect(blocks[0].type).toBe("text");
    expect(blocks[0].text).toContain("feasibility");
    expect(blocks[0].text).toContain("novelty");
  });

  it("instructs the model to reuse the exact keys", () => {
    const msg = criteriaReuseMessage(prior);
    const blocks = msg.content as Array<{ type: string; text?: string }>;
    expect(blocks[0].text).toContain("PREVIOUSLY CHOSEN");
  });
});
