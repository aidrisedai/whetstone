import { getClient, isDemoMode, MODELS, reasoning } from "@/lib/anthropic";
import { toAnthropicMessages } from "@/lib/messages";
import { ADVISOR_SYSTEM, advisorClosingNote } from "@/lib/prompts";
import { demoAdvisorReply } from "@/lib/demo";
import { getErrorMessage, jsonError } from "@/lib/serverUtils";
import type { ChatMessage } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const STREAM_HEADERS = {
  "Content-Type": "text/plain; charset=utf-8",
  "Cache-Control": "no-store, no-transform",
  "X-Accel-Buffering": "no",
};

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function POST(req: Request): Promise<Response> {
  let body: { history?: ChatMessage[]; phase?: string };
  try {
    body = await req.json();
  } catch {
    return jsonError("Invalid JSON body");
  }

  const history = body.history ?? [];
  const closing = body.phase === "closing";
  if (!Array.isArray(history) || history.length === 0) {
    return jsonError("`history` must be a non-empty array");
  }
  if (history.length > 100) {
    return jsonError("`history` must not exceed 100 messages", 413);
  }

  const encoder = new TextEncoder();

  // Demo mode — stream a deterministic reply word-by-word for a natural feel.
  if (isDemoMode()) {
    const text = demoAdvisorReply(history, closing);
    const stream = new ReadableStream<Uint8Array>({
      async start(controller) {
        for (const token of text.split(/(\s+)/)) {
          controller.enqueue(encoder.encode(token));
          await sleep(14);
        }
        controller.close();
      },
    });
    return new Response(stream, { headers: STREAM_HEADERS });
  }

  const system = closing ? `${ADVISOR_SYSTEM}\n\n${advisorClosingNote()}` : ADVISOR_SYSTEM;

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        const messageStream = getClient().messages.stream({
          model: MODELS.advisor,
          max_tokens: 2048,
          system: [{ type: "text", text: system, cache_control: { type: "ephemeral" } }],
          messages: toAnthropicMessages(history),
          // Lean reasoning keeps the conversation snappy (a sharp model needs little).
          ...reasoning(MODELS.advisor, "low"),
        });

        for await (const event of messageStream) {
          if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
            controller.enqueue(encoder.encode(event.delta.text));
          }
        }
        await messageStream.finalMessage();
        controller.close();
      } catch (err) {
        controller.enqueue(encoder.encode(`\n\n⚠️ ${getErrorMessage(err)}`));
        controller.close();
      }
    },
  });

  return new Response(stream, { headers: STREAM_HEADERS });
}
