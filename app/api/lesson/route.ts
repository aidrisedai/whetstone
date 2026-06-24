import { getClient, isDemoMode, MODELS, reasoning } from "@/lib/anthropic";
import { toAnthropicMessages } from "@/lib/messages";
import { LESSON_SCHEMA, LESSON_SYSTEM } from "@/lib/prompts";
import { demoLesson } from "@/lib/demo";
import { getErrorMessage, guardHistory, jsonError, safeParseJson } from "@/lib/serverUtils";
import type { ChatMessage, Lesson } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request): Promise<Response> {
  let body: { history?: ChatMessage[] };
  try {
    body = await req.json();
  } catch {
    return jsonError("Invalid JSON body");
  }

  const history = body.history ?? [];
  if (!Array.isArray(history) || history.length === 0) {
    return jsonError("`history` must be a non-empty array");
  }
  const guard = guardHistory(history);
  if (guard) return guard;

  if (isDemoMode()) {
    return Response.json(demoLesson(history));
  }

  try {
    const tune = reasoning(MODELS.lesson, "medium");
    const resp = await getClient().messages.create({
      model: MODELS.lesson,
      max_tokens: 1500,
      system: [{ type: "text", text: LESSON_SYSTEM, cache_control: { type: "ephemeral" } }],
      messages: toAnthropicMessages(history),
      ...(tune.thinking ? { thinking: tune.thinking } : {}),
      output_config: { format: { type: "json_schema", schema: LESSON_SCHEMA }, ...(tune.output_config ?? {}) },
    });

    const textBlock = resp.content.find((b) => b.type === "text");
    const text = textBlock && textBlock.type === "text" ? textBlock.text : "";
    return Response.json(safeParseJson<Lesson>(text));
  } catch (err) {
    return jsonError(getErrorMessage(err), 502);
  }
}
