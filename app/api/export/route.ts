import { activeBuilder } from "@/lib/builders";
import { jsonError } from "@/lib/serverUtils";
import type { ExportResult } from "@/lib/types";

function isValidWebhookUrl(raw: string): boolean {
  try {
    const u = new URL(raw);
    if (u.protocol !== "https:") return false;
    const h = u.hostname;
    if (
      h === "localhost" ||
      /^127\./.test(h) ||
      /^10\./.test(h) ||
      /^192\.168\./.test(h) ||
      /^172\.(1[6-9]|2\d|3[01])\./.test(h)
    ) return false;
    return true;
  } catch {
    return false;
  }
}

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
    if (!isValidWebhookUrl(hook)) {
      console.warn("[export] BUILDER_WEBHOOK_URL rejected: must be https and not a private host");
      webhook = "failed";
    } else {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 8000);
      try {
        const r = await fetch(hook, {
          method: "POST",
          signal: controller.signal,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ source: "whetstone", builder: builder.key, prompt: refinedPrompt }),
        });
        webhook = r.ok ? "sent" : "failed";
        if (!r.ok) console.warn(`[export] Webhook returned ${r.status}`);
      } catch (err) {
        console.warn("[export] Webhook POST failed:", err instanceof Error ? err.message : err);
        webhook = "failed";
      } finally {
        clearTimeout(timer);
      }
    }
  }

  const result: ExportResult = { builderName: builder.name, builderUrl, webhook };
  return Response.json(result);
}
