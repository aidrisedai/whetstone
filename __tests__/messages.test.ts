import { describe, it, expect } from "vitest";
import { toAnthropicMessages, criteriaReuseMessage } from "../lib/messages";
import type { ChatMessage, CriterionSpec } from "../lib/types";

describe("toAnthropicMessages", () => {
  it("maps advisor role to assistant", () => {
    const history: ChatMessage[] = [
      { id: "a1", role: "advisor", content: "Hello" },
    ];
    const result = toAnthropicMessages(history);
    expect(result[0].role).toBe("assistant");
  });

  it("maps user role to user", () => {
    const history: ChatMessage[] = [
      { id: "u1", role: "user", content: "My idea" },
    ];
    const result = toAnthropicMessages(history);
    expect(result[0].role).toBe("user");
  });

  it("includes text block for non-empty content", () => {
    const history: ChatMessage[] = [
      { id: "u1", role: "user", content: "Build a game" },
    ];
    const result = toAnthropicMessages(history);
    const content = result[0].content as { type: string; text: string }[];
    const textBlock = content.find((b) => b.type === "text");
    expect(textBlock?.text).toBe("Build a game");
  });

  it("prepends image blocks before the text block", () => {
    const history: ChatMessage[] = [
      {
        id: "u1",
        role: "user",
        content: "Here is my sketch",
        images: [{ mediaType: "image/png", data: "base64data" }],
      },
    ];
    const result = toAnthropicMessages(history);
    const content = result[0].content as { type: string }[];
    expect(content[0].type).toBe("image");
    expect(content[1].type).toBe("text");
  });

  it("emits a fallback text block for empty content", () => {
    const history: ChatMessage[] = [
      { id: "a1", role: "advisor", content: "" },
    ];
    const result = toAnthropicMessages(history);
    const content = result[0].content as { type: string; text: string }[];
    expect(content[0].text).toBe("(no content)");
  });

  it("handles a multi-turn conversation correctly", () => {
    const history: ChatMessage[] = [
      { id: "u1", role: "user", content: "Pitch" },
      { id: "a1", role: "advisor", content: "Push back" },
      { id: "u2", role: "user", content: "Refined" },
    ];
    const result = toAnthropicMessages(history);
    expect(result.map((m) => m.role)).toEqual(["user", "assistant", "user"]);
  });
});

describe("criteriaReuseMessage", () => {
  it("returns a user-role message containing the prior criteria as JSON", () => {
    const prior: CriterionSpec[] = [
      { key: "audience", label: "Audience", bestPractice: "define_audience" },
    ];
    const msg = criteriaReuseMessage(prior);
    expect(msg.role).toBe("user");
    const content = msg.content as { type: string; text: string }[];
    expect(content[0].text).toContain("audience");
    expect(content[0].text).toContain("define_audience");
  });
});
