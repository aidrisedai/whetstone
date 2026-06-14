import { describe, it, expect } from "vitest";
import { toAnthropicMessages, criteriaReuseMessage } from "@/lib/messages";
import type { ChatMessage, CriterionSpec } from "@/lib/types";

const msg = (role: "user" | "advisor", content: string): ChatMessage => ({
  id: "1",
  role,
  content,
});

describe("toAnthropicMessages", () => {
  it("maps advisor role to assistant", () => {
    const result = toAnthropicMessages([msg("advisor", "hello")]);
    expect(result[0].role).toBe("assistant");
  });

  it("maps user role to user", () => {
    const result = toAnthropicMessages([msg("user", "hi")]);
    expect(result[0].role).toBe("user");
  });

  it("creates a text content block", () => {
    const result = toAnthropicMessages([msg("user", "my idea")]);
    const blocks = result[0].content as { type: string; text: string }[];
    expect(blocks).toHaveLength(1);
    expect(blocks[0].type).toBe("text");
    expect(blocks[0].text).toBe("my idea");
  });

  it("emits (no content) for empty text", () => {
    const result = toAnthropicMessages([{ id: "1", role: "user", content: "" }]);
    const blocks = result[0].content as { type: string; text: string }[];
    expect(blocks[0].text).toBe("(no content)");
  });

  it("prepends image blocks for user messages with images", () => {
    const history: ChatMessage[] = [
      {
        id: "1",
        role: "user",
        content: "look at this",
        images: [{ mediaType: "image/png", data: "abc123" }],
      },
    ];
    const result = toAnthropicMessages(history);
    const blocks = result[0].content as { type: string }[];
    expect(blocks[0].type).toBe("image");
    expect(blocks[1].type).toBe("text");
  });

  it("does NOT add images for advisor (assistant) messages", () => {
    const history: ChatMessage[] = [
      {
        id: "1",
        role: "advisor",
        content: "looks good",
        images: [{ mediaType: "image/png", data: "abc" }],
      },
    ];
    const result = toAnthropicMessages(history);
    const blocks = result[0].content as { type: string }[];
    expect(blocks.every((b) => b.type !== "image")).toBe(true);
  });

  it("handles multiple messages in order", () => {
    const history = [msg("user", "A"), msg("advisor", "B"), msg("user", "C")];
    const result = toAnthropicMessages(history);
    expect(result.map((m) => m.role)).toEqual(["user", "assistant", "user"]);
  });
});

describe("criteriaReuseMessage", () => {
  it("returns a user-role message containing the prior criteria as JSON", () => {
    const prior: CriterionSpec[] = [{ key: "clarity", label: "Clarity", bestPractice: "bp" }];
    const result = criteriaReuseMessage(prior);
    expect(result.role).toBe("user");
    const blocks = result.content as { type: string; text: string }[];
    expect(blocks[0].text).toContain('"clarity"');
  });
});
