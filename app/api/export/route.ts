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
    // Only allow public http(s) URLs — reject private/loopback addresses to
    // prevent SSRF if the env var is misconfigured.
    let safeHook = false;
    try {
      const u = new URL(hook);
      if (u.protocol === "http:" || u.protocol === "https:") {
        const host = u.hostname.toLowerCase();
        const isPrivate =
          host === "localhost" ||
          /^127\./.test(host) ||
          /^10\./.test(host) ||
          /^172\.(1[6-9]|2\d|3[01])\./.test(host) ||
          /^192\.168\./.test(host) ||
          /^169\.254\./.test(host) ||
          host === "::1" ||
          host === "[::1]";
        safeHook = !isPrivate;
      }
    } catch {
      /* malformed URL — skip */
    }
    if (safeHook) {
      try {
        const r = await fetch(hook, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ source: "whetstone", builder: builder.key, prompt: refinedPrompt }),
        });
        webhook = r.ok ? "sent" : "failed";
      } catch {
        webhook = "failed";
      }
    } else {
      console.warn("[export] BUILDER_WEBHOOK_URL rejected (non-public URL):", hook);
      webhook = "failed";
    }
  }

  const result: ExportResult = { builderName: builder.name, builderUrl, webhook };
  return Response.json(result);
}
