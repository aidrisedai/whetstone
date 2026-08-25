import { getClient, isDemoMode, MODELS } from "@/lib/anthropic";
import { BUILD_SYSTEM, buildUserMessage } from "@/lib/prompts";
import { demoBuildHtml } from "@/lib/demo";
import { asText, asTrimmed, getErrorMessage, jsonError, readJsonBody } from "@/lib/serverUtils";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

const STREAM_HEADERS = {
  "Content-Type": "text/plain; charset=utf-8",
  "Cache-Control": "no-store, no-transform",
  "X-Accel-Buffering": "no",
};

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function POST(req: Request): Promise<Response> {
  const body = await readJsonBody(req);
  if (!body) return jsonError("Invalid JSON body");

  const refinedPrompt = asTrimmed(body.refinedPrompt);
  const projectType = asTrimmed(body.projectType, "App") || "App";
  const currentCode = asText(body.currentCode);
  const changeRequest = asText(body.changeRequest);
  if (!refinedPrompt) return jsonError("`refinedPrompt` is required");

  const encoder = new TextEncoder();

  // Demo mode — stream a real, self-contained starter app line-by-line.
  if (isDemoMode()) {
    const html = demoBuildHtml(projectType, refinedPrompt, changeRequest);
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
    currentCode,
    changeRequest,
  });

  // A 16k-token build is the most expensive thing Whetstone runs; if the client
  // disappears, stop generating rather than paying for output nobody reads.
  const abort = new AbortController();
  req.signal.addEventListener("abort", () => abort.abort(), { once: true });

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        // No thinking/effort here: code streams immediately so the build feels alive.
        const messageStream = getClient().messages.stream(
          {
            model: MODELS.builder,
            max_tokens: 16000,
            system: [{ type: "text", text: BUILD_SYSTEM, cache_control: { type: "ephemeral" } }],
            messages: [{ role: "user", content: userMessage }],
          },
          { signal: abort.signal },
        );
        for await (const event of messageStream) {
          if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
            controller.enqueue(encoder.encode(event.delta.text));
          }
        }
        await messageStream.finalMessage();
        controller.close();
      } catch (err) {
        // See advisor/route.ts: enqueueing onto an already-errored controller
        // throws a second time and escapes start() as an unhandled rejection.
        try {
          controller.enqueue(encoder.encode(`⚠️ ${getErrorMessage(err)}`));
          controller.close();
        } catch {
          /* stream already torn down. */
        }
      }
    },
    cancel() {
      abort.abort();
    },
  });

  return new Response(stream, { headers: STREAM_HEADERS });
}
