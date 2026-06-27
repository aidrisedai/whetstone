import type Anthropic from "@anthropic-ai/sdk";
import type { ChatMessage, CriterionSpec } from "./types";

/**
 * Convert Whetstone's chat history into Anthropic message params, mapping the
 * "advisor" role to "assistant" and turning image attachments into vision
 * blocks. Only user turns may carry images (the advisor never sends any).
 */
export function toAnthropicMessages(history: ChatMessage[]): Anthropic.MessageParam[] {
  return history.map((m) => {
    const role: "user" | "assistant" = m.role === "advisor" ? "assistant" : "user";
    const blocks: Anthropic.ContentBlockParam[] = [];

    if (role === "user" && m.images?.length) {
      const ALLOWED_MEDIA = new Set(["image/jpeg", "image/png", "image/gif", "image/webp"]);
      for (const img of m.images) {
        if (!ALLOWED_MEDIA.has(img.mediaType)) continue;
        blocks.push({
          type: "image",
          source: { type: "base64", media_type: img.mediaType, data: img.data } as never,
        });
      }
    }

    const text = m.content?.trim();
    if (text) {
      blocks.push({ type: "text", text });
    }

    if (blocks.length === 0) {
      blocks.push({ type: "text", text: "(no content)" });
    }

    return { role, content: blocks };
  });
}

/**
 * Inject the previously-chosen dynamic dimensions as an assistant turn so the
 * scoring engine reuses them verbatim. Must be spliced in BEFORE the final user
 * message — not appended — to keep strict role alternation (user → assistant
 * → user) required by the Anthropic API.
 */
export function criteriaReuseMessage(prior: CriterionSpec[]): Anthropic.MessageParam {
  return {
    role: "assistant",
    content: [
      {
        type: "text",
        text:
          "Previously chosen dynamic dimensions — I will reuse these exact keys, labels, " +
          "and bestPractice values, updating only each score, rationale, and suggestion:\n" +
          JSON.stringify(prior, null, 2),
      },
    ],
  };
}
