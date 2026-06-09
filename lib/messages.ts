import type Anthropic from "@anthropic-ai/sdk";
import type { ChatMessage, CriterionSpec } from "./types";

const ALLOWED_MEDIA_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
] as const);
type AllowedMediaType = "image/jpeg" | "image/png" | "image/gif" | "image/webp";

function normalizeMediaType(raw: string): AllowedMediaType | null {
  const t = raw?.toLowerCase().trim();
  return ALLOWED_MEDIA_TYPES.has(t as AllowedMediaType) ? (t as AllowedMediaType) : null;
}

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
      for (const img of m.images) {
        const mediaType = normalizeMediaType(img.mediaType);
        if (!mediaType) continue; // skip unsupported image types
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
