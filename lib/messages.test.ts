import { describe, expect, it } from "vitest";
import { criteriaReuseMessage, toAnthropicMessages } from "./messages";
import type { ChatMessage } from "./types";

describe("toAnthropicMessages", () => {
  it("maps the advisor role to assistant and user stays user", () => {
    const history: ChatMessage[] = [
      { id: "1", role: "user", content: "hi" },
      { id: "2", role: "advisor", content: "hello" },
    ];
    const result = toAnthropicMessages(history);
    expect(result[0].role).toBe("user");
    expect(result[1].role).toBe("assistant");
  });

  it("attaches images only for user turns", () => {
    const history: ChatMessage[] = [
      {
        id: "1",
        role: "user",
        content: "look",
        images: [{ mediaType: "image/png", data: "abc" }],
      },
    ];
    const [msg] = toAnthropicMessages(history);
    const blocks = msg.content as { type: string }[];
    expect(blocks.some((b) => b.type === "image")).toBe(true);
  });

  it("falls back to a placeholder block when content and images are both empty", () => {
    const history: ChatMessage[] = [{ id: "1", role: "user", content: "" }];
    const [msg] = toAnthropicMessages(history);
    const blocks = msg.content as { type: string; text?: string }[];
    expect(blocks).toHaveLength(1);
    expect(blocks[0].text).toBe("(no content)");
  });
});

describe("criteriaReuseMessage", () => {
  it("embeds the prior criteria as JSON in a user message", () => {
    const prior = [{ key: "k", label: "L", bestPractice: "bp" }];
    const msg = criteriaReuseMessage(prior);
    expect(msg.role).toBe("user");
    const [block] = msg.content as { type: string; text: string }[];
    expect(block.text).toContain(JSON.stringify(prior, null, 2));
  });
});
