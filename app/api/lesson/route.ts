import { getClient, isDemoMode, MODELS, reasoning } from "@/lib/anthropic";
import { toAnthropicMessages } from "@/lib/messages";
import { LESSON_SCHEMA, LESSON_SYSTEM } from "@/lib/prompts";
import { demoLesson } from "@/lib/demo";
import { asChatHistory, getErrorMessage, jsonError, readJsonBody, safeParseJson } from "@/lib/serverUtils";
import type { Lesson } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120;

export async function POST(req: Request): Promise<Response> {
  const body = await readJsonBody(req);
  if (!body) return jsonError("Invalid JSON body");

  const history = asChatHistory(body.history);
  if (!history) {
    return jsonError("`history` must be a non-empty array of messages");
  }

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
