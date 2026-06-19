import { getClient, isDemoMode, MODELS } from "@/lib/anthropic";
import { BUILD_SYSTEM, buildUserMessage } from "@/lib/prompts";
import { demoBuildHtml } from "@/lib/demo";
import { getErrorMessage, jsonError, MAX_CODE_CHARS, MAX_FIELD_CHARS } from "@/lib/serverUtils";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const STREAM_HEADERS = {
  "Content-Type": "text/plain; charset=utf-8",
  "Cache-Control": "no-store, no-transform",
  "X-Accel-Buffering": "no",
};

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function POST(req: Request): Promise<Response> {
  let body: {
    refinedPrompt?: string;
    projectType?: string;
    currentCode?: string;
    changeRequest?: string;
  };
  try {
    body = await req.json();
  } catch {
    return jsonError("Invalid JSON body");
  }

  const refinedPrompt = (body.refinedPrompt ?? "").trim();
  const projectType = (body.projectType ?? "App").trim();
  if (!refinedPrompt) return jsonError("`refinedPrompt` is required");
  if (refinedPrompt.length > MAX_FIELD_CHARS) return jsonError("`refinedPrompt` is too long");
  if ((body.currentCode ?? "").length > MAX_CODE_CHARS) return jsonError("`currentCode` is too large");

  const encoder = new TextEncoder();

  // Demo mode — stream a real, self-contained starter app line-by-line.
  if (isDemoMode()) {
    const html = demoBuildHtml(projectType, refinedPrompt, body.changeRequest);
    const lines = html.split("\n");
    const stream = new ReadableStream<Uint8Array>({
      async start(controller) {
        for (const line of lines) {
          controller.enqueue(encoder.encode(line + "\n"));
          await sleep(9);
        }
        controller.close();
      },
    });
    return new Response(stream, { headers: STREAM_HEADERS });
  }

  const userMessage = buildUserMessage({
    refinedPrompt,
    projectType,
    currentCode: body.currentCode,
    changeRequest: body.changeRequest,
  });

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        // No thinking/effort here: code streams immediately so the build feels alive.
        const messageStream = getClient().messages.stream({
          model: MODELS.builder,
          max_tokens: 16000,
          system: [{ type: "text", text: BUILD_SYSTEM, cache_control: { type: "ephemeral" } }],
          messages: [{ role: "user", content: userMessage }],
        });
        for await (const event of messageStream) {
          if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
            controller.enqueue(encoder.encode(event.delta.text));
          }
        }
        await messageStream.finalMessage();
        controller.close();
      } catch (err) {
        controller.enqueue(encoder.encode(`⚠️ ${getErrorMessage(err)}`));
        controller.close();
      }
    },
  });

  return new Response(stream, { headers: STREAM_HEADERS });
}
