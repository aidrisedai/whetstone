import type Anthropic from "@anthropic-ai/sdk";
import type { ChatMessage, CriterionSpec } from "./types";

type SdkImageMediaType = "image/jpeg" | "image/png" | "image/gif" | "image/webp";
const ALLOWED_SDK_TYPES = new Set<string>(["image/jpeg", "image/png", "image/gif", "image/webp"]);
function toSdkMediaType(raw: string): SdkImageMediaType {
  return ALLOWED_SDK_TYPES.has(raw) ? (raw as SdkImageMediaType) : "image/png";
}

// Keep at most this many turns to avoid blowing the context window on long sessions.
const MAX_HISTORY_TURNS = 40;

/**
 * Convert Whetstone's chat history into Anthropic message params, mapping the
 * "advisor" role to "assistant" and turning image attachments into vision
 * blocks. Only user turns may carry images (the advisor never sends any).
 * Images are dropped from older turns to stay within context limits.
 */
export function toAnthropicMessages(history: ChatMessage[]): Anthropic.MessageParam[] {
  const turns = history.slice(-MAX_HISTORY_TURNS);
  const imageDropCutoff = turns.length - 6; // only keep images in the 3 most-recent exchanges
  return turns.map((m, i) => {
    const role: "user" | "assistant" = m.role === "advisor" ? "assistant" : "user";
    const blocks: Anthropic.ContentBlockParam[] = [];

    if (role === "user" && m.images?.length && i >= imageDropCutoff) {
      for (const img of m.images) {
        blocks.push({
          type: "image",
          source: { type: "base64", media_type: toSdkMediaType(img.mediaType), data: img.data },
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
