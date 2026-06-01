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
  if (refinedPrompt.length > 8000) {
    return jsonError("`refinedPrompt` exceeds maximum length");
  }

  const builder = activeBuilder();
  const builderUrl = builder.buildUrl(refinedPrompt);

  let webhook: ExportResult["webhook"] = "skipped";
  const hook = process.env.BUILDER_WEBHOOK_URL;
  if (hook) {
    // Validate that the webhook is an absolute HTTPS URL to prevent SSRF.
    let hookUrl: URL;
    try {
      hookUrl = new URL(hook);
    } catch {
      hookUrl = null as unknown as URL;
    }
    if (!hookUrl || hookUrl.protocol !== "https:") {
      console.warn("[export] BUILDER_WEBHOOK_URL is not a valid HTTPS URL; skipping webhook.");
    } else {
      const abort = new AbortController();
      const timer = setTimeout(() => abort.abort(), 10_000);
      try {
        const r = await fetch(hook, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ source: "whetstone", builder: builder.key, prompt: refinedPrompt }),
          signal: abort.signal,
        });
        webhook = r.ok ? "sent" : "failed";
      } catch {
        webhook = "failed";
      } finally {
        clearTimeout(timer);
      }
    }
  }

  const result: ExportResult = { builderName: builder.name, builderUrl, webhook };
  return Response.json(result);
}
