import { activeBuilder } from "@/lib/builders";
import { jsonError } from "@/lib/serverUtils";
import type { ExportResult } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Hand the sharpened prompt off to the connected AI builder. Always returns a
 * deep link that prefills the builder; if BUILDER_WEBHOOK_URL is configured,
 * also POSTs the prompt server-to-server for a true automatic hand-off.
 */
export async function POST(req: Request): Promise<Response> {
  let body: { refinedPrompt?: string };
  try {
    body = await req.json();
  } catch {
    return jsonError("Invalid JSON body");
  }

  const refinedPrompt = (body.refinedPrompt ?? "").trim();
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
        signal: AbortSignal.timeout(8000),
      });
      webhook = r.ok ? "sent" : "failed";
    } catch {
      webhook = "failed";
    }
  }

  const result: ExportResult = { builderName: builder.name, builderUrl, webhook };
  return Response.json(result);
}
