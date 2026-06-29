import { describe, it, expect } from "vitest";
import { toAnthropicMessages, criteriaReuseMessage } from "./messages";
import type { ChatMessage, CriterionSpec } from "./types";

type TextBlock = { type: "text"; text: string };
type ImageBlock = { type: "image" };
type ContentBlock = TextBlock | ImageBlock;

function textBlocks(blocks: ContentBlock[]): TextBlock[] {
  return blocks.filter((b): b is TextBlock => b.type === "text");
}

describe("toAnthropicMessages", () => {
  it("maps the advisor role to assistant", () => {
    const msgs: ChatMessage[] = [{ id: "1", role: "advisor", content: "Hello" }];
    expect(toAnthropicMessages(msgs)[0].role).toBe("assistant");
  });

  it("maps the user role to user", () => {
    const msgs: ChatMessage[] = [{ id: "1", role: "user", content: "Hi" }];
    const result = toAnthropicMessages(msgs);
    expect(result[0].role).toBe("user");
    const blocks = result[0].content as ContentBlock[];
    expect(textBlocks(blocks)[0].text).toBe("Hi");
  });

  it("includes an image block before the text block for user messages with images", () => {
    const msgs: ChatMessage[] = [
      {
        id: "1",
        role: "user",
        content: "Look at this",
        images: [{ mediaType: "image/png", data: "abc123", name: "shot.png" }],
      },
    ];
    const blocks = toAnthropicMessages(msgs)[0].content as ContentBlock[];
    expect(blocks.some((b) => b.type === "image")).toBe(true);
    expect(textBlocks(blocks)[0].text).toBe("Look at this");
  });

  it("does not add image blocks for advisor messages", () => {
    const msgs: ChatMessage[] = [
      {
        id: "1",
        role: "advisor",
        content: "Here you go",
        images: [{ mediaType: "image/png", data: "abc123" }],
      },
    ];
    const blocks = toAnthropicMessages(msgs)[0].content as ContentBlock[];
    expect(blocks.every((b) => b.type !== "image")).toBe(true);
  });

  it("uses fallback text for a message with no content", () => {
    const msgs: ChatMessage[] = [{ id: "1", role: "user", content: "" }];
    const blocks = toAnthropicMessages(msgs)[0].content as ContentBlock[];
    expect(textBlocks(blocks)[0].text).toBe("(no content)");
  });

  it("uses fallback text for a whitespace-only message", () => {
    const msgs: ChatMessage[] = [{ id: "1", role: "user", content: "   " }];
    const blocks = toAnthropicMessages(msgs)[0].content as ContentBlock[];
    expect(textBlocks(blocks)[0].text).toBe("(no content)");
  });

  it("preserves message order", () => {
    const msgs: ChatMessage[] = [
      { id: "1", role: "user", content: "first" },
      { id: "2", role: "advisor", content: "second" },
      { id: "3", role: "user", content: "third" },
    ];
    const result = toAnthropicMessages(msgs);
    expect(result[0].role).toBe("user");
    expect(result[1].role).toBe("assistant");
    expect(result[2].role).toBe("user");
  });

  it("handles multiple images in one message", () => {
    const msgs: ChatMessage[] = [
      {
        id: "1",
        role: "user",
        content: "here",
        images: [
          { mediaType: "image/png", data: "a" },
          { mediaType: "image/jpeg", data: "b" },
        ],
      },
    ];
    const blocks = toAnthropicMessages(msgs)[0].content as ContentBlock[];
    expect(blocks.filter((b) => b.type === "image")).toHaveLength(2);
  });
});

describe("criteriaReuseMessage", () => {
  const prior: CriterionSpec[] = [
    { key: "clarity", label: "Clarity", bestPractice: "be clear" },
    { key: "scope", label: "Scope", bestPractice: "define scope tightly" },
  ];

  it("returns a user-role message", () => {
    expect(criteriaReuseMessage(prior).role).toBe("user");
  });

  it("includes each prior criterion key in the message body", () => {
    const msg = criteriaReuseMessage(prior);
    const text = (msg.content as TextBlock[])[0].text;
    expect(text).toContain("clarity");
    expect(text).toContain("scope");
  });

  it("includes the label and bestPractice values", () => {
    const msg = criteriaReuseMessage(prior);
    const text = (msg.content as TextBlock[])[0].text;
    expect(text).toContain("Clarity");
    expect(text).toContain("be clear");
  });

  it("instructs the model to reuse — not reinvent — the criteria", () => {
    const msg = criteriaReuseMessage(prior);
    const text = (msg.content as TextBlock[])[0].text;
    expect(text.toLowerCase()).toContain("reuse");
  });
});
