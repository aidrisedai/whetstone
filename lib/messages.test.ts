import test from "node:test";
import assert from "node:assert/strict";
import { criteriaReuseMessage, toAnthropicMessages } from "./messages.ts";
import type { ChatMessage, CriterionSpec } from "./types.ts";

test("toAnthropicMessages maps the advisor role to assistant and user stays user", () => {
  const history: ChatMessage[] = [
    { id: "1", role: "user", content: "hi" },
    { id: "2", role: "advisor", content: "hello" },
  ];
  const result = toAnthropicMessages(history);
  assert.equal(result[0].role, "user");
  assert.equal(result[1].role, "assistant");
});

test("toAnthropicMessages attaches images only for user turns, as image blocks before text", () => {
  const history: ChatMessage[] = [
    {
      id: "1",
      role: "user",
      content: "look at this",
      images: [{ mediaType: "image/png", data: "AAA" }],
    },
  ];
  const [msg] = toAnthropicMessages(history);
  const blocks = msg.content as { type: string }[];
  assert.equal(blocks[0].type, "image");
  assert.equal(blocks[1].type, "text");
});

test("toAnthropicMessages ignores images on advisor turns", () => {
  const history: ChatMessage[] = [
    {
      id: "1",
      role: "advisor",
      content: "reply",
      images: [{ mediaType: "image/png", data: "AAA" }],
    },
  ];
  const [msg] = toAnthropicMessages(history);
  const blocks = msg.content as { type: string }[];
  assert.equal(blocks.length, 1);
  assert.equal(blocks[0].type, "text");
});

test("toAnthropicMessages emits a placeholder text block for empty content with no images", () => {
  const history: ChatMessage[] = [{ id: "1", role: "user", content: "   " }];
  const [msg] = toAnthropicMessages(history);
  const blocks = msg.content as { type: string; text?: string }[];
  assert.equal(blocks.length, 1);
  assert.equal(blocks[0].text, "(no content)");
});

test("criteriaReuseMessage embeds the prior criteria as JSON in a user message", () => {
  const prior: CriterionSpec[] = [{ key: "a", label: "A", bestPractice: "a" }];
  const msg = criteriaReuseMessage(prior);
  assert.equal(msg.role, "user");
  const block = (msg.content as { type: string; text: string }[])[0];
  assert.match(block.text, /PREVIOUSLY CHOSEN DYNAMIC DIMENSIONS/);
  assert.match(block.text, /"key": "a"/);
});
