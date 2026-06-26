import { getClient, isDemoMode, MODELS, reasoning } from "@/lib/anthropic";
import { EDIT_SCHEMA, EDIT_SYSTEM, editUserMessage } from "@/lib/prompts";
import { demoEdits } from "@/lib/demo";
import { getErrorMessage, jsonError, safeParseJson } from "@/lib/serverUtils";
import type { EditResult } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request): Promise<Response> {
  let body: { refinedPrompt?: string; projectType?: string; currentCode?: string; changeRequest?: string };
  try {
    body = await req.json();
  } catch {
    return jsonError("Invalid JSON body");
  }

  const currentCode = body.currentCode ?? "";
  const changeRequest = (body.changeRequest ?? "").trim();
  if (!currentCode) return jsonError("`currentCode` is required");
  if (!changeRequest) return jsonError("`changeRequest` is required");

  if (isDemoMode()) {
    return Response.json(demoEdits(changeRequest));
  }

  try {
    const tune = reasoning(MODELS.builder, "low");
    const resp = await getClient().messages.create({
      model: MODELS.builder,
      max_tokens: 6000,
      system: [{ type: "text", text: EDIT_SYSTEM, cache_control: { type: "ephemeral" } }],
      messages: [{ role: "user", content: editUserMessage(currentCode, changeRequest) }],
      ...(tune.thinking ? { thinking: tune.thinking } : {}),
      output_config: { format: { type: "json_schema", schema: EDIT_SCHEMA }, ...(tune.output_config ?? {}) },
    });

    const textBlock = resp.content.find((b) => b.type === "text");
    if (!textBlock || textBlock.type !== "text") {
      return jsonError("Model returned no structured output", 502);
    }
    return Response.json(safeParseJson<EditResult>(textBlock.text));
  } catch (err) {
    return jsonError(getErrorMessage(err), 502);
  }
}
