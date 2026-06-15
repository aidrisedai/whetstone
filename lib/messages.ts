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
      const ALLOWED = new Set(["image/jpeg", "image/png", "image/gif", "image/webp"]);
      for (const img of m.images) {
        const mediaType = (ALLOWED.has(img.mediaType) ? img.mediaType : "image/png") as
          "image/jpeg" | "image/png" | "image/gif" | "image/webp";
        blocks.push({
          type: "image",
          source: { type: "base64", media_type: mediaType, data: img.data },
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
 * Append the previously-chosen dynamic dimensions so the scoring engine reuses
 * them verbatim — keeping the scoreboard stable across the whole session.
 */
export function criteriaReuseMessage(prior: CriterionSpec[]): Anthropic.MessageParam {
  return {
    role: "user",
    content: [
      {
        type: "text",
        text:
          "PREVIOUSLY CHOSEN DYNAMIC DIMENSIONS — reuse these exact keys, labels, and " +
          "bestPractice values; only update each score/rationale/suggestion to reflect the " +
          "latest state of the idea:\n" +
          JSON.stringify(prior, null, 2),
      },
    ],
  };
}
