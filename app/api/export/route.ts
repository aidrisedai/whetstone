import { activeBuilder } from "@/lib/builders";
import { asTrimmed, jsonError, readJsonBody } from "@/lib/serverUtils";
import type { ExportResult } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

const WEBHOOK_TIMEOUT_MS = 8_000;

/**
 * Hand the sharpened prompt off to the connected AI builder. Always returns a
 * deep link that prefills the builder; if BUILDER_WEBHOOK_URL is configured,
 * also POSTs the prompt server-to-server for a true automatic hand-off.
 */
export async function POST(req: Request): Promise<Response> {
  const body = await readJsonBody(req);
  if (!body) return jsonError("Invalid JSON body");

  const refinedPrompt = asTrimmed(body.refinedPrompt);
  if (!refinedPrompt) {
    return jsonError("`refinedPrompt` is required");
  }

  const builder = activeBuilder();
  const builderUrl = builder.buildUrl(refinedPrompt);

  let webhook: ExportResult["webhook"] = "skipped";
  const hook = process.env.BUILDER_WEBHOOK_URL;
  if (hook) {
    try {
      const r = await fetch(hook, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ source: "whetstone", builder: builder.key, prompt: refinedPrompt }),
        // A hung webhook must not hold the export open until the platform kills
        // it — the deep link below is the part the builder actually needs.
        signal: AbortSignal.timeout(WEBHOOK_TIMEOUT_MS),
      });
      webhook = r.ok ? "sent" : "failed";
    } catch {
      webhook = "failed";
    }
  }

  const result: ExportResult = { builderName: builder.name, builderUrl, webhook };
  return Response.json(result);
}
